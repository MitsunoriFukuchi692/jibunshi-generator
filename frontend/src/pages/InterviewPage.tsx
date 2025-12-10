import { useState, useEffect, useRef } from 'react';
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
  year?: string;
  month?: string;
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
  const [eventYear, setEventYear] = useState<string>('');
  const [eventMonth, setEventMonth] = useState<string>('');
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
      setEventYear('');
      setEventMonth('');
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
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setCurrentAnswer((prev) => prev + transcript);
          setUnsavedChanges(true);
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ 音声認識エラー:', event.error);
      setError(`音声認識エラー: ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      console.log('🎤 音声認識終了');
      setListening(false);
    };

    recognition.start();
  };

  const removePhoto = (photoId: number) => {
    setCurrentPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    setUnsavedChanges(true);
  };

  const addPhoto = (photo: Photo) => {
    const newPhoto: SelectedPhoto = {
      id: photo.id,
      file_path: photo.file_path,
      description: photo.description,
    };
    setCurrentPhotos((prev) => {
      const exists = prev.find((p) => p.id === photo.id);
      if (exists) {
        return prev.filter((p) => p.id !== photo.id);
      }
      return [...prev, newPhoto];
    });
    setUnsavedChanges(true);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert('回答を入力してください');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const answerWithPhoto: AnswerWithPhotos = {
        text: currentAnswer,
        photos: currentPhotos,
        year: eventYear || undefined,
        month: eventMonth || undefined,
      };

      setAnswersWithPhotos((prev) => [...prev, answerWithPhoto]);
      setConversation((prev) => [
        ...prev,
        { role: 'user', content: currentAnswer },
      ]);

      // 次の質問へ
      if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        const nextQuestion = INTERVIEW_QUESTIONS[currentQuestionIndex + 1];
        setConversation((prev) => [
          ...prev,
          { role: 'assistant', content: nextQuestion },
        ]);
        setCurrentAnswer('');
        setCurrentPhotos([]);
        setEventYear('');
        setEventMonth('');
        setUnsavedChanges(false);
      } else {
        // インタビュー完了
        setIsAnswering(false);
        setShowCorrectionPage(true);
        setFinalConversation([...conversation, { role: 'user', content: currentAnswer }]);
        setFinalAnswersWithPhotos([...answersWithPhotos, answerWithPhoto]);
      }

      saveSessionToLocalStorage();
    } catch (error) {
      console.error('❌ 回答送信エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '回答の送信に失敗しました';
      setError(errorMessage);
      alert(`エラー: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const saveAndPause = () => {
    saveSessionToLocalStorage();
    alert('進捗を保存しました。後で続けられます。');
    setUnsavedChanges(false);
  };

  const progress = ((currentQuestionIndex + 1) / INTERVIEW_QUESTIONS.length) * 100;

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#2c3e50',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    infoBox: {
      backgroundColor: '#e3f2fd',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      color: '#1565c0',
      lineHeight: '1.6',
    },
    progressText: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#2c3e50',
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#ddd',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '20px',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#4caf50',
      transition: 'width 0.3s ease',
    },
    conversationBox: {
      marginBottom: '20px',
      maxHeight: '300px',
      overflowY: 'auto',
      backgroundColor: '#fff',
      padding: '15px',
      borderRadius: '8px',
      border: '1px solid #ddd',
    },
    message: {
      marginBottom: '12px',
      padding: '10px',
      borderRadius: '6px',
      lineHeight: '1.5',
    },
    assistantMessage: {
      backgroundColor: '#e3f2fd',
      color: '#1565c0',
      marginRight: '20px',
    },
    userMessage: {
      backgroundColor: '#fff9c4',
      color: '#f57f17',
      marginLeft: '20px',
    },
    questionBox: {
      backgroundColor: '#fffde7',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#2c3e50',
      borderLeft: '4px solid #ffd54f',
    },
    textInputBox: {
      backgroundColor: '#f5f5f5',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
    },
    textInputLabel: {
      display: 'block',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#2c3e50',
      fontSize: '14px',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      borderRadius: '6px',
      border: '1px solid #bbb',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      minHeight: '120px',
      boxSizing: 'border-box' as const,
    },
    yearMonthContainer: {
      display: 'flex',
      gap: '15px',
      marginBottom: '15px',
    },
    yearMonthLabel: {
      display: 'block',
      fontWeight: 'bold',
      marginBottom: '5px',
      color: '#2c3e50',
      fontSize: '13px',
    },
    yearMonthInput: {
      width: '100%',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #bbb',
      fontSize: '13px',
      boxSizing: 'border-box' as const,
    },
    button: {
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'background-color 0.3s',
    },
    startButton: {
      backgroundColor: '#2196f3',
      color: 'white',
      margin: '10px auto',
      display: 'block',
    },
    submitButton: {
      backgroundColor: '#4caf50',
      color: 'white',
      flex: 1,
    },
    photoButton: {
      backgroundColor: '#9c27b0',
      color: 'white',
      flex: 1,
    },
    voiceButton: {
      backgroundColor: '#2196f3',
      color: 'white',
      flex: 1,
    },
    pauseButton: {
      backgroundColor: '#ff9800',
      color: 'white',
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      marginBottom: '15px',
    },
    photosContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: '10px',
      marginTop: '10px',
    },
    photoCard: {
      position: 'relative',
      borderRadius: '6px',
      overflow: 'hidden',
      backgroundColor: '#f0f0f0',
    },
    photoImage: {
      width: '100%',
      height: '100px',
      objectFit: 'cover' as const,
    },
    removePhotoButton: {
      position: 'absolute',
      top: '5px',
      right: '5px',
      backgroundColor: 'rgba(255, 0, 0, 0.7)',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '24px',
      height: '24px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold',
    },
    questionsListBox: {
      backgroundColor: '#fff',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      maxHeight: '300px',
      overflowY: 'auto' as const,
      border: '1px solid #ddd',
    },
    questionItem: {
      padding: '10px',
      marginBottom: '8px',
      backgroundColor: '#f9f9f9',
      borderRadius: '6px',
      borderLeft: '4px solid #2196f3',
      color: '#2c3e50',
    },
    modal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      maxHeight: '80vh',
      overflowY: 'auto' as const,
      maxWidth: '600px',
      width: '90%',
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '15px',
      color: '#2c3e50',
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
      gap: '10px',
      marginBottom: '15px',
    },
    photoGridItem: {
      borderRadius: '6px',
      overflow: 'hidden',
      cursor: 'pointer',
      border: '2px solid transparent',
      transition: 'all 0.3s',
    },
    photoGridItemHover: {
      borderColor: '#2196f3',
      boxShadow: '0 0 8px rgba(33, 150, 243, 0.5)',
    },
  };

  if (showCorrectionPage) {
    return (
      <div style={styles.container}>
        <CorrectedTextPage
          conversation={finalConversation}
          answersWithPhotos={finalAnswersWithPhotos}
          userId={userId}
          token={token}
          onBack={() => {
            setShowCorrectionPage(false);
            setIsStarted(false);
            setConversation([]);
            setAnswersWithPhotos([]);
            setCurrentQuestionIndex(0);
          }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔍 自分史インタビュー</h1>

      <div style={styles.infoBox}>
        AIがあなたに質問していきます。自由にお答えください。マイクボタンで音声入力ができます。言い足りなければ、もう一度マイクボタンを押して追加できます。PCからも写真を直接選んで追加することができます。
      </div>

      <div style={styles.container}>
        {!isStarted ? (
          <div>
            <button
              onClick={() => setShowQuestionsList(!showQuestionsList)}
              style={{
                ...styles.button,
                ...styles.startButton,
                width: '200px',
              }}
            >
              {showQuestionsList ? '質問リストを隠す' : '質問リストを表示'}
            </button>

            {showQuestionsList && (
              <div style={styles.questionsListBox}>
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
              <div style={{ ...styles.progressFill, width: `${progress}%` }}></div>
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

                  {/* 年月入力欄 */}
                  <div>
                    <label style={styles.textInputLabel}>📅 この出来事が起きた年月（オプション）</label>
                    <div style={styles.yearMonthContainer}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.yearMonthLabel}>年</label>
                        <input
                          type="number"
                          placeholder="2020"
                          min="1900"
                          max={new Date().getFullYear()}
                          value={eventYear}
                          onChange={(e) => {
                            setEventYear(e.target.value);
                            setUnsavedChanges(true);
                          }}
                          style={styles.yearMonthInput}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.yearMonthLabel}>月</label>
                        <input
                          type="number"
                          placeholder="1"
                          min="1"
                          max="12"
                          value={eventMonth}
                          onChange={(e) => {
                            setEventMonth(e.target.value);
                            setUnsavedChanges(true);
                          }}
                          style={styles.yearMonthInput}
                        />
                      </div>
                    </div>
                  </div>

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

// CorrectedTextPage コンポーネント（簡略版）
function CorrectedTextPage({
  conversation,
  answersWithPhotos,
  userId,
  token,
  onBack,
}: {
  conversation: Message[];
  answersWithPhotos: AnswerWithPhotos[];
  userId: number;
  token: string | null;
  onBack: () => void;
}) {
  const [processing, setProcessing] = useState(false);

  const handleDownloadPDF = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          conversation,
          answersWithPhotos,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'jibunshi.pdf';
        a.click();
      } else {
        alert('PDFの生成に失敗しました');
      }
    } catch (error) {
      console.error('❌ PDF生成エラー:', error);
      alert('PDFの生成中にエラーが発生しました');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>インタビュー完了！</h2>
      <p>あなたの自分史が完成しました。</p>
      <button
        onClick={handleDownloadPDF}
        disabled={processing}
        style={{
          padding: '12px 24px',
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          marginRight: '10px',
        }}
      >
        {processing ? 'PDF生成中...' : 'PDFをダウンロード'}
      </button>
      <button
        onClick={onBack}
        style={{
          padding: '12px 24px',
          backgroundColor: '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        新規インタビュー
      </button>
    </div>
  );
}
