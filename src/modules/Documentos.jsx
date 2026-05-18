import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';

// ── Utilities ──────────────────────────────────────────────────────────────────
function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function fileIcon(doc) {
  const ext = (doc.name || '').split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return '🎬';
  if (['pdf'].includes(ext)) return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['zip', 'rar'].includes(ext)) return '🗜️';
  if (doc.url && !doc.url.startsWith('blob:')) return '🔗';
  return '📁';
}

function userLabel(u) { return u === 'kann' ? 'Kann' : 'Jero'; }
function userBg(u) { return u === 'kann' ? '#faff05' : '#60a5fa'; }

// ── Upload Panel ───────────────────────────────────────────────────────────────
function UploadPanel({ clientId, onClose }) {
  const { addDocument } = useApp();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const submit = (docData) => {
    if (!docData.name && !docData.url) return;
    addDocument(clientId, docData);
    onClose();
  };

  const handleLink = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    submit({ name: name.trim() || url.trim(), url: url.trim(), type: 'link', size: null });
  };

  const handleFiles = (files) => {
    Array.from(files).forEach(f => {
      submit({ name: f.name, url: URL.createObjectURL(f), type: 'file', size: f.size, mime: f.type });
    });
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
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
            <p className="text-zinc-400 text-sm font-medium">Arrastra archivos aquí</p>
            <p className="text-zinc-600 text-xs mt-1">o hacé click para seleccionar</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs">o por enlace</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Link form */}
          <form onSubmit={handleLink} className="space-y-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del archivo"
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]" />
            <div className="flex gap-2">
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/..."
                className="flex-1 bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]" />
              <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-semibold text-black flex-shrink-0"
                style={{ background: '#faff05' }}>
                Agregar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Note Modal ─────────────────────────────────────────────────────────────────
function NoteModal({ clientId, docId, onClose }) {
  const { addDocumentNote } = useApp();
  const [text, setText] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    addDocumentNote(clientId, docId, text.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-white font-semibold text-sm">Agregar nota / feedback</h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} autoFocus
            placeholder="Escribe tu nota o feedback..."
            className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05] resize-none" />
          <button type="submit" className="w-full py-2 rounded-xl text-sm font-semibold text-black"
            style={{ background: '#faff05' }}>
            Guardar nota
          </button>
        </form>
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

function FileCard({ doc, clientId, clientColor }) {
  const { removeDocument } = useApp();
  const [hovered, setHovered] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const formatSize = (bytes) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <>
      <div
        className="relative bg-[#1a1a1a] border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-200 group"
        style={{ borderTopColor: clientColor, borderTopWidth: 2 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>

        {/* Main content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-2xl flex-shrink-0">{fileIcon(doc)}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setAddingNote(true)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Agregar nota">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 transition-colors"
                title="Eliminar">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-white text-xs font-medium leading-tight truncate mb-1">{doc.name}</p>
          {doc.notes?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {doc.notes.slice(0, 2).map((n, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#faff05]/15 text-[#faff05] truncate max-w-full">
                  {n.text.length > 20 ? n.text.slice(0, 20) + '…' : n.text}
                </span>
              ))}
              {doc.notes.length > 2 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                  +{doc.notes.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover metadata overlay */}
        {hovered && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex flex-col justify-between p-4 z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-black"
                  style={{ background: userBg(doc.uploadedBy) }}>
                  {doc.uploadedBy === 'kann' ? 'K' : 'J'}
                </div>
                <span className="text-zinc-300 text-xs">Subido por <span className="text-white font-medium">{userLabel(doc.uploadedBy)}</span></span>
              </div>
              <p className="text-zinc-500 text-xs">{relativeTime(doc.uploadedAt)}</p>
              {doc.size && <p className="text-zinc-500 text-xs">{formatSize(doc.size)}</p>}
              {doc.mime && <p className="text-zinc-600 text-xs">{doc.mime}</p>}
            </div>

            {/* Notes preview */}
            {doc.notes?.length > 0 && (
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {doc.notes.map((n, i) => (
                  <div key={i} className="bg-zinc-900/80 rounded-lg p-1.5">
                    <p className="text-zinc-200 text-[10px] leading-snug">{n.text}</p>
                    <p className="text-zinc-600 text-[9px] mt-0.5">{userLabel(n.by)} · {relativeTime(n.at)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {doc.url && !doc.url.startsWith('blob:') && (
                <a href={doc.url} target="_blank" rel="noreferrer"
                  className="flex-1 text-center text-xs py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">
                  Ver
                </a>
              )}
              <button onClick={() => setAddingNote(true)}
                className="flex-1 text-xs py-1.5 rounded-lg text-black font-medium"
                style={{ background: '#faff05' }}>
                + Nota
              </button>
            </div>
          </div>
        )}
      </div>

      {addingNote && (
        <NoteModal clientId={clientId} docId={doc.id} onClose={() => setAddingNote(false)} />
      )}
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
  const docs = client.documents || [];

  return (
    <div className="space-y-5">
      {/* Header */}
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

      {/* File grid */}
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
            <FileCard key={doc.id} doc={doc} clientId={client.id} clientColor={client.color} />
          ))}
        </div>
      )}

      {showUpload && <UploadPanel clientId={client.id} onClose={() => setShowUpload(false)} />}
    </div>
  );
}

// ── Folder Grid Card ───────────────────────────────────────────────────────────
function FolderCard({ client, onClick }) {
  const docs = client.documents || [];
  const noteCount = docs.reduce((s, d) => s + (d.notes?.length || 0), 0);

  return (
    <button onClick={onClick}
      className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl p-5 text-left hover:border-zinc-600 transition-all group w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
          style={{ background: client.color + '22', border: `1.5px solid ${client.color}44` }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={client.color}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors mt-1"
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <p className="text-white font-semibold text-sm group-hover:text-[#faff05] transition-colors flex items-center gap-1.5">
        {client.name}
        {client.isInternal && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#faff05]/15 text-[#faff05]">Int.</span>
        )}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-zinc-500 text-xs">{docs.length} archivo{docs.length !== 1 ? 's' : ''}</span>
        {noteCount > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#faff05' }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            {noteCount}
          </span>
        )}
      </div>

      {/* Mini preview of last 3 files */}
      {docs.length > 0 && (
        <div className="flex gap-1 mt-3">
          {[...docs].reverse().slice(0, 3).map(d => (
            <span key={d.id} className="text-base" title={d.name}>{fileIcon(d)}</span>
          ))}
          {docs.length > 3 && <span className="text-zinc-600 text-xs self-center">+{docs.length - 3}</span>}
        </div>
      )}
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Documentos() {
  const { clients, docFocusClientId, setDocFocusClientId } = useApp();
  const [openClientId, setOpenClientId] = useState(() => docFocusClientId || null);

  // Auto-open focused client when navigated from Clientes tab
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
      {/* Active clients */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-white font-semibold">Clientes Activos</h2>
          <span className="text-zinc-600 text-sm">{active.length} carpetas</span>
        </div>
        {active.length === 0 ? (
          <p className="text-zinc-600 text-sm">Sin clientes activos</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {active.map(c => (
              <FolderCard key={c.id} client={c} onClick={() => setOpenClientId(c.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Inactive clients */}
      {inactive.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs uppercase tracking-wider">Anteriores</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 opacity-60">
            {inactive.map(c => (
              <FolderCard key={c.id} client={c} onClick={() => setOpenClientId(c.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
