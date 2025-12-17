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
        console.log('📊 TextCorrectionPage received answersWithPhotos:', answersWithPhotos);
        
        if (answersWithPhotos && answersWithPhotos.length > 0) {
            console.log('✅ Using received answersWithPhotos');
            setAnswersWithYearMonth(answersWithPhotos.map(answer => ({
                ...answer,
                year: answer.year || '',
                month: answer.month || ''
            })));
        } else {
            console.warn('⚠️ answersWithPhotos is empty, will fetch from timeline');
            fetchTimelineWithPhotos();
        }
        correctText();
    }, []);

    const fetchTimelineWithPhotos = async () => {
        try {
            const apiUrl = API_URL;
            const response = await fetch(`${apiUrl}/api/timeline?user_id=${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to fetch timeline');
            
            const timelines = await response.json();
            console.log('📖 Fetched timelines:', timelines.length);
            
            const timelinesWithPhotos = await Promise.all(
                timelines.map(async (timeline) => {
                    try {
                        const photoResponse = await fetch(
                            `${apiUrl}/api/timeline/${timeline.id}/photos`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                        
                        const photos = photoResponse.ok ? await photoResponse.json() : [];
                        
                        return {
                            text: timeline.event_description || timeline.edited_content || '',
                            photos: photos.map(p => ({
                                id: p.id,
                                file_path: p.file_path,
                                description: p.description
                            })),
                            year: timeline.year ? timeline.year.toString() : '',
                            month: timeline.month ? timeline.month.toString() : ''
                        };
                    } catch (e) {
                        console.warn('⚠️ Failed to fetch photos for timeline', timeline.id);
                        return {
                            text: timeline.event_description || timeline.edited_content || '',
                            photos: [],
                            year: timeline.year ? timeline.year.toString() : '',
                            month: timeline.month ? timeline.month.toString() : ''
                        };
                    }
                })
            );
            
            setAnswersWithYearMonth(timelinesWithPhotos);
            console.log('✅ Fetched timelines with photos:', timelinesWithPhotos.length);
        } catch (error) {
            console.error('❌ Error fetching timeline:', error);
        }
    };

    const correctText = async () => {
        setLoading(true);
        setError(null);

        try {
            const apiUrl = API_URL;
            if (!apiUrl) throw new Error('API URLが設定されていません');

            // インタビュー会話からユーザー回答だけを抽出
const responsesText = conversation
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content.replace(/^\*\*AI:\s*/, '').replace(/^\*\*ユーザー:\s*/, '').trim())
    .filter(msg => msg.length > 0)
    .join('\n\n');

            const userPrompt = `以下は高齢者のインタビュー回答です。これを一つの流暢な自分史のテキストに修正・編集してください。

修正のガイドライン：
- インタビューの質問形式（AI:、ユーザー:）は削除する
- 回答だけをまとめて、自然な文章にする
- 冗長な表現は簡潔にする
- 敬語から適切な文体に調整する
- 意味を変えずに流れをよくする
- 段落分けを改善して読みやすくする

インタビュー回答：
${responsesText}

修正済みの自分史テキストのみを返してください。（マークダウンなし、JSONなし）`;

            const response = await fetch(`${apiUrl}/api/ai/edit-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    stage: 'interview',
                    user_prompt: userPrompt
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`テキスト修正に失敗しました: ${errorText}`);
            }

            const data = await response.json();
            // ✅ edited_content フィールドから修正済みテキストを取得
            const correctedContent = data.edited_content || '';
            setCorrectedText(correctedContent);
            setEditedText(correctedContent);
            setStage('review');
        } catch (err) {
            console.error('❌ Text correction error:', err);
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.currentTarget.files;
        if (!files || files.length === 0) {
            console.warn('⚠️ No files selected');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const apiUrl = API_URL;
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
                newPhotos.push(photoData);
                console.log('✅ File uploaded - id:', photoData.id);
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
        console.log('📝 Edited Text Length:', editedText.length);

        try {
            const apiUrl = API_URL;
            if (!apiUrl) throw new Error('API URLが設定されていません');

            console.log('💾 修正済みテキストを保存中...');

            // ✅ 修正済みテキスト全体をそのまま保存
            const timelinePayload = {
                user_id: userId,
                event_title: '自分史',
                event_description: '',
                edited_content: editedText,  // ✅ 修正済みテキストをそのまま使用
                year: null,
                month: null,
                stage: 'interview',
                is_auto_generated: 1
            };

            console.log('📝 Saving edited timeline:', {
                ...timelinePayload,
                edited_content: timelinePayload.edited_content.substring(0, 100) + '...'
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
                console.error('❌ Timeline save error:', errorText);
                throw new Error(`タイムライン保存に失敗しました: ${errorText}`);
            }

            const timelineData = await timelineResponse.json();
            console.log('✅ Timeline saved - id:', timelineData.data?.id);

            // 保存成功メッセージ
            alert('✅ 自分史が保存されました！\n「自分史を生成」ボタンでPDFを作成できます。');
            onComplete();

        } catch (error: any) {
            console.error('❌ Error in handleSaveCompletion:', error);
            setError(error.message || 'エラーが発生しました');
            alert('❌ 保存に失敗しました: ' + (error.message || 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>📝 テキストを修正中...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>📖 自分史の確認と編集</h2>
            
            {error && (
                <div style={{
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px'
                }}>
                    ❌ {error}
                </div>
            )}

            {stage === 'review' && (
                <>
                    <div style={{
                        padding: '15px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        minHeight: '200px'
                    }}>
                        <h3>✨ AI修正版テキスト</h3>
                        <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                            {editedText}
                        </p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h3>📸 写真をアップロード（オプション）</h3>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            disabled={isUploading}
                            style={{
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: isUploading ? 'not-allowed' : 'pointer'
                            }}
                        />
                        
                        {uploadError && (
                            <div style={{
                                color: '#d32f2f',
                                marginTop: '5px',
                                fontSize: '14px'
                            }}>
                                ❌ {uploadError}
                            </div>
                        )}

                        {uploadedPhotos.length > 0 && (
                            <div style={{ marginTop: '15px' }}>
                                <p>アップロード済みの写真:</p>
                                {uploadedPhotos.map((photo) => (
                                    <div
                                        key={photo.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px',
                                            backgroundColor: '#e8f5e9',
                                            borderRadius: '4px',
                                            marginBottom: '8px'
                                        }}
                                    >
                                        <span>📷 {photo.filename}</span>
                                        <button
                                            onClick={() => handleRemovePhoto(photo.id)}
                                            style={{
                                                padding: '4px 12px',
                                                backgroundColor: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            削除
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSaveCompletion}
                        disabled={isSaving}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: isSaving ? '#ccc' : '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '16px',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {isSaving ? '⏳ 保存中...' : '✅ 保存して完了'}
                    </button>
                </>
            )}
        </div>
    );
}
