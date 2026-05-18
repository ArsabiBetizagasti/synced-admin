import React, { useState, useRef, useEffect } from 'react';
import KanbanBoard from '../modules/KanbanBoard';
import FinanzasPortal from '../modules/FinanzasPortal';
import Tasks, { AddTaskInline } from '../modules/Tasks';
import Documentos from '../modules/Documentos';
import IdeaBank from '../modules/IdeaBank';
import ClientesDashboard from '../modules/ClientesDashboard';
import CalendarModule from '../modules/Calendar';
import LiveTasks from '../modules/LiveTasks';
import { useApp } from '../context/AppContext';

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
    id: 'documentos', label: 'Documentos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
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
];

const TAB_LIVE = {
  id: 'live', label: 'Live Tasks',
  icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

const TABS_RESTRICTED = [
  {
    id: 'clientes', label: 'Clientes',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'finanzas', label: 'Finanzas',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const LOC_TO_TAB = {
  'Clientes': 'clientes', 'Proyectos': 'clientes', 'Finanzas': 'finanzas',
  'Documentos': 'documentos', 'Kanban': 'kanban', 'Tareas': 'kanban',
};

function NotificationBell({ onNavigate }) {
  const { notifications, markAllRead } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unread > 0) markAllRead();
  };

  const handleNotifClick = (n) => {
    const match = Object.entries(LOC_TO_TAB).find(([loc]) => (n.location || '').startsWith(loc));
    if (match) onNavigate(match[1]);
    setOpen(false);
  };

  const relativeTime = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} d`;
  };

  const userLabel = (u) => u === 'kann' ? 'Kann' : 'Jero';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-black text-[9px] font-bold flex items-center justify-center"
            style={{ background: '#faff05' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#080808] border border-[#111] rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#111]">
            <span className="text-white font-semibold text-sm">Actividad reciente</span>
            <span className="text-zinc-600 text-xs">{notifications.length} eventos</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-zinc-600 text-sm">Sin actividad aún</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} onClick={() => handleNotifClick(n)} className="flex gap-3 px-4 py-3 border-b border-[#111] hover:bg-zinc-900/40 transition-colors cursor-pointer">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: n.user === 'kann' ? '#faff05' : '#60a5fa', color: '#000' }}>
                    {n.user === 'kann' ? 'K' : 'J'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-300 text-xs leading-relaxed">
                      <span className="text-white font-medium">{userLabel(n.user)}</span>{' '}
                      {n.action}
                      {n.location && <span className="text-zinc-500"> en {n.location}</span>}
                    </p>
                    <p className="text-zinc-600 text-xs mt-0.5">{relativeTime(n.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const KB_ASSIGNEES = {
  kann: { label: 'Kann', initials: 'K', bg: '#faff05', text: '#000' },
  jero: { label: 'Jero', initials: 'J', bg: '#60a5fa', text: '#000' },
  facu: { label: 'Facu', initials: 'F', bg: '#a78bfa', text: '#000' },
};
const KB_PRIORITIES = { Alta: '#f87171', Media: '#fbbf24', Baja: '#34d399' };
function KanbanSection() {
  const { tasks, clients } = useApp();
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  const clientsWithTasks = clients.filter(c => tasks.some(t => t.clientId === c.id));
  const filters = { search, filterClient, filterAssignee, filterPriority, filterStatus: 'all' };
  const hasActive = search || filterClient !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all';

  const resetFilters = () => {
    setSearch(''); setFilterClient('all'); setFilterAssignee('all'); setFilterPriority('all');
  };

  return (
    <div className="space-y-6">
      {/* Unified filter bar */}
      <div className="bg-black border border-[#111] rounded-2xl p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="bg-black border border-[#faff05]/30 rounded-xl pl-9 pr-3 py-1.5 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-[#faff05] w-36"
              placeholder="Buscar tarea..." />
          </div>

          <div className="w-px h-4 bg-zinc-800 flex-shrink-0" />

          {/* Assignees */}
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => setFilterAssignee('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterAssignee === 'all' ? 'bg-[#faff05] text-black border-[#faff05]' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'}`}>
              Todos
            </button>
            {Object.entries(KB_ASSIGNEES).map(([key, a]) => (
              <button key={key} onClick={() => setFilterAssignee(filterAssignee === key ? 'all' : key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterAssignee === key ? 'border-transparent text-black' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'}`}
                style={filterAssignee === key ? { background: a.bg } : {}}>
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: a.bg, color: a.text }}>{a.initials}</div>
                {a.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-zinc-800 flex-shrink-0" />

          {/* Priority */}
          <div className="flex gap-1 flex-shrink-0">
            {['all', 'Alta', 'Media', 'Baja'].map(p => (
              <button key={p} onClick={() => setFilterPriority(filterPriority === p ? 'all' : p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filterPriority === p ? 'border-transparent text-black' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'}`}
                style={filterPriority === p ? { background: p === 'all' ? '#faff05' : KB_PRIORITIES[p] } : {}}>
                {p === 'all' ? 'Prioridad' : p}
              </button>
            ))}
          </div>

          {/* Client pills */}
          {clientsWithTasks.length > 0 && (
            <>
              <div className="w-px h-4 bg-zinc-800 flex-shrink-0" />
              <button onClick={() => setFilterClient('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 border ${filterClient === 'all' ? 'bg-[#faff05] text-black border-[#faff05]' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'}`}>
                Todos <span className="opacity-60">({tasks.length})</span>
              </button>
              {clientsWithTasks.map(c => {
                const count = tasks.filter(t => t.clientId === c.id).length;
                return (
                  <button key={c.id} onClick={() => setFilterClient(filterClient === c.id ? 'all' : c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 border ${filterClient === c.id ? 'text-black border-transparent' : 'bg-black text-zinc-500 border-transparent hover:border-[#faff05] hover:text-[#faff05]'}`}
                    style={filterClient === c.id ? { background: c.color } : {}}>
                    {c.name} <span className="opacity-60">({count})</span>
                  </button>
                );
              })}
            </>
          )}

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {hasActive && (
              <button onClick={resetFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent text-zinc-500 bg-black hover:border-[#faff05] hover:text-[#faff05] transition-all">
                Reset
              </button>
            )}
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90"
              style={{ background: '#faff05' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva tarea
            </button>
          </div>
        </div>
      </div>

      <Tasks filters={filters} />
      <div className="border-t border-[#111] pt-8"><KanbanBoard filters={filters} /></div>
      <div className="border-t border-[#111] pt-8"><IdeaBank /></div>

      {showAdd && <AddTaskInline onClose={() => setShowAdd(false)} />}
    </div>
  );
}

export default function Layout({ onLogout, currentUser }) {
  const [activeTab, setActiveTab] = useState('kanban');
  const canSeeRestricted = currentUser !== 'facu';

  const renderModule = () => {
    switch (activeTab) {
      case 'kanban': return <KanbanSection />;
      case 'clientes': return <ClientesDashboard onNavigate={setActiveTab} />;
      case 'finanzas': return <FinanzasPortal />;
      case 'documentos': return <Documentos />;
      case 'calendar': return <CalendarModule />;
      case 'live': return <LiveTasks />;
      default: return null;
    }
  };

  return (
    <>
        {/* Top bar — always visible at top of the fixed container */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#111] flex-shrink-0 bg-black z-40">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-black text-xs"
              style={{ background: '#faff05' }}>
              SG
            </div>
            <div>
              <span className="text-white font-semibold text-sm">Synced</span>
              <span className="text-sm font-light ml-1" style={{ color: '#faff05' }}>Admin</span>
            </div>
          </div>

          {/* Nav pills */}
          <nav className="flex items-center gap-1 bg-[#080808] rounded-xl p-1">
            {TABS_MAIN.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                style={activeTab === tab.id ? { background: '#faff05' } : {}}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
            {canSeeRestricted && (
              <>
                <div className="w-px h-5 bg-zinc-700 mx-1 flex-shrink-0" />
                {TABS_RESTRICTED.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                    style={activeTab === tab.id ? { background: '#faff05' } : {}}>
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </>
            )}
            <div className="w-px h-5 bg-zinc-700 mx-1 flex-shrink-0" />
            <button onClick={() => setActiveTab(TAB_LIVE.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === TAB_LIVE.id ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
              style={activeTab === TAB_LIVE.id ? { background: '#faff05' } : {}}>
              {TAB_LIVE.icon}
              {TAB_LIVE.label}
            </button>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <NotificationBell onNavigate={setActiveTab} />
            {/* Current user badge */}
            {{
              kann: <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ background: '#faff05' }}>K</div>,
              jero: <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ background: '#60a5fa' }}>J</div>,
              facu: <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ background: '#a78bfa' }}>F</div>,
            }[currentUser]}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-zinc-600 text-sm hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-900"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Salir
            </button>
          </div>
        </div>

        {/* Module content — scrolls inside the fixed container */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderModule()}
        </div>
    </>
  );
}
