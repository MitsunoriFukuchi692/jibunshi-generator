import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface Timeline {
  id: number;
  year: number | null;
  month: number | null;
  event_description: string;
  edited_content: string;
  turning_point: string;
  created_at: string;
}

interface TimelineWithPhotos extends Timeline {
  photos: Photo[];
}

interface Photo {
  id: number;
  file_path: string;
  description: string;
}

interface User {
  id: number;
  name: string;
  age: number;
}

export default function CorrectedTextPage({ userId, token }: { userId: number; token: string | null }) {
  const [user, setUser] = useState<User | null>(null);
  const [timelinesWithPhotos, setTimelinesWithPhotos] = useState<TimelineWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const apiUrl = API_URL;
      if (!apiUrl) throw new Error('API URLが設定されていません');

      console.log('📖 データ取得中...');

      // ユーザー情報取得
      const userResponse = await fetch(`${apiUrl}/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error('ユーザー情報取得に失敗しました');
      }

      const userData = await userResponse.json();
      setUser(userData);
      console.log('👤 ユーザー情報:', userData);

      // タイムラインデータ取得
      const timelineResponse = await fetch(`${apiUrl}/api/timeline?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!timelineResponse.ok) {
        throw new Error('タイムラインデータ取得に失敗しました');
      }

      const timelineData = await timelineResponse.json();
      console.log('📊 タイムラインデータ:', timelineData);

      // タイムラインごとに写真を取得
      const timelinesWithPhotosList: TimelineWithPhotos[] = [];
      
      for (const timeline of timelineData) {
        try {
          const photoResponse = await fetch(`${apiUrl}/api/timeline/${timeline.id}/photos`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          let photos: Photo[] = [];
          if (photoResponse.ok) {
            photos = await photoResponse.json();
          }

          timelinesWithPhotosList.push({
            ...timeline,
            photos
          });
        } catch (e) {
          console.warn('⚠️ 写真取得に失敗:', e);
          timelinesWithPhotosList.push({
            ...timeline,
            photos: []
          });
        }
      }

      // 年月でソート
      timelinesWithPhotosList.sort((a, b) => {
        if (a.year !== b.year) return (a.year || 0) - (b.year || 0);
        return (a.month || 0) - (b.month || 0);
      });

      setTimelinesWithPhotos(timelinesWithPhotosList);
      setError(null);
    } catch (error) {
      console.error('❌ Fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'データ取得に失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'Georgia, serif',
      backgroundColor: '#f9f7f4',
      minHeight: '100vh',
    },
    book: {
      backgroundColor: 'white',
      padding: '60px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      borderRadius: '8px',
    },
    cover: {
      textAlign: 'center' as const,
      paddingBottom: '60px',
      borderBottom: '2px solid #d4af37',
      marginBottom: '60px',
    },
    coverTitle: {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '20px',
      letterSpacing: '2px',
    },
    coverSubtitle: {
      fontSize: '24px',
      color: '#7f8c8d',
      marginBottom: '40px',
      fontStyle: 'italic',
    },
    coverName: {
      fontSize: '32px',
      color: '#34495e',
      marginBottom: '20px',
      fontWeight: 'bold',
    },
    coverInfo: {
      fontSize: '16px',
      color: '#95a5a6',
      marginBottom: '10px',
    },
    coverDate: {
      fontSize: '14px',
      color: '#bdc3c7',
      marginTop: '30px',
    },
    chapter: {
      marginBottom: '80px',
      pageBreakInside: 'avoid' as const,
    },
    chapterTitle: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '15px',
      borderBottom: '2px solid #d4af37',
      paddingBottom: '10px',
    },
    chapterYear: {
      fontSize: '20px',
      color: '#7f8c8d',
      marginBottom: '20px',
      fontWeight: 'bold',
    },
    content: {
      fontSize: '16px',
      lineHeight: '1.8',
      color: '#34495e',
      marginBottom: '30px',
      textAlign: 'justify' as const,
    },
    photosContainer: {
      marginBottom: '30px',
    },
    photoFrame: {
      margin: '20px 0',
      textAlign: 'center' as const,
      borderTop: '1px solid #ecf0f1',
      borderBottom: '1px solid #ecf0f1',
      paddingTop: '20px',
      paddingBottom: '20px',
    },
    photo: {
      maxWidth: '100%',
      maxHeight: '400px',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: '10px',
    },
    photoDescription: {
      fontSize: '13px',
      color: '#7f8c8d',
      fontStyle: 'italic',
      marginTop: '10px',
    },
    timeline: {
      marginTop: '80px',
      paddingTop: '40px',
      borderTop: '3px solid #d4af37',
    },
    timelineTitle: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '40px',
      textAlign: 'center' as const,
    },
    timelineTable: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginBottom: '30px',
    },
    timelineTableHeader: {
      backgroundColor: '#ecf0f1',
      borderBottom: '2px solid #d4af37',
      padding: '15px',
      textAlign: 'left' as const,
      fontWeight: 'bold',
      color: '#2c3e50',
    },
    timelineTableCell: {
      borderBottom: '1px solid #ecf0f1',
      padding: '12px 15px',
      color: '#34495e',
    },
    footer: {
      marginTop: '60px',
      paddingTop: '30px',
      borderTop: '2px solid #d4af37',
      textAlign: 'center' as const,
      color: '#95a5a6',
      fontSize: '13px',
    },
    printButton: {
      marginBottom: '30px',
      padding: '12px 30px',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold',
    },
    errorBox: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
    },
    loadingBox: {
      textAlign: 'center' as const,
      padding: '40px',
      color: '#7f8c8d',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <p>📖 本を準備中...</p>
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
      <button
        onClick={() => window.print()}
        style={styles.printButton}
      >
        🖨️ 印刷 / PDFに保存
      </button>

      <div style={styles.book}>
        {/* 表紙 */}
        <div style={styles.cover}>
          <div style={styles.coverTitle}>📖 自分史</div>
          <div style={styles.coverSubtitle}>(My Life Story)</div>
          <div style={styles.coverName}>{user?.name || 'ユーザー名未設定'}</div>
          <div style={styles.coverInfo}>
            年齢: {user?.age || '未設定'}歳
          </div>
          <div style={styles.coverDate}>
            {new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} 作成
          </div>
        </div>

        {/* 本文 */}
        {timelinesWithPhotos.map((timeline, index) => (
          <div key={timeline.id} style={styles.chapter}>
            {timeline.year && (
              <div style={styles.chapterYear}>
                {timeline.year}年{timeline.month ? `${timeline.month}月` : ''}
              </div>
            )}

            {timeline.edited_content && (
              <div style={styles.content}>
                {timeline.edited_content}
              </div>
            )}

            {timeline.photos && timeline.photos.length > 0 && (
              <div style={styles.photosContainer}>
                {timeline.photos.map((photo) => (
                  <div key={photo.id} style={styles.photoFrame}>
                    <img
                      src={`${API_URL}${photo.file_path}`}
                      alt="Timeline photo"
                      style={styles.photo}
                    />
                    {photo.description && (
                      <div style={styles.photoDescription}>
                        {photo.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 年表 */}
        {timelinesWithPhotos.filter(t => t.year).length > 0 && (
          <div style={styles.timeline}>
            <div style={styles.timelineTitle}>📊 人生年表</div>
            <table style={styles.timelineTable}>
              <thead>
                <tr>
                  <th style={styles.timelineTableHeader}>年</th>
                  <th style={styles.timelineTableHeader}>月</th>
                  <th style={styles.timelineTableHeader}>できごと</th>
                </tr>
              </thead>
              <tbody>
                {timelinesWithPhotos
                  .filter(t => t.year)
                  .map((timeline) => (
                    <tr key={timeline.id}>
                      <td style={styles.timelineTableCell}>
                        {timeline.year || '-'}
                      </td>
                      <td style={styles.timelineTableCell}>
                        {timeline.month || '-'}
                      </td>
                      <td style={styles.timelineTableCell}>
                        {timeline.edited_content
                          ? timeline.edited_content.substring(0, 100)
                          : timeline.event_description?.substring(0, 100) || '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* フッター */}
        <div style={styles.footer}>
          <p>この自分史は、AIと共に作成されました</p>
          <p>© {new Date().getFullYear()} Robo Study Corporation</p>
        </div>
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <button
          onClick={() => window.print()}
          style={styles.printButton}
        >
          🖨️ 印刷 / PDFに保存
        </button>
      </div>

      {/* 印刷用スタイル */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          button {
            display: none !important;
          }
          div[style*="f9f7f4"] {
            background: white !important;
            padding: 0 !important;
          }
          div[style*="60px"] {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page {
            margin: 2cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}
