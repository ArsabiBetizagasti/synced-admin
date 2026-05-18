const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const USER_COLORS = { kann: '#faff05', jero: '#60a5fa', facu: '#a78bfa' };

let _gisLoaded = false;
const _clients = {};

function loadGIS() {
  if (_gisLoaded || window.google?.accounts?.oauth2) { _gisLoaded = true; return Promise.resolve(); }
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => { _gisLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
}

function makeClient(userId, callback) {
  _clients[userId] = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback,
  });
  return _clients[userId];
}

export function isConfigured() {
  return Boolean(CLIENT_ID);
}

export function saveToken(userId, accessToken, expiresIn) {
  const expiresAt = Date.now() + expiresIn * 1000 - 120_000; // 2min buffer
  localStorage.setItem(`sg_gcal_${userId}`, JSON.stringify({ accessToken, expiresAt }));
}

export function loadToken(userId) {
  try {
    const t = JSON.parse(localStorage.getItem(`sg_gcal_${userId}`));
    if (t?.expiresAt > Date.now()) return t.accessToken;
  } catch {}
  return null;
}

export function clearToken(userId) {
  localStorage.removeItem(`sg_gcal_${userId}`);
}

export async function connectGoogle(userId, onToken, onError) {
  if (!CLIENT_ID) { onError('no_client_id'); return; }
  await loadGIS();
  const client = makeClient(userId, resp => {
    if (resp.error) { onError(resp.error); return; }
    if (resp.access_token) onToken(resp.access_token, Number(resp.expires_in));
  });
  client.requestAccessToken({ prompt: 'consent' });
}

export async function silentRefresh(userId, onToken) {
  if (!CLIENT_ID) return false;
  try {
    await loadGIS();
    await new Promise((resolve, reject) => {
      const client = _clients[userId] || makeClient(userId, resp => {
        if (resp.access_token) { onToken(resp.access_token, Number(resp.expires_in)); resolve(); }
        else reject(resp.error);
      });
      if (!_clients[userId]) _clients[userId] = client;
      client.requestAccessToken({ prompt: '' });
      // GIS doesn't always call callback on silent failure, so timeout
      setTimeout(reject, 5000);
    });
    return true;
  } catch {
    return false;
  }
}

export async function fetchEvents(accessToken) {
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 401) throw new Error('token_expired');
  if (!res.ok) throw new Error('gcal_error');
  const data = await res.json();
  return data.items || [];
}

export function normalizeEvent(item, userId) {
  const color = USER_COLORS[userId] || '#818cf8';
  const startRaw = item.start?.dateTime || item.start?.date || '';
  const ymd  = startRaw.slice(0, 10);
  const time = item.start?.dateTime ? startRaw.slice(11, 16) : null;
  const entries = item.conferenceData?.entryPoints || [];
  const meetLink = entries.find(e => e.entryPointType === 'video')?.uri || null;
  const safeId = (item.id || '').replace(/[.#$[\]/]/g, '_');
  return { id: safeId, title: item.summary || '(Sin título)', ymd, time, userId, color, meetLink, htmlLink: item.htmlLink || null };
}
