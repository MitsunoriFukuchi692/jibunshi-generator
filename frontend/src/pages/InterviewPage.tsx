import { useState, useEffect, useRef } from 'react';
import TextCorrectionPage from './TextCorrectionPage';
import { API_URL } from '../config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SelectedPhoto {
  id: number;
  file_path: string;
  description: string;
}

interface AnswerWithPhotos {
  text: string;
  photos: SelectedPhoto[];
}

interface InterviewSession {
  conversation: Message[];
  answersWithPhotos: AnswerWithPhotos[];
  currentQuestionIndex: number;
  timestamp: number;
}

interface Photo {
  id: number;
  filename: string;
  file_path: string;
  description: string;
  uploaded_at: string;
}

// 新しい質問リスト（21個）
const INTERVIEW_QUESTIONS = [
  // 第1部：基本情報（生い立ち）
  "どこで、いつ生まれましたか？どんな環境で育ちましたか？",
  
  // 第2部：学生時代
  "小中高大の学校名を教えてください。",
  "学生時代で最も印象に残っていることは何ですか？",
  "進路選択の時、どのように決めましたか？",
  
  // 第3部：仕事・キャリア
  "初めての仕事について教えてください。",
  "仕事人生で最も大切な経験は何ですか？",
  "仕事でのやりがいや成功体験を聞かせてください。",
  "仕事での失敗や挫折経験、そこから学んだことは？",
  
  // 第4部：家族・人間関係
  "家族や友人との関係について聞かせてください。",
  "趣味や好きなこと、人生で最も幸せを感じた時期は何ですか？",
  
  // 第5部：健康・人生の転機
  "健康や病気について、人生に大きな影響を与えた出来事はありますか？",
  
  // 第6部：人生の教訓
  "これまでの人生で学んだ大切な教訓は何ですか？",
  "今、大事にしていることは何ですか？",
  
  // 第7部：メッセージ（複数対象）
  "次の世代（子ども・孫など）に伝えたいメッセージは何ですか？",
  "家族に伝えたいメッセージはありますか？",
  "友人に伝えたいメッセージはありますか？",
  "職場や会社に対して伝えたいメッセージはありますか？",
  
  // 第8部：総括
  "人生を振り返ってどう感じていますか？",
  "これからの時間の中で、挑戦したいことはありますか？",
];

export default function InterviewPage({ userId, token }: { userId: number; token: string | null }) {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [answersWithPhotos, setAnswersWithPhotos] = useState<AnswerWithPhotos[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [currentPhotos, setCurrentPhotos] = useState<SelectedPhoto[]>([]);
  const [availablePhotos, setAvailablePhotos] = useState<Photo[]>([]);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [showQuestionsList, setShowQuestionsList] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCorrectionPage, setShowCorrectionPage] = useState(false);
  const [finalConversation, setFinalConversation] = useState<Message[]>([]);
  const [finalAnswersWithPhotos, setFinalAnswersWithPhotos] = useState<AnswerWithPhotos[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // ファイル入力用ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PCから直接写真を選択
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const selectedPhoto: SelectedPhoto = {
          id: Date.now() + i,
          file_path: base64,
          description: file.name,
        };

        setCurrentPhotos((prev) => [...prev, selectedPhoto]);
        setUnsavedChanges(true);
      };

      reader.readAsDataURL(file);
    }

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 写真一覧を取得（オプション機能 - 削除してもOK）
  const fetchPhotos = async () => {
    try {
      const apiUrl = API_URL;
      const response = await fetch(`${apiUrl}/api/photos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const photos = await response.json();
        setAvailablePhotos(photos);
      }
    } catch (error) {
      console.error('❌ 写真取得エラー:', error);
    }
  };

  // LocalStorage からセッションを復元
  useEffect(() => {
    const saved = localStorage.getItem(`interview_session_${userId}`);
    if (saved) {
      try {
        const session: InterviewSession = JSON.parse(saved);
        // セッションが24時間以内であれば復元
        if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          setConversation(session.conversation);
          setAnswersWithPhotos(session.answersWithPhotos);
          setCurrentQuestionIndex(session.currentQuestionIndex);
          setIsStarted(true);
          setIsAnswering(true);
        } else {
          localStorage.removeItem(`interview_session_${userId}`);
        }
      } catch (e) {
        console.error('セッション復元エラー:', e);
      }
    }

    // 写真を取得（今後の拡張機能用）
    fetchPhotos();
  }, [userId, token]);

  // 自動保存（30秒ごと）
  useEffect(() => {
    if (!isStarted || conversation.length === 0) return;

    const interval = setInterval(() => {
      saveSessionToLocalStorage();
    }, 30000); // 30秒ごと

    return () => clearInterval(interval);
  }, [conversation, answersWithPhotos, currentQuestionIndex, userId]);

  const saveSessionToLocalStorage = () => {
    const session: InterviewSession = {
      conversation,
      answersWithPhotos,
      currentQuestionIndex,
      timestamp: Date.now(),
    };
    localStorage.setItem(`interview_session_${userId}`, JSON.stringify(session));
    console.log('✅ セッション保存完了');
  };

  const getCurrentQuestion = (): string => {
    return INTERVIEW_QUESTIONS[currentQuestionIndex] || '';
  };

  const startInterview = async () => {
    setIsStarted(true);
    setShowQuestionsList(false);
    setProcessing(true);
    setError(null);

    try {
      const question = getCurrentQuestion();
      setConversation([{ role: 'assistant', content: question }]);
      setIsAnswering(true);
      setCurrentAnswer('');
      setCurrentPhotos([]);
      saveSessionToLocalStorage();
    } catch (error) {
      console.error('❌ Interview error:', error);
      const errorMessage = error instanceof Error ? error.message : 'インタビューの開始に失敗しました';
      setError(errorMessage);
      alert(`エラー: ${errorMessage}`);
      setIsStarted(false);
    } finally {
      setProcessing(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('お使いのブラウザは音声入力に対応していません');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';

    setListening(true);
    setError(null);

    recognition.onstart = () => {
      console.log('🎤 音声認識開始...');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      console.log('📝 Transcript:', transcript);
      setListening(false);

      const updatedAnswer = currentAnswer
        ? currentAnswer + '。' + transcript
        : transcript;
      setCurrentAnswer(updatedAnswer);
      setUnsavedChanges(true);
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      console.error('❌ 音声認識エラー:', event.error);
      alert(`音声認識エラー: ${event.error}`);
    };

    recognition.start();
  };

  const addPhoto = (photo: Photo) => {
    const selectedPhoto: SelectedPhoto = {
      id: photo.id,
      file_path: photo.file_path,
      description: photo.description,
    };

    if (!currentPhotos.find(p => p.id === photo.id)) {
      setCurrentPhotos([...currentPhotos, selectedPhoto]);
      setUnsavedChanges(true);
    }
    setShowPhotoModal(false);
  };

  const removePhoto = (photoId: number) => {
    setCurrentPhotos(currentPhotos.filter(p => p.id !== photoId));
    setUnsavedChanges(true);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert('何か答えてください');
      return;
    }

    const newConversation: Message[] = [
      ...conversation,
      { role: 'user', content: currentAnswer },
    ];
    const newAnswersWithPhotos: AnswerWithPhotos[] = [
      ...answersWithPhotos,
      { text: currentAnswer, photos: currentPhotos },
    ];

    setConversation(newConversation);
    setAnswersWithPhotos(newAnswersWithPhotos);
    setCurrentAnswer('');
    setCurrentPhotos([]);
    setIsAnswering(false);
    setProcessing(true);
    setError(null);

    try {
      // 次の質問を取得
      const nextIndex = currentQuestionIndex + 1;

      if (nextIndex >= INTERVIEW_QUESTIONS.length) {
        // インタビュー完了
        await saveConversation(newConversation, newAnswersWithPhotos);
        setFinalConversation(newConversation);
        setFinalAnswersWithPhotos(newAnswersWithPhotos);
        setShowCorrectionPage(true);
        localStorage.removeItem(`interview_session_${userId}`);
      } else {
        // 次の質問を表示
        const nextQuestion = INTERVIEW_QUESTIONS[nextIndex];
        setCurrentQuestionIndex(nextIndex);
        setConversation([...newConversation, { role: 'assistant', content: nextQuestion }]);
        setIsAnswering(true);
        setUnsavedChanges(false);
        saveSessionToLocalStorage();
      }
      setError(null);
    } catch (error) {
      console.error('❌ Error:', error);
      const errorMessage = error instanceof Error ? error.message : '質問の生成に失敗しました';
      setError(errorMessage);
      alert(`エラー: ${errorMessage}`);
      setIsAnswering(true);
    } finally {
      setProcessing(false);
    }
  };

  const saveAndPause = async () => {
    saveSessionToLocalStorage();
    alert('進捗を保存しました。後で続きから再開できます。');
  };

  const saveConversation = async (finalConversation: Message[], finalAnswersWithPhotos: AnswerWithPhotos[]) => {
    try {
      const apiUrl = API_URL;
      if (!apiUrl) return;

      const responses = finalConversation
        .filter((msg, idx) => idx % 2 === 1) // ユーザーの回答のみ
        .map((msg) => msg.content);

      await fetch(`${apiUrl}/api/interview/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          conversation: finalConversation,
          responses,
          answersWithPhotos: finalAnswersWithPhotos,
        }),
      });

    } catch (error) {
      console.error('❌ 保存エラー:', error);
    }
  };

  const progress = (currentQuestionIndex / INTERVIEW_QUESTIONS.length) * 100;

  const styles = {
    container: {
      maxWidth: '800px',
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
    info: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      fontSize: '14px',
      color: '#2c3e50',
      marginBottom: '20px',
      lineHeight: '1.6',
    },
    progressBar: {
      backgroundColor: '#ecf0f1',
      borderRadius: '4px',
      height: '20px',
      marginBottom: '20px',
      overflow: 'hidden',
    },
    progressFill: {
      backgroundColor: '#3498db',
      height: '100%',
      transition: 'width 0.3s ease',
    },
    progressText: {
      fontSize: '12px',
      color: '#2c3e50',
      marginBottom: '10px',
      textAlign: 'center' as const,
    },
    errorBox: {
      backgroundColor: '#fdeaea',
      color: '#c53030',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      borderLeft: '4px solid #c53030',
    },
    card: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      boxSizing: 'border-box' as const,
    },
    conversationBox: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      maxHeight: '400px',
      overflowY: 'auto' as const,
      marginBottom: '20px',
      boxSizing: 'border-box' as const,
    },
    message: {
      marginBottom: '15px',
      padding: '10px',
      borderRadius: '4px',
      wordBreak: 'break-word' as const,
    },
    assistantMessage: {
      backgroundColor: '#e8f4f8',
      textAlign: 'left' as const,
    },
    userMessage: {
      backgroundColor: '#d5f4e6',
      textAlign: 'right' as const,
      marginLeft: '30%',
    },
    questionBox: {
      backgroundColor: '#fff3cd',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '16px',
      fontWeight: 'bold' as const,
      color: '#856404',
      lineHeight: '1.6',
      boxSizing: 'border-box' as const,
    },
    textInputBox: {
      backgroundColor: '#f0f0f0',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxSizing: 'border-box' as const,
    },
    textInputLabel: {
      fontWeight: 'bold' as const,
      marginBottom: '10px',
      color: '#3498db',
      display: 'block',
    },
    textarea: {
      width: '100%',
      minHeight: '120px',
      padding: '15px',
      fontSize: '14px',
      fontFamily: 'serif',
      lineHeight: '1.6',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
      color: '#2c3e50',
    },
    photosContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '10px',
      marginBottom: '20px',
      marginTop: '10px',
    },
    photoCard: {
      position: 'relative' as const,
      borderRadius: '4px',
      overflow: 'hidden',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    photoImage: {
      width: '100%',
      height: '100px',
      objectFit: 'cover' as const,
    },
    removePhotoButton: {
      position: 'absolute' as const,
      top: '5px',
      right: '5px',
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '24px',
      height: '24px',
      cursor: 'pointer',
      fontSize: '16px',
      padding: '0',
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      flexWrap: 'wrap' as const,
    },
    button: {
      flex: 1,
      padding: '12px',
      fontSize: '14px',
      borderRadius: '4px',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s ease',
      minHeight: '44px',
      minWidth: '120px',
    },
    startButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    voiceButton: {
      backgroundColor: '#3498db',
      color: 'white',
    },
    submitButton: {
      backgroundColor: '#27ae60',
      color: 'white',
      flex: 2,
    },
    photoButton: {
      backgroundColor: '#9b59b6',
      color: 'white',
    },
    pauseButton: {
      backgroundColor: '#f39c12',
      color: 'white',
    },
    questionsList: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      maxHeight: '500px',
      overflowY: 'auto' as const,
      marginBottom: '20px',
    },
    questionItem: {
      padding: '12px',
      marginBottom: '10px',
      backgroundColor: 'white',
      borderRadius: '4px',
      borderLeft: '4px solid #3498db',
    },
    modal: {
      position: 'fixed' as const,
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflowY: 'auto' as const,
      boxSizing: 'border-box' as const,
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 'bold' as const,
      marginBottom: '20px',
      color: '#2c3e50',
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: '10px',
    },
    photoGridItem: {
      cursor: 'pointer',
      borderRadius: '4px',
      overflow: 'hidden',
      border: '2px solid transparent',
      transition: 'all 0.3s ease',
    },
    photoGridItemHover: {
      border: '2px solid #3498db',
    },
  };

  // 修正画面を表示中
  if (showCorrectionPage) {
    return (
      <TextCorrectionPage
        userId={userId}
        token={token}
        conversation={finalConversation}
        answersWithPhotos={finalAnswersWithPhotos}
        onComplete={() => {
          alert('自動修正が完了しました！');
          setShowCorrectionPage(false);
          setIsStarted(false);
          setCurrentQuestionIndex(0);
          setConversation([]);
          setAnswersWithPhotos([]);
        }}
      />
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @media (max-width: 768px) {
          [style*="marginLeft: '30%'"] {
            margin-left: 10% !important;
          }
        }
      `}</style>

      <div style={styles.header}>
        <h1 style={styles.title}>🎤 自分史インタビュー</h1>
      </div>

      <div style={styles.info}>
        AIがあなたに質問していきます。自由にお答えください。マイクボタンで音声入力できます。言い足りなければ、もう一度マイクボタンを押して追加できます。PCから写真を直接選んで追加することもできます。
      </div>

      {error && (
        <div style={styles.errorBox}>
          <strong>エラー:</strong> {error}
        </div>
      )}

      <div style={styles.card}>
        {!isStarted ? (
          <div style={{ textAlign: 'center' as const }}>
            <p style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '20px' }}>
              インタビューを開始する準備はできていますか？
            </p>
            <button
              onClick={() => setShowQuestionsList(!showQuestionsList)}
              style={{
                ...styles.button,
                backgroundColor: '#9b59b6',
                color: 'white',
                width: '200px',
                marginBottom: '20px',
              }}
            >
              📋 質問一覧を確認
            </button>

            {showQuestionsList && (
              <div style={styles.questionsList}>
                <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>全{INTERVIEW_QUESTIONS.length}の質問</h3>
                {INTERVIEW_QUESTIONS.map((q, idx) => (
                  <div key={idx} style={styles.questionItem}>
                    <strong>Q{idx + 1}:</strong> {q}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={startInterview}
              disabled={processing}
              style={{
                ...styles.button,
                ...styles.startButton,
                width: '200px',
                opacity: processing ? 0.6 : 1,
              }}
            >
              {processing ? 'インタビュー開始中...' : 'インタビューを開始'}
            </button>
          </div>
        ) : (
          <>
            <div style={styles.progressText}>
              進捗: {currentQuestionIndex + 1} / {INTERVIEW_QUESTIONS.length}
            </div>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${progress}%`}}></div>
            </div>

            {conversation.length > 0 && (
              <div style={styles.conversationBox}>
                {conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.message,
                      ...(msg.role === 'assistant' ? styles.assistantMessage : styles.userMessage),
                    }}
                  >
                    <strong>{msg.role === 'assistant' ? 'AI: ' : 'あなた: '}</strong>
                    {msg.content}
                  </div>
                ))}
              </div>
            )}

            {isAnswering && (
              <>
                <div style={styles.questionBox}>
                  {getCurrentQuestion()}
                </div>

                <div style={styles.textInputBox}>
                  <label style={styles.textInputLabel}>💬 テキストで入力：</label>
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => {
                      setCurrentAnswer(e.target.value);
                      setUnsavedChanges(true);
                    }}
                    placeholder="ここに答えを入力してください..."
                    style={styles.textarea}
                  />

                  {/* 写真表示 */}
                  {currentPhotos.length > 0 && (
                    <div>
                      <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#2c3e50' }}>
                        📷 選択した写真 ({currentPhotos.length}枚)
                      </p>
                      <div style={styles.photosContainer}>
                        {currentPhotos.map((photo) => (
                          <div key={photo.id} style={styles.photoCard}>
                            <img
                              src={photo.file_path}
                              alt="selected"
                              style={styles.photoImage}
                            />
                            <button
                              onClick={() => removePhoto(photo.id)}
                              style={styles.removePhotoButton}
                            >
                              ×
                            </button>
                            {photo.description && (
                              <div style={{ fontSize: '11px', padding: '5px', backgroundColor: '#f0f0f0' }}>
                                {photo.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 隠しファイル入力 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <div style={styles.buttonContainer}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      ...styles.button,
                      ...styles.photoButton,
                    }}
                  >
                    📷 写真を追加
                  </button>
                  <button
                    onClick={startVoiceInput}
                    disabled={listening || processing}
                    style={{
                      ...styles.button,
                      ...styles.voiceButton,
                      opacity: listening || processing ? 0.6 : 1,
                    }}
                  >
                    🎤 {listening ? '聴取中...' : '音声で答える'}
                  </button>
                  <button
                    onClick={submitAnswer}
                    disabled={!currentAnswer.trim() || processing}
                    style={{
                      ...styles.button,
                      ...styles.submitButton,
                      opacity: !currentAnswer.trim() || processing ? 0.6 : 1,
                    }}
                  >
                    {processing ? '処理中...' : '次の質問へ →'}
                  </button>
                </div>

                {unsavedChanges && (
                  <button
                    onClick={saveAndPause}
                    style={{
                      ...styles.button,
                      ...styles.pauseButton,
                      width: '100%',
                      marginTop: '10px',
                    }}
                  >
                    💾 進捗を保存して一時中断
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* 写真選択モーダル（アップロード済みから選ぶ場合用） */}
      {showPhotoModal && (
        <div style={styles.modal} onClick={() => setShowPhotoModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📷 写真を選択</h2>
            {availablePhotos.length === 0 ? (
              <p style={{ color: '#7f8c8d' }}>
                アップロード済みの写真がありません。写真を追加ボタンからPCから選んでください。
              </p>
            ) : (
              <div style={styles.photoGrid}>
                {availablePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      ...styles.photoGridItem,
                      ...(currentPhotos.find(p => p.id === photo.id) ? styles.photoGridItemHover : {}),
                    }}
                    onClick={() => addPhoto(photo)}
                  >
                    <img
                      src={`${API_URL}${photo.file_path}`}
                      alt={photo.filename}
                      style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowPhotoModal(false)}
              style={{
                ...styles.button,
                width: '100%',
                marginTop: '20px',
                backgroundColor: '#3498db',
                color: 'white',
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
