import { useEffect, useState } from 'react'
import './TimelineListPage.css'
import { API_URL } from '../config';
const apiBaseUrl = API_URL;

interface TimelineEvent {
  id: number
  year: number | null
  month: number | null
  age?: number
  eventTitle: string
  description: string
  photoUrl?: string
}

interface InterviewSession {
  currentQuestionIndex: number
  conversation: any[]
  answersWithPhotos: any[]
  timestamp: number
}

interface TimelineListPageProps {
  userId: number
  token: string
  userInfo: { name: string; age: number }
  onComplete: () => void
  onBackToHome?: () => void  // ✅ 修正：ホーム画面に戻るコールバック
  onContinueInterview?: () => void  // ✅ 修正：インタビュー続行時のコールバック
}

export default function TimelineListPage({
  userId,
  token,
  userInfo,
  onComplete,
  onBackToHome,
  onContinueInterview
}: TimelineListPageProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // セッション + 年表データを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ 進行中のセッションを取得
        try {
          const sessionResponse = await fetch(`${apiBaseUrl}/api/interview/load`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json()
            setSession(sessionData)
          }
        } catch (sessionErr) {
        }

        // ✅ 完成した年表データを取得
        const timelineUrl = `${apiBaseUrl}/api/timeline/user/${userId}`
        
        
        const response = await fetch(timelineUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Timeline fetch failed')
        }
        
        const data = await response.json()
        setEvents(data || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '年表の読み込みに失敗しました'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (userId && token) {
      fetchData()
    }
  }, [userId, token])

  if (loading) {
    return <div className="page-loading">データを読み込み中...</div>
  }

  return (
    <div className="timeline-list-page">
      {/* ✅ 修正：ホーム画面に戻るボタン */}

      <div style={styles.headerBar}>
        <button 
          onClick={onBackToHome}
          style={styles.backButton}
          title="ホーム画面に戻る"
        >
          ← 戻る
        </button>
        <h2 style={styles.pageTitle}>保存庫</h2>
        <div style={{ width: '80px' }}></div>  {/* 右側スペーサー */}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* ========================================
          セクション1：進行中のセッション
          ======================================== */}
      <div className="timeline-section">
        <h3 className="section-title">📄 進行中</h3>
        {session && session.currentQuestionIndex > 0 ? (
          <div className="session-preview">
            <div className="session-item">
              <span className="session-label">進捗</span>
              <span className="session-value">{session.currentQuestionIndex} / 19</span>
            </div>
            <div className="session-item">
              <span className="session-label">回答</span>
              <span className="session-value">{session.answersWithPhotos?.length || 0}</span>
            </div>
            {/* ✅ 修正：インタビュー続行ボタン */}
            <button
              onClick={onContinueInterview}
              style={{
                ...styles.button,
                ...styles.continueButton,
                marginTop: '15px',
                width: '100%'
              }}
            >
              🔄 インタビューを続行する
            </button>
          </div>
        ) : (
          <p className="no-data">進行中のセッションはありません</p>
        )}
      </div>

      {/* ========================================
          セクション2：完成した人生記録
          ======================================== */}
      <div className="timeline-section">
        <h3 className="section-title">✅ 完成</h3>
        <div className="timeline-events-mini">
          {events.length === 0 ? (
            <p className="no-data">完成した記録がありません</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="timeline-event-mini">
                <div className="event-title-mini">
                  {event.year}年{event.month}月
                </div>
                <div className="event-desc-mini">
                  {event.eventTitle}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ✅ 修正：戻るボタンと続行ボタン用スタイル
const styles = {
  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '15px 20px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    marginBottom: '20px',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },

  backButton: {
    padding: '10px 15px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease',
    width: '80px'
  } as React.CSSProperties,

  pageTitle: {
    margin: 0,
    fontSize: '20px',
    color: '#2c3e50',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center' as const
  } as React.CSSProperties,

  button: {
    padding: '12px 20px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    textAlign: 'center' as const
  } as React.CSSProperties,

  continueButton: {
    backgroundColor: '#27ae60',
    color: 'white'
  } as React.CSSProperties
}
