import React, { useState, useRef, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import KanbanBoard, { TaskModal, FloatViewButton } from '../modules/KanbanBoard';
import FinanzasPortal from '../modules/FinanzasPortal';
import Tasks, { AddTaskInline, TaskStats } from '../modules/Tasks';

import IdeaBank from '../modules/IdeaBank';
import ClientesDashboard from '../modules/ClientesDashboard';
import CalendarModule from '../modules/Calendar';
import LiveTasks from '../modules/LiveTasks';
import BrandSetup from '../modules/BrandSetup';
import Mentoria from '../modules/Mentoria';
import BoardsModule from '../modules/Boards';
import { useApp } from '../context/AppContext';
import UserAvatar from './UserAvatar';
import { TEAM_MEMBERS, TEAM_IDS, PRIORITY_STYLES, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../constants';

// Inject spin keyframe once at module level via a singleton style tag
if (typeof document !== 'undefined' && !document.getElementById('cc-spin-style')) {
  const s = document.createElement('style');
  s.id = 'cc-spin-style';
  s.textContent = '@keyframes ccSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { caught: false }; }
  static getDerivedStateFromError() { return { caught: true }; }
  render() { return this.state.caught ? (this.props.fallback ?? null) : this.props.children; }
}

function LoadingOverlay({ message = 'Loading' }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 select-none">
      <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.10)', borderTopColor: 'white', animation: 'ccSpin 0.75s linear infinite' }} />
      <span className="text-white/50 text-sm tracking-widest uppercase">{message}</span>
    </div>
  );
}

// ── Image button (left of header) ─────────────────────────────────────────────
function ImageButton({ onClick, isActive }) {
  return (
    <button onClick={onClick} className="relative flex-shrink-0 group focus:outline-none ml-4" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
      <img src="/admin/sin-activar.png" alt="" draggable={false}
        className={`h-[64px] w-auto object-contain select-none transition-opacity duration-150 ${isActive ? 'opacity-0' : 'group-hover:opacity-0'}`} />
      <img src="/admin/activado.png" alt="" draggable={false}
        className={`h-[64px] w-auto object-contain select-none absolute inset-0 transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
    </button>
  );
}

// ── REC dot icon ───────────────────────────────────────────────────────────────
const RecDot = () => (
  <span className="relative flex items-center justify-center w-3.5 h-3.5 flex-shrink-0">
    <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
    <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
  </span>
);

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS_MAIN = [
  {
    id: 'kanban', label: 'Kanban',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    id: 'calendar', label: 'Calendar',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'boards', label: 'Boards',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
];

const TAB_LIVE = { id: 'live', label: 'Live Tasks' };

const TABS_RESTRICTED = [
  {
    id: 'clientes', label: 'Directory',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'finanzas', label: 'Finance',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'mentoria', label: 'Coaching',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
];

const relativeTime = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
};

// ── Account dropdown (includes notifications) ──────────────────────────────────
function AccountDropdown({ currentUser, onLogout }) {
  const { notifications, markAllRead, globalOnlineUsers } = useApp();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const ref = useRef(null);
  const info = TEAM_MEMBERS[currentUser] || { label: currentUser, initials: '?', bg: '#444', text: '#fff' };
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); setShowNotifs(false); setPinned(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMouseEnter = () => { if (!pinned) setOpen(true); };
  const handleMouseLeave = () => { if (!pinned) { setOpen(false); setShowNotifs(false); } };
  const handleClick = () => {
    if (pinned) { setPinned(false); setOpen(false); setShowNotifs(false); }
    else { setPinned(true); setOpen(true); }
  };

  const handleNotifsClick = () => {
    if (!showNotifs && unread > 0) markAllRead();
    setShowNotifs(o => !o);
  };

  return (
    <div className="relative" ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>

      {/* Avatar button */}
      <button onClick={handleClick}
        className="relative flex items-center justify-center focus:outline-none" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <img src={`/admin/${currentUser}-avatar.png`} alt="" draggable={false} className="h-[64px] w-auto object-contain select-none" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-black text-[9px] font-bold flex items-center justify-center"
            style={{ background: '#faff05' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-4 bg-[#080808] border border-[#111] rounded-2xl shadow-2xl overflow-hidden w-80" style={{ zIndex: 200 }}>
          {/* Account header — large avatar, smaller teammates below */}
          {(() => {
            const GreenDot = () => (
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 ml-1.5 flex-shrink-0" />
            );
            return (
              <div className="relative border-b border-[#111]">
                {/* Big photo with 3x zoom on hover */}
                <div className="overflow-hidden w-full h-80">
                  <img src={`/admin/${currentUser}-avatar.png`} alt="" draggable={false}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.1] cursor-zoom-in" />
                </div>
                {/* Name overlaid on top of photo */}
                <div className="absolute top-3 left-0 right-0 flex justify-center items-center pointer-events-none"
                  style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))' }}>
                  <span className="text-white font-semibold text-base">{info.label}</span>
                  {globalOnlineUsers[currentUser] && <GreenDot />}
                </div>
              </div>
            );
          })()}

          {/* Notificaciones toggle row */}
          <button onClick={handleNotifsClick}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors border-b border-[#111]">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-zinc-300 text-sm">Notificaciones</span>
              {unread > 0 && (
                <span className="w-4 h-4 rounded-full text-black text-[9px] font-bold flex items-center justify-center"
                  style={{ background: '#faff05' }}>
                  {unread}
                </span>
              )}
            </div>
            <svg className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 ${showNotifs ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Notifications list — most recent first */}
          {showNotifs && (
            <div className="max-h-80 overflow-y-auto border-b border-[#111]">
              {notifications.length === 0 ? (
                <div className="px-4 py-4 text-center text-zinc-600 text-xs">Sin actividad aún</div>
              ) : (
                notifications
                  .slice()
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .slice(0, 30)
                  .map(n => {
                    const u = TEAM_MEMBERS[n.user] || { initials: (n.user || '?').slice(0, 1).toUpperCase(), bg: '#3f3f46', text: '#fff' };
                    return (
                      <div key={n.id} className="flex gap-2.5 px-4 py-2.5 border-b border-[#111]/50 last:border-0 hover:bg-zinc-900/30 transition-colors">
                        <UserAvatar userId={n.user} size={24} className="flex-shrink-0 mt-0.5"
                          style={!['kann','jero','facu','angel'].includes(n.user) ? { background: u.bg, color: u.text } : {}} />
                        <div className="min-w-0">
                          <p className="text-zinc-400 text-xs leading-relaxed">
                            {n.action}
                            {n.location && <span className="text-zinc-600"> · {n.location}</span>}
                          </p>
                          <p className="text-zinc-700 text-[10px] mt-0.5">{relativeTime(n.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* Salir */}
          <button onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Salir
          </button>
        </div>
      )}
    </div>
  );
}

// ── Kanban section (with inline filter bar) ────────────────────────────────────

function TodayModal({ onClose }) {
  const { tasks, clients, currentUser, moveTask } = useApp();
  const [othersOpen, setOthersOpen] = useState(false);

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline + 'T00:00:00') - new Date()) / 86400000);
  };

  const byDeadline = (a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  };

  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');
  const mine = active.filter(t => (t.assignees || []).includes(currentUser)).sort(byDeadline);
  const others = active.filter(t => !(t.assignees || []).includes(currentUser)).sort(byDeadline);

  const renderRow = (task, showActions) => {
    const client = clients.find(c => c.id === task.clientId);
    const days = daysLeft(task.deadline);
    const isDone = task.status === 'done';
    return (
      <div key={task.id}
        className={`group relative flex items-center gap-3 px-4 py-3 border-b border-[#111] last:border-0 overflow-hidden ${isDone ? 'opacity-40' : ''} transition-colors`}>
        <div className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[32px] transition-transform duration-200 group-hover:-translate-x-1"
          style={{ background: client?.color || '#333' }} />
        <div className="flex-1 min-w-0 transition-transform duration-200 group-hover:-translate-x-1">
          <p className={`text-sm font-medium leading-tight ${isDone ? 'line-through text-zinc-500' : 'text-white'}`}>{task.title}</p>
          {client && <p className="text-zinc-600 text-xs mt-0.5">{client.name}</p>}
        </div>
        {task.deadline && (
          <span className={`text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-full transition-all duration-200 group-hover:opacity-0 group-hover:pointer-events-none ${
            isDone ? 'text-zinc-600' :
            days < 0 ? 'bg-red-500/20 text-red-400' :
            days === 0 ? 'bg-orange-500/20 text-orange-400' :
            days <= 3 ? 'bg-yellow-500/20 text-yellow-400' : 'text-zinc-500'
          }`}>
            {days === null ? '' : days < 0 ? `${Math.abs(days)}d late` : days === 0 ? 'Today' : `${days}d`}
          </span>
        )}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 transition-all duration-200 group-hover:opacity-0 group-hover:pointer-events-none`}
          style={{ background: TASK_STATUS_COLORS[task.status] + '22', color: TASK_STATUS_COLORS[task.status] }}>
          {TASK_STATUS_LABELS[task.status]}
        </span>
        {showActions && !isDone && (
          <div className="absolute right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {task.status !== 'inprogress' && (
              <button onClick={() => moveTask(task.id, 'inprogress')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-black whitespace-nowrap"
                style={{ background: '#faff05' }}>
                Process
              </button>
            )}
            {task.status !== 'done' && (
              <button onClick={() => moveTask(task.id, 'done')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                Done ✓
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const userName = TEAM_MEMBERS[currentUser]?.label || currentUser;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#111] flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-lg">¿Qué hago hoy?</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Tasks for {userName} · sorted by deadline</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mine.length > 0 && (
            <div>
              <p className="text-zinc-600 text-[10px] uppercase tracking-wider px-4 pt-4 pb-2">
                Mis tareas · {mine.length}
              </p>
              {mine.map(t => renderRow(t, true))}
            </div>
          )}
          {others.length > 0 && (
            <div>
              <button
                onClick={() => setOthersOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 pt-4 pb-2 hover:bg-white/[0.02] transition-colors">
                <p className="text-zinc-600 text-[10px] uppercase tracking-wider">
                  Otras tareas · {others.length}
                </p>
                <svg className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 ${othersOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {othersOpen && others.map(t => renderRow(t, false))}
            </div>
          )}
          {done.length > 0 && (
            <div>
              <p className="text-zinc-600 text-[10px] uppercase tracking-wider px-4 pt-4 pb-2">
                Completadas · {done.length}
              </p>
              {done.sort(byDeadline).map(t => renderRow(t, false))}
            </div>
          )}
          {tasks.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-16">No hay tareas</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanSection({ showIntro, onIntroDone }) {
  const { tasks, clients, fbReady } = useApp();
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showToday, setShowToday] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const filterWrapRef = useRef(null);
  const [statsEntered, setStatsEntered] = useState(!showIntro);

  useEffect(() => {
    if (!showIntro) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setStatsEntered(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!fbReady) return <LoadingOverlay message="Loading tasks…" />;

  const clientsWithTasks = clients.filter(c => tasks.some(t => t.clientId === c.id));
  const filters = { search, filterClient, filterAssignee, filterPriority, filterStatus: 'all' };
  const hasActive = search || filterClient !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all';
  const activeCount = [filterClient !== 'all', filterAssignee !== 'all', filterPriority !== 'all', !!search].filter(Boolean).length;

  const resetFilters = () => {
    setSearch(''); setFilterClient('all'); setFilterAssignee('all'); setFilterPriority('all');
  };

  const btnCls = (active) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
      active ? 'bg-[#faff05] text-black border-[#faff05]' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'
    }`;

  return (
    <div className="space-y-5">
      <div style={{
        opacity: statsEntered ? 1 : 0,
        transform: statsEntered ? 'none' : 'translateY(10px)',
        transition: 'opacity 400ms ease-out, transform 400ms ease-out',
      }}>
        <TaskStats />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="bg-black border border-[#111] rounded-full pl-8 pr-3 py-1.5 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-[#faff05] w-36 transition-colors"
              placeholder="Buscar tarea..." />
          </div>

          <div ref={filterWrapRef} className="relative"
            onMouseEnter={() => setShowFilters(true)}
            onMouseLeave={() => setShowFilters(false)}>
            <button onClick={() => setShowFilters(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                activeCount > 0
                  ? 'bg-[#faff05] text-black border-[#faff05]'
                  : 'bg-black text-zinc-500 border-[#111] hover:border-[#faff05] hover:text-[#faff05]'
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filtros
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-black text-[#faff05] text-[9px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute top-full left-0 mt-1 bg-black border border-[#111] rounded-2xl p-4 z-50 shadow-2xl min-w-max space-y-4">
                <div>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">Asignado</p>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => setFilterAssignee('all')} className={btnCls(filterAssignee === 'all')}>Todos</button>
                    {Object.entries(TEAM_MEMBERS).map(([key, a]) => (
                      <button key={key} onClick={() => setFilterAssignee(filterAssignee === key ? 'all' : key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filterAssignee === key ? 'border-transparent text-black' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'}`}
                        style={filterAssignee === key ? { background: a.bg } : {}}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: a.bg, color: a.text }}>{a.initials}</div>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">Prioridad</p>
                  <div className="flex gap-1">
                    {['all', 'Alta', 'Media', 'Baja'].map(p => (
                      <button key={p} onClick={() => setFilterPriority(filterPriority === p ? 'all' : p)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filterPriority === p ? 'border-transparent text-black' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'}`}
                        style={filterPriority === p ? { background: p === 'all' ? '#faff05' : PRIORITY_STYLES[p]?.color } : {}}>
                        {p === 'all' ? 'Todas' : p}
                      </button>
                    ))}
                  </div>
                </div>

                {clientsWithTasks.length > 0 && (
                  <div>
                    <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">Cliente</p>
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => setFilterClient('all')} className={btnCls(filterClient === 'all')}>
                        Todos <span className="opacity-60">({tasks.length})</span>
                      </button>
                      {clientsWithTasks.map(c => {
                        const count = tasks.filter(t => t.clientId === c.id).length;
                        return (
                          <button key={c.id} onClick={() => setFilterClient(filterClient === c.id ? 'all' : c.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filterClient === c.id ? 'text-black border-transparent' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'}`}
                            style={filterClient === c.id ? { background: c.color } : {}}>
                            {c.name} <span className="opacity-60">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {hasActive && (
                  <button onClick={resetFilters} className="text-xs text-zinc-600 hover:text-[#faff05] transition-colors">
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <button onClick={() => setShowToday(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-zinc-400 bg-black border border-[#111] hover:border-[#faff05] hover:text-[#faff05] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            ¿Qué hago hoy?
          </button>
          <FloatViewButton tasks={tasks} clients={clients} />
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-black hover:opacity-90 transition-opacity"
            style={{ background: '#faff05' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva tarea
          </button>
        </div>
      </div>

      <KanbanBoard filters={filters} showIntro={showIntro} onIntroDone={onIntroDone} />

      <div className="border-t border-[#111] pt-8 hidden sm:block"><IdeaBank /></div>

      {showAdd && <TaskModal onClose={() => setShowAdd(false)} />}
      {showToday && <TodayModal onClose={() => setShowToday(false)} />}
    </div>
  );
}

// ── Header (exported for App.jsx to render outside the rectangle) ──────────────
export function AppHeader({ activeTab, setActiveTab, currentUser, onLogout }) {
  const canSeeRestricted = currentUser !== 'facu';

  const tabCls = (id) =>
    `flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
      activeTab === id ? 'text-black' : 'text-zinc-400 hover:text-white'
    }`;

  const mobileTabCls = (id) =>
    `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
      activeTab === id ? 'text-black' : 'text-zinc-400'
    }`;

  return (
    <>
      {/* ── Mobile header (< md): 2-row layout ─────────────────────────────── */}
      <div className="flex flex-col gap-1.5 w-full md:hidden">
        {/* Row 1: Synced logo (left) · Directorio · Finanzas icons · Account (right) */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Synced logo → lobby */}
          <button onClick={() => setActiveTab('lobby')}
            className="relative flex-shrink-0 group focus:outline-none"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <img src="/admin/sin-activar.png" alt="Lobby" draggable={false}
              className={`h-[64px] w-auto object-contain select-none transition-opacity duration-150 ${activeTab === 'lobby' ? 'opacity-0' : ''}`} />
            <img src="/admin/activado.png" alt="" draggable={false}
              className={`h-[64px] w-auto object-contain select-none absolute inset-0 transition-opacity duration-150 ${activeTab === 'lobby' ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          {/* Right: Directorio + Finanzas (icon-only) + Account */}
          <div className="flex items-center gap-1">
            {canSeeRestricted && TABS_RESTRICTED.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 flex-shrink-0 ${activeTab === tab.id ? 'text-black' : 'text-zinc-400'}`}
                style={activeTab === tab.id ? { background: '#faff05' } : {}}>
                {tab.icon}
              </button>
            ))}
            <ErrorBoundary><AccountDropdown currentUser={currentUser} onLogout={onLogout} /></ErrorBoundary>
          </div>
        </div>
        {/* Row 2: Live Tasks · Kanban · Calendar · Ideas (icon only) */}
        <div className="flex items-center justify-center">
          <nav className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab(TAB_LIVE.id)}
              className={mobileTabCls(TAB_LIVE.id)}
              style={activeTab === TAB_LIVE.id ? { background: '#faff05' } : {}}>
              <RecDot />
              {TAB_LIVE.label}
            </button>
            {TABS_MAIN.filter(t => t.id === 'kanban' || t.id === 'calendar').map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={mobileTabCls(tab.id)}
                style={activeTab === tab.id ? { background: '#faff05' } : {}}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <button onClick={() => setActiveTab('ideas')}
              className={`flex items-center justify-center px-2 py-1.5 rounded-full transition-all duration-200 flex-shrink-0 ${activeTab === 'ideas' ? 'text-black' : 'text-zinc-500'}`}
              style={activeTab === 'ideas' ? { background: '#faff05' } : {}}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          </nav>
        </div>
      </div>

      {/* ── Desktop header (>= md): image left · nav pill next to it · account right ── */}
      <div className="hidden md:flex items-center w-full">
        {/* Left: custom image button → lobby, sits on top of nav pill */}
        <div className="relative z-10 flex-shrink-0 mt-2">
          <ImageButton onClick={() => setActiveTab('lobby')} isActive={activeTab === 'lobby'} />
        </div>

        {/* Nav pill: pulled left with negative margin so background extends behind ImageButton */}
        <div className="-ml-10">
          <nav className="flex items-center bg-black/40 backdrop-blur-sm rounded-full p-1 pl-12 pr-6 border border-white/5">
            <div className="flex items-center gap-0.5 -ml-4">
              {/* Live Tasks */}
              <button onClick={() => setActiveTab(TAB_LIVE.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === TAB_LIVE.id ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                style={activeTab === TAB_LIVE.id ? { background: '#faff05' } : {}}>
                <RecDot />
                {TAB_LIVE.label}
              </button>
              {/* Separator */}
              <div className="w-px h-4 bg-white/10 mx-0.5 flex-shrink-0" />
              {/* Kanban + Calendar */}
              {[
                TABS_MAIN.find(t => t.id === 'kanban'),
                TABS_MAIN.find(t => t.id === 'calendar'),
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={tabCls(tab.id)}
                  style={activeTab === tab.id ? { background: '#faff05' } : {}}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
              {/* Separator */}
              <div className="w-px h-4 bg-white/10 mx-0.5 flex-shrink-0" />
              {/* Boards */}
              {[TABS_MAIN.find(t => t.id === 'boards')].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={tabCls(tab.id)}
                  style={activeTab === tab.id ? { background: '#faff05' } : {}}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Right pill — direct flex child so it aligns on the same center axis as the left pill */}
        {canSeeRestricted && (
          <div className="ml-auto -mr-10">
            <nav className="flex items-center bg-black/20 backdrop-blur-sm rounded-full p-1 pr-12 border border-white/5">
              <div className="flex items-center gap-0.5 ml-4">
                {TABS_RESTRICTED.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={tabCls(tab.id)}
                    style={activeTab === tab.id ? { background: '#faff05' } : {}}>
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        )}
        {/* Right avatar — direct flex child, z-10 sits on top of right pill */}
        <div className={`${canSeeRestricted ? '' : 'ml-auto'} mt-[3px] mr-4 relative z-[500]`}>
          <ErrorBoundary><AccountDropdown currentUser={currentUser} onLogout={onLogout} /></ErrorBoundary>
        </div>
      </div>
    </>
  );
}

// ── Permission denied modal (for Angel viewer account) ─────────────────────────
function PermissionDeniedModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative bg-[#111] border border-[#222] rounded-2xl px-8 py-8 max-w-xs w-full mx-4 text-center shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-white text-base font-bold mb-1">Sin permiso</h2>
        <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
          Tu cuenta es de solo lectura.<br />No podés modificar esta sección.
        </p>
        <button onClick={onClose}
          className="w-full py-2.5 bg-[#faff05] text-black text-sm font-bold rounded-xl hover:opacity-90 transition-opacity">
          Entendido
        </button>
      </div>
    </div>
  );
}

// ── Scroll fade container ──────────────────────────────────────────────────────
function ScrollFadeContainer({ children, onClickCapture }) {
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const ref = useRef(null);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setAtTop(el.scrollTop < 4);
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex-1 relative min-h-0 overflow-hidden" onClickCapture={onClickCapture}>
      <div ref={ref} className="absolute inset-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6" onScroll={update}>
        {children}
      </div>
      {/* Top fade — hidden when at top */}
      <div className="absolute top-0 inset-x-0 h-20 pointer-events-none z-10 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to bottom, #000 0%, transparent 100%)',
          opacity: atTop ? 0 : 1,
        }} />
      {/* Bottom fade — hidden when at bottom */}
      <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none z-10 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, #000 0%, transparent 100%)',
          opacity: atBottom ? 0 : 1,
        }} />
    </div>
  );
}

// ── Lobby social icons & team avatars ─────────────────────────────────────────
const SOCIAL_LINKS = [
  { id: 'linkedin',  label: 'LinkedIn',  href: 'https://www.linkedin.com/company/synced-studio/',
    inactive: '/admin/icon-linkedin-inactive.png',  active: '/admin/icon-linkedin-active.png' },
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/synced.graphics/',
    inactive: '/admin/icon-instagram-inactive.png', active: '/admin/icon-instagram-active.png' },
  { id: 'tiktok',   label: 'TikTok',    href: 'https://www.tiktok.com/@synced.graphics',
    inactive: '/admin/icon-tiktok-inactive.png',    active: '/admin/icon-tiktok-active.png' },
  { id: 'threads',  label: 'Threads',   href: 'https://www.threads.com/@synced.graphics',
    inactive: '/admin/icon-threads-inactive.png',   active: '/admin/icon-threads-active.png' },
  { id: 'portfolio',label: 'Portfolio', href: 'https://www.synced.graphics/portfolio',
    inactive: '/admin/icon-portfolio-inactive.png', active: '/admin/icon-portfolio-active.png' },
  { id: 'meeting',  label: 'Meeting',   href: 'https://meet.google.com/',
    inactive: '/admin/icon-meeting-inactive.png',   active: '/admin/icon-meeting-active.png' },
];

function LobbySocialIcons() {
  return (
    <div className="flex flex-row" style={{ gap: '4px' }}>
      {SOCIAL_LINKS.map(({ id, label, href, inactive, active }) => (
        <a key={id} href={href} target="_blank" rel="noopener noreferrer" title={label}
          className="group relative block flex-shrink-0"
          style={{ width: '64px', height: '64px' }}>
          <img src={inactive} alt={label} draggable={false}
            className="absolute inset-0 w-full h-full object-contain select-none transition-opacity duration-200 group-hover:opacity-0" />
          <img src={active} alt={label} draggable={false}
            className="absolute inset-0 w-full h-full object-contain select-none transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
        </a>
      ))}
    </div>
  );
}

function useLobbyPresence() {
  const { globalOnlineUsers } = useApp();
  const [presenceSnap, setPresenceSnap] = useState({});
  useEffect(() => {
    const r = ref(db, 'presence/global');
    const unsub = onValue(r, snap => setPresenceSnap(snap.exists() ? snap.val() : {}), () => {});
    return () => unsub();
  }, []);
  return { globalOnlineUsers, presenceSnap };
}

const LOBBY_TEAM = ['jero', 'kann', 'facu', 'angel'];

const LOBBY_ROLES = { jero: 'Founder', kann: 'Co-founder', facu: 'Designer', angel: 'Coach' };
const LOBBY_NAMES = { jero: 'Jero', kann: 'Kann', facu: 'Facu', angel: 'Angel' };

function LobbyTeamAvatars({ currentUser }) {
  const { globalOnlineUsers, presenceSnap } = useLobbyPresence();
  const [hovered, setHovered] = useState(null);
  const others = LOBBY_TEAM.filter(uid => uid !== currentUser);
  const ZOOMED = 160; // 64 * 2.5
  const TEXT_W = 130;

  return (
    <div className="flex flex-col" style={{ gap: '8px' }}>
      {others.map(uid => {
        const isOnline = !!globalOnlineUsers[uid];
        const name = LOBBY_NAMES[uid] || TEAM_MEMBERS[uid]?.label || uid;
        const role = LOBBY_ROLES[uid] || '';
        const ls = presenceSnap[uid]?.lastSeen;
        const isHov = hovered === uid;

        return (
          <div key={uid} className="relative flex items-start"
            style={{
              zIndex: isHov ? 50 : 0,
              marginBottom: isHov ? `${ZOOMED - 64}px` : '0px',
              transition: 'margin-bottom 300ms ease',
            }}
            onMouseEnter={() => setHovered(uid)}
            onMouseLeave={() => setHovered(null)}>

            {/* Card background — extends left of the photo */}
            {isHov && (
              <div className="absolute pointer-events-none"
                style={{
                  right: 0,
                  top: 0,
                  width: `${TEXT_W + ZOOMED}px`,
                  height: `${ZOOMED}px`,
                  background: 'rgba(8, 12, 18, 0.82)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '22px',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  paddingLeft: '18px',
                  paddingRight: `${ZOOMED + 10}px`,
                  gap: '5px',
                }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '15px', lineHeight: 1.1 }}>{name}</span>
                <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role}</span>
                <span style={{ color: isOnline ? '#4ade80' : 'rgba(255,255,255,0.25)', fontSize: '10px' }}>
                  {isOnline ? 'activo ahora' : ls ? `última vez: ${timeAgo(ls)}` : 'sin actividad reciente'}
                </span>
              </div>
            )}

            {/* Photo — on top of card */}
            <div className="cursor-default flex-shrink-0" style={{ position: 'relative', zIndex: 2 }}>
              <img src={`/admin/${uid}-avatar.png`} alt={name} draggable={false}
                className={`rounded-2xl object-cover object-top select-none transition-transform duration-300 origin-top-right ${isHov ? 'scale-[2.5]' : 'scale-100'}`}
                style={{ width: '64px', height: '64px' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return null;
  const diff = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}


const LOBBY_AVATAR_USERS = new Set(['kann', 'jero', 'facu', 'angel']);

function Lobby({ setActiveTab }) {
  const { currentUser } = useApp();

  return (
    <div className="flex-1 flex min-h-0 select-none relative" style={{ padding: '1.2%' }}>
      <img src="/admin/fondo.jpg" alt="" draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />

      <div className="absolute hidden md:block" style={{ left: '16px', top: '1.2%', zIndex: 10 }}>
        <LobbySocialIcons />
      </div>

      <div className="absolute hidden md:block" style={{ right: '16px', top: '1.2%', zIndex: 10 }}>
        <ErrorBoundary><LobbyTeamAvatars currentUser={currentUser} /></ErrorBoundary>
      </div>

      <div className="absolute md:hidden" style={{ left: '1rem', top: '4%', zIndex: 10 }}>
        <div className="flex flex-col" style={{ gap: '2.5vw' }}>
          {SOCIAL_LINKS.map(({ id, label, href, inactive }) => (
            <a key={id} href={href} target="_blank" rel="noopener noreferrer" title={label}
              className="block flex-shrink-0" style={{ width: '15vw', height: '15vw' }}>
              <img src={inactive} alt={label} draggable={false} className="w-full h-full object-contain select-none" />
            </a>
          ))}
        </div>
      </div>

      <div className="absolute md:hidden" style={{ right: '1rem', top: '4%', zIndex: 10 }}>
        <div className="flex flex-col" style={{ gap: '2.5vw' }}>
          {LOBBY_TEAM.filter(uid => uid !== currentUser).map(uid => (
            <div key={uid} className="flex-shrink-0" style={{ width: '15vw', height: '15vw' }}>
              <img src={`/admin/${uid}-avatar.png`} alt={uid} draggable={false}
                className="rounded-full object-cover object-top select-none w-full h-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Directory section (Clients + Brand Setup sub-tabs) ────────────────────────
function DirectorySection() {
  const [sub, setSub] = useState('clients');
  const btnCls = (active) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
      active ? 'bg-[#faff05] text-black border-[#faff05]' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'
    }`;
  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        <button onClick={() => setSub('clients')} className={btnCls(sub === 'clients')}>Directory</button>
        <button onClick={() => setSub('brandsetup')} className={btnCls(sub === 'brandsetup')}>Brand Setup</button>
      </div>
      {sub === 'clients' ? <ClientesDashboard /> : <BrandSetup />}
    </div>
  );
}

// ── Welcome overlay ────────────────────────────────────────────────────────────
export function WelcomeOverlay({ currentUser, onDismiss }) {
  const { globalOnlineUsers, notifications } = useApp();
  const info = TEAM_MEMBERS[currentUser] || { label: currentUser, initials: '?', bg: '#444', text: '#fff' };
  const isOnline = !!globalOnlineUsers[currentUser];
  const recent = [...(notifications || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto py-8"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
      onClick={onDismiss}
    >
      <div className="flex flex-col items-center text-center select-none rounded-3xl"
        style={{ width: '100%', maxWidth: 340, padding: '36px 32px 28px', background: '#000', border: '1px solid #1a1a1a' }}>

        <div className="text-white font-black leading-none text-center" style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          <div style={{ fontSize: 40 }}>WELCOME</div>
          <div style={{ fontSize: 24 }}>BACK</div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-3 mb-4">
          <span className="text-white font-semibold text-lg">{info.label}</span>
          {isOnline && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#4ade80' }} />}
        </div>

        <div style={{ width: 210, height: 210 }} className="mb-5 flex-shrink-0">
          {LOBBY_AVATAR_USERS.has(currentUser)
            ? <img src={`/admin/${currentUser}-avatar.png`} alt="" draggable={false} className="w-full h-full object-contain" />
            : <div className="w-full h-full rounded-3xl flex items-center justify-center font-black text-6xl"
                style={{ background: info.bg, color: info.text }}>{info.initials}</div>
          }
        </div>

        {recent.length > 0 && (
          <div className="w-full border-t border-white/10 pt-3">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-xs font-medium text-zinc-500">Notificaciones</span>
            </div>
            {recent.map(n => {
              const u = TEAM_MEMBERS[n.user] || { initials: (n.user || '?')[0].toUpperCase(), bg: '#3f3f46', text: '#fff' };
              return (
                <div key={n.id} className="flex gap-2 mb-1.5 text-left">
                  <UserAvatar userId={n.user} size={20} className="flex-shrink-0 mt-0.5"
                    style={!['kann','jero','facu','angel'].includes(n.user) ? { background: u.bg, color: u.text } : {}} />
                  <p className="text-zinc-500 text-xs leading-relaxed line-clamp-1">{n.action}{n.location ? ` · ${n.location}` : ''}</p>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-zinc-700 text-xs mt-5">Tocá en cualquier parte para continuar</p>
      </div>
    </div>
  );
}

// ── Content area (rendered inside the rectangle) ───────────────────────────────
export function LayoutContent({ activeTab, setActiveTab, currentUser, showIntro, onIntroDone }) {
  const canSeeRestricted = currentUser !== 'facu';
  const isViewer = currentUser === 'angel';
  const [showPermModal, setShowPermModal] = useState(false);
  const blockClick = isViewer
    ? (e) => { e.stopPropagation(); e.preventDefault(); setShowPermModal(true); }
    : undefined;

  if (activeTab === 'lobby') {
    return (
      <>
        {showPermModal && <PermissionDeniedModal onClose={() => setShowPermModal(false)} />}
        <div className="flex-1 flex min-h-0" onClickCapture={blockClick}>
          <ErrorBoundary>
            <Lobby setActiveTab={setActiveTab} />
          </ErrorBoundary>
        </div>
      </>
    );
  }

  // Boards needs full height without scroll or padding
  if (activeTab === 'boards') {
    return (
      <>
        {showPermModal && <PermissionDeniedModal onClose={() => setShowPermModal(false)} />}
        <div className="flex-1 relative min-h-0 overflow-hidden" onClickCapture={blockClick}>
          <BoardsModule />
        </div>
      </>
    );
  }

  // Mentoría — Angel has full edit access here (no blockClick)
  if (activeTab === 'mentoria') {
    if (!canSeeRestricted) return null;
    return (
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <Mentoria />
      </div>
    );
  }

  const renderModule = () => {
    switch (activeTab) {
      case 'kanban': return <KanbanSection showIntro={showIntro} onIntroDone={onIntroDone} />;
      case 'clientes': return canSeeRestricted ? <DirectorySection /> : null;
      case 'finanzas': return canSeeRestricted ? <FinanzasPortal /> : null;
      case 'calendar': return <CalendarModule />;
      case 'live': return <LiveTasks />;
      case 'ideas': return <IdeaBank />;
      default: return null;
    }
  };

  return (
    <>
      {showPermModal && <PermissionDeniedModal onClose={() => setShowPermModal(false)} />}
      <ScrollFadeContainer onClickCapture={blockClick}>
        {renderModule()}
      </ScrollFadeContainer>
    </>
  );
}

// ── Default export kept for backwards compatibility ────────────────────────────
export default function Layout({ onLogout, currentUser }) {
  const [activeTab, setActiveTab] = useState('kanban');
  return (
    <>
      <AppHeader activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={onLogout} />
      <LayoutContent activeTab={activeTab} currentUser={currentUser} />
    </>
  );
}
