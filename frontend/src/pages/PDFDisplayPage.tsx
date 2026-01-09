import { useState, useEffect } from 'react';
import { API_URL } from '../config';

// 質問リスト（InterviewPage.tsxと同じ）
const INTERVIEW_QUESTIONS = [
  "いつ、どこで生まれましたか？",
  "どんな環境で育ちましたか？",
  "小・中・高・大の学校名を覚えている範囲で教えてください。",
  "学生時代で最も印象に残っている先生や出来事は何ですか？",
  "進路選択の時、どのように決めましたか？",
  "初めての仕事はどんな仕事でしたか？",
  "仕事人生でやりがいや、最も大切な経験は何でしたか？",
  "仕事での失敗や挫折経験、そこから学んだことは？",
  "家族や友人との思いでについて聞かせてください。",
  "健康や病気について、人生に大きな影響を与えた出来事はありますか？",
  "これまでの人生で学んだ大切な教訓は何ですか？",
  "今、大事にしていることは何ですか？",
  "趣味や好きなことは何ですか？",
  "人生で最も幸せを感じた時期はいつですか？",
  "次の世代（子ども・孫など）に伝えたいメッセージは何ですか？",
  "家族や友人に伝えたいメッセージはありますか？",
  "職場や会社に対して伝えたいメッセージはありますか？",
  "これからの時間の中で、挑戦したいことはありますか？",
  "いま人生を振り返ってどう感じていますか？",
];

interface AnswerWithPhotos {
  text: string;
  photos: any[];
  year?: string;
  month?: string;
  eventAge?: number;
  eventTitle?: string;
  isImportant?: boolean;
}

export default function PDFDisplayPage({
  userId,
  token,
  userInfo,
  answersWithPhotos: initialAnswersWithPhotos = [],
  onComplete
}: {
  userId: number;
  token: string | null;
  userInfo?: { name: string; age: number };
  answersWithPhotos?: AnswerWithPhotos[];
  onComplete: () => void;
}) {
  // ✅ 2つのモード：編集モードとPDF表示モード
  const [currentMode, setCurrentMode] = useState<'edit' | 'pdf'>('edit');
  
  // 編集モード用の状態
  const [answersWithPhotos, setAnswersWithPhotos] = useState<AnswerWithPhotos[]>(initialAnswersWithPhotos);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // PDF表示モード用の状態（現在のコードと同じ）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<any[]>([]);  // ✅ timelines を state に追加

  // サーバーからinterviewAnswersWithPhotosを取得（念のため）
  useEffect(() => {
    if (initialAnswersWithPhotos && initialAnswersWithPhotos.length > 0) {
      console.log('✅ 初期データを使用:', initialAnswersWithPhotos.length, '件');
      return;
    }

    // データがない場合は、サーバーから取得を試みる
    const fetchAnswers = async () => {
      try {
        const apiUrl = API_URL;
        const response = await fetch(`${apiUrl}/api/interview-session/load`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const session = await response.json();
          if (session.answersWithPhotos) {
            console.log('✅ サーバーからデータ取得:', session.answersWithPhotos.length, '件');
            setAnswersWithPhotos(session.answersWithPhotos);
          }
        }
      } catch (error) {
        console.warn('⚠️ サーバーからのデータ取得失敗:', error);
      }
    };

    fetchAnswers();
  }, [initialAnswersWithPhotos, token]);

  // ========== 編集モード用の関数 ==========
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingText(answersWithPhotos[index]?.text || '');
  };

  const saveEdit = async (index: number) => {
    if (!editingText.trim()) {
      alert('回答は空にできません');
      return;
    }

    const updatedAnswers = [...answersWithPhotos];
    updatedAnswers[index].text = editingText;
    setAnswersWithPhotos(updatedAnswers);
    setEditingIndex(null);
    setUnsavedChanges(true);

    console.log('✏️ 編集:', {
      questionIndex: index,
      newText: editingText.substring(0, 50) + '...'
    });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const saveAllChanges = async () => {
    if (!unsavedChanges) {
      alert('変更がありません');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const apiUrl = API_URL;
      const response = await fetch(`${apiUrl}/api/interview-session/update-answers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          answersWithPhotos
        })
      });

      if (!response.ok) {
        throw new Error(`サーバー保存失敗: ${response.status}`);
      }

      setSaveMessage('✅ すべての変更を保存しました');
      setUnsavedChanges(false);
      console.log('✅ サーバーに保存完了');

      // 2秒後にメッセージを消す
      setTimeout(() => {
        setSaveMessage(null);
      }, 2000);
    } catch (error) {
      console.error('❌ 保存エラー:', error);
      setSaveMessage('❌ 保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  // ========== PDF表示モード用の関数 ==========
  const generatePDF = async () => {
    try {
      setProgress(10);
      console.log('📄 PDF生成開始 - userId:', userId);

      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      // Step 1: timeline データを取得
      console.log('📚 Timeline データを取得中...');
      const timelineResponse = await fetch(`${apiUrl}/api/timeline`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let timelinesData: any[] = [];
      if (timelineResponse.ok) {
        timelinesData = await timelineResponse.json();
        setTimelines(timelinesData);  // ✅ state に保存
        console.log('✅ Timeline取得完了:', timelinesData.length, '件');
      } else {
        console.warn('⚠️ Timeline取得に失敗しましたが続行します...');
      }

      setProgress(30);

      // Step 2: PDF生成時に timeline を含める
      console.log('🤖 PDF生成APIにリクエスト送信...');
      const response = await fetch(`${apiUrl}/api/pdf/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timelines: timelinesData,
          answersWithPhotos: answersWithPhotos  // ✅ 修正された回答を送信
        })
      });

      setProgress(50);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF generation error:', errorText);
        throw new Error(`PDFに失敗しました: ${response.status}`);
      }

      // レスポンスを blob として取得
      const blob = await response.blob();
      console.log('✅ PDFバッファ受信 - size:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('PDFバッファが空です');
      }

      // blob URL を作成してプレビュー表示
      const blobUrl = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfUrl(blobUrl);

      setProgress(80);

      // 成功
      setProgress(100);
      setLoading(false);

    } catch (error) {
      console.error('❌ PDF生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'PDF生成に失敗しました';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;

    try {
      // blob から download link を作成
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `autobiography_${userId}_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // blob URL を解放
      URL.revokeObjectURL(blobUrl);

      console.log('✅ PDFダウンロード開始:', link.download);
    } catch (error) {
      console.error('❌ ダウンロードエラー:', error);
      alert('ダウンロードに失敗しました');
    }
  };

  const handleComplete = () => {
    console.log('✅ 自分史PDFが完成しました！');
    alert('🎉 ご利用ありがとうございます！\n\nあなたの素晴らしい人生の物語が完成しました。\n\nPDFをダウンロードして、大切な人と共有してください。');
    onComplete();
  };

  // ========== 進むボタン：編集→PDF ==========
  const proceedToPDF = async () => {
    if (unsavedChanges) {
      const shouldContinue = window.confirm('編集内容がまだ保存されていません。保存して進みますか？');
      if (!shouldContinue) return;
      await saveAllChanges();
    }
    
    setLoading(true);
    setError(null);
    setProgress(0);
    setCurrentMode('pdf');
    
    // PDF生成開始
    setTimeout(() => {
      generatePDF();
    }, 500);
  };

  const styles = {
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '30px',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#7f8c8d',
      marginBottom: '20px',
    },
    card: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
    },
    info: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      fontSize: '15px',
      color: '#2c3e50',
      marginBottom: '20px',
      lineHeight: '1.6',
    },
    messageBox: {
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '15px',
      fontWeight: '600' as const,
    },
    successMessage: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
    },
    errorMessage: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
    },
    warningMessage: {
      backgroundColor: '#fff3cd',
      color: '#856404',
      border: '1px solid #ffeaa7',
    },
    answerContainer: {
      marginBottom: '30px',
      padding: '20px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      borderLeft: '4px solid #3498db',
    },
    questionNumber: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#7f8c8d',
      marginBottom: '8px',
    },
    question: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '12px',
      lineHeight: '1.6',
    },
    answerText: {
      fontSize: '16px',
      color: '#34495e',
      lineHeight: '1.8',
      padding: '12px',
      backgroundColor: 'white',
      borderRadius: '4px',
      marginBottom: '12px',
      minHeight: '60px',
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-word' as const,
    },
    textarea: {
      width: '100%',
      minHeight: '120px',
      padding: '12px',
      fontSize: '16px',
      border: '2px solid #3498db',
      borderRadius: '4px',
      fontFamily: 'inherit',
      marginBottom: '12px',
      fontWeight: 'normal' as const,
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '12px',
    },
    button: {
      padding: '12px 20px',
      fontSize: '14px',
      borderRadius: '4px',
      cursor: 'pointer',
      border: 'none',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      minHeight: '40px',
    },
    editButton: {
      backgroundColor: '#3498db',
      color: 'white',
    },
    saveButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    cancelButton: {
      backgroundColor: '#95a5a6',
      color: 'white',
    },
    actionContainer: {
      display: 'flex',
      gap: '15px',
      marginTop: '30px',
      flexWrap: 'wrap' as const,
    },
    actionButton: {
      padding: '14px 28px',
      fontSize: '16px',
      borderRadius: '8px',
      cursor: 'pointer',
      border: 'none',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      minHeight: '48px',
    },
    saveAllButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    proceedButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
    },
    downloadButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    nextButton: {
      backgroundColor: '#3498db',
      color: 'white',
    },
    progressContainer: {
      width: '100%',
      marginBottom: '30px',
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#ecf0f1',
      borderRadius: '4px',
      overflow: 'hidden' as const,
      marginBottom: '15px',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#3498db',
      width: `${progress}%`,
      transition: 'width 0.3s ease',
    },
    progressText: {
      fontSize: '14px',
      color: '#7f8c8d',
      marginTop: '10px',
    },
    pdfPreviewContainer: {
      backgroundColor: '#f9f9f9',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '2px solid #ddd',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pdfPreview: {
      width: '100%',
      height: '500px',
      border: '1px solid #ccc',
      borderRadius: '4px',
    },
    pdfInfo: {
      backgroundColor: '#fff3cd',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      fontSize: '14px',
      color: '#856404',
      fontWeight: 'bold' as const,
    },
    loadingContainer: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
    },
    spinner: {
      fontSize: '48px',
      marginBottom: '20px',
      animation: 'pulse 1.5s infinite',
    },
    errorBox: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      padding: '20px',
      borderRadius: '4px',
      marginBottom: '20px',
      textAlign: 'left' as const,
    },
  };

  // ========== 編集モードの表示 ==========
  if (currentMode === 'edit') {
    if (!answersWithPhotos || answersWithPhotos.length === 0) {
      return (
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>⚠️ データが見つかりません</h1>
          </div>
          <div style={styles.card}>
            <p style={{ fontSize: '16px', color: '#7f8c8d', textAlign: 'center' }}>
              インタビューデータが見つかりません。<br />
              インタビューから再度開始してください。
            </p>
            <button
              onClick={() => window.location.hash = 'interview'}
              style={{
                ...styles.actionButton,
                backgroundColor: '#3498db',
                color: 'white',
                width: '100%',
                marginTop: '20px',
              }}
            >
              インタビューに戻る
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>✏️ 自分史インタビュー - 編集</h1>
          <p style={styles.subtitle}>回答内容を確認・編集してください</p>
        </div>

        <div style={styles.card}>
          <div style={styles.info}>
            📖 <strong>{userInfo?.name || 'あなた'}さんの自分史</strong><br />
            年齢: {userInfo?.age || 'unknown'}歳<br />
            <br />
            以下の回答を自由に編集できます。編集後に「PDFプレビューへ進む」をクリックしてください。
          </div>

          {saveMessage && (
            <div
              style={{
                ...styles.messageBox,
                ...(saveMessage.startsWith('✅')
                  ? styles.successMessage
                  : saveMessage.startsWith('❌')
                  ? styles.errorMessage
                  : styles.warningMessage),
              }}
            >
              {saveMessage}
            </div>
          )}

          {/* インタビュー回答の表示・編集 */}
          {INTERVIEW_QUESTIONS.map((question, index) => (
            <div key={index} style={styles.answerContainer}>
              <div style={styles.questionNumber}>
                Q{index + 1} / {INTERVIEW_QUESTIONS.length}
              </div>
              <div style={styles.question}>{question}</div>

              {editingIndex === index ? (
                <>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    style={styles.textarea}
                  />
                  <div style={styles.buttonGroup}>
                    <button
                      onClick={() => saveEdit(index)}
                      style={{ ...styles.button, ...styles.saveButton }}
                    >
                      ✅ 保存
                    </button>
                    <button
                      onClick={cancelEditing}
                      style={{ ...styles.button, ...styles.cancelButton }}
                    >
                      ❌ キャンセル
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.answerText}>
                    {answersWithPhotos[index]?.text || '（回答なし）'}
                  </div>
                  <button
                    onClick={() => startEditing(index)}
                    style={{ ...styles.button, ...styles.editButton }}
                  >
                    ✏️ 編集
                  </button>
                </>
              )}

              {/* 重要な出来事の場合、年月情報も表示 */}
              {answersWithPhotos[index]?.isImportant && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#856404',
                  }}
                >
                  <strong>📌 出来事情報:</strong><br />
                  {answersWithPhotos[index]?.eventTitle && (
                    <>タイトル: {answersWithPhotos[index]?.eventTitle}<br /></>
                  )}
                  {answersWithPhotos[index]?.eventAge && (
                    <>年齢: {answersWithPhotos[index]?.eventAge}歳<br /></>
                  )}
                  {answersWithPhotos[index]?.year && (
                    <>年月: {answersWithPhotos[index]?.year}
                    {answersWithPhotos[index]?.month && `年${answersWithPhotos[index]?.month}月`}</>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* アクションボタン */}
          <div style={styles.actionContainer}>
            <button
              onClick={saveAllChanges}
              disabled={!unsavedChanges || isSaving}
              style={{
                ...styles.actionButton,
                ...styles.saveAllButton,
                opacity: !unsavedChanges || isSaving ? 0.6 : 1,
                flex: 1,
              }}
            >
              {isSaving ? '保存中...' : unsavedChanges ? '💾 変更を保存' : '✅ 変更なし'}
            </button>
            <button
              onClick={proceedToPDF}
              disabled={isSaving || loading}
              style={{
                ...styles.actionButton,
                ...styles.proceedButton,
                opacity: isSaving || loading ? 0.6 : 1,
                flex: 1,
              }}
            >
              {loading ? '処理中...' : '📄 PDFプレビューへ進む'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== PDF表示モードの表示 ==========
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>⚠️ PDFエラー</h1>
        </div>
        <div style={styles.card}>
          <div style={styles.errorBox}>
            <strong>エラー内容:</strong>
            <p>{error}</p>
          </div>
          <div style={styles.actionContainer}>
            <button
              onClick={() => {
                setError(null);
                setProgress(0);
                generatePDF();
              }}
              style={{
                ...styles.actionButton,
                backgroundColor: '#e74c3c',
                color: 'white',
                flex: 1,
              }}
            >
              📄 もう一度試す
            </button>
            <button
              onClick={() => {
                setCurrentMode('edit');
                setError(null);
              }}
              style={{
                ...styles.actionButton,
                backgroundColor: '#95a5a6',
                color: 'white',
                flex: 1,
              }}
            >
              ← 編集に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div style={styles.header}>
          <h1 style={styles.title}>📄 自分史PDFを作成中</h1>
          <p style={styles.subtitle}>しばらくおまちください...</p>
        </div>
        <div style={styles.card}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}>⚙️</div>
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div style={styles.progressFill}></div>
              </div>
              <div style={styles.progressText}>
                {progress}% 完了
              </div>
            </div>
            <p style={{ color: '#7f8c8d', marginTop: '20px' }}>
              PDFファイルを生成しています...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // PDF表示画面
  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div style={styles.header}>
        <h1 style={styles.title}>✅ 自分史PDF完成！</h1>
        <p style={styles.subtitle}>あなたの人生の物語が完成しました</p>
      </div>

      <div style={styles.card}>
        <div style={styles.info}>
          📖 <strong>{userInfo?.name || 'あなた'}さんの自分史</strong><br />
          年齢: {userInfo?.age || 'unknown'}歳<br />
          <br />
          以下からPDFファイルをダウンロードして、保存・印刷・共有できます。<br />
          内容の修正が必要な場合は「← 編集に戻る」をクリックしてください。
        </div>

        <div style={styles.pdfInfo}>
          ✨ PDFプレビュー
        </div>

        {pdfUrl && (
          <div style={styles.pdfPreviewContainer}>
            <iframe
              src={pdfUrl}
              style={styles.pdfPreview}
              title="PDF Preview"
            />
          </div>
        )}

        <div style={styles.actionContainer}>
          <button
            onClick={() => {
              setCurrentMode('edit');
              setProgress(0);
            }}
            style={{
              ...styles.actionButton,
              backgroundColor: '#95a5a6',
              color: 'white',
              flex: 1,
            }}
          >
            ← 編集に戻る
          </button>
          <button
            onClick={handleDownload}
            style={{
              ...styles.actionButton,
              ...styles.downloadButton,
              flex: 1,
            }}
          >
            ⬇️ PDFをダウンロード
          </button>
          <button
            onClick={handleComplete}
            style={{
              ...styles.actionButton,
              ...styles.nextButton,
              flex: 1,
            }}
          >
            ✅ 完了
          </button>
        </div>

        <div style={{
          backgroundColor: '#f0f8ff',
          padding: '15px',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#0066cc',
          lineHeight: '1.6',
        }}>
          <strong>💡 ヒント:</strong><br />
          • PDFは何度もダウンロードできます<br />
          • メールに添付したり、SNSで共有できます<br />
          • 印刷して家族に贈るのも素敵です！
        </div>
      </div>
    </div>
  );
}
