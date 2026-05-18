import React, { useState, useRef, useCallback } from 'react';
import { app } from '../firebase';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useApp } from '../context/AppContext';

const storage = getStorage(app);

const TEAM = {
  kann: { label: 'Kann', initials: 'K', bg: '#faff05', text: '#000' },
  jero: { label: 'Jero', initials: 'J', bg: '#60a5fa', text: '#000' },
  facu: { label: 'Facu', initials: 'F', bg: '#a78bfa', text: '#000' },
};

function userLabel(u) { return TEAM[u]?.label || u; }
function userBg(u)    { return TEAM[u]?.bg    || '#71717a'; }
function userText(u)  { return TEAM[u]?.text  || '#fff'; }
function userInitials(u) { return TEAM[u]?.initials || '?'; }

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
function markSeen(docId) {
  const user = sessionStorage.getItem('sg_user') || 'kann';
  localStorage.setItem(`sg_doc_seen_${docId}_${user}`, new Date().toISOString());
}

function hasUnread(doc) {
  if (!doc.notes?.length) return false;
  const user = sessionStorage.getItem('sg_user') || 'kann';
  const seen = localStorage.getItem(`sg_doc_seen_${doc.id}_${user}`);
  if (!seen) return true;
  return doc.notes.some(n => n.by !== user && new Date(n.at) > new Date(seen));
}

// ── File Viewer Modal ──────────────────────────────────────────────────────────
function FileViewer({ doc, clientId, onClose }) {
  const { addDocumentNote } = useApp();
  const [comment, setComment] = useState('');
  const user = sessionStorage.getItem('sg_user') || 'kann';
  const commentsEndRef = useRef(null);
  const notes = doc.notes || [];
  const isValidUrl = doc.url && !doc.url.startsWith('blob:');

  React.useEffect(() => { markSeen(doc.id); }, [doc.id]);
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 flex-shrink-0">
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
        <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] p-6 overflow-hidden">
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
              className="w-full h-full rounded-lg border border-zinc-800" />
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
        <div className="w-80 flex-shrink-0 border-l border-zinc-800 flex flex-col bg-[#0f0f0f]">
          <div className="px-4 py-3 border-b border-zinc-800">
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
          <form onSubmit={sendComment} className="p-3 border-t border-zinc-800 flex gap-2">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Escribí un comentario..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#faff05] min-w-0"
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

  const uploadToStorage = useCallback(async (file) => {
    const path = `documents/${clientId}/${Date.now()}_${file.name}`;
    const fileRef2 = storageRef(storage, path);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(fileRef2, file);
      const uploadId = Math.random().toString(36).slice(2);
      setUploading(p => [...p, { id: uploadId, name: file.name, progress: 0 }]);
      task.on('state_changed',
        snap => {
          const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
          setUploading(p => p.map(u => u.id === uploadId ? { ...u, progress: pct } : u));
        },
        reject,
        async () => {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          setUploading(p => p.filter(u => u.id !== uploadId));
          resolve({ url: downloadURL, storagePath: path });
        }
      );
    });
  }, [clientId]);

  const handleFiles = useCallback(async (files) => {
    for (const file of Array.from(files)) {
      try {
        const { url: downloadURL, storagePath } = await uploadToStorage(file);
        addDocument(clientId, {
          name: file.name,
          url: downloadURL,
          type: 'file',
          size: file.size,
          mime: file.type,
          storagePath,
        });
      } catch (err) {
        console.error('Upload failed:', err);
        alert(`Error al subir ${file.name}. Verificá que Firebase Storage esté habilitado.`);
      }
    }
    if (!uploading.length) onClose();
  }, [clientId, uploadToStorage, addDocument, uploading.length, onClose]);

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
      <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
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
                    <span className="text-zinc-500 text-xs ml-2">{u.progress}%</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${u.progress}%`, background: '#faff05' }} />
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
              dragging ? 'border-[#faff05] bg-[#faff05]/5' : 'border-zinc-800 hover:border-zinc-600'
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
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]" />
            <div className="flex gap-2">
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/..."
                className="flex-1 bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]" />
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
      <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 text-center">
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

function FileCard({ doc, clientId, clientColor, onOpen }) {
  const { removeDocument } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isValidUrl = doc.url && !doc.url.startsWith('blob:');
  const unread = hasUnread(doc);

  return (
    <>
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col group hover:border-zinc-600 transition-all"
        style={{ borderTopColor: clientColor, borderTopWidth: 2 }}>

        {/* Thumbnail / preview area */}
        <div className="relative cursor-pointer" onClick={() => onOpen(doc)}
          style={{ height: 120 }}>
          {isValidUrl && isImage(doc) ? (
            <img src={doc.url} alt={doc.name}
              className="w-full h-full object-cover" />
          ) : isValidUrl && isVideo(doc) ? (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <span className="text-4xl">{fileTypeIcon(doc)}</span>
            </div>
          )}

          {/* Hover overlay with click-to-open hint */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ver
            </div>
          </div>

          {/* Unread badge */}
          {unread && (
            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#faff05] ring-2 ring-[#1a1a1a]" title="Comentarios sin leer" />
          )}

          {/* Delete button */}
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
            className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-black/60 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info area */}
        <div className="p-3 flex flex-col gap-2 flex-1">
          <p className="text-white text-xs font-medium leading-tight truncate" title={doc.name}>{doc.name}</p>

          <div className="space-y-0.5">
            {doc.size && <p className="text-zinc-600 text-[10px]">{formatSize(doc.size)}</p>}
            <p className="text-zinc-600 text-[10px]">
              <span className="font-medium" style={{ color: userBg(doc.uploadedBy) }}>{userLabel(doc.uploadedBy)}</span>
              {' · '}{relativeTime(doc.uploadedAt)}
            </p>
          </div>

          {/* Comments badge */}
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className={`text-[10px] ${unread ? 'text-[#faff05] font-semibold' : 'text-zinc-600'}`}>
              {doc.notes?.length || 0} {unread && '· sin leer'}
            </span>
          </div>

          {/* Download button */}
          {isValidUrl ? (
            <button
              onClick={e => { e.stopPropagation(); downloadFile(doc.url, doc.name); }}
              className="w-full py-1.5 rounded-lg text-[10px] font-semibold border border-zinc-700 text-zinc-400 hover:border-[#faff05] hover:text-[#faff05] transition-colors flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              DESCARGAR
            </button>
          ) : (
            <div className="w-full py-1.5 rounded-lg text-[10px] text-zinc-700 border border-zinc-800 text-center">
              Sin URL permanente
            </div>
          )}
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

// ── Folder View ────────────────────────────────────────────────────────────────
function FolderView({ client, onBack }) {
  const [showUpload, setShowUpload] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const docs = client.documents || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Documentos
          </button>
          <span className="text-zinc-700">/</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: client.color }} />
            <span className="text-white font-semibold">{client.name}</span>
            {client.isInternal && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#faff05]/15 text-[#faff05]">Interno</span>
            )}
          </div>
          <span className="text-zinc-600 text-sm">· {docs.length} archivos</span>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-black"
          style={{ background: '#faff05' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Subir archivo
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <svg className="w-12 h-12 mx-auto mb-4 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm">No hay archivos todavía</p>
          <p className="text-xs mt-1 text-zinc-700">Subí el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {[...docs].reverse().map(doc => (
            <FileCard key={doc.id} doc={doc} clientId={client.id}
              clientColor={client.color} onOpen={setViewingDoc} />
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
      className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl overflow-hidden text-left hover:border-zinc-600 transition-all group w-full">

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
