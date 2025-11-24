import { useState } from 'react'
import UserPage from './pages/UserPage'
import PublisherPage from './pages/PublisherPage'
import PhotoUploadPage from './pages/PhotoUploadPage'
import Header from './components/Common/Header'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState<'user' | 'publisher'>('user')
  const [userId, setUserId] = useState<number | null>(null)

  return (
    <div className="app">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="main-content">
        {currentPage === 'user' && <UserPage userId={userId} setUserId={setUserId} />}
        {currentPage === 'publisher' && <PublisherPage />}
      </main>
    </div>
  )
}

export default App