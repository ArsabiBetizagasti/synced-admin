import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Unregister any stale service workers (from old app versions) that may
// intercept requests and serve cached content, causing a permanent black screen.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
}

// Remove legacy PIN-based auth key that could conflict with Firebase Auth.
sessionStorage.removeItem('sg_user');

// Purge sg_notifications on boot: keep only the last 20 within 24h.
// This prevents QuotaExceededError from crashing the app on the next localStorage.setItem.
try {
  const raw = localStorage.getItem('sg_notifications');
  if (raw) {
    const arr = JSON.parse(raw);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const pruned = (Array.isArray(arr) ? arr : [])
      .filter(n => new Date(n.timestamp).getTime() > cutoff)
      .slice(0, 20);
    localStorage.setItem('sg_notifications', JSON.stringify(pruned));
  }
} catch (_) {
  localStorage.removeItem('sg_notifications');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
