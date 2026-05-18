import React, { useState, useRef, useEffect } from 'react';
import KanbanBoard from '../modules/KanbanBoard';
import FinanzasPortal from '../modules/FinanzasPortal';
import Tasks, { AddTaskInline, TaskStats } from '../modules/Tasks';
import Documentos from '../modules/Documentos';
import IdeaBank from '../modules/IdeaBank';
import ClientesDashboard from '../modules/ClientesDashboard';
import CalendarModule from '../modules/Calendar';
import LiveTasks from '../modules/LiveTasks';
import { useApp } from '../context/AppContext';

const RecDot = () => (
  <span className="relative flex items-center justify-center w-3.5 h-3.5 flex-shrink-0">
    <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
    <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
  </span>
);

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

const TAB_LIVE = { id: 'live', label: 'Live Tasks' };

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

const USER_INFO = {
  kann: { label: 'Kann', initials: 'K', bg: '#faff05', text: '#000' },
  jero: { label: 'Jero', initials: 'J', bg: '#60a5fa', text: '#000' },
  facu: { label: 'Facu', initials: 'F', bg: '#a78bfa', text: '#000' },
};

const relativeTime = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
};

function AccountDropdown({ currentUser, onLogout, onNavigate }) {
  const { notifications, markAllRead } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const info = USER_INFO[currentUser] || { label: currentUser, initials: '?', bg: '#444', text: '#fff' };
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (unread > 0) markAllRead();
  };

  return (
    <div className="relative" ref={ref}
      onMouseEnter={() => { setOpen(true); if (unread > 0) markAllRead(); }}
      onMouseLeave={() => setOpen(false)}>

      {/* Trigger — padded area so hover target is bigger than just the avatar */}
      <button onClick={handleOpen}
        className="relative flex items-center justify-center w-10 h-10 rounded-2xl hover:bg-zinc-900/60 transition-colors">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: info.bg, color: info.text }}>
          {info.initials}
        </div>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-black text-[9px] font-bold flex items-center justify-center"
            style={{ background: '#faff05' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#080808] border border-[#111] rounded-2xl shadow-2xl z-50 overflow-hidden w-80">
          {/* Account header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#111]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: info.bg, color: info.text }}>
              {info.initials}
            </div>
            <span className="text-white font-medium text-sm">{info.label}</span>
          </div>

          {/* Notifications */}
          <div className="border-b border-[#111]">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Actividad reciente</span>
              <span className="text-zinc-700 text-[10px]">{notifications.length} eventos</span>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-4 text-center text-zinc-600 text-xs">Sin actividad aún</div>
              ) : (
                notifications.slice(0, 8).map(n => (
                  <div key={n.id} className="flex gap-2.5 px-4 py-2.5 border-t border-[#111]/60 hover:bg-zinc-900/40 transition-colors cursor-default">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: n.user === 'kann' ? '#faff05' : '#60a5fa', color: '#000' }}>
                      {n.user === 'kann' ? 'K' : 'J'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        <span className="text-white font-medium">{n.user === 'kann' ? 'Kann' : 'Jero'}</span>{' '}
                        {n.action}
                        {n.location && <span className="text-zinc-600"> en {n.location}</span>}
                      </p>
                      <p className="text-zinc-700 text-[10px] mt-0.5">{relativeTime(n.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Salir */}
          <button onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-3 text-zinc-500 hover:text-white hover:bg-zinc-900/40 transition-colors text-sm">
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
  const [showFilters, setShowFilters] = useState(false);
  const filterWrapRef = useRef(null);

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
      <TaskStats />

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="bg-black border border-[#111] rounded-2xl pl-8 pr-3 py-1.5 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-[#faff05] w-36 transition-colors"
              placeholder="Buscar tarea..." />
          </div>

          {/* Filtros dropdown */}
          <div ref={filterWrapRef} className="relative"
            onMouseEnter={() => setShowFilters(true)}
            onMouseLeave={() => setShowFilters(false)}>
            <button
              onClick={() => setShowFilters(o => !o)}
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
                    {Object.entries(KB_ASSIGNEES).map(([key, a]) => (
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
                        style={filterPriority === p ? { background: p === 'all' ? '#faff05' : KB_PRIORITIES[p] } : {}}>
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

        <div className="ml-auto">
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

      <Tasks filters={filters} hideStats />

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

  const tabCls = (id) =>
    `flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
      activeTab === id ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'
    }`;

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center px-4 py-2 border-b border-[#111] flex-shrink-0 bg-black z-40">

        {/* Left group: Live Tasks + separator + main tabs */}
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab(TAB_LIVE.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === TAB_LIVE.id ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
            style={activeTab === TAB_LIVE.id ? { background: '#faff05' } : {}}>
            <RecDot />
            {TAB_LIVE.label}
          </button>

          <div className="w-px h-5 bg-zinc-800 flex-shrink-0 mx-1" />

          <nav className="flex items-center gap-1 bg-[#080808] rounded-2xl p-1">
            {TABS_MAIN.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={tabCls(tab.id)}
                style={activeTab === tab.id ? { background: '#faff05' } : {}}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right group: Clientes + Finanzas + account */}
        <div className="ml-auto flex items-center gap-1">
          {canSeeRestricted && (
            <>
              {TABS_RESTRICTED.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={tabCls(tab.id)}
                  style={activeTab === tab.id ? { background: '#faff05' } : {}}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
              <div className="w-px h-5 bg-zinc-800 mx-2 flex-shrink-0" />
            </>
          )}
          <AccountDropdown currentUser={currentUser} onLogout={onLogout} onNavigate={setActiveTab} />
        </div>
      </div>

      {/* Module content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderModule()}
      </div>
    </>
  );
}
