import { useEffect, useState } from 'react'
import { API_URL } from '../config';
import './TimelineEditPage.css'

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

interface AnswerWithPhotos {
  question: string
  answer: string
  photos?: string[]
}

interface InterviewSession {
  currentQuestionIndex: number
  conversation: any[]
  answersWithPhotos: AnswerWithPhotos[]
  eventTitle?: string
  eventYear?: number
  eventMonth?: number
  eventDescription?: string
  timestamp: number
  updatedAt: string
}

interface TimelineEditPageProps {
  userId: number
  token: string
  userInfo: { name: string; age: number }
  onComplete: () => void
  onContinueInterview?: () => void  // ✅ 修正：インタビュー続行コールバック追加
}

export default function TimelineEditPage({
  userId,
  token,
  userInfo,
  onComplete,
  onContinueInterview  // ✅ 修正：コールバック受け取り
}: TimelineEditPageProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | string | null>(null)
  const [editMode, setEditMode] = useState<'session' | 'event' | null>(null)
  const [editedAnswers, setEditedAnswers] = useState<AnswerWithPhotos[]>([])
  const [eventInfo, setEventInfo] = useState({
    eventTitle: '',
    eventYear: null as number | null,
    eventMonth: null as number | null,
    eventDescription: ''
  })

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // セッション取得
        try {
          const sessionResponse = await fetch(`${apiBaseUrl}/api/interview-session/load`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json()
            console.log('✅ Session loaded:', sessionData)
            setSession(sessionData)
            
            // answersWithPhotos に question フィールドを追加（conversation から取得）
            const answersWithQuestions = (sessionData.answersWithPhotos || []).map((answer: any, idx: number) => {
              let question = answer.question
              if (!question && sessionData.conversation && sessionData.conversation.length > idx * 2) {
                // conversation から質問を取得（assistant メッセージ）
                question = sessionData.conversation[idx * 2]?.content || `質問 ${idx + 1}`
              }
              return {
                ...answer,
                question: question || `質問 ${idx + 1}`,
                answer: answer.answer || answer.text || ''
              }
            })
            
            setEditedAnswers(answersWithQuestions)
            setEventInfo({
              eventTitle: sessionData.eventTitle || '',
              eventYear: sessionData.eventYear || null,
              eventMonth: sessionData.eventMonth || null,
              eventDescription: sessionData.eventDescription || ''
            })
          }
        } catch (err) {
          console.log('ℹ️ No active session')
        }

        // タイムライン取得
        const timelineUrl = `${apiBaseUrl}/api/timeline/user/${userId}`
        const response = await fetch(timelineUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Timeline fetch failed')
        }
        
        const data = await response.json()
        console.log('✅ Timeline data received:', data)
        setEvents(data.events || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'データの読み込みに失敗しました'
        setError(errorMessage)
        console.error('❌ Data fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (userId && token) {
      fetchData()
    }
  }, [userId, token])

  // 進行中セッション選択
  const handleSelectSession = () => {
    if (session) {
      setEditMode('session')
      setSelectedIdx('event-info')
    }
  }

  // 質問をクリック
  const handleSelectQuestion = (idx: number) => {
    setEditMode('session')
    setSelectedIdx(idx)
  }

  // イベント情報をクリック
  const handleSelectEventInfo = () => {
    setEditMode('session')
    setSelectedIdx('event-info')
  }

  // キャンセル
  const handleCancel = () => {
    setSelectedIdx(null)
    setEditMode(null)
  }

  // 回答を変更
  const handleChangeAnswer = (idx: number, newAnswer: string) => {
    const updated = [...editedAnswers]
    updated[idx] = { ...updated[idx], answer: newAnswer }
    setEditedAnswers(updated)
  }

  // イベント情報を変更
  const handleChangeEventInfo = (field: string, value: any) => {
    setEventInfo({ ...eventInfo, [field]: value })
  }

  // 保存
  const handleSave = async () => {
    if (!session) return

    try {
      const payload = {
        currentQuestionIndex: session.currentQuestionIndex,
        conversation: session.conversation,
        answersWithPhotos: editedAnswers,
        timestamp: session.timestamp,
        eventTitle: eventInfo.eventTitle,
        eventYear: eventInfo.eventYear,
        eventMonth: eventInfo.eventMonth,
        eventDescription: eventInfo.eventDescription
      }

      console.log('💾 Saving all data:', payload)

      const response = await fetch(`${apiBaseUrl}/api/interview-session/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Save failed')
      }

      const result = await response.json()
      console.log('✅ Data saved:', result)

      // セッション情報更新
      if (session) {
        setSession({
          ...session,
          answersWithPhotos: editedAnswers,
          eventTitle: eventInfo.eventTitle,
          eventYear: eventInfo.eventYear,
          eventMonth: eventInfo.eventMonth,
          eventDescription: eventInfo.eventDescription
        })
      }

      setSelectedIdx(null)
      setEditMode(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
      console.error(err)
    }
  }

  if (loading) {
    return <div className="page-loading">データを読み込み中...</div>
  }

  return (
    <div className="timeline-edit-page">
      <h1>📝 データ編集</h1>
      
      <div className="timeline-edit-info">
        <p>{userInfo.name}さんの人生記録（進行中1件 + 完成{events.length}件）</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="timeline-edit-container">
        {/* 左側：記録一覧 */}
        <div className="timeline-edit-list">
          {/* 進行中セクション */}
          {session && (
            <div className="timeline-list-section">
              <h3>🔄 進行中</h3>
              
              {/* セッション概要 */}
              <div
                className={`session-list-item ${selectedIdx === null ? 'active' : ''}`}
                onClick={handleSelectSession}
              >
                <div className="session-progress">
                  <span className="progress-label">進捗</span>
                  <span className="progress-value">{session.currentQuestionIndex}/19</span>
                </div>
                <div className="session-info">
                  <span className="info-label">回答数</span>
                  <span className="info-value">{editedAnswers.length}件</span>
                </div>
              </div>

              {/* 質問一覧 */}
              <div className="questions-list">
                {editedAnswers.map((answer, idx) => (
                  <div
                    key={idx}
                    className={`question-item ${selectedIdx === idx ? 'active' : ''}`}
                    onClick={() => handleSelectQuestion(idx)}
                  >
                    <span className="question-number">Q{idx + 1}</span>
                    <span className="question-preview">
                      {answer.question.substring(0, 40)}...
                    </span>
                  </div>
                ))}
              </div>

              {/* イベント情報 */}
              <div className="event-info-section">
                <div
                  className={`event-info-item ${selectedIdx === 'event-info' ? 'active' : ''}`}
                  onClick={handleSelectEventInfo}
                >
                  <span className="event-info-icon">⚡</span>
                  <span className="event-info-label">イベント情報</span>
                </div>
              </div>
            </div>
          )}

          {/* 完成セクション */}
          <div className="timeline-list-section">
            <h3>✅ 完成</h3>
            {events.length === 0 ? (
              <p className="no-events">データがありません</p>
            ) : (
              <div className="events-list">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="event-list-item"
                  >
                    <div className="event-list-year">
                      {event.year}年{event.month}月
                    </div>
                    <div className="event-list-title">
                      {event.eventTitle}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右側：編集フォーム */}
        <div className="timeline-edit-form-container">
          {editMode === 'session' && session ? (
            typeof selectedIdx === 'number' ? (
              // 質問の回答を編集
              <div className="edit-form interview-form">
                <h2>質問 {selectedIdx + 1} / 19</h2>
                
                <div className="question-full">
                  <p className="question-text">{editedAnswers[selectedIdx]?.question}</p>
                </div>

                <div className="form-group">
                  <label>回答</label>
                  <textarea
                    className="answer-textarea"
                    value={editedAnswers[selectedIdx]?.answer || ''}
                    onChange={(e) => handleChangeAnswer(selectedIdx, e.target.value)}
                    placeholder="回答を入力してください"
                    rows={6}
                  />
                </div>

                {editedAnswers[selectedIdx]?.photos && editedAnswers[selectedIdx].photos.length > 0 && (
                  <div className="photos-section">
                    <label>添付写真</label>
                    <div className="photos-list">
                      {editedAnswers[selectedIdx].photos.map((photo, idx) => (
                        <div key={idx} className="photo-item">
                          <img src={photo} alt={`Photo ${idx + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="button-group">
                  <button className="btn-save" onClick={handleSave}>保存</button>
                  <button className="btn-cancel" onClick={handleCancel}>キャンセル</button>
                </div>
              </div>
            ) : selectedIdx === 'event-info' ? (
              // イベント情報を編集
              <div className="edit-form">
                <h2>イベント情報</h2>
                
                <div className="info-box">
                  <p>この出来事の情報を入力してください</p>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>年齢（何歳時の出来事？）</label>
                    <input
                      type="number"
                      placeholder="例：25、30"
                      min="0"
                      max="150"
                      value={eventInfo.eventYear || ''}
                      onChange={(e) =>
                        handleChangeEventInfo('eventYear', parseInt(e.target.value) || null)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>月</label>
                    <select
                      value={eventInfo.eventMonth || ''}
                      onChange={(e) =>
                        handleChangeEventInfo('eventMonth', parseInt(e.target.value) || null)
                      }
                    >
                      <option value="">選択してください</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <option key={m} value={m}>{m}月</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>イベント名</label>
                  <input
                    type="text"
                    placeholder="例：転職、結婚、出生など"
                    value={eventInfo.eventTitle || ''}
                    onChange={(e) =>
                      handleChangeEventInfo('eventTitle', e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>説明</label>
                  <textarea
                    placeholder="このイベントについて説明してください"
                    value={eventInfo.eventDescription || ''}
                    onChange={(e) =>
                      handleChangeEventInfo('eventDescription', e.target.value)
                    }
                    rows={4}
                  />
                </div>

                <div className="button-group">
                  <button className="btn-save" onClick={handleSave}>保存</button>
                  <button className="btn-cancel" onClick={handleCancel}>キャンセル</button>
                </div>
              </div>
            ) : null
          ) : (
            <div className="no-selection">
              <p>左から質問を選択してください</p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ 修正：ナビゲーションボタン - 戻るボタンと続行ボタンを追加 */}
      <div className="navigation-buttons">
        <button className="btn-back" onClick={onComplete}>
          ← 戻る
        </button>
        {session && session.currentQuestionIndex > 0 && (
          <button className="btn-continue" onClick={onContinueInterview}>
            🔄 インタビューを続行する
          </button>
        )}
      </div>
    </div>
  )
}
