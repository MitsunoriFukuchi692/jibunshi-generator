import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface CorrectedText {
  id: number;
  stage: string;
  event_title: string;
  edited_content: string;
  created_at: string;
}

interface Photo {
  id: number;
  filename: string;
  file_path: string;
  description: string;
  uploaded_at: string;
}

interface PhotoWithSelection extends Photo {
  selected: boolean;
}

export default function CorrectedTextPage({ userId, token }: { userId: number; token: string | null }) {
  const [correctedTexts, setCorrectedTexts] = useState<CorrectedText[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  
  // 写真関連の状態
  const [photos, setPhotos] = useState<PhotoWithSelection[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [insertPosition, setInsertPosition] = useState<number | null>(null);
  const [linkingPhotos, setLinkingPhotos] = useState(false);

  // PDF生成関連の状態
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    fetchCorrectedTexts();
  }, []);

  const fetchCorrectedTexts = async () => {
    try {
      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      console.log('📖 修正テキスト取得中...');

      const response = await fetch(`${apiUrl}/api/timeline?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error(`データ取得に失敗しました (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ 修正テキスト取得完了:', data);

      // AI自動修正のものものみをフィルタ、かつ edited_content が存在
      const filtered = data.filter((item: any) => item.is_auto_generated === 1 && item.edited_content);
      setCorrectedTexts(filtered);
      setError(null);
    } catch (error) {
      console.error('❌ Fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'データ取得に失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 写真一覧を取得
  const fetchPhotos = async () => {
    try {
      setLoadingPhotos(true);
      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      const response = await fetch(`${apiUrl}/api/photos?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error(`写真取得に失敗しました (${response.status})`);
      }

      const data = await response.json();
      console.log('📸 写真取得完了:', data);
      
      // selected フラグを追加
      const photosWithSelection = data.map((photo: Photo) => ({
        ...photo,
        selected: false
      }));
      setPhotos(photosWithSelection);
    } catch (error) {
      console.error('❌ Photo fetch error:', error);
      alert('写真の取得に失敗しました');
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleEdit = (text: CorrectedText) => {
    setSelectedId(text.id);
    setEditContent(text.edited_content);
    setIsEditing(true);
  };

  const handleOpenPhotoSelector = () => {
    setInsertPosition(editContent.length);
    setShowPhotoSelector(true);
    fetchPhotos();
  };

  const handlePhotoSelect = (photoId: number) => {
    setPhotos(photos.map(p => 
      p.id === photoId ? { ...p, selected: !p.selected } : p
    ));
  };

  // 修正版：選択した写真をタイムラインに紐付ける
  const handleInsertPhotos = async () => {
    const selectedPhotos = photos.filter(p => p.selected);
    
    if (selectedPhotos.length === 0) {
      alert('写真を選択してください');
      return;
    }

    if (!selectedId) {
      alert('タイムラインが選択されていません');
      return;
    }

    try {
      setLinkingPhotos(true);
      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      console.log('📸 写真をタイムラインに紐付け中...', selectedPhotos.length, '枚');

      // 写真IDを使ってタイムラインに紐付ける
      const response = await fetch(`${apiUrl}/api/timeline/${selectedId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          photoIds: selectedPhotos.map(p => p.id)
        }),
      });

      if (!response.ok) {
        throw new Error(`写真の紐付けに失敗しました (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ 写真の紐付け完了:', data);

      // 成功メッセージ
      alert(`${selectedPhotos.length}枚の写真をタイムラインに追加しました！`);

      // UI更新
      setShowPhotoSelector(false);
      setPhotos(photos.map(p => ({ ...p, selected: false })));

    } catch (error) {
      console.error('❌ Photo linking error:', error);
      const errorMessage = error instanceof Error ? error.message : '写真の紐付けに失敗しました';
      alert(`エラー: ${errorMessage}`);
    } finally {
      setLinkingPhotos(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;

    try {
      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      console.log('💾 修正内容を保存中...');

      const response = await fetch(`${apiUrl}/api/timeline/${selectedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          edited_content: editContent,
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error(`保存に失敗しました (${response.status})`);
      }

      console.log('✅ 保存完了');

      // リスト更新
      await fetchCorrectedTexts();
      setIsEditing(false);
      setSelectedId(null);
      setEditContent('');
      alert('保存しました！');
    } catch (error) {
      console.error('❌ Save error:', error);
      const errorMessage = error instanceof Error ? error.message : '保存に失敗しました';
      alert(`エラー: ${errorMessage}`);
    }
  };

  // PDF生成
  const handleGeneratePdf = async () => {
    try {
      setGeneratingPdf(true);
      setPdfError(null);
      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      console.log('📄 PDFを生成中...');

      const response = await fetch(`${apiUrl}/api/pdf/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error(`PDF生成に失敗しました (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ PDF生成完了:', data);

      if (data.success && data.downloadUrl) {
        setPdfDownloadUrl(data.downloadUrl);
        setPdfGenerated(true);
      }
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'PDF生成に失敗しました';
      setPdfError(errorMessage);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // PDFダウンロード
  const handleDownloadPdf = () => {
    if (pdfDownloadUrl) {
      window.location.href = `${API_URL}${pdfDownloadUrl}`;
    }
  };

  const styles = {
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px',
      boxSizing: 'border-box' as const,
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '30px',
    },
    title: {
      fontSize: 'clamp(20px, 5vw, 28px)',
      fontWeight: 'bold' as const,
      color: '#2c3e50',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#7f8c8d',
      marginBottom: '20px',
    },
    errorBox: {
      backgroundColor: '#fdeaea',
      color: '#c53030',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      borderLeft: '4px solid #c53030',
    },
    successBox: {
      backgroundColor: '#e6ffed',
      color: '#22863a',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      borderLeft: '4px solid #28a745',
    },
    loadingBox: {
      textAlign: 'center' as const,
      padding: '40px',
      color: '#7f8c8d',
    },
    listContainer: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      padding: '20px',
      marginBottom: '20px',
    },
    listItem: {
      padding: '15px',
      borderBottom: '1px solid #ecf0f1',
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#f9f9f9',
    },
    listItemHover: {
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    listItemTitle: {
      fontSize: '16px',
      fontWeight: 'bold' as const,
      color: '#2c3e50',
      marginBottom: '5px',
    },
    listItemDate: {
      fontSize: '12px',
      color: '#7f8c8d',
      marginBottom: '8px',
    },
    listItemPreview: {
      fontSize: '13px',
      color: '#34495e',
      marginBottom: '10px',
      lineHeight: '1.5',
    },
    button: {
      padding: '10px 15px',
      fontSize: '14px',
      fontWeight: 'bold' as const,
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginRight: '10px',
    },
    editButton: {
      backgroundColor: '#3498db',
      color: 'white',
    },
    editButtonHover: {
      backgroundColor: '#2980b9',
    },
    pdfButton: {
      backgroundColor: '#27ae60',
      color: 'white',
      padding: '12px 20px',
      fontSize: '16px',
    },
    pdfButtonHover: {
      backgroundColor: '#229954',
    },
    downloadButton: {
      backgroundColor: '#e67e22',
      color: 'white',
    },
    downloadButtonHover: {
      backgroundColor: '#d35400',
    },
    cancelButton: {
      backgroundColor: '#95a5a6',
      color: 'white',
    },
    insertPhotoButton: {
      backgroundColor: '#9b59b6',
      color: 'white',
    },
    disabledButton: {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '15px',
    },
    editModal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      maxWidth: '800px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto' as const,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    },
    textarea: {
      width: '100%',
      minHeight: '300px',
      padding: '15px',
      fontSize: '14px',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      fontFamily: 'inherit',
      marginBottom: '15px',
      boxSizing: 'border-box' as const,
    },
    photoSelectorModal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    },
    photoSelectorContent: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '70vh',
      overflowY: 'auto' as const,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
    },
    photoCard: {
      position: 'relative' as const,
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
    },
    photoCardSelected: {
      transform: 'scale(0.95)',
      boxShadow: '0 0 0 3px #e67e22',
    },
    photoImage: {
      width: '100%',
      height: '100px',
      objectFit: 'cover' as const,
    },
    photoCheckbox: {
      position: 'absolute' as const,
      top: '5px',
      right: '5px',
      width: '20px',
      height: '20px',
      cursor: 'pointer',
    },
    photodescription: {
      fontSize: '11px',
      padding: '5px',
      backgroundColor: '#f0f0f0',
      color: '#333',
      textAlign: 'center' as const,
      minHeight: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };

  // 写真セレクター画面
  if (showPhotoSelector) {
    return (
      <div style={styles.photoSelectorModal}>
        <div style={styles.photoSelectorContent}>
          <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>📸 写真を選択</h2>
          
          {loadingPhotos ? (
            <div style={styles.loadingBox}>
              <p>写真を読み込み中...</p>
            </div>
          ) : photos.length === 0 ? (
            <div style={styles.loadingBox}>
              <p>写真がまだアップロードされていません</p>
            </div>
          ) : (
            <>
              <div style={styles.photoGrid}>
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      ...styles.photoCard,
                      ...(photo.selected ? styles.photoCardSelected : {}),
                    }}
                    onClick={() => handlePhotoSelect(photo.id)}
                  >
                    <img 
                      src={`${API_URL}${photo.file_path}`} 
                      alt={photo.filename}
                      style={styles.photoImage}
                    />
                    <input
                      type="checkbox"
                      checked={photo.selected}
                      onChange={() => handlePhotoSelect(photo.id)}
                      style={styles.photoCheckbox}
                    />
                    <div style={styles.photodescription}>
                      {photo.description || 'no description'}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.buttonContainer}>
                <button
                  onClick={() => {
                    setShowPhotoSelector(false);
                    setPhotos(photos.map(p => ({ ...p, selected: false })));
                  }}
                  style={{
                    ...styles.button,
                    ...styles.cancelButton,
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleInsertPhotos}
                  disabled={linkingPhotos}
                  style={{
                    ...styles.button,
                    ...styles.insertPhotoButton,
                    ...(linkingPhotos ? styles.disabledButton : {}),
                  }}
                >
                  {linkingPhotos ? '紐付け中...' : `選択した写真を追加 (${photos.filter(p => p.selected).length}枚)`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // テキスト編集モーダル
  if (isEditing && selectedId) {
    return (
      <div style={styles.editModal}>
        <div style={styles.modalContent}>
          <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>📝 テキストを編集</h2>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={styles.textarea}
            placeholder="修正内容を入力してください..."
          />
          <div style={styles.buttonContainer}>
            <button
              onClick={handleOpenPhotoSelector}
              style={{
                ...styles.button,
                ...styles.insertPhotoButton,
              }}
            >
              📸 写真をタイムラインに追加
            </button>
          </div>
          <div style={styles.buttonContainer}>
            <button
              onClick={() => {
                setIsEditing(false);
                setSelectedId(null);
                setEditContent('');
              }}
              style={{
                ...styles.button,
                ...styles.cancelButton,
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              style={{
                ...styles.button,
                backgroundColor: '#27ae60',
                color: 'white',
              }}
            >
              保存する
            </button>
          </div>
        </div>
      </div>
    );
  }

  // メイン画面
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📚 修正済みテキスト一覧</h1>
        <p style={styles.subtitle}>AIが自動修正した内容を確認・編集できます</p>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <strong>エラー:</strong> {error}
        </div>
      )}

      {pdfGenerated && (
        <div style={styles.successBox}>
          <strong>✅ PDFが生成されました！</strong>
          <button
            onClick={handleDownloadPdf}
            style={{
              ...styles.button,
              ...styles.downloadButton,
              marginLeft: '10px',
            }}
          >
            PDFをダウンロード
          </button>
        </div>
      )}

      {pdfError && (
        <div style={styles.errorBox}>
          <strong>PDF生成エラー:</strong> {pdfError}
        </div>
      )}

      <div style={styles.listContainer}>
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf || correctedTexts.length === 0}
            style={{
              ...styles.button,
              ...styles.pdfButton,
              ...(generatingPdf || correctedTexts.length === 0 ? styles.disabledButton : {}),
            }}
          >
            {generatingPdf ? '📄 PDF生成中...' : '📄 PDFを生成'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>
          <p>データを読み込み中...</p>
        </div>
      ) : correctedTexts.length === 0 ? (
        <div style={styles.listContainer}>
          <p style={{ textAlign: 'center', color: '#7f8c8d' }}>
            まだ修正済みのテキストがありません
          </p>
        </div>
      ) : (
        <div style={styles.listContainer}>
          {correctedTexts.map((text) => (
            <div
              key={text.id}
              style={{
                ...styles.listItem,
                ...styles.listItemHover,
              }}
            >
              <div style={styles.listItemTitle}>{text.event_title}</div>
              <div style={styles.listItemDate}>
                作成日: {new Date(text.created_at).toLocaleDateString('ja-JP')}
              </div>

              <div style={styles.listItemPreview}>
                {text.edited_content ? text.edited_content.substring(0, 100) : 'テキストなし'}...
              </div>
              <button
                onClick={() => handleEdit(text)}
                style={{
                  ...styles.button,
                  ...styles.editButton,
                }}
              >
                編集する
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
