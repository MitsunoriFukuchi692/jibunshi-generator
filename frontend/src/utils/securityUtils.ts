/**
 * フロントエンド用セキュリティ・入力検証ユーティリティ
 */

// ==================== トークン管理 ====================

const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30分のセッションタイムアウト

/**
 * トークンをローカルストレージに保存
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  // トークン有効期限を30分後に設定
  const expiry = new Date().getTime() + SESSION_TIMEOUT_MS;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
};

/**
 * ローカルストレージからトークンを取得
 */
export const getToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  // 有効期限切れの場合はトークンを削除
  if (expiry && new Date().getTime() > parseInt(expiry)) {
    removeToken();
    return null;
  }

  return token;
};

/**
 * トークンを削除（ログアウト）
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

/**
 * トークンが有効か確認
 */
export const isTokenValid = (): boolean => {
  const token = getToken();
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) {
    return false;
  }

  const isExpired = new Date().getTime() > parseInt(expiry);
  if (isExpired) {
    removeToken();
    return false;
  }

  return true;
};

/**
 * トークンの残り時間を取得（秒単位）
 */
export const getTokenRemainingTime = (): number => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return 0;

  const remaining = parseInt(expiry) - new Date().getTime();
  return Math.max(0, Math.floor(remaining / 1000));
};

// ==================== 入力値検証 ====================

/**
 * メールアドレスの形式を検証
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * パスワードの強度を検証
 * - 8文字以上
 * - 大文字・小文字・数字を含む
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('大文字を含む必要があります');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('小文字を含む必要があります');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('数字を含む必要があります');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * 日本語対応の名前検証
 */
export const validateName = (name: string): {
  isValid: boolean;
  error?: string;
} => {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, error: 'お名前を入力してください' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'お名前は100文字以内で入力してください' };
  }

  // 危険な文字をチェック（スクリプトタグなど）
  if (/<script|<iframe|javascript:|on\w+=/i.test(trimmed)) {
    return { isValid: false, error: '無効な文字が含まれています' };
  }

  return { isValid: true };
};

/**
 * 年齢の妥当性を検証
 */
export const validateAge = (age: string): {
  isValid: boolean;
  error?: string;
} => {
  const ageNum = parseInt(age, 10);

  if (isNaN(ageNum)) {
    return { isValid: false, error: '年齢は数値で入力してください' };
  }

  if (ageNum < 1 || ageNum > 150) {
    return { isValid: false, error: '年齢は1～150の間で入力してください' };
  }

  return { isValid: true };
};

/**
 * 生年月日の妥当性を検証
 */
export const validateBirthDate = (dateString: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!dateString) {
    return { isValid: false, error: '生年月日を入力してください' };
  }

  const date = new Date(dateString);
  const today = new Date();

  // 不正な日付をチェック
  if (isNaN(date.getTime())) {
    return { isValid: false, error: '正しい日付を入力してください' };
  }

  // 未来の日付をチェック
  if (date > today) {
    return { isValid: false, error: '生年月日は今日より前である必要があります' };
  }

  // 年齢が150歳を超えていないかチェック
  const age = today.getFullYear() - date.getFullYear();
  if (age > 150) {
    return { isValid: false, error: '正しい生年月日を入力してください' };
  }

  return { isValid: true };
};

// ==================== XSS対策（サニタイズ） ====================

/**
 * HTML特殊文字をエスケープ（XSS対策）
 */
export const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * 入力文字列をサニタイズ
 */
export const sanitizeInput = (input: string): string => {
  // 前後の空白を削除
  let sanitized = input.trim();

  // 危険なタグやスクリプトを削除
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  return sanitized;
};

// ==================== レート制限 ====================

interface RequestCount {
  count: number;
  resetTime: number;
}

const REQUEST_COUNTS: { [key: string]: RequestCount } = {};
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
const MAX_REQUESTS_PER_MINUTE = 30; // 1分あたり30リクエスト

/**
 * レート制限チェック
 */
export const checkRateLimit = (userId: string | number): {
  allowed: boolean;
  remainingRequests: number;
} => {
  const key = `user_${userId}`;
  const now = new Date().getTime();

  // ウィンドウをリセット
  if (!REQUEST_COUNTS[key] || now > REQUEST_COUNTS[key].resetTime) {
    REQUEST_COUNTS[key] = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  REQUEST_COUNTS[key].count++;
  const allowed = REQUEST_COUNTS[key].count <= MAX_REQUESTS_PER_MINUTE;

  return {
    allowed,
    remainingRequests: Math.max(0, MAX_REQUESTS_PER_MINUTE - REQUEST_COUNTS[key].count),
  };
};

// ==================== ローカルストレージの自動保存 ====================

/**
 * フォームデータをローカルストレージに自動保存
 */
export const saveFormData = (formId: string, formData: Record<string, any>): void => {
  try {
    localStorage.setItem(`form_${formId}`, JSON.stringify({
      data: formData,
      savedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('フォームデータの保存に失敗しました:', error);
  }
};

/**
 * 保存されたフォームデータを取得
 */
export const getFormData = (formId: string): Record<string, any> | null => {
  try {
    const stored = localStorage.getItem(`form_${formId}`);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed.data;
  } catch (error) {
    console.error('フォームデータの取得に失敗しました:', error);
    return null;
  }
};

/**
 * 保存されたフォームデータをクリア
 */
export const clearFormData = (formId: string): void => {
  try {
    localStorage.removeItem(`form_${formId}`);
  } catch (error) {
    console.error('フォームデータのクリアに失敗しました:', error);
  }
};

// ==================== デバッグ用 ====================

/**
 * ローカルストレージをクリア（デバッグ用）
 */
export const clearAllStorage = (): void => {
  localStorage.clear();
  console.log('✓ ローカルストレージをクリアしました');
};
