import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface CorrectedText {
  id: number;
  stage: string;
  event_title: string;
  edited_content: string;
  created_at: string;
}

export default function CorrectedTextPage({ userId, token }: { userId: number; token: string | null }) {
  const [correctedTexts, setCorrectedTexts] = useState<CorrectedText[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

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

      // AIを動修正のものものみをフィルタ、且つ edited_content が存在
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

  const handleEdit = (text: CorrectedText) => {
    setSelectedId(text.id);
    setEditContent(text.edited_content);
    setIsEditing(true);
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
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
      borderRadius: '4px',
      marginBottom: '10px',
    },
    listItemHover: {
      backgroundColor: '#f8f9fa',
    },
    listItemTitle: {
      fontWeight: 'bold' as const,
      color: '#2c3e50',
      marginBottom: '8px',
      fontSize: '16px',
    },
    listItemDate: {
      fontSize: '12px',
      color: '#95a5a6',
      marginBottom: '10px',
    },
    listItemPreview: {
      fontSize: '13px',
      color: '#7f8c8d',
      lineHeight: '1.5',
      marginBottom: '10px',
      maxHeight: '60px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    editModal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
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
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    },
    textarea: {
      width: '100%',
      minHeight: '400px',
      padding: '15px',
      fontSize: '14px',
      fontFamily: 'serif',
      lineHeight: '1.8',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
      marginBottom: '20px',
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
    },
    button: {
      padding: '10px 20px',
      fontSize: '14px',
      borderRadius: '4px',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s ease',
      minHeight: '40px',
    },
    saveButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    cancelButton: {
      backgroundColor: '#95a5a6',
      color: 'white',
    },
    editButton: {
      backgroundColor: '#3498db',
      color: 'white',
      marginTop: '10px',
    },
  };

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
                ...styles.saveButton,
              }}
            >
              保存する
            </button>
          </div>
        </div>
      </div>
    );
  }

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