import { useState } from 'react';

interface TurningPoint {
  id?: number;
  age: string;
  year: string;
  event_title: string;
  event_description: string;
}

export default function TurningPointPage({ userId, birthDate, onComplete }: { userId: number; birthDate: string; onComplete: () => void }) {
  const [turningPoints, setTurningPoints] = useState<TurningPoint[]>([
    { age: '', year: '', event_title: '', event_description: '' },
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
        const birthYear = parseInt(birthDate.substring(0, 4)); // "1952-05-10" → 1952
        const calculatedYear = birthYear + age;
        updated[index].year = calculatedYear.toString();
      }
    }

    setTurningPoints(updated);
  };

  const startVoiceInput = (index: number, field: 'event_title' | 'event_description') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('お使いのブラウザは音声入力に対応していません');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';

    setListeningIndex({ field, index });

    recognition.onstart = () => {
      console.log('音声認識開始...');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      const updated = [...turningPoints];
      if (field === 'event_title') {
        updated[index].event_title += transcript;
      } else {
        updated[index].event_description += transcript;
      }
      setTurningPoints(updated);
      setListeningIndex(null);
    };

    recognition.onerror = () => {
      setListeningIndex(null);
      alert('音声認識エラーが発生しました');
    };

    recognition.start();
  };

  const addTurningPoint = () => {
    setTurningPoints([
      ...turningPoints,
      { age: '', year: '', event_title: '', event_description: '' },
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/timeline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            age: tp.age ? parseInt(tp.age) : null,
            year: tp.year ? parseInt(tp.year) : null,
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
      onComplete(); // 次のステップへ進む
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
    info: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      fontSize: '14px',
      color: '#2c3e50',
      marginBottom: '20px',
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
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '15px',
      border: '1px solid #ddd',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#2c3e50',
    },
    input: {
      width: '100%',
      padding: '10px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box' as const,
      marginBottom: '12px',
    },
    textarea: {
      width: '100%',
      padding: '10px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      boxSizing: 'border-box' as const,
      resize: 'vertical' as const,
      marginBottom: '12px',
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      marginBottom: '12px',
    },
    inputWithButton: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      marginBottom: '12px',
    },
    button: {
      padding: '10px 15px',
      fontSize: '14px',
      borderRadius: '4px',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s ease',
    },
    voiceButton: {
      backgroundColor: '#3498db',
      color: 'white',
      padding: '10px 12px',
      fontSize: '12px',
      whiteSpace: 'nowrap' as const,
      minWidth: '80px',
    },
    voiceButtonListening: {
      backgroundColor: '#e74c3c',
      animation: 'pulse 1s infinite',
    },
    addButton: {
      backgroundColor: '#3498db',
      color: 'white',
      marginBottom: '20px',
      width: '100%',
    },
    removeButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '8px 12px',
      fontSize: '12px',
      width: '100%',
      marginTop: '10px',
    },
    saveButton: {
      width: '100%',
      padding: '15px',
      backgroundColor: '#27ae60',
      color: 'white',
      fontSize: '16px',
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
        <h1 style={styles.title}>✍️ 人生のターニングポイント</h1>
      </div>

      <div style={styles.info}>
        あなたの人生において大きな転機となった出来事を入力してください。複数のターニングポイントを追加できます。🎤 のボタンで音声入力できます。
      </div>

      <div style={styles.card}>
        {turningPoints.map((tp, index) => (
          <div key={index} style={styles.pointCard}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>ターニングポイント {index + 1}</h3>

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
                🎤 {listeningIndex?.field === 'event_title' && listeningIndex?.index === index ? '聞取中...' : '音声入力'}
              </button>
            </div>

            <label style={styles.label}>説明 *</label>
            <div style={styles.inputWithButton}>
              <textarea
                placeholder="このターニングポイントについて詳しく説明してください（最大500文字）"
                value={tp.event_description}
                onChange={(e) =>
                  handleInputChange(index, 'event_description', e.target.value.slice(0, 500))
                }
                style={{ ...styles.textarea, height: '100px', marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={() => startVoiceInput(index, 'event_description')}
                style={{
                  ...styles.button,
                  ...styles.voiceButton,
                  ...(listeningIndex?.field === 'event_description' && listeningIndex?.index === index ? styles.voiceButtonListening : {})
                }}
              >
                🎤 {listeningIndex?.field === 'event_description' && listeningIndex?.index === index ? '聞取中...' : '音声入力'}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
              {tp.event_description.length}/500文字
            </div>

            {turningPoints.length > 1 && (
              <button
                onClick={() => removeTurningPoint(index)}
                style={{ ...styles.button, ...styles.removeButton }}
              >
                このターニングポイントを削除
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addTurningPoint}
          style={{ ...styles.button, ...styles.addButton }}
        >
          + ターニングポイントを追加
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
