import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import RichTextEditor from '../components/RichTextEditor';

const PRIORITY = {
  alta:  { label: 'Alta',  color: '#f87171' },
  media: { label: 'Media', color: '#faff05' },
  baja:  { label: 'Baja',  color: '#34d399' },
};

const SESSION_STATUS = {
  programada: { label: 'Programada', color: '#60a5fa' },
  realizada:  { label: 'Realizada',  color: '#34d399' },
  cancelada:  { label: 'Cancelada',  color: '#71717a' },
};

// ── Item row ───────────────────────────────────────────────────────────────────
function ItemRow({ item, readOnly, onMark, onUnmark, onDelete, onUpdate }) {
  const p = PRIORITY[item.priority] || PRIORITY.media;
  const isTreated = item.status === 'tratado';
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveEdit = () => {
    if (editText.trim() && editText.trim() !== item.text) onUpdate({ text: editText.trim() });
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl group bg-[#0d0d0d] border border-[#1a1a1a]">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />

      {/* Hablado badge */}
      {isTreated && (
        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: '#34d39920', color: '#34d399' }}>
          ✓ Hablado
        </span>
      )}

      {editing ? (
        <input value={editText} onChange={e => setEditText(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') { setEditText(item.text); setEditing(false); }
          }}
          autoFocus className="flex-1 bg-transparent text-white text-sm focus:outline-none border-b border-[#faff05]" />
      ) : (
        <span className={`flex-1 text-sm ${isTreated ? 'text-zinc-500' : 'text-white'}`}>
          {item.text}
        </span>
      )}

      {/* RIGHT: confirm delete OR (actions + priority pill) */}
      {confirmDelete ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-zinc-500 text-xs">¿Eliminar?</span>
          <button onClick={onDelete} className="text-[#f87171] text-xs font-medium hover:text-red-300 transition-colors">Sí</button>
          <button onClick={() => setConfirmDelete(false)} className="text-zinc-600 text-xs hover:text-white transition-colors">No</button>
        </div>
      ) : !editing && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!readOnly && (
            <>
              {isTreated ? (
                <button onClick={onUnmark} title="Mover a pendiente"
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-[#faff05] text-xs">↩</button>
              ) : (
                <button onClick={onMark} title="Marcar como hablado"
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-[#34d399] font-bold text-xs">✓</button>
              )}
              <button onClick={() => setConfirmDelete(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-zinc-700 hover:text-[#f87171]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button onClick={() => setEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-white">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          )}
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: p.color + '20', color: p.color }}>
            {p.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Add item inline form ───────────────────────────────────────────────────────
function AddItemForm({ onAdd }) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('media');
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ text: text.trim(), priority });
    setText('');
  };
  return (
    <form onSubmit={submit} className="flex gap-2 items-center mt-1">
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Agregar tema o consulta…"
        className="flex-1 bg-black border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05] transition-colors" />
      <div className="flex gap-1 flex-shrink-0">
        {Object.entries(PRIORITY).map(([k, v]) => (
          <button key={k} type="button" onClick={() => setPriority(k)}
            className="w-6 h-6 rounded-md border transition-all flex items-center justify-center"
            style={priority === k
              ? { background: v.color + '25', borderColor: v.color }
              : { background: 'transparent', borderColor: '#222' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: priority === k ? v.color : '#3f3f46' }} />
          </button>
        ))}
      </div>
      <button type="submit" disabled={!text.trim()}
        className="px-3 py-1.5 rounded-lg bg-[#faff05] text-black text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0">
        Agregar
      </button>
    </form>
  );
}

// ── Timezone helpers ───────────────────────────────────────────────────────────
const TIMEZONES = [
  { key: 'brighton',   label: 'Brighton',   tz: 'Europe/London' },
  { key: 'montenegro', label: 'Montenegro', tz: 'Europe/Podgorica' },
  { key: 'uruguay',    label: 'Uruguay',    tz: 'America/Montevideo' },
  { key: 'paraguay',   label: 'Paraguay',   tz: 'America/Asuncion' },
];

function getUTCFromLocalTime(dateStr, localHHMM, tz) {
  if (!localHHMM) return null;
  try {
    const [h, m] = localHHMM.split(':').map(Number);
    const refDate = dateStr || new Date().toISOString().slice(0, 10);
    const [y, mo, d] = refDate.split('-').map(Number);
    const approxUTC = Date.UTC(y, mo - 1, d, h, m, 0);
    const displayed = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
    }).format(new Date(approxUTC));
    const [dh, dm] = displayed.split(':').map(Number);
    const offsetMin = (dh * 60 + dm) - (h * 60 + m);
    return new Date(approxUTC - offsetMin * 60000);
  } catch { return null; }
}

function brightonFromUTC(utcDate) {
  if (!utcDate) return '';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London',
  }).format(utcDate);
}

// Returns "22:20" in 24h format
function fmtInTZ(utcDate, tz) {
  if (!utcDate) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
    }).format(utcDate);
  } catch { return null; }
}

// Returns "HH:MM" in 24h for input pre-fill
function fmtInTZ24(utcDate, tz) {
  if (!utcDate) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
    }).format(utcDate);
  } catch { return ''; }
}

// ── Meeting timezone widget ─────────────────────────────────────────────────────
function MeetingTimezones({ session, readOnly, updateMentoria }) {
  const [editingTz, setEditingTz] = useState(null);
  const [timeInput, setTimeInput] = useState('');

  const utcDate = getUTCFromLocalTime(session.date, session.meetingTimeBrighton, 'Europe/London');

  const handleEdit = (key, tz) => {
    if (readOnly) return;
    setTimeInput(utcDate ? fmtInTZ24(utcDate, tz) : '');
    setEditingTz(key);
  };

  const save = (tz) => {
    const val = timeInput.trim();
    if (val.match(/^\d{1,2}:\d{2}$/)) {
      const newUTC = getUTCFromLocalTime(session.date, val.padStart(5, '0'), tz);
      if (newUTC) updateMentoria(session.id, { meetingTimeBrighton: brightonFromUTC(newUTC) });
    } else if (!val) {
      updateMentoria(session.id, { meetingTimeBrighton: '' });
    }
    setEditingTz(null);
  };

  return (
    <div className="flex items-start gap-5 flex-shrink-0 pt-1">
      {TIMEZONES.map(({ key, label, tz }) => {
        const display = utcDate ? fmtInTZ(utcDate, tz) : null;
        const isEditing = editingTz === key;
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            <span className="text-zinc-700 text-[9px] uppercase tracking-wider font-medium">{label}</span>
            {isEditing ? (
              <input type="text" value={timeInput} onChange={e => setTimeInput(e.target.value)}
                onBlur={() => save(tz)} onKeyDown={e => e.key === 'Enter' && save(tz)}
                autoFocus placeholder="HH:MM"
                className="text-white text-sm font-mono font-bold bg-transparent border-b border-[#faff05] focus:outline-none w-14 text-center placeholder-zinc-700" />
            ) : (
              <button onClick={() => handleEdit(key, tz)} disabled={readOnly}
                className={`text-sm font-mono font-bold tabular-nums transition-colors ${
                  display
                    ? readOnly ? 'text-white cursor-default' : 'text-white hover:text-[#faff05] cursor-pointer'
                    : readOnly ? 'text-zinc-700 cursor-default' : 'text-zinc-700 hover:text-zinc-500 cursor-pointer'
                }`}>
                {display || '—:——'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Note block with debounced auto-save ────────────────────────────────────────
function NoteBlock({ label, block, sessionId, noteData, readOnly, updateMentoriaNotes, fill = false, editorMinH, editorMaxH, avatar }) {
  const [text, setText] = useState(noteData?.text || '');
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { setText(noteData?.text || ''); }, [noteData?.text]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleChange = (html) => {
    setText(html);
    setSaved(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateMentoriaNotes(sessionId, block, html);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  return (
    <div className={`flex flex-col gap-2 flex-1 min-w-0 ${fill ? 'min-h-0' : ''}`}>
      <div className="flex items-center justify-between flex-shrink-0">
        <span className="text-zinc-400 text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {!readOnly && saved && <span className="text-zinc-600 text-xs">Guardado ✓</span>}
          {avatar && <img src={avatar} alt="" draggable={false} className="rounded-xl object-cover object-top flex-shrink-0" style={{ width: 40, height: 40 }} />}
        </div>
      </div>
      <RichTextEditor
        value={text}
        onChange={handleChange}
        placeholder="Escribe tus notas aquí…"
        readOnly={readOnly}
        fill={fill}
        editorMinH={editorMinH}
        editorMaxH={editorMaxH}
      />
    </div>
  );
}

// ── Meeting link (video call) button ──────────────────────────────────────────
function MeetingLink({ session, readOnly, updateMentoria }) {
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState(session.meetingUrl || '');
  const [hovered, setHovered] = useState(false);
  const hasUrl = !!session.meetingUrl;

  const save = () => {
    updateMentoria(session.id, { meetingUrl: urlInput.trim() });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
          onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus placeholder="https://zoom.us/j/…"
          className="bg-black border border-[#faff05] rounded-lg px-2 py-1 text-white text-xs focus:outline-none w-44 transition-colors" />
      </div>
    );
  }

  return (
    <div className="group/cam flex flex-col items-center gap-1 pt-0.5">
      <button
        onClick={() => {
          if (hasUrl) window.open(session.meetingUrl, '_blank');
          else if (!readOnly) { setUrlInput(''); setEditing(true); }
        }}
        title={hasUrl ? session.meetingUrl : readOnly ? '' : 'Agregar link de reunión'}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`w-20 h-20 rounded-2xl overflow-hidden transition-opacity ${
          readOnly && !hasUrl ? 'opacity-30 cursor-default' : 'cursor-pointer'
        }`}>
        <img
          src={(hasUrl || hovered) ? '/admin/icon-meeting-active.png' : '/admin/icon-meeting-inactive.png'}
          alt="Meeting"
          className="w-full h-full object-cover" />
      </button>
      {hasUrl && !readOnly && (
        <button onClick={() => { setUrlInput(session.meetingUrl || ''); setEditing(true); }}
          className="text-[9px] text-zinc-700 hover:text-zinc-500 opacity-0 group-hover/cam:opacity-100 transition-opacity">
          editar
        </button>
      )}
    </div>
  );
}

// ── Session detail ─────────────────────────────────────────────────────────────
function SessionDetail({ session, readOnly, updateMentoria, addMentoriaItem, updateMentoriaItem, deleteMentoriaItem, updateMentoriaNotes }) {
  const items = Object.entries(session.items || {}).map(([id, item]) => ({ ...item, id }));
  const ord = { alta: 0, media: 1, baja: 2 };
  const allItems = [
    ...items.filter(i => i.status !== 'tratado').sort((a, b) => (ord[a.priority] ?? 1) - (ord[b.priority] ?? 1)),
    ...items.filter(i => i.status === 'tratado'),
  ];

  const [editingDate, setEditingDate] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:gap-8 md:px-6 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-zinc-600 text-sm font-medium">Sesión #{session.number}</span>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(SESSION_STATUS).map(([k, v]) => (
                <button key={k} type="button"
                  onClick={() => !readOnly && updateMentoria(session.id, { status: k })}
                  disabled={readOnly}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all"
                  style={session.status === k
                    ? { background: v.color + '20', borderColor: v.color, color: v.color }
                    : { background: 'transparent', borderColor: '#1a1a1a', color: '#3f3f46' }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {editingDate && !readOnly ? (
              <input type="date" defaultValue={session.date}
                onBlur={e => { updateMentoria(session.id, { date: e.target.value }); setEditingDate(false); }}
                autoFocus
                className="bg-transparent border-b border-[#faff05] text-white text-2xl font-bold focus:outline-none" />
            ) : (
              <button onClick={() => !readOnly && setEditingDate(true)} disabled={readOnly}
                className={`text-white text-2xl font-bold tracking-tight ${!readOnly ? 'hover:text-zinc-300 transition-colors' : ''}`}>
                {session.date || 'Sin fecha'}
              </button>
            )}
            {editingDuration && !readOnly ? (
              <input type="text" defaultValue={session.duration}
                onBlur={e => { updateMentoria(session.id, { duration: e.target.value }); setEditingDuration(false); }}
                autoFocus placeholder="ej. 60 min"
                className="bg-transparent border-b border-[#333] text-zinc-500 text-base focus:outline-none w-24" />
            ) : session.duration ? (
              <button onClick={() => !readOnly && setEditingDuration(true)} disabled={readOnly}
                className={`text-zinc-500 text-base ${!readOnly ? 'hover:text-zinc-300 transition-colors' : ''}`}>
                {session.duration}
              </button>
            ) : !readOnly ? (
              <button onClick={() => setEditingDuration(true)}
                className="text-zinc-700 text-sm hover:text-zinc-500 transition-colors">
                + duración
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex items-start gap-4 flex-wrap md:flex-shrink-0 md:flex-nowrap md:gap-5">
          <MeetingTimezones session={session} readOnly={readOnly} updateMentoria={updateMentoria} />
          <MeetingLink session={session} readOnly={readOnly} updateMentoria={updateMentoria} />
        </div>
      </div>

      {/* Antes de la sesión */}
      <div>
        <h3 className="text-zinc-500 text-xs uppercase tracking-wider font-medium mb-4">
          Antes de la sesión
        </h3>
        <div className="flex flex-col gap-2">
          {allItems.map(item => (
            <ItemRow key={item.id} item={item} readOnly={readOnly}
              onMark={() => updateMentoriaItem(session.id, item.id, { status: 'tratado' })}
              onUnmark={() => updateMentoriaItem(session.id, item.id, { status: 'pendiente' })}
              onDelete={() => deleteMentoriaItem(session.id, item.id)}
              onUpdate={u => updateMentoriaItem(session.id, item.id, u)} />
          ))}
          {!readOnly && <AddItemForm onAdd={data => addMentoriaItem(session.id, data)} />}
          {allItems.length === 0 && readOnly && (
            <span className="text-zinc-700 text-sm">Sin ítems</span>
          )}
        </div>
      </div>

      {/* Feedback de Angel */}
      <NoteBlock label="Feedback de Angel" block="angel" sessionId={session.id}
        noteData={session.notes?.angel} readOnly={readOnly} updateMentoriaNotes={updateMentoriaNotes}
        editorMinH="min-h-[120px]" editorMaxH="" avatar="/admin/angel-avatar.png" />

      {/* Durante la sesión */}
      <div>
        <h3 className="text-zinc-500 text-xs uppercase tracking-wider font-medium mb-4">
          Durante la sesión
        </h3>
        <div className="flex flex-col gap-4 md:flex-row">
          <NoteBlock label="Notas de Jero" block="jero" sessionId={session.id}
            noteData={session.notes?.jero} readOnly={readOnly} updateMentoriaNotes={updateMentoriaNotes}
            editorMinH="min-h-[220px]" editorMaxH="" avatar="/admin/jero-avatar.png" />
          <NoteBlock label="Notas de Kann" block="kann" sessionId={session.id}
            noteData={session.notes?.kann} readOnly={readOnly} updateMentoriaNotes={updateMentoriaNotes}
            editorMinH="min-h-[220px]" editorMaxH="" avatar="/admin/kann-avatar.png" />
        </div>
      </div>
    </div>
  );
}

// ── Main component — split panel layout ────────────────────────────────────────
export default function Mentoria({ readOnly = false }) {
  const {
    mentorias = [], addMentoria, updateMentoria, deleteMentoria,
    addMentoriaItem, updateMentoriaItem, deleteMentoriaItem, updateMentoriaNotes,
  } = useApp();
  const [selectedId, setSelectedId] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  const sorted = [...mentorias].sort((a, b) => (b.number || 0) - (a.number || 0));
  const activeSession = selectedId ? mentorias.find(m => m.id === selectedId) : null;

  // Clear selection if session no longer exists
  useEffect(() => {
    if (selectedId && !mentorias.find(m => m.id === selectedId)) setSelectedId(null);
  }, [mentorias, selectedId]);

  const sessionListContent = (
    <>
      <div className="flex items-center justify-between px-5 pt-6 pb-4 flex-shrink-0">
        <h2 className="text-base font-bold text-white tracking-tight">Coaching</h2>
        {!readOnly && (
          <button onClick={() => {
            const id = Date.now().toString();
            addMentoria({ id, date: '', duration: '', status: 'programada' });
            setSelectedId(id);
          }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#faff05] text-black text-xs font-bold hover:opacity-90 transition-opacity">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nueva
          </button>
        )}
      </div>

      {sorted.length === 0 && (
        <div className="text-zinc-700 text-xs py-8 text-center px-4">Sin sesiones</div>
      )}

      <div className="flex flex-col gap-1 px-2 pb-4">
        {sorted.map(session => {
          const isActive = session.id === selectedId;
          const isDeleting = deletingSessionId === session.id;
          const items = Object.values(session.items || {});
          const pendingCount = items.filter(i => i.status !== 'tratado').length;
          const st = SESSION_STATUS[session.status] || SESSION_STATUS.programada;

          if (isDeleting) {
            return (
              <div key={session.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#f87171]/20 bg-[#1a0808]">
                <span className="flex-1 text-xs text-zinc-500 truncate">¿Eliminar sesión #{session.number}?</span>
                <button onClick={() => {
                  deleteMentoria(session.id);
                  setDeletingSessionId(null);
                  if (selectedId === session.id) setSelectedId(null);
                }} className="text-[#f87171] text-xs font-medium hover:text-red-300 transition-colors flex-shrink-0">Sí</button>
                <button onClick={() => setDeletingSessionId(null)}
                  className="text-zinc-600 text-xs hover:text-white transition-colors flex-shrink-0">No</button>
              </div>
            );
          }

          return (
            <div key={session.id}
              onClick={() => setSelectedId(isActive ? null : session.id)}
              className="group/sess flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all cursor-pointer"
              style={isActive
                ? { border: '1.5px solid #faff05', background: 'transparent' }
                : { border: '1.5px solid #222', background: 'transparent' }}>
              <div className="flex flex-col flex-1 min-w-0 text-left">
                <span className="text-sm font-medium truncate text-white">
                  Sesión #{session.number}
                </span>
                {session.date && (
                  <span className="text-[11px] truncate text-zinc-600">
                    {new Date(session.date + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              {pendingCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold flex-shrink-0 text-[#faff05]">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#faff05]" />
                  {pendingCount}
                </span>
              )}
              <div className="relative flex-shrink-0">
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full transition-opacity ${
                  readOnly ? '' : 'group-hover/sess:opacity-0'
                }`}
                  style={{ background: st.color + '15', color: st.color }}>
                  {st.label}
                </span>
                {!readOnly && (
                  <button
                    onClick={e => { e.stopPropagation(); setDeletingSessionId(session.id); }}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/sess:opacity-100 transition-opacity text-zinc-500 hover:text-[#f87171]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const sessionDetailContent = activeSession ? (
    <SessionDetail
      key={activeSession.id}
      session={activeSession}
      readOnly={readOnly}
      updateMentoria={updateMentoria}
      addMentoriaItem={addMentoriaItem}
      updateMentoriaItem={updateMentoriaItem}
      deleteMentoriaItem={deleteMentoriaItem}
      updateMentoriaNotes={updateMentoriaNotes}
    />
  ) : null;

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row">

      {/* ── Sessions list panel ── */}
      <div className={`flex-col border-[#111] overflow-y-auto
        ${activeSession ? 'hidden md:flex md:w-72 md:flex-shrink-0 md:border-r' : 'flex flex-1'}`}>
        {sessionListContent}
      </div>

      {/* ── Session detail panel ── */}
      <div className={`flex-col overflow-y-auto flex-1 min-w-0
        ${activeSession ? 'flex' : 'hidden'}`}>
        {/* Back button — mobile only */}
        {activeSession && (
          <button onClick={() => setSelectedId(null)}
            className="md:hidden flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm text-zinc-400 hover:text-white transition-colors border-b border-[#111]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a sesiones
          </button>
        )}
        {sessionDetailContent ?? (
          <div className="h-full flex items-center justify-center">
            <span className="text-zinc-800 text-sm">Seleccioná una sesión</span>
          </div>
        )}
      </div>

    </div>
  );
}
