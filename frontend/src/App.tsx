import { useState, useEffect } from 'react'
import UserPage from './pages/UserPage'
import HomeSelectionPage from './pages/HomeSelectionPage'
import RecordNavPage from './pages/RecordNavPage'
import TimelineEditPage from './pages/TimelineEditPage'
import AIGenerationPage from './pages/AIGenerationPage'
import CorrectionPageV2 from './pages/CorrectionPageV2'
import PDFDisplayPage from './pages/PDFDisplayPage'
import Header from './components/Common/Header'
import { API_URL } from './config'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState<'user' | 'home' | 'record-nav' | 'timeline-edit' | 'aiGeneration' | 'correction' | 'pdfDisplay'>('user')
  const [userId, setUserId] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<{ name: string; age: number } | undefined>()
  const [isInitialized, setIsInitialized] = useState(false)
  const [interviewConversation, setInterviewConversation] = useState<any[]>([])
  const [interviewAnswersWithPhotos, setInterviewAnswersWithPhotos] = useState<any[]>([])

  // Initialize from localStorage
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

  // Handle hash-based routing
  useEffect(() => {
    if (!isInitialized) return

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash === 'home') {
        setCurrentPage('home')
      } else if (hash === 'record-nav') {
        setCurrentPage('record-nav')
      } else if (hash === 'timeline-edit') {
        setCurrentPage('timeline-edit')
      } else if (hash === 'aiGeneration') {
        setCurrentPage('aiGeneration')
      } else if (hash === 'correction') {
        setCurrentPage('correction')
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

  // ✅ UserPage ログイン後、home へ遷移
  const handleUserLoginSuccess = (userId: number, token: string, userInfo: { name: string; age: number }) => {
    setUserId(userId)
    setToken(token)
    setUserInfo(userInfo)
    window.location.hash = 'home'
  }

  // ✅ HomeSelectionPage: 新規作成
  const handleNewInterview = () => {
    console.log('[Router] 新規インタビュー開始 → record-nav')
    window.location.hash = 'record-nav'
  }

  // ✅ HomeSelectionPage: 続行（既存セッション復元）
  const handleContinueInterview = () => {
    console.log('[Router] 途中保存から続行 → record-nav')
    // localStorage にフラグを設定して、RecordNavPage で復元させる
    localStorage.setItem('resumeSession', 'true')
    window.location.hash = 'record-nav'
  }

  // ✅ HomeSelectionPage: 回答を修正
  const handleEditCorrection = async () => {
    console.log('[Router] 回答を修正 → correction')
    // セッションデータを読み込んでから遷移
    try {
      const response = await fetch(`${API_URL}/api/interview-session/load`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const session = await response.json()
        console.log('[Router] セッション読み込み成功:', session)
        setInterviewConversation(session.conversation)
        setInterviewAnswersWithPhotos(session.answersWithPhotos)
        window.location.hash = 'correction'
      } else {
        alert('セッション読み込みに失敗しました')
      }
    } catch (err) {
      console.error('[Router] セッション読み込みエラー:', err)
      alert('エラーが発生しました')
    }
  }

  // ✅ HomeSelectionPage: データ編集
  const handleEditTimeline = () => {
    console.log('[Router] データ編集 → timeline-edit')
    window.location.hash = 'timeline-edit'
  }

  // ✅ TimelineEditPage: インタビュー続行
  const handleTimelineEditContinueInterview = () => {
    console.log('[Router] 保存庫からインタビュー続行 → record-nav')
    localStorage.setItem('resumeSession', 'true')
    window.location.hash = 'record-nav'
  }

  // ✅ RecordNavPage から AIGeneration へ
  const handleAIGenerationStart = (answersWithPhotos: any[]) => {
    setInterviewAnswersWithPhotos(answersWithPhotos)
    console.log('[Router] Moving to AI generation:', answersWithPhotos.length, 'answers')
    window.location.hash = 'aiGeneration'
  }

  // ✅ RecordNavPage から Correction へ
  const handleCorrectionStart = (conversation: any[], answersWithPhotos: any[]) => {
    setInterviewConversation(conversation)
    setInterviewAnswersWithPhotos(answersWithPhotos)
    console.log('[Router] Moving to correction page:', {
      conversationLength: conversation.length,
      answersCount: answersWithPhotos.length
    })
    window.location.hash = 'correction'
  }

  return (
    <div className="app">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="main-content">
        {/* Page 1: User Login */}
        {currentPage === 'user' && (
          <UserPage
            userId={userId}
            setUserId={setUserId}
            setToken={setToken}
            setUserInfo={setUserInfo}
            onLoginSuccess={handleUserLoginSuccess}
          />
        )}

        {/* Page 1.5: Home Selection (New) */}
        {currentPage === 'home' && userId && token && (
          <HomeSelectionPage
            userId={userId}
            token={token}
            userInfo={userInfo}
            onNewInterview={handleNewInterview}
            onContinueInterview={handleContinueInterview}
            onEditTimeline={handleEditTimeline}
            onEditCorrection={handleEditCorrection}
          />
        )}

        {/* Page 2.5: Timeline Edit */}
        {currentPage === 'timeline-edit' && userId && token && userInfo && (
          <TimelineEditPage
            userId={userId}
            token={token}
            userInfo={userInfo}
            onComplete={() => {
              console.log('[Router] Timeline edit complete → home')
              window.location.hash = 'home'
            }}
            onContinueInterview={handleTimelineEditContinueInterview}
          />
        )}

        {/* Page 3: Record Nav (聞き取り + 保存庫の統合) */}
        {currentPage === 'record-nav' && userId && token && userInfo && (
          <RecordNavPage
            userId={userId}
            token={token}
            userInfo={userInfo}
            onComplete={() => {
              console.log('[Router] Record nav complete → home')
              window.location.hash = 'home'
            }}
          />
        )}

        {/* Page 4: AI Generation (Timeline + Biography) */}
        {currentPage === 'aiGeneration' && userId && token && userInfo && (
          <AIGenerationPage
            userId={userId}
            token={token}
            answersWithPhotos={interviewAnswersWithPhotos}
            correctedText=""
            userInfo={userInfo}
            onComplete={() => {
              console.log('[Router] AI generation complete → PDF display')
              window.location.hash = 'pdfDisplay'
            }}
          />
        )}

        {/* Page 5: Correction & Editing (Integrated Page) */}
        {currentPage === 'correction' && userId && token && (
          <CorrectionPageV2
            userId={userId}
            token={token}
            conversation={interviewConversation}
            answersWithPhotos={interviewAnswersWithPhotos}
            onComplete={() => {
              console.log('[Router] Correction complete → PDF display')
              window.location.hash = 'pdfDisplay'
            }}
          />
        )}

        {/* Page 6: PDF Display & Download */}
        {currentPage === 'pdfDisplay' && userId && token && userInfo && (
          <PDFDisplayPage
            userId={userId}
            token={token}
            userInfo={userInfo}
            answersWithPhotos={interviewAnswersWithPhotos}
            onComplete={() => {
              window.location.hash = 'user'
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App
