interface HeaderProps {
  currentPage: 'user' | 'publisher'
  onPageChange: (page: 'user' | 'publisher') => void
}

export default function Header({ currentPage, onPageChange }: HeaderProps) {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <h1 style={styles.title}>📖 自分史ジェネレーター</h1>
        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navButton,
              ...(currentPage === 'user' ? styles.navButtonActive : {}),
            }}
            onClick={() => onPageChange('user')}
          >
            ユーザー
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(currentPage === 'publisher' ? styles.navButtonActive : {}),
            }}
            onClick={() => onPageChange('publisher')}
          >
            出版社管理
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
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    paddingX: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  nav: {
    display: 'flex',
    gap: '10px',
  },
  navButton: {
    backgroundColor: 'transparent',
    color: 'white',
    padding: '10px 20px',
    border: '2px solid white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  navButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
}
