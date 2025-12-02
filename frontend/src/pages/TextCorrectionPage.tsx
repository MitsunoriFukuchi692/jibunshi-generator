import { useState, useEffect } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function TextCorrectionPage({
    userId,
    token,
    conversation,
    onComplete
}: {
    userId: number;
    token: string | null;
    conversation: Message[];
    onComplete: () => void;
}) {
    const [correctedText, setCorrectedText] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stage, setStage] = useState('correction'); // 'correction' または 'completion'
    const [editedText, setEditedText] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        correctText();
    }, []);

    const correctText = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            if (!apiUrl) throw new Error('API URLが設定されていません');

            // 会話からユーザーの回答のみを抽出
            const responses = conversation
                .filter(msg => msg.role === 'user')
                .map(msg => msg.content);

            console.log('📝 Sending correction request...');

            const response = await fetch(`${apiUrl}/api/ai/edit-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    responses,
                    stage: 'interview',
                    user_id: userId
                }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('❌ API Error:', errorData);
                throw new Error(`修正に失敗しました (${response.status})`);
            }

            const data = await response.json();
            console.log('✅ Corrected text received:', data);

            setCorrectedText(data.edited_content);
            setEditedText(data.edited_content);
            setError(null);
        } catch (error) {
            console.error('❌ Correction error:', error);
            const errorMessage = error instanceof Error ? error.message : '修正処理に失敗しました';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCompletion = async () => {
        setIsSaving(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            if (!apiUrl) throw new Error('API URLが設定されていません');

            // タイムラインに保存
            const response = await fetch(`${apiUrl}/api/timeline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    stage: 'interview',
                    event_title: 'インタビュー完了',
                    event_description: 'AI自動修正済み',
                    edited_content: editedText,
                }),
            });

            if (!response.ok) {
                throw new Error(`保存に失敗しました (${response.status})`);
            }

            alert('完了しました！');
            onComplete();
        } catch (error) {
            console.error('❌ Save error:', error);
            alert('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    const styles = {
        container: {
            maxWidth: '900px',
            margin: '0 auto',
            padding: '20px',
            boxSizing: 'border-box' as const,
        },
        header: {
            textAlign: 'center' as const,
            marginBottom: '30px',
        },
        title: {
            fontSize: 'clamp(20px, 5vw, 28px)',
            fontWeight: 'bold' as const,
            color: '#2c3e50',
            marginBottom: '10px',
        },
        subtitle: {
            fontSize: '14px',
            color: '#7f8c8d',
            marginBottom: '20px',
        },
        errorBox: {
            backgroundColor: '#fdeaea',
            color: '#c53030',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            borderLeft: '4px solid #c53030',
        },
        card: {
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px',
            boxSizing: 'border-box' as const,
        },
        loadingBox: {
            textAlign: 'center' as const,
            padding: '40px',
            color: '#7f8c8d',
        },
        spinner: {
            display: 'inline-block',
            width: '30px',
            height: '30px',
            border: '3px solid #ecf0f1',
            borderTop: '3px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '10px',
        },
        textContent: {
            backgroundColor: '#f8f9fa',
            padding: '25px',
            borderRadius: '8px',
            lineHeight: '1.8',
            color: '#2c3e50',
            fontSize: '15px',
            marginBottom: '20px',
            whiteSpace: 'pre-wrap' as const,
            wordBreak: 'break-word' as const,
        },
        editableTextarea: {
            width: '100%',
            minHeight: '200px',
            padding: '15px',
            fontSize: '15px',
            fontFamily: 'serif',
            lineHeight: '1.8',
            border: '2px solid #3498db',
            borderRadius: '8px',
            color: '#2c3e50',
            marginBottom: '20px',
            boxSizing: 'border-box' as const,
        },
        buttonContainer: {
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap' as const,
        },
        button: {
            padding: '12px 24px',
            fontSize: '14px',
            borderRadius: '4px',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.3s ease',
            minHeight: '44px',
        },
        completeButton: {
            backgroundColor: '#27ae60',
            color: 'white',
        },
        editButton: {
            backgroundColor: '#3498db',
            color: 'white',
        },
        goBackButton: {
            backgroundColor: '#95a5a6',
            color: 'white',
        },
    };

    return (
        <div style={styles.container}>
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

            <div style={styles.header}>
                {stage === 'correction' ? (
                    <>
                        <h1 style={styles.title}>✨ AI自動文章修正</h1>
                        <p style={styles.subtitle}>あなたの回答をAIが自動修正しています...</p>
                    </>
                ) : (
                    <>
                        <h1 style={styles.title}>📝 修正内容の確認・編集</h1>
                        <p style={styles.subtitle}>修正内容を確認し、必要に応じて編集できます</p>
                    </>
                )}
            </div>

            {error && (
                <div style={styles.errorBox}>
                    <strong>エラー:</strong> {error}
                </div>
            )}

            <div style={styles.card}>
                {loading ? (
                    <div style={styles.loadingBox}>
                        <div style={styles.spinner}></div>
                        <p>修正中です。お待ちください...</p>
                    </div>
                ) : stage === 'correction' ? (
                    // 修正確認画面
                    <>
                        <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '18px' }}>
                            📖 修正版テキスト
                        </h2>
                        <div style={styles.textContent}>
                            {correctedText}
                        </div>

                        <div style={styles.buttonContainer}>
                            <button
                                onClick={() => setStage('completion')}
                                style={{
                                    ...styles.button,
                                    ...styles.completeButton,
                                }}
                            >
                                確認・編集へ →
                            </button>
                            <button
                                onClick={correctText}
                                style={{
                                    ...styles.button,
                                    ...styles.editButton,
                                }}
                            >
                                もう一度修正する
                            </button>
                        </div>
                    </>
                ) : (
                    // 完了画面（編集可能）
                    <>
                        <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '18px' }}>
                            ✏️ テキストを編集
                        </h2>
                        <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            style={styles.editableTextarea}
                            placeholder="必要に応じてテキストを編集してください..."
                        />

                        <div style={styles.buttonContainer}>
                            <button
                                onClick={handleSaveCompletion}
                                disabled={isSaving}
                                style={{
                                    ...styles.button,
                                    ...styles.completeButton,
                                    opacity: isSaving ? 0.6 : 1,
                                }}
                            >
                                {isSaving ? '保存中...' : '保存して完了 ✓'}
                            </button>
                            <button
                                onClick={() => setStage('correction')}
                                style={{
                                    ...styles.button,
                                    ...styles.goBackButton,
                                }}
                            >
                                ← 戻る
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
