import { useState } from 'react';
import { API_URL } from '../config';

interface TurningPoint {
  id?: number;
  age: string;
  year: string;
  month: string;
  turning_point: string;
  event_title: string;
  event_description: string;
}

export default function TurningPointPage({ userId, token, birthDate, onComplete }: { userId: number; token: string | null; birthDate: string; onComplete: () => void }) {
  const [turningPoints, setTurningPoints] = useState<TurningPoint[]>([
    { age: '', year: '', month: '', turning_point: '', event_title: '', event_description: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [listeningIndex, setListeningIndex] = useState<{ field: string, index: number } | null>(null);

  const handleInputChange = (index: number, field: keyof TurningPoint, value: string) => {
    const updated = [...turningPoints];
    updated[index] = { ...updated[index], [field]: value };

    // 年齢が変更された場合、年を自動計算
    if (field === 'age' && value) {
      const age = parseInt(value);
      if (!isNaN(age) && age > 0 && birthDate) {
        const birthYear = parseInt(birthDate.substring(0, 4));
        const calculatedYear = birthYear + age;
        updated[index].year = calculatedYear.toString();
      }
    }

    setTurningPoints(updated);
  };

  const startVoiceInput = (index: number, field: 'turning_point' | 'event_title' | 'event_description') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('お使いのブラウザはマイク入力に対応していません');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    
    // ✅ 修正: 複数の音声を継続的に認識
    recognition.continuous = true;
    recognition.interimResults = true;

    setListeningIndex({ field, index });

    recognition.onstart = () => {
      console.log('🎤 マイク開始...');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      
      // ✅ 修正: 確定した結果のみを処理
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }

      if (transcript) {
        console.log('📝 Transcript:', transcript);
        
        const updated = [...turningPoints];
        // ✅ 修正: += で前のテキストを保持
        if (field === 'turning_point') {
          updated[index].turning_point = (updated[index].turning_point || '') + '\n' + transcript;
        } else if (field === 'event_title') {
          updated[index].event_title = (updated[index].event_title || '') + '\n' + transcript;
        } else {
          updated[index].event_description = (updated[index].event_description || '') + '\n' + transcript;
        }
        setTurningPoints(updated);
      }
      setListeningIndex(null);
    };

    recognition.onerror = (event: any) => {
      console.error('❌ マイク認識エラー:', event.error);
      setListeningIndex(null);
      if (event.error !== 'no-speech') {
        alert(`マイク認識エラー: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('✅ マイク終了');
      setListeningIndex(null);
    };

    recognition.start();
  };


  const addTurningPoint = () => {
    setTurningPoints([
      ...turningPoints,
      { age: '', year: '', month: '', turning_point: '', event_title: '', event_description: '' },
    ]);
  };

  const removeTurningPoint = (index: number) => {
    setTurningPoints(turningPoints.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (turningPoints.some((tp) => !tp.event_title || !tp.event_description)) {
      alert('全てのターニングポイントを入力してください');
      return;
    }

    setSaving(true);
    try {
      for (const tp of turningPoints) {
        const response = await fetch(`${API_URL}/api/timeline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            user_id: userId,
            age: tp.age ? parseInt(tp.age) : null,
            year: tp.year ? parseInt(tp.year) : null,
            month: tp.month ? parseInt(tp.month) : null,
            turning_point: tp.turning_point || null,
            stage: 'turning_points',
            event_title: tp.event_title,
            event_description: tp.event_description,
          }),
        });

        if (!response.ok) {
          throw new Error('保存に失敗しました');
        }
      }

      alert('ターニングポイントが保存されました！');
      onComplete();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '30px',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '10px',
    },
    info: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      fontSize: '15px',
      color: '#2c3e50',
      marginBottom: '20px',
      lineHeight: '1.6',
    },
    card: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
    },
    pointCard: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #ddd',
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
      border: '2px solid #bdc3c7',
      borderRadius: '8px',
      boxSizing: 'border-box' as const,
      marginBottom: '15px',
      minHeight: '40px',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      fontSize: '16px',
      border: '2px solid #bdc3c7',
      borderRadius: '8px',
      fontFamily: 'inherit',
      boxSizing: 'border-box' as const,
      resize: 'vertical' as const,
      marginBottom: '15px',
      minHeight: '100px',
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '12px',
      marginBottom: '15px',
    },
    inputWithButton: {
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      marginBottom: '15px',
    },
    button: {
      padding: '12px 16px',
      fontSize: '16px',
      borderRadius: '8px',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s ease',
      fontWeight: '600',
      minHeight: '44px',
    },
    voiceButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '12px 16px',
      fontSize: '14px',
      whiteSpace: 'nowrap' as const,
      minWidth: '100px',
      minHeight: '44px',
    },
    voiceButtonListening: {
      backgroundColor: '#c0392b',
      animation: 'pulse 1s infinite',
    },
    addButton: {
      backgroundColor: '#3498db',
      color: 'white',
      marginBottom: '20px',
      width: '100%',
      minHeight: '48px',
    },
    removeButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '12px 16px',
      fontSize: '14px',
      width: '100%',
      marginTop: '15px',
      minHeight: '44px',
    },
    saveButton: {
      width: '100%',
      padding: '16px',
      backgroundColor: '#27ae60',
      color: 'white',
      fontSize: '16px',
      minHeight: '48px',
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div style={styles.header}>
        <h1 style={styles.title}>✍️ 人生の転機</h1>
      </div>

      <div style={styles.info}>
        あなたの人生において大きな転機となった出来事を入力してください。複数のターニングポイントを追加できます。🎤 のボタンでマイク入力できます。
      </div>

      <div style={styles.card}>
        {turningPoints.map((tp, index) => (
          <div key={index} style={styles.pointCard}>
            <h3 style={{ marginTop: 0, color: '#2c3e50', fontSize: '18px' }}>転機 {index + 1}</h3>

            <div style={styles.row}>
              <div>
                <label style={styles.label}>年齢</label>
                <input
                  type="number"
                  placeholder="例：30"
                  value={tp.age}
                  onChange={(e) => handleInputChange(index, 'age', e.target.value)}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>年（自動計算）</label>
                <input
                  type="number"
                  placeholder="自動計算されます"
                  value={tp.year}
                  disabled
                  style={{ ...styles.input, backgroundColor: '#ecf0f1', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label style={styles.label}>月</label>
                <select
                  value={tp.month}
                  onChange={(e) => handleInputChange(index, 'month', e.target.value)}
                  style={styles.input}
                >
                  <option value="">選択してください</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}月
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label style={styles.label}>転機のタイトル</label>
            <div style={styles.inputWithButton}>
              <input
                type="text"
                placeholder="例：結婚、転職、起業など"
                value={tp.turning_point}
                onChange={(e) => handleInputChange(index, 'turning_point', e.target.value)}
                style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={() => startVoiceInput(index, 'turning_point')}
                style={{
                  ...styles.button,
                  ...styles.voiceButton,
                  ...(listeningIndex?.field === 'turning_point' && listeningIndex?.index === index ? styles.voiceButtonListening : {})
                }}
              >
                🎤 {listeningIndex?.field === 'turning_point' && listeningIndex?.index === index ? '聴取中...' : 'マイク'}
              </button>
            </div>

            <label style={styles.label}>イベント名 *</label>
            <div style={styles.inputWithButton}>
              <input
                type="text"
                placeholder="例：結婚、転職、起業など"
                value={tp.event_title}
                onChange={(e) => handleInputChange(index, 'event_title', e.target.value)}
                style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={() => startVoiceInput(index, 'event_title')}
                style={{
                  ...styles.button,
                  ...styles.voiceButton,
                  ...(listeningIndex?.field === 'event_title' && listeningIndex?.index === index ? styles.voiceButtonListening : {})
                }}
              >
                🎤 {listeningIndex?.field === 'event_title' && listeningIndex?.index === index ? '聴取中...' : 'マイク'}
              </button>
            </div>

            <label style={styles.label}>説明 *</label>
            <div style={styles.inputWithButton}>
              <textarea
                placeholder="この転機について詳しく説明してください（最大500文字）"
                value={tp.event_description}
                onChange={(e) =>
                  handleInputChange(index, 'event_description', e.target.value.slice(0, 500))
                }
                style={{ ...styles.textarea, marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={() => startVoiceInput(index, 'event_description')}
                style={{
                  ...styles.button,
                  ...styles.voiceButton,
                  ...(listeningIndex?.field === 'event_description' && listeningIndex?.index === index ? styles.voiceButtonListening : {})
                }}
              >
                🎤 {listeningIndex?.field === 'event_description' && listeningIndex?.index === index ? '聴取中...' : 'マイク'}
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '15px' }}>
              {tp.event_description.length}/500文字
            </div>

            {turningPoints.length > 1 && (
              <button
                onClick={() => removeTurningPoint(index)}
                style={{ ...styles.button, ...styles.removeButton }}
              >
                この転機を削除
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addTurningPoint}
          style={{ ...styles.button, ...styles.addButton }}
        >
          + 転機を追加
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.button,
            ...styles.saveButton,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '保存中...' : '保存して次へ'}
        </button>
      </div>
    </div>
  );
}
