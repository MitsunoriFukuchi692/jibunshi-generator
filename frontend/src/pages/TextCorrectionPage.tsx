import { useState, useEffect } from 'react';
import { API_URL } from '../config';

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
    year?: string;
    month?: string;
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
    const [stage, setStage] = useState('correction');
    const [editedText, setEditedText] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [answersWithYearMonth, setAnswersWithYearMonth] = useState<AnswerWithPhotos[]>([]);

    useEffect(() => {
        if (answersWithPhotos) {
            setAnswersWithYearMonth(answersWithPhotos.map(answer => ({
                ...answer,
                year: answer.year || '',
                month: answer.month || ''
            })));
        }
        correctText();
    }, []);

    const correctText = async () => {
        try {
            const apiUrl = API_URL;
            if (!apiUrl) throw new Error('API URLが設定されていません');

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
            const apiUrl = API_URL;
            if (!apiUrl) throw new Error('API URLが設定されていません');

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

    const handleYearMonthChange = (index: number, field: 'year' | 'month', value: string) => {
        const updated = [...answersWithYearMonth];
        updated[index] = { ...updated[index], [field]: value };
        setAnswersWithYearMonth(updated);
    };

    const handleSaveCompletion = async () => {
        setIsSaving(true);

        console.log('🔐 Current Token:', token);
        console.log('📤 API URL:', API_URL);
        console.log('👤 User ID:', userId);
        console.log('📸 Uploaded Photos:', uploadedPhotos);
        console.log('📅 Answers with Year/Month:', answersWithYearMonth);

        try {
            const apiUrl = API_URL;
            if (!apiUrl) throw new Error('API URLが設定されていません');

            console.log('💾 タイムラインにテキストを保存中...');

            // ✅ C案実装：修正済みテキストを分割
            const editedLines = editedText.split('\n\n').filter(line => line.trim());
            
            const photosToSave = answersWithYearMonth ? [...answersWithYearMonth] : [];
            if (uploadedPhotos.length > 0) {
                photosToSave.push({
                    text: '',
                    photos: uploadedPhotos.map(photo => ({
                        id: photo.id,
                        file_path: photo.file_path,
                        description: photo.filename
                    })),
                    year: '',
                    month: ''
                });
            }

            for (let i = 0; i < photosToSave.length; i++) {
                const answer = photosToSave[i];
                
                // ✅ C案実装：修正済みテキストと元のテキストを両方保存
                const originalText = answer.text || '';
                const editedTextForThisAnswer = editedLines[i] || answer.text || '';
                
                const timelinePayload = {
                    user_id: userId,
                    event_title: `インタビュー Q${i + 1}`,
                    event_description: originalText,          // ✅ 元の回答を保存
                    edited_content: editedTextForThisAnswer,  // ✅ 修正済みテキストを保存
                    year: answer.year ? parseInt(answer.year) : null,
                    month: answer.month ? parseInt(answer.month) : null,
                    stage: 'interview',
                    is_auto_generated: 1
                };

                console.log(`📝 Saving answer ${i + 1}:`, {
                    ...timelinePayload,
                    event_description: timelinePayload.event_description.substring(0, 50) + '...',
                    edited_content: timelinePayload.edited_content.substring(0, 50) + '...'
                });

                const timelineResponse = await fetch(`${apiUrl}/api/timeline`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(timelinePayload)
                });

                if (!timelineResponse.ok) {
                    const errorText = await timelineResponse.text();
                    console.error(`❌ Timeline save error for answer ${i + 1}:`, errorText);
                    throw new Error(`回答 ${i + 1} の保存に失敗しました`);
                }

                const timelineData = await timelineResponse.json();
                const timelineId = timelineData.data?.id || timelineData.id;
                console.log(`✅ Timeline saved - id: ${timelineId}`);

                if (answer.photos && answer.photos.length > 0) {
                    console.log(`📸 Linking ${answer.photos.length} photos to timeline ${timelineId}`);

                    const photoData = answer.photos.map((photo, photoIdx) => ({
                        file_path: photo.file_path,
                        description: photo.description || `Photo ${photoIdx + 1}`,
                        display_order: photoIdx
                    }));

                    const photoResponse = await fetch(`${apiUrl}/api/timeline/${timelineId}/photos`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ photoData })
                    });

                    if (!photoResponse.ok) {
                        const errorText = await photoResponse.text();
                        console.error(`❌ Photo link error:`, errorText);
                        throw new Error(`写真の紐付けに失敗しました`);
                    }

                    console.log(`✅ Photos linked successfully`);
                }
            }

            console.log('✅ 全ての回答と写真が保存されました！');
            onComplete();

        } catch (err) {
            console.error('❌ Save error:', err);
            const errorMessage = err instanceof Error ? err.message : '保存処理に失敗しました';
            alert(`エラー: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const styles: { [key: string]: React.CSSProperties } = {
        container: {
            maxWidth: '900px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        card: {
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
        header: {
            textAlign: 'center' as const,
            marginBottom: '30px',
        },
        title: {
            fontSize: '24px',
            color: '#2c3e50',
            marginBottom: '10px',
        },
        answerText: {
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '6px',
            padding: '12px',
            color: '#2c3e50',
            fontSize: '14px',
            lineHeight: '1.6',
        },
        photosSection: {
            backgroundColor: '#f0f8ff',
            border: '1px solid #b3d9ff',
            borderRadius: '6px',
            padding: '15px',
            marginBottom: '20px',
        },
        photosSectionTitle: {
            color: '#2c3e50',
            marginBottom: '12px',
            fontSize: '16px',
        },
        photosContainer: {
            display: 'grid' as const,
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '12px',
            marginBottom: '15px',
        },
        photoCard: {
            position: 'relative' as const,
            overflow: 'hidden',
            borderRadius: '6px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
        },
        photoImage: {
            width: '100%',
            height: '120px',
            objectFit: 'cover' as const,
        },
        removeButton: {
            position: 'absolute' as const,
            top: '4px',
            right: '4px',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            fontSize: '16px',
        },
        photoLabel: {
            fontSize: '11px',
            padding: '6px',
            backgroundColor: '#f0f0f0',
            color: '#666',
            overflow: 'hidden' as const,
            textOverflow: 'ellipsis' as const,
            whiteSpace: 'nowrap' as const,
        },
        yearMonthSection: {
            backgroundColor: '#fffacd',
            border: '1px solid #f0e68c',
            borderRadius: '6px',
            padding: '15px',
            marginBottom: '20px',
        },
        yearMonthGrid: {
            display: 'grid' as const,
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: '15px',
        },
        yearMonthInputGroup: {
            display: 'flex' as const,
            alignItems: 'center' as const,
            gap: '8px',
        },
        yearInput: {
            flex: 1,
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
        },
        monthSelect: {
            flex: 1,
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
        },
        buttonContainer: {
            display: 'flex' as const,
            gap: '12px',
            justifyContent: 'center' as const,
            marginTop: '25px',
        },
        button: {
            padding: '10px 20px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer' as const,
            fontWeight: 'bold' as const,
            transition: 'all 0.3s ease',
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
        loadingSpinner: {
            textAlign: 'center' as const,
            padding: '30px',
            color: '#7f8c8d',
        },
        errorMessage: {
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '15px',
            borderRadius: '6px',
            marginBottom: '20px',
        },
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.loadingSpinner}>
                        <p>修正中...</p>
                        <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                            AIがあなたの回答を修正・整形しています
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>✏️ 自動伝記の修正と確認</h1>
                </div>

                {error && (
                    <div style={styles.errorMessage}>
                        <strong>エラー:</strong> {error}
                    </div>
                )}

                {stage === 'correction' ? (
                    <>
                        <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '18px' }}>
                            📝 修正されたテキスト
                        </h2>
                        <div style={{
                            ...styles.answerText,
                            padding: '15px',
                            minHeight: '150px',
                            whiteSpace: 'pre-wrap' as const,
                        }}>
                            {editedText}
                        </div>

                        {answersWithYearMonth && answersWithYearMonth.length > 0 && (
                            <div style={styles.yearMonthSection}>
                                <h3 style={styles.photosSectionTitle}>📅 各回答の年月を設定</h3>
                                <div style={styles.yearMonthGrid}>
                                    {answersWithYearMonth.map((answer, idx) => (
                                        <div key={idx} style={styles.yearMonthInputGroup}>
                                            <label style={{ fontSize: '12px', color: '#2c3e50', minWidth: '35px' }}>
                                                Q{idx + 1}
                                            </label>
                                            <input
                                                type="number"
                                                min="1900"
                                                max={new Date().getFullYear()}
                                                placeholder="年"
                                                value={answer.year || ''}
                                                onChange={(e) => handleYearMonthChange(idx, 'year', e.target.value)}
                                                style={styles.yearInput}
                                            />
                                            <select
                                                value={answer.month || ''}
                                                onChange={(e) => handleYearMonthChange(idx, 'month', e.target.value)}
                                                style={styles.monthSelect}
                                            >
                                                <option value="">月</option>
                                                {Array.from({ length: 12 }, (_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                                    💡 年のみ、月のみ、または両方入力できます。どちらか一方でもOKです。
                                </p>
                            </div>
                        )}

                        {answersWithYearMonth && answersWithYearMonth.some(a => a.photos && a.photos.length > 0) && (
                            <div style={styles.photosSection}>
                                <h3 style={styles.photosSectionTitle}>📷 インタビュー時の写真</h3>
                                {answersWithYearMonth.map((answer, idx) => (
                                    answer.photos && answer.photos.length > 0 && (
                                        <div key={idx}>
                                            <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '10px' }}>
                                                Q{idx + 1}: {answer.photos.length}枚
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
                                    )
                                ))}
                            </div>
                        )}

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
                                                ✕ 削除
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
                                確認・保存へ →
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
                    <>
                        <h2 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '18px' }}>
                            ✏️ 最終確認
                        </h2>
                        <h3 style={{ color: '#7f8c8d', marginBottom: '10px' }}>修正されたテキスト：</h3>
                        <div style={{
                            ...styles.answerText,
                            padding: '15px',
                            minHeight: '100px',
                            whiteSpace: 'pre-wrap' as const,
                        }}>
                            {editedText}
                        </div>

                        {answersWithYearMonth && answersWithYearMonth.length > 0 && (
                            <div style={styles.photosSection}>
                                <h3 style={styles.photosSectionTitle}>📅 設定された年月</h3>
                                {answersWithYearMonth.map((answer, idx) => {
                                    const hasYearMonth = answer.year || answer.month;
                                    if (!hasYearMonth) return null;
                                    
                                    return (
                                        <div key={idx} style={{
                                            backgroundColor: '#f0f8ff',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            marginBottom: '10px',
                                            borderLeft: '3px solid #3498db'
                                        }}>
                                            <strong>Q{idx + 1}:</strong> {answer.year}年 {answer.month}月
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {answersWithYearMonth && answersWithYearMonth.some(a => a.photos && a.photos.length > 0) && (
                            <div style={styles.photosSection}>
                                <h3 style={styles.photosSectionTitle}>📷 インタビュー時の写真</h3>
                                {answersWithYearMonth.map((answer, idx) => (
                                    answer.photos && answer.photos.length > 0 && (
                                        <div key={idx}>
                                            <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '10px' }}>
                                                Q{idx + 1}: {answer.photos.length}枚
                                            </p>
                                            <div style={styles.photosContainer}>
                                                {answer.photos.map((photo) => (
                                                    <div key={photo.id} style={styles.photoCard}>
                                                        <img
                                                            src={photo.file_path}
                                                            alt="interview-photo"
                                                            style={styles.photoImage}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        )}

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
                                {isSaving ? '💾 保存中...' : '✅ 保存して完了'}
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