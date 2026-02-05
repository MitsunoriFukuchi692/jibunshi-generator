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
  eventAge?: number;  // ✅ 修正：何歳時の出来事
  eventTitle?: string;  // ✅ 新: 出来事のタイトル
  isImportant?: boolean;  // ✅ 新: 重要な出来事かどうか
}

interface InterviewSession {
  conversation: Message[];
  answersWithPhotos: AnswerWithPhotos[];
  currentQuestionIndex: number;
  timestamp: number;
  version?: number;  // ✅ バージョン管理追加
}

interface Photo {
  id: number;
  filename: string;
  file_path: string;
  description: string;
  uploaded_at: string;
}

// 質問リスト（19個）
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
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventAge, setEventAge] = useState<string>('');  // ✅ 修正：何歳時の出来事
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
  const [savingStatus, setSavingStatus] = useState<string | null>(null);  // ✅ 新: 保存状態を表示

  // ファイル入力用ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ✅ conversationBox の ref（自動スクロール用）
  const conversationBoxRef = useRef<HTMLDivElement>(null);

  // ✅ スクロールバーのスタイルを全体に適用
  useEffect(() => {
    // グローバルスタイルを追加（WebKit ブラウザ用）
    const style = document.createElement('style');
    style.textContent = `
      /* Chrome, Safari, Edge 用スクロールバースタイル */
      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      
      ::-webkit-scrollbar-track {
        background: #f0f0f0;
        border-radius: 5px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #3498db;
        border-radius: 5px;
        border: 2px solid #f0f0f0;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: #2980b9;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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

  // LocalStorage からセッションを復元 + サーバーからも試みる
  useEffect(() => {
    const SESSION_VERSION = 2;  // ✅ バージョン定数

    const restoreSession = async () => {
      // ✅ 修正：保存庫から戻ってきた場合、セッションを強制再読み込み
      const shouldReload = localStorage.getItem('reloadInterviewSession');
      if (shouldReload) {
        console.log('🔄 保存庫から戻ってきたため、セッションを強制再読み込みしています...');
        localStorage.removeItem('reloadInterviewSession');
        // 状態をリセットして、サーバーから必ず新しいセッションを取得
        setConversation([]);
        setAnswersWithPhotos([]);
        setCurrentQuestionIndex(0);
      }

      // ① まずサーバーから復元を試みる（優先）
      if (token && userId) {
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
            const serverSession = await response.json();
            console.log('✅ サーバーレスポンス受け取り:', serverSession);

            if (serverSession && serverSession.currentQuestionIndex !== undefined && serverSession.currentQuestionIndex > 0) {
              console.log('✅ サーバーからセッション復元成功:', {
                conversation: serverSession.conversation.length,
                answers: serverSession.answersWithPhotos.length,
                currentQuestion: serverSession.currentQuestionIndex
              });

              // サーバーから復元したデータを使用
              const normalizedAnswers = (serverSession.answersWithPhotos || []).map((answer: any, idx: number) => ({
                question: answer.question || INTERVIEW_QUESTIONS[idx] || '質問',
                answer: answer.answer || answer.text || '',
                text: answer.text || answer.answer || '',
                photos: Array.isArray(answer.photos) ? answer.photos : [],
                year: answer.year || '',
                month: answer.month || '',
                eventTitle: answer.eventTitle || '',
                isImportant: answer.isImportant || false
              }));

              setConversation(serverSession.conversation);
              setAnswersWithPhotos(normalizedAnswers);
              setCurrentQuestionIndex(serverSession.currentQuestionIndex);
              setIsStarted(true);
              setIsAnswering(true);
              fetchPhotos();
              return; // サーバー復元に成功したので終了
            } else {
              console.log('ℹ️ サーバーにセッションなし - ローカルストレージで復元を試みます');
            }
          } else if (response.status === 404) {
            console.log('ℹ️ サーバーにセッションが保存されていません（404）');
          }
        } catch (error) {
          console.warn('⚠️ サーバー復元失敗、ローカルストレージで復元を試みます:', error);
          // サーバー復元失敗時はローカルストレージにフォールバック
        }
      }

      // ② ローカルストレージから復元（フォールバック）
      const saved = localStorage.getItem(`interview_session_${userId}`);
      if (saved) {
        try {
          const session: InterviewSession = JSON.parse(saved);

          // ✅ バージョンチェック - 古いセッションは削除
          if (session.version !== SESSION_VERSION) {
            console.warn('⚠️ セッションバージョン不一致 - 古いセッションを削除します');
            localStorage.removeItem(`interview_session_${userId}`);
            fetchPhotos();
            return;
          }

          // セッションが24時間以内であれば復元
          if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
            // ✅ データを正規化（undefined を適切な値に置換）
            const normalizedAnswers = (session.answersWithPhotos || []).map((answer: any, idx: number) => ({
              question: answer.question || INTERVIEW_QUESTIONS[idx] || '質問',
              answer: answer.answer || answer.text || '',
              text: answer.text || answer.answer || '',
              photos: Array.isArray(answer.photos) ? answer.photos : [],  // ✅ undefined → []
              year: answer.year || '',
              month: answer.month || '',
              eventTitle: answer.eventTitle || '',
              isImportant: answer.isImportant || false
            }));

            console.log('✅ ローカルストレージからセッション復元:', {
              conversation: session.conversation.length,
              answers: normalizedAnswers.length,
              currentQuestion: session.currentQuestionIndex
            });

            setConversation(session.conversation);
            setAnswersWithPhotos(normalizedAnswers);
            setCurrentQuestionIndex(session.currentQuestionIndex);
            setIsStarted(true);
            setIsAnswering(true);
          } else {
            localStorage.removeItem(`interview_session_${userId}`);
          }
        } catch (e) {
          console.error('❌ セッション復元エラー:', e);
          // 復元失敗時は古いセッションを削除
          localStorage.removeItem(`interview_session_${userId}`);
        }
      }

      fetchPhotos();
    };

    restoreSession();
  }, [userId, token]); // ✅ userId または token が変わるたびに実行される

  // 自動保存（30秒ごと）
  useEffect(() => {
    if (!isStarted || conversation.length === 0) return;

    const interval = setInterval(() => {
      saveSessionToLocalStorage();
    }, 30000); // 30秒ごと

    return () => clearInterval(interval);
  }, [conversation, answersWithPhotos, currentQuestionIndex, userId]);

  // ✅ 自動スクロール：最新の質問が常に見える位置に
  useEffect(() => {
    if (conversationBoxRef.current) {
      // 少し遅延させて、DOM更新後にスクロール
      setTimeout(() => {
        if (conversationBoxRef.current) {
          // 最下部にスクロール
          conversationBoxRef.current.scrollTop = conversationBoxRef.current.scrollHeight;
          console.log('📜 自動スクロール: 最新質問を表示');
        }
      }, 0);
    }
  }, [conversation]); // conversation が更新されるたびに実行

  const saveSessionToLocalStorage = () => {
    const SESSION_VERSION = 2;  // ✅ バージョン定数

    const session: InterviewSession = {
      conversation,
      answersWithPhotos: answersWithPhotos.map(a => ({
        text: a.text || '',
        photos: a.photos || [],  // ✅ 必ず配列に
        year: a.year || '',
        month: a.month || '',
        eventTitle: a.eventTitle || '',
        isImportant: a.isImportant || false
      })),
      currentQuestionIndex,
      timestamp: Date.now(),
      version: SESSION_VERSION  // ✅ バージョンを含める
    };

    try {
      localStorage.setItem(`interview_session_${userId}`, JSON.stringify(session));
      console.log('✅ セッション保存完了');
      console.log('📊 保存されたanswersWithPhotos数:', answersWithPhotos.length);
      console.log('📸 最後の回答の写真数:', answersWithPhotos[answersWithPhotos.length - 1]?.photos.length || 0);
    } catch (error) {
      console.error('❌ セッション保存エラー:', error);
      // localStorage が満杯の場合、古いセッションをすべて削除
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        console.warn('⚠️ localStorage がいっぱいです。古いセッションを削除します');
        localStorage.removeItem(`interview_session_${userId}`);
      }
    }
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
      // ✅ 新規開始時に古いセッションをクリア
      console.log('🔄 新規インタビュー開始 - 古いセッションをクリア');
      localStorage.removeItem(`interview_session_${userId}`);

      // ✅ サーバー側の古いデータも削除（オプション）
      try {
        const apiUrl = API_URL;
        const response = await fetch(`${apiUrl}/api/cleanup/old-data`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user_id: userId })
        });
        if (response.ok) {
          console.log('✅ サーバー側の古いデータを削除しました');
        }
      } catch (cleanupError) {
        console.warn('⚠️ サーバー削除に失敗（続行します）:', cleanupError);
      }

      const question = getCurrentQuestion();
      setConversation([{ role: 'assistant', content: question }]);
      setAnswersWithPhotos([]);  // ✅ 初期化
      setIsAnswering(true);
      setCurrentAnswer('');
      setCurrentPhotos([]);
      setEventYear('');
      setEventMonth('');
      setEventTitle('');  // ✅ eventTitle をリセット
      setIsImportantEvent(false);  // ✅ isImportant をリセット
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
      // ✅ currentPhotos が undefined の場合は空配列に
      const photosToSave = currentPhotos && Array.isArray(currentPhotos) ? currentPhotos : [];

      console.log('💾 回答を保存:', {
        questionIndex: currentQuestionIndex,
        isImportant: isImportantEvent,
        photoCount: photosToSave.length,  // ✅ 0 の場合も明示的にログ
        year: eventYear || 'なし',
        month: eventMonth || 'なし'
      });

      // ✅ 重要な出来事の場合だけ年月を記録、そうでなければ記録しない
      const newAnswer: AnswerWithPhotos = {
        question: INTERVIEW_QUESTIONS[currentQuestionIndex],  // ✅ 質問文を追加
        answer: currentAnswer,                                 // ✅ answer に統一
        text: currentAnswer,
        photos: currentPhotos,
        year: eventYear || 'なし',
        month: eventMonth || null,
        eventAge: eventAge ? parseInt(eventAge) : undefined,
        eventTitle: eventTitle || undefined,
        isImportant: isImportantEvent
      };

      const newAnswersWithPhotos = [...answersWithPhotos, newAnswer];
      setAnswersWithPhotos(newAnswersWithPhotos);

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
        setEventTitle('');  // ✅ eventTitle をリセット
        setEventAge('');  // ✅ 修正：eventAge をリセット
        setIsImportantEvent(false);  // ✅ 重要フラグをリセット
        setUnsavedChanges(false);

        // ✅ 状態更新後にセッション保存（重要）
        // ローカルに保存した後、サーバーにも自動保存
        setTimeout(async () => {
          const SESSION_VERSION = 2;
          const sessionToSave: InterviewSession = {
            conversation: newConversation,
            answersWithPhotos: newAnswersWithPhotos,
            currentQuestionIndex: currentQuestionIndex + 1,
            timestamp: Date.now(),
            version: SESSION_VERSION
          };
          try {
            // ① ローカルストレージに保存
            localStorage.setItem(`interview_session_${userId}`, JSON.stringify(sessionToSave));
            console.log('✅ ローカルストレージにセッション保存');

            // ② 🔥 重要：サーバーにも保存（データ永続化）
            try {
              const apiUrl = API_URL;
              const serverResponse = await fetch(`${apiUrl}/api/interview/save`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  user_id: userId,
                  currentQuestionIndex: currentQuestionIndex + 1,
                  conversation: newConversation,
                  answersWithPhotos: newAnswersWithPhotos,
                  timestamp: Date.now()
                })
              });

              if (serverResponse.ok) {
                console.log('✅ サーバーにセッション自動保存成功');
              } else {
                console.warn('⚠️ サーバー保存失敗（非同期で継続）:', serverResponse.status);
              }
            } catch (serverError) {
              // サーバー保存失敗しても、ローカルには保存されているので処理は続行
              console.warn('⚠️ サーバー保存エラー（ローカルは保存済）:', serverError);
            }
          } catch (e) {
            console.error('❌ セッション保存失敗:', e);
          }
        }, 0);
      } else {
        // インタビュー完了
        setConversation(newConversation);
        setFinalConversation(newConversation);
        setFinalAnswersWithPhotos(newAnswersWithPhotos);
        setIsAnswering(false);
        localStorage.removeItem(`interview_session_${userId}`);

        // ✅ サーバーのセッションも削除
        try {
          const apiUrl = API_URL;
          await fetch(`${apiUrl}/api/interview-session`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ サーバーのセッションを削除');
        } catch (error) {
          console.warn('⚠️ サーバーセッション削除失敗:', error);
        }

        // 🔥 重要修正：19問完了時にデータベースに永続保存
        console.log('💾 [重要] インタビュー完了 - データベース保存開始');
        console.log('📊 保存予定データ:', {
          userId,
          answersCount: newAnswersWithPhotos.length,
          userAge: userInfo?.age,
          firstAnswer: newAnswersWithPhotos[0]?.text?.substring(0, 50)
        });

        try {
          const apiUrl = API_URL;
          const saveInterviewResponse = await fetch(`${apiUrl}/api/interview/save`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId,
              currentQuestionIndex: newAnswersWithPhotos.length,  // ✅ 修正：19問完了時は 19 を送信
              conversation: newConversation,  // ✅ 修正：conversation も送信
              answersWithPhotos: newAnswersWithPhotos,
              timestamp: Date.now()  // ✅ 修正：タイムスタンプも送信
            })
          });

          if (saveInterviewResponse.ok) {
            const result = await saveInterviewResponse.json();
            console.log('✅ インタビューデータをDBに永続保存しました:', result);
          } else {
            console.error('❌ インタビュー保存失敗:', saveInterviewResponse.status);
            const errorData = await saveInterviewResponse.json().catch(() => ({}));
            console.error('❌ エラー詳細:', errorData);
            alert(`⚠️ インタビューデータの保存に失敗しました（${saveInterviewResponse.status}）。\nAI生成に進みますが、データが保存されていない可能性があります。`);
          }
        } catch (error) {
          console.error('❌ インタビュー保存エラー:', error);
          alert(`⚠️ インタビューデータの保存に失敗しました。\nエラー: ${error instanceof Error ? error.message : 'Unknown error'}\n\nAI生成に進みますが、データが保存されていない可能性があります。`);
        }

        // ✅ 新：19問完了時に修正テキストを事前に生成・保存
        console.log('📝 [新] インタビュー完了 - 修正テキストを事前生成・保存中...');
        try {
          const apiUrl = API_URL;
          const responses = newAnswersWithPhotos
            .filter(ans => ans.text && ans.text.trim().length > 0)
            .map(ans => ans.text);

          if (responses.length > 0) {
            console.log('🔄 AI修正API呼び出し:', responses.length, '件の回答');
            const editResponse = await fetch(`${apiUrl}/api/ai/edit-text`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                responses,
                stage: 'interview',
                user_id: userId
              })
            });

            if (editResponse.ok) {
              const editData = await editResponse.json();
              const editedContent = editData.edited_content;
              console.log('✅ AI修正完了:', editedContent?.length, '文字');

              // 修正テキストを biography に保存
              console.log('💾 修正テキストを biography に保存中...');
              const biographyResponse = await fetch(`${apiUrl}/api/biography`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  user_id: userId,
                  edited_content: editedContent,
                  ai_summary: editedContent
                })
              });

              if (biographyResponse.ok) {
                const biographyData = await biographyResponse.json();
                console.log('✅ 修正テキストを biography に事前保存完了 - ID:', biographyData.data?.id);
              } else {
                console.warn('⚠️ 修正テキスト保存失敗（TextCorrectionPageで再生成）:', biographyResponse.status);
              }
            } else {
              console.warn('⚠️ AI編集失敗（TextCorrectionPageで再生成）:', editResponse.status);
            }
          }
        } catch (error) {
          console.warn('⚠️ 修正テキスト事前生成エラー（TextCorrectionPageで再生成します）:', error);
        }

        // ✅ TextCorrectionPage へ遷移（AI編集が必要）
        if (onCorrectionStart) {
          console.log('🎯 onCorrectionStart を呼び出し');
          onCorrectionStart(newConversation, newAnswersWithPhotos);
        }
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

  // ✅ 修正版：改善された saveAndPause 関数
  const saveAndPause = async () => {
    setSavingStatus('🔄 保存中...');
    setProcessing(true);

    try {
      // ① ローカルに保存
      saveSessionToLocalStorage();
      console.log('✅ ローカルストレージに保存完了');

      // ② バックエンドにも保存（新しいエンドポイント）
      const apiUrl = API_URL;

      const saveData = {
        user_id: userId,
        currentQuestionIndex,
        conversation,
        answersWithPhotos,
        timestamp: Date.now()
      };

      console.log('💾 サーバーにセッション保存開始:', {
        userId,
        questionIndex: currentQuestionIndex,
        answerCount: answersWithPhotos.length,
        conversationLength: conversation.length
      });

      const response = await fetch(`${apiUrl}/api/interview/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      });

      console.log('📡 サーバーレスポンスステータス:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Server save failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ サーバー保存成功:', result);

      // ③ 成功メッセージを表示
      setSavingStatus('✅ 保存完了！');
      setTimeout(() => {
        setSavingStatus(null);
        alert('✅ 進捗をサーバーに保存しました。\n次に再開した時に途中から続けられます。');
        setUnsavedChanges(false);
        window.location.hash = 'home';
      }, 500);

    } catch (error) {
      console.error('❌ サーバー保存エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setSavingStatus('❌ 保存失敗');
      setTimeout(() => {
        setSavingStatus(null);
      }, 2000);

      alert(`⚠️ ローカルには保存されましたが、サーバー保存に失敗しました。\n${errorMessage}\n\nブラウザを閉じずにもう一度お試しください。`);
    } finally {
      setProcessing(false);
    }
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
      paddingRight: '10px',  // ✅ スクロールバー用の余白
      borderBottom: '2px solid #ecf0f1',
      // ✅ スクロールバーを見えやすくする
      scrollbarWidth: 'thin' as const,  // Firefox
      scrollbarColor: '#3498db #f0f0f0',  // Firefox (thumb, track)
    } as const,
    message: {
      marginBottom: '15px',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '16px',
      lineHeight: '1.6',
    },
    userMessage: {
      backgroundColor: '#d4edff',
      color: '#0c5a7f',
    },
    assistantMessage: {
      backgroundColor: '#f0f0f0',
      color: '#333',
    },
    inputSection: {
      marginBottom: '20px',
    },
    textarea: {
      width: '100%',
      minHeight: '120px',
      padding: '12px',
      fontSize: '16px',
      border: '2px solid #bdc3c7',
      borderRadius: '4px',
      fontFamily: 'inherit',
      resize: 'vertical' as const,
      marginBottom: '15px',
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      marginBottom: '15px',
      flexWrap: 'wrap' as const,
    },
    button: {
      padding: '12px 20px',
      fontSize: '14px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
      flex: 1,
      minWidth: '120px',
    },
    submitButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    voiceButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
    },
    photoButton: {
      backgroundColor: '#f39c12',
      color: 'white',
    },
    pauseButton: {
      backgroundColor: '#3498db',
      color: 'white',
    },
    startButton: {
      backgroundColor: '#27ae60',
      color: 'white',
      padding: '15px 30px',
      fontSize: '18px',
    },
    importantCheckbox: {
      marginRight: '10px',
      width: '20px',
      height: '20px',
      cursor: 'pointer',
    },
    importantLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '16px',
      color: '#2c3e50',
      cursor: 'pointer',
      marginBottom: '15px',
    },
    textInputLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '8px',
    },
    yearMonthContainer: {
      display: 'flex',
      gap: '15px',
      marginTop: '10px',
    },
    yearMonthLabel: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '8px',
    },
    yearMonthInput: {
      padding: '10px',
      fontSize: '14px',
      border: '2px solid #bdc3c7',
      borderRadius: '4px',
      fontFamily: 'inherit',
    },
    photosContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '15px',
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
    savingStatus: {
      padding: '12px',
      marginBottom: '15px',
      borderRadius: '4px',
      textAlign: 'center' as const,
      fontWeight: 'bold',
      backgroundColor: '#e8f4f8',
      color: '#0c5a7f',
      fontSize: '14px',
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
              <strong>質問数:</strong> {INTERVIEW_QUESTIONS.length}問中 {answersWithPhotos.length}問完了
            </p>
            <p>
              <strong>回答数:</strong> {answersWithPhotos.length}個の回答を記録しました
            </p>
          </div>

          <button
            onClick={() => {
              if (onAIGenerationStart) {
                // ✅ 修正: answersWithPhotos に正確な text フィールドがあることを確認してから渡す
                console.log('📊 AI生成に渡すanswersWithPhotos:', {
                  count: answersWithPhotos.length,
                  sample: answersWithPhotos[0],
                  allHaveText: answersWithPhotos.every((a: any) => a.text && a.text.trim().length > 0)
                });
                onAIGenerationStart(answersWithPhotos);
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
            onClick={startInterview}
            disabled={processing}
            style={{
              ...styles.button,
              ...styles.startButton,
              width: '100%',
              opacity: processing ? 0.6 : 1,
              marginBottom: '12px',
            }}
          >
            {processing ? '準備中...' : '人生記録を開始する'}
          </button>

          <button
            onClick={() => setShowQuestionsList(!showQuestionsList)}
            style={{
              ...styles.button,
              backgroundColor: '#95a5a6',
              color: 'white',
              width: '100%',
            }}
          >
            質問一覧を確認
          </button>

          {showQuestionsList && (
            <div style={styles.questionsList}>
              {INTERVIEW_QUESTIONS.map((q, idx) => (
                <div key={idx} style={styles.questionItem}>
                  {idx + 1}. {q}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.title}>人生記録</div>

        {error && (
          <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '15px' }}>
            エラー: {error}
          </div>
        )}

        {/* ✅ 新: 保存状態表示 */}
        {savingStatus && (
          <div style={styles.savingStatus}>
            {savingStatus}
          </div>
        )}

        <div style={styles.progressText}>
          進捗: {currentQuestionIndex + 1} / {INTERVIEW_QUESTIONS.length}
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
            }}
          />
        </div>

        {isAnswering && (
          <>
            <div style={styles.conversationBox} ref={conversationBoxRef}>
              {conversation.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.message,
                    ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                  }}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            <div style={styles.inputSection}>
              <label style={styles.textInputLabel}>📝 あなたの回答</label>
              <textarea
                value={currentAnswer}
                onChange={(e) => {
                  setCurrentAnswer(e.target.value);
                  setUnsavedChanges(true);
                }}
                placeholder="ここに回答を入力してください..."
                style={styles.textarea}
              />

              {/* ✅ 重要な出来事チェックボックス */}
              <label style={styles.importantLabel}>
                <input
                  type="checkbox"
                  checked={isImportantEvent}
                  onChange={(e) => {
                    setIsImportantEvent(e.target.checked);
                    setUnsavedChanges(true);
                  }}
                  style={styles.importantCheckbox}
                />
                📌 これは人生で重要な出来事である
              </label>

              <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '15px' }}>
                チェックすると、年月を記録して人生年表に表示されます
              </p>

              {/* ✅ 重要な出来事の場合だけ年月入力を表示 */}
              {isImportantEvent && (
                <div style={{
                  backgroundColor: '#ecf0f1',
                  padding: '15px',
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  <label style={styles.textInputLabel}>📌 この出来事のタイトル</label>
                  <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '10px' }}>
                    例：「結婚式」「初めての転職」「子どもが生まれた」など、短くまとめてください。
                  </p>
                  <input
                    type="text"
                    placeholder="例：結婚、転職、引っ越し"
                    value={eventTitle}
                    onChange={(e) => {
                      setEventTitle(e.target.value);
                      setUnsavedChanges(true);
                    }}
                    style={{
                      ...styles.yearMonthInput,
                      width: '100%',
                      marginBottom: '15px'
                    }}
                  />

                  {/* ✅ 修正：何歳時の出来事入力フィールド */}
                  <label style={styles.textInputLabel}>✨ 何歳時の出来事ですか？</label>
                  <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '10px' }}>
                    例：25歳、30歳。年が不確かな時は年齢で入力してください。
                  </p>
                  <input
                    type="number"
                    placeholder="例：25、30"
                    min="0"
                    max="150"
                    value={eventAge}
                    onChange={(e) => {
                      setEventAge(e.target.value);
                      setUnsavedChanges(true);
                    }}
                    style={{
                      ...styles.yearMonthInput,
                      width: '100%',
                      marginBottom: '15px'
                    }}
                  />

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
                disabled={processing}
                style={{
                  ...styles.button,
                  ...styles.pauseButton,
                  width: '100%',
                  marginTop: '10px',
                  opacity: processing ? 0.6 : 1,
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
