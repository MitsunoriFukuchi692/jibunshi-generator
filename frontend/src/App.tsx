import { useState, useEffect } from 'react'
import UserPage from './pages/UserPage'
import InterviewPage from './pages/InterviewPage'
import PublisherPage from './pages/PublisherPage'
import CorrectedTextPage from './pages/CorrectedTextPage'
import Header from './components/Common/Header'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState<'user' | 'interview' | 'publisher' | 'corrected'>('user')
  const [userId, setUserId] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // ① localStorage から userId と token を取得（初期化）
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    const storedToken = localStorage.getItem('token')
    
    if (storedUserId) {
      setUserId(parseInt(storedUserId))
    }
    if (storedToken) {
      setToken(storedToken)
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
      } else if (hash === 'publisher') {
        setCurrentPage('publisher')
      } else if (hash === 'corrected') {
        setCurrentPage('corrected')
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
        {currentPage === 'user' && <UserPage userId={userId} setUserId={setUserId} setToken={setToken} />}
        {currentPage === 'interview' && userId && token && (
          <InterviewPage userId={userId} token={token} />
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
