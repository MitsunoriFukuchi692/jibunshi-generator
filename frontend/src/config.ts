/**
 * API URL 自動判定
 * 現在のホストに基づいて、自動的に正しいバックエンドURLを返す
 */

export const getApiUrl = (): string => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  console.log('🌐 Current hostname:', hostname);
  console.log('🔗 Current protocol:', protocol);

  // 本番環境（robostudy.jp）
  if (hostname.includes('robostudy.jp')) {
  const url = 'https://jibunshi-generator-backend.onrender.com';
  console.log('📍 環境: 本番（Production）');
  console.log('🔗 API URL:', url);
  return url;
}

  // ローカル環境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = 'http://localhost:3000';
    console.log('📍 環境: ローカル（Local）');
    console.log('🔗 API URL:', url);
    return url;
  }

  // 開発環境（その他のドメイン）
  const url = `${protocol}//localhost:3000`;
  console.log('📍 環境: 開発（Development）');
  console.log('🔗 API URL:', url);
  return url;
};

export const API_URL = getApiUrl();

console.log('✅ API Configuration loaded');