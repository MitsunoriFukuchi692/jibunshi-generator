import { useState } from 'react';

export default function UserPage() {
  // ステップ管理
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // ステップ1: 基本情報
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');

  // ステップ2: 詳細情報
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bio, setBio] = useState('');

  // スタイル定義
  const styles = {
    container: {
      maxWidth: '700px',
      margin: '0 auto',
      padding: '20px',
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
    stepIndicator: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '30px',
      gap: '10px',
    },
    stepBubble: (active: boolean) => ({
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
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
      padding: '12px',
      fontSize: '16px',
      border: '2px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
    },
    select: {
      width: '100%',
      padding: '12px',
      fontSize: '16px',
      border: '2px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '12px',
      fontSize: '16px',
      border: '2px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      boxSizing: 'border-box' as const,
      resize: 'vertical' as const,
    },
    buttonContainer: {
      display: 'flex',
      gap: '10px',
      marginTop: '30px',
    },
    button: {
      flex: 1,
      padding: '15px',
      fontSize: '16px',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: 'none',
    },
    nextButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    nextButtonHover: {
      backgroundColor: '#229954',
    },
    backButton: {
      backgroundColor: '#95a5a6',
      color: 'white',
    },
    backButtonHover: {
      backgroundColor: '#7f8c8d',
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
    },
    confirmValue: {
      color: '#34495e',
    },
    completionMessage: {
      textAlign: 'center' as const,
      backgroundColor: '#d5f4e6',
      padding: '30px',
      borderRadius: '8px',
      marginBottom: '20px',
    },
    completionIcon: {
      fontSize: '48px',
      marginBottom: '10px',
    },
    completionText: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#27ae60',
      marginBottom: '10px',
    },
    info: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      fontSize: '14px',
      color: '#2c3e50',
      marginBottom: '20px',
    },
  };

  // バリデーション
  const validateStep1 = (): boolean => {
    if (!userName.trim()) {
      alert('お名前を入力してください');
      return false;
    }
    if (!userAge || parseInt(userAge) < 1 || parseInt(userAge) > 150) {
      alert('正しい年齢を入力してください（1-150）');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!birthDate) {
      alert('生年月日を入力してください');
      return false;
    }
    if (!gender) {
      alert('性別を選択してください');
      return false;
    }
    return true;
  };

  // ステップ進行
  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3) {
      handleRegister();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleRegister = () => {
    console.log('ユーザー登録:', {
      name: userName,
      age: userAge,
      birthDate,
      gender,
      address,
      occupation,
      bio,
    });
    alert(`${userName}さんが登録されました！`);
    setStep(4);
  };

  // ステップインジケーター
  const renderStepIndicator = () => (
    <div style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <div key={s} style={{ flex: 1, textAlign: 'center' }}>
          <div style={styles.stepBubble(step >= s)}>
            {step > s ? '✓' : s}
          </div>
          <div style={styles.stepLabel}>
            {s === 1 && '基本情報'}
            {s === 2 && '詳細情報'}
            {s === 3 && '確認'}
          </div>
        </div>
      ))}
    </div>
  );

  // ステップ1: 基本情報
  const renderStep1 = () => (
    <>
      <div style={styles.info}>
        👤 ステップ1: まずは基本情報を教えてください
      </div>
      <div style={styles.section}>
        <label style={styles.label}>お名前 *</label>
        <input
          type="text"
          placeholder="例：山田太郎"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          style={styles.input}
        />
      </div>
      <div style={styles.section}>
        <label style={styles.label}>年齢 *</label>
        <input
          type="number"
          placeholder="例：75"
          value={userAge}
          onChange={(e) => setUserAge(e.target.value)}
          style={styles.input}
        />
      </div>
    </>
  );

  // ステップ2: 詳細情報
  const renderStep2 = () => (
    <>
      <div style={styles.info}>
        📝 ステップ2: さらに詳しい情報を入力してください（オプションもあります）
      </div>
      <div style={styles.section}>
        <label style={styles.label}>生年月日 *</label>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          style={styles.input}
        />
      </div>
      <div style={styles.section}>
        <label style={styles.label}>性別 *</label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          style={styles.select}
        >
          <option value="">選択してください</option>
          <option value="男性">男性</option>
          <option value="女性">女性</option>
          <option value="その他">その他</option>
          <option value="指定しない">指定しない</option>
        </select>
      </div>
      <div style={styles.section}>
        <label style={styles.label}>住所（オプション）</label>
        <input
          type="text"
          placeholder="例：東京都渋谷区"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={styles.input}
        />
      </div>
      <div style={styles.section}>
        <label style={styles.label}>職業（オプション）</label>
        <input
          type="text"
          placeholder="例：会社員、医師、退職者など"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          style={styles.input}
        />
      </div>
      <div style={styles.section}>
        <label style={styles.label}>自己紹介（オプション）</label>
        <textarea
          placeholder="あなたについて教えてください（最大500文字）"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          style={{ ...styles.textarea, height: '100px' }}
        />
        <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>
          {bio.length}/500文字
        </div>
      </div>
    </>
  );

  // ステップ3: 確認画面
  const renderStep3 = () => (
    <>
      <div style={styles.info}>
        ✓ ステップ3: 入力内容を確認してください
      </div>
      <div style={styles.confirmSection}>
        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>【入力内容確認】</h3>

        <div style={styles.confirmItem}>
          <span style={styles.confirmLabel}>お名前</span>
          <span style={styles.confirmValue}>{userName}</span>
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
            <span style={styles.confirmValue}>{bio}</span>
          </div>
        )}
      </div>

      <div style={styles.info}>
        内容に間違いがなければ「登録する」をクリックしてください
      </div>
    </>
  );

  // ステップ4: 登録完了
  const renderStep4 = () => (
    <>
      <div style={styles.completionMessage}>
        <div style={styles.completionIcon}>🎉</div>
        <div style={styles.completionText}>登録完了しました！</div>
        <div style={{ fontSize: '16px', color: '#27ae60' }}>
          {userName}さんの自分史作成を開始します
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

      <button
        onClick={() => {
          setStep(1);
          setUserName('');
          setUserAge('');
          setBirthDate('');
          setGender('');
          setAddress('');
          setOccupation('');
          setBio('');
        }}
        style={{
          ...styles.button,
          backgroundColor: '#3498db',
          color: 'white',
          width: '100%',
        }}
      >
        新規登録に戻る
      </button>
    </>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📖 自分史を作成する</h1>
      </div>

      {renderStepIndicator()}

      <div style={styles.card}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {step < 4 && (
          <div style={styles.buttonContainer}>
            {step > 1 && (
              <button
                onClick={handleBack}
                style={{
                  ...styles.button,
                  ...styles.backButton,
                }}
              >
                ← 戻る
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                ...styles.button,
                ...styles.nextButton,
                flex: step === 1 ? 1 : 1,
              }}
            >
              {step === 3 ? '登録する' : '次へ →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
