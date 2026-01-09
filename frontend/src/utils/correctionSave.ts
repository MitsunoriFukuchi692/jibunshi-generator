// 📁 このコードはCorrectionPage.tsx内に実装してください

// ============================================
// 修正したデータをサーバーに保存する関数
// ============================================

/**
 * 修正されたanswersWithPhotosをサーバーに保存します
 * @param userId - ユーザーID
 * @param token - 認証トークン
 * @param answersWithPhotos - 修正後の回答データ
 * @returns 保存成功の可否
 */
export const saveCorrectedAnswers = async (
  userId: number,
  token: string | null,
  answersWithPhotos: AnswerWithPhotos[]
): Promise<boolean> => {
  if (!token) {
    console.error('❌ トークンが見つかりません');
    alert('認証エラー。ログインし直してください。');
    return false;
  }

  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    console.log('💾 修正された回答をサーバーに保存開始:', {
      userId,
      answerCount: answersWithPhotos.length,
      timestamp: new Date().toISOString()
    });

    // ✅ エンドポイント: /api/interview-session/update-answers
    const response = await fetch(`${API_URL}/api/interview-session/update-answers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        answersWithPhotos
      })
    });

    // ✅ レスポンスの詳細ログ
    console.log('📡 サーバーレスポンス:', {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Unknown error',
        details: response.statusText
      }));
      
      console.error('❌ サーバー保存失敗:', {
        status: response.status,
        error: errorData.error,
        details: errorData.details
      });

      throw new Error(
        `サーバー保存失敗 (${response.status}): ${errorData.error || 'Unknown error'}`
      );
    }

    const result = await response.json();
    
    console.log('✅ サーバー保存成功:', result);
    console.log('✅ 修正データ保存完了:', {
      user_id: result.user_id,
      updatedAt: result.updatedAt,
      answerCount: answersWithPhotos.length
    });

    return true;

  } catch (error) {
    console.error('❌ 修正データ保存エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    alert(`修正データの保存に失敗しました:\n${errorMessage}\n\nもう一度お試しください。`);
    return false;
  }
};

// ============================================
// 修正ページの「保存」ボタンの実装例
// ============================================

/**
 * 修正ページ内で使用するコード例：
 */

// このコンポーネント内で以下のような構造を使用してください

/*
const [editedAnswers, setEditedAnswers] = useState<AnswerWithPhotos[]>([]);
const [isSaving, setIsSaving] = useState(false);
const [saveSuccess, setSaveSuccess] = useState(false);

const handleSaveCorrections = async () => {
  setIsSaving(true);
  setSaveSuccess(false);

  try {
    // ✅ 修正内容が空でないかチェック
    if (editedAnswers.length === 0) {
      alert('修正する内容がありません');
      return;
    }

    // ✅ サーバーに保存
    const success = await saveCorrectedAnswers(userId, token, editedAnswers);

    if (success) {
      setSaveSuccess(true);
      
      // ✅ 親コンポーネントに修正後のデータを返す
      if (onCorrectionComplete) {
        onCorrectionComplete(editedAnswers);
      }

      // ✅ 成功メッセージを表示（3秒後に自動消去）
      setTimeout(() => {
        setSaveSuccess(false);
        alert('修正内容を保存しました！');
      }, 1500);
    }
  } catch (error) {
    console.error('保存エラー:', error);
  } finally {
    setIsSaving(false);
  }
};

// UIのサンプル（JSX）
return (
  <div>
    {saveSuccess && (
      <div style={{
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '12px',
        marginBottom: '15px',
        borderRadius: '4px',
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        ✅ 修正内容が正常に保存されました
      </div>
    )}

    {/* 修正フォーム */}
    {editedAnswers.map((answer, idx) => (
      <div key={idx} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>質問 {idx + 1}</h3>
        <textarea
          value={answer.text}
          onChange={(e) => {
            const updated = [...editedAnswers];
            updated[idx].text = e.target.value;
            setEditedAnswers(updated);
          }}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontFamily: 'inherit'
          }}
        />
      </div>
    ))}

    <button
      onClick={handleSaveCorrections}
      disabled={isSaving}
      style={{
        backgroundColor: '#27ae60',
        color: 'white',
        padding: '12px 30px',
        borderRadius: '4px',
        border: 'none',
        cursor: isSaving ? 'not-allowed' : 'pointer',
        fontWeight: 'bold',
        fontSize: '16px',
        opacity: isSaving ? 0.6 : 1
      }}
    >
      {isSaving ? '保存中...' : '修正内容を保存'}
    </button>
  </div>
);
*/
