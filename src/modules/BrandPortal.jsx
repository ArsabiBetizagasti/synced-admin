import React, { useMemo } from 'react';
import { AppProvider } from '../context/AppContext';
import { useApp } from '../context/AppContext';

const STATUS = {
  todo:       { label: 'To Do',       color: '#71717a' },
  inprogress: { label: 'En Progreso', color: '#faff05' },
  done:       { label: 'Listo',        color: '#34d399' },
};

const ASSIGNEES = {
  kann: { label: 'Kann', initials: 'K', bg: '#faff05', text: '#000' },
  jero: { label: 'Jero', initials: 'J', bg: '#60a5fa', text: '#000' },
  facu: { label: 'Facu', initials: 'F', bg: '#a78bfa', text: '#000' },
};

function TaskCard({ task }) {
  const status = STATUS[task.status] || STATUS.todo;
  const days = task.deadline
    ? Math.ceil((new Date(task.deadline + 'T00:00:00') - new Date()) / 86400000)
    : null;

  return (
    <div className={`bg-[#0a0a0a] border rounded-2xl p-5 transition-all ${task.status === 'done' ? 'border-zinc-800/30 opacity-60' : 'border-zinc-800/70'}`}>
      <div className="flex items-start gap-3">
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: status.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`font-semibold text-base leading-tight ${task.status === 'done' ? 'line-through text-zinc-400' : 'text-white'}`}>
              {task.title}
            </p>
            <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
              style={{ background: status.color + '22', color: status.color }}>
              {status.label}
            </span>
          </div>

          {task.description && <p className="text-zinc-500 text-sm mb-3">{task.description}</p>}

          <div className="flex items-center gap-3 flex-wrap">
            {days !== null && (
              <div className={`flex items-center gap-1 text-sm font-medium ${days < 0 ? 'text-red-400' : days < 3 ? 'text-orange-400' : days < 7 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {days < 0 ? 'Vencida' : days === 0 ? 'Hoy' : `${days} días`}
              </div>
            )}
            {(task.assignees || []).length > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-zinc-600 text-xs">Trabajando:</span>
                <div className="flex -space-x-1">
                  {(task.assignees || []).map(a => {
                    const av = ASSIGNEES[a];
                    return av ? (
                      <div key={a} title={av.label}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-[#111]"
                        style={{ background: av.bg, color: av.text }}>
                        {av.initials}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandPortalContent({ clientId, onLogout }) {
  const { liveTasks, clients } = useApp();
  const client = clients.find(c => c.id === clientId);

  const allTasks = useMemo(
    () => liveTasks.filter(t => t.clientId === clientId),
    [liveTasks, clientId]
  );

  const activeTasks = allTasks.filter(t => t.status !== 'done').sort((a, b) => {
    const o = { inprogress: 0, todo: 1 };
    return (o[a.status] ?? 1) - (o[b.status] ?? 1);
  });
  const doneTasks = allTasks.filter(t => t.status === 'done');

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        Marca no encontrada
      </div>
    );
  }

  const initials = (client.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Top bar — fixed at top */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/40 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-black text-xs"
            style={{ background: '#faff05' }}>SG</div>
          <div>
            <span className="text-white font-semibold text-sm">Synced</span>
            <span className="text-sm font-light ml-1" style={{ color: '#faff05' }}>Live</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
          En tiempo real
        </div>
        <button onClick={onLogout}
          className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Salir
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Brand header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-black"
            style={{ background: client.color }}>
            {initials}
          </div>
          <div>
            <h1 className="text-white font-bold text-2xl">{client.name}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Tus tareas con Synced Graphics · en tiempo real</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: 'Total', value: allTasks.length, color: 'white' },
            { label: 'En Progreso', value: allTasks.filter(t => t.status === 'inprogress').length, color: '#faff05' },
            { label: 'Completadas', value: doneTasks.length, color: '#34d399' },
          ].map(s => (
            <div key={s.label} className="bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div className="mb-8">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-4">En curso y pendiente · {activeTasks.length}</p>
            <div className="space-y-3">
              {activeTasks.map(t => <TaskCard key={t.id} task={t} />)}
            </div>
          </div>
        )}

        {/* Done tasks */}
        {doneTasks.length > 0 && (
          <div className="mb-8">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-4">Completado · {doneTasks.length}</p>
            <div className="space-y-3">
              {doneTasks.map(t => <TaskCard key={t.id} task={t} />)}
            </div>
          </div>
        )}

        {allTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-zinc-500 text-lg font-medium mb-1">Sin tareas por ahora</p>
            <p className="text-zinc-600 text-sm">Tu equipo de Synced Graphics está preparando el trabajo</p>
          </div>
        )}

        <p className="text-center text-zinc-800 text-xs mt-12">© 2026 Synced Graphics · Acceso exclusivo de marca</p>
      </div>
      </div>
    </>
  );
}

export default function BrandPortal({ clientId, onLogout }) {
  return (
    <AppProvider>
      <BrandPortalContent clientId={clientId} onLogout={onLogout} />
    </AppProvider>
  );
}
