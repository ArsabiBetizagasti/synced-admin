import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { TEAM_MEMBERS } from '../constants';

const CLOUDINARY_CLOUD = 'dut6wp7tu';
const CLOUDINARY_PRESET = 'synced-admin';

function userLabel(u)    { return TEAM_MEMBERS[u]?.label    || u; }
function userBg(u)       { return TEAM_MEMBERS[u]?.bg       || '#71717a'; }
function userText(u)     { return TEAM_MEMBERS[u]?.text     || '#fff'; }
function userInitials(u) { return TEAM_MEMBERS[u]?.initials || '?'; }

function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function formatSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function isImage(doc) { return doc.mime?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.name || ''); }
function isVideo(doc) { return doc.mime?.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(doc.name || ''); }
function isPDF(doc)   { return doc.mime === 'application/pdf' || /\.pdf$/i.test(doc.name || ''); }

function fileTypeIcon(doc) {
  if (isImage(doc)) return '🖼️';
  if (isVideo(doc)) return '🎬';
  if (isPDF(doc))   return '📄';
  const ext = (doc.name || '').split('.').pop().toLowerCase();
  if (['doc','docx'].includes(ext)) return '📝';
  if (['xls','xlsx'].includes(ext)) return '📊';
  if (['zip','rar'].includes(ext)) return '🗜️';
  if (doc.url && !doc.url.startsWith('blob:')) return '🔗';
  return '📁';
}

// ── Download helper ────────────────────────────────────────────────────────────
async function downloadFile(url, name) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch {
    window.open(url, '_blank');
  }
}

// ── Seen tracking (per user, per doc) ─────────────────────────────────────────
function markSeen(docId, user) {
  localStorage.setItem(`sg_doc_seen_${docId}_${user}`, new Date().toISOString());
}

function hasUnread(doc, user) {
  if (!doc.notes?.length) return false;
  const seen = localStorage.getItem(`sg_doc_seen_${doc.id}_${user}`);
  if (!seen) return true;
  return doc.notes.some(n => n.by !== user && new Date(n.at) > new Date(seen));
}

// ── File Viewer Modal ──────────────────────────────────────────────────────────
function FileViewer({ doc, clientId, onClose }) {
  const { addDocumentNote, currentUser: user } = useApp();
  const [comment, setComment] = useState('');
  const commentsEndRef = useRef(null);
  const notes = doc.notes || [];
  const isValidUrl = doc.url && !doc.url.startsWith('blob:');

  React.useEffect(() => { markSeen(doc.id, user); }, [doc.id]);
  React.useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes.length]);

  const sendComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addDocumentNote(clientId, doc.id, comment.trim());
    setComment('');
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#111] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg">{fileTypeIcon(doc)}</span>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{doc.name}</p>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              {doc.size && <span>{formatSize(doc.size)}</span>}
              <span>·</span>
              <span>Subido por <span className="text-zinc-300">{userLabel(doc.uploadedBy)}</span></span>
              <span>·</span>
              <span>{relativeTime(doc.uploadedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isValidUrl && (
            <button onClick={() => downloadFile(doc.url, doc.name)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black"
              style={{ background: '#faff05' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar
            </button>
          )}
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body: viewer + comments */}
      <div className="flex flex-1 overflow-hidden">
        {/* File preview */}
        <div className="flex-1 flex items-center justify-center bg-[#080808] p-6 overflow-hidden">
          {!isValidUrl ? (
            <div className="text-center">
              <span className="text-6xl block mb-4">{fileTypeIcon(doc)}</span>
              <p className="text-zinc-400 text-sm">Vista previa no disponible</p>
              <p className="text-zinc-600 text-xs mt-1">El archivo fue subido con una versión anterior sin almacenamiento permanente</p>
            </div>
          ) : isImage(doc) ? (
            <img src={doc.url} alt={doc.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          ) : isVideo(doc) ? (
            <video src={doc.url} controls
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              style={{ maxHeight: 'calc(100vh - 140px)' }} />
          ) : isPDF(doc) ? (
            <iframe src={doc.url} title={doc.name}
              className="w-full h-full rounded-lg border border-[#111]" />
          ) : (
            <div className="text-center">
              <span className="text-7xl block mb-5">{fileTypeIcon(doc)}</span>
              <p className="text-white font-semibold">{doc.name}</p>
              {doc.size && <p className="text-zinc-500 text-sm mt-1">{formatSize(doc.size)}</p>}
              <button onClick={() => downloadFile(doc.url, doc.name)}
                className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
                style={{ background: '#faff05' }}>
                Descargar archivo
              </button>
            </div>
          )}
        </div>

        {/* Comments panel */}
        <div className="w-80 flex-shrink-0 border-l border-[#111] flex flex-col bg-[#080808]">
          <div className="px-4 py-3 border-b border-[#111]">
            <p className="text-white font-semibold text-sm">Comentarios</p>
            <p className="text-zinc-600 text-xs">{notes.length} {notes.length === 1 ? 'comentario' : 'comentarios'}</p>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {notes.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-8 h-8 mx-auto mb-3 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <p className="text-zinc-600 text-xs">Sin comentarios todavía</p>
              </div>
            )}
            {notes.map((n, i) => (
              <div key={i} className={`flex gap-2.5 ${n.by === user ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: userBg(n.by), color: userText(n.by) }}>
                  {userInitials(n.by)}
                </div>
                <div className={`max-w-[calc(100%-40px)] ${n.by === user ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-snug ${
                    n.by === user
                      ? 'bg-[#faff05] text-black rounded-tr-sm'
                      : 'bg-zinc-800 text-white rounded-tl-sm'
                  }`}>
                    {n.text}
                  </div>
                  <p className="text-zinc-600 text-[10px] px-1">
                    {userLabel(n.by)} · {relativeTime(n.at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment input */}
          <form onSubmit={sendComment} className="p-3 border-t border-[#111] flex gap-2">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Escribí un comentario..."
              className="flex-1 bg-zinc-900 border border-[#1a1a1a] rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#faff05] min-w-0"
            />
            <button type="submit" disabled={!comment.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 disabled:opacity-30 transition-opacity"
              style={{ background: '#faff05' }}>
              <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Upload Panel ───────────────────────────────────────────────────────────────
function UploadPanel({ clientId, onClose }) {
  const { addDocument } = useApp();
  const [uploading, setUploading] = useState([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    const fileArray = Array.from(files);
    const batch = fileArray.map(f => ({ id: Math.random().toString(36).slice(2), name: f.name, file: f }));
    setUploading(batch.map(({ id, name }) => ({ id, name, progress: -1 })));

    await Promise.all(batch.map(async ({ id: uploadId, name, file }) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`,
          { method: 'POST', body: formData }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Error al subir');
        setUploading(p => p.filter(u => u.id !== uploadId));
        addDocument(clientId, { name, url: data.secure_url, type: 'file', size: file.size, mime: file.type, width: data.width || null, height: data.height || null });
      } catch (err) {
        setUploading(p => p.filter(u => u.id !== uploadId));
        alert(`Error al subir "${name}": ${err.message}`);
      }
    }));
    onClose();
  }, [clientId, addDocument, onClose]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleLink = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    addDocument(clientId, { name: name.trim() || url.trim(), url: url.trim(), type: 'link', size: null });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[#111]">
          <h2 className="text-white font-semibold">Subir archivo</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Upload progress */}
          {uploading.length > 0 && (
            <div className="space-y-2">
              {uploading.map(u => (
                <div key={u.id} className="bg-zinc-900 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-zinc-300 text-xs truncate">{u.name}</span>
                    <span className="text-zinc-500 text-xs ml-2">Subiendo...</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full animate-pulse" style={{ width: '100%', background: '#faff05' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drag & drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragging ? 'border-[#faff05] bg-[#faff05]/5' : 'border-[#111] hover:border-zinc-600'
            }`}>
            <input ref={fileRef} type="file" multiple className="hidden"
              onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }} />
            <svg className="w-8 h-8 mx-auto mb-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-zinc-400 text-sm font-medium">Arrastrá archivos aquí</p>
            <p className="text-zinc-600 text-xs mt-1">Imagen, video, PDF · resolución original</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs">o por enlace</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <form onSubmit={handleLink} className="space-y-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del archivo"
              className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]" />
            <div className="flex gap-2">
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/..."
                className="flex-1 bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]" />
              <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-semibold text-black flex-shrink-0" style={{ background: '#faff05' }}>
                Agregar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── File Card ──────────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">¿Eliminar archivo?</p>
        <p className="text-zinc-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ── Image resolution helpers ────────────────────────────────────────────────────
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function aspectRatio(w, h) {
  if (!w || !h) return null;
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
}

// ── Status dots (New + quality) ─────────────────────────────────────────────────
const QUALITY_COLORS = {
  red:    { fill: '#ef4444', border: '#ef4444', label: 'Baja calidad' },
  yellow: { fill: '#eab308', border: '#eab308', label: 'Calidad media' },
  green:  { fill: '#22c55e', border: '#22c55e', label: 'Buena calidad' },
};

function StatusDots({ doc, onUpdate, horizontal = false }) {
  const qual = doc.quality || null;
  const isNew = !!doc.isNew;
  const dim = '#3f3f46';

  return (
    <div className={`flex ${horizontal ? 'flex-row' : 'flex-col'} items-center gap-1.5`} onClick={e => e.stopPropagation()}>
      {/* Purple — New */}
      <button
        title={isNew ? 'Quitar "New"' : 'Marcar como nuevo'}
        onClick={() => onUpdate({ isNew: !isNew })}
        className="rounded-full flex items-center justify-center transition-all flex-shrink-0"
        style={{
          width: 20, height: 20, fontSize: 6, fontWeight: 800, letterSpacing: '0.02em',
          background: isNew ? '#8b5cf6' : 'rgba(0,0,0,0.55)',
          border: `1.5px solid ${isNew ? '#8b5cf6' : dim}`,
          color: isNew ? '#fff' : dim,
        }}>
        NEW
      </button>
      {/* Red / Yellow / Green */}
      {(['red', 'yellow', 'green']).map(q => {
        const c = QUALITY_COLORS[q];
        const active = qual === q;
        return (
          <button key={q} title={c.label}
            onClick={() => onUpdate({ quality: active ? null : q })}
            className="rounded-full transition-all flex-shrink-0"
            style={{
              width: 16, height: 16,
              background: active ? c.fill : 'rgba(0,0,0,0.55)',
              border: `1.5px solid ${active ? c.border : dim}`,
            }} />
        );
      })}
    </div>
  );
}

// ── Pencil SVG ─────────────────────────────────────────────────────────────────
function PencilIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

// ── Download SVG icon ──────────────────────────────────────────────────────────
function DownloadIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

// ── Folder Tile ─────────────────────────────────────────────────────────────────
function FolderTile({ folder, clientColor, onClick, onRename, onDelete, onDropDoc, onDownload }) {
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const commitRename = () => {
    if (editName.trim() && editName.trim() !== folder.name) onRename(folder.id, editName.trim());
    setEditing(false);
  };

  return (
    <>
      <div
        className="group relative bg-[#080808] border rounded-2xl overflow-hidden flex flex-col transition-all cursor-pointer"
        style={{
          borderTopWidth: 2, borderTopColor: dragOver ? '#faff05' : clientColor,
          borderColor: dragOver ? '#faff05' : '#111',
          boxShadow: dragOver ? '0 0 0 2px #faff0530' : 'none',
        }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={e => { e.stopPropagation(); setDragOver(false); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); onDropDoc(e, folder.id); }}
        onClick={() => !editing && onClick(folder.id)}
      >
        <div className="flex items-center justify-center" style={{ height: 90 }}>
          <svg className="w-12 h-12 transition-colors" fill="none" viewBox="0 0 24 24"
            stroke={dragOver ? '#faff05' : clientColor} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div className="p-3 flex-1">
          {editing ? (
            <input autoFocus value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitRename(); } if (e.key === 'Escape') setEditing(false); }}
              className="w-full bg-zinc-900 border border-[#faff05] rounded px-1.5 py-0.5 text-white text-xs focus:outline-none"
              onClick={e => e.stopPropagation()} />
          ) : (
            <p className="text-white text-xs font-medium truncate">{folder.name}</p>
          )}
          <p className="text-zinc-700 text-[10px] mt-0.5">Carpeta</p>
        </div>
        {/* Hover actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); setEditing(true); setEditName(folder.name); }}
            className="w-5 h-5 rounded-md bg-black/70 text-zinc-400 hover:text-[#faff05] flex items-center justify-center">
            <PencilIcon />
          </button>
          <button onClick={e => { e.stopPropagation(); onDownload(folder.id); }}
            className="w-5 h-5 rounded-md bg-black/70 text-zinc-400 hover:text-white flex items-center justify-center"
            title="Descargar carpeta">
            <DownloadIcon />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(folder.id); }}
            className="w-5 h-5 rounded-md bg-black/70 text-zinc-400 hover:text-red-400 flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

// ── File Card ───────────────────────────────────────────────────────────────────
function FileCard({ doc, clientId, clientColor, onOpen, onRename, onDropOnFile, onDragStart, onDragEnd }) {
  const { removeDocument, updateDocument, currentUser } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(doc.name);
  const [dropTarget, setDropTarget] = useState(false);
  const [imgDims, setImgDims] = useState(null);
  const isValidUrl = doc.url && !doc.url.startsWith('blob:');
  const unread = hasUnread(doc, currentUser);

  // Lazy detect dimensions for images uploaded before we saved them
  React.useEffect(() => {
    if (doc.width && doc.height) return;
    if (!isValidUrl || !isImage(doc)) return;
    const img = new window.Image();
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = doc.url;
  }, [doc.url]); // eslint-disable-line react-hooks/exhaustive-deps

  const dims = (doc.width && doc.height) ? { w: doc.width, h: doc.height } : imgDims;

  const commitRename = () => {
    if (editName.trim() && editName.trim() !== doc.name) onRename(doc.id, editName.trim());
    setEditing(false);
  };

  return (
    <>
      <div
        draggable
        onDragStart={e => { e.dataTransfer.setData('docId', doc.id); e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
        onDragEnd={() => onDragEnd?.()}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget(true); }}
        onDragLeave={e => { e.stopPropagation(); setDropTarget(false); }}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation(); setDropTarget(false);
          const srcId = e.dataTransfer.getData('docId');
          if (srcId && srcId !== doc.id) onDropOnFile(srcId, doc.id);
        }}
        className="bg-[#080808] border rounded-2xl overflow-hidden flex flex-col transition-all group"
        style={{
          borderTopWidth: 2, borderTopColor: dropTarget ? '#faff05' : clientColor,
          borderColor: dropTarget ? '#faff05' : '#111',
          boxShadow: dropTarget ? '0 0 0 2px #faff0530, inset 0 0 0 2px #faff0510' : 'none',
        }}>

        {/* Thumbnail */}
        <div className="relative cursor-pointer flex-shrink-0" onClick={() => onOpen(doc)} style={{ height: 120 }}>
          {isValidUrl && isImage(doc) ? (
            <img src={doc.url} alt={doc.name} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
          ) : isValidUrl && isVideo(doc) ? (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors">
              <svg className="w-10 h-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors">
              <span className="text-4xl">{fileTypeIcon(doc)}</span>
            </div>
          )}
          {unread && <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#faff05] ring-2 ring-[#1a1a1a]" />}
          {dropTarget && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#faff05]/10">
              <span className="text-[#faff05] text-[10px] font-bold">Crear carpeta</span>
            </div>
          )}
          {/* Hover actions overlay */}
          <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); setEditing(true); setEditName(doc.name); }}
              className="w-6 h-6 rounded-lg bg-black/70 text-zinc-400 hover:text-[#faff05] flex items-center justify-center">
              <PencilIcon />
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              className="w-6 h-6 rounded-lg bg-black/70 text-zinc-400 hover:text-red-400 flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 flex gap-2 flex-1">
          {/* Left: text info */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {editing ? (
              <input autoFocus value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitRename(); } if (e.key === 'Escape') setEditing(false); }}
                className="w-full bg-zinc-900 border border-[#faff05] rounded px-1.5 py-0.5 text-white text-xs focus:outline-none"
                onClick={e => e.stopPropagation()} />
            ) : (
              <p className="text-white text-xs font-medium leading-tight truncate" title={doc.name}>{doc.name}</p>
            )}
            <div className="space-y-0.5">
              {doc.size && <p className="text-zinc-500 text-[10px]">{formatSize(doc.size)}</p>}
              {dims && (
                <p className="text-zinc-500 text-[10px]">
                  {dims.w} × {dims.h} px
                  <span className="text-zinc-700"> · {aspectRatio(dims.w, dims.h)}</span>
                </p>
              )}
              <p className="text-zinc-500 text-[10px]">
                <span className="font-medium" style={{ color: userBg(doc.uploadedBy) }}>{userLabel(doc.uploadedBy)}</span>
                {' · '}{relativeTime(doc.uploadedAt)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className={`text-[10px] ${unread ? 'text-[#faff05] font-semibold' : 'text-zinc-600'}`}>
                {doc.notes?.length || 0} {unread ? '· sin leer' : ''}
              </span>
            </div>
            {isValidUrl ? (
              <button onClick={e => { e.stopPropagation(); downloadFile(doc.url, doc.name); }}
                className="w-full py-1.5 rounded-lg text-[10px] font-semibold border border-[#1a1a1a] text-zinc-400 hover:border-[#faff05] hover:text-[#faff05] transition-colors flex items-center justify-center gap-1 mt-auto">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                DESCARGAR
              </button>
            ) : (
              <div className="w-full py-1.5 rounded-lg text-[10px] text-zinc-700 border border-[#111] text-center mt-auto">Sin URL permanente</div>
            )}
          </div>{/* end left text */}
          {/* Right: status dots vertical */}
          <StatusDots doc={doc} onUpdate={updates => updateDocument(clientId, doc.id, updates)} />
        </div>
      </div>
      {confirmDelete && (
        <ConfirmDialog
          message={`"${doc.name}" se eliminará permanentemente.`}
          onConfirm={() => { removeDocument(clientId, doc.id); setConfirmDelete(false); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}

// ── List view rows ──────────────────────────────────────────────────────────────
function ListFolderRow({ folder, clientColor, onClick, onRename, onDelete, onDropDoc, onDownload, childCount }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [dragOver, setDragOver] = useState(false);

  const commitRename = () => {
    if (editName.trim() && editName.trim() !== folder.name) onRename(folder.id, editName.trim());
    setEditing(false);
  };

  return (
    <div
      className="group grid gap-3 px-4 py-3 border-b border-[#111] hover:bg-white/[0.02] transition-colors items-center cursor-pointer"
      style={{ gridTemplateColumns: '1fr 80px 80px 90px 60px', background: dragOver ? '#faff0508' : undefined, borderColor: dragOver ? '#faff0540' : undefined }}
      onClick={() => !editing && onClick(folder.id)}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); onDropDoc(e, folder.id); }}>
      <div className="flex items-center gap-3 min-w-0">
        <svg className="w-5 h-5 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24"
          stroke={dragOver ? '#faff05' : clientColor} strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        {editing ? (
          <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitRename(); } if (e.key === 'Escape') setEditing(false); }}
            className="bg-zinc-900 border border-[#faff05] rounded px-2 py-0.5 text-white text-sm focus:outline-none flex-1"
            onClick={e => e.stopPropagation()} />
        ) : (
          <span className="text-white text-sm font-medium truncate">{folder.name}</span>
        )}
        {childCount > 0 && <span className="text-zinc-600 text-xs flex-shrink-0">{childCount} elemento{childCount !== 1 ? 's' : ''}</span>}
      </div>
      <span className="text-zinc-600 text-xs">—</span>
      <span className="text-zinc-600 text-xs">—</span>
      <span className="text-zinc-600 text-xs">—</span>
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); setEditing(true); setEditName(folder.name); }}
          className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 hover:text-[#faff05] flex items-center justify-center"><PencilIcon /></button>
        <button onClick={e => { e.stopPropagation(); onDownload(folder.id); }}
          className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
          title="Descargar carpeta">
          <DownloadIcon />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(folder.id); }}
          className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 hover:text-red-400 flex items-center justify-center">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}

function ListFileRow({ doc, clientId, clientColor, onOpen, onRename, onDragStart, onDragEnd }) {
  const { removeDocument, updateDocument, currentUser } = useApp();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(doc.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imgDims, setImgDims] = useState(null);
  const isValidUrl = doc.url && !doc.url.startsWith('blob:');
  const unread = hasUnread(doc, currentUser);

  React.useEffect(() => {
    if (doc.width && doc.height) return;
    if (!isValidUrl || !isImage(doc)) return;
    const img = new window.Image();
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = doc.url;
  }, [doc.url]); // eslint-disable-line react-hooks/exhaustive-deps

  const dims = (doc.width && doc.height) ? { w: doc.width, h: doc.height } : imgDims;

  const commitRename = () => {
    if (editName.trim() && editName.trim() !== doc.name) onRename(doc.id, editName.trim());
    setEditing(false);
  };

  return (
    <>
      <div
        draggable
        onDragStart={e => { e.dataTransfer.setData('docId', doc.id); e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
        onDragEnd={() => onDragEnd?.()}
        className="group grid gap-3 px-4 py-3 border-b border-[#111] hover:bg-white/[0.02] transition-colors items-center"
        style={{ gridTemplateColumns: '1fr 80px 80px 90px 60px', cursor: 'grab' }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{fileTypeIcon(doc)}</span>
          {editing ? (
            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitRename(); } if (e.key === 'Escape') setEditing(false); }}
              className="bg-zinc-900 border border-[#faff05] rounded px-2 py-0.5 text-white text-sm focus:outline-none flex-1" />
          ) : (
            <button onClick={() => onOpen(doc)} className="text-white text-sm font-medium truncate hover:text-[#faff05] transition-colors text-left">
              {doc.name}
              {unread && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-[#faff05] align-middle" />}
            </button>
          )}
        </div>
        <div className="text-[10px] text-zinc-500">
          {doc.size ? <div>{formatSize(doc.size)}</div> : <div>—</div>}
          {dims && <div className="text-zinc-600">{dims.w}×{dims.h}</div>}
          {dims && <div className="text-zinc-700">{aspectRatio(dims.w, dims.h)}</div>}
        </div>
        <div className="text-xs">
          <span className="font-medium" style={{ color: userBg(doc.uploadedBy) }}>{userLabel(doc.uploadedBy)}</span>
          <span className="text-zinc-600"> · {relativeTime(doc.uploadedAt)}</span>
        </div>
        <StatusDots doc={doc} onUpdate={updates => updateDocument(clientId, doc.id, updates)} horizontal />
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setEditing(true); setEditName(doc.name); }}
            className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 hover:text-[#faff05] flex items-center justify-center"><PencilIcon /></button>
          {isValidUrl && (
            <button onClick={() => downloadFile(doc.url, doc.name)}
              className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
          )}
          <button onClick={() => setConfirmDelete(true)}
            className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 hover:text-red-400 flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      {confirmDelete && (
        <ConfirmDialog
          message={`"${doc.name}" se eliminará permanentemente.`}
          onConfirm={() => { removeDocument(clientId, doc.id); setConfirmDelete(false); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}

// ── Breadcrumb drop target ──────────────────────────────────────────────────────
function BreadcrumbDrop({ label, color, active, isDragging, onNavigate, onDrop }) {
  const [over, setOver] = useState(false);

  return (
    <button
      onClick={onNavigate}
      onDragOver={e => { if (!isDragging) return; e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(e); }}
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all"
      style={{
        background: over ? '#faff05' : isDragging ? '#faff0515' : 'transparent',
        color: over ? '#000' : isDragging ? '#faff05' : active ? '#a1a1aa' : '#fff',
        border: isDragging ? '1px dashed #faff0560' : '1px solid transparent',
        cursor: active ? 'pointer' : 'default',
      }}>
      {color && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />}
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );
}

// ── Folder View ────────────────────────────────────────────────────────────────
function FolderView({ client, onBack }) {
  const { addDocument, updateDocument, removeDocument, createFolderWithFiles } = useApp();
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [viewingDoc, setViewingDoc] = useState(null);
  const [folderDrag, setFolderDrag] = useState(false);
  const [dropping, setDropping] = useState([]);
  const [pendingMerge, setPendingMerge] = useState(null);
  const [draggingDocId, setDraggingDocId] = useState(null);
  const [pendingFolderDelete, setPendingFolderDelete] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const newFolderRef = useRef(null);
  const docs = client.documents || [];

  // Items in current view level
  const currentItems = docs.filter(d => (d.parentId || null) === currentFolderId);
  const folderItems = currentItems.filter(d => d.type === 'folder');
  const fileItems = currentItems.filter(d => d.type !== 'folder');

  // Breadcrumbs
  const buildCrumbs = (fid) => {
    if (!fid) return [];
    const f = docs.find(d => d.id === fid);
    if (!f) return [];
    return [...buildCrumbs(f.parentId || null), { id: f.id, name: f.name }];
  };
  const breadcrumbs = buildCrumbs(currentFolderId);

  const uploadFiles = useCallback(async (files) => {
    const fileArray = Array.from(files);
    const batch = fileArray.map(f => ({ id: Math.random().toString(36).slice(2), name: f.name, file: f }));
    setDropping(batch.map(({ id, name }) => ({ id, name })));
    await Promise.all(batch.map(async ({ id: uid, name, file }) => {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', CLOUDINARY_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Error');
        setDropping(p => p.filter(u => u.id !== uid));
        addDocument(client.id, { name, url: data.secure_url, type: 'file', size: file.size, mime: file.type, parentId: currentFolderId, width: data.width || null, height: data.height || null });
      } catch (err) {
        setDropping(p => p.filter(u => u.id !== uid));
        alert(`Error al subir "${name}": ${err.message}`);
      }
    }));
  }, [client.id, addDocument, currentFolderId]);

  // File dropped on another file → ask confirmation before creating folder
  const handleDropOnFile = useCallback((sourceId, targetId) => {
    const target = docs.find(d => d.id === targetId);
    if (!target) return;
    const folderName = target.name.replace(/\.[^/.]+$/, '') || 'Nueva carpeta';
    setPendingMerge({ sourceId, targetId, folderName });
  }, [docs]);

  const confirmMerge = useCallback(() => {
    if (!pendingMerge) return;
    createFolderWithFiles(client.id, pendingMerge.folderName, [pendingMerge.sourceId, pendingMerge.targetId], currentFolderId);
    setPendingMerge(null);
  }, [pendingMerge, client.id, createFolderWithFiles, currentFolderId]);

  // Doc card dropped on a folder tile
  const handleDropOnFolder = useCallback((e, folderId) => {
    const docId = e.dataTransfer.getData('docId');
    if (docId && docId !== folderId) {
      updateDocument(client.id, docId, { parentId: folderId });
    } else if (!docId) {
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) uploadFiles(files);
    }
  }, [client.id, updateDocument, uploadFiles]);

  // Rename handler
  const handleRename = useCallback((docId, newName) => {
    updateDocument(client.id, docId, { name: newName });
  }, [client.id, updateDocument]);

  // Download all files inside a folder (recursive)
  const handleDownloadFolder = useCallback(async (folderId) => {
    const getFiles = (id) => {
      const children = docs.filter(d => d.parentId === id);
      return children.flatMap(d =>
        d.type === 'folder'
          ? getFiles(d.id)
          : d.url && !d.url.startsWith('blob:') ? [d] : []
      );
    };
    const files = getFiles(folderId);
    for (let i = 0; i < files.length; i++) {
      await downloadFile(files[i].url, files[i].name);
      if (i < files.length - 1) await new Promise(r => setTimeout(r, 400));
    }
  }, [docs]);

  // Delete folder — confirm only if it has children
  const handleDeleteFolder = useCallback((folderId) => {
    const folder = docs.find(d => d.id === folderId);
    const children = docs.filter(d => d.parentId === folderId);
    if (children.length > 0) {
      setPendingFolderDelete({ id: folderId, name: folder?.name || 'Carpeta', childCount: children.length });
    } else {
      removeDocument(client.id, folderId);
    }
  }, [docs, client.id, removeDocument]);

  const confirmDeleteFolder = useCallback(() => {
    if (!pendingFolderDelete) return;
    docs.filter(d => d.parentId === pendingFolderDelete.id).forEach(child => {
      updateDocument(client.id, child.id, { parentId: currentFolderId });
    });
    removeDocument(client.id, pendingFolderDelete.id);
    setPendingFolderDelete(null);
  }, [pendingFolderDelete, docs, client.id, updateDocument, removeDocument, currentFolderId]);

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    addDocument(client.id, { name, type: 'folder', parentId: currentFolderId, url: null, size: null, mime: null });
    setNewFolderName('');
    setShowCreateFolder(false);
  };

  // Document-level drag: only for OS file drops
  React.useEffect(() => {
    const handleDocDrop = (e) => {
      e.preventDefault();
      const docId = e.dataTransfer.getData('docId');
      if (docId) return; // internal drag — let card handlers deal with it
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) { setFolderDrag(false); uploadFiles(files); }
    };
    const handleDocDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer.types.includes('Files')) setFolderDrag(true);
    };
    const handleDocDragLeave = (e) => {
      if (e.clientX === 0 && e.clientY === 0) setFolderDrag(false);
    };
    document.addEventListener('dragover', handleDocDragOver);
    document.addEventListener('drop', handleDocDrop);
    document.addEventListener('dragleave', handleDocDragLeave);
    return () => {
      document.removeEventListener('dragover', handleDocDragOver);
      document.removeEventListener('drop', handleDocDrop);
      document.removeEventListener('dragleave', handleDocDragLeave);
    };
  }, [uploadFiles]);

  const totalCount = folderItems.length + fileItems.length;

  return (
    <div className="space-y-5 relative">

      {/* OS-file drop overlay */}
      {folderDrag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(250,255,5,0.07)', backdropFilter: 'blur(3px)' }}>
          <div className="rounded-3xl px-12 py-10 text-center shadow-2xl flex flex-col items-center gap-4"
            style={{ background: '#faff05', border: '3px dashed rgba(0,0,0,0.25)' }}>
            <svg className="w-16 h-16 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-black font-bold text-2xl">Soltar para agregar</p>
            <p className="text-black/50 text-sm font-medium">
              {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : client.name}
            </p>
          </div>
        </div>
      )}

      {/* Upload progress toasts */}
      {dropping.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 space-y-2 pointer-events-none">
          {dropping.map(u => (
            <div key={u.id} className="bg-[#080808] border border-[#faff05]/40 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#faff05] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-white text-xs max-w-[200px] truncate">{u.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header + breadcrumbs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap text-sm min-w-0">
          <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Documentos
          </button>
          <span className="text-zinc-700">/</span>
          {/* Client root — droppable when dragging */}
          <BreadcrumbDrop
            label={client.name}
            color={client.color}
            active={!!currentFolderId}
            isDragging={!!draggingDocId}
            onNavigate={() => setCurrentFolderId(null)}
            onDrop={(e) => {
              const docId = e.dataTransfer.getData('docId');
              if (docId) { updateDocument(client.id, docId, { parentId: null }); setDraggingDocId(null); }
            }}
          />
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                <span className="text-zinc-700">/</span>
                <BreadcrumbDrop
                  label={crumb.name}
                  active={!isLast}
                  isDragging={!!draggingDocId && !isLast}
                  onNavigate={() => !isLast && setCurrentFolderId(crumb.id)}
                  onDrop={(e) => {
                    if (isLast) return;
                    const docId = e.dataTransfer.getData('docId');
                    if (docId) { updateDocument(client.id, docId, { parentId: crumb.id }); setDraggingDocId(null); }
                  }}
                />
              </React.Fragment>
            );
          })}
          <span className="text-zinc-600 text-xs">· {totalCount} {totalCount === 1 ? 'elemento' : 'elementos'}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 bg-zinc-900 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} title="Vista cuadrícula"
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[#faff05] text-black' : 'text-zinc-500 hover:text-white'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button onClick={() => setViewMode('list')} title="Vista lista"
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[#faff05] text-black' : 'text-zinc-500 hover:text-white'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Create folder inline */}
          {showCreateFolder ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={newFolderRef} autoFocus value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setShowCreateFolder(false); setNewFolderName(''); } }}
                placeholder="Nombre de la carpeta"
                className="bg-[#080808] border border-[#faff05] rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none w-44"
              />
              <button onClick={handleCreateFolder}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-black flex-shrink-0"
                style={{ background: '#faff05' }}>Crear</button>
              <button onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}
                className="px-3 py-2 rounded-xl text-sm text-zinc-500 hover:text-white">✕</button>
            </div>
          ) : (
            <button onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-[#111] text-zinc-400 hover:border-zinc-500 hover:text-white transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Nueva carpeta
            </button>
          )}
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-black"
            style={{ background: '#faff05' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Subir archivo
          </button>
        </div>
      </div>

      {/* Content */}
      {totalCount === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <svg className="w-12 h-12 mx-auto mb-4 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm">No hay archivos todavía</p>
          <p className="text-xs mt-1 text-zinc-700">Subí archivos o arrastrá uno aquí</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {folderItems.map(folder => (
            <FolderTile key={folder.id} folder={folder}
              clientColor={client.color}
              onClick={setCurrentFolderId}
              onRename={handleRename}
              onDelete={handleDeleteFolder}
              onDropDoc={handleDropOnFolder}
              onDownload={handleDownloadFolder}
            />
          ))}
          {fileItems.map(doc => (
            <FileCard key={doc.id} doc={doc} clientId={client.id}
              clientColor={client.color}
              onOpen={setViewingDoc}
              onRename={handleRename}
              onDropOnFile={handleDropOnFile}
              onDragStart={() => setDraggingDocId(doc.id)}
              onDragEnd={() => setDraggingDocId(null)}
            />
          ))}
        </div>
      ) : (
        /* List view */
        <div className="bg-[#080808] border border-[#111] rounded-2xl overflow-hidden">
          {/* Header row */}
          <div className="grid gap-3 px-4 py-2 border-b border-[#111] text-[10px] uppercase tracking-wider text-zinc-600 font-semibold"
            style={{ gridTemplateColumns: '1fr 80px 80px 90px 60px' }}>
            <span>Nombre</span><span>Tamaño</span><span>Subido por</span><span>Estado</span><span className="text-right">Acciones</span>
          </div>
          {/* Folders first */}
          {folderItems.map(folder => (
            <ListFolderRow key={folder.id} folder={folder}
              clientColor={client.color}
              onClick={setCurrentFolderId}
              onRename={handleRename}
              onDelete={handleDeleteFolder}
              onDropDoc={handleDropOnFolder}
              onDownload={handleDownloadFolder}
              childCount={docs.filter(d => d.parentId === folder.id).length}
            />
          ))}
          {/* Files */}
          {fileItems.map(doc => (
            <ListFileRow key={doc.id} doc={doc} clientId={client.id}
              clientColor={client.color}
              onOpen={setViewingDoc}
              onRename={handleRename}
              onDragStart={() => setDraggingDocId(doc.id)}
              onDragEnd={() => setDraggingDocId(null)}
            />
          ))}
        </div>
      )}

      {showUpload && <UploadPanel clientId={client.id} onClose={() => setShowUpload(false)} />}
      {viewingDoc && (
        <FileViewer
          doc={docs.find(d => d.id === viewingDoc.id) || viewingDoc}
          clientId={client.id}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {/* Confirm folder deletion with children */}
      {pendingFolderDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">¿Eliminar carpeta?</p>
            <p className="text-zinc-400 text-sm mb-6">
              La carpeta <span className="text-white font-medium">"{pendingFolderDelete.name}"</span> tiene{' '}
              <span className="text-white font-medium">{pendingFolderDelete.childCount} {pendingFolderDelete.childCount === 1 ? 'archivo' : 'archivos'}</span> adentro.
              Los archivos van a quedar en el nivel actual.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingFolderDelete(null)}
                className="flex-1 py-2.5 rounded-full text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDeleteFolder}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm folder creation from drag */}
      {pendingMerge && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#faff0520' }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#faff05">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">¿Crear carpeta?</p>
            <p className="text-zinc-400 text-sm mb-4">
              Se va a crear la carpeta <span className="text-white font-medium">"{pendingMerge.folderName}"</span> con los dos archivos adentro.
            </p>
            <input
              autoFocus
              value={pendingMerge.folderName}
              onChange={e => setPendingMerge(p => ({ ...p, folderName: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') confirmMerge(); if (e.key === 'Escape') setPendingMerge(null); }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#faff05] mb-4 text-center"
              placeholder="Nombre de la carpeta"
            />
            <div className="flex gap-3">
              <button onClick={() => setPendingMerge(null)}
                className="flex-1 py-2.5 rounded-full text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={confirmMerge}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-black transition-colors"
                style={{ background: '#faff05' }}>
                Crear carpeta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Folder Grid Card ───────────────────────────────────────────────────────────
function FolderCard({ client, onClick }) {
  const docs = client.documents || [];
  const unreadCount = docs.filter(d => hasUnread(d)).length;
  const imageDocs = docs.filter(d => isImage(d) && d.url && !d.url.startsWith('blob:'));

  return (
    <button onClick={onClick}
      className="bg-[#080808] border border-[#111] rounded-2xl overflow-hidden text-left hover:border-zinc-600 transition-all group w-full">

      {/* Mini image strip */}
      {imageDocs.length > 0 ? (
        <div className="flex h-16 overflow-hidden">
          {imageDocs.slice(0, 3).map((d, i) => (
            <img key={d.id} src={d.url} alt="" className="flex-1 object-cover min-w-0" />
          ))}
          {imageDocs.length === 1 && <div className="flex-1 bg-zinc-900" />}
          {imageDocs.length === 2 && <div className="flex-1 bg-zinc-900" />}
        </div>
      ) : (
        <div className="h-10 flex items-center px-4 pt-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: client.color + '22', border: `1.5px solid ${client.color}44` }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={client.color}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-1">
          <p className="text-white font-semibold text-sm group-hover:text-[#faff05] transition-colors truncate">
            {client.name}
            {client.isInternal && (
              <span className="text-[9px] ml-1.5 px-1.5 py-0.5 rounded-full bg-[#faff05]/15 text-[#faff05]">Int.</span>
            )}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black"
              style={{ background: '#faff05' }}>
              {unreadCount}
            </span>
          )}
        </div>
        <p className="text-zinc-600 text-xs mt-1">{docs.length} archivo{docs.length !== 1 ? 's' : ''}</p>
      </div>
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Documentos() {
  const { clients, docFocusClientId, setDocFocusClientId } = useApp();
  const [openClientId, setOpenClientId] = useState(() => docFocusClientId || null);

  React.useEffect(() => {
    if (docFocusClientId) {
      setOpenClientId(docFocusClientId);
      setDocFocusClientId(null);
    }
  }, [docFocusClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openClient = clients.find(c => c.id === openClientId);
  if (openClient) {
    return <FolderView client={openClient} onBack={() => setOpenClientId(null)} />;
  }

  const active = clients.filter(c => c.active);
  const inactive = clients.filter(c => !c.active);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-white font-semibold">Clientes Activos</h2>
          <span className="text-zinc-600 text-sm">{active.length} carpetas</span>
        </div>
        {active.length === 0 ? (
          <p className="text-zinc-600 text-sm">Sin clientes activos</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {active.map(c => <FolderCard key={c.id} client={c} onClick={() => setOpenClientId(c.id)} />)}
          </div>
        )}
      </div>

      {inactive.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs uppercase tracking-wider">Anteriores</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 opacity-60">
            {inactive.map(c => <FolderCard key={c.id} client={c} onClick={() => setOpenClientId(c.id)} />)}
          </div>
        </div>
      )}
    </div>
  );
}
