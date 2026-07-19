import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import RichTextEditor from '../components/RichTextEditor';
import UserAvatar from '../components/UserAvatar';
import { TEAM_MEMBERS as ASSIGNEES, PRIORITY_STYLES as PRIORITIES } from '../constants';

const getSortIndex = (task) =>
  task.sortIndex !== undefined ? task.sortIndex : parseInt(task.id) || 0;

async function compressImage(file, maxWidth = 700, quality = 0.65) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxWidth / img.width, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};


const NOTE_COLORS = {
  kann: { bg: '#faff05', text: '#000', label: 'Kann' },
  jero: { bg: '#3b82f6', text: '#fff', label: 'Jero' },
  facu: { bg: '#34d399', text: '#000', label: 'Facu' },
};


const COLUMNS = [
  { id: 'todo',       label: 'To Do' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'done',       label: 'Done' },
];

const STATUS_OPTS = [
  { id: 'todo',       label: 'To Do',       color: '#71717a', text: '#fff' },
  { id: 'inprogress', label: 'In Progress', color: '#faff05', text: '#000' },
  { id: 'done',       label: 'Done',        color: '#34d399', text: '#000' },
];

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     color: '#22c55e', bg: '#22c55e18' },
  { id: 'pinterest', label: 'Pinterest',  color: '#f472b6', bg: '#f472b618' },
  { id: 'meta',      label: 'Meta Ads',   color: '#38bdf8', bg: '#38bdf818' },
  { id: 'youtube',   label: 'YouTube',    color: '#ef4444', bg: '#ef444418' },
  { id: 'google',    label: 'Google Ads', color: '#e4e4e7', bg: '#e4e4e712' },
  { id: 'linkedin',  label: 'LinkedIn',   color: '#67e8f9', bg: '#67e8f918' },
  { id: 'amazon',    label: 'Amazon',     color: '#facc15', bg: '#facc1518' },
  { id: 'web',       label: 'Web',        color: '#f0f0f0', bg: '#f0f0f012' },
  { id: 'instagram', label: 'Instagram',  color: '#e1306c', bg: '#e1306c18' },
  { id: 'facebook',  label: 'Facebook',   color: '#60a5fa', bg: '#60a5fa18' },
  { id: 'shopify',   label: 'Shopify',    color: '#96bf48', bg: '#96bf4818' },
];

// ── Confirm dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">¿Confirmar eliminación?</p>
        <p className="text-zinc-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-full text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors">Eliminar</button>
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
function TaskCard({ task, onMove, onEdit, onDelete, onDuplicate, onDropOnCard, onDragOverCard, onDragLeaveCard, cardDropTarget }) {
  const { clients, archiveTask, updateTask, currentUser } = useApp();
  const client = clients.find(c => c.id === task.clientId);
  const priority = PRIORITIES[task.priority] || PRIORITIES['Media'];
  const dragRef = useRef(null);

  const [showImages, setShowImages] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingBlock, setAddingBlock] = useState(false);
  const [blockText, setBlockText] = useState('');
  const open = expanded || hovered || addingNote || addingBlock;

  const stickyNotes = task.stickyNotes || [];

  const createdAt = parseInt(task.id);
  const isRecent = !isNaN(createdAt) && (Date.now() - createdAt) < 18 * 60 * 60 * 1000;

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    updateTask(task.id, {
      stickyNotes: [...stickyNotes, { id: Date.now().toString(), author: currentUser, text: noteText.trim(), createdAt: Date.now() }],
    });
    setNoteText('');
    setAddingNote(false);
  };

  const handleDeleteNote = (noteId) => {
    updateTask(task.id, { stickyNotes: stickyNotes.filter(n => n.id !== noteId) });
  };

  const handleBlockClick = () => {
    if (task.blocked) {
      updateTask(task.id, { blocked: null });
    } else {
      setAddingBlock(true);
    }
  };

  const handleConfirmBlock = () => {
    if (!blockText.trim()) { setAddingBlock(false); return; }
    updateTask(task.id, { blocked: { reason: blockText.trim().slice(0, 40), by: currentUser, at: Date.now() } });
    setBlockText('');
    setAddingBlock(false);
  };

  const addImages = async (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    const current = task.images || [];
    const newImgs = [];
    for (const file of imageFiles) {
      const dataUrl = await compressImage(file);
      if (dataUrl) newImgs.push({ id: `${Date.now()}${Math.random().toString(36).slice(2)}`, name: file.name, dataUrl });
    }
    if (newImgs.length) updateTask(task.id, { images: [...current, ...newImgs] });
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(i => i.type.startsWith('image/'));
    if (!imageItems.length) return;
    e.preventDefault();
    addImages(imageItems.map(i => i.getAsFile()).filter(Boolean));
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setImageDragOver(true);
      e.dataTransfer.dropEffect = 'copy';
      return;
    }
    setImageDragOver(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    onDragOverCard && onDragOverCard(task.id, pos);
  };

  const handleCardDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.some(f => f.type.startsWith('image/'))) {
      addImages(files);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    onDropOnCard && onDropOnCard(e, task.id, pos);
  };

  const days = task.deadline
    ? Math.ceil((new Date(task.deadline) - new Date()) / 86400000)
    : null;

  const isOverdue = days !== null && days < 0;

  const handleExtendDeadline = (e) => {
    e.stopPropagation();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const mo = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    updateTask(task.id, { deadline: `${y}-${mo}-${d}` });
  };

  const completedAtFormatted = task.completedAt
    ? new Date(task.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const platforms = (task.platforms || [])
    .map(pid => PLATFORMS.find(p => p.id === pid))
    .filter(Boolean);

  const images = task.images || [];

  const descParts = task.description ? task.description.split(/(<img[^>]*?>)/gi) : [];
  const descHasInlineImgs = descParts.some(p => /^<img/i.test(p));

  const showBefore = cardDropTarget?.position === 'before';
  const showAfter = cardDropTarget?.position === 'after';

  return (
    <>
      <div className="relative" style={{ zIndex: open ? 20 : 'auto', marginBottom: open && stickyNotes.length > 0 ? 90 : 0, transition: 'margin-bottom 200ms ease' }}>
        {showBefore && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#faff05] rounded-full z-20 pointer-events-none" />}
        {showAfter && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#faff05] rounded-full z-20 pointer-events-none" />}
      <div
        ref={dragRef}
        draggable
        tabIndex={0}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDragLeave={() => { setImageDragOver(false); onDragLeaveCard && onDragLeaveCard(); }}
        onDrop={handleCardDrop}
        onPaste={handlePaste}
        onClick={() => setExpanded(p => !p)}
        className="relative bg-[#080808] border rounded-xl p-3.5 cursor-grab active:cursor-grabbing group focus:outline-none transition-[border-color,box-shadow] duration-200"
        style={{
          borderLeft: `3px solid ${client?.color || '#333'}`,
          borderTopColor: imageDragOver ? '#faff05' : open ? '#222' : '#111',
          borderRightColor: imageDragOver ? '#faff05' : open ? '#222' : '#111',
          borderBottomColor: imageDragOver ? '#faff05' : open ? '#222' : '#111',
          boxShadow: imageDragOver
            ? '0 0 0 2px #faff0540'
            : open
              ? '0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)'
              : 'none',
        }}
      >
        {/* Top-right: hover buttons */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          {/* Block button */}
          <button
            type="button"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleBlockClick(); }}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              task.blocked ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-zinc-800 text-zinc-400 hover:text-red-400'
            }`}
            title={task.blocked ? 'Quitar bloqueo' : 'Marcar como bloqueada'}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setAddingNote(p => !p); }}
            title="Agregar nota"
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={addingNote
              ? { background: NOTE_COLORS[currentUser]?.bg || '#faff05', color: NOTE_COLORS[currentUser]?.text || '#000' }
              : { background: '#27272a', color: '#a1a1aa' }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v12l-4 4H4V4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v8h4" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            title="Editar"
            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(task); }}
            title="Duplicar"
            className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {task.status === 'done' && (
            <button
              onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }}
              title="Archivar como completada"
              className="w-6 h-6 rounded-lg bg-green-500/20 hover:bg-green-500/40 flex items-center justify-center text-green-400 hover:text-green-300 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            title="Eliminar"
            className="w-6 h-6 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </div>{/* end hover-only buttons */}
        </div>

        {/* Mobile-only: inline status actions on expand */}
        {expanded && (
          <div className="md:hidden flex gap-2 mb-3">
            {STATUS_OPTS.filter(s => s.id !== task.status).map(opt => (
              <button
                key={opt.id}
                onClick={(e) => { e.stopPropagation(); onMove(task.id, opt.id); setExpanded(false); }}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-center"
                style={{ background: opt.color, color: opt.text }}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

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
                  <UserAvatar key={a} userId={a} size={20} title={av.label} />
                );
              })}
            </div>
          )}
        </div>

        {/* Title */}
        <h4 className="text-white text-sm font-medium mb-1 leading-snug">{task.title}</h4>
        {task.description && (
          <div
            className={`text-zinc-500 text-xs mb-2 leading-relaxed overflow-hidden transition-[max-height] duration-300 ease-out
              [&_strong]:font-bold [&_strong]:text-zinc-300
              [&_em]:italic [&_u]:underline
              [&_p]:mb-1 [&_p:last-child]:mb-0
              [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-zinc-300 [&_h1]:mb-1
              [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:text-zinc-300 [&_h2]:mb-1
              [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-zinc-300 [&_h3]:mb-1
              [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1
              [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1
              [&_li]:mb-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-2 [&_blockquote]:text-zinc-600`}
            style={{ maxHeight: open ? 600 : 38 }}>
            {descHasInlineImgs ? descParts.map((part, i) => {
              if (/^<img/i.test(part)) {
                const src = (part.match(/src="([^"]*)"/i) || [])[1] || '';
                return (
                  <div key={i} className="relative inline-block group/inlineimg my-1 max-w-full">
                    <img src={src} alt="" className="max-w-full rounded-lg block" draggable={false} />
                    {open && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateTask(task.id, { description: task.description.replace(part, '') }); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover/inlineimg:opacity-100 transition-opacity z-10">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              }
              return part ? <span key={i} dangerouslySetInnerHTML={{ __html: part }} /> : null;
            }) : <div dangerouslySetInnerHTML={{ __html: task.description }} />}
          </div>
        )}

        {/* Platform tags */}
        {(platforms.length > 0 || (task.customPlatforms || []).length > 0) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {platforms.map(p => (
              <span key={p.id}
                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                style={{ background: p.bg, color: p.color }}>
                {p.label}
              </span>
            ))}
            {(task.customPlatforms || []).map(cp => (
              <span key={cp}
                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide bg-zinc-700/60 text-zinc-300">
                {cp}
              </span>
            ))}
          </div>
        )}

        {/* Deadline + creator badge */}
        <div className="flex justify-between items-center mt-1">
          {/* LEFT: "!" badge */}
          <div className="relative group/creator flex-shrink-0" onClick={e => e.stopPropagation()}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center cursor-default select-none"
              style={{
                fontSize: 10, fontWeight: 900, color: '#000', lineHeight: 1,
                background: isRecent ? '#ef4444' : '#52525b',
                boxShadow: isRecent ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
              }}>
              !
            </div>
            <div className="absolute bottom-full left-0 mb-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 whitespace-nowrap pointer-events-none z-50
              opacity-0 group-hover/creator:opacity-100 transition-opacity duration-150"
              style={{ fontSize: 10 }}>
              {isRecent
                ? `Tarea creada recientemente${task.createdBy ? ` por ${ASSIGNEES[task.createdBy]?.label || task.createdBy}` : ''}`
                : `Creada por ${task.createdBy ? (ASSIGNEES[task.createdBy]?.label || task.createdBy) : '?'}`}
            </div>
          </div>

          {/* RIGHT: blocked indicator + deadline */}
          {(task.deadline || task.blocked) && (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              {/* Deadline display */}
              {task.deadline && (isOverdue && task.status === 'done' ? (
                <div className="relative group/done flex-shrink-0">
                  <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: '#34d399' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Terminada
                  </span>
                  <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 whitespace-nowrap pointer-events-none z-50 opacity-0 group-hover/done:opacity-100 transition-opacity duration-150"
                    style={{ fontSize: 10 }}>
                    {completedAtFormatted ? `Completada el ${completedAtFormatted}` : 'Completada (fecha no registrada)'}
                  </div>
                </div>
              ) : (
                <span className={`text-xs flex items-center gap-1 ${
                  days !== null && days < 3 ? 'text-red-400' :
                  days !== null && days < 7 ? 'text-yellow-400' : 'text-zinc-500'
                }`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {days !== null ? (days < 0 ? 'Vencida' : days === 0 ? 'Hoy' : `${days}d`) : task.deadline}
                </span>
              ))}
              {/* Red lock — persistent when blocked */}
              {task.blocked && (
                <div className="relative group/blockedbadge flex-shrink-0">
                  <div className="flex items-center justify-center" style={{ color: '#ef4444' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded-lg bg-zinc-900 border border-red-800 text-red-300 whitespace-nowrap pointer-events-none z-50 opacity-0 group-hover/blockedbadge:opacity-100 transition-opacity duration-150"
                    style={{ fontSize: 10 }}>
                    {task.blocked.reason}
                  </div>
                </div>
              )}
              {/* Replay button: overdue todo/inprogress only */}
              {isOverdue && task.status !== 'done' && (
                <div className="relative group/reactivate flex-shrink-0">
                  <button
                    type="button"
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleExtendDeadline(e); }}
                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-green-500/20 transition-colors"
                    style={{ color: '#34d399' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 whitespace-nowrap pointer-events-none z-50 opacity-0 group-hover/reactivate:opacity-100 transition-opacity duration-150"
                    style={{ fontSize: 10 }}>
                    Reactivar tarea (mañana)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Images strip */}
        {images.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#111]">
            <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{images.length} {images.length === 1 ? 'imagen' : 'imágenes'}</span>
            </div>
            {/* Thumbnails — always visible on hover/expand */}
            <div
              className="grid grid-cols-4 gap-1 overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
              style={{ maxHeight: open ? 500 : 0, opacity: open ? 1 : 0 }}>
              {images.map(img => (
                <div key={img.id} className="relative aspect-square flex-shrink-0 group/img">
                  <button
                    draggable={false}
                    onClick={(e) => { e.stopPropagation(); setLightbox(img); }}
                    className="absolute inset-0 rounded-lg overflow-hidden hover:ring-2 hover:ring-white/30 transition-all">
                    <img
                      src={img.dataUrl} alt={img.name}
                      className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                      draggable={false} />
                  </button>
                  <button
                    draggable={false}
                    onClick={(e) => { e.stopPropagation(); updateTask(task.id, { images: images.filter(i => i.id !== img.id) }); }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sticky notes peek — visible when collapsed */}
        {stickyNotes.length > 0 && !open && (
          <div className="mt-2 flex items-center gap-1.5 pt-1">
            {stickyNotes.slice(0, 5).map((n, i) => {
              const nc = NOTE_COLORS[n.author] || { bg: '#faff05' };
              return (
                <div key={n.id} className="relative flex-shrink-0"
                  style={{
                    width: 16, height: 16,
                    background: nc.bg,
                    borderRadius: 2,
                    transform: `rotate(${([-4, 3, -2, 5, -1])[i % 5]}deg)`,
                    opacity: 0.8,
                  }}>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 5, height: 5, background: 'rgba(0,0,0,0.22)', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                </div>
              );
            })}
            {stickyNotes.length > 5 && <span className="text-zinc-700 text-[9px]">+{stickyNotes.length - 5}</span>}
          </div>
        )}

        {/* Inline compose — shown when adding a note */}
        {addingNote && (
          <div className="mt-2 pt-2 border-t border-[#111]" onClick={e => e.stopPropagation()}>
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${(NOTE_COLORS[currentUser]?.bg || '#faff05')}40` }}>
              <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
                style={{ background: NOTE_COLORS[currentUser]?.bg || '#faff05', color: NOTE_COLORS[currentUser]?.text || '#000' }}>
                {NOTE_COLORS[currentUser]?.label || currentUser}
              </div>
              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); }
                  if (e.key === 'Escape') { setAddingNote(false); setNoteText(''); }
                }}
                rows={2}
                maxLength={100}
                placeholder="Escribe tu nota... (Enter para guardar)"
                className="w-full bg-[#0d0d0d] px-2.5 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none resize-none block"
              />
              <div className="flex justify-end gap-1.5 px-2.5 pb-2 bg-[#0d0d0d]">
                <button onClick={() => { setAddingNote(false); setNoteText(''); }}
                  className="text-[10px] text-zinc-500 hover:text-white px-2 py-0.5 rounded transition-colors">
                  Cancelar
                </button>
                <button onClick={handleAddNote}
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded transition-colors"
                  style={{ background: NOTE_COLORS[currentUser]?.bg || '#faff05', color: NOTE_COLORS[currentUser]?.text || '#000' }}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline block reason form */}
        {addingBlock && (
          <div className="mt-2 pt-2 border-t border-[#111]" onClick={e => e.stopPropagation()}>
            <div className="rounded-lg overflow-hidden border border-red-500/30">
              <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400">
                ¿Por qué está bloqueada?
              </div>
              <div className="relative bg-[#0d0d0d]">
                <input
                  autoFocus
                  type="text"
                  value={blockText}
                  onChange={e => setBlockText(e.target.value.slice(0, 40))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleConfirmBlock(); }
                    if (e.key === 'Escape') { setAddingBlock(false); setBlockText(''); }
                  }}
                  maxLength={40}
                  placeholder="Descripción breve..."
                  className="w-full bg-transparent px-2.5 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none block pr-10"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-700 pointer-events-none">{blockText.length}/40</span>
              </div>
              <div className="flex justify-end gap-1.5 px-2.5 pb-2 bg-[#0d0d0d]">
                <button type="button" onClick={() => { setAddingBlock(false); setBlockText(''); }}
                  className="text-[10px] text-zinc-500 hover:text-white px-2 py-0.5 rounded transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={handleConfirmBlock}
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                  Bloquear
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Sticky notes hanging below the card */}
      {open && stickyNotes.length > 0 && (
        <div
          className="absolute flex gap-2"
          style={{ top: 'calc(100% - 18px)', left: 10, zIndex: 30 }}
          onClick={e => e.stopPropagation()}>
          {stickyNotes.map((n) => {
            const nc = NOTE_COLORS[n.author] || { bg: '#faff05', text: '#000', label: n.author };
            return (
              <div key={n.id}
                className="group/snote relative flex-shrink-0 overflow-hidden"
                style={{
                  width: 100,
                  height: 100,
                  background: nc.bg,
                  borderRadius: 3,
                  boxShadow: '2px 6px 18px rgba(0,0,0,0.65), 0 1px 3px rgba(0,0,0,0.4)',
                }}>
                <div style={{ padding: '5px 7px 4px', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: nc.text === '#000' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)', borderBottom: `1px solid ${nc.text === '#000' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'}` }}>
                  {nc.label}
                </div>
                <div style={{ padding: '5px 7px', fontSize: 9, color: nc.text, lineHeight: 1.35, wordBreak: 'break-word', whiteSpace: 'pre-wrap', overflow: 'hidden', height: 74 }}>
                  {n.text.slice(0, 100)}
                </div>
                <button
                  onClick={() => handleDeleteNote(n.id)}
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover/snote:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center rounded"
                  style={{ color: nc.text, background: 'rgba(0,0,0,0.15)' }}>
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: 'rgba(0,0,0,0.2)', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Lightbox — fixed overlay, rendered outside the card in DOM but still inside the component */}
      {lightbox && <Lightbox img={lightbox} onClose={() => setLightbox(null)} />}

    </>
  );
}

// ── Task modal ─────────────────────────────────────────────────────────────────
export function TaskModal({ onClose, defaultStatus = 'todo', task = null }) {
  const { addTask, updateTask, clients } = useApp();
  const isEdit = !!task;
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    title:           task?.title || '',
    description:     task?.description || '',
    clientId:        task?.clientId || clients[0]?.id || '',
    priority:        task?.priority || 'Media',
    deadline:        task?.deadline || '',
    assignees:       task?.assignees || [],
    status:          task?.status || defaultStatus,
    platforms:       task?.platforms || [],
    customPlatforms: task?.customPlatforms || [],
    images:          task?.images || [],
  });

  const [customPlatInput, setCustomPlatInput] = useState('');
  const [showCustomPlat, setShowCustomPlat] = useState(false);

  const addCustomPlatform = () => {
    const val = customPlatInput.trim();
    if (!val) { setShowCustomPlat(false); return; }
    if (!form.customPlatforms.includes(val)) {
      setForm(p => ({ ...p, customPlatforms: [...p.customPlatforms, val] }));
    }
    setCustomPlatInput('');
    setShowCustomPlat(false);
  };

  const removeCustomPlatform = (val) =>
    setForm(p => ({ ...p, customPlatforms: p.customPlatforms.filter(x => x !== val) }));

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
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#111]">
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
              className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
              placeholder="Ej. Diseño de logo principal" required />
          </div>

          {/* Description */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Descripción</label>
            <RichTextEditor
              value={form.description}
              onChange={html => setForm(p => ({ ...p, description: html }))}
            />
          </div>

          {/* Client + Priority */}
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
                {Object.keys(PRIORITIES).map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Deadline + Column */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]"
                required />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Columna</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
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
                    className="px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border"
                    style={active
                      ? { background: p.bg, color: p.color, borderColor: p.color + '60' }
                      : { background: 'transparent', color: '#52525b', borderColor: '#27272a' }
                    }>
                    {p.label}
                  </button>
                );
              })}
              {/* Custom platforms */}
              {form.customPlatforms.map(cp => (
                <div key={cp} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-700/50 text-zinc-300 border border-zinc-600">
                  {cp}
                  <button type="button" onClick={() => removeCustomPlatform(cp)}
                    className="text-zinc-500 hover:text-white transition-colors ml-0.5">×</button>
                </div>
              ))}
              {/* Otro button / input */}
              {showCustomPlat ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={customPlatInput}
                    onChange={e => setCustomPlatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPlatform(); } if (e.key === 'Escape') { setShowCustomPlat(false); setCustomPlatInput(''); } }}
                    placeholder="Nombre..."
                    className="bg-[#080808] border border-[#faff05] rounded-full px-2.5 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none w-24"
                  />
                  <button type="button" onClick={addCustomPlatform}
                    className="px-2 py-1 rounded-full text-xs font-semibold text-black"
                    style={{ background: '#faff05' }}>+</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowCustomPlat(true)}
                  className="px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border border-dashed"
                  style={{ background: 'transparent', color: '#52525b', borderColor: '#27272a' }}>
                  + Otro
                </button>
              )}
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
            <label className="flex items-center gap-2 border border-dashed border-[#1a1a1a] rounded-xl px-3 py-2.5 cursor-pointer hover:border-zinc-500 hover:bg-white/[0.02] transition-all">
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all ${
                    form.assignees.includes(key) ? 'border-[#faff05]' : 'border-[#111] text-zinc-500'
                  }`}>
                  <UserAvatar userId={key} size={24} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full py-2.5 rounded-full text-sm font-semibold text-black"
            style={{ background: '#faff05' }}>
            {isEdit ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Floating PiP view (read-only) ──────────────────────────────────────────────
const COL_COLORS = { todo: '#71717a', inprogress: '#faff05', done: '#34d399' };
const COL_LABELS = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
const PRIORITY_COLORS = { Alta: '#f87171', Media: '#fbbf24', Baja: '#34d399' };

function FloatCard({ task, clients }) {
  const { updateTask } = useApp();
  const [hovered, setHovered] = useState(false);
  const client = clients.find(c => c.id === task.clientId);
  const clientColor = client?.color || '#333';
  const images = task.images || [];
  const description = task.description
    ? task.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
  const days = task.deadline
    ? Math.ceil((new Date(task.deadline) - new Date()) / 86400000)
    : null;
  const deadlineColor = days === null ? '#52525b' : days < 0 ? '#f87171' : days < 3 ? '#f87171' : days < 7 ? '#facc15' : '#52525b';
  const deadlineLabel = days === null ? null : days < 0 ? 'Vencida' : days === 0 ? 'Hoy' : `${days}d`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 10px',
        borderRadius: 10,
        borderStyle: 'solid',
        borderWidth: '1px',
        borderLeftWidth: '3px',
        borderLeftColor: clientColor,
        borderTopColor: hovered ? '#2a2a2a' : '#1a1a1a',
        borderRightColor: hovered ? '#2a2a2a' : '#1a1a1a',
        borderBottomColor: hovered ? '#2a2a2a' : '#1a1a1a',
        background: hovered ? '#111' : '#0c0c0c',
        marginBottom: 5,
        position: 'relative',
        zIndex: hovered ? 10 : 'auto',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.85)' : 'none',
        transition: 'background 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
        cursor: 'default',
      }}>

      {/* Title */}
      <div style={{ color: '#e4e4e7', fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>
        {task.title}
      </div>

      {/* Description — expands on hover */}
      {description && (
        <div style={{
          color: '#71717a',
          fontSize: 10,
          lineHeight: 1.55,
          overflow: 'hidden',
          maxHeight: hovered ? 300 : 0,
          opacity: hovered ? 1 : 0,
          marginBottom: hovered ? 6 : 0,
          transition: 'max-height 280ms ease-out, opacity 220ms ease, margin-bottom 280ms ease',
        }}>
          {description}
        </div>
      )}

      {/* Images — shown on hover */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 3,
          overflow: 'hidden',
          maxHeight: hovered ? 300 : 0,
          opacity: hovered ? 1 : 0,
          marginBottom: hovered ? 6 : 0,
          transition: 'max-height 280ms ease-out, opacity 220ms ease, margin-bottom 280ms ease',
        }}>
          {images.map(img => (
            <div key={img.id} style={{ position: 'relative' }}>
              {/* image with rounded corners via clip, no overflow:hidden on wrapper */}
              <img src={img.dataUrl} alt={img.name}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', borderRadius: 5 }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask(task.id, { images: images.filter(i => i.id !== img.id) });
                }}
                style={{
                  position: 'absolute', top: 3, right: 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'rgba(220,38,38,0.85)', border: 'none',
                  color: '#fff', fontSize: 12, fontWeight: 900, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0, zIndex: 10,
                }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Meta row: client · priority · deadline · assignees */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {client && (
          <span style={{ color: clientColor, fontSize: 9.5, fontWeight: 600 }}>{client.name}</span>
        )}
        {task.priority && (
          <span style={{ color: PRIORITY_COLORS[task.priority] || '#888', fontSize: 9, background: (PRIORITY_COLORS[task.priority] || '#888') + '20', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>
            {task.priority}
          </span>
        )}
        {deadlineLabel && (
          <span style={{ color: deadlineColor, fontSize: 9, fontWeight: 500 }}>{deadlineLabel}</span>
        )}
        <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
          {(task.assignees || []).map(a => (
            <UserAvatar key={a} userId={a} size={14} />
          ))}
        </div>
      </div>
    </div>
  );
}

function KanbanFloatView({ tasks, clients }) {
  const s = {
    wrap: { background: '#080808', color: '#fff', fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: '12px', minHeight: '100vh', boxSizing: 'border-box' },
    header: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #111' },
    headerIcon: { color: '#faff05', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' },
    col: { marginBottom: 16 },
    colHead: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 },
    dot: (color) => ({ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }),
    colLabel: (color) => ({ color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }),
    count: { color: '#52525b', fontSize: 10, marginLeft: 2 },
    empty: { color: '#3f3f46', fontSize: 10, textAlign: 'center', padding: '8px 0' },
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#faff05" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
        <span style={s.headerIcon}>Kanban</span>
        <span style={{ color: '#3f3f46', fontSize: 10, marginLeft: 2 }}>· {tasks.length} tareas</span>
      </div>
      {['todo', 'inprogress', 'done'].map(colId => {
        const color = COL_COLORS[colId];
        const colTasks = tasks.filter(t => t.status === colId);
        return (
          <div key={colId} style={s.col}>
            <div style={s.colHead}>
              <div style={s.dot(color)} />
              <span style={s.colLabel(color)}>{COL_LABELS[colId]}</span>
              <span style={s.count}>({colTasks.length})</span>
            </div>
            {colTasks.length === 0 && <div style={s.empty}>Sin tareas</div>}
            {colTasks.map(task => (
              <FloatCard key={task.id} task={task} clients={clients} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function FloatViewButton({ tasks, clients }) {
  const [pipContainer, setPipContainer] = useState(null);

  const openPip = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert('Tu navegador no soporta ventanas flotantes. Usá Chrome 116 o superior.');
      return;
    }
    try {
      const pip = await window.documentPictureInPicture.requestWindow({ width: 310, height: 540 });

      // Copy all styles into the PiP window so fonts/resets work
      [...document.styleSheets].forEach(sheet => {
        try {
          const style = pip.document.createElement('style');
          style.textContent = [...sheet.cssRules].map(r => r.cssText).join('\n');
          pip.document.head.appendChild(style);
        } catch (_) {}
      });
      [...document.querySelectorAll('link[rel="stylesheet"]')].forEach(link => {
        const el = pip.document.createElement('link');
        el.rel = 'stylesheet'; el.href = link.href;
        pip.document.head.appendChild(el);
      });
      pip.document.documentElement.style.cssText = 'height:100%';
      pip.document.body.style.cssText = 'margin:0;padding:0;background:#080808;height:100%;overflow-y:auto;overflow-x:hidden';

      const container = pip.document.createElement('div');
      pip.document.body.appendChild(container);
      setPipContainer({ el: container, win: pip });
      pip.addEventListener('pagehide', () => setPipContainer(null));
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  return (
    <>
      <button
        onClick={openPip}
        title="Abrir vista flotante (siempre visible)"
        className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-zinc-400 bg-black border border-[#111] hover:border-[#faff05] hover:text-[#faff05] transition-all">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9.5V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2v-4.5M3 9.5h9m0 0V3m0 6.5L7.5 3M21 15H9" />
        </svg>
        Vista flotante
      </button>
      {pipContainer && createPortal(<KanbanFloatView tasks={tasks} clients={clients} />, pipContainer.el)}
    </>
  );
}

// ── Main board ─────────────────────────────────────────────────────────────────
export default function KanbanBoard({ filters: extFilters, showIntro, onIntroDone }) {
  const { tasks, moveTask, deleteTask, addTask, clients, reorderTask, archivedCount } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [addToColumn, setAddToColumn] = useState('todo');
  const [editTask, setEditTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [filterClient, setFilterClient] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  useEffect(() => { onIntroDone?.(); }, []);

  const handleDuplicate = (task) => {
    const { id, ...rest } = task;
    addTask({ ...rest, title: task.title + ' (copy)' });
  };

  const handleDropOnCard = (e, targetTaskId, position) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('taskId');
    if (!draggedId || draggedId === targetTaskId) { setDropTarget(null); return; }
    const draggedTask = tasks.find(t => t.id === draggedId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    if (!draggedTask || !targetTask) { setDropTarget(null); return; }
    const colId = targetTask.status;
    const colTasks = tasks.filter(t => t.status === colId).sort((a, b) => getSortIndex(a) - getSortIndex(b));
    const withoutDragged = colTasks.filter(t => t.id !== draggedId);
    const targetIdx = withoutDragged.findIndex(t => t.id === targetTaskId);
    const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
    const before = withoutDragged[insertIdx - 1];
    const after = withoutDragged[insertIdx];
    let newSortIndex;
    if (!before && !after) newSortIndex = getSortIndex(targetTask);
    else if (!before) newSortIndex = getSortIndex(after) - 1000;
    else if (!after) newSortIndex = getSortIndex(before) + 1000;
    else newSortIndex = (getSortIndex(before) + getSortIndex(after)) / 2;
    const updates = { sortIndex: newSortIndex };
    if (draggedTask.status !== colId) updates.status = colId;
    reorderTask(draggedId, updates);
    setDropTarget(null);
    setDragOver(null);
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const draggedTask = tasks.find(t => t.id === taskId);
      if (draggedTask) {
        const colTasks = tasks.filter(t => t.status === colId).sort((a, b) => getSortIndex(a) - getSortIndex(b));
        const last = colTasks[colTasks.length - 1];
        const newSortIndex = last ? getSortIndex(last) + 1000 : Date.now();
        const updates = { sortIndex: newSortIndex };
        if (draggedTask.status !== colId) updates.status = colId;
        reorderTask(taskId, updates);
      }
    }
    setDragOver(null);
    setDropTarget(null);
  };

  const f = extFilters || { filterClient, filterAssignee: 'all', filterPriority: 'all', filterStatus: 'all', search: '' };
  const filteredTasks = tasks.filter(t => {
    if (f.filterClient !== 'all' && t.clientId !== f.filterClient) return false;
    if (f.filterAssignee !== 'all' && !t.assignees?.includes(f.filterAssignee)) return false;
    if (f.filterPriority !== 'all' && t.priority !== f.filterPriority) return false;
    if (f.search && !t.title.toLowerCase().includes(f.search.toLowerCase())) return false;
    return true;
  });
  const columnTasks = (colId) => filteredTasks.filter(t => t.status === colId).sort((a, b) => {
    if (!a.deadline && !b.deadline) return getSortIndex(a) - getSortIndex(b);
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    const diff = new Date(a.deadline) - new Date(b.deadline);
    return diff !== 0 ? diff : getSortIndex(a) - getSortIndex(b);
  });
  const clientsWithTasks = clients.filter(c => tasks.some(t => t.clientId === c.id));

  const colHeaderColor = { todo: '#71717a', inprogress: '#faff05', done: '#34d399' };

  return (
    <div className="h-full">

      {/* Client filter pills */}
      {!extFilters && clientsWithTasks.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          <button
            onClick={() => setFilterClient('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterClient === 'all' ? 'text-black' : 'text-zinc-500 bg-[#080808] hover:text-white'}`}
            style={filterClient === 'all' ? { background: '#faff05' } : {}}>
            Todos <span className="opacity-60">({tasks.length})</span>
          </button>
          {clientsWithTasks.map(c => {
            const count = tasks.filter(t => t.clientId === c.id).length;
            return (
              <button key={c.id}
                onClick={() => setFilterClient(filterClient === c.id ? 'all' : c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border-l-2 ${filterClient === c.id ? 'text-black' : 'text-zinc-500 bg-[#080808] hover:text-white'}`}
                style={filterClient === c.id ? { background: c.color, borderLeftColor: c.color } : { borderLeftColor: c.color }}>
                {c.name} <span className={filterClient === c.id ? 'opacity-70' : 'opacity-50'}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Board columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col, colIndex) => {
          const colTasks = columnTasks(col.id);
          const isOver = dragOver === col.id;
          return (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, col.id)}
              className={`rounded-2xl p-3 min-h-96 transition-all ${isOver ? 'bg-white/[0.03] ring-1 ring-[#faff05]/30' : ''}`}>

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

              {/* Archived count inside Done column */}
              {col.id === 'done' && archivedCount > 0 && (
                <div className="flex items-center justify-center gap-1.5 mb-2 py-1.5 rounded-lg" style={{ background: '#34d39910' }}>
                  <svg className="w-3 h-3 text-[#34d399]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[10px] font-medium text-[#34d399]">{archivedCount} completadas archivadas</span>
                </div>
              )}

              {/* Cards */}
              <div className="space-y-2">
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task}
                    onMove={moveTask}
                    onEdit={setEditTask}
                    onDelete={(t) => setConfirmDelete(t)}
                    onDuplicate={handleDuplicate}
                    onDropOnCard={handleDropOnCard}
                    onDragOverCard={(taskId, pos) => setDropTarget({ taskId, position: pos })}
                    onDragLeaveCard={() => setDropTarget(null)}
                    cardDropTarget={dropTarget?.taskId === task.id ? dropTarget : null}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-zinc-700 text-sm border-2 border-dashed border-[#111] rounded-xl">
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
