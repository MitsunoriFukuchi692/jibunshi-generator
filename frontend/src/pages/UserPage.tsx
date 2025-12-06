import { useState } from 'react';
import { API_URL } from '../config';

export default function UserPage({
  userId,
  setUserId,
  setToken
}: {
  userId: number | null;
  setUserId: (id: number) => void;
  setToken: (token: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URL not configured');

      const response = await fetch(`${apiUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();

      // ① 先に state を更新
      setUserId(data.userId);
      setToken(data.token);

      // ② その後 localStorage に保存
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', String(data.userId));

      // ③ 少し遅延させてから hash を変更（state 更新を待つ）
      setTimeout(() => {
        window.location.hash = '#interview';
      }, 100);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold' as const,
      marginBottom: '10px',
      color: '#2c3e50',
    },
    subtitle: {
      fontSize: '14px',
      color: '#7f8c8d',
      marginBottom: '30px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '15px',
    },
    input: {
      padding: '12px',
      fontSize: '14px',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      fontFamily: 'inherit',
    },
    button: {
      padding: '12px',
      fontSize: '16px',
      fontWeight: 'bold' as const,
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      minHeight: '44px',
    },
    errorBox: {
      backgroundColor: '#fdeaea',
      color: '#c53030',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '14px',
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📖 自分史ジェネレーター</h1>
      <p style={styles.subtitle}>あなたの人生を自動で物語化します</p>

      {error && <div style={styles.errorBox}>{error}</div>}

      <form onSubmit={handleLogin} style={styles.form}>
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
          {loading ? '処理中...' : 'ログイン/新規登録'}
        </button>
      </form>
    </div>
  );
}
