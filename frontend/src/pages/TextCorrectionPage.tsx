import { useState, useEffect } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface SelectedPhoto {
    id: number;
    file_path: string;
    description: string;
}

interface AnswerWithPhotos {
    text: string;
    photos: SelectedPhoto[];
}

interface UploadedPhoto {
    id: number;
    file_path: string;
    filename: string;
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
    answersWithPhotos?: AnswerWithPhotos[];
    onComplete: () => void;
}) {
    const [correctedText, setCorrectedText] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stage, setStage] = useState('correction'); // 'correction' または 'completion'
    const [editedText, setEditedText] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

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

            console.log('🔍 Sending correction request...');

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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            if (!apiUrl) throw new Error('API URLが設定されていません');

            // 各ファイルをアップロード
            const newPhotos: UploadedPhoto[] = [];

            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('userId', userId.toString());
                formData.append('stage', 'interview');
                formData.append('description', file.name);

                console.log('📤 Uploading file:', file.name);

                const response = await fetch(`${apiUrl}/api/photos`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    console.error('❌ Upload error:', errorData);
                    throw new Error(`写真アップロードに失敗しました: ${file.name}`);
                }

                const photoData = await response.json();
                console.log('✅ Photo uploaded:', photoData);

                newPhotos.push({
                    id: photoData.id,
                    file_path: photoData.file_path,
                    filename: photoData.filename,
                });
            }

            setUploadedPhotos([...uploadedPhotos, ...newPhotos]);
            console.log('✅ All photos uploaded successfully');

            // ファイル入力をリセット
            e.target.value = '';
        } catch (err) {
            console.error('❌ Upload error:', err);
            const errorMessage = err instanceof Error ? err.message : '写真のアップロードに失敗しました';
            setUploadError(errorMessage);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemovePhoto = (photoId: number) => {
        setUploadedPhotos(uploadedPhotos.filter(photo => photo.id !== photoId));
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
                    // 写真データも一緒に保存
                    answersWithPhotos: answersWithPhotos || [],
                    uploadedPhotos: uploadedPhotos,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Save error:', errorText);
                throw new Error(`保存に失敗しました (${response.status})`);
            }

            alert('完了しました！');
            onComplete();
        } catch (error) {
            console.error('❌ Save error:', error);
            alert('保存に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
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
        successBox: {
            backgroundColor: '#c6f6d5',
            color: '#22543d',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            borderLeft: '4px solid #22543d',
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
            boxSizing: 'border-box' as const,
            marginBottom: '20px',
        },
        photosSection: {
            marginTop: '30px',
            padding: '20px',
            backgroundColor: '#f0f4f8',
            borderRadius: '8px',
        },
        photosSectionTitle: {
            color: '#2c3e50',
            fontSize: '16px',
            fontWeight: 'bold' as const,
            marginBottom: '15px',
        },
        answerWithPhotoBlock: {
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '6px',
            borderLeft: '4px solid #3498db',
        },
        answerText: {
            fontSize: '14px',
            color: '#555',
            marginBottom: '10px',
            lineHeight: '1.6',
        },
        photosContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '15px',
            marginTop: '10px',
        },
        photoCard: {
            border: '1px solid #ddd',
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: 'white',
            position: 'relative' as const,
        },
        photoImage: {
            width: '100%',
            height: '150px',
            objectFit: 'cover' as const,
            display: 'block',
        },
        photoLabel: {
            padding: '8px',
            fontSize: '12px',
            backgroundColor: '#f8f9fa',
            color: '#666',
            maxHeight: '60px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        removeButton: {
            position: 'absolute' as const,
            top: '5px',
            right: '5px',
            backgroundColor: 'rgba(255, 0, 0, 0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold' as const,
        },
        button: {
            padding: '12px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold' as const,
            marginRight: '10px',
            marginBottom: '10px',
        },
        buttonContainer: {
            display: 'flex',
            gap: '10px',
            marginTop: '20px',
            flexWrap: 'wrap' as const,
        },
        completeButton: {
            backgroundColor: '#27ae60',
            color: 'white',
        },
        uploadButton: {
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

            {uploadError && (
                <div style={styles.errorBox}>
                    <strong>アップロードエラー:</strong> {uploadError}
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

                        {/* 写真とコメント表示 */}
                        {answersWithPhotos && answersWithPhotos.length > 0 && (
                            <div style={styles.photosSection}>
                                <h3 style={styles.photosSectionTitle}>📷 インタビュー時の写真とコメント</h3>
                                {answersWithPhotos.map((answer, idx) => (
                                    <div key={idx} style={styles.answerWithPhotoBlock}>
                                        <h4 style={{ color: '#3498db', marginBottom: '10px', fontSize: '14px' }}>
                                            Q{idx + 1}の回答
                                        </h4>
                                        <div style={styles.answerText}>
                                            {answer.text}
                                        </div>

                                        {answer.photos && answer.photos.length > 0 && (
                                            <div>
                                                <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '10px' }}>
                                                    📎 関連写真 ({answer.photos.length}枚)
                                                </p>
                                                <div style={styles.photosContainer}>
                                                    {answer.photos.map((photo) => (
                                                        <div key={photo.id} style={styles.photoCard}>
                                                            <img
                                                                src={photo.file_path}
                                                                alt="interview-photo"
                                                                style={styles.photoImage}
                                                            />
                                                            <div style={styles.photoLabel}>
                                                                {photo.description}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* アップロード済み写真表示 */}
                        {uploadedPhotos.length > 0 && (
                            <div style={styles.photosSection}>
                                <h3 style={styles.photosSectionTitle}>📸 アップロード済み写真 ({uploadedPhotos.length}枚)</h3>
                                <div style={styles.photosContainer}>
                                    {uploadedPhotos.map((photo) => (
                                        <div key={photo.id} style={styles.photoCard}>
                                            <img
                                                src={photo.file_path}
                                                alt="uploaded-photo"
                                                style={styles.photoImage}
                                            />
                                            <button
                                                onClick={() => handleRemovePhoto(photo.id)}
                                                style={styles.removeButton}
                                                title="削除"
                                            >
                                                ✕
                                            </button>
                                            <div style={styles.photoLabel}>
                                                {photo.filename}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                            <label style={{
                                ...styles.button,
                                ...styles.uploadButton,
                                display: 'inline-block',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                opacity: isUploading ? 0.6 : 1,
                            }}>
                                {isUploading ? '📤 アップロード中...' : '📷 写真をアップロード'}
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    disabled={isUploading}
                                    style={{ display: 'none' }}
                                />
                            </label>
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

                        {/* 写真とコメント表示 */}
                        {answersWithPhotos && answersWithPhotos.length > 0 && (
                            <div style={styles.photosSection}>
                                <h3 style={styles.photosSectionTitle}>📷 インタビュー時の写真とコメント</h3>
                                {answersWithPhotos.map((answer, idx) => (
                                    <div key={idx} style={styles.answerWithPhotoBlock}>
                                        <h4 style={{ color: '#3498db', marginBottom: '10px', fontSize: '14px' }}>
                                            Q{idx + 1}の回答
                                        </h4>
                                        <div style={styles.answerText}>
                                            {answer.text}
                                        </div>

                                        {answer.photos && answer.photos.length > 0 && (
                                            <div>
                                                <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '10px' }}>
                                                    📎 関連写真 ({answer.photos.length}枚)
                                                </p>
                                                <div style={styles.photosContainer}>
                                                    {answer.photos.map((photo) => (
                                                        <div key={photo.id} style={styles.photoCard}>
                                                            <img
                                                                src={photo.file_path}
                                                                alt="interview-photo"
                                                                style={styles.photoImage}
                                                            />
                                                            <div style={styles.photoLabel}>
                                                                {photo.description}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* アップロード済み写真表示 */}
                        {uploadedPhotos.length > 0 && (
                            <div style={styles.photosSection}>
                                <h3 style={styles.photosSectionTitle}>📸 アップロード済み写真 ({uploadedPhotos.length}枚)</h3>
                                <div style={styles.photosContainer}>
                                    {uploadedPhotos.map((photo) => (
                                        <div key={photo.id} style={styles.photoCard}>
                                            <img
                                                src={photo.file_path}
                                                alt="uploaded-photo"
                                                style={styles.photoImage}
                                            />
                                            <div style={styles.photoLabel}>
                                                {photo.filename}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
