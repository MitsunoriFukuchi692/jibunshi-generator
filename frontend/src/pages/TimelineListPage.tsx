import { useEffect, useState } from 'react'
import './TimelineListPage.css'

interface TimelineEvent {
  id: number
  year: number | null
  month: number | null
  age?: number
  eventTitle: string
  description: string
  photoUrl?: string
}

interface TimelineListPageProps {
  userId: number
  token: string
  userInfo: { name: string; age: number }
  onComplete: () => void
}

export default function TimelineListPage({
  userId,
  token,
  userInfo,
  onComplete
}: TimelineListPageProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<Partial<TimelineEvent>>({})

  // 年表データを取得
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        // ✅ 修正：apiBaseUrl の代わりに import.meta.env.VITE_API_BASE_URL を使用
        // ✅ 修正：'/api/timeline/user/2' から '/api/timeline/user/${userId}' に変更
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
        const url = `${apiBaseUrl}/api/timeline/user/${userId}`
        
        console.log('📊 Fetching timeline from:', url)
        
        const response = await fetch(url, {
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
        const errorMessage = err instanceof Error ? err.message : '年表の読み込みに失敗しました'
        setError(errorMessage)
        console.error('❌ Timeline fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (userId && token) {
      fetchTimeline()
    }
  }, [userId, token])

  // 編集開始
  const handleEdit = (event: TimelineEvent) => {
    setEditingId(event.id)
    setFormData({
      ...event,
      age: event.age || undefined
    })
  }

  // 編集キャンセル
  const handleCancel = () => {
    setEditingId(null)
    setFormData({})
  }

  // 編集保存
  const handleSave = async () => {
    if (!editingId) {
      setError('編集IDが見つかりません')
      return
    }

    if (!formData.age && !formData.year) {
      setError('年か年齢のいずれかが必須です')
      return
    }

    if (!formData.month) {
      setError('月は必須です')
      return
    }

    try {
      const payload = {
        ...formData,
        event_age: formData.age,
        month: formData.month,
        eventTitle: formData.eventTitle,
        event_description: formData.description,
        event_title: formData.eventTitle
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/timeline/${editingId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Update failed')
      }

      const updatedData = await response.json()
      setEvents(events.map(e =>
        e.id === editingId 
          ? { 
              ...e, 
              ...updatedData.data,
              age: formData.age
            } as TimelineEvent 
          : e
      ))
      setEditingId(null)
      setFormData({})
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
      console.error(err)
    }
  }

  // 削除
  const handleDelete = async (id: number) => {
    if (!confirm('このイベントを削除しますか？')) return

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/timeline/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!response.ok) throw new Error('Delete failed')
      setEvents(events.filter(e => e.id !== id))
    } catch (err) {
      setError('削除に失敗しました')
      console.error(err)
    }
  }

  if (loading) {
    return <div className="page-loading">年表を読み込み中...</div>
  }

  return (
    <div className="timeline-list-page">
      <h1>📅 人生年表の確認・編集</h1>

      <div className="timeline-info">
        <p>{userInfo.name}さんの人生記録（全{events.length}件）</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="timeline-events">
        {events.length === 0 ? (
          <p className="no-events">年表データがありません</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="timeline-event-card">
              {editingId === event.id ? (
                <div className="edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>年齢（何歳時の出来事？）</label>
                      <input
                        type="number"
                        placeholder="例：25、30"
                        min="0"
                        max="150"
                        value={formData.age || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, age: parseInt(e.target.value) || undefined })
                        }
                      />
                      <small style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>
                        年齢を入力するとバックエンドで自動計算されます
                      </small>
                    </div>
                    <div className="form-group">
                      <label>月</label>
                      <select
                        value={formData.month || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, month: parseInt(e.target.value) || null })
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
                      placeholder="例：結婚、転職、出生など"
                      value={formData.eventTitle || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, eventTitle: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>説明</label>
                    <textarea
                      placeholder="このイベントについて説明してください"
                      value={formData.description || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="button-group">
                    <button className="btn-save" onClick={handleSave}>保存</button>
                    <button className="btn-cancel" onClick={handleCancel}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="event-header">
                    <h3>
                      {event.year}年
                      {event.month}月 - {event.eventTitle}
                    </h3>
                  </div>
                  <div className="event-content">
                    <p>{event.description}</p>
                    {event.photoUrl && (
                      <img src={event.photoUrl} alt={event.eventTitle} />
                    )}
                  </div>
                  <div className="button-group">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(event)}
                    >
                      編集
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(event.id)}
                    >
                      削除
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="action-buttons">
        <button
          className="btn-add-event"
          onClick={() => {
            alert('新規イベント追加機能は別ページで実装予定です');
          }}
        >
          + 新しいイベントを追加
        </button>
      </div>

      <div className="navigation-buttons">
        <button
          className="btn-next"
          onClick={onComplete}
        >
          PDFを作成 →
        </button>
      </div>
    </div>
  )
}
