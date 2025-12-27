import { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function PDFDisplayPage({
  userId,
  token,
  userInfo,
  onComplete
}: {
  userId: number;
  token: string | null;
  userInfo?: { name: string; age: number };
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    generatePDF();
  }, []);

  const generatePDF = async () => {
    try {
      setProgress(10);
      console.log('📄 PDF生成開始 - userId:', userId);

      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      // PDFを生成
      const response = await fetch(`${apiUrl}/api/pdf/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('PDF generation error:', errorData);
        throw new Error(`PDF生成に失敗しました: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ PDF生成完了 - filename:', data.filename);

      setProgress(80);

      setPdfFileName(data.filename);
      setPdfUrl(`${apiUrl}${data.filepath}`);

      setProgress(100);
      setLoading(false);

    } catch (error) {
      console.error('❌ PDF生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'PDF生成に失敗しました';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!pdfFileName) return;

    try {
      const apiUrl = API_URL;
      const downloadUrl = `${apiUrl}/api/pdf/download/${pdfFileName}`;

      // ブラウザのダウンロード機能を使用
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = pdfFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ PDFダウンロード開始:', pdfFileName);
    } catch (error) {
      console.error('❌ ダウンロードエラー:', error);
      alert('ダウンロードに失敗しました');
    }
  };

  const handleComplete = () => {
    console.log('✅ 自分史PDFが完成しました！');
    alert('🎉 ご利用ありがとうございます！\n\nあなたの素晴らしい人生の物語が完成しました。\n\nPDFをダウンロードして、大切な人と共有してください。');
    onComplete();
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
    subtitle: {
      fontSize: '16px',
      color: '#7f8c8d',
      marginBottom: '20px',
    },
    card: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
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
      overflow: 'hidden' as const,
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
    info: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      fontSize: '15px',
      color: '#2c3e50',
      marginBottom: '20px',
      lineHeight: '1.6',
    },
    pdfPreviewContainer: {
      backgroundColor: '#f9f9f9',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '2px solid #ddd',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pdfPreview: {
      width: '100%',
      height: '500px',
      border: '1px solid #ccc',
      borderRadius: '4px',
    },
    pdfInfo: {
      backgroundColor: '#fff3cd',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      fontSize: '14px',
      color: '#856404',
      fontWeight: 'bold' as const,
    },
    buttonContainer: {
      display: 'grid' as const,
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
      marginBottom: '20px',
    },
    button: {
      padding: '16px',
      fontSize: '16px',
      borderRadius: '8px',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s ease',
      fontWeight: '600',
      minHeight: '48px',
    },
    downloadButton: {
      backgroundColor: '#27ae60',
      color: 'white',
    },
    nextButton: {
      backgroundColor: '#3498db',
      color: 'white',
    },
    errorBox: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      padding: '20px',
      borderRadius: '4px',
      marginBottom: '20px',
      textAlign: 'left' as const,
    },
    loadingContainer: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
    },
    spinner: {
      fontSize: '48px',
      marginBottom: '20px',
      animation: 'pulse 1.5s infinite',
    },
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>⚠️ PDF生成エラー</h1>
        </div>
        <div style={styles.card}>
          <div style={styles.errorBox}>
            <strong>エラー内容:</strong>
            <p>{error}</p>
          </div>
          <button
            onClick={generatePDF}
            style={{
              ...styles.button,
              backgroundColor: '#e74c3c',
              color: 'white',
              width: '100%',
            }}
          >
            🔄 もう一度試す
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div style={styles.header}>
          <h1 style={styles.title}>📄 自分史PDFを作成中</h1>
          <p style={styles.subtitle}>しばらくお待ちください...</p>
        </div>
        <div style={styles.card}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}>⚙️</div>
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div style={styles.progressFill}></div>
              </div>
              <div style={styles.progressText}>
                {progress}% 完了
              </div>
            </div>
            <p style={{ color: '#7f8c8d', marginTop: '20px' }}>
              PDFファイルを生成しています...
            </p>
          </div>
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

      <div style={styles.header}>
        <h1 style={styles.title}>✅ 自分史PDF完成！</h1>
        <p style={styles.subtitle}>あなたの人生の物語が完成しました</p>
      </div>

      <div style={styles.card}>
        <div style={styles.info}>
          📖 <strong>{userInfo?.name || 'あなた'}さんの自分史</strong><br />
          年齢: {userInfo?.age || 'unknown'}歳<br />
          <br />
          以下からPDFファイルをダウンロードして、保存・印刷・共有できます。
        </div>

        <div style={styles.pdfInfo}>
          📁 ファイル名: {pdfFileName}
        </div>

        {pdfUrl && (
          <div style={styles.pdfPreviewContainer}>
            <iframe
              src={pdfUrl}
              style={styles.pdfPreview}
              title="PDF Preview"
            />
          </div>
        )}

        <div style={styles.buttonContainer}>
          <button
            onClick={handleDownload}
            style={{ ...styles.button, ...styles.downloadButton }}
          >
            ⬇️ PDFをダウンロード
          </button>
          <button
            onClick={handleComplete}
            style={{ ...styles.button, ...styles.nextButton }}
          >
            ✅ 完了
          </button>
        </div>

        <div style={{
          backgroundColor: '#f0f8ff',
          padding: '15px',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#0066cc',
          lineHeight: '1.6',
        }}>
          <strong>💡 ヒント:</strong><br />
          • PDFは何度もダウンロードできます<br />
          • メールに添付したり、SNSで共有できます<br />
          • 印刷して家族に贈るのも素敵です！
        </div>
      </div>
    </div>
  );
}
