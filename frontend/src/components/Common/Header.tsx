interface HeaderProps {
  currentPage: 'user' | 'record-nav'
  onPageChange: (page: 'user' | 'record-nav') => void
}

export default function Header({ currentPage, onPageChange }: HeaderProps) {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <h1 style={styles.title}>📖 人生記録</h1>
        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navButton,
              ...(currentPage === 'user' ? styles.navButtonActive : {}),
            }}
            onClick={() => onPageChange('user')}
          >
            利用者
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(currentPage === 'record-nav' ? styles.navButtonActive : {}),
            }}
            onClick={() => onPageChange('record-nav')}
          >
            記録ナビ
          </button>
        </nav>
      </div>
    </header>
  )
}

const styles = {
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    paddingX: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0',
  },
  nav: {
    display: 'flex',
    gap: '12px',
  },
  navButton: {
    backgroundColor: 'transparent',
    color: 'white',
    padding: '12px 24px',
    border: '2px solid white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    minHeight: '44px',
    transition: 'all 0.3s ease',
  },
  navButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
}
