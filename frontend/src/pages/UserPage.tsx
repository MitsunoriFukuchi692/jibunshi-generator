import { useState } from 'react';
import { API_URL } from '../config';

export default function UserPage({
  userId,
  setUserId,
  setToken,
  setUserInfo
}: {
  userId: number | null;
  setUserId: (id: number) => void;
  setToken: (token: string) => void;
  setUserInfo?: (info: { name: string; age: number }) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setDebugInfo('');

    try {
      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URL not configured');

      const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
      const body: any = { email, password };
      
      // 登録時のみ name と age が必須
      if (!isLogin) {
        if (!name.trim()) {
          throw new Error('名前を入力してください');
        }
        if (!age || parseInt(age) < 1 || parseInt(age) > 120) {
          throw new Error('正しい年齢を入力してください（1～120）');
        }
        body.name = name;
        body.age = parseInt(age);
      } else {
        // ログイン時も name と age を送信（履歴用）
        if (name.trim()) {
          body.name = name;
        }
        if (age && parseInt(age) >= 1 && parseInt(age) <= 120) {
          body.age = parseInt(age);
        }
      }

      const fullUrl = `${apiUrl}${endpoint}`;
      
      const debugMsg = `
🤔 リクエスト情報:
- URL: ${fullUrl}
- メソッド: POST
- ボディ: ${JSON.stringify(body, null, 2)}
      `;
      console.log(debugMsg);
      setDebugInfo(prev => prev + debugMsg);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const responseDebugMsg = `
📥 レスポンス情報:
- ステータス: ${response.status}
- OK: ${response.ok}
      `;
      console.log(responseDebugMsg);
      setDebugInfo(prev => prev + responseDebugMsg);

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.error || 'Failed to process request';
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      const successMsg = `
✅ リクエスト成功!
- userId: ${data.userId}
- token: ${data.token?.substring(0, 20)}...
- user: ${JSON.stringify(data.user, null, 2)}
      `;
      console.log(successMsg);
      setDebugInfo(prev => prev + successMsg);

      // ① 先に state を更新
      console.log('📄 State を更新中...');
      setUserId(data.userId);
      setToken(data.token);
      
      // ② ユーザー情報を state に保存
      const userInfo = { name: data.user.name, age: data.user.age };
      if (setUserInfo) {
        setUserInfo(userInfo);
      }

      // ③ その後 localStorage に保存
      console.log('💾 localStorage に保存中...');
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', String(data.userId));
      localStorage.setItem('userInfo', JSON.stringify(userInfo));

      // ④ 少し遅延させてから hash を変更
      console.log('⏰ 100ms 待機してから hash を変更...');
      setTimeout(() => {
        console.log('🔖 Hash を変更: #interview');
        window.location.hash = '#interview';
      }, 100);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      console.error('❌ エラー:', errorMsg);
      setError(errorMsg);
      setDebugInfo(prev => prev + `\n❌ エラー: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 20px',
      textAlign: 'center' as const,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold' as const,
      marginBottom: '15px',
      color: '#2c3e50',
    },
    subtitle: {
      fontSize: '16px',
      color: '#7f8c8d',
      marginBottom: '30px',
      lineHeight: '1.6',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '15px',
    },
    input: {
      padding: '14px',
      fontSize: '16px',
      border: '2px solid #bdc3c7',
      borderRadius: '8px',
      fontFamily: 'inherit',
      minHeight: '44px',
    },
    button: {
      padding: '14px',
      fontSize: '16px',
      fontWeight: 'bold' as const,
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      minHeight: '48px',
      transition: 'background-color 0.3s ease',
    },
    toggleButton: {
      padding: '12px 20px',
      fontSize: '16px',
      backgroundColor: '#ecf0f1',
      color: '#2c3e50',
      border: '2px solid #bdc3c7',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      minHeight: '44px',
      transition: 'all 0.3s ease',
    },
    errorBox: {
      backgroundColor: '#fdeaea',
      color: '#c53030',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '15px',
      fontSize: '15px',
      lineHeight: '1.6',
    },
    debugBox: {
      backgroundColor: '#f0f0f0',
      color: '#333',
      padding: '12px',
      borderRadius: '4px',
      marginTop: '15px',
      fontSize: '12px',
      fontFamily: 'monospace',
      textAlign: 'left' as const,
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-all' as const,
      maxHeight: '300px',
      overflowY: 'auto' as const,
    },
    toggleContainer: {
      marginBottom: '20px',
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📖 人生記録</h1>
      <p style={styles.subtitle}>あなたの人生のお話を聞かせていただきます</p>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.toggleContainer}>
        <button
          type="button"
          onClick={() => setIsLogin(true)}
          style={{
            ...styles.toggleButton,
            backgroundColor: isLogin ? '#3498db' : '#ecf0f1',
            color: isLogin ? 'white' : '#2c3e50',
            borderColor: isLogin ? '#3498db' : '#bdc3c7',
          }}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(false)}
          style={{
            ...styles.toggleButton,
            backgroundColor: !isLogin ? '#3498db' : '#ecf0f1',
            color: !isLogin ? 'white' : '#2c3e50',
            borderColor: !isLogin ? '#3498db' : '#bdc3c7',
          }}
        >
          新規登録
        </button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* 登録時は name と age を必須、ログイン時はオプション */}
        <input
          type="text"
          placeholder="お名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
          required={!isLogin}
        />
        <input
          type="number"
          placeholder="年齢（1～120）"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          style={styles.input}
          min="1"
          max="120"
          required={!isLogin}
        />

        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="パスワード（8文字以上）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? '処理中...' : isLogin ? 'ログイン' : '新規登録'}
        </button>
      </form>

      {debugInfo && (
        <div style={styles.debugBox}>
          <strong>🛠️ デバッグ情報:</strong>
          {debugInfo}
        </div>
      )}
    </div>
  );
}
