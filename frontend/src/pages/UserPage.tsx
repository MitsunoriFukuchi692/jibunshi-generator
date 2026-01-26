import { useState, useEffect } from 'react'
import './UserPage.css'

interface UserPageProps {
  userId: number | null
  setUserId: (id: number) => void
  setToken: (token: string) => void
  setUserInfo: (info: { name: string; age: number }) => void
  onLoginSuccess?: (userId: number, token: string, userInfo: { name: string; age: number }) => void
}

type Step = 'choice' | 'login-name' | 'login-birthday' | 'login-pin' | 'register-info' | 'register-confirm' | 'forgot-pin-start' | 'forgot-pin-birthday' | 'forgot-pin-new'

interface LoginCandidate {
  id: number
  name: string
  birthMonth: number
  birthDay: number
  age: number
}

// ============================================
// Device ID 管理（デバイス識別用）
// ============================================
function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId')
  if (!deviceId) {
    // UUID v4 を生成
    deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('deviceId', deviceId)
    console.log(`✅ Device ID created: ${deviceId}`)
  }
  return deviceId
}

export default function UserPage({ 
  userId, 
  setUserId, 
  setToken,
  setUserInfo,
  onLoginSuccess
}: UserPageProps) {
  // ✅ ステップ管理
  const [step, setStep] = useState<Step>('choice')
  
  // ✅ ログイン関連
  const [loginName, setLoginName] = useState('')
  const [loginBirthMonth, setLoginBirthMonth] = useState('')
  const [loginBirthDay, setLoginBirthDay] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [loginUserId, setLoginUserId] = useState<number | null>(null)
  const [loginCandidates, setLoginCandidates] = useState<LoginCandidate[]>([])
  
  // ✅ 新規登録関連
  const [regName, setRegName] = useState('')
  const [regAge, setRegAge] = useState('')
  const [regBirthMonth, setRegBirthMonth] = useState('')
  const [regBirthDay, setRegBirthDay] = useState('')
  const [regPin, setRegPin] = useState('')
  const [regPinConfirm, setRegPinConfirm] = useState('')
  
  // ✅ PIN忘れ関連
  const [forgotName, setForgotName] = useState('')
  const [forgotBirthMonth, setForgotBirthMonth] = useState('')
  const [forgotBirthDay, setForgotBirthDay] = useState('')
  const [forgotNewPin, setForgotNewPin] = useState('')
  const [forgotNewPinConfirm, setForgotNewPinConfirm] = useState('')
  
  // ✅ 共通
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deviceId, setDeviceId] = useState<string>('')

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  // ✅ Device ID をマウント時に初期化
  useEffect(() => {
    const id = getOrCreateDeviceId()
    setDeviceId(id)
  }, [])

  // ============================================
  // ステップ1: ログインと新規登録の選択
  // ============================================
  const handleChoiceLogin = () => {
    setError(null)
    setStep('login-name')
  }

  const handleChoiceRegister = () => {
    setError(null)
    setStep('register-info')
  }

  const handleChoiceForgotPin = () => {
    setError(null)
    setStep('forgot-pin-start')
  }

  // ============================================
  // ログイン: ステップ1 - 名前入力
  // ============================================
  const handleLoginNameCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginName.trim()) {
      setError('お名前を入力してください。')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiUrl}/api/users/login/check-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: loginName.trim() }),
      })

      const data = await response.json()

      if (!data.exists) {
        setError('このお名前は登録されていません。新規登録してください。')
        setLoading(false)
        return
      }

      // 複数人の場合
      if (data.count > 1 && data.candidates) {
        setLoginCandidates(data.candidates)
      }

      // ユーザーが存在 → 月日入力へ
      if (data.count === 1) {
        setLoginUserId(data.userId)
      }
      setStep('login-birthday')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // ログイン: ステップ2 - 月日確認
  // ============================================
  const handleLoginBirthdayVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginBirthMonth || !loginBirthDay) {
      setError('生年月日（月・日）を入力してください。')
      return
    }

    const month = parseInt(loginBirthMonth)
    const day = parseInt(loginBirthDay)

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      setError('正しい生年月日を入力してください。')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiUrl}/api/users/login/check-birthday`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: loginName.trim(), 
          birthMonth: month, 
          birthDay: day 
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '本人確認に失敗しました。')
      }

      const data = await response.json()
      setLoginUserId(data.userId)
      setStep('login-pin')
    } catch (err) {
      setError(err instanceof Error ? err.message : '本人確認に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // ログイン: ステップ3 - PIN検証 + セッション保存
  // ============================================
  const handleLoginPinVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginPin.trim() || loginPin.length !== 4) {
      setError('PINは4桁の数字で入力してください。')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiUrl}/api/users/login/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: loginUserId, 
          pin: loginPin,
          deviceId: deviceId  // ✅ device_id を送信
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'ログインに失敗しました。')
      }

      const data = await response.json()

      // ✅ ログイン成功 - ローカルストレージに保存
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('userInfo', JSON.stringify(data.user))
      localStorage.setItem('deviceId', deviceId)  // ✅ device_id も保存

      setUserId(data.userId)
      setToken(data.token)
      setUserInfo({ name: data.user.name, age: data.user.age || 0 })

      // ✅ 修正：onLoginSuccess コールバックを呼び出す（あれば）
      if (onLoginSuccess) {
        onLoginSuccess(data.userId, data.token, { name: data.user.name, age: data.user.age || 0 })
      } else {
        // フォールバック：ホームページへ遷移
        window.location.hash = 'home'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // 新規登録: 情報確認
  // ============================================
  const handleRegisterConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!regName.trim()) {
      setError('お名前を入力してください。')
      return
    }
    if (!regAge.trim() || parseInt(regAge) < 1 || parseInt(regAge) > 120) {
      setError('有効な年齢を入力してください。')
      return
    }
    if (!regBirthMonth || !regBirthDay) {
      setError('生年月日を入力してください。')
      return
    }
    if (regPin !== regPinConfirm) {
      setError('PINが一致しません。')
      return
    }
    if (regPin.length !== 4) {
      setError('PINは4桁である必要があります。')
      return
    }

    setStep('register-confirm')
  }

  // ============================================
  // 新規登録: 実行
  // ============================================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError(null)

    try {
      const month = parseInt(regBirthMonth)
      const day = parseInt(regBirthDay)

      if (month < 1 || month > 12 || day < 1 || day > 31) {
        setError('正しい生年月日を入力してください。')
        setLoading(false)
        return
      }

      const response = await fetch(`${apiUrl}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          age: parseInt(regAge),
          birthMonth: month,
          birthDay: day,
          pin: regPin,
          deviceId: deviceId  // ✅ device_id を送信
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '登録に失敗しました。')
      }

      const data = await response.json()

      // ✅ 登録成功 - ローカルストレージに保存
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('userInfo', JSON.stringify(data.user))
      localStorage.setItem('deviceId', deviceId)  // ✅ device_id も保存

      setUserId(data.userId)
      setToken(data.token)
      setUserInfo({ name: data.user.name, age: data.user.age || 0 })

      // ✅ 修正：onLoginSuccess コールバックを呼び出す（あれば）
      if (onLoginSuccess) {
        onLoginSuccess(data.userId, data.token, { name: data.user.name, age: data.user.age || 0 })
      } else {
        // フォールバック：ホームページへ遷移
        window.location.hash = 'home'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // PIN忘れ: ステップ1 - 名前確認
  // ============================================
  const handleForgotPinNameConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotName.trim()) {
      setError('お名前を入力してください。')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiUrl}/api/users/login/check-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: forgotName.trim() }),
      })

      const data = await response.json()

      if (!data.exists) {
        setError('このお名前は登録されていません。')
        setLoading(false)
        return
      }

      if (data.count === 1) {
        setLoginUserId(data.userId)
      }

      setStep('forgot-pin-birthday')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // PIN忘れ: ステップ2 - 月日確認＆新PIN設定
  // ============================================
  const handleForgotPinReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotBirthMonth || !forgotBirthDay) {
      setError('生年月日を入力してください。')
      return
    }
    if (forgotNewPin !== forgotNewPinConfirm) {
      setError('新しいPINが一致しません。')
      return
    }
    if (forgotNewPin.length !== 4) {
      setError('PINは4桁である必要があります。')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const month = parseInt(forgotBirthMonth)
      const day = parseInt(forgotBirthDay)

      if (month < 1 || month > 12 || day < 1 || day > 31) {
        setError('正しい生年月日を入力してください。')
        setLoading(false)
        return
      }

      const response = await fetch(`${apiUrl}/api/users/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: forgotName.trim(),
          birthMonth: month,
          birthDay: day,
          newPin: forgotNewPin,
          deviceId: deviceId
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'PINリセットに失敗しました。')
      }

      const data = await response.json()

      // ✅ PIN リセット成功 - ログイン状態にする
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('userInfo', JSON.stringify(data.user))
      localStorage.setItem('deviceId', deviceId)

      setUserId(data.userId)
      setToken(data.token)
      setUserInfo({ name: data.user.name, age: data.user.age || 0 })

      // ✅ 修正：onLoginSuccess コールバックを呼び出す（あれば）
      if (onLoginSuccess) {
        onLoginSuccess(data.userId, data.token, { name: data.user.name, age: data.user.age || 0 })
      } else {
        // フォールバック：ホームページへ遷移
        window.location.hash = 'home'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PINリセットに失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // UI: 選択画面
  // ============================================
  if (step === 'choice') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📖 自分史ジェネレーター</h1>
          <p className="subtitle">人生を記録しよう</p>

          <div className="button-group">
            <button
              onClick={handleChoiceLogin}
              className="btn-primary"
            >
              ログイン
            </button>
            <button
              onClick={handleChoiceRegister}
              className="btn-secondary"
            >
              新規登録
            </button>
            <button
              onClick={handleChoiceForgotPin}
              className="btn-tertiary"
            >
              PINをリセット
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    )
  }

  // ============================================
  // UI: ログイン - 名前入力
  // ============================================
  if (step === 'login-name') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📖 ログイン</h1>
          <p className="subtitle">お名前を入力してください</p>

          <form onSubmit={handleLoginNameCheck}>
            <div className="form-group">
              <label>お名前</label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="例：田中花子"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="button-group">
              <button
                type="button"
                onClick={() => {
                  setStep('choice')
                  setLoginName('')
                  setError(null)
                }}
                className="btn-secondary"
                disabled={loading}
              >
                戻る
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? '確認中...' : '次へ'}
              </button>
            </div>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    )
  }

  // ============================================
  // UI: ログイン - 月日入力
  // ============================================
  if (step === 'login-birthday') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📖 ログイン</h1>
          <p className="subtitle">生年月日を入力してください</p>

          <form onSubmit={handleLoginBirthdayVerify}>
            <div className="form-group">
              <label>生まれた月</label>
              <input
                type="number"
                value={loginBirthMonth}
                onChange={(e) => setLoginBirthMonth(e.target.value.slice(0, 2))}
                placeholder="例：1"
                min="1"
                max="12"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>生まれた日</label>
              <input
                type="number"
                value={loginBirthDay}
                onChange={(e) => setLoginBirthDay(e.target.value.slice(0, 2))}
                placeholder="例：5"
                min="1"
                max="31"
                disabled={loading}
              />
            </div>

            <div className="button-group">
              <button
                type="button"
                onClick={() => {
                  setStep('login-name')
                  setLoginBirthMonth('')
                  setLoginBirthDay('')
                  setError(null)
                }}
                className="btn-secondary"
                disabled={loading}
              >
                戻る
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? '確認中...' : '次へ'}
              </button>
            </div>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    )
  }

  // ============================================
  // UI: ログイン - PIN入力
  // ============================================
  if (step === 'login-pin') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📖 ログイン</h1>
          <p className="subtitle">PINを入力してください</p>

          <form onSubmit={handleLoginPinVerify}>
            <div className="form-group">
              <label>PIN（4桁の数字）</label>
              <input
                type="text"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="例：1234"
                maxLength={4}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="button-group">
              <button
                type="button"
                onClick={() => {
                  setStep('login-birthday')
                  setLoginPin('')
                  setError(null)
                }}
                className="btn-secondary"
                disabled={loading}
              >
                戻る
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </div>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    )
  }

  // ============================================
  // UI: 新規登録 - 情報入力
  // ============================================
  if (step === 'register-info') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📚 新規登録</h1>
          <p className="subtitle">以下の情報を入力してください</p>

          <form onSubmit={handleRegisterConfirm}>
            <div className="form-group">
              <label>お名前</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="例：田中花子"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>年齢</label>
              <input
                type="number"
                value={regAge}
                onChange={(e) => setRegAge(e.target.value)}
                placeholder="例：65"
                min="1"
                max="120"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>生まれた月</label>
              <input
                type="number"
                value={regBirthMonth}
                onChange={(e) => setRegBirthMonth(e.target.value.slice(0, 2))}
                placeholder="例：1"
                min="1"
                max="12"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>生まれた日</label>
              <input
                type="number"
                value={regBirthDay}
                onChange={(e) => setRegBirthDay(e.target.value.slice(0, 2))}
                placeholder="例：5"
                min="1"
                max="31"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>PIN（4桁の数字）</label>
              <input
                type="text"
                value={regPin}
                onChange={(e) => setRegPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="例：1234"
                maxLength={4}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>PIN確認（4桁の数字）</label>
              <input
                type="text"
                value={regPinConfirm}
                onChange={(e) => setRegPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="例：1234"
                maxLength={4}
                disabled={loading}
              />
            </div>

            <div className="button-group">
              <button
                type="button"
                onClick={() => {
                  setStep('choice')
                  setRegName('')
                  setRegAge('')
                  setRegBirthMonth('')
                  setRegBirthDay('')
                  setRegPin('')
                  setRegPinConfirm('')
                  setError(null)
                }}
                className="btn-secondary"
                disabled={loading}
              >
                戻る
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? '確認中...' : '次へ'}
              </button>
            </div>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    )
  }

  // ============================================
  // UI: 新規登録 - 確認
  // ============================================
  if (step === 'register-confirm') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📚 新規登録確認</h1>
          <p className="subtitle">以下の内容で登録します。よろしいですか？</p>

          <div className="confirm-box">
            <p><strong>お名前:</strong> {regName}</p>
            <p><strong>年齢:</strong> {regAge}歳</p>
            <p><strong>生年月日:</strong> {regBirthMonth}月{regBirthDay}日</p>
          </div>

          <div className="button-group">
            <button
              type="button"
              onClick={() => {
                setStep('register-info')
                setError(null)
              }}
              className="btn-secondary"
              disabled={loading}
            >
              戻る
            </button>
            <button
              type="submit"
              onClick={handleRegister}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? '登録中...' : '登録'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    )
  }

  // ============================================
  // UI: PIN忘れ - 名前確認
  // ============================================
  if (step === 'forgot-pin-start') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📚 PINをリセット</h1>
          <p className="subtitle">お名前を入力してください</p>

          <form onSubmit={handleForgotPinNameConfirm}>
            <div className="form-group">
              <label>お名前</label>
              <input
                type="text"
                value={forgotName}
                onChange={(e) => setForgotName(e.target.value)}
                placeholder="例：田中花子"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="button-group">
              <button
                type="button"
                onClick={() => {
                  setStep('choice')
                  setForgotName('')
                  setError(null)
                }}
                className="btn-secondary"
                disabled={loading}
              >
                戻る
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? '確認中...' : '次へ'}
              </button>
            </div>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    )
  }

  // ============================================
  // UI: PIN忘れ - 月日確認＆新PIN設定
  // ============================================
  if (step === 'forgot-pin-birthday') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📚 PINをリセット</h1>
          <p className="subtitle">生年月日と新しいPINを入力してください</p>

          <form onSubmit={handleForgotPinReset}>
            <div className="form-group">
              <label>生まれた月</label>
              <input
                type="number"
                value={forgotBirthMonth}
                onChange={(e) => setForgotBirthMonth(e.target.value.slice(0, 2))}
                placeholder="例：1"
                min="1"
                max="12"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>生まれた日</label>
              <input
                type="number"
                value={forgotBirthDay}
                onChange={(e) => setForgotBirthDay(e.target.value.slice(0, 2))}
                placeholder="例：5"
                min="1"
                max="31"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>新しいPIN（4桁の数字）</label>
              <input
                type="text"
                value={forgotNewPin}
                onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="例：5678"
                maxLength={4}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>新しいPIN確認（4桁の数字）</label>
              <input
                type="text"
                value={forgotNewPinConfirm}
                onChange={(e) => setForgotNewPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="例：5678"
                maxLength={4}
                disabled={loading}
              />
            </div>

            <div className="button-group">
              <button
                type="button"
                onClick={() => {
                  setStep('forgot-pin-start')
                  setForgotBirthMonth('')
                  setForgotBirthDay('')
                  setForgotNewPin('')
                  setForgotNewPinConfirm('')
                  setError(null)
                }}
                className="btn-secondary"
                disabled={loading}
              >
                戻る
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? '変更中...' : 'PIN変更'}
              </button>
            </div>
          </form>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    )
  }

  return null
}
