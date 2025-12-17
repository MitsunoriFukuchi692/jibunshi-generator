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
  isImportant?: boolean;  // ✅ 新: 重要な出来事かどうか
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

// 質問リスト（21個）
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

export default function InterviewPage({ 
  userId, 
  token,
  userInfo,
  onCorrectionStart,
  onAIGenerationStart
}: { 
  userId: number; 
  token: string | null;
  userInfo?: { name: string; age: number };
  onCorrectionStart?: (conversation: Message[], answersWithPhotos: AnswerWithPhotos[]) => void;
  onAIGenerationStart?: (answersWithPhotos: AnswerWithPhotos[]) => void;
}) {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [answersWithPhotos, setAnswersWithPhotos] = useState<AnswerWithPhotos[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [currentPhotos, setCurrentPhotos] = useState<SelectedPhoto[]>([]);
  const [eventYear, setEventYear] = useState<string>('');
  const [eventMonth, setEventMonth] = useState<string>('');
  const [isImportantEvent, setIsImportantEvent] = useState(false);  // ✅ 新: 重要な出来事フラグ
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

  // 写真一覧を取得
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
    console.log('📊 保存されたanswersWithPhotos数:', answersWithPhotos.length);
    console.log('📸 最後の回答の写真数:', answersWithPhotos[answersWithPhotos.length - 1]?.photos.length || 0);
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
      const errorMessage = error instanceof Error ? error.message : '聞き取りの開始に失敗しました';
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
      alert('お使いのブラウザはマイク入力に対応していません');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    
    // ✅ 修正: 複数の音声を継続的に認識
    recognition.continuous = true;   // 複数の音声を認識
    recognition.interimResults = true;  // 途中結果も取得

    setListening(true);

    recognition.onstart = () => {
      console.log('🎤 マイク開始 - continuous mode');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      
      // ✅ 修正: isFinal=true（確定した結果）のみを処理
      // これにより、音声認識中の揺らぎを防ぎ、確定した部分だけを追加
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {  // ← ここが重要: 確定結果のみ
          transcript += event.results[i][0].transcript;
        }
      }

      if (transcript) {
        console.log('📝 Transcript (final):', transcript);
        
        // ✅ 修正: setCurrentAnswer で前のテキストを保持
        setCurrentAnswer((prev) => {
          if (prev && prev.trim() !== '') {
            // 前のテキストがあれば、改行で連結
            // （日本語はスペース不要）
            return prev + '\n' + transcript;
          } else {
            return transcript;
          }
        });
        setUnsavedChanges(true);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ マイク認識エラー:', event.error);
      if (event.error !== 'no-speech') {
        alert(`マイク認識エラー: ${event.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      console.log('✅ マイク終了');
      setListening(false);
    };

    recognition.start();
  };


  const removePhoto = (photoId: number) => {
    setCurrentPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setUnsavedChanges(true);
  };

  const addPhoto = (photo: Photo) => {
    const alreadyExists = currentPhotos.find((p) => p.id === photo.id);
    if (alreadyExists) {
      setCurrentPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } else {
      const newPhoto: SelectedPhoto = {
        id: photo.id,
        file_path: photo.file_path,
        description: photo.description || '',
      };
      setCurrentPhotos((prev) => [...prev, newPhoto]);
    }
    setUnsavedChanges(true);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert('回答を入力してください');
      return;
    }

    // ✅ 重要な出来事の場合、年月入力チェック
    if (isImportantEvent && !eventYear.trim()) {
      alert('重要な出来事の場合は、少なくとも年を入力してください');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // ✅ 重要な出来事の場合だけ年月を記録、そうでなければ記録しない
      const newAnswerWithPhotos: AnswerWithPhotos = {
        text: currentAnswer,
        photos: currentPhotos,
        year: isImportantEvent ? (eventYear || undefined) : undefined,
        month: isImportantEvent ? (eventMonth || undefined) : undefined,
        isImportant: isImportantEvent,  // ✅ 重要フラグを記録
      };

      const newAnswersWithPhotos = [...answersWithPhotos, newAnswerWithPhotos];
      setAnswersWithPhotos(newAnswersWithPhotos);

      console.log('📝 回答を保存:', {
        questionIndex: currentQuestionIndex,
        isImportant: isImportantEvent,
        year: newAnswerWithPhotos.year,
        month: newAnswerWithPhotos.month,
      });

      // 会話に追加
      const newConversation = [...conversation, { role: 'user', content: currentAnswer }];

      // 次の質問があるか確認
      if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
        const nextQuestion = INTERVIEW_QUESTIONS[currentQuestionIndex + 1];
        newConversation.push({ role: 'assistant', content: nextQuestion });
        setConversation(newConversation);
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentAnswer('');
        setCurrentPhotos([]);
        setEventYear('');
        setEventMonth('');
        setIsImportantEvent(false);  // ✅ 重要フラグをリセット
        setUnsavedChanges(false);
        saveSessionToLocalStorage();
      } else {
        // インタビュー完了
        setConversation(newConversation);
        setFinalConversation(newConversation);
        setFinalAnswersWithPhotos(newAnswersWithPhotos);
        setIsAnswering(false);
        localStorage.removeItem(`interview_session_${userId}`);
      }
    } catch (error) {
      console.error('❌ 回答送信エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '回答送信に失敗しました';
      setError(errorMessage);
      alert(`エラー: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const saveAndPause = () => {
    saveSessionToLocalStorage();
    alert('進捗を保存しました。後で再開できます。');
    setUnsavedChanges(false);
  };

  const progress =
    INTERVIEW_QUESTIONS.length > 0 ? ((currentQuestionIndex + 1) / INTERVIEW_QUESTIONS.length) * 100 : 0;

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9f7f4',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif',
    },
    card: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '800px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '30px',
      textAlign: 'center' as const,
    },
    progressText: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '15px',
    },
    progressBar: {
      width: '100%',
      height: '16px',
      backgroundColor: '#ecf0f1',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '20px',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#3498db',
      transition: 'width 0.3s ease',
    },
    conversationBox: {
      marginBottom: '30px',
      maxHeight: '400px',
      overflowY: 'auto' as const,
      paddingBottom: '20px',
      borderBottom: '2px solid #ecf0f1',
    },
    message: {
      marginBottom: '15px',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '16px',
      lineHeight: '1.6',
    },
    assistantMessage: {
      backgroundColor: '#ecf0f1',
      color: '#2c3e50',
    },
    userMessage: {
      backgroundColor: '#3498db',
      color: 'white',
      marginLeft: '40px',
    },
    questionBox: {
      backgroundColor: '#fff9e6',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '18px',
      fontWeight: '600',
      color: '#2c3e50',
      lineHeight: '1.8',
    },
    textInputBox: {
      marginBottom: '20px',
    },
    textInputLabel: {
      display: 'block',
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '10px',
    },
    textarea: {
      width: '100%',
      minHeight: '120px',
      padding: '12px',
      fontSize: '16px',
      border: '2px solid #bdc3c7',
      borderRadius: '8px',
      fontFamily: 'inherit',
      marginBottom: '15px',
    },
    yearMonthContainer: {
      display: 'flex',
      gap: '15px',
      marginBottom: '20px',
    },
    yearMonthLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '8px',
    },
    yearMonthInput: {
      width: '100%',
      padding: '10px',
      fontSize: '16px',
      border: '2px solid #bdc3c7',
      borderRadius: '8px',
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      marginBottom: '20px',
    },
    button: {
      padding: '14px 24px',
      fontSize: '16px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minHeight: '48px',
    },
    photoButton: {
      backgroundColor: '#9b59b6',
      color: 'white',
    },
    voiceButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
    },
    submitButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    pauseButton: {
      backgroundColor: '#f39c12',
      color: 'white',
      fontWeight: '600',
    },
    startButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    photosContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '12px',
      marginTop: '15px',
    },
    photoCard: {
      position: 'relative' as const,
      borderRadius: '8px',
      overflow: 'hidden',
      border: '2px solid #bdc3c7',
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
      width: '30px',
      height: '30px',
      padding: '0',
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: '18px',
      fontWeight: 'bold',
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
      padding: '30px',
      borderRadius: '12px',
      maxWidth: '700px',
      maxHeight: '80vh',
      overflowY: 'auto' as const,
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '20px',
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: '12px',
      marginBottom: '20px',
    },
    photoGridItem: {
      cursor: 'pointer',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '2px solid #bdc3c7',
      transition: 'all 0.3s ease',
    },
    photoGridItemHover: {
      border: '3px solid #27ae60',
      boxShadow: '0 0 8px rgba(39, 174, 96, 0.5)',
    },
    questionsList: {
      backgroundColor: '#f5f5f5',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      maxHeight: '400px',
      overflowY: 'auto' as const,
    },
    questionItem: {
      padding: '12px',
      marginBottom: '10px',
      backgroundColor: 'white',
      borderLeft: '4px solid #3498db',
      fontSize: '15px',
      lineHeight: '1.6',
    },
  };

  if (showCorrectionPage) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.title}>聞き取り完了しました</div>
          <p style={{ fontSize: '16px', marginBottom: '20px', textAlign: 'center', color: '#7f8c8d' }}>
            内容を確認してから、修正ページに進みます。
          </p>
          <button
            onClick={() => {
              setShowCorrectionPage(false);
              if (onCorrectionStart) {
                onCorrectionStart(finalConversation, finalAnswersWithPhotos);
              }
            }}
            style={{
              ...styles.button,
              ...styles.startButton,
              width: '100%',
            }}
          >
            修正ページへ進む
          </button>
        </div>
      </div>
    );
  }

  if (!isAnswering && isStarted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.title}>聞き取り完了しました 🎉</div>
          <div style={{ marginBottom: '30px', fontSize: '16px', lineHeight: '1.8' }}>
            <p style={{ marginBottom: '15px' }}>
              <strong>作成者情報:</strong> {userInfo?.name || '未設定'} （{userInfo?.age || '未設定'}歳）
            </p>
            <p style={{ marginBottom: '15px' }}>
              <strong>質問数:</strong> {INTERVIEW_QUESTIONS.length}問中 {currentQuestionIndex}問完了
            </p>
            <p>
              <strong>回答数:</strong> {answersWithPhotos.length}個の回答を記録しました
            </p>
          </div>

          <button
            onClick={() => {
              if (onAIGenerationStart) {
                onAIGenerationStart(finalAnswersWithPhotos || answersWithPhotos);
              }
            }}
            style={{
              ...styles.button,
              ...styles.startButton,
              width: '100%',
              marginBottom: '12px',
            }}
          >
            AI作成を開始する
          </button>

          <button
            onClick={() => {
              if (onCorrectionStart) {
                onCorrectionStart(finalConversation, finalAnswersWithPhotos);
              }
            }}
            style={{
              ...styles.button,
              backgroundColor: '#3498db',
              color: 'white',
              width: '100%',
            }}
          >
            修正ページへ進む
          </button>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.title}>人生記録</div>
          <p style={{ fontSize: '18px', textAlign: 'center', marginBottom: '30px', color: '#7f8c8d', lineHeight: '1.8' }}>
            こんにちは。今日は、あなたの人生のお話を聞かせていただきたいと思います。
          </p>

          <div style={{ marginBottom: '30px', fontSize: '16px', color: '#34495e', lineHeight: '1.8' }}>
            <p style={{ marginBottom: '15px' }}>
              <strong>作成者:</strong> {userInfo?.name || '未設定'}
            </p>
            <p>
              <strong>年齢:</strong> {userInfo?.age || '未設定'}歳
            </p>
          </div>

          {error && (
            <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '15px' }}>
              エラー: {error}
            </div>
          )}

            <button
              onClick={() => setShowQuestionsList(!showQuestionsList)}
              style={{
                ...styles.button,
                backgroundColor: '#95a5a6',
                color: 'white',
                marginBottom: '20px',
                width: '100%',
              }}
            >
              {showQuestionsList ? '質問リストを非表示' : '質問リストを表示'}
            </button>

            {showQuestionsList && (
              <div style={styles.questionsList}>
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
                width: '100%',
                opacity: processing ? 0.6 : 1,
                fontSize: '18px',
              }}
            >
              {processing ? '聞き取り開始中...' : '聞き取りを開始'}
            </button>
          </div>
        </div>
      );
    }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
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

              {/* ✅ 重要な出来事チェックボックス */}
              <div style={{ marginTop: '15px', marginBottom: '15px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '16px',
                  color: '#2c3e50',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={isImportantEvent}
                    onChange={(e) => {
                      setIsImportantEvent(e.target.checked);
                      setUnsavedChanges(true);
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      marginRight: '10px',
                      cursor: 'pointer'
                    }}
                  />
                  ⭐ これは人生の重要な出来事です
                </label>
                <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px', marginLeft: '30px' }}>
                  チェックすると、年月を記録して人生年表に表示されます
                </p>
              </div>

              {/* ✅ 重要な出来事の場合だけ年月入力を表示 */}
              {isImportantEvent && (
                <div style={{ 
                  backgroundColor: '#ecf0f1', 
                  padding: '15px', 
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  <label style={styles.textInputLabel}>📅 この出来事が起きた年</label>
                  <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '10px' }}>
                    年だけ入力すればOK。月は覚えていれば入力してください。
                  </p>
                  <div style={styles.yearMonthContainer}>
                    <div style={{ flex: 1 }}>
                      <label style={styles.yearMonthLabel}>年（必須）</label>
                      <input
                        type="text"
                        placeholder="例：1952、1950年代"
                        value={eventYear}
                        onChange={(e) => {
                          setEventYear(e.target.value);
                          setUnsavedChanges(true);
                        }}
                        style={styles.yearMonthInput}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={styles.yearMonthLabel}>月（任意）</label>
                      <input
                        type="number"
                        placeholder="1-12"
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
              )}

              {/* 写真表示 */}
              {currentPhotos.length > 0 && (
                <div>
                  <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#2c3e50', fontSize: '16px' }}>
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
                          <div style={{ fontSize: '12px', padding: '5px', backgroundColor: '#f0f0f0' }}>
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
                📷 写真UP
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
                🎤 {listening ? '聴取中...' : 'マイク'}
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
                {processing ? '処理中...' : '次問→'}
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
                💾 保存して中断
              </button>
            )}
          </>
        )}
      </div>

      {/* 写真選択モーダル */}
      {showPhotoModal && (
        <div style={styles.modal} onClick={() => setShowPhotoModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📷 写真を選択</h2>
            {availablePhotos.length === 0 ? (
              <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
                アップロード済みの写真がありません。写真UPボタンからPCから選んでください。
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
