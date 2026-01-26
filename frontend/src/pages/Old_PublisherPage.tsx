import { useState } from 'react';

export default function PublisherPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'pdf'>('dashboard');

  // ダミーデータ
  const [users] = useState([
    { id: 1, name: '山田太郎', age: 73, registeredDate: '2025-11-16', status: '進行中' },
    { id: 2, name: '佐藤花子', age: 68, registeredDate: '2025-11-15', status: '完了' },
    { id: 3, name: '田中次郎', age: 70, registeredDate: '2025-11-14', status: '進行中' },
    { id: 4, name: '鈴木美咲', age: 75, registeredDate: '2025-11-13', status: '完了' },
    { id: 5, name: '高橋健一', age: 72, registeredDate: '2025-11-12', status: '進行中' },
  ]);

  const [pdfs] = useState([
    { id: 1, title: '山田太郎の自分史', author: '山田太郎', generatedDate: '2025-11-16', pages: 45, size: '2.3MB' },
    { id: 2, title: '佐藤花子の人生記', author: '佐藤花子', generatedDate: '2025-11-15', pages: 38, size: '1.8MB' },
    { id: 3, title: '田中次郎の思い出', author: '田中次郎', generatedDate: '2025-11-14', pages: 52, size: '2.7MB' },
    { id: 4, title: '鈴木美咲の人生', author: '鈴木美咲', generatedDate: '2025-11-13', pages: 41, size: '2.1MB' },
  ]);

  // スタイル定義
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
    },
    header: {
      marginBottom: '30px',
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '20px',
    },
    tabContainer: {
      display: 'flex',
      gap: '10px',
      borderBottom: '2px solid #ecf0f1',
      marginBottom: '30px',
    },
    tab: (active: boolean) => ({
      padding: '15px 30px',
      fontSize: '16px',
      fontWeight: 'bold',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: active ? '3px solid #3498db' : 'none',
      color: active ? '#3498db' : '#7f8c8d',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }),
    content: {
      animation: 'fadeIn 0.3s ease',
    },
    
    // ダッシュボード
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '40px',
    },
    statCard: (bgColor: string) => ({
      backgroundColor: bgColor,
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }),
    statValue: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: 'white',
      marginBottom: '10px',
    },
    statLabel: {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.9)',
    },
    chartContainer: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
    },
    chartTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '20px',
    },
    barChart: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '15px',
      height: '200px',
      marginBottom: '20px',
    },
    bar: (height: number, color: string) => ({
      flex: 1,
      backgroundColor: color,
      borderRadius: '4px 4px 0 0',
      height: `${height}px`,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      paddingBottom: '5px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }),
    barLabel: {
      display: 'flex',
      justifyContent: 'space-around',
      marginTop: '10px',
      fontSize: '12px',
      color: '#7f8c8d',
    },
    
    // ユーザー管理
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    thead: {
      backgroundColor: '#ecf0f1',
    },
    th: {
      padding: '15px',
      textAlign: 'left' as const,
      fontWeight: 'bold',
      color: '#2c3e50',
      borderBottom: '2px solid #ddd',
    },
    td: {
      padding: '15px',
      borderBottom: '1px solid #ecf0f1',
      color: '#34495e',
    },
    statusBadge: (status: string) => ({
      padding: '5px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 'bold',
      backgroundColor: status === '完了' ? '#d5f4e6' : '#fff3cd',
      color: status === '完了' ? '#27ae60' : '#f39c12',
    }),
    tr: (index: number) => ({
      backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    }),
    
    // PDF管理
    pdfGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px',
    },
    pdfCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    pdfHeader: {
      backgroundColor: '#e74c3c',
      padding: '15px',
      color: 'white',
      textAlign: 'center' as const,
      fontSize: '24px',
    },
    pdfContent: {
      padding: '15px',
    },
    pdfTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '8px',
    },
    pdfInfo: {
      fontSize: '13px',
      color: '#7f8c8d',
      marginBottom: '5px',
    },
    downloadButton: {
      width: '100%',
      marginTop: '10px',
      padding: '10px',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
    },
    
    // 共通
    card: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '15px',
    },
  };

  // ダッシュボード画面
  const renderDashboard = () => (
    <div style={styles.content}>
      {/* 統計カード */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard('#3498db')}>
          <div style={styles.statValue}>{users.length}</div>
          <div style={styles.statLabel}>登録ユーザー数</div>
        </div>
        <div style={styles.statCard('#27ae60')}>
          <div style={styles.statValue}>{pdfs.length}</div>
          <div style={styles.statLabel}>生成済みPDF</div>
        </div>
        <div style={styles.statCard('#f39c12')}>
          <div style={styles.statValue}>{users.filter(u => u.status === '進行中').length}</div>
          <div style={styles.statLabel}>進行中のユーザー</div>
        </div>
        <div style={styles.statCard('#9b59b6')}>
          <div style={styles.statValue}>{users.filter(u => u.status === '完了').length}</div>
          <div style={styles.statLabel}>完了したユーザー</div>
        </div>
      </div>

      {/* 月別生成PDF数（グラフ）*/}
      <div style={styles.chartContainer}>
        <h3 style={styles.chartTitle}>📊 月別PDF生成数</h3>
        <div style={styles.barChart}>
          {[
            { month: '8月', count: 12, color: '#3498db' },
            { month: '9月', count: 18, color: '#3498db' },
            { month: '10月', count: 24, color: '#3498db' },
            { month: '11月', count: 16, color: '#e74c3c' },
          ].map((item) => (
            <div key={item.month} style={{ flex: 1 }}>
              <div
                style={styles.bar(item.count * 8, item.color)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {item.count}
              </div>
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: '#7f8c8d' }}>
                {item.month}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ステータス概要 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>📈 ステータス概要</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#2c3e50' }}>
              進行中: {users.filter(u => u.status === '進行中').length}名
            </div>
            <div style={{ 
              width: '100%', 
              height: '20px', 
              backgroundColor: '#ecf0f1', 
              borderRadius: '10px', 
              overflow: 'hidden' 
            }}>
              <div style={{
                width: `${(users.filter(u => u.status === '進行中').length / users.length) * 100}%`,
                height: '100%',
                backgroundColor: '#f39c12',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#2c3e50' }}>
              完了: {users.filter(u => u.status === '完了').length}名
            </div>
            <div style={{ 
              width: '100%', 
              height: '20px', 
              backgroundColor: '#ecf0f1', 
              borderRadius: '10px', 
              overflow: 'hidden' 
            }}>
              <div style={{
                width: `${(users.filter(u => u.status === '完了').length / users.length) * 100}%`,
                height: '100%',
                backgroundColor: '#27ae60',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ユーザー管理画面
  const renderUsers = () => (
    <div style={styles.content}>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>ユーザー名</th>
              <th style={styles.th}>年齢</th>
              <th style={styles.th}>登録日</th>
              <th style={styles.th}>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={user.id} style={styles.tr(index)}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                </td>
                <td style={styles.td}>{user.age}歳</td>
                <td style={styles.td}>{user.registeredDate}</td>
                <td style={styles.td}>
                  <div style={styles.statusBadge(user.status)}>
                    {user.status}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 統計情報 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>📊 ユーザー統計</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>合計ユーザー数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{users.length}名</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>平均年齢</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {Math.round(users.reduce((sum, u) => sum + u.age, 0) / users.length)}歳
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>最年長ユーザー</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {Math.max(...users.map(u => u.age))}歳
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>最年少ユーザー</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {Math.min(...users.map(u => u.age))}歳
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // PDF管理画面
  const renderPdfs = () => (
    <div style={styles.content}>
      <div style={styles.pdfGrid}>
        {pdfs.map((pdf) => (
          <div key={pdf.id} style={styles.pdfCard}>
            <div style={styles.pdfHeader}>📄</div>
            <div style={styles.pdfContent}>
              <div style={styles.pdfTitle}>{pdf.title}</div>
              <div style={styles.pdfInfo}>👤 {pdf.author}</div>
              <div style={styles.pdfInfo}>📅 {pdf.generatedDate}</div>
              <div style={styles.pdfInfo}>📑 {pdf.pages}ページ</div>
              <div style={styles.pdfInfo}>💾 {pdf.size}</div>
              <button
                style={styles.downloadButton}
                onClick={() => alert(`${pdf.title} をダウンロードしました`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2980b9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3498db';
                }}
              >
                ⬇️ ダウンロード
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PDF統計 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>📊 PDF統計</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>生成済みPDF数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{pdfs.length}冊</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>平均ページ数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {Math.round(pdfs.reduce((sum, p) => sum + p.pages, 0) / pdfs.length)}ページ
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>合計容量</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {(pdfs.reduce((sum, p) => sum + parseFloat(p.size), 0)).toFixed(1)}MB
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 出版社管理画面</h1>
      </div>

      {/* タブメニュー */}
      <div style={styles.tabContainer}>
        <button
          style={styles.tab(activeTab === 'dashboard')}
          onClick={() => setActiveTab('dashboard')}
        >
          📈 ダッシュボード
        </button>
        <button
          style={styles.tab(activeTab === 'users')}
          onClick={() => setActiveTab('users')}
        >
          👥 ユーザー管理
        </button>
        <button
          style={styles.tab(activeTab === 'pdf')}
          onClick={() => setActiveTab('pdf')}
        >
          📄 PDF管理
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'pdf' && renderPdfs()}
    </div>
  );
}
