import { useState } from 'react'
import InterviewPage from './InterviewPage'
import TimelineListPage from './TimelineListPage'
import './RecordNavPage.css'

interface RecordNavPageProps {
  userId: number
  token: string
  userInfo: { name: string; age: number }
  onComplete: () => void
}

export default function RecordNavPage({
  userId,
  token,
  userInfo,
  onComplete
}: RecordNavPageProps) {
  return (
    <div className="record-nav-page">
      <div className="record-nav-header">
        <h1>📖 記録ナビ</h1>
        <p className="record-nav-subtitle">ライフ記録・会社歴史・終活ノートなど、様々な記録に対応</p>
      </div>
      
      <div className="record-nav-container">
        {/* 左側：聞き取り */}
        <div className="record-nav-section record-nav-left">
          <h2 className="record-nav-section-title">🎙️ 聞き取り</h2>
          <div className="record-nav-content">
            <InterviewPage
              userId={userId}
              token={token}
              userInfo={userInfo}
              onComplete={onComplete}
            />
          </div>
        </div>
        
        {/* 右側：保存庫 */}
        <div className="record-nav-section record-nav-right">
          <h2 className="record-nav-section-title">📚 保存庫</h2>
          <div className="record-nav-content">
            <TimelineListPage
              userId={userId}
              token={token}
              userInfo={userInfo}
              onComplete={onComplete}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
