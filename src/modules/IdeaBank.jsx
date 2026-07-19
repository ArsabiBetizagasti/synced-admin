import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TEAM_MEMBERS } from '../constants';

function AddIdeaModal({ onClose }) {
  const { addIdea, clients, currentUser } = useApp();
  const [form, setForm] = useState({ text: '', clientId: clients[0]?.id || '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    addIdea({ text: form.text.trim(), clientId: form.clientId, createdBy: currentUser });
    onClose();
  };

  const inputCls = 'w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[#111]">
          <h2 className="text-white font-semibold text-sm">Nueva idea</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Cliente</label>
            <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} className={inputCls}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Idea *</label>
            <textarea
              value={form.text}
              onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
              rows={4}
              className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05] resize-none"
              placeholder="Describí la idea..."
              required
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#080808] rounded-xl border border-[#111]">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
              style={{ background: TEAM_MEMBERS[currentUser]?.bg || '#faff05', color: TEAM_MEMBERS[currentUser]?.text || '#000' }}>
              {TEAM_MEMBERS[currentUser]?.initials || '?'}
            </div>
            <span className="text-zinc-400 text-xs">Idea de <span className="text-white font-medium">{TEAM_MEMBERS[currentUser]?.label || currentUser}</span></span>
          </div>
          <button type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: '#faff05' }}>
            Agregar idea
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">¿Eliminar idea?</p>
        <p className="text-zinc-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

export default function IdeaBank() {
  const { ideas, deleteIdea, updateIdea, clients } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [filterClient, setFilterClient] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const appliedCount = ideas.filter(i => i.applied).length;
  const activeCount = ideas.filter(i => !i.applied).length;

  const activeIdeas = ideas.filter(i => !i.applied);
  const filtered = filterClient === 'all'
    ? activeIdeas
    : activeIdeas.filter(i => i.clientId === filterClient);

  const clientsWithIdeas = clients.filter(c => activeIdeas.some(i => i.clientId === c.id));

  const relativeTime = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} d`;
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: title + filter pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#faff05]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-white font-semibold text-sm">Banco de Ideas</h2>
          </div>
          {clientsWithIdeas.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setFilterClient('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filterClient === 'all' ? 'text-black' : 'text-zinc-500 bg-[#080808] hover:text-white'}`}
                style={filterClient === 'all' ? { background: '#faff05' } : {}}>
                Todos
              </button>
              {clientsWithIdeas.map(c => (
                <button key={c.id} onClick={() => setFilterClient(filterClient === c.id ? 'all' : c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border-l-2 ${filterClient === c.id ? 'text-black' : 'text-zinc-500 bg-[#080808] hover:text-white'}`}
                  style={filterClient === c.id ? { background: c.color, borderLeftColor: c.color } : { borderLeftColor: c.color }}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Right: stats + button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-500">Ideas: <span className="text-white font-medium">{activeCount}</span></span>
            <span className="w-px h-3 bg-zinc-800" />
            <span className="text-zinc-500">Ejecutadas: <span className="font-medium" style={{ color: '#60a5fa' }}>{appliedCount}</span></span>
          </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-black flex-shrink-0"
          style={{ background: '#faff05' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva idea
        </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#faff0515' }}>
            <svg className="w-6 h-6" style={{ color: '#faff05' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-zinc-400 text-sm font-medium">Sin ideas activas</p>
          <p className="text-zinc-600 text-xs mt-1">Agregá una nueva o revisá las aplicadas</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {[...filtered].reverse().map(idea => {
            const client = clients.find(c => c.id === idea.clientId);
            const color = client?.color || '#faff05';
            return (
              <div key={idea.id}
                className={`relative flex flex-col gap-1.5 p-3 rounded-xl border group transition-all duration-200 ${editingId === idea.id ? '' : 'hover:scale-[1.06] hover:-translate-y-1 hover:z-10 hover:shadow-xl hover:shadow-black/60'}`}
                style={{ background: color + '0d', borderColor: color + '30', borderTopWidth: '3px', borderTopColor: color }}>

                {/* Top row: client + actions */}
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[10px] font-semibold truncate" style={{ color }}>
                      {client?.name || 'General'}
                    </span>
                  </div>
                  {editingId !== idea.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <button
                        onClick={() => updateIdea(idea.id, { applied: true })}
                        title="Marcar como aplicada"
                        className="text-zinc-600 hover:text-green-400 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setEditingId(idea.id); setEditText(idea.text); }}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(idea)}
                        className="text-zinc-600 hover:text-red-400 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Idea text */}
                {editingId === idea.id ? (
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onBlur={() => {
                      const trimmed = editText.trim();
                      if (trimmed && trimmed !== idea.text) updateIdea(idea.id, { text: trimmed });
                      setEditingId(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        const trimmed = editText.trim();
                        if (trimmed && trimmed !== idea.text) updateIdea(idea.id, { text: trimmed });
                        setEditingId(null);
                      }
                    }}
                    className="bg-transparent text-zinc-200 text-xs leading-relaxed resize-none focus:outline-none w-full"
                    rows={3}
                  />
                ) : (
                  <p className="text-zinc-200 text-xs leading-relaxed">
                    {idea.text}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t" style={{ borderColor: color + '20' }}>
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0"
                      style={{ background: TEAM_MEMBERS[idea.createdBy]?.bg || '#a78bfa', color: TEAM_MEMBERS[idea.createdBy]?.text || '#000' }}>
                      {TEAM_MEMBERS[idea.createdBy]?.initials || '?'}
                    </div>
                    <span className="text-zinc-600 text-[9px]">{relativeTime(idea.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddIdeaModal onClose={() => setShowAdd(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          message={`Esta idea se eliminará permanentemente.`}
          onConfirm={() => { deleteIdea(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
