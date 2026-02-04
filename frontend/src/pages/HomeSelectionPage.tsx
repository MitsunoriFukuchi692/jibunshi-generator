import { useEffect, useState } from 'react'
import { API_URL } from '../config'

interface SessionData {
  currentQuestionIndex: number
  conversation: any[]
  answersWithPhotos: any[]
  eventTitle?: string
  eventYear?: number
  eventMonth?: number
  timestamp: number
  updatedAt: string
}

export default function HomeSelectionPage({
  userId,
  token,
  userInfo,
  onNewInterview,
  onContinueInterview,
  onEditTimeline,
  onEditCorrection
}: {
  userId: number
  token: string | null
  userInfo?: { name: string; age: number }
  onNewInterview: () => void
  onContinueInterview: () => void
  onEditTimeline: () => void
  onEditCorrection?: () => void
}) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [hasSession, setHasSession] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ 修正：/api/interview-session/load を使用してセッションデータを取得
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        if (!token) {
          setError('認証トークンがありません')
          setLoading(false)
          return
        }

        const apiUrl = API_URL
        const response = await fetch(`${apiUrl}/api/interview-session/load`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ セッション取得成功:', {
            currentQuestion: data.currentQuestionIndex,
            answers: data.answersWithPhotos?.length || 0
          })
          
          // currentQuestionIndex が 0 より大きい場合のみセッションありと判定
          if (data.currentQuestionIndex > 0) {
            setSessionData(data)
            setHasSession(true)
          } else {
            console.log('ℹ️ セッションなし（新規作成の状態）')
            setHasSession(false)
          }
        } else if (response.status === 404) {
          console.log('ℹ️ セッションなし（新規作成の状態）')
          setHasSession(false)
        } else {
          throw new Error(`エラー: ${response.status}`)
        }
      } catch (err) {
        console.error('❌ セッション取得エラー:', err)
        // エラーの場合も「セッションなし」として扱う（新規作成可能）
        setHasSession(false)
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionData()
  }, [token, userId])

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <h2>セッション情報を確認中...</h2>
          <p style={styles.loadingText}>少々お待ちください</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* ヘッダー */}
        <div style={styles.header}>
          <h1 style={styles.title}>📖 自分史ジェネレーター</h1>
          <p style={styles.subtitle}>
            {userInfo?.name ? `${userInfo.name}さん（${userInfo.age}歳）` : 'ユーザー'}
          </p>
        </div>

        {/* エラー表示 */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* メインコンテンツ */}
        <div style={styles.mainContent}>
          {hasSession && sessionData ? (
            <>
              {/* セッション情報表示 */}
              <div style={styles.sessionInfoBox}>
                <h2 style={{ color: '#27ae60', marginBottom: '15px' }}>✅ 途中保存されたセッションがあります</h2>
                
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>進捗状況:</span>
                    <span style={styles.infoValue}>
                      {sessionData.currentQuestionIndex} / 19 問目
                    </span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>回答数:</span>
                    <span style={styles.infoValue}>
                      {sessionData.answersWithPhotos?.length || 0} 個
                    </span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>最終更新:</span>
                    <span style={styles.infoValue}>
                      {sessionData.updatedAt ? new Date(sessionData.updatedAt).toLocaleString('ja-JP') : '不明'}
                    </span>
                  </div>
                </div>

                <p style={styles.warningText}>
                  ⚠️ 新規作成を選択すると、この保存済みセッションは上書きされます
                </p>
              </div>

              {/* セッションありの場合のボタン */}
              <div style={styles.buttonGrid}>
                <button
                  onClick={onContinueInterview}
                  style={{
                    ...styles.button,
                    ...styles.buttonContinue
                  }}
                >
                  <div style={styles.buttonIcon}>🔄</div>
                  <div style={styles.buttonText}>
                    <div style={styles.buttonTitle}>続 行</div>
                    <div style={styles.buttonDesc}>
                      保存済みから再開
                    </div>
                  </div>
                </button>

                <button
                  onClick={onNewInterview}
                  style={{
                    ...styles.button,
                    ...styles.buttonNew
                  }}
                >
                  <div style={styles.buttonIcon}>✍️</div>
                  <div style={styles.buttonText}>
                    <div style={styles.buttonTitle}>新規作成</div>
                    <div style={styles.buttonDesc}>
                      最初から開始
                    </div>
                  </div>
                </button>

                <button
                  onClick={onEditCorrection}
                  style={{
                    ...styles.button,
                    ...styles.buttonCorrect
                  }}
                >
                  <div style={styles.buttonIcon}>✏️</div>
                  <div style={styles.buttonText}>
                    <div style={styles.buttonTitle}>修 正</div>
                    <div style={styles.buttonDesc}>
                      回答を修正
                    </div>
                  </div>
                </button>

                <button
                  onClick={onEditTimeline}
                  style={{
                    ...styles.button,
                    ...styles.buttonEdit
                  }}
                >
                  <div style={styles.buttonIcon}>📋</div>
                  <div style={styles.buttonText}>
                    <div style={styles.buttonTitle}>データ編集</div>
                    <div style={styles.buttonDesc}>
                      保存済みデータを編集
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* セッションなしの場合 */}
              <div style={styles.noSessionBox}>
                <h2 style={{ color: '#3498db', marginBottom: '15px' }}>👋 はじめまして</h2>
                <p style={styles.noSessionText}>
                  保存済みのセッションがありません。<br />
                  新規作成からスタートしましょう。
                </p>
              </div>

              {/* セッションなしの場合のボタン */}
              <div style={styles.buttonGridSingle}>
                <button
                  onClick={onNewInterview}
                  style={{
                    ...styles.button,
                    ...styles.buttonNew
                  }}
                >
                  <div style={styles.buttonIcon}>✍️</div>
                  <div style={styles.buttonText}>
                    <div style={styles.buttonTitle}>新規作成</div>
                    <div style={styles.buttonDesc}>
                      インタビューを開始
                    </div>
                  </div>
                </button>

                <button
                  onClick={onEditTimeline}
                  style={{
                    ...styles.button,
                    ...styles.buttonEdit
                  }}
                >
                  <div style={styles.buttonIcon}>📋</div>
                  <div style={styles.buttonText}>
                    <div style={styles.buttonTitle}>データ編集</div>
                    <div style={styles.buttonDesc}>
                      保存済みデータを編集
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* フッター情報 */}
        <div style={styles.footer}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center' }}>
            💡 この自分史は、あなたの貴重な人生記録です。<br />
            時間をかけて、ゆっくり思い出してください。
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ecf0f1',
    padding: '20px',
    fontFamily: 'sans-serif'
  } as React.CSSProperties,

  content: {
    maxWidth: '800px',
    margin: '0 auto'
  } as React.CSSProperties,

  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
    paddingTop: '20px'
  },

  title: {
    fontSize: '36px',
    color: '#2c3e50',
    margin: '0 0 10px 0',
    fontWeight: 'bold'
  } as React.CSSProperties,

  subtitle: {
    fontSize: '18px',
    color: '#7f8c8d',
    margin: 0
  } as React.CSSProperties,

  mainContent: {
    marginBottom: '40px'
  } as React.CSSProperties,

  sessionInfoBox: {
    backgroundColor: '#d5f4e6',
    border: '2px solid #27ae60',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px'
  } as React.CSSProperties,

  noSessionBox: {
    backgroundColor: '#d6eaf8',
    border: '2px solid #3498db',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    textAlign: 'center' as const
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '15px'
  } as React.CSSProperties,

  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: '10px',
    borderRadius: '4px'
  },

  infoLabel: {
    fontSize: '12px',
    color: '#7f8c8d',
    fontWeight: 'bold',
    marginBottom: '5px'
  } as React.CSSProperties,

  infoValue: {
    fontSize: '14px',
    color: '#2c3e50',
    fontWeight: 'bold'
  } as React.CSSProperties,

  warningText: {
    fontSize: '13px',
    color: '#c0392b',
    backgroundColor: 'rgba(192, 57, 43, 0.1)',
    padding: '10px',
    borderRadius: '4px',
    margin: 0
  } as React.CSSProperties,

  noSessionText: {
    fontSize: '16px',
    color: '#2c3e50',
    lineHeight: '1.6',
    margin: '0 0 20px 0'
  } as React.CSSProperties,

  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '30px'
  } as React.CSSProperties,

  buttonGridSingle: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '30px'
  } as React.CSSProperties,

  button: {
    padding: '20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '150px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  } as React.CSSProperties,

  buttonIcon: {
    fontSize: '40px',
    marginBottom: '10px'
  } as React.CSSProperties,

  buttonText: {
    textAlign: 'center' as const
  },

  buttonTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '5px'
  } as React.CSSProperties,

  buttonDesc: {
    fontSize: '12px',
    opacity: 0.8
  } as React.CSSProperties,

  buttonContinue: {
    backgroundColor: '#27ae60',
    color: 'white'
  } as React.CSSProperties,

  buttonNew: {
    backgroundColor: '#3498db',
    color: 'white'
  } as React.CSSProperties,

  buttonEdit: {
    backgroundColor: '#f39c12',
    color: 'white'
  } as React.CSSProperties,

  buttonCorrect: {
    backgroundColor: '#9b59b6',
    color: 'white'
  } as React.CSSProperties,

  errorBox: {
    backgroundColor: '#fadbd8',
    border: '2px solid #c0392b',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#c0392b',
    fontWeight: 'bold'
  } as React.CSSProperties,

  loadingBox: {
    textAlign: 'center' as const,
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    marginTop: '100px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },

  loadingText: {
    color: '#7f8c8d'
  } as React.CSSProperties,

  footer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  } as React.CSSProperties
}
