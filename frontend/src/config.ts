/**
 * API URL 自動判定
 * 現在のホストに基づいて、自動的に正しいバックエンドURLを返す
 */

export const getApiUrl = (): string => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  console.log('🌐 Current hostname:', hostname);
  console.log('🔗 Current protocol:', protocol);

  // ローカル環境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log('📍 環境: ローカル（Local）');
    console.log('🔗 API URL:', url);
    return url;
  }

  // 本番環境（robostudy.jp）
  if (hostname.includes('robostudy') || hostname.includes('jibunshi')) {
  const url = 'https://jibunshi-generator-backend.onrender.com';
  console.log('📍 環境: 本番（Production）');
  console.log('🔗 API URL:', url);
  return url;
}

  // その他の環境
  const url = `${protocol}//${hostname}`;
  console.log('📍 環境: その他（Other）');
  console.log('🔗 API URL:', url);
  return url;
};

export const API_URL = getApiUrl();

console.log('✅ API Configuration loaded');