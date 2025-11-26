import { useState, useEffect, useCallback } from 'react';
import PhotoUploadPage from './PhotoUploadPage';
import TurningPointPage from './TurningPointPage';
import InterviewPage from './InterviewPage';
import {
  validateEmail,
  validatePassword,
  validateName,
  validateAge,
  validateBirthDate,
  escapeHtml,
  sanitizeInput,
  checkRateLimit,
  setToken,
  getToken,
  removeToken,
  getFormData,
  saveFormData,
  clearFormData,
  isTokenValid,
  getTokenRemainingTime,
} from '../utils/securityUtils.js';

interface UserPageProps {
  userId: number | null;
  setUserId: (id: number | null) => void;
}

interface FormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  userName?: string;
  userAge?: string;
  birthDate?: string;
  gender?: string;
  general?: string;
}

interface NotificationState {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  id: number;
}

export default function UserPage({ userId, setUserId }: UserPageProps) {
  // ステップ管理
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>(1);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken() && isTokenValid());

  // ステップ1: ログイン/登録
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // ステップ2-3: 基本情報・詳細情報
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userAge, setUserAge] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bio, setBio] = useState('');

  // UI状態管理
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [sessionWarningShown, setSessionWarningShown] = useState(false);
  const [tokenRemainingTime, setTokenRemainingTime] = useState<number | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const FORM_ID = 'user_registration';

  // ==================== セッション管理 ====================

  /**
   * 通知を表示（toast的な）
   */
  const showNotification = useCallback(
    (type: 'error' | 'success' | 'warning' | 'info', message: string) => {
      const id = Date.now();
      setNotifications((prev) => [...prev, { type, message, id }]);
      // 5秒後に自動削除
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    },
    []
  );

  /**
   * セッション有効期限を監視
   */
  useEffect(() => {
    const checkSession = setInterval(() => {
      if (isAuthenticated && !isTokenValid()) {
        if (!sessionWarningShown) {
          setSessionWarningShown(true);
          showNotification('warning', 'セッションが有効期限切れです。再度ログインしてください。');
          setIsAuthenticated(false);
          removeToken();
          setTokenState(null);
          setStep(1);
          setUserId(null);
        }
      }

      // トークンの残り時間を更新
      const remaining = getTokenRemainingTime();
      if (remaining > 0) {
        setTokenRemainingTime(remaining);
        // 5分以下の場合は警告を表示
        if (remaining < 300 && remaining > 0 && !sessionWarningShown) {
          showNotification('warning', `セッションが${Math.floor(remaining / 60)}分後に期限切れになります`);
        }
      }
    }, 30 * 1000); // 30秒ごとにチェック

    return () => clearInterval(checkSession);
  }, [isAuthenticated, sessionWarningShown, showNotification, setUserId]);

  // ==================== 自動保存機能 ====================

  /**
   * フォームデータを自動保存
   */
  useEffect(() => {
    if (step === 1 || step === 4 || !isAuthenticated) {
      return;
    }

    const autoSaveTimer = setTimeout(() => {
      const formData = {
        step,
        userName,
        userAge,
        birthDate,
        gender,
        address,
        occupation,
        bio,
      };

      saveFormData(FORM_ID, formData);
      setLastSavedTime(new Date().toLocaleTimeString('ja-JP'));
    }, 3000); // 3秒のディバウンス

    return () => clearTimeout(autoSaveTimer);
  }, [step, userName, userAge, birthDate, gender, address, occupation, bio, isAuthenticated]);

  /**
   * 保存されたデータを復元
   */
  useEffect(() => {
    if (step === 2 && isAuthenticated) {
      const savedData = getFormData(FORM_ID);
      if (savedData && savedData.step >= 2) {
        // 確認ダイアログを表示
        const confirm = window.confirm(
          '前回の入力内容が見つかりました。復元しますか？\n\n「はい」を選択すると前回の入力内容が復元されます。'
        );

        if (confirm) {
          setUserName(savedData.userName || '');
          setUserAge(savedData.userAge || '');
          setBirthDate(savedData.birthDate || '');
          setGender(savedData.gender || '');
          setAddress(savedData.address || '');
          setOccupation(savedData.occupation || '');
          setBio(savedData.bio || '');
          showNotification('success', '前回の入力内容を復元しました');
        }
      }
    }
  }, [step, isAuthenticated, showNotification]);

  // ==================== バリデーション ====================

  const validateLoginForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!validateEmail(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0] || 'パスワードが無効です';
    }

    if (!isLogin && password !== passwordConfirm) {
      newErrors.passwordConfirm = 'パスワードが一致しません';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    const nameValidation = validateName(userName);
    if (!nameValidation.isValid) {
      newErrors.userName = nameValidation.error;
    }

    const ageValidation = validateAge(userAge);
    if (!ageValidation.isValid) {
      newErrors.userAge = ageValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: FormErrors = {};

    const birthDateValidation = validateBirthDate(birthDate);
    if (!birthDateValidation.isValid) {
      newErrors.birthDate = birthDateValidation.error;
    }

    if (!gender) {
      newErrors.gender = '性別を選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== API呼び出し ====================

  const handleLogin = useCallback(async () => {
    if (!validateLoginForm()) return;

    // レート制限チェック
    const rateLimit = checkRateLimit('login');
    if (!rateLimit.allowed) {
      setErrors({
        general: '短時間にたくさんのリクエストがあります。しばらく待ってからお試しください。',
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizeInput(email),
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || (isLogin ? 'ログインに失敗しました' : '登録に失敗しました'));
      }

      const data = await response.json();
      const { token: newToken, user } = data;

      // トークンを保存
      setToken(newToken);
      setTokenState(newToken);
      setIsAuthenticated(true);
      setUserId(user.id);
      setUserEmail(email);
      setStep(2);

      showNotification(
        'success',
        isLogin ? 'ログインしました' : '登録が完了しました'
      );

      // 成功後、フォームデータをクリア
      clearFormData(FORM_ID);
    } catch (error: any) {
      const message = error.message || 'ログインに失敗しました。もう一度お試しください。';
      setErrors({ general: message });
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, passwordConfirm, isLogin, showNotification, setUserId]);

  const handleNext = useCallback(async () => {
    if (step === 1) {
      await handleLogin();
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
        setErrors({});
        showNotification('success', '基本情報を保存しました');
      }
    } else if (step === 3) {
      if (validateStep3()) {
        setStep(4);
        setErrors({});
        showNotification('success', '詳細情報を保存しました');
      }
    } else if (step === 4) {
      // 確認画面で「登録する」を押した場合
      await handleRegister();
    }
  }, [step, userName, userAge, birthDate, gender, showNotification]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9);
      setErrors({});
    }
  }, [step]);

  const handleRegister = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const authToken = getToken();
      if (!authToken) {
        throw new Error('認証情報が見つかりません。再度ログインしてください。');
      }

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: sanitizeInput(userName),
          age: parseInt(userAge),
          birthDate,
          gender,
          address: sanitizeInput(address),
          occupation: sanitizeInput(occupation),
          bio: sanitizeInput(bio),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ユーザー登録に失敗しました');
      }

      setStep(4);
      clearFormData(FORM_ID);
      showNotification('success', 'ユーザー登録が完了しました');
    } catch (error: any) {
      const message = error.message || '予期しないエラーが発生しました。再度お試しください。';
      setErrors({ general: message });
      showNotification('error', message);
      setStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    if (window.confirm('ログアウトしますか？')) {
      removeToken();
      setTokenState(null);
      setIsAuthenticated(false);
      setUserId(null);
      setStep(1);
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
      clearFormData(FORM_ID);
      showNotification('success', 'ログアウトしました');
    }
  }, [showNotification, setUserId]);

  // ==================== スタイル定義 ====================

  const styles = {
    container: {
      maxWidth: '700px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'sans-serif',
    },
    notificationContainer: {
      position: 'fixed' as const,
      top: '20px',
      right: '20px',
      zIndex: 9999,
      maxWidth: '400px',
    },
    notification: (type: 'error' | 'success' | 'warning' | 'info') => {
      const colors = {
        error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
        success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
        warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
        info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' },
      };
      const color = colors[type];
      return {
        backgroundColor: color.bg,
        border: `2px solid ${color.border}`,
        color: color.text,
        padding: '15px',
        marginBottom: '10px',
        borderRadius: '4px',
        animation: 'slideIn 0.3s ease',
      };
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '30px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#7f8c8d',
      marginTop: '5px',
    },
    sessionInfo: {
      fontSize: '12px',
      color: '#7f8c8d',
      marginTop: '10px',
      padding: '10px',
      backgroundColor: '#ecf0f1',
      borderRadius: '4px',
    },
    stepIndicator: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '30px',
      gap: '5px',
      overflowX: 'auto' as const,
    },
    stepBubble: (active: boolean) => ({
      width: '50px',
      height: '50px',
      minWidth: '50px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      backgroundColor: active ? '#27ae60' : '#ecf0f1',
      color: active ? 'white' : '#7f8c8d',
      transition: 'all 0.3s ease',
    }),
    stepLabel: {
      textAlign: 'center' as const,
      fontSize: '12px',
      marginTop: '5px',
      color: '#7f8c8d',
    },
    card: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
    },
    section: {
      marginBottom: '25px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#2c3e50',
    },
    input: {
      width: '100%',
      padding: '14px',
      fontSize: '16px',
      border: '2px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.3s ease',
    },
    inputError: {
      borderColor: '#e74c3c',
    },
    select: {
      width: '100%',
      padding: '14px',
      fontSize: '16px',
      border: '2px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '14px',
      fontSize: '16px',
      border: '2px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      boxSizing: 'border-box' as const,
      resize: 'vertical' as const,
      minHeight: '100px',
    },
    errorMessage: {
      color: '#e74c3c',
      fontSize: '14px',
      marginTop: '5px',
      display: 'block',
    },
    helpText: {
      fontSize: '12px',
      color: '#7f8c8d',
      marginTop: '5px',
    },
    button: {
      flex: 1,
      padding: '16px',
      fontSize: '16px',
      fontWeight: 'bold',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: 'none',
      minHeight: '50px',
    },
    primaryButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    primaryButtonDisabled: {
      backgroundColor: '#95a5a6',
      cursor: 'not-allowed',
      opacity: 0.6,
    },
    secondaryButton: {
      backgroundColor: '#95a5a6',
      color: 'white',
    },
    warningBox: {
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      color: '#856404',
      lineHeight: '1.6',
    },
    errorBox: {
      backgroundColor: '#f8d7da',
      border: '2px solid #f5c6cb',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      color: '#721c24',
      lineHeight: '1.6',
    },
    infoBox: {
      backgroundColor: '#d1ecf1',
      border: '2px solid #bee5eb',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      color: '#0c5460',
      lineHeight: '1.6',
    },
    successBox: {
      backgroundColor: '#d4edda',
      border: '2px solid #c3e6cb',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      color: '#155724',
      textAlign: 'center' as const,
    },
    confirmSection: {
      backgroundColor: '#ecf0f1',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
    },
    confirmItem: {
      display: 'flex',
      justifyContent: 'space-between',
      paddingBottom: '12px',
      borderBottom: '1px solid #ddd',
      marginBottom: '12px',
    },
    confirmLabel: {
      fontWeight: 'bold',
      color: '#2c3e50',
      minWidth: '100px',
    },
    confirmValue: {
      color: '#34495e',
      textAlign: 'right' as const,
      flex: 1,
    },
    savingIndicator: {
      fontSize: '12px',
      color: '#27ae60',
      marginTop: '8px',
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      marginTop: '30px',
    },
    toggleButton: {
      backgroundColor: 'transparent',
      color: '#3498db',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      textDecoration: 'underline',
      padding: 0,
      marginBottom: '20px',
    },
  };

  // ==================== レンダリング関数 ====================

  const renderNotifications = () => (
    <div style={styles.notificationContainer}>
      {notifications.map((notification) => (
        <div key={notification.id} style={styles.notification(notification.type)}>
          {notification.type === 'error' && '❌ '}
          {notification.type === 'success' && '✅ '}
          {notification.type === 'warning' && '⚠️ '}
          {notification.type === 'info' && 'ℹ️ '}
          {notification.message}
        </div>
      ))}
    </div>
  );

  const renderStepIndicator = () => {
    const steps = step <= 4 ? [1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, 4) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    return (
      <div style={styles.stepIndicator}>
        {steps.map((stepNum) => (
          <div key={stepNum} style={{ flex: 1, textAlign: 'center', minWidth: '50px' }}>
            <div style={styles.stepBubble(stepNum <= step)}>
              {stepNum <= step - 1 ? '✓' : stepNum}
            </div>
            <div style={styles.stepLabel}>
              {stepNum === 1 && 'ログイン'}
              {stepNum === 2 && '基本情報'}
              {stepNum === 3 && '詳細'}
              {stepNum === 4 && '確認'}
              {stepNum === 5 && '写真'}
              {stepNum === 6 && '次へ'}
              {stepNum === 7 && 'ターニング'}
              {stepNum === 8 && '完了'}
              {stepNum === 9 && 'AI面接'}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStep1 = () => (
    <>
      {errors.general && <div style={styles.errorBox}>❌ {errors.general}</div>}

      <div style={styles.infoBox}>
        🔐 ステップ1: {isLogin ? 'ログイン' : '新規登録'}してください
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setErrors({});
            setPassword('');
            setPasswordConfirm('');
          }}
          style={styles.toggleButton}
        >
          {isLogin ? '→ アカウント新規登録' : '→ 既存アカウントでログイン'}
        </button>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>メールアドレス *</label>
        <input
          id="email"
          type="email"
          placeholder="example@example.com"
          value={email}
          onChange={(e) => setEmail(sanitizeInput(e.target.value))}
          style={{
            ...styles.input,
            ...(errors.email ? styles.inputError : {}),
          }}
          autoComplete="email"
        />
        {errors.email && <span style={styles.errorMessage}>{errors.email}</span>}
      </div>

      <div style={styles.section}>
        <label style={styles.label}>パスワード *</label>
        <input
          id="password"
          type="password"
          placeholder={isLogin ? 'パスワード' : '8文字以上（大文字・小文字・数字を含む）'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setShowPasswordRequirements(!isLogin)}
          onBlur={() => setShowPasswordRequirements(false)}
          style={{
            ...styles.input,
            ...(errors.password ? styles.inputError : {}),
          }}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />
        {errors.password && <span style={styles.errorMessage}>{errors.password}</span>}

        {showPasswordRequirements && !isLogin && (
          <div style={{ ...styles.helpText, marginTop: '10px', lineHeight: '1.8' }}>
            📋 パスワードの条件:
            <ul style={{ marginTop: '5px', paddingLeft: '20px', fontSize: '12px' }}>
              <li>8文字以上</li>
              <li>大文字（A-Z）を含む</li>
              <li>小文字（a-z）を含む</li>
              <li>数字（0-9）を含む</li>
            </ul>
          </div>
        )}
      </div>

      {!isLogin && (
        <div style={styles.section}>
          <label style={styles.label}>パスワード確認 *</label>
          <input
            type="password"
            placeholder="パスワードをもう一度入力してください"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            style={{
              ...styles.input,
              ...(errors.passwordConfirm ? styles.inputError : {}),
            }}
            autoComplete="new-password"
          />
          {errors.passwordConfirm && (
            <span style={styles.errorMessage}>{errors.passwordConfirm}</span>
          )}
        </div>
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      <div style={styles.infoBox}>
        👤 ステップ2: 基本情報を入力してください
      </div>

      <div style={styles.section}>
        <label style={styles.label}>お名前 *</label>
        <input
          type="text"
          placeholder="例：山田太郎"
          value={userName}
          onChange={(e) => setUserName(sanitizeInput(e.target.value))}
          style={{
            ...styles.input,
            ...(errors.userName ? styles.inputError : {}),
          }}
        />
        {errors.userName && <span style={styles.errorMessage}>{errors.userName}</span>}
        <span style={styles.helpText}>{userName.length}/100文字</span>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>年齢 *</label>
        <input
          type="number"
          placeholder="例：75"
          min="1"
          max="150"
          value={userAge}
          onChange={(e) => setUserAge(e.target.value)}
          style={{
            ...styles.input,
            ...(errors.userAge ? styles.inputError : {}),
          }}
        />
        {errors.userAge && <span style={styles.errorMessage}>{errors.userAge}</span>}
      </div>

      {lastSavedTime && (
        <div style={styles.savingIndicator}>
          ✓ 最後に保存: {lastSavedTime}
        </div>
      )}
    </>
  );

  const renderStep3 = () => (
    <>
      <div style={styles.infoBox}>
        📝 ステップ3: より詳しい情報を入力してください
      </div>

      <div style={styles.section}>
        <label style={styles.label}>生年月日 *</label>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          style={{
            ...styles.input,
            ...(errors.birthDate ? styles.inputError : {}),
          }}
        />
        {errors.birthDate && <span style={styles.errorMessage}>{errors.birthDate}</span>}
      </div>

      <div style={styles.section}>
        <label style={styles.label}>性別 *</label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          style={{
            ...styles.select,
            ...(errors.gender ? styles.inputError : {}),
          }}
        >
          <option value="">選択してください</option>
          <option value="男性">男性</option>
          <option value="女性">女性</option>
          <option value="その他">その他</option>
          <option value="指定しない">指定しない</option>
        </select>
        {errors.gender && <span style={styles.errorMessage}>{errors.gender}</span>}
      </div>

      <div style={styles.section}>
        <label style={styles.label}>住所（オプション）</label>
        <input
          type="text"
          placeholder="例：東京都渋谷区"
          value={address}
          onChange={(e) => setAddress(sanitizeInput(e.target.value))}
          style={styles.input}
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>職業（オプション）</label>
        <input
          type="text"
          placeholder="例：会社員、医師、退職者など"
          value={occupation}
          onChange={(e) => setOccupation(sanitizeInput(e.target.value))}
          style={styles.input}
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>自己紹介（オプション）</label>
        <textarea
          placeholder="あなたについて教えてください（最大500文字）"
          value={bio}
          onChange={(e) => setBio(sanitizeInput(e.target.value.slice(0, 500)))}
          style={styles.textarea}
        />
        <div style={styles.helpText}>
          {bio.length}/500文字
        </div>
      </div>

      {lastSavedTime && (
        <div style={styles.savingIndicator}>
          ✓ 最後に保存: {lastSavedTime}
        </div>
      )}
    </>
  );

  const renderStep4 = () => (
    <>
      <div style={styles.infoBox}>
        ✓ ステップ4: 入力内容を確認してください
      </div>

      <div style={styles.confirmSection}>
        <h3 style={{ marginTop: 0, color: '#2c3e50', fontSize: '18px' }}>
          入力内容の確認
        </h3>

        <div style={styles.confirmItem}>
          <span style={styles.confirmLabel}>メール</span>
          <span style={styles.confirmValue}>{escapeHtml(userEmail)}</span>
        </div>

        <div style={styles.confirmItem}>
          <span style={styles.confirmLabel}>お名前</span>
          <span style={styles.confirmValue}>{escapeHtml(userName)}</span>
        </div>

        <div style={styles.confirmItem}>
          <span style={styles.confirmLabel}>年齢</span>
          <span style={styles.confirmValue}>{userAge}歳</span>
        </div>

        <div style={styles.confirmItem}>
          <span style={styles.confirmLabel}>生年月日</span>
          <span style={styles.confirmValue}>{birthDate || '未入力'}</span>
        </div>

        <div style={styles.confirmItem}>
          <span style={styles.confirmLabel}>性別</span>
          <span style={styles.confirmValue}>{gender || '未入力'}</span>
        </div>

        <div style={styles.confirmItem}>
          <span style={styles.confirmLabel}>住所</span>
          <span style={styles.confirmValue}>{address || '未入力'}</span>
        </div>

        <div style={styles.confirmItem}>
          <span style={styles.confirmLabel}>職業</span>
          <span style={styles.confirmValue}>{occupation || '未入力'}</span>
        </div>

        {bio && (
          <div style={styles.confirmItem}>
            <span style={styles.confirmLabel}>自己紹介</span>
            <span style={styles.confirmValue}>
              {escapeHtml(bio.substring(0, 50))}
              {bio.length > 50 ? '...' : ''}
            </span>
          </div>
        )}
      </div>

      <div style={styles.warningBox}>
        ⚠️ 内容に間違いがなければ「登録する」をクリックしてください。
        修正したい場合は「戻る」をクリックしてください。
      </div>
    </>
  );

  const renderStep5_9 = () => {
    if (step === 4) {
      return (
        <>
          <div style={styles.successBox}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
              登録完了しました！
            </div>
            <div style={{ fontSize: '16px' }}>
              {escapeHtml(userName)}さんの自分史作成を開始します
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>次のステップ</h3>
            <ul style={{ lineHeight: '1.8', color: '#34495e' }}>
              <li>📸 思い出の写真をアップロード</li>
              <li>✍️ 人生のターニングポイントを入力</li>
              <li>🤖 AI があなたの自分史を自動作成</li>
              <li>📖 完成した自分史を確認</li>
              <li>📕 PDF で出版</li>
            </ul>
          </div>

          <div style={styles.buttonContainer}>
            <button
              onClick={() => {
                if (userId) setStep(5);
              }}
              style={{
                ...styles.button,
                ...styles.primaryButton,
              }}
            >
              写真をアップロード →
            </button>
          </div>
        </>
      );
    }

    if (step === 5) {
      return userId ? <PhotoUploadPage userId={userId} token={token} onComplete={() => setStep(6)} /> : null;
    }

    if (step === 6) {
      return (
        <>
          <div style={styles.infoBox}>
            ✓ 写真のアップロードが完了しました！
          </div>
          <div style={styles.card}>
            <h3 style={{ color: '#2c3e50' }}>次のステップ</h3>
            <p style={{ color: '#34495e', lineHeight: '1.8' }}>
              写真の分析が完了しました。次は人生のターニングポイントについてお聞きします。
            </p>
            <button
              onClick={() => setStep(7)}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                width: '100%',
              }}
            >
              ターニングポイント入力へ →
            </button>
          </div>
        </>
      );
    }

    if (step === 7) {
      return userId ? (
        <TurningPointPage userId={userId} token={token} birthDate={birthDate} onComplete={() => setStep(8)} />
      ) : null;
    }

    if (step === 8) {
      return (
        <>
          <div style={styles.successBox}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
              ターニングポイント入力完了！
            </div>
            <div style={{ fontSize: '16px' }}>
              次は AI インタビュー機能を使用します
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>次のステップ</h3>
            <ul style={{ lineHeight: '1.8', color: '#34495e' }}>
              <li>🤖 AI があなたの自分史を自動作成</li>
              <li>📖 完成した自分史を確認</li>
              <li>📕 PDF で出版</li>
            </ul>
          </div>

          <button
            onClick={() => setStep(9)}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              width: '100%',
              marginTop: '20px',
            }}
          >
            AI インタビューに進む →
          </button>
        </>
      );
    }

    if (step === 9) {
      return userId ? <InterviewPage userId={userId} token={token} /> : null;
    }
  };

  // ==================== メインレンダリング ====================

  return (
    <div style={styles.container}>
      <style>{`@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {renderNotifications()}

      <div style={styles.header}>
        <h1 style={styles.title}>📖 自分史を作成する</h1>
        {isAuthenticated && (
          <>
            <div style={styles.subtitle}>
              {escapeHtml(userName || email)}としてログイン中
            </div>
            {tokenRemainingTime && tokenRemainingTime < 600 && (
              <div style={styles.sessionInfo}>
                ⏰ セッション残り時間: 約{Math.floor(tokenRemainingTime / 60)}分
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                ...styles.toggleButton,
                color: '#e74c3c',
              }}
            >
              ログアウト
            </button>
          </>
        )}
      </div>

      {renderStepIndicator()}

      <div style={styles.card}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step >= 4 && renderStep5_9()}

        {step < 4 && (
          <div style={styles.buttonContainer}>
            {step > 1 && (
              <button
                onClick={handleBack}
                disabled={isLoading}
                style={{
                  ...styles.button,
                  ...styles.secondaryButton,
                  ...(isLoading ? styles.primaryButtonDisabled : {}),
                }}
              >
                ← 戻る
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isLoading}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(isLoading ? styles.primaryButtonDisabled : {}),
              }}
            >
              {isLoading ? '処理中...' : step === 3 ? '登録する' : '次へ →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
