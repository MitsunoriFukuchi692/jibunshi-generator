import { useState, useEffect } from 'react'
import UserPage from './pages/UserPage'
import InterviewPage from './pages/InterviewPage'
import AIGenerationPage from './pages/AIGenerationPage'
import TextCorrectionPage from './pages/TextCorrectionPage'
import CorrectedTextPage from './pages/CorrectedTextPage'
import TimelineListPage from './pages/TimelineListPage'
import PDFDisplayPage from './pages/PDFDisplayPage'
import Header from './components/Common/Header'
import './App.css'

function App() {
  // ✅ TurningPointPage を削除（不要）
  const [currentPage, setCurrentPage] = useState<'user' | 'interview' | 'aiGeneration' | 'correction' | 'corrected' | 'timelineList' | 'pdfDisplay'>('user')
  const [userId, setUserId] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<{ name: string; age: number } | undefined>()
  const [isInitialized, setIsInitialized] = useState(false)
  const [interviewConversation, setInterviewConversation] = useState<any[]>([])
  const [interviewAnswersWithPhotos, setInterviewAnswersWithPhotos] = useState<any[]>([])

  // ① localStorage から userId と token を取得（初期化）
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    const storedToken = localStorage.getItem('token')
    const storedUserInfo = localStorage.getItem('userInfo')

    if (storedUserId) {
      setUserId(parseInt(storedUserId))
    }
    if (storedToken) {
      setToken(storedToken)
    }
    if (storedUserInfo) {
      try {
        setUserInfo(JSON.parse(storedUserInfo))
      } catch (e) {
        console.error('Error parsing userInfo:', e)
      }
    }

    setIsInitialized(true)
  }, [])

  // ② hash に基づいてページを切り替え
  useEffect(() => {
    if (!isInitialized) return

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash === 'interview') {
        setCurrentPage('interview')
      } else if (hash === 'aiGeneration') {
        setCurrentPage('aiGeneration')
      } else if (hash === 'correction') {
        setCurrentPage('correction')
      } else if (hash === 'corrected') {
        setCurrentPage('corrected')
      } else if (hash === 'timelineList') {
        setCurrentPage('timelineList')
      } else if (hash === 'pdfDisplay') {
        setCurrentPage('pdfDisplay')
      } else {
        setCurrentPage('user')
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isInitialized])

  return (
    <div className="app">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="main-content">
        {/* ページ1: ユーザーログイン */}
        {currentPage === 'user' && (
          <UserPage
            userId={userId}
            setUserId={setUserId}
            setToken={setToken}
            setUserInfo={setUserInfo}
          />
        )}

        {/* ページ2: インタビュー（19問） */}
        {currentPage === 'interview' && userId && token && (
          <InterviewPage
            userId={userId}
            token={token}
            userInfo={userInfo}
            onCorrectionStart={(conversation, answersWithPhotos) => {
              setInterviewConversation(conversation);
              setInterviewAnswersWithPhotos(answersWithPhotos);
              window.location.hash = 'correction';
            }}
            onAIGenerationStart={(answersWithPhotos) => {
              console.log('🚀 AIGenerationPage へ遷移:', answersWithPhotos.length, '件の回答');
              setInterviewAnswersWithPhotos(answersWithPhotos);
              window.location.hash = 'aiGeneration';
            }}
          />
        )}

        {/* ページ3: AI自動生成（timeline + biography作成） */}
        {currentPage === 'aiGeneration' && userId && token && userInfo && (
          <AIGenerationPage
            userId={userId}
            token={token}
            answersWithPhotos={interviewAnswersWithPhotos}
            userInfo={userInfo}
            onComplete={() => {
              console.log('✅ AI生成完了 → PDFDisplay へ');
              window.location.hash = 'pdfDisplay';  // timelineList ではなく pdfDisplay へ
            }}
          />
        )}

        {/* ページ4: テキスト修正 */}
        {currentPage === 'correction' && userId && token && (
          <TextCorrectionPage
            userId={userId}
            token={token}
            conversation={interviewConversation}
            answersWithPhotos={interviewAnswersWithPhotos}
            onComplete={() => {
              window.location.hash = 'corrected';
            }}
          />
        )}

        {/* ページ5: 修正済みテキスト確認・修正 */}
        {currentPage === 'corrected' && userId && token && (
          <CorrectedTextPage
            userId={userId}
            token={token}
            onTimelineListStart={() => {
              console.log('📋 CorrectedTextPage スキップ → TimelineListPage へ');
              window.location.hash = 'timelineList';  // そのまま timelineList へ
            }}
          />
        )}

        {/* ページ6: 人生年表一覧（追加・編集・削除） */}
        {currentPage === 'timelineList' && userId && token && (
          <TimelineListPage
            userId={userId}
            token={token}
            userInfo={userInfo || { name: '（名前未設定）', age: 0 }}
            onComplete={() => {
              console.log('✅ 年表確認完了 → PDFDisplay へ遷移');
              window.location.hash = 'pdfDisplay';
            }}
          />
        )}

        {/* ページ7: PDF表示・ダウンロード（修正版：生インタビュー画面） */}
        {currentPage === 'pdfDisplay' && userId && token && userInfo && (
          <PDFDisplayPage 
            userId={userId} 
            token={token}
            userInfo={userInfo}
            answersWithPhotos={interviewAnswersWithPhotos}
            onComplete={() => {
              // 完了後の処理（例：ホームに戻る）
              window.location.hash = 'user';
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App
