import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TaskModal } from './KanbanBoard';
import { TEAM_MEMBERS as ASSIGNEES, PRIORITY_STYLES as PRIORITIES } from '../constants';

const STATUS_LABELS = { todo: 'To Do', inprogress: 'En Progreso', done: 'Completado' };
const STATUS_COLORS = { todo: '#71717a', inprogress: '#faff05', done: '#34d399' };

function MiniChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const H = 44, padY = 6;
  // svgY: position within the SVG viewBox (0..H), maps 1-to-1 to pixels since SVG renders at H px
  const pts = data.map((d, i) => {
    const xPct = data.length <= 1 ? 50 : (i / (data.length - 1)) * 100;
    const svgY = padY + (1 - d.value / maxVal) * (H - padY * 2);
    return { xPct, svgY, ...d };
  });
  const polyline = pts.map(p => `${p.xPct.toFixed(2)},${p.svgY.toFixed(2)}`).join(' ');
  // Container is 14px (value labels) + H px (chart)
  const containerH = 14 + H;

  return (
    <div className="bg-[#080808] border border-[#111] rounded-2xl px-5 pt-3 pb-3 mt-2">
      <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-2">Tracking de tareas mensuales</p>
      <div className="relative" style={{ height: containerH }}>
        {/* SVG line only — starts 14px from top */}
        <svg viewBox={`0 0 100 ${H}`} className="absolute w-full"
          style={{ height: H, top: 14, left: 0 }} preserveAspectRatio="none">
          <polyline points={polyline} fill="none" stroke="#faff05" strokeWidth="1.2"
            strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
        {pts.map((p, i) => {
          const dotCenterPx = 14 + p.svgY; // px from container top to dot center
          return (
            <div key={i} className="absolute" style={{ left: `${p.xPct}%`, top: 0, transform: 'translateX(-50%)' }}>
              {/* Value label: sits just above the dot */}
              <span className="absolute text-[8px] font-medium"
                style={{ color: '#faff05', opacity: 0.65, top: dotCenterPx - 16, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                {p.value}
              </span>
              {/* Dot: centered on the line */}
              <div className="absolute rounded-full bg-[#faff05]"
                style={{ width: 7, height: 7, top: dotCenterPx - 3.5, left: '50%', transform: 'translateX(-50%)' }} />
            </div>
          );
        })}
      </div>
      {/* Month labels row — separate, always below the chart */}
      <div className="relative mt-2" style={{ height: 14 }}>
        {pts.map(p => (
          <span key={p.key} className="absolute text-[9px] text-zinc-600 capitalize"
            style={{ left: `${p.xPct}%`, transform: 'translateX(-50%)' }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TaskStats() {
  const { tasks, archivedCount, ideas, taskMonthlyHistory } = useApp();
  const [hovered, setHovered] = useState(false);

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = taskMonthlyHistory?.[thisMonthKey] || 0;
  const lastMonth = taskMonthlyHistory?.[lastMonthKey] || 0;
  let pctDiff = null, pctPositive = true;
  if (lastMonth > 0) { pctDiff = Math.round(((thisMonth - lastMonth) / lastMonth) * 100); pctPositive = pctDiff >= 0; }
  else if (thisMonth > 0) { pctDiff = 100; pctPositive = true; }

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: d.toLocaleString('es-ES', { month: 'short' }), value: taskMonthlyHistory?.[key] || 0 };
  });

  const activeIdeas   = (ideas || []).filter(i => !i.applied).length;
  const appliedIdeas  = (ideas || []).filter(i =>  i.applied).length;

  const stats = [
    { label: 'Total Tareas', value: tasks.length,                                       color: 'white'   },
    { label: 'To Do',        value: tasks.filter(t => t.status === 'todo').length,       color: '#71717a' },
    { label: 'En Progreso',  value: tasks.filter(t => t.status === 'inprogress').length, color: '#faff05' },
    { label: 'Completadas',  value: tasks.filter(t => t.status === 'done').length,       color: '#34d399', sub: archivedCount,  subLabel: 'archivadas', subColor: '#34d399' },
    { label: 'Ideas',        value: activeIdeas,                                         color: '#a78bfa', sub: appliedIdeas,   subLabel: 'ejecutadas', subColor: '#60a5fa' },
  ];

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-[#080808] border border-[#111] rounded-2xl p-4">
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 leading-tight">{s.label}</p>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              {s.sub > 0 && (
                <span className="text-[9px] font-medium" style={{ color: s.subColor, opacity: 0.6 }}>+{s.sub} {s.subLabel}</span>
              )}
            </div>
          </div>
        ))}
        <div className="bg-[#080808] border border-[#111] rounded-2xl p-4">
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 leading-tight">Este Mes</p>
          {pctDiff === null ? (
            <p className="text-zinc-600 text-lg font-bold">—</p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
              <p className="text-2xl font-bold" style={{ color: pctPositive ? '#34d399' : '#f87171' }}>
                {pctPositive ? '+' : ''}{pctDiff}%
              </p>
              <span className="text-zinc-700 text-[9px]">vs mes anterior</span>
            </div>
          )}
        </div>
      </div>
      <div style={{
        maxHeight: hovered ? '120px' : '0px',
        opacity: hovered ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 300ms ease, opacity 250ms ease',
      }}>
        <MiniChart data={chartData} />
      </div>
    </div>
  );
}

export default function Tasks({ filters: extFilters, hideStats }) {
  const { tasks, clients, updateTask, deleteTask, moveTask, addTask } = useApp();
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const f = extFilters || { filterAssignee, filterPriority, filterClient, filterStatus, search };

  const filtered = tasks.filter(t => {
    if (f.filterAssignee !== 'all' && !t.assignees?.includes(f.filterAssignee)) return false;
    if (f.filterPriority !== 'all' && t.priority !== f.filterPriority) return false;
    if (f.filterClient !== 'all' && t.clientId !== f.filterClient) return false;
    if (f.filterStatus !== 'all' && t.status !== f.filterStatus) return false;
    if (f.search && !t.title.toLowerCase().includes(f.search.toLowerCase()) &&
        !t.description?.toLowerCase().includes(f.search.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const priorityOrder = { Alta: 0, Media: 1, Baja: 2 };
    return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
  });

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-5">
      {!hideStats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total tareas', value: tasks.length, color: 'white' },
            { label: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#71717a' },
            { label: 'En Progreso', value: tasks.filter(t => t.status === 'inprogress').length, color: '#faff05' },
            { label: 'Completadas', value: tasks.filter(t => t.status === 'done').length, color: '#34d399' },
          ].map(s => (
            <div key={s.label} className="bg-[#080808] border border-[#111] rounded-2xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters — only shown when using internal (standalone) mode */}
      {!extFilters && <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="bg-[#080808] border border-[#111] rounded-2xl pl-9 pr-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#faff05] w-48"
            placeholder="Buscar tarea..." />
        </div>

        {/* Assignee filter */}
        <div className="flex gap-1">
          <button onClick={() => setFilterAssignee('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterAssignee === 'all' ? 'text-black' : 'text-zinc-500 bg-[#080808]'}`}
            style={filterAssignee === 'all' ? { background: '#faff05' } : {}}>
            Todos
          </button>
          {Object.entries(ASSIGNEES).map(([key, a]) => (
            <button key={key} onClick={() => setFilterAssignee(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filterAssignee === key ? 'border-transparent text-black' : 'border-[#111] text-zinc-500'}`}
              style={filterAssignee === key ? { background: a.bg } : {}}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: a.bg, color: a.text }}>{a.initials}</div>
              {a.label}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex gap-1">
          {['all', 'Alta', 'Media', 'Baja'].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterPriority === p ? 'text-black' : 'text-zinc-500 bg-[#080808]'}`}
              style={filterPriority === p ? { background: p === 'all' ? '#faff05' : PRIORITIES[p]?.color } : {}}>
              {p === 'all' ? 'Prioridad' : p}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          {['all', 'todo', 'inprogress', 'done'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus === s ? 'text-black' : 'text-zinc-500 bg-[#080808]'}`}
              style={filterStatus === s ? { background: s === 'all' ? '#faff05' : STATUS_COLORS[s] } : {}}>
              {s === 'all' ? 'Estado' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-black"
            style={{ background: '#faff05' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva tarea
          </button>
        </div>
      </div>}


      {/* Task table */}
      <div className="overflow-x-auto">
      <div className="bg-[#080808] border border-[#111] rounded-2xl overflow-hidden min-w-[600px]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#111]">
              {['Tarea', 'Cliente', 'Asignados', 'Prioridad', 'Deadline', 'Estado', ''].map(h => (
                <th key={h} className="text-left text-zinc-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(task => {
              const client = clients.find(c => c.id === task.clientId);
              const priority = PRIORITIES[task.priority] || PRIORITIES['Media'];
              const days = daysLeft(task.deadline);
              return (
                <tr key={task.id} className="border-b border-[#111] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {client && <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: client.color }} />}
                      <div>
                        <p className="text-white text-sm font-medium">{task.title}</p>
                        {task.description && <p className="text-zinc-600 text-xs mt-0.5 line-clamp-1">{task.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {client ? (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: client.color + '22', color: client.color }}>
                        {client.name}
                      </span>
                    ) : <span className="text-zinc-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex -space-x-1">
                      {(task.assignees || []).map(a => {
                        const av = ASSIGNEES[a];
                        return av ? (
                          <div key={a} title={av.label}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-[#1a1a1a]"
                            style={{ background: av.bg, color: av.text }}>
                            {av.initials}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: priority.bg, color: priority.color }}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${
                      days === null ? 'text-zinc-600' :
                      days < 0 ? 'text-red-400' :
                      days < 3 ? 'text-orange-400' :
                      days < 7 ? 'text-yellow-400' : 'text-zinc-400'
                    }`}>
                      {days === null ? '—' : days < 0 ? '⚠ Vencida' : days === 0 ? '🔴 Hoy' : `${days}d`}
                      {task.deadline && <span className="text-zinc-600 ml-1 text-[10px]">({task.deadline})</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={task.status}
                      onChange={e => moveTask(task.id, e.target.value)}
                      className="bg-[#080808] border border-[#111] rounded-full px-2 py-1 text-xs focus:outline-none focus:border-[#faff05]"
                      style={{ color: STATUS_COLORS[task.status] }}>
                      {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditTask(task)}
                        className="text-zinc-700 hover:text-zinc-300 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteTask(task.id)}
                        className="text-zinc-700 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center py-12 text-zinc-600 text-sm">
            No se encontraron tareas con los filtros seleccionados
          </div>
        )}
      </div>
      </div>

      {showAdd && <AddTaskInline onClose={() => setShowAdd(false)} />}
      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  );
}

export function AddTaskInline({ onClose, defaultClientId }) {
  const { addTask, clients } = useApp();
  const [form, setForm] = useState({
    title: '', description: '', clientId: defaultClientId || clients[0]?.id || '',
    priority: 'Media', deadline: '', assignees: [], status: 'todo',
  });

  const toggleAssignee = (a) =>
    setForm(p => ({ ...p, assignees: p.assignees.includes(a) ? p.assignees.filter(x => x !== a) : [...p.assignees, a] }));

  const handleSubmit = (e) => {
    e.preventDefault();
    addTask(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[#111]">
          <h2 className="text-white font-semibold">Nueva tarea</h2>
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
              className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
              placeholder="Nombre de la tarea" required />
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05] resize-none"
              placeholder="Detalle del alcance..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Cliente</label>
              <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Prioridad</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                <option>Alta</option><option>Media</option><option>Baja</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Deadline *</label>
              <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]" required />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Estado</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                <option value="todo">To Do</option>
                <option value="inprogress">En Progreso</option>
                <option value="done">Completado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">Asignado a</label>
            <div className="flex gap-3">
              {Object.entries(ASSIGNEES).map(([key, a]) => (
                <button key={key} type="button" onClick={() => toggleAssignee(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all ${form.assignees.includes(key) ? 'border-[#faff05]' : 'border-[#111] text-zinc-500'}`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: a.bg, color: a.text }}>{a.initials}</div>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 rounded-full text-sm font-semibold text-black"
            style={{ background: '#faff05' }}>
            Crear tarea
          </button>
        </form>
      </div>
    </div>
  );
}
