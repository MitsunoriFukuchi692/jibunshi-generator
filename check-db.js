const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'backend', 'data', 'jibunshi.db');
  console.log(`DBパス: ${dbPath}\n`);
  
  const db = new Database(dbPath);
  
  // ユーザー一覧
  console.log('=== ユーザー一覧 ===');
  const users = db.prepare('SELECT id, name, age, progress_stage FROM users').all();
  console.log(JSON.stringify(users, null, 2));
  
  // テーブル一覧を確認
  console.log('\n=== DB内のテーブル一覧 ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  tables.forEach(t => console.log(`- ${t.name}`));
  
  // interview_sessionsの確認（複数形）
  console.log('\n=== interview_sessions テーブル ===');
  const sessionData = db.prepare('SELECT * FROM interview_sessions WHERE user_id=1').get();
  console.log(JSON.stringify(sessionData, null, 2));
  
  // timelineデータ
  console.log('\n=== timeline データ（user_id=1） ===');
  const timeline = db.prepare('SELECT COUNT(*) as cnt FROM timeline WHERE user_id=1').get();
  console.log(`件数: ${timeline.cnt}`);
  
  // interview データ
  console.log('\n=== interview データ（user_id=1） ===');
  const interviewCount = db.prepare('SELECT COUNT(*) as cnt FROM interviews WHERE user_id=1').get();
  console.log(`件数: ${interviewCount.cnt}`);
  
  // biography（自分史）
  console.log('\n=== biography データ（user_id=1） ===');
  const bio = db.prepare('SELECT * FROM biography WHERE user_id=1').get();
  console.log(JSON.stringify(bio, null, 2));
  
  db.close();
} catch(err) {
  console.error('エラー:', err.message);
}