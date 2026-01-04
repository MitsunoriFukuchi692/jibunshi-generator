import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

interface Answer {
  text: string;
  photos?: Array<{
    id: number;
    file_path: string;
    description?: string;
  }>;
  year?: string;
  month?: string;
  eventTitle?: string;  // ✅ 新: イベントのタイトル
  isImportant?: boolean;  // ✅ 新: 重要なできごとフラグ
}

export default function AIGenerationPage({
  userId,
  token,
  answersWithPhotos,
  userInfo,
  onComplete
}: {
  userId: number;
  token: string | null;
  answersWithPhotos: Answer[];
  userInfo?: { name: string; age: number };
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const hasStarted = useRef(false);  // ✅ 修正: 2重実行防止フラグ

  useEffect(() => {
    // ✅ 修正: 既に実行中なら何もしない
    if (hasStarted.current) {
      console.warn('⚠️ generateAIBiography は既に実行中です。2重実行を防止します。');
      return;
    }

    hasStarted.current = true;  // ← フラグを立てる
    deleteOldDataAndGenerate();
  }, []);  // ← 依存配列を空にして1回だけ実行

  // ✅ 新: 過去データ削除 → AI生成を実行
  const deleteOldDataAndGenerate = async () => {
    try {
      console.log('🗑️ ステップ0: 過去データを削除中...');

      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      // ✅ 過去データ削除リクエスト
      const deleteResponse = await fetch(`${apiUrl}/api/cleanup/old-data`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId
        })
      });

      if (deleteResponse.ok) {
        const deleteData = await deleteResponse.json();
        console.log('✅ 過去データ削除完了:', deleteData.message);
        console.log('削除内容:', {
          timelineDeleted: deleteData.timelineDeleted || 0,
          biographyDeleted: deleteData.biographyDeleted || 0,
          timelineMetadataDeleted: deleteData.timelineMetadataDeleted || 0
        });
      } else {
        console.warn('⚠️ 過去データ削除に失敗しましたが続行します...');
      }

      // ✅ 過去データ削除後、AI生成を開始
      await generateAIBiography();

    } catch (error) {
      console.error('❌ データ削除エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'データ削除に失敗しました';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const generateAIBiography = async () => {
    try {
      setProgress(10);
      console.log('🤖 AI作成開始...');
      console.log('📊 回答数:', answersWithPhotos?.length || 0);
      console.log('📋 サンプル回答:', answersWithPhotos?.[0]);

      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      // ✅ ステップ1: 重要なできごとを抽出
      console.log('🔍 重要なできごとを抽出...');
      const importantEvents = (answersWithPhotos || []).filter((ans: Answer) => ans.isImportant);
      const allResponses = (answersWithPhotos || [])
        .map((ans: Answer) => ans.text || '')
        .filter(Boolean);

      console.log('⭐ 重要なできごと数:', importantEvents.length);
      console.log('📝 全回答テキスト数:', allResponses.length);

      if (allResponses.length === 0) {
        throw new Error('有効な回答がありません');
      }

      setProgress(20);

      // ✅ ステップ2: AI編集エンドポイントを呼び出し（全回答をまとめた自分史）
      console.log('🤖 AI編集APIにリクエスト送信...');
      const editResponse = await fetch(`${apiUrl}/api/ai/edit-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          responses: allResponses,
          stage: 'interview',
          user_id: userId,
          user_prompt: null
        })
      });

      if (!editResponse.ok) {
        const errorData = await editResponse.json();
        throw new Error(`API error: ${editResponse.status} - ${errorData.error || 'Unknown error'}`);
      }

      setProgress(50);

      const editData = await editResponse.json();
      const editedContent = editData.edited_content;

      console.log('✅ AI作成完了');
      console.log('📄 作成テキスト長:', editedContent?.length || 0);

      setProgress(70);

      // ✅ ステップ3: biography を保存（最初に1回だけ）
      // 重要: これは「全体の自分史」を保存するもので、timeline とは別
      console.log('🔹 biography リクエストを送信:', {
        url: `${apiUrl}/api/biography`,
        token: !!token
      });

      const biographyResponse = await fetch(`${apiUrl}/api/biography`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          edited_content: editedContent,
          ai_summary: editedContent
        })
      });

      if (!biographyResponse.ok) {
        const errorData = await biographyResponse.json();
        throw new Error(`Biography save error: ${biographyResponse.status} - ${errorData.error || 'Unknown error'}`);
      }

      const biographyData = await biographyResponse.json();
      console.log('✅ Biography 保存完了 - ID:', biographyData.data?.id || biographyData.id);

      setProgress(75);

      // ✅ ステップ4: 重要なできごとごとに timeline レコードを作成
      console.log('📚 重要なできごとをタイムラインに保存...');

      let savedCount = 0;
      const timelineIds: number[] = [];  // ✅ 新: timeline_id を保存

      for (let i = 0; i < importantEvents.length; i++) {
        const event = importantEvents[i];

        // 年月データを処理（曖昧な年もOK）
        let eventYear: string | number | null = event.year ? String(event.year).trim() : null;
        let eventMonth: number | null = null;

        if (eventYear && eventYear !== 'undefined' && eventYear !== 'NaN') {
          if (/^\d+$/.test(eventYear as string)) {
            eventYear = parseInt(eventYear as string, 10);
          }
        } else {
          eventYear = null;
        }

        if (event.month) {
          const monthStr = String(event.month).trim();
          if (/^\d+$/.test(monthStr)) {
            const monthNum = parseInt(monthStr, 10);
            if (monthNum >= 1 && monthNum <= 12) {
              eventMonth = monthNum;
            }
          }
        }

        // ✅ 修正: 各イベントに異なるタイトルを使用
        const eventTitle = event.eventTitle || `人生のできごと ${i + 1}`;

        console.log(`📍 重要なできごと ${i + 1}/${importantEvents.length} を保存...`, {
          year: eventYear,
          month: eventMonth,
          title: eventTitle,
          textLength: event.text?.length || 0
        });

        const timelineResponse = await fetch(`${apiUrl}/api/timeline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            user_id: userId,
            age: userInfo?.age || null,
            year: eventYear,
            month: eventMonth,
            turning_point: null,
            stage: 'interview',
            event_title: eventTitle,  // ✅ 各イベントのタイトル
            event_description: event.text,  // ✅ 各イベントの説明（回答テキスト）
            // ❌ edited_content は含めない（biography で既に保存済み）
            answersWithPhotos: event.photos && event.photos.length > 0 ? [{ ...event, photos: event.photos }] : [],  // ✅ photos を含める！
            isAutoGenerated: true
          })
        });

        if (!timelineResponse.ok) {
          const errorData = await timelineResponse.json();
          throw new Error(`Timeline save error: ${timelineResponse.status} - ${errorData.error || 'Unknown error'}`);
        }

        const timelineData = await timelineResponse.json();
        const timelineId = timelineData.data?.id || timelineData.id;
        console.log(`✅ 重要なできごと ${i + 1} 保存完了 - ID:`, timelineId);

        // ✅ 新: timeline_id を保存（後で timeline_metadata を作成する際に使用）
        if (timelineId) {
          timelineIds.push(timelineId);
        }

        savedCount++;
      }

      console.log(`✅ ${savedCount}個の重要なできごとをタイムラインに保存完了`);

      setProgress(85);

      // ✅ ステップ5: timeline_metadata を自動作成（JSON パースエラーを防ぐ）
      console.log('📊 timeline_metadata を作成中...');

      try {
        // 重要なできごとのタイトル一覧を作成
        const importantEventsTitles = importantEvents.map((event, idx) =>
          event.eventTitle || `人生のできごと ${idx + 1}`
        );

        for (let i = 0; i < timelineIds.length; i++) {
          const timelineId = timelineIds[i];

          const metadataResponse = await fetch(`${apiUrl}/api/timeline/${timelineId}/metadata`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              user_id: userId,
              important_events: JSON.stringify(importantEventsTitles),  // ✅ JSON文字列として保存
              turning_points: JSON.stringify([]),  // 初期値は空
              custom_metadata: {}
            })
          });

          if (!metadataResponse.ok) {
            console.warn(`⚠️ timeline_metadata 作成失敗 (timeline_id: ${timelineId})`);
            // エラーでも続行
          } else {
            console.log(`✅ timeline_metadata 作成完了 - timeline_id: ${timelineId}`);
          }
        }
      } catch (metadataError) {
        console.warn('⚠️ timeline_metadata 作成エラー (non-fatal):', metadataError);
        // metadata 作成失敗はエラーにしない
      }

      setProgress(100);

      // ✅ ステップ6: 完了処理
      setTimeout(() => {
        console.log('🎉 AI作成完了 - 修正ページへ遷移');
        onComplete();
      }, 1000);

    } catch (error) {
      console.error('❌ AI作成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'AI作成に失敗しました';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9f7f4',
      padding: '20px',
    },
    card: {
      backgroundColor: 'white',
      padding: '60px 40px',
      borderRadius: '8px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      textAlign: 'center' as const,
      maxWidth: '500px',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '20px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#7f8c8d',
      marginBottom: '40px',
      fontStyle: 'italic',
    },
    progressContainer: {
      width: '100%',
      marginBottom: '30px',
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#ecf0f1',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '15px',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#3498db',
      width: `${progress}%`,
      transition: 'width 0.3s ease',
    },
    progressText: {
      fontSize: '14px',
      color: '#7f8c8d',
      marginTop: '10px',
    },
    steps: {
      marginTop: '40px',
      textAlign: 'left' as const,
    },
    step: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '15px',
      opacity: progress >= (70 - (3 - 1) * 20) ? 1 : 0.5,
    },
    stepNumber: {
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      backgroundColor: '#3498db',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      marginRight: '15px',
      fontSize: '14px',
    },
    stepText: {
      fontSize: '14px',
      color: '#34495e',
    },
    loadingDot: {
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#3498db',
      marginLeft: '5px',
      animation: 'pulse 1.5s infinite',
    },
    errorBox: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      padding: '20px',
      borderRadius: '4px',
      marginBottom: '20px',
      textAlign: 'left' as const,
    },
    retryButton: {
      marginTop: '20px',
      padding: '12px 30px',
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold',
    },
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.title}>⚠️ エラーが発生しました</div>
          <div style={styles.errorBox}>
            <strong>エラー内容:</strong>
            <p>{error}</p>
          </div>
          <button
            style={styles.retryButton}
            onClick={() => {
              setError(null);
              setProgress(0);
              deleteOldDataAndGenerate();
            }}
          >
            📄 もう一度試す
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div style={styles.card}>
        <div style={styles.title}>
          🤖 人生記録を作成中
          <span style={styles.loadingDot}></span>
          <span style={styles.loadingDot}></span>
          <span style={styles.loadingDot}></span>
        </div>
        <div style={styles.subtitle}>
          聞き取り内容から素敵な人生記録を作成しています...
        </div>

        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={styles.progressFill}></div>
          </div>
          <div style={styles.progressText}>
            {progress}%完了
          </div>
        </div>

        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>0</div>
            <div style={styles.stepText}>
              🗑️ 過去データを削除中
              {progress >= 10 ? ' ✅' : ''}
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepText}>
              📄 回答テキストを整理中
              {progress >= 20 ? ' ✅' : ''}
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepText}>
              🤖 AIで人生記録を作成中
              {progress >= 70 ? ' ✅' : ''}
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepText}>
              💾 データベースに保存中
              {progress >= 85 ? ' ✅' : ''}
            </div>
          </div>

          <div style={styles.step}>
            <div style={styles.stepNumber}>4</div>
            <div style={styles.stepText}>
              📊 メタデータを作成中
              {progress >= 100 ? ' ✅' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
