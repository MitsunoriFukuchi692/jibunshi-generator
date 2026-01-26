import { useState, useEffect } from 'react';

interface Answer {
  question: string;
  answer: string;
  photos?: string[];
}

interface EventInfo {
  title: string;
  year?: number;
  month?: number;
  day?: number;
}

export default function CorrectionPageV2({
  userId,
  token,
  conversation,
  answersWithPhotos,
  onComplete
}: {
  userId: number;
  token: string | null;
  conversation: any[];
  answersWithPhotos: any[];
  onComplete: () => void;
}) {
  // ============================================
  // State Management
  // ============================================
  const [tabIndex, setTabIndex] = useState(0);
  const [editedAnswers, setEditedAnswers] = useState<Answer[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo>({
    title: '',
    year: new Date().getFullYear() - 50,
    month: 1,
    day: 1
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [correctedText, setCorrectedText] = useState<string>('');
  const [showCorrectingSpinner, setShowCorrectingSpinner] = useState(false);

  // ============================================
  // Initialize State from Props
  // ============================================
  useEffect(() => {
    // conversation から回答を抽出
    if (conversation && conversation.length > 0) {
      const extracted: Answer[] = conversation
        .filter((msg, idx) => idx % 2 === 0 && idx < conversation.length - 1)
        .map((msg, idx) => ({
          question: msg.content || '',
          answer: conversation[idx * 2 + 1]?.content || '',
          photos: answersWithPhotos[idx]?.photos || []
        }));
      setEditedAnswers(extracted);
    }

    // answersWithPhotos から写真を抽出
    if (answersWithPhotos && answersWithPhotos.length > 0) {
      const allPhotos = answersWithPhotos
        .flatMap((item: any) => item.photos || [])
        .filter((url: string) => !!url);
      setPhotoPreview(allPhotos);
    }
  }, [conversation, answersWithPhotos]);

  // ============================================
  // ハンドラー：テキスト編集
  // ============================================
  const handleAnswerChange = (index: number, newText: string) => {
    const updated = [...editedAnswers];
    updated[index] = { ...updated[index], answer: newText };
    setEditedAnswers(updated);
  };

  // ============================================
  // ハンドラー：AI自動修正
  // ============================================
  const handleAutoCorrect = async () => {
    try {
      setShowCorrectingSpinner(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      // 現在の回答テキストを統合
      const responses = editedAnswers.map(a => a.answer);

      console.log('🤖 AI自動修正リクエスト送信...');

      const response = await fetch(`${apiUrl}/api/ai/edit-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          responses,
          stage: 'interview',
          user_id: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ API Error:', errorData);
        throw new Error(`修正に失敗しました (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ 修正テキスト受け取り完了');
      setCorrectedText(data.edited_content);

    } catch (err) {
      console.error('❌ 修正エラー:', err);
      const errorMessage = err instanceof Error ? err.message : '修正処理に失敗しました';
      setError(errorMessage);
    } finally {
      setShowCorrectingSpinner(false);
    }
  };

  // ============================================
  // ハンドラー：写真アップロード
  // ============================================
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos([...photos, ...newFiles]);

      // プレビュー用URL生成
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPhotoPreview(prev => [...prev, event.target.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // ============================================
  // ハンドラー：写真削除
  // ============================================
  const handleRemovePhoto = (index: number) => {
    setPhotoPreview(prev => prev.filter((_, i) => i !== index));
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ============================================
  // ハンドラー：完了・保存
  // ============================================
  const handleComplete = async () => {
    try {
      setSaving(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      console.log('💾 全データ保存開始...');
      console.log({
        userId,
        editedAnswersCount: editedAnswers.length,
        eventInfo,
        photoCount: photos.length,
        correctedTextLength: correctedText.length
      });

      // ============================================
      // ステップ1：写真をアップロード
      // ============================================
      let uploadedPhotoPaths: string[] = [];
      
      if (photos.length > 0) {
        console.log('📸 写真アップロード中...');
        
        for (const photo of photos) {
          const formData = new FormData();
          formData.append('file', photo);
          formData.append('user_id', userId.toString());

          const photoRes = await fetch(`${apiUrl}/api/photos/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!photoRes.ok) {
            const errorData = await photoRes.json();
            console.warn('⚠️ 写真アップロード失敗:', errorData);
            continue;
          }

          const photoData = await photoRes.json();
          if (photoData.data?.file_path) {
            uploadedPhotoPaths.push(photoData.data.file_path);
          }
        }

        console.log(`✅ ${uploadedPhotoPaths.length}件の写真がアップロード完了`);
      }

      // ============================================
      // ステップ2：回答 + 出来事 + 写真を一括保存
      // ============================================
      console.log('💾 インタビューデータ保存中...');

      const saveResponse = await fetch(`${apiUrl}/api/interview/save-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          answers: editedAnswers,
          event_info: eventInfo,
          corrected_text: correctedText,
          photo_paths: uploadedPhotoPaths,
          timestamp: Date.now()
        })
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(`保存に失敗しました: ${errorData.error}`);
      }

      const saveData = await saveResponse.json();
      console.log('✅ 全データ保存完了！', saveData);

      alert('✅ データが保存されました！\nPDFプレビューへ進みます...');
      
      // onComplete コールバック実行（PDF画面へ移動）
      onComplete();

    } catch (err) {
      console.error('❌ 保存エラー:', err);
      const errorMessage = err instanceof Error ? err.message : '保存に失敗しました';
      setError(errorMessage);
      alert(`❌ ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // Styles
  // ============================================
  const styles = {
    container: {
      maxWidth: '900px',
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
    tabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      borderBottom: '2px solid #ecf0f1',
      overflowX: 'auto' as const,
    },
    tabButton: {
      padding: '12px 20px',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: '3px solid transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold' as const,
      color: '#7f8c8d',
      transition: 'all 0.3s ease',
      minHeight: '44px',
    },
    tabButtonActive: {
      color: '#3498db',
      borderBottomColor: '#3498db',
    },
    card: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      boxSizing: 'border-box' as const,
    },
    errorBox: {
      backgroundColor: '#fdeaea',
      color: '#c53030',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      borderLeft: '4px solid #c53030',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold' as const,
      color: '#2c3e50',
      marginBottom: '15px',
      marginTop: '20px',
    },
    answerBox: {
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      borderLeft: '4px solid #3498db',
    },
    label: {
      fontSize: '14px',
      fontWeight: 'bold' as const,
      color: '#2c3e50',
      marginBottom: '8px',
      display: 'block',
    },
    textarea: {
      width: '100%',
      minHeight: '120px',
      padding: '12px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
      resize: 'vertical' as const,
    },
    input: {
      width: '100%',
      padding: '12px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
      marginBottom: '10px',
    },
    numberInput: {
      padding: '12px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
      marginRight: '10px',
      minWidth: '80px',
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
      gap: '10px',
      marginTop: '15px',
    },
    photoItem: {
      position: 'relative' as const,
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    photoImage: {
      width: '100%',
      height: '150px',
      objectFit: 'cover' as const,
    },
    photoRemoveBtn: {
      position: 'absolute' as const,
      top: '5px',
      right: '5px',
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '30px',
      height: '30px',
      cursor: 'pointer',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    correctedTextBox: {
      backgroundColor: '#f8f9fa',
      padding: '25px',
      borderRadius: '8px',
      lineHeight: '1.8',
      color: '#2c3e50',
      fontSize: '15px',
      marginBottom: '20px',
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-word' as const,
      minHeight: '200px',
      border: '1px solid #ddd',
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
      marginTop: '20px',
    },
    button: {
      padding: '12px 24px',
      fontSize: '14px',
      borderRadius: '4px',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s ease',
      minHeight: '44px',
      fontWeight: 'bold' as const,
    },
    primaryButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#3498db',
      color: 'white',
    },
    spinner: {
      display: 'inline-block',
      width: '20px',
      height: '20px',
      border: '3px solid #ecf0f1',
      borderTop: '3px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '10px',
      verticalAlign: 'middle',
    },
  };

  // ============================================
  // Render
  // ============================================
  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* ヘッダー */}
      <div style={styles.header}>
        <h1 style={styles.title}>📝 自分史編集</h1>
        <p style={styles.subtitle}>インタビュー回答の修正・編集ができます</p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div style={styles.errorBox}>
          <strong>エラー:</strong> {error}
        </div>
      )}

      {/* タブメニュー */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tabButton,
            ...(tabIndex === 0 ? styles.tabButtonActive : {})
          }}
          onClick={() => setTabIndex(0)}
        >
          📝 回答テキスト
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(tabIndex === 1 ? styles.tabButtonActive : {})
          }}
          onClick={() => setTabIndex(1)}
        >
          📅 出来事・年月
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(tabIndex === 2 ? styles.tabButtonActive : {})
          }}
          onClick={() => setTabIndex(2)}
        >
          📸 写真
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(tabIndex === 3 ? styles.tabButtonActive : {})
          }}
          onClick={() => setTabIndex(3)}
        >
          ✨ AI修正テキスト
        </button>
      </div>

      {/* ============================================ */}
      {/* タブ0: 回答テキスト */}
      {/* ============================================ */}
      {tabIndex === 0 && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📝 回答内容（編集可能）</h2>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '20px' }}>
            インタビューの回答を編集できます。修正したい箇所を自由に変更してください。
          </p>

          {editedAnswers.length === 0 ? (
            <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>
              回答がありません。インタビューを完了してください。
            </p>
          ) : (
            editedAnswers.map((answer, idx) => (
              <div key={idx} style={styles.answerBox}>
                <label style={styles.label}>
                  Q{idx + 1}: {answer.question}
                </label>
                <textarea
                  style={styles.textarea}
                  value={answer.answer}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  placeholder="ここに回答を入力してください..."
                />
              </div>
            ))
          )}

          <div style={styles.buttonContainer}>
            <button
              onClick={handleAutoCorrect}
              disabled={showCorrectingSpinner || editedAnswers.length === 0}
              style={{
                ...styles.button,
                ...styles.secondaryButton,
                opacity: showCorrectingSpinner ? 0.6 : 1,
              }}
            >
              {showCorrectingSpinner && <div style={styles.spinner}></div>}
              {showCorrectingSpinner ? 'AI修正中...' : '✨ AI自動修正'}
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* タブ1: 出来事・年月 */}
      {/* ============================================ */}
      {tabIndex === 1 && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📅 出来事・年月情報</h2>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '20px' }}>
            この出来事に関する情報を入力してください。
          </p>

          <div>
            <label style={styles.label}>出来事タイトル *</label>
            <input
              type="text"
              style={styles.input}
              placeholder="例：高校卒業、結婚式、転職、など"
              value={eventInfo.title}
              onChange={(e) => setEventInfo({ ...eventInfo, title: e.target.value })}
            />
          </div>

          <div>
            <label style={styles.label}>年月日</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div>
                <label style={{ ...styles.label, marginBottom: '5px' }}>年</label>
                <input
                  type="number"
                  style={styles.numberInput}
                  min="1900"
                  max={new Date().getFullYear()}
                  value={eventInfo.year || ''}
                  onChange={(e) => setEventInfo({ ...eventInfo, year: parseInt(e.target.value) })}
                  placeholder="年"
                />
              </div>
              <div>
                <label style={{ ...styles.label, marginBottom: '5px' }}>月</label>
                <input
                  type="number"
                  style={styles.numberInput}
                  min="1"
                  max="12"
                  value={eventInfo.month || ''}
                  onChange={(e) => setEventInfo({ ...eventInfo, month: parseInt(e.target.value) })}
                  placeholder="月"
                />
              </div>
              <div>
                <label style={{ ...styles.label, marginBottom: '5px' }}>日</label>
                <input
                  type="number"
                  style={styles.numberInput}
                  min="1"
                  max="31"
                  value={eventInfo.day || ''}
                  onChange={(e) => setEventInfo({ ...eventInfo, day: parseInt(e.target.value) })}
                  placeholder="日"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* タブ2: 写真 */}
      {/* ============================================ */}
      {tabIndex === 2 && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📸 写真</h2>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '20px' }}>
            この出来事に関連する写真をアップロードしてください。
          </p>

          <div>
            <label style={styles.label}>写真を選択</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{
                padding: '12px',
                border: '2px dashed #3498db',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'block',
              }}
            />
          </div>

          {photoPreview.length > 0 && (
            <div>
              <h3 style={styles.sectionTitle}>📷 アップロード済み写真 ({photoPreview.length}枚)</h3>
              <div style={styles.photoGrid}>
                {photoPreview.map((photo, idx) => (
                  <div key={idx} style={styles.photoItem}>
                    <img src={photo} alt={`photo-${idx}`} style={styles.photoImage} />
                    <button
                      onClick={() => handleRemovePhoto(idx)}
                      style={styles.photoRemoveBtn}
                      title="削除"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* タブ3: AI修正テキスト */}
      {/* ============================================ */}
      {tabIndex === 3 && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>✨ AI修正済みテキスト</h2>
          <p style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '20px' }}>
            AIが修正したテキストです。確認して保存してください。
          </p>

          {correctedText ? (
            <div>
              <div style={styles.correctedTextBox}>
                {correctedText}
              </div>
              <p style={{ color: '#7f8c8d', fontSize: '12px' }}>
                ✅ 修正テキストを確認しました
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              <p>「回答テキスト」タブで「AI自動修正」ボタンをクリックして、修正テキストを生成してください。</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* アクションボタン */}
      {/* ============================================ */}
      <div style={styles.card}>
        <div style={styles.buttonContainer}>
          <button
            onClick={handleComplete}
            disabled={saving || editedAnswers.length === 0}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '保存中...' : '✅ 保存してPDFプレビューへ'}
          </button>
        </div>
      </div>
    </div>
  );
}
