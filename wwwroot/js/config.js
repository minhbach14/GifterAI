/* 
    Trạng thái Demo cho websiet
    API sẽ tích hợp ở Backend
    Tuyệt đối không bỏ API key vào JS
*/
window.GiftApp = window.GiftApp || {};
window.GiftApp.config = Object.freeze({
  mode: 'demo', // 'api' chỉ được bật khi đã triển khai Backend có các API mà website cần sử dụng
  apiBase: '/api',
  requestTimeoutMs: 25000,
  maxResults: 6,
  demoDelayMs: 650,
  storagePrefix: 'gifter.v1.'
});
