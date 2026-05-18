import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  isConfigured, connectGoogle, silentRefresh,
  fetchEvents, normalizeEvent, saveToken, loadToken, clearToken,
} from '../services/googleCalendar';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_HEADERS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const TEAM = [
  { id: 'kann', label: 'Kann', initials: 'K', bg: '#faff05', text: '#000' },
  { id: 'jero', label: 'Jero', initials: 'J', bg: '#60a5fa', text: '#000' },
  { id: 'facu', label: 'Facu', initials: 'F', bg: '#a78bfa', text: '#000' },
];

const toYMD = d =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const addContractMonths = (startYMD, months) => {
  const d = new Date(startYMD + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return toYMD(d);
};

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - startOffset + i);
    cells.push({ date: d, ymd: toYMD(d), inMonth: d.getMonth() === month });
  }
  return cells;
}

function useEventsMap(tasks, clients, meetings, gcalEvents, gcalFilters) {
  return useMemo(() => {
    const map = {};
    const push = (ymd, ev) => { (map[ymd] = map[ymd] || []).push(ev); };

    (tasks || []).forEach(t => {
      if (!t.deadline) return;
      const c = clients.find(x => x.id === t.clientId);
      push(t.deadline, { type: 'task', key: `task-${t.id}`, title: t.title, color: c?.color || '#faff05', clientName: c?.name || '', meta: t });
    });

    (clients || []).forEach(c => {
      if (!c.contractStart || !c.contractMonths) return;
      const end = addContractMonths(c.contractStart, Number(c.contractMonths));
      push(end, { type: 'contract', key: `contract-${c.id}`, title: `Fin contrato: ${c.name}`, color: c.color, clientName: c.name });
    });

    (meetings || []).forEach(m => {
      if (!m.date) return;
      const c = clients.find(x => x.id === m.clientId);
      push(m.date, { type: 'meeting', key: `meeting-${m.id}`, title: m.title, color: '#818cf8', clientName: c?.name || '', time: m.time, meetingId: m.id, raw: m });
    });

    gcalFilters.forEach(userId => {
      const user = TEAM.find(t => t.id === userId);
      const events = gcalEvents[userId] || [];
      events.forEach(e => {
        if (!e.ymd) return;
        push(e.ymd, {
          type: 'gcal',
          key: `gcal-${userId}-${e.id}`,
          title: e.title,
          color: e.color || user?.bg || '#818cf8',
          userId,
          time: e.time,
          meetLink: e.meetLink,
          htmlLink: e.htmlLink,
        });
      });
    });

    Object.keys(map).forEach(ymd => {
      map[ymd].sort((a, b) => {
        const order = { meeting: 0, gcal: 0, task: 1, contract: 2 };
        if (a.type !== b.type) return order[a.type] - order[b.type];
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      });
    });

    return map;
  }, [tasks, clients, meetings, gcalEvents, gcalFilters]);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const TaskIcon = () => (
  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const ContractIcon = () => (
  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const MeetingIcon = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const VideoIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={`${className} flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.724v6.552a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const GoogleIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const TYPE_ICON = { task: <TaskIcon />, contract: <ContractIcon />, meeting: <MeetingIcon />, gcal: <VideoIcon className="w-3 h-3" /> };

// ─── Event Pill ───────────────────────────────────────────────────────────────

function EventPill({ ev }) {
  return (
    <div className="flex items-center gap-0.5 px-1 py-px rounded text-[9px] font-medium truncate"
      style={{ background: ev.color + '22', color: ev.color, border: `1px solid ${ev.color}35` }}>
      {(ev.type === 'meeting' || ev.type === 'gcal') && ev.time && (
        <span className="opacity-60 flex-shrink-0 mr-0.5">{ev.time}</span>
      )}
      {ev.type === 'gcal' && <span className="opacity-50 mr-0.5">G</span>}
      <span className="truncate">{ev.title}</span>
    </div>
  );
}

// ─── Meet Link Button ─────────────────────────────────────────────────────────

function MeetLinkButton({ url, small }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className={`flex items-center gap-1 rounded-lg font-semibold transition-colors ${
        small
          ? 'px-2 py-0.5 text-[10px] bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
          : 'px-3 py-1.5 text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
      }`}>
      <VideoIcon className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      Meet
    </a>
  );
}

// ─── Google Calendar Bar ───────────────────────────────────────────────────────

function GoogleCalendarBar({ currentUser, gcalEvents, onConnect, onDisconnect, syncing }) {
  if (!isConfigured()) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#111] rounded-xl text-xs text-zinc-500">
        <GoogleIcon size={12} />
        <span>Google Calendar no configurado — agregá <code className="text-zinc-400">VITE_GOOGLE_CLIENT_ID</code> al archivo <code className="text-zinc-400">.env</code></span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-[#161616] border border-[#111] rounded-xl flex-wrap">
      <div className="flex items-center gap-1.5 text-zinc-500 text-xs flex-shrink-0">
        <GoogleIcon size={12} />
        <span>Google Calendar</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {TEAM.map(u => {
          const hasEvents = (gcalEvents[u.id] || []).length > 0;
          const isCurrentUser = u.id === currentUser;
          const isSyncing = syncing === u.id;

          return (
            <div key={u.id} className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ background: u.bg, color: u.text }}>
                {u.initials}
              </div>
              {hasEvents ? (
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Sincronizado
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600">Sin conectar</span>
              )}
              {isCurrentUser && (
                isSyncing ? (
                  <span className="text-[10px] text-zinc-500 animate-pulse">Sincronizando...</span>
                ) : hasEvents ? (
                  <button onClick={() => onDisconnect(u.id)}
                    className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-red-500/10">
                    Desconectar
                  </button>
                ) : (
                  <button onClick={() => onConnect(u.id)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-colors"
                    style={{ background: u.bg + '20', color: u.bg, border: `1px solid ${u.bg}40` }}>
                    Conectar
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── GCal Event Card ──────────────────────────────────────────────────────────

function GcalEventCard({ ev, compact }) {
  const user = TEAM.find(t => t.id === ev.userId);
  return (
    <div className={`rounded-xl transition-all ${compact ? 'p-3' : 'p-4 rounded-2xl'}`}
      style={{ background: ev.color + '12', border: `1px solid ${ev.color}25` }}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5" style={{ color: ev.color }}>
          <VideoIcon className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-medium text-sm truncate">{ev.title}</p>
            <MeetLinkButton url={ev.meetLink} small />
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {ev.time && <span className="text-xs text-zinc-500">{ev.time}</span>}
            {user && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: ev.color + 'cc' }}>
                <div className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold"
                  style={{ background: user.bg, color: user.text }}>
                  {user.initials}
                </div>
                {user.label}
              </span>
            )}
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-600">
              <GoogleIcon size={9} />
              Google Cal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Attendee Avatars ─────────────────────────────────────────────────────────

function AttendeeAvatars({ attendees, rsvp }) {
  if (!attendees?.length) return null;
  return (
    <div className="flex -space-x-1">
      {attendees.map(uid => {
        const u = TEAM.find(t => t.id === uid);
        if (!u) return null;
        const status = rsvp?.[uid];
        return (
          <div key={uid} className="relative" title={`${u.label}: ${status === 'yes' ? 'Asiste ✓' : status === 'no' ? 'No asiste ✗' : 'Sin confirmar'}`}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-[#111]"
              style={{ background: u.bg, color: u.text }}>
              {u.initials}
            </div>
            {status && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                style={{ background: status === 'yes' ? '#34d399' : '#f87171', color: '#000' }}>
                {status === 'yes' ? '✓' : '✗'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({ ev, currentUser, onEdit, onRsvp, compact }) {
  const [hovered, setHovered] = useState(false);
  const myRsvp = ev.raw?.rsvp?.[currentUser];
  const attendees = ev.raw?.attendees || [];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`rounded-xl cursor-pointer transition-all ${compact ? 'p-3' : 'p-4 rounded-2xl'}`}
      style={{ background: '#818cf812', border: '1px solid #818cf825' }}
    >
      <div className="flex items-start gap-3" onClick={() => onEdit(ev.raw)}>
        <div className={`flex-shrink-0 flex items-center justify-center rounded-xl ${compact ? 'mt-0.5' : 'w-8 h-8'}`}
          style={{ color: '#818cf8', ...(compact ? {} : { background: '#818cf820' }) }}>
          <MeetingIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-medium text-sm truncate">{ev.title}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {ev.raw?.meetLink && <MeetLinkButton url={ev.raw.meetLink} small />}
              <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {ev.clientName && <span className="text-xs" style={{ color: '#818cf8cc' }}>{ev.clientName}</span>}
            {ev.time && <span className="text-zinc-500 text-xs">{ev.time}{ev.raw?.duration ? ` · ${ev.raw.duration} min` : ''}</span>}
          </div>
          {ev.raw?.notes && !compact && (
            <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{ev.raw.notes}</p>
          )}
          {attendees.length > 0 && (
            <div className="mt-1.5">
              <AttendeeAvatars attendees={attendees} rsvp={ev.raw?.rsvp} />
            </div>
          )}
        </div>
      </div>

      {hovered && (
        <div className="mt-2.5 pt-2.5 border-t border-[#111] flex items-center gap-2"
          onClick={e => e.stopPropagation()}>
          <span className="text-zinc-500 text-xs">¿Vas a asistir?</span>
          <button
            onClick={() => onRsvp(ev.raw.id, myRsvp === 'yes' ? null : 'yes')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              myRsvp === 'yes' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400 hover:text-green-400 hover:bg-green-500/10'
            }`}>✓ Sí</button>
          <button
            onClick={() => onRsvp(ev.raw.id, myRsvp === 'no' ? null : 'no')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              myRsvp === 'no' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-500/10'
            }`}>✗ No</button>
          {myRsvp && (
            <span className={`text-xs ml-1 ${myRsvp === 'yes' ? 'text-green-500' : 'text-red-400'}`}>
              {myRsvp === 'yes' ? '· Confirmaste' : '· Declinaste'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">¿Eliminar reunión?</p>
        <p className="text-zinc-400 text-sm mb-6">Esta reunión se eliminará permanentemente.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Modal ────────────────────────────────────────────────────────────

function MeetingModal({ initial, prefillDate, clients, onClose, onSave, onDelete }) {
  const inp = 'w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#818cf8] placeholder-zinc-700';
  const [form, setForm] = useState({
    title: initial?.title || '',
    clientId: initial?.clientId || '',
    date: initial?.date || prefillDate || toYMD(new Date()),
    time: initial?.time || '10:00',
    duration: initial?.duration || 60,
    notes: initial?.notes || '',
    attendees: initial?.attendees || [],
    meetLink: initial?.meetLink || '',
  });
  const [confirmDel, setConfirmDel] = useState(false);
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleAttendee = (id) => {
    setForm(p => ({
      ...p,
      attendees: p.attendees.includes(id)
        ? p.attendees.filter(a => a !== id)
        : [...p.attendees, id],
    }));
  };

  if (confirmDel) {
    return <ConfirmDialog onConfirm={onDelete} onCancel={() => setConfirmDel(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[#111]">
          <h2 className="text-white font-semibold text-sm">{initial ? 'Editar reunión' : 'Nueva reunión'}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, duration: Number(form.duration) }); }} className="p-5 space-y-4">
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Título *</label>
            <input value={form.title} onChange={e => s('title', e.target.value)} required placeholder="Ej. Kick-off call..." className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Fecha *</label>
              <input type="date" value={form.date} onChange={e => s('date', e.target.value)} required className={inp} />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Hora</label>
              <input type="time" value={form.time} onChange={e => s('time', e.target.value)} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Cliente</label>
              <select value={form.clientId} onChange={e => s('clientId', e.target.value)} className={inp}>
                <option value="">Sin cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Duración (min)</label>
              <input type="number" value={form.duration} onChange={e => s('duration', e.target.value)} min={15} step={15} className={inp} />
            </div>
          </div>

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">Asistentes</label>
            <div className="flex items-center gap-2">
              {TEAM.map(u => {
                const selected = form.attendees.includes(u.id);
                return (
                  <button key={u.id} type="button" onClick={() => toggleAttendee(u.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      selected ? 'border-transparent scale-105' : 'border-[#111] opacity-50 hover:opacity-80'
                    }`}
                    style={selected ? { background: u.bg, color: u.text } : { background: 'transparent', color: '#71717a' }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: selected ? 'rgba(0,0,0,0.2)' : u.bg, color: u.text }}>
                      {u.initials}
                    </span>
                    {u.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Link de Meet (opcional)</label>
            <input value={form.meetLink} onChange={e => s('meetLink', e.target.value)}
              placeholder="https://meet.google.com/..." className={inp} />
          </div>

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Notas</label>
            <textarea value={form.notes} onChange={e => s('notes', e.target.value)} rows={3} className={`${inp} resize-none`} placeholder="Agenda, temas..." />
          </div>
          <div className="flex gap-2 pt-1">
            {initial && onDelete && (
              <button type="button" onClick={() => setConfirmDel(true)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                Eliminar
              </button>
            )}
            <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#818cf8', color: 'white' }}>
              {initial ? 'Guardar' : 'Agregar reunión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Event Renderer (shared by Day + Detail views) ───────────────────────────

function EventItem({ ev, currentUser, onEditMeeting, onRsvp, compact }) {
  if (ev.type === 'meeting') {
    return <MeetingCard ev={ev} currentUser={currentUser} onEdit={onEditMeeting} onRsvp={onRsvp} compact={compact} />;
  }
  if (ev.type === 'gcal') {
    return <GcalEventCard ev={ev} compact={compact} />;
  }
  return (
    <div className={`flex items-start gap-3 ${compact ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'}`}
      style={{ background: ev.color + '10', border: `1px solid ${ev.color}30` }}>
      {!compact && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: ev.color + '20', color: ev.color }}>
          {TYPE_ICON[ev.type]}
        </div>
      )}
      {compact && <div className="mt-0.5" style={{ color: ev.color }}>{TYPE_ICON[ev.type]}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">{ev.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {ev.clientName && <span className="text-xs font-medium" style={{ color: ev.color + 'cc' }}>{ev.clientName}</span>}
          <span className={`text-xs ${compact ? '' : 'px-2 py-px rounded-full bg-zinc-900'} text-zinc-500`}>
            {ev.type === 'task' ? 'Deadline' : 'Fin de contrato'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Day Detail (month view click) ───────────────────────────────────────────

function DayDetail({ ymd, events, onAddMeeting, onEditMeeting, onRsvp, onClose, currentUser }) {
  const date = new Date(ymd + 'T00:00:00');
  const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

  return (
    <div className="mt-4 bg-[#161616] border border-[#111] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold text-sm">
            {dayNames[date.getDay()]} {date.getDate()} de {MONTHS_ES[date.getMonth()]}
          </p>
          <p className="text-zinc-600 text-xs">{events.length} evento{events.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAddMeeting(ymd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: '#818cf8', color: 'white' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Reunión
          </button>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-4">Sin eventos en este día</p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <EventItem key={ev.key} ev={ev} currentUser={currentUser}
              onEditMeeting={onEditMeeting} onRsvp={onRsvp} compact />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ year, month, eventsMap, selectedDay, onDayClick, today }) {
  const cells = getMonthGrid(year, month);
  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-zinc-600 text-xs font-medium py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border border-[#111] rounded-2xl overflow-hidden">
        {cells.map((cell, i) => {
          const events = eventsMap[cell.ymd] || [];
          const isToday = cell.ymd === today;
          const isSelected = cell.ymd === selectedDay;
          const visible = events.slice(0, 2);
          const overflow = events.length - 2;
          return (
            <div key={i}
              onClick={() => onDayClick(cell.ymd)}
              className={`border-r border-b border-[#111] p-1.5 min-h-[90px] cursor-pointer transition-colors last:border-r-0
                ${!cell.inMonth ? 'opacity-25' : 'hover:bg-zinc-900/40'}
                ${isSelected ? 'bg-[#818cf8]/5 ring-1 ring-inset ring-[#818cf8]/30' : 'bg-[#080808]'}
              `}>
              <div className="flex items-center justify-end mb-1">
                <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium transition-all ${
                  isToday ? 'text-black font-bold' : cell.inMonth ? 'text-zinc-400' : 'text-zinc-700'
                }`} style={isToday ? { background: '#faff05' } : {}}>
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-px">
                {visible.map(ev => <EventPill key={ev.key} ev={ev} />)}
                {overflow > 0 && <div className="text-zinc-600 text-[8px] pl-1">+{overflow} más</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mini Month (year view) ───────────────────────────────────────────────────

function MiniMonth({ year, month, eventsMap, today, onClick }) {
  const cells = getMonthGrid(year, month);
  return (
    <button onClick={onClick}
      className="bg-[#161616] border border-[#111] rounded-2xl p-4 hover:border-[#1a1a1a] transition-colors text-left w-full">
      <p className="text-white text-xs font-semibold mb-2">{MONTHS_ES[month]}</p>
      <div className="grid grid-cols-7">
        {['L','M','M','J','V','S','D'].map((d, i) => (
          <div key={i} className="text-zinc-700 text-[7px] text-center mb-1">{d}</div>
        ))}
        {cells.map((cell, i) => {
          const evs = eventsMap[cell.ymd] || [];
          const isToday = cell.ymd === today;
          const dotColors = evs.slice(0, 3).map(e => e.color);
          return (
            <div key={i} className="flex flex-col items-center mb-px">
              <span className={`text-[8px] w-4 h-4 flex items-center justify-center rounded-full leading-none
                ${!cell.inMonth ? 'text-zinc-800' : 'text-zinc-500'}
                ${isToday ? 'font-bold' : ''}
              `} style={isToday ? { background: '#faff05', color: '#000' } : {}}>
                {cell.date.getDate()}
              </span>
              {evs.length > 0 && cell.inMonth && (
                <div className="flex gap-px mt-px">
                  {dotColors.map((col, j) => <div key={j} className="w-0.5 h-0.5 rounded-full" style={{ background: col }} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
}

function YearView({ year, eventsMap, today, onMonthClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, m) => (
        <MiniMonth key={m} year={year} month={m} eventsMap={eventsMap} today={today}
          onClick={() => onMonthClick(m)} />
      ))}
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ ymd, eventsMap, onAddMeeting, onEditMeeting, onRsvp, currentUser }) {
  const events = eventsMap[ymd] || [];
  const date = new Date(ymd + 'T00:00:00');
  const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white font-semibold">{dayNames[date.getDay()]} {date.getDate()} de {MONTHS_ES[date.getMonth()]}</p>
          <p className="text-zinc-600 text-xs mt-0.5">{events.length} evento{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => onAddMeeting(ymd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: '#818cf8', color: 'white' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva reunión
        </button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-zinc-900">
            <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm font-medium">Sin eventos</p>
          <p className="text-zinc-700 text-xs mt-1">Agregá una reunión para este día</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <EventItem key={ev.key} ev={ev} currentUser={currentUser}
              onEditMeeting={onEditMeeting} onRsvp={onRsvp} compact={false} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function CalendarModule() {
  const { tasks, clients, meetings, addMeeting, updateMeeting, deleteMeeting, gcalEvents, syncGcalEvents, clearGcalEvents } = useApp();
  const todayDate = new Date();
  const today = toYMD(todayDate);
  const currentUser = sessionStorage.getItem('sg_user') || 'kann';

  const [view, setView] = useState('month');
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth());
  const [currentDay, setCurrentDay] = useState(today);
  const [selectedDay, setSelectedDay] = useState(null);
  const [meetingModal, setMeetingModal] = useState(null);

  // Google Calendar state
  const [gcalFilters, setGcalFilters] = useState(['kann', 'jero', 'facu']);
  const [syncing, setSyncing] = useState(null);

  const eventsMap = useEventsMap(tasks, clients, meetings, gcalEvents, gcalFilters);

  const doSync = useCallback(async (userId, token) => {
    setSyncing(userId);
    try {
      const items = await fetchEvents(token);
      const normalized = items.map(item => normalizeEvent(item, userId));
      syncGcalEvents(userId, normalized);
    } catch (err) {
      if (err.message === 'token_expired') clearToken(userId);
    } finally {
      setSyncing(null);
    }
  }, [syncGcalEvents]);

  // Auto-sync on mount if token exists for current user
  useEffect(() => {
    const token = loadToken(currentUser);
    if (token) doSync(currentUser, token);
  }, [currentUser, doSync]);

  const handleConnect = useCallback((userId) => {
    connectGoogle(
      userId,
      (accessToken, expiresIn) => {
        saveToken(userId, accessToken, expiresIn);
        doSync(userId, accessToken);
      },
      (err) => console.warn('[GCal connect error]', err)
    );
  }, [doSync]);

  const handleDisconnect = useCallback((userId) => {
    clearToken(userId);
    clearGcalEvents(userId);
  }, [clearGcalEvents]);

  const toggleFilter = (userId) => {
    setGcalFilters(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleRsvp = (meetingId, status) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const rsvp = { ...(meeting.rsvp || {}), [currentUser]: status };
    if (status === null) delete rsvp[currentUser];
    updateMeeting(meetingId, { rsvp });
  };

  const navigatePrev = () => {
    if (view === 'month') {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
      else setCurrentMonth(m => m - 1);
      setSelectedDay(null);
    } else if (view === 'day') {
      const d = new Date(currentDay + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      setCurrentDay(toYMD(d));
    } else {
      setCurrentYear(y => y - 1);
    }
  };

  const navigateNext = () => {
    if (view === 'month') {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
      else setCurrentMonth(m => m + 1);
      setSelectedDay(null);
    } else if (view === 'day') {
      const d = new Date(currentDay + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      setCurrentDay(toYMD(d));
    } else {
      setCurrentYear(y => y + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setCurrentDay(today);
    if (view === 'month') setSelectedDay(today);
  };

  const switchView = (v) => {
    if (v === 'day') setCurrentDay(selectedDay || today);
    else if (v === 'month') {
      const d = new Date(currentDay + 'T00:00:00');
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
    setView(v);
  };

  const headerTitle = () => {
    if (view === 'year') return String(currentYear);
    if (view === 'month') return `${MONTHS_ES[currentMonth]} ${currentYear}`;
    const d = new Date(currentDay + 'T00:00:00');
    return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
  };

  const openAddMeeting = (prefillDate) => setMeetingModal({ prefillDate });
  const openEditMeeting = (meeting) => setMeetingModal({ initial: meeting });

  const handleSaveMeeting = (form) => {
    if (meetingModal?.initial) {
      updateMeeting(meetingModal.initial.id, form);
    } else {
      addMeeting({ ...form, createdBy: currentUser });
    }
    setMeetingModal(null);
  };

  const handleDeleteMeeting = () => {
    if (meetingModal?.initial) deleteMeeting(meetingModal.initial.id);
    setMeetingModal(null);
  };

  const defaultAddDate = view === 'day' ? currentDay : (selectedDay || today);
  const totalEvents = Object.values(eventsMap).reduce((s, arr) => s + arr.length, 0);
  const gcalCount = Object.values(gcalEvents).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" style={{ color: '#818cf8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-white font-semibold text-sm">Calendario</h2>
          <span className="text-zinc-600 text-xs">{totalEvents} eventos</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#080808] rounded-xl p-1">
            {[['day','Día'],['month','Mes'],['year','Año']].map(([v, label]) => (
              <button key={v} onClick={() => switchView(v)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  view === v ? 'font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                style={view === v ? { background: '#818cf8', color: 'white' } : {}}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={navigatePrev} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors">Hoy</button>
            <button onClick={navigateNext} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <span className="text-white font-semibold text-sm min-w-[170px] text-center">{headerTitle()}</span>
          <button onClick={() => openAddMeeting(defaultAddDate)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#818cf8', color: 'white' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva reunión
          </button>
        </div>
      </div>

      {/* Google Calendar Bar */}
      <GoogleCalendarBar
        currentUser={currentUser}
        gcalEvents={gcalEvents}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        syncing={syncing}
      />

      {/* Legend + Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-xs text-zinc-600 flex-wrap">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-700" /><span>Deadlines</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-700" /><span>Fin contrato</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ background: '#818cf840', border: '1px solid #818cf8' }} /><span>Reuniones</span></div>
          {gcalCount > 0 && (
            <div className="flex items-center gap-1.5"><GoogleIcon size={10} /><span>{gcalCount} de Google Cal</span></div>
          )}
        </div>

        {/* GCal Filters — only shown if someone has synced */}
        {gcalCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600 text-xs">Filtrar:</span>
            {TEAM.map(u => {
              const active = gcalFilters.includes(u.id);
              const hasEvents = (gcalEvents[u.id] || []).length > 0;
              if (!hasEvents) return null;
              return (
                <button key={u.id} onClick={() => toggleFilter(u.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                    active ? 'border-transparent' : 'border-[#111] opacity-40'
                  }`}
                  style={active ? { background: u.bg + '25', color: u.bg, border: `1px solid ${u.bg}40` } : {}}>
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{ background: u.bg, color: u.text }}>
                    {u.initials}
                  </div>
                  {u.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {view === 'month' && (
        <>
          <MonthView year={currentYear} month={currentMonth} eventsMap={eventsMap}
            selectedDay={selectedDay} onDayClick={ymd => setSelectedDay(p => p === ymd ? null : ymd)} today={today} />
          {selectedDay && (
            <DayDetail ymd={selectedDay} events={eventsMap[selectedDay] || []}
              onAddMeeting={openAddMeeting} onEditMeeting={openEditMeeting}
              onRsvp={handleRsvp} onClose={() => setSelectedDay(null)} currentUser={currentUser} />
          )}
        </>
      )}
      {view === 'day' && (
        <DayView ymd={currentDay} eventsMap={eventsMap}
          onAddMeeting={openAddMeeting} onEditMeeting={openEditMeeting}
          onRsvp={handleRsvp} currentUser={currentUser} />
      )}
      {view === 'year' && (
        <YearView year={currentYear} eventsMap={eventsMap} today={today}
          onMonthClick={(m) => { setCurrentMonth(m); setView('month'); setSelectedDay(null); }} />
      )}

      {meetingModal !== null && (
        <MeetingModal
          initial={meetingModal.initial}
          prefillDate={meetingModal.prefillDate}
          clients={clients}
          onClose={() => setMeetingModal(null)}
          onSave={handleSaveMeeting}
          onDelete={meetingModal.initial ? handleDeleteMeeting : undefined}
        />
      )}
    </div>
  );
}
