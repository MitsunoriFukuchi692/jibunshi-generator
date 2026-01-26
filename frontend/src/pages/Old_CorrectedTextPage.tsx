import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface AnswerWithPhotos {
  text: string;
  photos?: Array<{
    id: number;
    file_path: string;
    description?: string;
  }>;
  year?: string;
  month?: string;
  eventTitle?: string;
  isImportant?: boolean;
}

interface User {
  id: number;
  name: string;
  age: number;
}

export default function CorrectedTextPage({
  userId,
  token,
  onTimelineListStart,
}: {
  userId: number;
  token: string | null;
  onTimelineListStart?: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [answersWithPhotos, setAnswersWithPhotos] = useState<AnswerWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [biography, setBiography] = useState<string>('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBiography, setEditedBiography] = useState<string>('');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null);
  const [editingAnswerText, setEditingAnswerText] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [userId, token]);

  const fetchData = async () => {
    try {
      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      console.log('📖 データ取得開始...');

      // ステップ1: ユーザー情報取得
      const userResponse = await fetch(`${apiUrl}/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!userResponse.ok) {
        throw new Error('ユーザー情報取得に失敗しました');
      }

      const userData = await userResponse.json();
      setUser(userData);
      console.log('✅ ユーザー情報取得完了:', userData);

      // ステップ2: インタビューセッションデータを取得
      const sessionResponse = await fetch(`${apiUrl}/api/interview-session/load`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!sessionResponse.ok) {
        throw new Error('インタビューセッションがまだ作成されていません。インタビューを完了してください。');
      }

      const sessionData = await sessionResponse.json();
      console.log('✅ インタビューセッション取得完了:', {
        currentQuestionIndex: sessionData.currentQuestionIndex,
        answersCount: sessionData.answersWithPhotos?.length || 0,
      });

      if (!sessionData.answersWithPhotos || sessionData.answersWithPhotos.length === 0) {
        throw new Error('インタビュー回答がまだ保存されていません。インタビューを進めてください。');
      }

      setAnswersWithPhotos(sessionData.answersWithPhotos);

      // ステップ3: 自分史データ取得
      const bioResponse = await fetch(`${apiUrl}/api/biography`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (bioResponse.ok) {
        const bioData = await bioResponse.json();
        const bioText = bioData.data?.edited_content || 
                        bioData.data?.ai_summary || 
                        bioData.edited_content || 
                        bioData.ai_summary || 
                        '';
        setBiography(bioText);
        setEditedBiography(bioText);
        console.log('✅ 自分史データ取得完了');
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ データ取得エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'データ取得に失敗しました';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleSaveBiography = async () => {
    if (!editedBiography.trim()) {
      alert('自分史の内容を入力してください');
      return;
    }

    setIsSavingBio(true);
    try {
      const apiUrl = API_URL;

      const response = await fetch(`${apiUrl}/api/biography`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          edited_content: editedBiography,
          ai_summary: editedBiography
        }),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      setBiography(editedBiography);
      setIsEditingBio(false);
      alert('✅ 修正内容を保存しました');

    } catch (err) {
      console.error('❌ 修正内容の保存エラー:', err);
      alert('修正内容の保存に失敗しました');
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleEditAnswer = (index: number, text: string) => {
    setEditingAnswerId(index);
    setEditingAnswerText(text);
  };

  const handleSaveAnswer = async (index: number) => {
    if (!editingAnswerText.trim()) {
      alert('回答内容を入力してください');
      return;
    }

    // 回答を更新
    const updatedAnswers = [...answersWithPhotos];
    updatedAnswers[index].text = editingAnswerText;
    setAnswersWithPhotos(updatedAnswers);

    // バックエンドに保存
    try {
      const apiUrl = API_URL;
      const response = await fetch(`${apiUrl}/api/interview-session/update-answers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          answersWithPhotos: updatedAnswers
        }),
      });

      if (!response.ok) {
        throw new Error('回答の保存に失敗しました');
      }

      console.log('✅ 回答保存完了');
      alert('✅ 回答を保存しました');
      setEditingAnswerId(null);
      setEditingAnswerText('');

    } catch (err) {
      console.error('❌ 回答保存エラー:', err);
      alert('回答の保存に失敗しました');
    }
  };

  const handleCancelAnswer = () => {
    setEditingAnswerId(null);
    setEditingAnswerText('');
  };

  const styles = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
    } as const,
    header: {
      textAlign: 'center' as const,
      marginBottom: '30px',
    } as const,
    title: {
      fontSize: '28px',
      color: '#2c3e50',
      marginBottom: '10px',
    } as const,
    subtitle: {
      fontSize: '14px',
      color: '#7f8c8d',
    } as const,
    card: {
      backgroundColor: 'white',
      padding: '20px',
      marginBottom: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    } as const,
    sectionTitle: {
      fontSize: '18px',
      color: '#2c3e50',
      marginBottom: '15px',
      marginTop: '0',
    } as const,
    button: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } as const,
    loadingBox: {
      padding: '20px',
      textAlign: 'center' as const,
      color: '#7f8c8d',
    } as const,
    errorBox: {
      padding: '15px',
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      color: '#721c24',
      marginBottom: '15px',
    } as const,
    bioDisplay: {
      padding: '15px',
      backgroundColor: '#f9f9f9',
      borderRadius: '4px',
      border: '1px solid #ecf0f1',
      marginBottom: '15px',
      minHeight: '200px',
      whiteSpace: 'pre-wrap' as const,
      wordWrap: 'break-word' as const,
    } as const,
    smallButton: {
      padding: '6px 12px',
      fontSize: '12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } as const,
    photoImage: {
      width: '100%',
      height: 'auto',
      display: 'block',
      borderRadius: '4px',
    } as const,
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>⏳ データを読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>⚠️ エラー</h1>
        </div>
        <div style={styles.card}>
          <div style={styles.errorBox}>
            <strong>エラー内容:</strong>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!answersWithPhotos || answersWithPhotos.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📖 修正済みテキスト確認</h1>
        </div>
        <div style={styles.card}>
          <p>データがまだ準備できていません。インタビューを進めてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📖 修正済みテキスト確認</h1>
        <p style={styles.subtitle}>
          {user?.name || '（名前未設定）'}さん - {user?.age}歳
        </p>
      </div>

      {/* 自分史テキスト確認・修正 */}
      {biography && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📝 あなたの自分史</h2>

          {!isEditingBio ? (
            <>
              <div style={styles.bioDisplay}>{biography}</div>
              <button
                onClick={() => {
                  setIsEditingBio(true);
                  setEditedBiography(biography);
                }}
                style={{
                  ...styles.button,
                  backgroundColor: '#3498db',
                  color: 'white',
                }}
              >
                ✏️ 修正する
              </button>
            </>
          ) : (
            <>
              <textarea
                value={editedBiography}
                onChange={(e) => setEditedBiography(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '300px',
                  padding: '15px',
                  fontSize: '15px',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  onClick={handleSaveBiography}
                  disabled={isSavingBio}
                  style={{
                    ...styles.button,
                    backgroundColor: '#27ae60',
                    color: 'white',
                    flex: 1,
                    opacity: isSavingBio ? 0.6 : 1,
                  }}
                >
                  {isSavingBio ? '保存中...' : '✅ 修正内容を保存'}
                </button>
                <button
                  onClick={() => setIsEditingBio(false)}
                  style={{
                    ...styles.button,
                    backgroundColor: '#95a5a6',
                    color: 'white',
                    flex: 1,
                  }}
                >
                  ❌ キャンセル
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* インタビュー回答一覧 */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>📋 インタビュー回答一覧</h2>
        <div>
          {answersWithPhotos.map((answer, index) => (
            <div 
              key={index} 
              style={{
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#f9f9f9',
                borderRadius: '4px',
                border: '1px solid #ecf0f1',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ color: '#2c3e50' }}>Q{index + 1}</strong>
              </div>

              {editingAnswerId === index ? (
                <>
                  <textarea
                    value={editingAnswerText}
                    onChange={(e) => setEditingAnswerText(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '10px',
                      fontSize: '14px',
                      border: '1px solid #bdc3c7',
                      borderRadius: '4px',
                      marginBottom: '10px',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleSaveAnswer(index)}
                      style={{
                        ...styles.smallButton,
                        backgroundColor: '#27ae60',
                        color: 'white',
                        flex: 1,
                      }}
                    >
                      💾 保存
                    </button>
                    <button
                      onClick={handleCancelAnswer}
                      style={{
                        ...styles.smallButton,
                        backgroundColor: '#95a5a6',
                        color: 'white',
                        flex: 1,
                      }}
                    >
                      キャンセル
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: '#555', lineHeight: '1.6', marginBottom: '10px' }}>
                    {answer.text || '（回答なし）'}
                  </div>
                  <button
                    onClick={() => handleEditAnswer(index, answer.text)}
                    style={{
                      ...styles.smallButton,
                      backgroundColor: '#3498db',
                      color: 'white',
                    }}
                  >
                    ✏️ 編集
                  </button>
                </>
              )}

              {/* 写真表示 */}
              {answer.photos && answer.photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '15px' }}>
                  {answer.photos.map((photo, pIdx) => (
                    <div key={pIdx}>
                      <img
                        src={`${API_URL}${photo.file_path}`}
                        alt={photo.description || `Q${index + 1}`}
                        style={styles.photoImage}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22%3E画像読込エラー%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* インタビューに戻るボタン */}
      <button
        onClick={() => {
          console.log('📝 インタビュー画面に戻す（セッション再読み込み）');
          // ✅ フラグを設定してインタビュー画面に遷移
          localStorage.setItem('reloadInterviewSession', 'true');
          window.location.hash = 'interview';
        }}
        style={{
          ...styles.button,
          backgroundColor: '#3498db',
          color: 'white',
          width: '100%',
          marginBottom: '15px',
          fontSize: '16px',
          fontWeight: 'bold',
        }}
      >
        📝 インタビューに戻る →
      </button>
    </div>
  );
}
