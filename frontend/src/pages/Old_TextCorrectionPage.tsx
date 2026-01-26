import { useState, useEffect } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function TextCorrectionPage({
    userId,
    token,
    conversation,
    answersWithPhotos,
    onComplete
}: {
    userId: number;
    token: string | null;
    conversation: Message[];
    answersWithPhotos: any[];
    onComplete: (editedContent: string) => void;
}) {
    const [correctedText, setCorrectedText] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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
            setError(null);
        } catch (error) {
            console.error('❌ Correction error:', error);
            const errorMessage = error instanceof Error ? error.message : '修正処理に失敗しました';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // ✅ 修正：修正テキストを biography に保存
    const handleComplete = async () => {
        try {
            setSaving(true);
            const apiUrl = import.meta.env.VITE_API_URL;
            if (!apiUrl) throw new Error('API URLが設定されていません');

            console.log('💾 修正テキストを biography に保存中...');

            // biography に修正テキストを保存
            const biographyResponse = await fetch(`${apiUrl}/api/biography`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    edited_content: correctedText,
                    ai_summary: correctedText
                })
            });

            if (!biographyResponse.ok) {
                const errorData = await biographyResponse.json();
                throw new Error(`biography 保存に失敗しました: ${errorData.error}`);
            }

            const biographyData = await biographyResponse.json();
            console.log('✅ Biography 保存完了 - ID:', biographyData.data?.id);

            // AIGenerationPage へ遷移（修正テキストを渡す）
            console.log('✅ TextCorrectionPage 完了 - AIGenerationPage へ遷移');
            onComplete(correctedText);
        } catch (error) {
            console.error('❌ biography 保存エラー:', error);
            const errorMessage = error instanceof Error ? error.message : 'biography 保存に失敗しました';
            setError(errorMessage);
        } finally {
            setSaving(false);
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
                <h1 style={styles.title}>✨ AI自動文章修正</h1>
                <p style={styles.subtitle}>あなたの回答をAIが自動修正しています...</p>
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
                ) : (
                    <>
                        <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '18px' }}>
                            📖 修正版テキスト
                        </h2>
                        <div style={styles.textContent}>
                            {correctedText}
                        </div>

                        <div style={styles.buttonContainer}>
                            <button
                                onClick={handleComplete}
                                disabled={saving}
                                style={{
                                    ...styles.button,
                                    ...styles.completeButton,
                                    opacity: saving ? 0.6 : 1,
                                }}
                            >
                                {saving ? '保存中...' : '完了 ✓'}
                            </button>
                            <button
                                onClick={correctText}
                                disabled={saving}
                                style={{
                                    ...styles.button,
                                    ...styles.editButton,
                                    opacity: saving ? 0.6 : 1,
                                }}
                            >
                                もう一度修正する
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
