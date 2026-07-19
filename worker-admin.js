// Tombstone service-worker script. Served at any SW registration path so that
// old Firebase / Vite SWs that may have been cached on users' browsers unregister
// themselves immediately on their next update check.
const SW_TOMBSTONE = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(c => c.navigate(c.url));
});
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Kill any old service workers registered under common Firebase / Vite paths.
    const swPaths = [
      '/firebase-messaging-sw.js',
      '/sw.js',
      '/service-worker.js',
      '/admin/firebase-messaging-sw.js',
      '/admin/sw.js',
    ];
    if (swPaths.includes(url.pathname)) {
      return new Response(SW_TOMBSTONE, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Reset page: clears service workers, caches and storage, then redirects to /admin/.
    // Users who see a black screen should visit synced.graphics/admin-reset
    if (url.pathname === '/admin-reset' || url.pathname === '/admin-reset/') {
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Resetting…</title>
<style>body{margin:0;background:#080808;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px}</style>
</head><body>
<p style="font-size:18px">Limpiando caché…</p>
<p id="s" style="font-size:13px;color:#aaa">Por favor esperá…</p>
<script>
(async()=>{
  const s=document.getElementById('s');
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const r of regs){await r.unregister();}
      s.textContent='Service workers eliminados ✓';
    }
    if('caches' in window){
      const keys=await caches.keys();
      for(const k of keys){await caches.delete(k);}
    }
    localStorage.clear();
    sessionStorage.clear();
    s.textContent='Listo! Redirigiendo…';
  }catch(e){s.textContent='Error: '+e.message;}
  setTimeout(()=>{window.location.href='/admin/?r='+Date.now();},800);
})();
</script></body></html>`;
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html;charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    let res = await env.ASSETS.fetch(request);

    // SPA fallback
    if (res.status === 404) {
      url.pathname = '/admin/index.html';
      res = await env.ASSETS.fetch(url.toString());
    }

    // Never cache index.html so browsers always get the latest JS references
    if (url.pathname === '/admin' || url.pathname === '/admin/' || url.pathname.endsWith('index.html')) {
      const headers = new Headers(res.headers);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return new Response(res.body, { status: res.status, headers });
    }

    return res;
  },
};
