import { useState } from 'react'
import UserPage from './pages/UserPage'
import PublisherPage from './pages/PublisherPage'
import Header from './components/Common/Header'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState<'user' | 'publisher'>('user')

  return (
    <div className="app">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="main-content">
        {currentPage === 'user' && <UserPage />}
        {currentPage === 'publisher' && <PublisherPage />}
      </main>
    </div>
  )
}

export default App
