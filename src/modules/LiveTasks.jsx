import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

const STATUS = {
  todo:       { label: 'To Do',       color: '#71717a' },
  inprogress: { label: 'En Progreso', color: '#faff05' },
  done:       { label: 'Listo',        color: '#34d399' },
};

const PRIORITIES = {
  Alta:  { color: '#f87171', bg: '#f8717120' },
  Media: { color: '#fbbf24', bg: '#fbbf2420' },
  Baja:  { color: '#34d399', bg: '#34d39920' },
};

const ASSIGNEES = {
  kann: { initials: 'K', bg: '#faff05', text: '#000' },
  jero: { initials: 'J', bg: '#60a5fa', text: '#000' },
  facu: { initials: 'F', bg: '#a78bfa', text: '#000' },
};

function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Task modal (add / edit) ───────────────────────────────────────────────────
function LiveTaskModal({ task, defaultClientId, clients, onSave, onDelete, onClose }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    clientId: task?.clientId || defaultClientId || clients[0]?.id || '',
    priority: task?.priority || 'Media',
    deadline: task?.deadline || '',
    assignees: task?.assignees || [],
    status: task?.status || 'todo',
  });

  const toggle = (key, val) =>
    setForm(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val] }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-semibold">{isEdit ? 'Editar tarea' : 'Nueva tarea live'}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Título *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
              placeholder="Ej. Contenido semana 3" required />
          </div>

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05] resize-none"
              placeholder="Detalle visible para la marca..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Marca</label>
              <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Estado</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Prioridad</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {Object.keys(PRIORITIES).map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]" />
            </div>
          </div>

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">Asignar a</label>
            <div className="flex gap-2">
              {Object.entries(ASSIGNEES).map(([key, a]) => (
                <button key={key} type="button" onClick={() => toggle('assignees', key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${form.assignees.includes(key) ? 'border-[#faff05]' : 'border-zinc-800 text-zinc-500'}`}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: a.bg, color: a.text }}>{a.initials}</div>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {isEdit && (
              <button type="button" onClick={() => { onDelete(task.id); onClose(); }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                Eliminar
              </button>
            )}
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-black"
              style={{ background: '#faff05' }}>
              {isEdit ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, onEdit, onCycleStatus }) {
  const status = STATUS[task.status] || STATUS.todo;
  const days = task.deadline
    ? Math.ceil((new Date(task.deadline + 'T00:00:00') - new Date()) / 86400000)
    : null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-zinc-800/40 last:border-0 hover:bg-white/[0.02] transition-colors">
      <button
        onClick={() => { const o = ['todo','inprogress','done']; onCycleStatus(task.id, o[(o.indexOf(task.status)+1)%3]); }}
        title="Cambiar estado"
        className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ring-2 ring-transparent hover:ring-white/20 transition-all"
        style={{ background: status.color }}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-white'}`}>
          {task.title}
        </p>
        {task.description && <p className="text-zinc-600 text-xs mt-0.5 line-clamp-1">{task.description}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: status.color + '22', color: status.color }}>{status.label}</span>
          {days !== null && (
            <span className={`text-[10px] font-medium ${days < 0 ? 'text-red-400' : days < 3 ? 'text-orange-400' : days < 7 ? 'text-yellow-400' : 'text-zinc-500'}`}>
              {days < 0 ? '⚠ Vencida' : days === 0 ? 'Hoy' : `${days}d`}
            </span>
          )}
          <div className="flex -space-x-1 ml-auto">
            {(task.assignees || []).map(a => {
              const av = ASSIGNEES[a];
              return av ? (
                <div key={a} className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ring-1 ring-[#141414]"
                  style={{ background: av.bg, color: av.text }}>{av.initials}</div>
              ) : null;
            })}
          </div>
        </div>
      </div>
      <button onClick={() => onEdit(task)}
        className="text-zinc-700 hover:text-zinc-400 transition-colors flex-shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  );
}

// ── Brand column ──────────────────────────────────────────────────────────────
function BrandColumn({ client, tasks, onAdd, onEdit, onCycleStatus }) {
  const sorted = [...tasks].sort((a, b) => {
    const o = { inprogress: 0, todo: 1, done: 2 };
    return (o[a.status] ?? 1) - (o[b.status] ?? 1);
  });
  const activeCount = tasks.filter(t => t.status !== 'done').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="bg-[#141414] border border-zinc-800/50 rounded-2xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
            style={{ background: client.color }}>
            {getInitials(client.name)}
          </div>
          <span className="text-white font-semibold text-sm">{client.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{activeCount}</span>}
          {doneCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-[#34d399]" style={{ background: '#34d39920' }}>{doneCount} ✓</span>}
        </div>
      </div>

      <div className="flex-1 min-h-[100px]">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-700 text-xs">
            <svg className="w-6 h-6 mb-1.5 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Sin tareas
          </div>
        ) : sorted.map(t => (
          <TaskRow key={t.id} task={t} onEdit={onEdit} onCycleStatus={onCycleStatus} />
        ))}
      </div>

      <div className="px-4 py-2.5 border-t border-zinc-800/40">
        <button onClick={() => onAdd(client.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar tarea
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LiveTasks() {
  const { liveTasks, clients, addLiveTask, updateLiveTask, deleteLiveTask, moveLiveTask } = useApp();
  const [modal, setModal] = useState(null); // null | { defaultClientId } | { task }

  const visibleClients = useMemo(() => clients.filter(c => c.active !== false), [clients]);

  const tasksByClient = useMemo(() => {
    const map = {};
    visibleClients.forEach(c => { map[c.id] = liveTasks.filter(t => t.clientId === c.id); });
    return map;
  }, [liveTasks, visibleClients]);

  const totalActive = liveTasks.filter(t => t.status !== 'done').length;

  const handleSave = (form) => {
    if (modal?.task) updateLiveTask(modal.task.id, form);
    else addLiveTask(form);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-bold text-xl">Live Tasks</h2>
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#faff0520', color: '#faff05' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#faff05] animate-pulse" />
            {totalActive} activas
          </span>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-black"
          style={{ background: '#faff05' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva tarea
        </button>
      </div>

      {/* Brand grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
        {visibleClients.map(client => (
          <BrandColumn
            key={client.id}
            client={client}
            tasks={tasksByClient[client.id] || []}
            onAdd={(cId) => setModal({ defaultClientId: cId })}
            onEdit={(task) => setModal({ task })}
            onCycleStatus={moveLiveTask}
          />
        ))}
      </div>

      {modal !== null && (
        <LiveTaskModal
          task={modal.task}
          defaultClientId={modal.defaultClientId}
          clients={visibleClients}
          onSave={handleSave}
          onDelete={deleteLiveTask}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
