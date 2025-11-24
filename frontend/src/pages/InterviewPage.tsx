import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function InterviewPage({ userId }: { userId: number }) {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentAnswer, setCurrentAnswer] = useState<string>(''); // 現在の回答を保存
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false); // 回答中の状態
  const [error, setError] = useState<string | null>(null);

  const startInterview = async () => {
    setIsStarted(true);
    setProcessing(true);
    setError(null);

    try {
      const apiUrl = 'http://localhost:5000';
      
      if (!apiUrl) {
        throw new Error('API URLが設定されていません。.env.localを確認してください。');
      }

      console.log('🔌 API URL:', apiUrl);
      console.log('📤 Sending interview start request...');

      const response = await fetch(`${apiUrl}/api/interview/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          conversation_history: [],
        }),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ API Error:', errorData);
        throw new Error(`質問の生成に失敗しました (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Received question:', data);

      setCurrentQuestion(data.question);
      setConversation([{ role: 'assistant', content: data.question }]);
      setIsAnswering(true); // 回答入力開始
      setCurrentAnswer('');
      setError(null);
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
      
      // 現在の回答に追加（複数回の音声入力を累積）
      const updatedAnswer = currentAnswer 
        ? currentAnswer + '。' + transcript 
        : transcript;
      setCurrentAnswer(updatedAnswer);
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      console.error('❌ 音声認識エラー:', event.error);
      alert(`音声認識エラー: ${event.error}`);
    };

    recognition.start();
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
    setConversation(newConversation);
    setCurrentAnswer(''); // 回答をリセット
    setIsAnswering(false);

    setProcessing(true);
    setError(null);

    try {
      const apiUrl = 'http://localhost:5000';
      
      if (!apiUrl) {
        throw new Error('API URLが設定されていません');
      }

      console.log('📤 Sending next question request...');

      const response = await fetch(`${apiUrl}/api/interview/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          conversation_history: newConversation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ API Error:', errorData);
        throw new Error(`質問の生成に失敗しました (${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Received next question:', data);

      if (data.completed) {
        setCurrentQuestion('');
        await saveConversation(newConversation);
        alert('インタビューが完了しました！');
      } else {
        setCurrentQuestion(data.question);
        setConversation([...newConversation, { role: 'assistant', content: data.question }]);
        setIsAnswering(true); // 次の質問への回答入力開始
        setCurrentAnswer('');
      }
      setError(null);
    } catch (error) {
      console.error('❌ Error:', error);
      const errorMessage = error instanceof Error ? error.message : '質問の生成に失敗しました';
      setError(errorMessage);
      alert(`エラー: ${errorMessage}`);
      setIsAnswering(true); // エラーの場合は再度入力可能にする
    } finally {
      setProcessing(false);
    }
  };

  const saveConversation = async (finalConversation: Message[]) => {
    try {
      const apiUrl = 'http://localhost:5000';
      if (!apiUrl) return;

      await fetch(`${apiUrl}/api/interview/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          conversation: finalConversation,
        }),
      });
    } catch (error) {
      console.error('❌ 保存エラー:', error);
    }
  };

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
    currentAnswerBox: {
      backgroundColor: '#f0f0f0',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '14px',
      color: '#2c3e50',
      lineHeight: '1.6',
      boxSizing: 'border-box' as const,
      borderLeft: '4px solid #3498db',
    },
    currentAnswerLabel: {
      fontWeight: 'bold' as const,
      marginBottom: '8px',
      color: '#3498db',
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
    voiceButtonListening: {
      backgroundColor: '#e74c3c',
      animation: 'pulse 1s infinite',
    },
    submitButton: {
      backgroundColor: '#27ae60',
      color: 'white',
      flex: 2,
    },
  };

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
        AIがあなたに質問していきます。自由にお答えください。マイクボタンで音声入力できます。言い足りなければ、もう一度マイクボタンを押して追加できます。
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

            {currentQuestion && (
              <div style={styles.questionBox}>
                {currentQuestion}
              </div>
            )}

            {isAnswering && currentAnswer && (
              <div style={styles.currentAnswerBox}>
                <div style={styles.currentAnswerLabel}>📝 現在の回答：</div>
                {currentAnswer}
              </div>
            )}

            {isAnswering && currentQuestion && (
              <div style={styles.buttonContainer}>
                <button
                  onClick={startVoiceInput}
                  disabled={listening || processing}
                  style={{
                    ...styles.button,
                    ...styles.voiceButton,
                    ...(listening ? styles.voiceButtonListening : {}),
                    opacity: listening || processing ? 0.6 : 1,
                  }}
                >
                  🎤 {listening ? '聞取中...' : '音声で答える'}
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
                  {processing ? '処理中...' : '次の話題へ →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
