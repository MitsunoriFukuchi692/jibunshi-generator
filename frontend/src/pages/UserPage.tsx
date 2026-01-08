import { useState } from 'react'
import './UserPage.css'

interface UserPageProps {
  userId: number | null
  setUserId: (id: number) => void
  setToken: (token: string) => void
  setUserInfo: (info: { name: string; age: number }) => void
}

type Step = 'choice' | 'login-name' | 'login-birthday' | 'login-pin' | 'register-info' | 'register-confirm' | 'forgot-pin-start' | 'forgot-pin-birthday' | 'forgot-pin-new'

interface LoginCandidate {
  id: number
  name: string
  birthMonth: number
  birthDay: number
  age: number
}

export default function UserPage({ 
  userId, 
  setUserId, 
  setToken,
  setUserInfo
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

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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
      const response = await fetch(`${apiUrl}/api/users/login/verify-birthday`, {
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
  // ログイン: ステップ3 - PIN検証
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
        body: JSON.stringify({ userId: loginUserId, pin: loginPin }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'ログインに失敗しました。')
      }

      const data = await response.json()

      // ログイン成功
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('userInfo', JSON.stringify(data.user))

      setUserId(data.userId)
      setToken(data.token)
      setUserInfo({ name: data.user.name, age: data.user.age || 0 })

      // ✅ 修正：timelineList ページへ遷移
      // 既存ユーザーはインタビューをスキップして、年表確認ページへ直接遷移
      window.location.hash = 'timelineList'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // 新規登録: 情報入力
  // ============================================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (!regName.trim()) {
      setError('お名前を入力してください。')
      return
    }

    if (!regAge || isNaN(parseInt(regAge)) || parseInt(regAge) < 1 || parseInt(regAge) > 120) {
      setError('正しい年齢を入力してください（1～120）。')
      return
    }

    if (!regBirthMonth || !regBirthDay) {
      setError('生年月日（月・日）を入力してください。')
      return
    }

    const month = parseInt(regBirthMonth)
    const day = parseInt(regBirthDay)

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      setError('正しい生年月日を入力してください。')
      return
    }

    if (!regPin.trim() || regPin.length !== 4 || !/^\d{4}$/.test(regPin)) {
      setError('PINは4桁の数字で入力してください。')
      return
    }

    if (regPin !== regPinConfirm) {
      setError('PINの確認が一致しません。')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${apiUrl}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          age: parseInt(regAge),
          birthMonth: month,
          birthDay: day,
          pin: regPin,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '登録に失敗しました。')
      }

      const data = await response.json()

      // 登録成功
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('userInfo', JSON.stringify(data.user))

      setUserId(data.userId)
      setToken(data.token)
      setUserInfo({ name: data.user.name, age: data.user.age || 0 })

      // インタビューページへ遷移
      window.location.hash = 'interview'
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // PIN忘れ: 名前確認
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

      setStep('forgot-pin-birthday')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // PIN忘れ: 月日確認＆新PIN設定
  // ============================================
  const handleForgotPinReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!forgotBirthMonth || !forgotBirthDay) {
      setError('生年月日（月・日）を入力してください。')
      return
    }

    const month = parseInt(forgotBirthMonth)
    const day = parseInt(forgotBirthDay)

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      setError('正しい生年月日を入力してください。')
      return
    }

    if (!forgotNewPin.trim() || forgotNewPin.length !== 4 || !/^\d{4}$/.test(forgotNewPin)) {
      setError('新しいPINは4桁の数字で入力してください。')
      return
    }

    if (forgotNewPin !== forgotNewPinConfirm) {
      setError('新しいPINの確認が一致しません。')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${apiUrl}/api/users/login/forgot-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: forgotName.trim(),
          birthMonth: month,
          birthDay: day,
          newPin: forgotNewPin,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'PIN変更に失敗しました。')
      }

      // 成功 → ログイン画面に戻る
      setError(null)
      alert('PINが変更されました。新しいPINでログインしてください。')
      setStep('choice')
      setForgotName('')
      setForgotBirthMonth('')
      setForgotBirthDay('')
      setForgotNewPin('')
      setForgotNewPinConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN変更に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // UI: ステップ選択画面
  // ============================================
  if (step === 'choice') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📚 人生記録</h1>
          <p className="subtitle">あなたの人生のお話を聞かせていただきます</p>

          <div className="choice-buttons">
            <button
              onClick={handleChoiceLogin}
              className="btn-primary"
              disabled={loading}
            >
              ログイン
            </button>
            <button
              onClick={handleChoiceRegister}
              className="btn-secondary"
              disabled={loading}
            >
              新規登録
            </button>
            <button
              onClick={handleChoiceForgotPin}
              className="btn-warning"
              disabled={loading}
            >
              PINを忘れた
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
          <h1>📚 ログイン</h1>
          
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
          <h1>📚 ログイン</h1>
          <p className="subtitle">生年月日（月・日）を入力してください</p>

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
  // UI: ログイン - PIN検証
  // ============================================
  if (step === 'login-pin') {
    return (
      <div className="user-page">
        <div className="user-container">
          <h1>📚 ログイン</h1>
          <p className="subtitle">PINを入力してください（4桁の数字）</p>

          <form onSubmit={handleLoginPinVerify}>
            <div className="form-group">
              <label>PIN</label>
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

          <form onSubmit={handleRegister}>
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
                {loading ? '登録中...' : '登録'}
              </button>
            </div>
          </form>

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
