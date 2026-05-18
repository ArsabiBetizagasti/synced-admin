import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';

const ASSIGNEES = {
  kann: { label: 'Kann', initials: 'K', bg: '#faff05', text: '#000' },
  jero: { label: 'Jero', initials: 'J', bg: '#60a5fa', text: '#000' },
  facu: { label: 'Facu', initials: 'F', bg: '#a78bfa', text: '#000' },
};

const PRIORITIES = {
  Alta: { color: '#f87171', bg: '#f8717120' },
  Media: { color: '#fbbf24', bg: '#fbbf2420' },
  Baja: { color: '#34d399', bg: '#34d39920' },
};

const COLUMNS = [
  { id: 'todo',       label: 'To Do' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'done',       label: 'Done' },
];

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     color: '#22c55e', bg: '#22c55e18' },
  { id: 'pinterest', label: 'Pinterest',  color: '#f472b6', bg: '#f472b618' },
  { id: 'meta',      label: 'Meta Ads',   color: '#38bdf8', bg: '#38bdf818' },
  { id: 'youtube',   label: 'YouTube',    color: '#ef4444', bg: '#ef444418' },
  { id: 'google',    label: 'Google Ads', color: '#e4e4e7', bg: '#e4e4e712' },
  { id: 'linkedin',  label: 'LinkedIn',   color: '#67e8f9', bg: '#67e8f918' },
];

// ── Confirm dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">¿Confirmar eliminación?</p>
        <p className="text-zinc-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ── Image lightbox ─────────────────────────────────────────────────────────────
function Lightbox({ img, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={onClose}>
      <div className="relative max-w-5xl max-h-full" onClick={e => e.stopPropagation()}>
        <img
          src={img.dataUrl} alt={img.name}
          className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
          draggable={false} />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="text-zinc-500 text-xs text-center mt-2 truncate">{img.name}</p>
      </div>
    </div>
  );
}

// ── Task card ──────────────────────────────────────────────────────────────────
function TaskCard({ task, onMove, onEdit, onDelete }) {
  const { clients } = useApp();
  const client = clients.find(c => c.id === task.clientId);
  const priority = PRIORITIES[task.priority] || PRIORITIES['Media'];
  const dragRef = useRef(null);

  const [showImages, setShowImages] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const days = task.deadline
    ? Math.ceil((new Date(task.deadline) - new Date()) / 86400000)
    : null;

  const platforms = (task.platforms || [])
    .map(pid => PLATFORMS.find(p => p.id === pid))
    .filter(Boolean);

  const images = task.images || [];

  return (
    <>
      <div
        ref={dragRef}
        draggable
        onDragStart={handleDragStart}
        className="relative bg-[#1a1a1a] border border-zinc-800/80 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-zinc-700 transition-all group"
        style={{ borderLeft: `3px solid ${client?.color || '#333'}` }}
      >
        {/* Top-right: edit + delete */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            title="Editar"
            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            title="Eliminar"
            className="w-6 h-6 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Row: company · priority · assignees */}
        <div className="flex items-center gap-1.5 mb-2 pr-14 min-w-0">
          {client && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium truncate max-w-[90px] flex-shrink-0"
              style={{ background: client.color + '22', color: client.color }}>
              {client.name}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{ background: priority.bg, color: priority.color }}>
            {task.priority}
          </span>
          {(task.assignees || []).length > 0 && (
            <div className="flex -space-x-1 flex-shrink-0 ml-0.5">
              {(task.assignees || []).map(a => {
                const av = ASSIGNEES[a];
                if (!av) return null;
                return (
                  <div key={a} title={av.label}
                    className="w-5 h-5 text-[9px] rounded-full flex items-center justify-center font-bold ring-2 ring-[#1a1a1a]"
                    style={{ background: av.bg, color: av.text }}>
                    {av.initials}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Title */}
        <h4 className="text-white text-sm font-medium mb-1 leading-snug">{task.title}</h4>
        {task.description && (
          <p className="text-zinc-500 text-xs mb-2 leading-relaxed line-clamp-2">{task.description}</p>
        )}

        {/* Platform tags */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {platforms.map(p => (
              <span key={p.id}
                className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                style={{ background: p.bg, color: p.color }}>
                {p.label}
              </span>
            ))}
          </div>
        )}

        {/* Deadline */}
        {task.deadline && (
          <div className="flex justify-end mt-1">
            <span className={`text-xs flex items-center gap-1 ${
              days !== null && days < 3 ? 'text-red-400' :
              days !== null && days < 7 ? 'text-yellow-400' : 'text-zinc-500'
            }`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {days !== null ? (days < 0 ? 'Vencida' : days === 0 ? 'Hoy' : `${days}d`) : task.deadline}
            </span>
          </div>
        )}

        {/* Images strip */}
        {images.length > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-800/40">
            {/* Icon + count — click to toggle sticky */}
            <button
              draggable={false}
              onClick={(e) => { e.stopPropagation(); setShowImages(v => !v); }}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors w-full">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{images.length} {images.length === 1 ? 'imagen' : 'imágenes'}</span>
              <svg
                className={`w-3 h-3 ml-auto transition-transform duration-200 ${showImages ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Thumbnails — expand on hover OR when clicked open */}
            <div className={`grid grid-cols-4 gap-1 overflow-hidden transition-all duration-300 ease-out ${
              showImages
                ? 'max-h-[500px] mt-2 opacity-100'
                : 'max-h-0 group-hover:max-h-[500px] group-hover:mt-2 group-hover:opacity-100 opacity-0'
            }`}>
              {images.map(img => (
                <button
                  key={img.id}
                  draggable={false}
                  onClick={(e) => { e.stopPropagation(); setLightbox(img); }}
                  className="aspect-square rounded-lg overflow-hidden hover:opacity-80 hover:ring-2 hover:ring-white/30 transition-all flex-shrink-0">
                  <img
                    src={img.dataUrl} alt={img.name}
                    className="w-full h-full object-cover"
                    draggable={false} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Move buttons */}
        <div className="mt-2 pt-2 border-t border-zinc-800/50 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {COLUMNS.filter(c => c.id !== task.status).map(col => (
            <button key={col.id} onClick={() => onMove(task.id, col.id)}
              className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded-lg bg-[#222] hover:bg-[#2a2a2a] transition-all">
              → {col.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox — fixed overlay, rendered outside the card in DOM but still inside the component */}
      {lightbox && <Lightbox img={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

// ── Task modal ─────────────────────────────────────────────────────────────────
function TaskModal({ onClose, defaultStatus = 'todo', task = null }) {
  const { addTask, updateTask, clients } = useApp();
  const isEdit = !!task;
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    title:       task?.title || '',
    description: task?.description || '',
    clientId:    task?.clientId || clients[0]?.id || '',
    priority:    task?.priority || 'Media',
    deadline:    task?.deadline || '',
    assignees:   task?.assignees || [],
    status:      task?.status || defaultStatus,
    platforms:   task?.platforms || [],
    images:      task?.images || [],
  });

  const toggleAssignee = (a) => {
    setForm(p => ({
      ...p,
      assignees: p.assignees.includes(a) ? p.assignees.filter(x => x !== a) : [...p.assignees, a],
    }));
  };

  const togglePlatform = (pid) => {
    setForm(p => ({
      ...p,
      platforms: p.platforms.includes(pid) ? p.platforms.filter(x => x !== pid) : [...p.platforms, pid],
    }));
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      if (f.size > 4 * 1024 * 1024) {
        alert(`"${f.name}" es demasiado grande. Máximo 4 MB por imagen.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setForm(p => ({
          ...p,
          images: [...p.images, { id: Date.now().toString() + Math.random().toString(36).slice(2), name: f.name, dataUrl: reader.result, size: f.size }],
        }));
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const removeImage = (id) => {
    setForm(p => ({ ...p, images: p.images.filter(img => img.id !== id) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (isEdit) updateTask(task.id, form);
    else addTask(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-semibold">{isEdit ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Título *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
              placeholder="Ej. Diseño de logo principal" required />
          </div>

          {/* Description */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Descripción</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05] resize-none"
              placeholder="Detalla el alcance de la tarea..." />
          </div>

          {/* Client + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Cliente</label>
              <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Prioridad</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {Object.keys(PRIORITIES).map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Deadline + Column */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]"
                required />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Columna</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">Plataformas</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => {
                const active = form.platforms.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                    style={active
                      ? { background: p.bg, color: p.color, borderColor: p.color + '60' }
                      : { background: 'transparent', color: '#52525b', borderColor: '#27272a' }
                    }>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">
              Imágenes adjuntas {form.images.length > 0 && <span className="text-zinc-600 normal-case">({form.images.length})</span>}
            </label>

            {/* Existing images */}
            {form.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {form.images.map(img => (
                  <div key={img.id} className="relative group/img aspect-square">
                    <img src={img.dataUrl} alt={img.name}
                      className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <label className="flex items-center gap-2 border border-dashed border-zinc-700 rounded-xl px-3 py-2.5 cursor-pointer hover:border-zinc-500 hover:bg-white/[0.02] transition-all">
              <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-zinc-500 text-xs">Agregar imágenes (PNG, JPG, GIF · máx 4 MB)</span>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
            </label>
          </div>

          {/* Assignees */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">Asignar a</label>
            <div className="flex gap-3">
              {Object.entries(ASSIGNEES).map(([key, a]) => (
                <button key={key} type="button" onClick={() => toggleAssignee(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    form.assignees.includes(key) ? 'border-[#faff05]' : 'border-zinc-800 text-zinc-500'
                  }`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: a.bg, color: a.text }}>
                    {a.initials}
                  </div>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: '#faff05' }}>
            {isEdit ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main board ─────────────────────────────────────────────────────────────────
export default function KanbanBoard({ filters: extFilters }) {
  const { tasks, moveTask, deleteTask, clients } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [addToColumn, setAddToColumn] = useState('todo');
  const [editTask, setEditTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [filterClient, setFilterClient] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDrop = (e, colId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) moveTask(taskId, colId);
    setDragOver(null);
  };

  const f = extFilters || { filterClient, filterAssignee: 'all', filterPriority: 'all', filterStatus: 'all', search: '' };
  const filteredTasks = tasks.filter(t => {
    if (f.filterClient !== 'all' && t.clientId !== f.filterClient) return false;
    if (f.filterAssignee !== 'all' && !t.assignees?.includes(f.filterAssignee)) return false;
    if (f.filterPriority !== 'all' && t.priority !== f.filterPriority) return false;
    if (f.search && !t.title.toLowerCase().includes(f.search.toLowerCase())) return false;
    return true;
  });
  const columnTasks = (colId) => filteredTasks.filter(t => t.status === colId);
  const clientsWithTasks = clients.filter(c => tasks.some(t => t.clientId === c.id));

  const colHeaderColor = { todo: '#71717a', inprogress: '#faff05', done: '#34d399' };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg">Kanban Board</h2>
        {!extFilters && (
          <button onClick={() => { setAddToColumn('todo'); setShowAdd(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-black"
            style={{ background: '#faff05' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva tarea
          </button>
        )}
      </div>

      {/* Client filter pills */}
      {!extFilters && clientsWithTasks.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          <button
            onClick={() => setFilterClient('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterClient === 'all' ? 'text-black' : 'text-zinc-500 bg-[#1a1a1a] hover:text-white'}`}
            style={filterClient === 'all' ? { background: '#faff05' } : {}}>
            Todos <span className="opacity-60">({tasks.length})</span>
          </button>
          {clientsWithTasks.map(c => {
            const count = tasks.filter(t => t.clientId === c.id).length;
            return (
              <button key={c.id}
                onClick={() => setFilterClient(filterClient === c.id ? 'all' : c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l-2 ${filterClient === c.id ? 'text-black' : 'text-zinc-500 bg-[#1a1a1a] hover:text-white'}`}
                style={filterClient === c.id ? { background: c.color, borderLeftColor: c.color } : { borderLeftColor: c.color }}>
                {c.name} <span className={filterClient === c.id ? 'opacity-70' : 'opacity-50'}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Board columns */}
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const colTasks = columnTasks(col.id);
          const isOver = dragOver === col.id;
          return (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, col.id)}
              className={`rounded-2xl p-3 min-h-96 transition-all ${isOver ? 'bg-white/[0.03] ring-1 ring-[#faff05]/30' : 'bg-[#141414]'}`}>

              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: colHeaderColor[col.id] }} />
                  <span className="text-sm font-medium" style={{ color: colHeaderColor[col.id] }}>{col.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">{colTasks.length}</span>
                </div>
                <button onClick={() => { setAddToColumn(col.id); setShowAdd(true); }}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task}
                    onMove={moveTask}
                    onEdit={setEditTask}
                    onDelete={(t) => setConfirmDelete(t)}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-zinc-700 text-sm border-2 border-dashed border-zinc-800 rounded-xl">
                    Arrastra o agrega tareas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && <TaskModal onClose={() => setShowAdd(false)} defaultStatus={addToColumn} />}
      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          message={`¿Eliminar "${confirmDelete.title}"? Esta acción no se puede deshacer.`}
          onConfirm={() => { deleteTask(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
