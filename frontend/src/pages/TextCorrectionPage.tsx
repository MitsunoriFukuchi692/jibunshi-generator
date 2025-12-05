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

            console.log('💾 タイムラインにテキストを保存中...');

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
                    event_description: editedText,
                    edited_content: editedText,
                }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('❌ Save error:', errorData);
                throw new Error(`保存に失敗しました (${response.status})`);
            }

            const savedData = await response.json();
            console.log('✅ Timeline saved:', savedData);

            // ✨ PDF 生成処理
            console.log('📄 PDF を生成中...');
            const pdfResponse = await fetch(`${apiUrl}/pdf/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: userId
                }),
            });

            if (!pdfResponse.ok) {
                const pdfErrorData = await pdfResponse.text();
                console.error('⚠️ PDF生成に失敗:', pdfErrorData);
                console.warn('⚠️ PDF生成に失敗しましたが、テキストは保存されました');
                // PDF生成が失敗してもテキスト保存は成功しているので続行
            } else {
                const pdfData = await pdfResponse.json();
                console.log('✅ PDF生成成功:', pdfData);

                // PDF をダウンロード
                if (pdfData.downloadUrl) {
                    console.log('📥 PDFをダウンロード中...');
                    const downloadLink = document.createElement('a');
                    downloadLink.href = `${apiUrl}${pdfData.downloadUrl}`;
                    downloadLink.download = pdfData.filename || 'jibunshi.pdf';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                    console.log('✅ PDFダウンロード完了');
                }
            }

            // 完了処理
            alert('✅ テキストを保存しました！');
            onComplete();

        } catch (error) {
            console.error('❌ Save error:', error);
            const errorMessage = error instanceof Error ? error.message : '保存に失敗しました';
            alert(`エラー: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const styles = {
        container: {
            maxWidth: '1000px',
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
        uploadErrorBox: {
            backgroundColor: '#fdeaea',
            color: '#c53030',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            borderLeft: '4px solid #c53030',
        },
        loadingBox: {
            textAlign: 'center' as const,
            padding: '40px',
            color: '#7f8c8d',
        },
        contentBox: {
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '30px',
            marginBottom: '20px',
        },
        textPreview: {
            fontSize: '14px',
            lineHeight: '1.8',
            color: '#2c3e50',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            marginBottom: '20px',
            borderLeft: '4px solid #3498db',
            whiteSpace: 'pre-wrap' as const,
            wordWrap: 'break-word' as const,
        },
        editableTextarea: {
            width: '100%',
            minHeight: '300px',
            padding: '15px',
            fontSize: '14px',
            fontFamily: 'serif',
            lineHeight: '1.8',
            border: '1px solid #bdc3c7',
            borderRadius: '4px',
            boxSizing: 'border-box' as const,
            marginBottom: '20px',
        },
        photosSection: {
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            borderLeft: '4px solid #27ae60',
        },
        photosSectionTitle: {
            fontSize: '16px',
            fontWeight: 'bold' as const,
            color: '#2c3e50',
            marginBottom: '15px',
        },
        photosContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '15px',
        },
        photoCard: {
            position: 'relative' as const,
            backgroundColor: 'white',
            borderRadius: '4px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
        photoImage: {
            width: '100%',
            height: '150px',
            objectFit: 'cover' as const,
            display: 'block',
        },
        photoLabel: {
            fontSize: '12px',
            color: '#7f8c8d',
            padding: '8px',
            backgroundColor: '#ecf0f1',
            textAlign: 'center' as const,
            whiteSpace: 'nowrap' as const,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        removeButton: {
            position: 'absolute' as const,
            top: '5px',
            right: '5px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.3s ease',
        },
        answerWithPhotoBlock: {
            backgroundColor: 'white',
            padding: '15px',
            marginBottom: '15px',
            borderRadius: '4px',
            borderLeft: '4px solid #3498db',
        },
        answerText: {
            fontSize: '13px',
            color: '#2c3e50',
            lineHeight: '1.6',
            marginBottom: '10px',
            whiteSpace: 'pre-wrap' as const,
            wordWrap: 'break-word' as const,
        },
        buttonContainer: {
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap' as const,
        },
        button: {
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold' as const,
            borderRadius: '4px',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.3s ease',
            minHeight: '44px',
            minWidth: '120px',
        },
        completeButton: {
            backgroundColor: '#27ae60',
            color: 'white',
        },
        completeButtonHover: {
            backgroundColor: '#229954',
        },
        uploadButton: {
            backgroundColor: '#3498db',
            color: 'white',
        },
        uploadButtonHover: {
            backgroundColor: '#2980b9',
        },
        goBackButton: {
            backgroundColor: '#95a5a6',
            color: 'white',
        },
        goBackButtonHover: {
            backgroundColor: '#7f8c8d',
        },
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>
                    <p>テキストを修正中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorBox}>
                    <strong>エラー:</strong> {error}
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    {stage === 'correction' ? '📝 テキスト確認' : '✏️ テキスト編集'}
                </h1>
                <p style={styles.subtitle}>
                    {stage === 'correction'
                        ? 'AIが修正したテキストを確認し、必要に応じて編集してください'
                        : '最終的なテキストを編集し、保存してください'
                    }
                </p>
            </div>

            {uploadError && (
                <div style={styles.uploadErrorBox}>
                    <strong>アップロードエラー:</strong> {uploadError}
                </div>
            )}

            <div style={styles.contentBox}>
                {stage === 'correction' ? (
                    // 確認・アップロード画面
                    <>
                        <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '18px' }}>
                            🔍 修正されたテキスト
                        </h2>
                        <div style={styles.textPreview}>
                            {correctedText || 'テキストはまだ読み込まれていません'}
                        </div>

                        {/* インタビュー時の回答と写真表示 */}
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
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
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
