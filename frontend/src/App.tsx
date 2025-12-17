import { useState, useEffect } from 'react'
import UserPage from './pages/UserPage'
import InterviewPage from './pages/InterviewPage'
import AIGenerationPage from './pages/AIGenerationPage'
import PublisherPage from './pages/PublisherPage'
import TextCorrectionPage from './pages/TextCorrectionPage'
import CorrectedTextPage from './pages/CorrectedTextPage'
import Header from './components/Common/Header'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState<'user' | 'interview' | 'aiGeneration' | 'correction' | 'corrected' | 'publisher'>('user')
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
    
    // 初期化完了フラグを立てる
    setIsInitialized(true)
  }, [])

  // ② localStorage の初期化後に、hash に基づいてページを切り替え
  useEffect(() => {
    if (!isInitialized) return // 初期化まで待つ
    
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) // '#' を削除
      if (hash === 'interview') {
        setCurrentPage('interview')
      } else if (hash === 'aiGeneration') {
        setCurrentPage('aiGeneration')
      } else if (hash === 'correction') {
        setCurrentPage('correction')
      } else if (hash === 'corrected') {
        setCurrentPage('corrected')
      } else if (hash === 'publisher') {
        setCurrentPage('publisher')
      } else {
        setCurrentPage('user')
      }
    }

    handleHashChange() // 初期読み込み時に実行
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isInitialized])

  return (
    <div className="app">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="main-content">
        {currentPage === 'user' && (
          <UserPage 
            userId={userId} 
            setUserId={setUserId} 
            setToken={setToken}
            setUserInfo={setUserInfo}
          />
        )}
        {currentPage === 'interview' && userId && token && (
          <InterviewPage 
            userId={userId} 
            token={token}
            userInfo={userInfo}
            onCorrectionStart={(conversation, answersWithPhotos) => {
              setInterviewConversation(conversation);
              setInterviewAnswersWithPhotos(answersWithPhotos);
              setCurrentPage('correction');
            }}
            onAIGenerationStart={(answersWithPhotos) => {
              console.log('🚀 AIGenerationPage へ遷移:', answersWithPhotos.length, '件の回答');
              setInterviewAnswersWithPhotos(answersWithPhotos);
              setCurrentPage('aiGeneration');
            }}
          />
        )}
        {currentPage === 'aiGeneration' && userId && token && userInfo && (
          <AIGenerationPage
            userId={userId}
            token={token}
            answersWithPhotos={interviewAnswersWithPhotos}
            userInfo={userInfo}
            onComplete={() => {
              console.log('✅ AI生成完了、CorrectedTextPageへ遷移');
              setCurrentPage('corrected');
            }}
          />
        )}
        {currentPage === 'correction' && userId && token && (
          <TextCorrectionPage 
            userId={userId} 
            token={token} 
            conversation={interviewConversation} 
            answersWithPhotos={interviewAnswersWithPhotos} 
            onComplete={() => setCurrentPage('corrected')} 
          />
        )}
        {currentPage === 'corrected' && userId && token && (
          <CorrectedTextPage userId={userId} token={token} />
        )}
        {currentPage === 'publisher' && <PublisherPage />}
      </main>
    </div>
  )
}

export default App
