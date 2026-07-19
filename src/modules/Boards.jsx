import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Text as KonvaText, Transformer, Group, Circle } from 'react-konva';
import { useApp } from '../context/AppContext';
import { db } from '../firebase';
import { ref, get, set, remove, onValue, onDisconnect } from 'firebase/database';
import UserAvatar from '../components/UserAvatar';

// ── Constants ────────────────────────────────────────────────────────────────────
const USER_COLORS   = { kann: '#faff05', jero: '#60a5fa', facu: '#34d399' };
const getUserColor  = (uid) => {
  const u = (uid || '').toLowerCase();
  if (u.startsWith('facu')) return '#34d399';
  if (u.startsWith('jero')) return '#60a5fa';
  return '#faff05'; // kann + fallback
};
const STATUS_COLORS = { green: '#34d399', yellow: '#faff05', red: '#f87171', purple: '#a78bfa' };
const STATUS_LABELS = { green: 'Verde', yellow: 'Amarillo', red: 'Rojo', purple: 'Violeta' };
const FDECK_W = 140;
const FDECK_H = 110;
const FOLDER_SCALES       = [0.5, 1.0, 2.0, 3.0, 4.5, 6.0];
const FOLDER_SCALE_LABELS = ['0%','20%','40%','60%','80%','100%'];
const MIN_SCALE     = 0.08;
const MAX_SCALE     = 6;
const SCALE_FACTOR  = 1.1;
const STROKE_SIZES  = [{ label: 'S', size: 1 }, { label: 'M', size: 3 }, { label: 'L', size: 7 }];

// ── Utils ────────────────────────────────────────────────────────────────────────
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function fileToDataUrl(file) {
  return new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(file); });
}

async function compressImage(dataUrl) {
  return new Promise(resolve => {
    const img = new window.Image();
    img.onload = () => {
      const origWidth = img.width, origHeight = img.height;

      // Low-quality thumbnail for canvas display (unselected — recognizable but small)
      const L = 260;
      const lr = Math.min(L / origWidth, L / origHeight, 1);
      const lc = document.createElement('canvas');
      lc.width = Math.max(1, Math.round(origWidth * lr));
      lc.height = Math.max(1, Math.round(origHeight * lr));
      lc.getContext('2d').drawImage(img, 0, 0, lc.width, lc.height);
      const lowSrc = lc.toDataURL('image/jpeg', 0.2);

      // Medium quality for fullscreen / info panel (survives session reload)
      const M = 600;
      const mr = Math.min(M / origWidth, M / origHeight, 1);
      const mc = document.createElement('canvas');
      mc.width = Math.max(1, Math.round(origWidth * mr));
      mc.height = Math.max(1, Math.round(origHeight * mr));
      mc.getContext('2d').drawImage(img, 0, 0, mc.width, mc.height);
      const medSrc = mc.toDataURL('image/jpeg', 0.65);

      resolve({ lowSrc, medSrc, origWidth, origHeight });
    };
    img.src = dataUrl;
  });
}

function saveImageData(clientId, imageId, lowSrc, medSrc) {
  const data = { lowSrc, medSrc };
  set(ref(db, `boards_imgdata/${clientId}/${imageId}`), data);
  try { localStorage.setItem(`imgdata_${imageId}`, JSON.stringify(data)); } catch (_) {}
}

async function fetchImgData(clientId, imgs) {
  if (!imgs.length) return imgs;
  const needsFetch = imgs.some(img => !img.lowSrc);
  if (!needsFetch) return imgs;
  const tryCache = id => { try { return JSON.parse(localStorage.getItem(`imgdata_${id}`) || 'null'); } catch { return null; } };
  const uncached = imgs.filter(img => !img.lowSrc && !tryCache(img.id));
  let rtdbData = {};
  if (uncached.length) {
    try {
      const snap = await get(ref(db, `boards_imgdata/${clientId}`));
      rtdbData = snap.val() || {};
      Object.entries(rtdbData).forEach(([id, data]) => {
        if (data.lowSrc) { try { localStorage.setItem(`imgdata_${id}`, JSON.stringify(data)); } catch (_) {} }
      });
    } catch (_) {}
  }
  return imgs.map(img => {
    if (img.lowSrc) return img;
    const cached = tryCache(img.id);
    if (cached?.lowSrc) return { ...img, ...cached };
    return { ...img, ...(rtdbData[img.id] || {}) };
  });
}

function rectsIntersect(bx1, by1, bx2, by2, ex1, ey1, ex2, ey2) {
  return !(bx2 < ex1 || bx1 > ex2 || by2 < ey1 || by1 > ey2);
}
function drawingBounds(d) {
  const ox = d.x || 0, oy = d.y || 0;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (let i = 0; i < d.points.length; i += 2) {
    const px = d.points[i] + ox, py = d.points[i + 1] + oy;
    if (px < x1) x1 = px; if (px > x2) x2 = px;
    if (py < y1) y1 = py; if (py > y2) y2 = py;
  }
  return { x1, y1, x2, y2 };
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'hace unos segundos';
  if (sec < 3600) { const m = Math.floor(sec / 60); return `hace ${m} min`; }
  if (sec < 86400) { const h = Math.floor(sec / 3600); return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`; }
  const d = Math.floor(sec / 86400);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

function measurePostitSize(text, fontSize = 13) {
  const MAX_W = 220, PAD = 12, LINE_H = Math.round(fontSize * 1.6);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px Inter, sans-serif`;
  const wrappedLines = [];
  for (const raw of text.split('\n')) {
    if (!raw.trim()) { wrappedLines.push(''); continue; }
    let cur = '';
    for (const word of raw.split(' ')) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > MAX_W && cur) { wrappedLines.push(cur); cur = word; }
      else cur = test;
    }
    if (cur) wrappedLines.push(cur);
  }
  if (!wrappedLines.length) wrappedLines.push('');
  const textW = Math.min(Math.max(...wrappedLines.map(l => ctx.measureText(l).width), 30), MAX_W);
  const w = Math.round(textW + PAD * 2);
  const h = Math.round(wrappedLines.length * LINE_H + PAD * 2);
  // Always square — use the larger dimension
  const size = Math.max(w, h, 80);
  return { w: size, h: size };
}

// ── Context Menu ─────────────────────────────────────────────────────────────────
function ContextMenu({ menu, onAction, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const item = 'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors text-left whitespace-nowrap';
  return (
    <div ref={ref} className="fixed bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden py-1 min-w-[190px]"
      style={{ left: menu.x, top: menu.y, zIndex: 9999 }}>
      {menu.type === 'canvas' && (
        <button className={item} onClick={() => onAction('upload')}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Subir imágenes
        </button>
      )}
      {menu.type === 'image' && (<>
        <p className="px-4 pt-2 pb-1 text-zinc-600 text-[10px] uppercase tracking-wider">Profundidad</p>
        <button className={item} onClick={() => onAction('bringToFront')}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          Traer al frente
        </button>
        <button className={item} onClick={() => onAction('sendToBack')}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          Llevar al fondo
        </button>
        <div className="border-t border-[#222] my-1" />
        <p className="px-4 pb-1 text-zinc-600 text-[10px] uppercase tracking-wider">Estado</p>
        {[
          { key: null,     label: 'Sin estado', color: null },
          { key: 'green',  label: 'Verde',      color: '#34d399' },
          { key: 'yellow', label: 'Amarillo',   color: '#faff05' },
          { key: 'red',    label: 'Rojo',       color: '#f87171' },
        ].map(s => (
          <button key={s.key ?? 'none'} className={item} onClick={() => onAction('setStatus', s.key)}>
            {s.color
              ? <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              : <span className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-600 flex-shrink-0" />}
            {s.label}
          </button>
        ))}
        <div className="border-t border-[#222] my-1" />
        <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-white/[0.06] hover:text-red-300 transition-colors text-left"
          onClick={() => onAction('deleteImage')}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Eliminar imagen
        </button>
      </>)}
    </div>
  );
}

// ── Fullscreen Modal ─────────────────────────────────────────────────────────────
function FullscreenModal({ img, origSrc, onClose }) {
  const src = origSrc || img.medSrc || img.lowSrc;
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex" style={{ background: '#000' }}>
      {/* Image area */}
      <div className="flex-1 flex items-center justify-center p-6 min-w-0">
        <img src={src} alt={img.name || 'imagen'}
          className="max-w-full max-h-full object-contain"
          style={{ imageRendering: 'auto' }} />
      </div>

      {/* Info panel */}
      <div className="w-64 flex-shrink-0 border-l border-[#1a1a1a] flex flex-col"
        style={{ background: '#090909' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <span className="text-zinc-400 text-sm font-medium">Información</span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.07] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1.5">Archivo</p>
            <p className="text-white text-sm break-all">{img.name || 'Sin nombre'}</p>
          </div>
          <div>
            <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1.5">Resolución original</p>
            <p className="text-white text-sm font-mono">{img.origWidth} × {img.origHeight} px</p>
          </div>
          <div>
            <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1.5">Tamaño en canvas</p>
            <p className="text-white text-sm font-mono">{img.w} × {img.h} px</p>
          </div>
          {img.statusColor && STATUS_COLORS[img.statusColor] && (
            <div>
              <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1.5">Estado</p>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLORS[img.statusColor] }} />
                <span className="text-white text-sm">{STATUS_LABELS[img.statusColor] || img.statusColor}</span>
              </div>
            </div>
          )}
          {!origSrc && (
            <div className="rounded-xl bg-zinc-900/60 px-3 py-2.5 border border-zinc-800">
              <p className="text-zinc-500 text-xs leading-relaxed">
                La resolución original solo está disponible en la sesión en la que se subió.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Toolbar ───────────────────────────────────────────────────────────────────────
function ToolBar({ activeTool, setActiveTool, userColor, strokeSize, setStrokeSize }) {
  const btn = (tool, icon) => (
    <button className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
      style={activeTool === tool ? { background: userColor, color: '#000' } : { color: '#71717a' }}
      onClick={() => setActiveTool(tool)}
      onMouseEnter={e => { if (activeTool !== tool) e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { if (activeTool !== tool) e.currentTarget.style.color = '#71717a'; }}
    >{icon}</button>
  );
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-2 rounded-2xl border border-[#2a2a2a] shadow-2xl"
      style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)', zIndex: 100 }}>
      {btn('pointer', <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>)}
      <div className="w-px h-5 bg-[#2a2a2a] mx-1" />
      {btn('pencil', <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>)}
      {activeTool === 'pencil' && (<>
        <div className="w-px h-5 bg-[#2a2a2a] mx-0.5" />
        {STROKE_SIZES.map(opt => (
          <button key={opt.size} onClick={() => setStrokeSize(opt.size)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={strokeSize === opt.size ? { background: 'rgba(255,255,255,0.1)' } : {}}>
            <div className="rounded-full" style={{
              width: Math.min(opt.size * 4, 20), height: Math.min(opt.size * 4, 20),
              minWidth: 3, minHeight: 3,
              background: strokeSize === opt.size ? userColor : '#555',
            }} />
          </button>
        ))}
      </>)}
      <div className="w-px h-5 bg-[#2a2a2a] mx-1" />
      {btn('postit', <span className="font-bold text-base leading-none select-none" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>T</span>)}
    </div>
  );
}

// ── Canvas Image ──────────────────────────────────────────────────────────────────
function CanvasImage({ item, isSelected, isResizing, origSrc, activeTool, onSelect, onDblClick, onDragStart, onDragMove, onDragEnd, onContextMenu, onEnter, onLeave }) {
  const [imgObj, setImgObj] = useState(null);
  // Always best available quality (original in-session → medium stored → low fallback)
  const src = origSrc || item.medSrc || item.lowSrc;

  useEffect(() => {
    if (!src) return;
    const i = new window.Image();
    i.onload = () => setImgObj(i);
    i.src = src;
  }, [src]);

  if (!imgObj) return null;
  const statusColor = item.statusColor ? STATUS_COLORS[item.statusColor] : null;

  // Visual pop: 4% scale + strong shadow when selected and NOT in resize/multi-select mode
  // (suppress when transformer is active to avoid handle misalignment)
  const popped = isSelected && !isResizing;
  const popScale = popped ? 1.04 : 1;
  const popDx    = popped ? -item.w * 0.02 : 0;
  const popDy    = popped ? -item.h * 0.02 : 0;

  return (
    <Group id={item.id} x={item.x} y={item.y}
      draggable={activeTool === 'pointer'}
      onClick={onSelect} onDblClick={onDblClick} onTap={onSelect}
      onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}
      onContextMenu={onContextMenu} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Group x={popDx} y={popDy} scaleX={popScale} scaleY={popScale}
        shadowEnabled={isSelected} shadowColor="rgba(0,0,0,0.95)" shadowBlur={70} shadowOffsetY={28} shadowOpacity={0.9}>
        <KonvaImage x={0} y={0} width={item.w} height={item.h} image={imgObj} />
        {statusColor ? (
          // Colored circle — center exactly on the top-left corner of the image
          <Circle x={0} y={0} radius={18}
            fill={statusColor}
            shadowColor="rgba(0,0,0,0.9)" shadowBlur={8} shadowOpacity={1}
            listening={false} />
        ) : (
          // NEW badge — no status color assigned yet
          <Group listening={false}>
            <Rect x={0} y={0} width={42} height={22} fill="#a78bfa"
              cornerRadius={[0, 5, 5, 0]} />
            <KonvaText x={0} y={5} width={42} text="NEW"
              fontSize={10} fontFamily="Inter, sans-serif"
              fontStyle="bold" fill="#fff" align="center" />
          </Group>
        )}
      </Group>
    </Group>
  );
}

// ── Folder components ─────────────────────────────────────────────────────────────
function FolderCard({ img, x, y, rotation, w, h }) {
  const [imgObj, setImgObj] = useState(null);
  useEffect(() => {
    const src = img?.medSrc || img?.lowSrc;
    if (!src) return;
    const el = new window.Image();
    el.onload = () => setImgObj(el);
    el.src = src;
  }, [img?.medSrc, img?.lowSrc]);

  let crop;
  if (imgObj) {
    const ia = imgObj.width / imgObj.height, ca = w / h;
    if (ia > ca) { const cw = imgObj.height * ca; crop = { x: (imgObj.width - cw) / 2, y: 0, width: cw, height: imgObj.height }; }
    else         { const ch = imgObj.width / ca;  crop = { x: 0, y: (imgObj.height - ch) / 2, width: imgObj.width, height: ch }; }
  }
  return (
    <Group x={x} y={y} rotation={rotation}>
      <Rect width={w} height={h} fill="#181818" cornerRadius={6} stroke="#2a2a2a" strokeWidth={1} listening={false} />
      {imgObj && <KonvaImage image={imgObj} x={0} y={0} width={w} height={h} crop={crop} cornerRadius={6} listening={false} />}
    </Group>
  );
}

function CanvasFolder({ folder, allImages, isExpanded, activeTool, onToggle, onDragStart, onDragEnd, onScale, onDisband, onEnter, onLeave, onNameClick, bboxX1, bboxY1 }) {
  const [hov, setHov] = useState(false);
  const allFolderImgs = allImages.filter(img => (folder.imageIds || []).includes(img.id));
  const preview = allFolderImgs.slice(0, 3);
  const shown = preview.length;
  const sc = folder.scale || 1;
  const W = FDECK_W * sc, H = FDECK_H * sc;
  const scIdx = FOLDER_SCALES.findIndex(s => Math.abs(s - sc) < 0.05);
  const scLabel = scIdx >= 0 ? FOLDER_SCALE_LABELS[scIdx] : '20%';

  // All controls scale proportionally with sc
  const bnr     = Math.round(14 * sc);
  const gap     = Math.round(8  * sc);
  const cntW    = Math.round(52 * sc);
  const cntH    = Math.round(28 * sc);
  const cntFs   = Math.round(13 * sc);
  const pctFs   = Math.round(10 * sc);
  const sw      = Math.max(1, Math.round(2 * sc));
  const CTL_Y   = -(cntH / 2 + Math.round(20 * sc));
  const xSc     = cntW + gap + bnr;
  const xDis    = xSc  + bnr + gap + bnr;
  const nameFsz = Math.round(11 * sc);
  const nameY   = H + Math.round(10 * sc);   // below the deck

  // When expanded: deck sits at top-left of the frame (inside it)
  // When collapsed: folder.x/y is synced to that same position on close, so no jump occurs
  const FRAME_INNER_PAD = 12;
  const displayX = isExpanded && bboxX1 != null ? bboxX1 + FRAME_INNER_PAD : folder.x;
  const displayY = isExpanded && bboxY1 != null ? bboxY1 + FRAME_INNER_PAD : folder.y;

  const offsets = hov && !isExpanded
    ? [{ x: -50 * sc, y: -12 * sc, r: -14 }, { x: 0, y: -22 * sc, r: 0 }, { x: 50 * sc, y: -12 * sc, r: 14 }]
    : [{ x: 10 * sc,  y: -8 * sc,  r: 5   }, { x: 5 * sc, y: -4 * sc, r: -2 }, { x: 0, y: 0, r: 0 }];
  const padStart = 3 - shown;

  const hitTop = CTL_Y - cntH / 2 - gap;

  return (
    <Group id={folder.id} x={displayX} y={displayY}
      draggable={activeTool === 'pointer'}
      onClick={onToggle}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => { setHov(true); onEnter(); }}
      onMouseLeave={() => { setHov(false); onLeave(); }}>

      {/* Hit area */}
      <Rect x={-gap} y={hitTop}
        width={Math.max(W, xDis + bnr) + gap * 2}
        height={nameY + nameFsz + gap - hitTop}
        fill="transparent" />

      {/* Opaque background when expanded so images don't visually bleed through */}
      {isExpanded && (
        <Rect x={-gap} y={-gap} width={W + gap * 2} height={H + gap * 2}
          fill="#0c0c0c" stroke="#2a2a2a" strokeWidth={1} cornerRadius={Math.round(10 * sc)} listening={false} />
      )}

      {/* Deck cards */}
      {preview.map((img, i) => {
        const off = offsets[padStart + i];
        return <FolderCard key={img.id} img={img} x={off.x} y={off.y} rotation={off.r} w={W} h={H} />;
      })}

      {/* Folder name — always visible, click to edit */}
      <Group x={0} y={nameY} onClick={e => { e.cancelBubble = true; onNameClick(); }}>
        <Rect x={0} y={0} width={Math.max(W, 140)} height={nameFsz + 8} fill="transparent" />
        <KonvaText x={0} y={0} width={Math.max(W, 140)}
          text={folder.name || (hov ? '+ agregar nombre' : '   ')}
          fontSize={nameFsz} fontFamily="Inter, sans-serif"
          fill={folder.name ? '#ccc' : '#555'} listening={false} />
      </Group>

      {/* Controls — only on hover */}
      {hov && (<>
        <Group x={0} y={CTL_Y}>
          <Rect x={0} y={-cntH / 2} width={cntW} height={cntH} fill="#faff05" cornerRadius={Math.round(8 * sc)} listening={false} />
          <KonvaText x={0} y={-cntH / 2} width={cntW} height={cntH} align="center" verticalAlign="middle"
            text={String(allFolderImgs.length)} fontSize={cntFs} fontFamily="Inter, sans-serif"
            fontStyle="bold" fill="#000" listening={false} />
        </Group>
        <Group x={xSc} y={CTL_Y} onClick={e => { e.cancelBubble = true; onScale(); }}>
          <Circle radius={bnr} fill="#0a0a0a" stroke="#faff05" strokeWidth={sw} />
          <KonvaText x={-bnr} y={-pctFs / 2} width={bnr * 2} align="center"
            text={scLabel} fontSize={pctFs} fontFamily="Inter, sans-serif"
            fill="#faff05" fontStyle="bold" listening={false} />
        </Group>
        <Group x={xDis} y={CTL_Y} onClick={e => { e.cancelBubble = true; onDisband(); }}>
          <Circle radius={bnr} fill="#0a0a0a" stroke="#555" strokeWidth={sw} />
          <Line points={[-bnr * 0.5, -bnr * 0.5, bnr * 0.5, bnr * 0.5]} stroke="#aaa" strokeWidth={sw} lineCap="round" listening={false} />
          <Line points={[bnr * 0.5, -bnr * 0.5, -bnr * 0.5, bnr * 0.5]} stroke="#aaa" strokeWidth={sw} lineCap="round" listening={false} />
        </Group>
      </>)}

      {isExpanded && (
        <KonvaText x={0} y={nameY + nameFsz + Math.round(6 * sc)} text="▾ clic para cerrar"
          fontSize={Math.round(9 * sc)} fontFamily="Inter, sans-serif" fill="#faff05" listening={false} />
      )}
    </Group>
  );
}

// ── Minimap ───────────────────────────────────────────────────────────────────────
function Minimap({ images, postits, folders, expandedFolderIds, stageScale, stagePos, setStagePos, viewW, viewH }) {
  const mapRef   = useRef(null);
  const dragging = useRef(false);
  const MAP_W = 200, MAP_H = 130;

  // IDs of images/postits hidden inside closed folders
  const collapsedIds = new Set(
    (folders || []).filter(f => !expandedFolderIds?.has(f.id)).flatMap(f => f.imageIds || [])
  );

  // Compute bounding box of all visible canvas items
  const rects = [];
  (images  || []).filter(i => !collapsedIds.has(i.id)).forEach(i => rects.push({ x: i.x, y: i.y, x2: i.x + i.w, y2: i.y + i.h }));
  (postits || []).filter(p => !collapsedIds.has(p.id)).forEach(p => rects.push({ x: p.x, y: p.y, x2: p.x + p.w, y2: p.y + p.h }));
  (folders || []).forEach(f => {
    const sc = f.scale || 1;
    if (expandedFolderIds?.has(f.id)) {
      const members = [
        ...(images  || []).filter(i => (f.imageIds || []).includes(i.id)),
        ...(postits || []).filter(p => (f.imageIds || []).includes(p.id)),
      ];
      if (f.frame) {
        rects.push({ x: f.frame.x1, y: f.frame.y1, x2: f.frame.x2, y2: f.frame.y2 });
      } else if (members.length) {
        const pad = 20;
        rects.push({
          x:  Math.min(...members.map(i => i.x)) - pad,
          y:  Math.min(...members.map(i => i.y)) - pad,
          x2: Math.max(...members.map(i => i.x + i.w)) + pad,
          y2: Math.max(...members.map(i => i.y + i.h)) + pad,
        });
      } else {
        rects.push({ x: f.x, y: f.y, x2: f.x + FDECK_W * sc, y2: f.y + FDECK_H * sc });
      }
    } else {
      rects.push({ x: f.x, y: f.y, x2: f.x + FDECK_W * sc, y2: f.y + FDECK_H * sc });
    }
  });

  if (rects.length === 0) return null;

  const PAD  = 200;
  const minX = Math.min(...rects.map(r => r.x))  - PAD;
  const maxX = Math.max(...rects.map(r => r.x2)) + PAD;
  const minY = Math.min(...rects.map(r => r.y))  - PAD;
  const maxY = Math.max(...rects.map(r => r.y2)) + PAD;
  const cW = maxX - minX, cH = maxY - minY;

  const msc  = Math.min(MAP_W / cW, MAP_H / cH);
  const offX = (MAP_W - cW * msc) / 2;
  const offY = (MAP_H - cH * msc) / 2;

  const toMap    = (cx, cy) => ({ x: (cx - minX) * msc + offX, y: (cy - minY) * msc + offY });
  const toCanvas = (mx, my) => ({ x: (mx - offX) / msc + minX, y: (my - offY) / msc + minY });

  const navigate = (e) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = Math.max(0, Math.min(MAP_W, e.clientX - rect.left));
    const my = Math.max(0, Math.min(MAP_H, e.clientY - rect.top));
    const { x: cx, y: cy } = toCanvas(mx, my);
    setStagePos({ x: viewW / 2 - cx * stageScale, y: viewH / 2 - cy * stageScale });
  };

  const onDown = (e) => { e.preventDefault(); dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); navigate(e); };
  const onMove = (e) => { if (dragging.current) navigate(e); };
  const onUp   = ()  => { dragging.current = false; };

  const vpCX = -stagePos.x / stageScale, vpCY = -stagePos.y / stageScale;
  const vpW  = viewW / stageScale,       vpH  = viewH / stageScale;
  const vpM  = toMap(vpCX, vpCY);
  const vpMW = vpW * msc, vpMH = vpH * msc;

  const STATUS_DOT = { green: '#34d399', yellow: '#fde68a', red: '#f87171', purple: '#a78bfa' };

  return (
    <div ref={mapRef}
      style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 50,
               width: MAP_W, height: MAP_H, cursor: 'crosshair',
               background: 'rgba(8,8,8,0.88)', border: '1px solid #2a2a2a', borderRadius: 10, overflow: 'hidden',
               userSelect: 'none' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
      <svg width={MAP_W} height={MAP_H}>

        {/* Open folder frames */}
        {(folders || []).map(f => {
          if (!expandedFolderIds?.has(f.id)) return null;
          const members = [
            ...(images  || []).filter(i => (f.imageIds || []).includes(i.id)),
            ...(postits || []).filter(p => (f.imageIds || []).includes(p.id)),
          ];
          let fx1, fy1, fx2, fy2;
          if (f.frame) { fx1 = f.frame.x1; fy1 = f.frame.y1; fx2 = f.frame.x2; fy2 = f.frame.y2; }
          else if (members.length) {
            const pad = 20;
            fx1 = Math.min(...members.map(i => i.x)) - pad;
            fy1 = Math.min(...members.map(i => i.y)) - pad;
            fx2 = Math.max(...members.map(i => i.x + i.w)) + pad;
            fy2 = Math.max(...members.map(i => i.y + i.h)) + pad;
          } else return null;
          const fm = toMap(fx1, fy1);
          const fw = Math.max(8, (fx2 - fx1) * msc), fh = Math.max(5, (fy2 - fy1) * msc);
          return <rect key={f.id} x={fm.x} y={fm.y} width={fw} height={fh}
            fill="rgba(250,255,5,0.05)" stroke="#faff05" strokeWidth={0.8} strokeDasharray="3,2" rx={1} />;
        })}

        {/* Images (excluding those hidden inside closed folders) */}
        {(images || []).filter(i => !collapsedIds.has(i.id)).map(img => {
          const mp = toMap(img.x, img.y);
          const mw = Math.max(2, img.w * msc), mh = Math.max(2, img.h * msc);
          return <rect key={img.id} x={mp.x} y={mp.y} width={mw} height={mh}
            fill={img.statusColor ? STATUS_DOT[img.statusColor] : '#a78bfa'} fillOpacity={0.75} rx={0.5} />;
        })}

        {/* Postits (excluding those hidden inside closed folders) */}
        {(postits || []).filter(p => !collapsedIds.has(p.id)).map(p => {
          const mp = toMap(p.x, p.y);
          const mw = Math.max(3, p.w * msc), mh = Math.max(3, p.h * msc);
          return <rect key={p.id} x={mp.x} y={mp.y} width={mw} height={mh}
            fill={p.createdBy ? getUserColor(p.createdBy) : (p.color || '#faff05')} fillOpacity={0.85} rx={0.5} />;
        })}

        {/* Closed folder icons (body + tab shape) */}
        {(folders || []).filter(f => !expandedFolderIds?.has(f.id)).map(f => {
          const sc = f.scale || 1;
          const fm = toMap(f.x, f.y);
          const fw = Math.max(12, FDECK_W * sc * msc), fh = Math.max(8, FDECK_H * sc * msc);
          const th = Math.max(2.5, fh * 0.28);
          const tw = fw * 0.45;
          return (
            <g key={f.id}>
              <rect x={fm.x} y={fm.y + th - 0.5} width={fw} height={fh - th + 0.5}
                fill="#ffffff" fillOpacity={0.55} rx={0.8} />
              <rect x={fm.x} y={fm.y} width={tw} height={th}
                fill="#ffffff" fillOpacity={0.65} rx={0.5} />
            </g>
          );
        })}

        {/* Viewport indicator */}
        <rect x={vpM.x} y={vpM.y}
          width={Math.max(8, vpMW)} height={Math.max(5, vpMH)}
          fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.55)" strokeWidth={1} rx={1} />
      </svg>
    </div>
  );
}

// ── Board Gallery ─────────────────────────────────────────────────────────────────
function BoardGallery({ client, onBack, onEnterBoard }) {
  const [images,  setImages]  = useState([]);
  const [folders, setFolders] = useState([]);
  const [loaded,  setLoaded]  = useState(false);
  const [lightbox, setLightbox] = useState(null); // img object or null

  useEffect(() => {
    get(ref(db, `boards/${client.id}`))
      .then(snap => {
        const d = snap.val() || {};
        // Also try localStorage fallback
        let imgs = d.images || [], flds = d.folders || [];
        if (!imgs.length) {
          try {
            const local = JSON.parse(localStorage.getItem(`board_backup_${client.id}`) || 'null');
            if (local?.images?.length) { imgs = local.images; flds = local.folders || []; }
          } catch (_) {}
        }
        setImages(imgs);
        setFolders(flds);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [client.id]);

  const imageFolderMap = {};
  folders.forEach(f => { (f.imageIds || []).forEach(id => { imageFolderMap[id] = f.name || ''; }); });

  const NOW = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  // Newest uploads first; images without uploadedAt fall back to zOrder desc (higher = newer)
  const sorted = [...images].sort((a, b) => {
    const aTs = a.uploadedAt || 0, bTs = b.uploadedAt || 0;
    if (aTs && bTs) return bTs - aTs;
    if (aTs) return -1;
    if (bTs) return 1;
    return (b.zOrder || 0) - (a.zOrder || 0);
  });

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#080808' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-4 px-6 pt-6 pb-4">
        <button onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all"
          style={{ background: '#0d0d0d', border: '1.5px solid #222', color: '#71717a' }}
          onMouseEnter={e => { e.currentTarget.style.color='#faff05'; e.currentTarget.style.borderColor='#333'; }}
          onMouseLeave={e => { e.currentTarget.style.color='#71717a'; e.currentTarget.style.borderColor='#222'; }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-white font-bold text-lg leading-none">{client.name}</h2>
          <p className="text-zinc-600 text-xs mt-0.5">
            {loaded ? (images.length > 0 ? `${images.length} ${images.length === 1 ? 'archivo' : 'archivos'}` : 'Sin archivos') : 'Cargando…'}
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-28">
        {!loaded && (
          <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">Cargando…</div>
        )}
        {loaded && images.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-zinc-500 text-sm">Este board todavía no tiene archivos.</p>
            <p className="text-zinc-700 text-xs">Entrá al board para subir imágenes.</p>
          </div>
        )}
        {loaded && images.length > 0 && (
          <div style={{ columns: '5 160px', columnGap: '8px' }}>
            {sorted.map(img => {
              const statusHex = img.statusColor ? STATUS_COLORS[img.statusColor] : null;
              return (
                <div key={img.id}
                  style={{ breakInside: 'avoid', marginBottom: '8px', cursor: 'pointer' }}
                  onClick={() => setLightbox(img)}>
                  <div className="relative rounded-xl overflow-hidden group"
                    style={{ background: '#111', outline: statusHex ? `1.5px solid ${statusHex}55` : 'none', outlineOffset: '-1.5px' }}>
                    <img
                      src={img.medSrc || img.lowSrc}
                      alt=""
                      style={{ width: '100%', display: 'block', transition: 'opacity 0.15s' }}
                      className="group-hover:opacity-80"
                    />
                    {/* Status / new badge — always visible */}
                    <div className="absolute top-1.5 left-1.5">
                      {!img.statusColor ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase"
                          style={{ background: '#a78bfa', color: '#fff' }}>
                          new
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase"
                          style={{ background: 'rgba(0,0,0,0.72)', color: statusHex, backdropFilter: 'blur(4px)', border: `1px solid ${statusHex}44` }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusHex, display: 'inline-block', flexShrink: 0 }} />
                          {STATUS_LABELS[img.statusColor] || img.statusColor}
                        </span>
                      )}
                    </div>
                    {imageFolderMap[img.id] && (
                      <div className="absolute bottom-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                          style={{ background: 'rgba(0,0,0,0.75)', color: '#faff05', backdropFilter: 'blur(4px)' }}>
                          {imageFolderMap[img.id] || 'Carpeta'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enter board button */}
      <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none">
        <button onClick={onEnterBoard}
          className="pointer-events-auto flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all active:scale-95 group"
          style={{ background: '#faff05', color: '#000', boxShadow: '0 8px 32px rgba(250,255,5,0.35)' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(250,255,5,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 32px rgba(250,255,5,0.35)'; }}>
          Entrar al board
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
          onClick={() => setLightbox(null)}>
          <img
            src={lightbox.medSrc || lightbox.lowSrc}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
          <button onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 text-white/60 hover:text-white text-2xl leading-none transition-colors">✕</button>
        </div>
      )}
    </div>
  );
}

// ── Board Canvas ──────────────────────────────────────────────────────────────────
function BoardCanvas({ client, currentUser, onBack, onGallery }) {
  const containerRef = useRef(null);
  const stageRef     = useRef(null);
  const fileInputRef = useRef(null);
  const trRef        = useRef(null);

  const [size, setSize]             = useState({ w: 0, h: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos]     = useState({ x: 0, y: 0 });

  const [loaded,   setLoaded]   = useState(false);
  const [images,   setImages]   = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [postits,  setPostits]  = useState([]);

  const [activeTool,  setActiveTool]  = useState('pointer');
  const [strokeSize,  setStrokeSize]  = useState(3);
  const [selectedIds, setSelectedIds] = useState([]);
  // IDs of images currently showing resize handles (requires double-click to enter)
  const [imageResizeIds, setImageResizeIds] = useState([]);
  const [contextMenu,    setContextMenu]    = useState(null);
  const [fullscreenImg,  setFullscreenImg]  = useState(null);

  const [hoveredId, setHoveredId] = useState(null);
  const [mousePos,  setMousePos]  = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showScrollbars, setShowScrollbars] = useState(false);

  const [isDrawing,  setIsDrawing]  = useState(false);
  const [livePoints, setLivePoints] = useState([]);
  const pathRef = useRef(null);

  const [selBox, setSelBox] = useState(null);
  const isSelectingRef = useRef(false);
  const selectStartRef = useRef(null);

  const isPanningRef   = useRef(false);
  const panStartRef    = useRef({ mouseX: 0, mouseY: 0, stageX: 0, stageY: 0 });
  const scrollbarTimer = useRef(null);
  const multiDragRef      = useRef({ active: false, anchorId: null, starts: {} });
  const dragFolderBboxRef  = useRef(null);
  const folderHoverTimer   = useRef(null);
  const [hoveredFolderId,      setHoveredFolderId]      = useState(null);
  const [disbandConfirmId,     setDisbandConfirmId]     = useState(null);
  const [editingFolderNameId,  setEditingFolderNameId]  = useState(null);
  const [dragOverFolderId,     setDragOverFolderId]     = useState(null); // deck/frame hover during drag → "Integrar" drop target
  const [dragOutFolder,        setDragOutFolder]        = useState(false); // member dragged outside bbox → "Sacar"
  const [dragActiveIds,        setDragActiveIds]        = useState([]);    // image IDs currently being dragged (drives all-folder overlays)
  const [frameResizeBlocked,   setFrameResizeBlocked]   = useState(false); // frame shrink blocked by images inside
  const frameResizeBlockTimer  = useRef(null);
  const [groupInsideGroupError, setGroupInsideGroupError] = useState(false); // folder dropped inside another folder
  const groupInsideGroupTimer  = useRef(null);
  const [selectedFrameId,      setSelectedFrameId]      = useState(null); // frame in resize mode
  const boardSaveId = useRef(''); // nonce to skip our own onValue echoes
  const historyRef        = useRef([]);
  const [folders, setFolders] = useState([]);
  const foldersRef     = useRef([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState(new Set());
  useEffect(() => { foldersRef.current = folders; }, [folders]);
  const [canUndo, setCanUndo] = useState(false);

  const [postitModal,   setPostitModal]   = useState(null);
  const [postitText,    setPostitText]    = useState('');
  const [editingPostit, setEditingPostit] = useState(null); // { id, text, screenX, screenY, scaledW, color, fontSize }
  const postitLastClickRef = useRef({});                   // tracks last click timestamp per postit id for double-click detection

  const origSrcsRef = useRef({});
  const userColor   = getUserColor(currentUser);

  // Stable refs for Konva callbacks
  const imagesRef        = useRef(images);
  const drawingsRef      = useRef(drawings);
  const postitsRef       = useRef(postits);
  const selIdsRef        = useRef(selectedIds);
  const imageResizeRef   = useRef(imageResizeIds);
  const activeToolRef    = useRef(activeTool);
  useEffect(() => { imagesRef.current      = images;        }, [images]);
  useEffect(() => { drawingsRef.current    = drawings;      }, [drawings]);
  useEffect(() => { postitsRef.current     = postits;       }, [postits]);
  useEffect(() => { selIdsRef.current      = selectedIds;   }, [selectedIds]);
  useEffect(() => { imageResizeRef.current = imageResizeIds;}, [imageResizeIds]);
  useEffect(() => { activeToolRef.current  = activeTool;    }, [activeTool]);

  // ── Firebase ─────────────────────────────────────────────────────────────────
  const boardLoadedRef  = useRef(false);
  const hasPendingSave  = useRef(false);
  const saveSeqRef      = useRef(0);
  // Per-item dirty tracking — lets us apply remote changes in real-time while
  // preserving items the current user has touched since the last completed write.
  const dirtyIds    = useRef(new Set()); // IDs modified by us, pending save
  const localDeletes= useRef(new Set()); // IDs deleted by us, pending save
  // Keep pendingDeletedIds as alias for compat
  const pendingDeletedIds = localDeletes;
  const lastBackupTime  = useRef(0);
  const BACKUP_INTERVAL = 5 * 60 * 1000; // snapshot at most every 5 min
  const MAX_BACKUPS     = 25;
  const [showBackups,   setShowBackups]   = useState(false);
  const [onlineUsers,   setOnlineUsers]   = useState({});
  const [presenceHover, setPresenceHover] = useState(false);
  const [backupsList,   setBackupsList]   = useState([]);
  const [loadingBkps,   setLoadingBkps]   = useState(false);
  const [restoringBkp,  setRestoringBkp]  = useState(null); // timestamp being restored

  // Save a snapshot to boards_backup/{clientId}/{timestamp} (keeps last MAX_BACKUPS)
  const saveBackup = useCallback(() => {
    lastBackupTime.current = Date.now();
    const ts = lastBackupTime.current;
    const data = {
      images:    imagesRef.current   || [],
      drawings:  drawingsRef.current || [],
      postits:   postitsRef.current  || [],
      folders:   foldersRef.current  || [],
      savedAt:   ts,
      imageCount: (imagesRef.current  || []).length,
      folderCount:(foldersRef.current || []).length,
    };
    set(ref(db, `boards_backup/${client.id}/${ts}`), data).then(() => {
      // Prune oldest entries beyond MAX_BACKUPS
      get(ref(db, `boards_backup/${client.id}`)).then(snap => {
        const keys = Object.keys(snap.val() || {}).sort((a, b) => +a - +b);
        if (keys.length > MAX_BACKUPS) {
          keys.slice(0, keys.length - MAX_BACKUPS)
              .forEach(k => remove(ref(db, `boards_backup/${client.id}/${k}`)));
        }
      });
    });
    // Mirror to localStorage as ultra-fast local fallback
    try {
      localStorage.setItem(`board_backup_${client.id}`, JSON.stringify(data));
    } catch (_) {}
  }, [client.id]);

  // ── Presence tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    const presenceRef = ref(db, `presence/${client.id}/${currentUser}`);
    const allPresenceRef = ref(db, `presence/${client.id}`);

    const goOnline = () => {
      set(presenceRef, true);
      onDisconnect(presenceRef).remove();
    };
    const goOffline = () => remove(presenceRef);

    goOnline();

    const handleVisibility = () => {
      if (document.hidden) goOffline();
      else goOnline();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const unsubPresence = onValue(allPresenceRef, snap => setOnlineUsers(snap.val() || {}));

    return () => {
      goOffline();
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubPresence();
    };
  }, [client.id, currentUser]);

  useEffect(() => {
    boardLoadedRef.current = false;
    boardSaveId.current = '';
    setLoaded(false);

    const unsub = onValue(ref(db, `boards/${client.id}`), (snap) => {
      const raw = snap.val() || {};
      const { _sid, ...d } = raw;

      if (!boardLoadedRef.current) {
        // ── Initial load ──────────────────────────────────────────────
        let imgs = d.images || [], drws = d.drawings || [], psts = d.postits || [], flds = d.folders || [];
        const fbSavedAt = d.savedAt || 0;
        let usedLocal = false;
        try {
          const local = JSON.parse(localStorage.getItem(`board_backup_${client.id}`) || 'null');
          // Use localStorage if it's newer than Firebase — handles refresh-before-debounce case
          if (local && (local.savedAt || 0) > fbSavedAt) {
            imgs = local.images || []; drws = local.drawings || [];
            psts = local.postits || []; flds = local.folders || [];
            usedLocal = true;
          } else if (!imgs.length && !flds.length && (local?.images?.length || local?.folders?.length)) {
            // Firebase empty, use local as fallback
            imgs = local.images || []; drws = local.drawings || [];
            psts = local.postits || []; flds = local.folders || [];
            usedLocal = true;
          }
        } catch (_) {}
        imagesRef.current = imgs; drawingsRef.current = drws; postitsRef.current = psts; foldersRef.current = flds;
        setImages(imgs); setDrawings(drws); setPostits(psts); setFolders(flds);
        boardLoadedRef.current = true;
        setLoaded(true);
        // Fetch image data (lowSrc/medSrc) from boards_imgdata — not part of real-time sync
        fetchImgData(client.id, imgs).then(imgsWithData => {
          imagesRef.current = imgsWithData;
          setImages([...imgsWithData]);
        });
        // If we loaded from localStorage (newer than Firebase), push it to Firebase immediately
        if (usedLocal) {
          const sid = genId();
          boardSaveId.current = sid;
          set(ref(db, `boards/${client.id}`), {
            images: imgs, drawings: drws, postits: psts, folders: flds,
            savedAt: Date.now(), _sid: sid,
          });
        } else if (imgs.length > 0 || flds.length > 0) {
          setTimeout(() => saveBackup(), 3000);
        }

      } else if (_sid && _sid === boardSaveId.current) {
        // ── Our own echo — skip ───────────────────────────────────────

      } else {
        // ── Remote update from another user ───────────────────────────
        // Always apply — this is what makes collaboration real-time.
        // Items the current user has touched (dirtyIds) keep their local version;
        // items the current user deleted (localDeletes) stay deleted.
        // Everything else is taken straight from the remote state.
        const remoteImgs = d.images || [], drws = d.drawings || [], psts = d.postits || [], flds = d.folders || [];
        const merge = (remote, localArr, keepSrcs = false) => {
          const localMap = new Map((localArr || []).map(i => [i.id, i]));
          const seen = new Set();
          const result = (remote || [])
            .filter(item => !localDeletes.current.has(item.id))
            .map(item => {
              seen.add(item.id);
              let merged = dirtyIds.current.has(item.id) ? (localMap.get(item.id) || item) : item;
              if (keepSrcs) {
                const local = localMap.get(item.id);
                if (local?.lowSrc && !merged.lowSrc) merged = { ...merged, lowSrc: local.lowSrc, medSrc: local.medSrc };
              }
              return merged;
            });
          // Re-add our dirty new items that aren't in remote yet
          dirtyIds.current.forEach(id => {
            if (!seen.has(id) && !localDeletes.current.has(id) && localMap.has(id))
              result.push(localMap.get(id));
          });
          return result;
        };
        const mi = merge(remoteImgs, imagesRef.current, true);
        const mp = merge(psts,       postitsRef.current);
        const md = merge(drws,       drawingsRef.current);
        const mf = merge(flds,       foldersRef.current);
        imagesRef.current = mi; drawingsRef.current = md; postitsRef.current = mp; foldersRef.current = mf;
        setImages(mi); setDrawings(md); setPostits(mp); setFolders(mf);
      }
    }, () => { boardLoadedRef.current = true; setLoaded(true); });

    return () => {
      unsub();
      if (!boardLoadedRef.current || !hasPendingSave.current) return;
      clearTimeout(saveTimer.current);
      set(ref(db, `boards/${client.id}`), {
        images: (imagesRef.current || []).map(({ lowSrc, medSrc, ...meta }) => meta),
        drawings: drawingsRef.current || [],
        postits: postitsRef.current || [],
        folders: foldersRef.current || [],
      });
    };
  }, [client.id, saveBackup]);

  const saveTimer = useRef(null);

  const persist = useCallback(() => {
    hasPendingSave.current = true;
    clearTimeout(saveTimer.current);
    const seq = ++saveSeqRef.current;
    saveTimer.current = setTimeout(async () => {
      if (seq !== saveSeqRef.current) return;
      const sid = genId();
      boardSaveId.current = sid;
      const savedAt = Date.now();
      const data = {
        images:   (imagesRef.current || []).map(({ lowSrc, medSrc, ...meta }) => meta),
        drawings: drawingsRef.current || [],
        postits:  postitsRef.current  || [],
        folders:  foldersRef.current  || [],
        savedAt, _sid: sid,
      };
      try {
        await set(ref(db, `boards/${client.id}`), data);
      } catch (_) {
        // retry once on network error
        try { await set(ref(db, `boards/${client.id}`), data); } catch (_2) {}
      }
      hasPendingSave.current = false;
      dirtyIds.current.clear();
      localDeletes.current.clear();
      // Items from other users can arrive via onValue during the async write.
      // If any new IDs appeared in our state that weren't in the data we just wrote,
      // our write erased them from Firebase — re-save immediately to restore them.
      const writtenIds = new Set([
        ...(data.images   || []).map(i => i.id),
        ...(data.postits  || []).map(p => p.id),
        ...(data.drawings || []).map(d => d.id),
        ...(data.folders  || []).map(f => f.id),
      ]);
      const arrivals = [
        ...(imagesRef.current   || []).filter(i => !writtenIds.has(i.id)),
        ...(postitsRef.current  || []).filter(p => !writtenIds.has(p.id)),
        ...(drawingsRef.current || []).filter(d => !writtenIds.has(d.id)),
        ...(foldersRef.current  || []).filter(f => !writtenIds.has(f.id)),
      ];
      if (arrivals.length > 0) {
        arrivals.forEach(item => dirtyIds.current.add(item.id));
        persist();
      }
      try {
        localStorage.setItem(`board_backup_${client.id}`, JSON.stringify(data));
      } catch (_) {}
      if (Date.now() - lastBackupTime.current > BACKUP_INTERVAL) saveBackup();
    }, 100);
  }, [client.id, saveBackup, BACKUP_INTERVAL]);

  const migrateImgData = useCallback(() => {
    // Images that still have base64 directly in board data (old format before this architecture)
    const toMigrate = imagesRef.current.filter(img =>
      img.lowSrc?.startsWith('data:') || img.medSrc?.startsWith('data:')
    );
    if (!toMigrate.length) return;
    toMigrate.forEach(img => saveImageData(client.id, img.id, img.lowSrc, img.medSrc));
    // persist() strips lowSrc/medSrc — board data becomes tiny
    persist();
  }, [client.id, persist]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => migrateImgData(), 1500);
    return () => clearTimeout(timer);
  }, [loaded, migrateImgData]);

  // Load backup list from Firebase
  const loadBackups = useCallback(() => {
    setLoadingBkps(true);
    get(ref(db, `boards_backup/${client.id}`)).then(snap => {
      const all = snap.val() || {};
      const list = Object.values(all)
        .sort((a, b) => b.savedAt - a.savedAt)
        .slice(0, MAX_BACKUPS);
      setBackupsList(list);
      setLoadingBkps(false);
    }).catch(() => setLoadingBkps(false));
  }, [client.id]);

  // Restore a backup snapshot
  const restoreBackup = useCallback(async (backup) => {
    setRestoringBkp(backup.savedAt);
    let imgs = backup.images || [];
    const drws = backup.drawings || [], psts = backup.postits || [], flds = backup.folders || [];
    imgs = await fetchImgData(client.id, imgs);
    set(ref(db, `boards/${client.id}`), {
      images: imgs.map(({ lowSrc, medSrc, ...meta }) => meta),
      drawings: drws, postits: psts, folders: flds,
    }).then(() => {
      imagesRef.current = imgs; drawingsRef.current = drws; postitsRef.current = psts; foldersRef.current = flds;
      setImages(imgs); setDrawings(drws); setPostits(psts); setFolders(flds);
      setRestoringBkp(null);
      setShowBackups(false);
    });
  }, [client.id]);

  // ── Undo history ─────────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    historyRef.current = [
      ...historyRef.current.slice(-49),
      { images: imagesRef.current, drawings: drawingsRef.current, postits: postitsRef.current, folders: foldersRef.current },
    ];
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    if (!historyRef.current.length) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setCanUndo(historyRef.current.length > 0);
    imagesRef.current   = prev.images;
    drawingsRef.current = prev.drawings;
    postitsRef.current  = prev.postits;
    foldersRef.current  = prev.folders || [];
    // Mark everything as dirty so remote echoes don't overwrite the undo state
    [...prev.images, ...prev.drawings, ...prev.postits, ...(prev.folders||[])].forEach(i => dirtyIds.current.add(i.id));
    setImages(prev.images);
    setDrawings(prev.drawings);
    setPostits(prev.postits);
    setFolders(foldersRef.current);
    setSelectedIds([]);
    setImageResizeIds([]);
    persist();
  }, [persist]);

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    setSize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // ── Mouse pos (for tooltip + expand button) ───────────────────────────────────
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const fn = e => { const r = el.getBoundingClientRect(); setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top }); };
    el.addEventListener('mousemove', fn);
    return () => el.removeEventListener('mousemove', fn);
  }, []);

  // ── Transformer sync ─────────────────────────────────────────────────────────
  // Multi-select: transformer on all images+postits automatically (group scale)
  // Single select: images need double-click; post-its always get handles
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const multi = selectedIds.length > 1;
    const resizable = multi
      ? selectedIds.filter(id => imagesRef.current.some(i => i.id === id) || postitsRef.current.some(p => p.id === id))
      : [
          ...imageResizeIds.filter(id => selectedIds.includes(id)),
          ...selectedIds.filter(id => postitsRef.current.some(p => p.id === id)),
        ];
    const nodes = [...new Set(resizable)]
      .map(id => stageRef.current.findOne('#' + id))
      .filter(Boolean);
    trRef.current.nodes(nodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedIds, imageResizeIds]);

  // ── Paste image from clipboard (Ctrl+V) ──────────────────────────────────────
  useEffect(() => {
    const handlePaste = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(item => item.type.startsWith('image/'));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      const { lowSrc, medSrc, origWidth, origHeight } = await compressImage(dataUrl);
      const id = genId();
      saveImageData(client.id, id, lowSrc, medSrc);
      const dw = Math.min(origWidth, 320);
      const dh = Math.round((origHeight / origWidth) * dw);
      const s = stageRef.current;
      const cx = s ? (size.w / 2 - s.x()) / s.scaleX() - dw / 2 : 100;
      const cy = s ? (size.h / 2 - s.y()) / s.scaleY() - dh / 2 : 100;
      const baseMz = imagesRef.current.length ? Math.max(...imagesRef.current.map(m => m.zOrder || 0)) : 0;
      const newImg = { id, x: Math.round(cx), y: Math.round(cy), w: dw, h: dh, lowSrc, medSrc, origWidth, origHeight, zOrder: baseMz + 1, statusColor: null, uploadedAt: Date.now() };
      origSrcsRef.current[newImg.id] = dataUrl;
      pushHistory();
      dirtyIds.current.add(newImg.id);
      const next = [...imagesRef.current, newImg];
      imagesRef.current = next;
      setImages(next);
      persist();
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [size, persist, pushHistory]);

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') { setImageResizeIds([]); setSelectedFrameId(null); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { undo(); return; }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const ids = selIdsRef.current;
      if (!ids.length) return;
      pushHistory();
      ids.forEach(id => { delete origSrcsRef.current[id]; localDeletes.current.add(id); dirtyIds.current.delete(id); });
      const ni = imagesRef.current.filter(i => !ids.includes(i.id));
      const nd = drawingsRef.current.filter(d => !ids.includes(d.id));
      const np = postitsRef.current.filter(p => !ids.includes(p.id));
      imagesRef.current = ni; drawingsRef.current = nd; postitsRef.current = np;
      setImages(ni); setDrawings(nd); setPostits(np);
      setSelectedIds([]); setImageResizeIds([]);
      persist();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [persist, pushHistory, undo]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getCanvasPoint = () => {
    const s = stageRef.current, pos = s.getPointerPosition();
    return { x: (pos.x - s.x()) / s.scaleX(), y: (pos.y - s.y()) / s.scaleY() };
  };
  const setCursor = c => { if (containerRef.current) containerRef.current.style.cursor = c; };

  // ── Wheel zoom ────────────────────────────────────────────────────────────────
  const handleWheel = e => {
    e.evt.preventDefault();
    const s = stageRef.current, ptr = s.getPointerPosition(), old = s.scaleX();
    const to = { x: (ptr.x - s.x()) / old, y: (ptr.y - s.y()) / old };
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, e.evt.deltaY < 0 ? old * SCALE_FACTOR : old / SCALE_FACTOR));
    setStageScale(ns);
    setStagePos({ x: ptr.x - to.x * ns, y: ptr.y - to.y * ns });
  };

  // ── Stage events ──────────────────────────────────────────────────────────────
  const handleStageMouseDown = e => {
    // Middle mouse button → pan
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      isPanningRef.current = true; setIsPanning(true);
      panStartRef.current = { mouseX: e.evt.clientX, mouseY: e.evt.clientY, stageX: stageRef.current.x(), stageY: stageRef.current.y() };
      setCursor('grabbing');
      setShowScrollbars(true);
      clearTimeout(scrollbarTimer.current);
      return;
    }

    const isBg   = e.target === stageRef.current;
    const tool   = activeToolRef.current;

    if (tool === 'pencil') {
      const p = getCanvasPoint();
      pathRef.current = { points: [p.x, p.y] };
      setLivePoints([p.x, p.y]);
      setIsDrawing(true);
      return;
    }
    if (tool === 'postit' && isBg) {
      setPostitModal(getCanvasPoint()); setPostitText(''); setActiveTool('pointer'); return;
    }
    if (tool === 'pointer' && isBg) {
      // Left click on canvas → start selection box (tiny click = deselect on mouseup)
      const p = getCanvasPoint();
      isSelectingRef.current = true; selectStartRef.current = p;
      setSelBox({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      setCursor('crosshair');
    }
  };

  const handleStageMouseMove = e => {
    if (isPanningRef.current) {
      const dx = e.evt.clientX - panStartRef.current.mouseX;
      const dy = e.evt.clientY - panStartRef.current.mouseY;
      setStagePos({ x: panStartRef.current.stageX + dx, y: panStartRef.current.stageY + dy });
      return;
    }
    if (isDrawing && pathRef.current) {
      const p = getCanvasPoint();
      const pts = [...pathRef.current.points, p.x, p.y];
      pathRef.current.points = pts; setLivePoints([...pts]); return;
    }
    if (isSelectingRef.current && selectStartRef.current) {
      const p = getCanvasPoint(); setSelBox(b => ({ ...b, x2: p.x, y2: p.y }));
    }
  };

  const handleStageMouseUp = e => {
    if (isPanningRef.current) {
      isPanningRef.current = false; setIsPanning(false); setCursor('default');
      clearTimeout(scrollbarTimer.current);
      scrollbarTimer.current = setTimeout(() => setShowScrollbars(false), 700);
      return;
    }
    if (isDrawing) {
      if (pathRef.current?.points.length > 4) {
        pushHistory();
        const nd = { id: genId(), x: 0, y: 0, points: pathRef.current.points, color: userColor, strokeWidth: strokeSize };
        dirtyIds.current.add(nd.id);
        const next = [...drawingsRef.current, nd];
        drawingsRef.current = next;
        setDrawings(next); persist();
      }
      setIsDrawing(false); pathRef.current = null; setLivePoints([]); return;
    }
    if (isSelectingRef.current) {
      isSelectingRef.current = false; setCursor('default');
      setSelBox(box => {
        if (box) {
          const bx1 = Math.min(box.x1, box.x2), by1 = Math.min(box.y1, box.y2);
          const bx2 = Math.max(box.x1, box.x2), by2 = Math.max(box.y1, box.y2);
          if (bx2 - bx1 > 4 && by2 - by1 > 4) {
            const ids = [];
            imagesRef.current.forEach(img => { if (rectsIntersect(bx1,by1,bx2,by2,img.x,img.y,img.x+img.w,img.y+img.h)) ids.push(img.id); });
            postitsRef.current.forEach(p  => { if (rectsIntersect(bx1,by1,bx2,by2,p.x,p.y,p.x+p.w,p.y+p.h)) ids.push(p.id); });
            drawingsRef.current.forEach(d => { const b=drawingBounds(d); if (rectsIntersect(bx1,by1,bx2,by2,b.x1,b.y1,b.x2,b.y2)) ids.push(d.id); });
            setSelectedIds(ids); setImageResizeIds([]);
          } else {
            // click without drag → deselect everything
            setSelectedIds([]); setImageResizeIds([]);
          }
        }
        return null;
      });
    }
  };

  const handleStageContextMenu = e => {
    e.evt.preventDefault();
    if (e.target === stageRef.current) setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, type: 'canvas' });
  };

  // ── Image click handlers ──────────────────────────────────────────────────────
  const handleImageSelect = (e, id) => {
    e.cancelBubble = true;
    setSelectedIds(e.evt.shiftKey ? prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id] : [id]);
    setImageResizeIds([]); // single click clears resize mode
  };

  const handleImageDblClick = (e, id) => {
    e.cancelBubble = true;
    setSelectedIds([id]);
    setImageResizeIds([id]); // double-click enters resize mode
  };

  // ── Generic element select (post-its, drawings) ───────────────────────────────
  const handleSelect = (e, id) => {
    e.cancelBubble = true;
    setSelectedIds(e.evt.shiftKey ? prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id] : [id]);
  };

  // ── Multi-drag ─────────────────────────────────────────────────────────────────
  const captureFolderBbox = (id) => {
    dragFolderBboxRef.current = null;
    const ownerFolder = foldersRef.current.find(f => expandedFolderIds.has(f.id) && (f.imageIds || []).includes(id));
    if (ownerFolder) {
      let x1, y1, x2, y2;
      if (ownerFolder.frame) {
        // Use the custom frame exactly as the user defined it
        ({ x1, y1, x2, y2 } = ownerFolder.frame);
      } else {
        const members = folderMembersRef(ownerFolder);
        const pad = 40;
        x1 = Math.min(...members.map(i => i.x)) - pad;
        y1 = Math.min(...members.map(i => i.y)) - pad;
        x2 = Math.max(...members.map(i => i.x + i.w)) + pad;
        y2 = Math.max(...members.map(i => i.y + i.h)) + pad;
      }
      dragFolderBboxRef.current = { folderId: ownerFolder.id, x1, y1, x2, y2 };
    }
  };

  const handleDragStart = (e, id) => {
    if (isPanningRef.current) { e.target.stopDrag(); return; }
    setSelectedFrameId(null);
    const ids = selIdsRef.current;
    if (!ids.includes(id)) {
      setSelectedIds([id]);
      setImageResizeIds([]);
      // still capture bbox + overlay state for this newly-selected image
      captureFolderBbox(id);
      if (imagesRef.current.some(img => img.id === id) || postitsRef.current.some(p => p.id === id)) setDragActiveIds([id]);
      else setDragActiveIds([]);
      return;
    }
    // Capture folder bbox (for remove-on-drag-out logic) before any movement
    captureFolderBbox(id);
    // Track which items (images + postits) are being dragged (drives folder overlays)
    const activeIds = ids.filter(i => imagesRef.current.some(img => img.id === i) || postitsRef.current.some(p => p.id === i));
    setDragActiveIds(activeIds);
    if (ids.length < 2) return;
    const stage = stageRef.current, starts = {};
    ids.forEach(sid => { const n = stage.findOne('#' + sid); if (n) starts[sid] = { x: n.x(), y: n.y() }; });
    multiDragRef.current = { active: true, anchorId: id, starts };
  };

  const handleDragMove = (e, id) => {
    const md = multiDragRef.current;
    if (md.active && md.anchorId === id) {
      const stage = stageRef.current, anchor = stage.findOne('#' + id);
      if (anchor) {
        const s0 = md.starts[id];
        if (s0) {
          const dx = anchor.x() - s0.x, dy = anchor.y() - s0.y;
          selIdsRef.current.forEach(sid => {
            if (sid === id) return;
            const n = stage.findOne('#' + sid), s = md.starts[sid];
            if (n && s) { n.x(s.x + dx); n.y(s.y + dy); }
          });
          stage.getLayers()[0]?.batchDraw();
        }
      }
    }

    // ── Folder hover detection for drag indicators ─────────────────────────
    if (!md.active || md.anchorId === id) {
      const stage = stageRef.current;
      const ptr = stage.getPointerPosition();
      if (ptr) {
        const sx = stage.x(), sy = stage.y(), sc = stage.scaleX();
        const cx = (ptr.x - sx) / sc, cy = (ptr.y - sy) / sc;

        // "Integrar" drop target — pointer over collapsed deck OR expanded frame
        let overFolderId = null;
        for (const f of foldersRef.current) {
          if ((f.imageIds || []).includes(id)) continue;
          if (expandedFolderIds.has(f.id)) {
            // check expanded frame (members = images + postits)
            const members = folderMembersRef(f);
            if (members.length) {
              const pad = 20;
              const fx = f.frame;
              const fx1 = fx ? fx.x1 : Math.min(...members.map(i => i.x)) - pad;
              const fy1 = fx ? fx.y1 : Math.min(...members.map(i => i.y)) - pad;
              const fx2 = fx ? fx.x2 : Math.max(...members.map(i => i.x + i.w)) + pad;
              const fy2 = fx ? fx.y2 : Math.max(...members.map(i => i.y + i.h)) + pad;
              if (cx >= fx1 && cx <= fx2 && cy >= fy1 && cy <= fy2) { overFolderId = f.id; break; }
            }
          } else {
            const fsc = f.scale || 1;
            if (cx >= f.x - 8 && cx <= f.x + FDECK_W * fsc + 8 &&
                cy >= f.y - 8 && cy <= f.y + FDECK_H * fsc + 8) {
              overFolderId = f.id; break;
            }
          }
        }
        setDragOverFolderId(overFolderId);

        // "Sacar" — folder member dragged outside its captured bbox
        if (dragFolderBboxRef.current) {
          const { x1, y1, x2, y2 } = dragFolderBboxRef.current;
          const node = stage.findOne('#' + id);
          if (node) {
            const item = imagesRef.current.find(i => i.id === id) || postitsRef.current.find(p => p.id === id);
            const itemCx = node.x() + (item?.w || 0) / 2;
            const itemCy = node.y() + (item?.h || 0) / 2;
            setDragOutFolder(itemCx < x1 || itemCx > x2 || itemCy < y1 || itemCy > y2);
          }
        }
      }
    }
  };

  const handleDragEnd = (e, id) => {
    const stage = stageRef.current, md = multiDragRef.current;
    // Non-anchor nodes in a multi-drag don't save — anchor already covers everyone
    if (md.active && md.anchorId !== id) return;
    pushHistory();
    // Mark dragged item(s) as dirty so remote updates don't revert their positions
    const draggedIds = md.active ? selIdsRef.current : [id];
    draggedIds.forEach(did => dirtyIds.current.add(did));
    // Always read positions from Konva nodes — React state may be stale between rapid drags
    const ni = imagesRef.current.map(img => { const n = stage.findOne('#' + img.id); return n ? { ...img, x: n.x(), y: n.y() } : img; });
    const np = postitsRef.current.map(p   => { const n = stage.findOne('#' + p.id);   return n ? { ...p,   x: n.x(), y: n.y() } : p;   });
    const nd = drawingsRef.current.map(d  => { const n = stage.findOne('#' + d.id);   return n ? { ...d,   x: n.x(), y: n.y() } : d;   });
    // "Integrar" — drop while hovering over a folder deck or frame
    if (dragOverFolderId) {
      const droppedIds = md.active ? selIdsRef.current : [id];
      // Add images AND postits that don't already belong to any folder
      const dropItemIds = droppedIds
        .filter(i => imagesRef.current.some(img => img.id === i) || postitsRef.current.some(p => p.id === i))
        .filter(i => !foldersRef.current.some(af => (af.imageIds || []).includes(i)));
      const newFolders = foldersRef.current.map(f =>
        f.id === dragOverFolderId
          ? { ...f, imageIds: [...(f.imageIds || []), ...dropItemIds.filter(i => !(f.imageIds || []).includes(i))], _ts: Date.now() }
          : f
      );
      foldersRef.current = newFolders;
      setFolders(newFolders);
      imagesRef.current = ni; postitsRef.current = np; drawingsRef.current = nd;
      setDragOverFolderId(null); setDragOutFolder(false); setDragActiveIds([]);
      setImages(ni); setPostits(np); setDrawings(nd); persist();
      multiDragRef.current = { active: false, anchorId: null, starts: {} };
      return;
    }
    setDragOverFolderId(null); setDragActiveIds([]);

    // Check if any dragged folder images were pulled outside their folder's bbox
    if (dragFolderBboxRef.current) {
      const { folderId, x1, y1, x2, y2 } = dragFolderBboxRef.current;
      const movedIds = md.active ? selIdsRef.current : [id];
      const folder = foldersRef.current.find(f => f.id === folderId);
      if (folder) {
        const leavingIds = movedIds.filter(mid => {
          if (!(folder.imageIds || []).includes(mid)) return false;
          const item = ni.find(i => i.id === mid) || np.find(p => p.id === mid);
          if (!item) return false;
          const cx = item.x + item.w / 2, cy = item.y + item.h / 2;
          return cx < x1 || cx > x2 || cy < y1 || cy > y2;
        });
        if (leavingIds.length > 0) {
          const newFolders = foldersRef.current
            .map(f => f.id === folderId ? { ...f, imageIds: (f.imageIds || []).filter(fid => !leavingIds.includes(fid)), _ts: Date.now() } : f)
            .filter(f => (f.imageIds || []).length > 0);
          foldersRef.current = newFolders;
          setFolders(newFolders);
        }
      }
      dragFolderBboxRef.current = null;
    }

    imagesRef.current = ni; postitsRef.current = np; drawingsRef.current = nd;
    setDragOutFolder(false); setDragActiveIds([]);
    setImages(ni); setPostits(np); setDrawings(nd); persist();
    if (md.active) multiDragRef.current = { active: false, anchorId: null, starts: {} };
  };

  // ── Folder handlers ───────────────────────────────────────────────────────────
  const createFolder = () => {
    const imgIds = selectedIds.filter(id => imagesRef.current.some(i => i.id === id));
    if (imgIds.length < 2) return;
    const fImgs = imagesRef.current.filter(i => imgIds.includes(i.id));
    const minX = Math.min(...fImgs.map(img => img.x));
    const minY = Math.min(...fImgs.map(img => img.y));
    pushHistory();
    // Remove selected images from any existing folders (allow regrouping)
    const preCleaned = foldersRef.current
      .map(f => ({ ...f, imageIds: (f.imageIds || []).filter(fid => !imgIds.includes(fid)) }))
      .filter(f => (f.imageIds || []).length > 0);
    const initSc = FOLDER_SCALES[FOLDER_SCALES.length - 1];
    // Position deck inside the auto-frame at top-left corner so it's contained from creation
    const framePad = 20, deckInner = 12;
    const frameX1 = Math.min(...fImgs.map(i => i.x)) - framePad;
    const frameY1 = Math.min(...fImgs.map(i => i.y)) - framePad;
    const newFolder = { id: genId(), imageIds: imgIds, x: Math.round(frameX1 + deckInner), y: Math.round(frameY1 + deckInner), scale: initSc, _ts: Date.now() };
    const newFolders = [...preCleaned, newFolder];
    foldersRef.current = newFolders;
    dirtyIds.current.add(newFolder.id);
    preCleaned.forEach(f => dirtyIds.current.add(f.id));
    setFolders(newFolders);
    setSelectedIds([]); setImageResizeIds([]);
    persist();
  };

  const handleFolderToggle = (folderId) => {
    const isOpening = !expandedFolderIds.has(folderId);

    // On CLOSE: sync folder.x/y to where the deck was showing (frame top-left + pad)
    // so the deck stays at the exact same position when collapsed
    if (!isOpening) {
      const folder = foldersRef.current.find(f => f.id === folderId);
      if (folder) {
        const members = folderMembersRef(folder);
        if (members.length) {
          const pad = 20, inner = 12;
          const fr = folder.frame;
          const syncX = Math.round((fr ? fr.x1 : Math.min(...members.map(i => i.x)) - pad) + inner);
          const syncY = Math.round((fr ? fr.y1 : Math.min(...members.map(i => i.y)) - pad) + inner);
          if (folder.x !== syncX || folder.y !== syncY) {
            const updated = foldersRef.current.map(f => f.id === folderId ? { ...f, x: syncX, y: syncY, _ts: Date.now() } : f);
            foldersRef.current = updated;
            dirtyIds.current.add(folderId);
            setFolders(updated);
            persist();
          }
        }
      }
    }

    setExpandedFolderIds(prev => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
    if (isOpening) {
      const folder = foldersRef.current.find(f => f.id === folderId);
      if (folder) {
        const members = folderMembersRef(folder);
        if (members.length) {
          const pad = 80;
          const x1 = Math.min(...members.map(i => i.x)) - pad;
          const y1 = Math.min(...members.map(i => i.y)) - pad;
          const x2 = Math.max(...members.map(i => i.x + i.w)) + pad;
          const y2 = Math.max(...members.map(i => i.y + i.h)) + pad;
          const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
          const newSc = Math.max(MIN_SCALE, Math.min(MAX_SCALE,
            Math.min(size.w / (x2 - x1), size.h / (y2 - y1)) * 0.85));
          setStageScale(newSc);
          setStagePos({ x: size.w / 2 - cx * newSc, y: size.h / 2 - cy * newSc });
        }
      }
    }
  };

  const handleFolderScale = (folderId) => {
    const folder = foldersRef.current.find(f => f.id === folderId);
    if (!folder) return;
    const cur = folder.scale || 1.0;
    const idx = FOLDER_SCALES.findIndex(s => Math.abs(s - cur) < 0.05);
    const next = FOLDER_SCALES[(idx + 1) % FOLDER_SCALES.length];
    const newFolders = foldersRef.current.map(f => f.id === folderId ? { ...f, scale: next, _ts: Date.now() } : f);
    foldersRef.current = newFolders;
    dirtyIds.current.add(folderId);
    setFolders(newFolders);
    persist();
  };

  const disbandFolder = (folderId) => {
    pushHistory();
    const newFolders = foldersRef.current.filter(f => f.id !== folderId);
    foldersRef.current = newFolders;
    localDeletes.current.add(folderId);
    dirtyIds.current.delete(folderId);
    setFolders(newFolders);
    setExpandedFolderIds(prev => { const n = new Set(prev); n.delete(folderId); return n; });
    setDisbandConfirmId(null);
    persist();
  };

  const updateFolderName = (folderId, name) => {
    const newFolders = foldersRef.current.map(f => f.id === folderId ? { ...f, name, _ts: Date.now() } : f);
    foldersRef.current = newFolders;
    dirtyIds.current.add(folderId);
    setFolders(newFolders);
    persist();
  };

  const handleFolderHoverEnter = (folderId) => {
    clearTimeout(folderHoverTimer.current);
    setHoveredFolderId(folderId);
  };
  const handleFolderHoverLeave = () => {
    folderHoverTimer.current = setTimeout(() => setHoveredFolderId(null), 120);
  };

  const handleFolderDragEnd = (e, folderId) => {
    const folder = foldersRef.current.find(f => f.id === folderId);
    if (!folder) return;
    const n = stageRef.current.findOne('#' + folderId);
    if (!n) return;

    const fsc = folder.scale || 1;
    const nx = n.x(), ny = n.y();
    const isExp = expandedFolderIds.has(folderId);

    // When expanded the Konva node sits at frame.x1+12, frame.y1+12 (not at folder.x/y)
    // so we must compute the actual pre-drag position to get the correct delta
    let initialX = folder.x, initialY = folder.y;
    if (isExp) {
      const members = folderMembersRef(folder);
      if (members.length) {
        const pad = 20, inner = 12, fr = folder.frame;
        initialX = (fr ? fr.x1 : Math.min(...members.map(i => i.x)) - pad) + inner;
        initialY = (fr ? fr.y1 : Math.min(...members.map(i => i.y)) - pad) + inner;
      }
    }
    const dx = nx - initialX, dy = ny - initialY;
    const newDeckX = folder.x + dx, newDeckY = folder.y + dy;

    // Collapsed-only: deck-to-deck collision
    if (!isExp) {
      const collides = foldersRef.current.some(f => {
        if (f.id === folderId) return false;
        const sc = f.scale || 1;
        return rectsIntersect(nx, ny, nx + FDECK_W * fsc, ny + FDECK_H * fsc,
                              f.x, f.y, f.x + FDECK_W * sc, f.y + FDECK_H * sc);
      });
      if (collides) {
        n.x(folder.x); n.y(folder.y);
        n.getLayer()?.batchDraw();
        return;
      }
    }

    // Prevent dropping a folder inside another folder's expanded frame
    const groupConflict = foldersRef.current.some(f => {
      if (f.id === folderId || !expandedFolderIds.has(f.id)) return false;
      const members = folderMembersRef(f);
      if (!members.length) return false;
      const pad = 20;
      const ox1 = f.frame ? f.frame.x1 : Math.min(...members.map(i => i.x)) - pad;
      const oy1 = f.frame ? f.frame.y1 : Math.min(...members.map(i => i.y)) - pad;
      const ox2 = f.frame ? f.frame.x2 : Math.max(...members.map(i => i.x + i.w)) + pad;
      const oy2 = f.frame ? f.frame.y2 : Math.max(...members.map(i => i.y + i.h)) + pad;
      return rectsIntersect(newDeckX, newDeckY, newDeckX + FDECK_W * fsc, newDeckY + FDECK_H * fsc, ox1, oy1, ox2, oy2);
    });
    if (groupConflict) {
      n.x(folder.x); n.y(folder.y);
      n.getLayer()?.batchDraw();
      setGroupInsideGroupError(true);
      clearTimeout(groupInsideGroupTimer.current);
      groupInsideGroupTimer.current = setTimeout(() => setGroupInsideGroupError(false), 3000);
      return;
    }
    const newFolders = foldersRef.current.map(f => {
      if (f.id !== folderId) return f;
      // Translate stored frame along with the deck so they stay in sync
      const newFrame = f.frame
        ? { x1: f.frame.x1 + dx, y1: f.frame.y1 + dy, x2: f.frame.x2 + dx, y2: f.frame.y2 + dy }
        : undefined;
      return { ...f, x: f.x + dx, y: f.y + dy, _ts: Date.now(), ...(newFrame !== undefined ? { frame: newFrame } : {}) };
    });
    const ids = folder.imageIds || [];
    const newImages  = imagesRef.current.map(img => ids.includes(img.id)  ? { ...img,  x: img.x  + dx, y: img.y  + dy } : img);
    const newPostits = postitsRef.current.map(p   => ids.includes(p.id)   ? { ...p,    x: p.x    + dx, y: p.y    + dy } : p);
    foldersRef.current  = newFolders;
    imagesRef.current   = newImages;
    postitsRef.current  = newPostits;
    dirtyIds.current.add(folderId);
    ids.forEach(id => dirtyIds.current.add(id));
    setFolders(newFolders); setImages(newImages); setPostits(newPostits);
    persist();
  };

  // ── Transform end ─────────────────────────────────────────────────────────────
  const handleTransformEnd = () => {
    pushHistory();
    const stage = stageRef.current, ids = selIdsRef.current;
    ids.forEach(id => dirtyIds.current.add(id));
    const ni = imagesRef.current.map(img => {
      const n = stage.findOne('#' + img.id);
      if (!n || !ids.includes(img.id)) return img;
      const nw = Math.max(20, Math.round(img.w * n.scaleX()));
      const nh = Math.max(20, Math.round(img.h * n.scaleY()));
      n.width(nw); n.height(nh); n.scaleX(1); n.scaleY(1);
      return { ...img, x: n.x(), y: n.y(), w: nw, h: nh };
    });
    const np = postitsRef.current.map(p => {
      const n = stage.findOne('#' + p.id);
      if (!n || !ids.includes(p.id)) return p;
      // Uniform scale — keep square
      const sc = (n.scaleX() + n.scaleY()) / 2;
      const size = Math.max(80, Math.round(p.w * sc));
      const nfs = Math.max(6, Math.round((p.fontSize || 13) * sc));
      n.scaleX(1); n.scaleY(1);
      return { ...p, x: n.x(), y: n.y(), w: size, h: size, fontSize: nfs };
    });
    imagesRef.current = ni; postitsRef.current = np;
    setImages(ni); setPostits(np);
    persist();
  };

  // ── Image context menu ─────────────────────────────────────────────────────────
  const handleImageCtx = (e, id) => {
    e.evt.preventDefault(); e.cancelBubble = true;
    setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, type: 'image', targetId: id });
  };

  const handleAction = (action, value) => {
    const tid = contextMenu?.targetId; setContextMenu(null);
    const imgs=imagesRef.current, drws=drawingsRef.current, psts=postitsRef.current;
    if (action==='upload')       { fileInputRef.current?.click(); return; }
    pushHistory();
    if (action==='bringToFront') { dirtyIds.current.add(tid); const mz=Math.max(0,...imgs.map(i=>i.zOrder||0)); const n=imgs.map(i=>i.id===tid?{...i,zOrder:mz+1}:i); imagesRef.current=n; setImages(n); persist(); return; }
    if (action==='sendToBack')   { dirtyIds.current.add(tid); const mz=Math.min(0,...imgs.map(i=>i.zOrder||0)); const n=imgs.map(i=>i.id===tid?{...i,zOrder:mz-1}:i); imagesRef.current=n; setImages(n); persist(); return; }
    if (action==='setStatus')    { dirtyIds.current.add(tid); const n=imgs.map(i=>i.id===tid?{...i,statusColor:value}:i); imagesRef.current=n; setImages(n); persist(); return; }
    if (action==='deleteImage')  { delete origSrcsRef.current[tid]; localDeletes.current.add(tid); dirtyIds.current.delete(tid); const n=imgs.filter(i=>i.id!==tid); imagesRef.current=n; setImages(n); persist(); return; }
  };

  // ── File processing ───────────────────────────────────────────────────────────
  const processFiles = useCallback(async (files, drop = null) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    pushHistory();

    // Phase 1: compress all images
    const n = imageFiles.length;
    const baseMz = imagesRef.current.length ? Math.max(...imagesRef.current.map(m => m.zOrder || 0)) : 0;
    const processed = [];
    for (let i = 0; i < n; i++) {
      const file = imageFiles[i];
      const dataUrl = await fileToDataUrl(file);
      const { lowSrc, medSrc, origWidth, origHeight } = await compressImage(dataUrl);
      const id = genId();
      origSrcsRef.current[id] = dataUrl;
      saveImageData(client.id, id, lowSrc, medSrc);
      const dw = Math.min(origWidth, n > 1 ? 220 : 320);
      const dh = Math.round((origHeight / origWidth) * dw);
      processed.push({ id, name: file.name, w: dw, h: dh, lowSrc, medSrc, origWidth, origHeight, statusColor: null, zOrder: baseMz + i + 1, uploadedAt: Date.now() });
    }

    // Phase 2: grid positions
    const GAP = 18;
    const baseX = drop ? drop.x : 100 + (imagesRef.current.length % 8) * 14;
    const baseY = drop ? drop.y : 100 + Math.floor(imagesRef.current.length / 8) * 14;

    if (n === 1) {
      processed[0].x = baseX;
      processed[0].y = baseY;
    } else {
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const colW = Array(cols).fill(0);
      const rowH = Array(rows).fill(0);
      processed.forEach((img, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        if (img.w > colW[c]) colW[c] = img.w;
        if (img.h > rowH[r]) rowH[r] = img.h;
      });
      const colX = colW.map((_, c) => colW.slice(0, c).reduce((s, v) => s + v + GAP, 0));
      const rowY = rowH.map((_, r) => rowH.slice(0, r).reduce((s, v) => s + v + GAP, 0));
      processed.forEach((img, i) => {
        img.x = baseX + colX[i % cols];
        img.y = baseY + rowY[Math.floor(i / cols)];
      });
    }

    processed.forEach(img => dirtyIds.current.add(img.id));
    const curr = [...imagesRef.current, ...processed];
    imagesRef.current = curr;
    setImages(curr); persist();
  }, [persist, pushHistory]);

  const handleFileInput = e => { processFiles(Array.from(e.target.files || [])); e.target.value = ''; };

  const handleDrop = useCallback(e => {
    e.preventDefault();
    const s = stageRef.current; if (!s) return;
    const r = s.container().getBoundingClientRect();
    processFiles(Array.from(e.dataTransfer.files), {
      x: (e.clientX - r.left - s.x()) / s.scaleX(),
      y: (e.clientY - r.top  - s.y()) / s.scaleY(),
    });
  }, [processFiles]);

  // ── Post-it confirm ───────────────────────────────────────────────────────────
  const confirmPostit = () => {
    if (!postitModal || !postitText.trim()) { setPostitModal(null); return; }
    pushHistory();
    const fontSize = 13;
    const { w, h } = measurePostitSize(postitText.trim(), fontSize);
    const np = { id: genId(), x: postitModal.x, y: postitModal.y, w, h, fontSize, text: postitText.trim(), color: userColor, createdBy: currentUser };
    const next = [...postitsRef.current, np];
    postitsRef.current = next;
    dirtyIds.current.add(np.id);
    setPostits(next); persist(); setPostitModal(null);
  };

  // ── Inline postit edit ────────────────────────────────────────────────────────
  const openPostitEdit = (p) => {
    const s = stageRef.current; if (!s) return;
    const scale = s.scaleX();
    const screenX = s.x() + p.x * scale;
    const screenY = s.y() + p.y * scale;
    setEditingPostit({ id: p.id, text: p.text, screenX, screenY, scaledW: p.w * scale, scaledH: p.h * scale, color: p.color || '#faff05', fontSize: (p.fontSize || 13) * scale });
  };

  const confirmPostitEdit = (newText) => {
    if (!editingPostit) return;
    const trimmed = newText.trim();
    if (trimmed) {
      pushHistory();
      dirtyIds.current.add(editingPostit.id);
      const next = postitsRef.current.map(p =>
        p.id === editingPostit.id ? { ...p, text: trimmed } : p
      );
      postitsRef.current = next;
      setPostits(next);
      persist();
    }
    setEditingPostit(null);
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  // Helper: all canvas items (images + postits) belonging to a folder
  const folderMembers = (folder, imgs, psts) => [
    ...(imgs || images).filter(i => (folder.imageIds || []).includes(i.id)),
    ...(psts || postits).filter(p => (folder.imageIds || []).includes(p.id)),
  ];
  const folderMembersRef = (folder) => [
    ...imagesRef.current.filter(i => (folder.imageIds || []).includes(i.id)),
    ...postitsRef.current.filter(p => (folder.imageIds || []).includes(p.id)),
  ];

  const sortedImages = [...images].sort((a, b) => (a.zOrder || 0) - (b.zOrder || 0));
  // collapsed folder member IDs — applies to both images AND postits
  const collapsedFolderImgIds = new Set(
    folders.filter(f => !expandedFolderIds.has(f.id)).flatMap(f => f.imageIds || [])
  );
  const visibleImages  = sortedImages.filter(img => !collapsedFolderImgIds.has(img.id));
  const visiblePostits = postits.filter(p => !collapsedFolderImgIds.has(p.id));
  const selectedImageIds = selectedIds.filter(id => images.some(img => img.id === id));
  const allInSameFolder = selectedImageIds.length >= 2 &&
    folders.some(f => selectedImageIds.every(id => (f.imageIds || []).includes(id)));
  const canGroupAsFolder = selectedImageIds.length >= 2 && !allInSameFolder;
  const hoveredImg   = images.find(i => i.id === hoveredId);
  const allImagesSelected = selectedIds.length > 0 && selectedIds.every(id => images.some(i => i.id === id));

  // Image to show expand button for (hovered takes priority)
  const expandImg = (hoveredId && images.find(i => i.id === hoveredId))
    || (selectedIds.length === 1 && images.find(i => i.id === selectedIds[0]))
    || null;

  // Scrollbar indicator math
  const VIRT = 7000, VIRT_C = 2500;
  const vpX = -stagePos.x / stageScale + VIRT_C, vpY = -stagePos.y / stageScale + VIRT_C;
  const vpW = size.w / Math.max(stageScale, 0.01), vpH = size.h / Math.max(stageScale, 0.01);
  const hPos = Math.max(0, Math.min(88, vpX / VIRT * 100)), hSize = Math.max(8, Math.min(30, vpW / VIRT * 100));
  const vPos = Math.max(0, Math.min(88, vpY / VIRT * 100)), vSize = Math.max(8, Math.min(30, vpH / VIRT * 100));

  const cursorStyle = isPanning ? 'grabbing' : activeTool === 'pencil' ? 'crosshair' : activeTool === 'postit' ? 'cell' : 'default';

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#080808' }}>
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '26px 26px' }} />

      {/* Loading overlay — sits on top until Firebase fires; canvas div is always mounted so ResizeObserver works */}
      {!loaded && (
        <div className="absolute inset-0 z-[300] flex flex-col items-center justify-center gap-3" style={{ background: '#080808' }}>
            <div className="w-7 h-7 rounded-full border-2 border-zinc-800 border-t-[#faff05]"
            style={{ animation: 'spin 0.75s linear infinite' }} />
          <p className="text-zinc-600 text-sm">{client.name}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-5 left-5 z-50 flex items-center gap-3">
        {onGallery && (
          <button onClick={onGallery} title="Ver galería"
            className="undo-btn flex items-center justify-center w-8 h-8 rounded-full transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        )}
        <button onClick={undo} title="Deshacer (Ctrl+Z)"
          className="undo-btn flex items-center justify-center w-8 h-8 rounded-full transition-all"
          style={canUndo ? {} : { opacity: 0.2, pointerEvents: 'none' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button title="Historial de versiones"
          className="undo-btn flex items-center justify-center w-8 h-8 rounded-full transition-all"
          onClick={() => { setShowBackups(true); loadBackups(); }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <div className="flex items-baseline gap-2 pointer-events-none">
          <span className="text-white font-bold text-lg">{client.name}</span>
          <span className="text-zinc-500 text-sm font-normal">board</span>
          <span className="text-[10px] font-mono rounded px-1.5 py-0.5 font-bold" style={{ background: userColor, color: '#000' }}>{currentUser}</span>
        </div>
      </div>

      <style>{`
        .undo-btn { background: #0a0a0a; border: 1.5px solid #222; color: #71717a; }
        .undo-btn:hover { color: #faff05; border-color: #333; background: #0d0d0d; }
        .undo-btn:active { color: #000; background: #faff05; border-color: #faff05; }
      `}</style>

      {/* Backup history modal */}
      {showBackups && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowBackups(false); }}>
          <div className="relative w-[420px] max-h-[540px] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: '#0d0d0d', border: '1px solid #222' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
              <div>
                <p className="text-white font-semibold text-sm">Historial de versiones</p>
                <p className="text-zinc-500 text-xs mt-0.5">Hasta 25 versiones guardadas automáticamente</p>
              </div>
              <button onClick={() => setShowBackups(false)}
                className="text-zinc-600 hover:text-white transition-colors text-lg leading-none">✕</button>
            </div>
            {/* Backup list */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#1a1a1a]">
              {loadingBkps && (
                <div className="flex items-center justify-center py-10 text-zinc-500 text-sm">Cargando...</div>
              )}
              {!loadingBkps && backupsList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <p className="text-zinc-500 text-sm">Todavía no hay versiones guardadas.</p>
                  <p className="text-zinc-600 text-xs">Se guardan automáticamente mientras trabajás.</p>
                </div>
              )}
              {!loadingBkps && backupsList.map((bkp, i) => (
                <div key={bkp.savedAt}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.04] transition-colors">
                  <div>
                    <p className="text-white text-sm">{timeAgo(bkp.savedAt)}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {bkp.imageCount ?? 0} {(bkp.imageCount ?? 0) === 1 ? 'imagen' : 'imágenes'}
                      {(bkp.folderCount ?? 0) > 0 && ` · ${bkp.folderCount} carpetas`}
                      {i === 0 && <span className="ml-2 text-[#faff05]">· más reciente</span>}
                    </p>
                  </div>
                  <button
                    disabled={restoringBkp === bkp.savedAt}
                    onClick={() => {
                      if (window.confirm(`¿Restaurar la versión de ${timeAgo(bkp.savedAt)}? El estado actual se perderá.`)) {
                        restoreBackup(bkp);
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: restoringBkp === bkp.savedAt ? '#333' : '#1a1a1a', color: restoringBkp === bkp.savedAt ? '#555' : '#faff05', border: '1px solid #2a2a2a' }}>
                    {restoringBkp === bkp.savedAt ? 'Restaurando…' : 'Restaurar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stage */}
      <div ref={containerRef} className="absolute inset-0" style={{ cursor: cursorStyle }}
        onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
        {size.w > 0 && size.h > 0 && (
          <Stage ref={stageRef} width={size.w} height={size.h}
            scaleX={stageScale} scaleY={stageScale} x={stagePos.x} y={stagePos.y}
            onWheel={handleWheel}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onContextMenu={handleStageContextMenu}>
            <Layer>
              {/* Expanded folder bounding boxes — interactive, resizable */}
              {folders.filter(f => expandedFolderIds.has(f.id)).map(folder => {
                const fImgs   = images.filter(img => (folder.imageIds || []).includes(img.id));
                const fPsts   = postits.filter(p  => (folder.imageIds || []).includes(p.id));
                const fAll    = [...fImgs, ...fPsts];
                if (!fAll.length) return null;
                const pad = 20;
                const autoX1 = Math.min(...fAll.map(i => i.x)) - pad;
                const autoY1 = Math.min(...fAll.map(i => i.y)) - pad;
                const autoX2 = Math.max(...fAll.map(i => i.x + i.w)) + pad;
                const autoY2 = Math.max(...fAll.map(i => i.y + i.h)) + pad;
                const fr = folder.frame;
                const x1 = fr ? fr.x1 : autoX1, y1 = fr ? fr.y1 : autoY1;
                const x2 = fr ? fr.x2 : autoX2, y2 = fr ? fr.y2 : autoY2;
                const isSelFrame = selectedFrameId === folder.id;
                const hw = 10 / stageScale; // handle size in canvas units
                const corners = [
                  { key:'tl', cx: x1, cy: y1, cursor:'nwse-resize' },
                  { key:'tr', cx: x2, cy: y1, cursor:'nesw-resize' },
                  { key:'bl', cx: x1, cy: y2, cursor:'nesw-resize' },
                  { key:'br', cx: x2, cy: y2, cursor:'nwse-resize' },
                ];
                return (
                  <Group key={'frame-g-' + folder.id}>
                    <Rect
                      id={'frame-' + folder.id}
                      x={x1} y={y1} width={x2 - x1} height={y2 - y1}
                      fill="rgba(255,255,255,0.05)"
                      stroke={isSelFrame ? '#faff05' : '#404040'}
                      strokeWidth={(isSelFrame ? 2 : 1.5) / stageScale}
                      cornerRadius={16 / stageScale}
                      dash={isSelFrame ? [] : [8 / stageScale, 5 / stageScale]}
                      onClick={e => { e.cancelBubble = true; setSelectedFrameId(isSelFrame ? null : folder.id); }}
                    />
                    {isSelFrame && corners.map(({ key, cx, cy }) => (
                      <Rect
                        key={key}
                        x={cx - hw / 2} y={cy - hw / 2}
                        width={hw} height={hw}
                        fill="#faff05" stroke="#000" strokeWidth={1 / stageScale}
                        cornerRadius={2 / stageScale}
                        draggable
                        onDragMove={ev => {
                          const nx = ev.target.x() + hw / 2;
                          const ny = ev.target.y() + hw / 2;
                          const cur = foldersRef.current.find(f => f.id === folder.id);
                          const cf = cur?.frame || { x1: autoX1, y1: autoY1, x2: autoX2, y2: autoY2 };
                          // Minimum frame must contain all member images AND the deck (at top-left inside)
                          const pad = 20, deckInner = 12;
                          const fsc2 = folder.scale || 1;
                          const deckFootX2 = cf.x1 + deckInner + FDECK_W * fsc2 + deckInner;
                          const deckFootY2 = cf.y1 + deckInner + FDECK_H * fsc2 + deckInner;
                          const minX1 = Math.min(...fAll.map(i => i.x)) - pad;
                          const minY1 = Math.min(...fAll.map(i => i.y)) - pad;
                          const minX2 = Math.max(Math.max(...fAll.map(i => i.x + i.w)) + pad, deckFootX2);
                          const minY2 = Math.max(Math.max(...fAll.map(i => i.y + i.h)) + pad, deckFootY2);
                          let nx1 = key.includes('l') ? Math.min(nx, cf.x2 - 40) : cf.x1;
                          let ny1 = key.includes('t') ? Math.min(ny, cf.y2 - 40) : cf.y1;
                          let nx2 = key.includes('r') ? Math.max(nx, cf.x1 + 40) : cf.x2;
                          let ny2 = key.includes('b') ? Math.max(ny, cf.y1 + 40) : cf.y2;
                          const blocked = nx1 > minX1 || ny1 > minY1 || nx2 < minX2 || ny2 < minY2;
                          if (blocked) {
                            nx1 = Math.min(nx1, minX1);
                            ny1 = Math.min(ny1, minY1);
                            nx2 = Math.max(nx2, minX2);
                            ny2 = Math.max(ny2, minY2);
                            setFrameResizeBlocked(true);
                            clearTimeout(frameResizeBlockTimer.current);
                            frameResizeBlockTimer.current = setTimeout(() => setFrameResizeBlocked(false), 2000);
                          }
                          const nf = { x1: nx1, y1: ny1, x2: nx2, y2: ny2 };
                          const updated = foldersRef.current.map(f => f.id === folder.id ? { ...f, frame: nf, _ts: Date.now() } : f);
                          foldersRef.current = updated;
                          setFolders([...updated]);
                        }}
                        onDragEnd={() => persist()}
                      />
                    ))}
                  </Group>
                );
              })}

              {/* "Integrar al grupo" — shown on ALL target folders while dragging free images */}
              {/* Images already in a group can't be integrated elsewhere — must leave first */}
              {(() => {
                if (!dragActiveIds.length) return null;
                const freeIds = dragActiveIds.filter(aid => !foldersRef.current.some(f => (f.imageIds || []).includes(aid)));
                if (!freeIds.length) return null;
                return folders
                  .filter(f => freeIds.some(aid => !(f.imageIds || []).includes(aid)))
                  .map(folder => {
                    const isTarget = folder.id === dragOverFolderId;
                    if (expandedFolderIds.has(folder.id)) {
                      const fMembers = folderMembers(folder);
                      if (!fMembers.length) return null;
                      const pad = 20, fx = folder.frame;
                      const x1 = fx ? fx.x1 : Math.min(...fMembers.map(i => i.x)) - pad;
                      const y1 = fx ? fx.y1 : Math.min(...fMembers.map(i => i.y)) - pad;
                      const x2 = fx ? fx.x2 : Math.max(...fMembers.map(i => i.x + i.w)) + pad;
                      const y2 = fx ? fx.y2 : Math.max(...fMembers.map(i => i.y + i.h)) + pad;
                      const w = x2 - x1, h = y2 - y1;
                      const fsz = Math.max(12, Math.min(22, Math.round(h / 6)));
                      const label = `Integrar al grupo${folder.name ? '\n' + folder.name : ''}`;
                      return (
                        <Group key={'int-exp-' + folder.id} listening={false}>
                          <Rect x={x1} y={y1} width={w} height={h}
                            fill={isTarget ? 'rgba(250,255,5,0.22)' : 'rgba(250,255,5,0.10)'}
                            stroke="#faff05" strokeWidth={(isTarget ? 3 : 2) / stageScale}
                            cornerRadius={16 / stageScale} />
                          <KonvaText text={label} fill="#faff05" fontSize={fsz}
                            fontFamily="Inter, sans-serif" fontStyle="bold"
                            x={x1} y={y1 + h / 2 - fsz} width={w} align="center"
                            lineHeight={1.3} listening={false} />
                        </Group>
                      );
                    } else {
                      const fsc = folder.scale || 1;
                      const w = FDECK_W * fsc, h = FDECK_H * fsc;
                      const fsz = Math.max(9, Math.round(11 * fsc));
                      const label = `Integrar al grupo${folder.name ? '\n' + folder.name : ''}`;
                      return (
                        <Group key={'int-col-' + folder.id} x={folder.x} y={folder.y} listening={false}>
                          <Rect width={w} height={h}
                            fill={isTarget ? 'rgba(250,255,5,0.28)' : 'rgba(250,255,5,0.14)'}
                            stroke="#faff05" strokeWidth={(isTarget ? 3 : 2) / stageScale}
                            cornerRadius={8 / stageScale} />
                          <KonvaText text={label} fill="#faff05" fontSize={fsz}
                            fontFamily="Inter, sans-serif" fontStyle="bold"
                            width={w} align="center" y={h / 2 - fsz}
                            lineHeight={1.3} listening={false} />
                        </Group>
                      );
                    }
                  });
              })()}

              {/* Hover preview frame — shows where images will expand to */}
              {folders.filter(f => !expandedFolderIds.has(f.id) && hoveredFolderId === f.id).map(folder => {
                const fAll = folderMembers(folder);
                if (!fAll.length) return null;
                const pad = 20;
                const aX1 = Math.min(...fAll.map(i => i.x)) - pad;
                const aY1 = Math.min(...fAll.map(i => i.y)) - pad;
                const aX2 = Math.max(...fAll.map(i => i.x + i.w)) + pad;
                const aY2 = Math.max(...fAll.map(i => i.y + i.h)) + pad;
                // Use stored custom frame if available so the preview matches reality
                const x1 = folder.frame ? folder.frame.x1 : aX1;
                const y1 = folder.frame ? folder.frame.y1 : aY1;
                const x2 = folder.frame ? folder.frame.x2 : aX2;
                const y2 = folder.frame ? folder.frame.y2 : aY2;
                return (
                  <Rect key={'hover-bbox-' + folder.id}
                    x={x1} y={y1} width={x2 - x1} height={y2 - y1}
                    fill="rgba(250,255,5,0.04)" stroke="#faff05" strokeWidth={2 / stageScale}
                    cornerRadius={16} dash={[8 / stageScale, 5 / stageScale]} listening={false} />
                );
              })}

              {visibleImages.map(img => (
                <CanvasImage key={img.id} item={img}
                  isSelected={selectedIds.includes(img.id)}
                  isResizing={imageResizeIds.includes(img.id) || selectedIds.length > 1}
                  origSrc={origSrcsRef.current[img.id]}
                  activeTool={activeTool}
                  onSelect={e => handleImageSelect(e, img.id)}
                  onDblClick={e => handleImageDblClick(e, img.id)}
                  onDragStart={e => handleDragStart(e, img.id)}
                  onDragMove={e  => handleDragMove(e, img.id)}
                  onDragEnd={e   => handleDragEnd(e, img.id)}
                  onContextMenu={e => handleImageCtx(e, img.id)}
                  onEnter={() => setHoveredId(img.id)}
                  onLeave={() => setHoveredId(null)} />
              ))}

              {visiblePostits.map(p => (
                <Group key={p.id} id={p.id} x={p.x} y={p.y}
                  draggable={activeTool === 'pointer'}
                  onClick={e => {
                    const now = Date.now();
                    const prev = postitLastClickRef.current[p.id] || 0;
                    if (now - prev < 400) {
                      // Two rapid clicks = open inline editor
                      e.cancelBubble = true;
                      postitLastClickRef.current[p.id] = 0;
                      openPostitEdit(p);
                    } else {
                      postitLastClickRef.current[p.id] = now;
                      handleSelect(e, p.id);
                    }
                  }}
                  onDragStart={e => handleDragStart(e, p.id)}
                  onDragMove={e  => handleDragMove(e, p.id)}
                  onDragEnd={e   => handleDragEnd(e, p.id)}>
                  <Rect x={0} y={0} width={p.w} height={p.h}
                    fill="transparent" stroke={p.createdBy ? getUserColor(p.createdBy) : (p.color || '#faff05')} strokeWidth={1.5} cornerRadius={8} />
                  <KonvaText x={12} y={12} width={p.w - 24}
                    text={p.text} fontSize={p.fontSize || 13} fontFamily="Inter, sans-serif"
                    fill={p.createdBy ? getUserColor(p.createdBy) : (p.color || '#faff05')} wrap="word" listening={false} />
                </Group>
              ))}

              {drawings.map(d => (
                <Line key={d.id} id={d.id} x={d.x || 0} y={d.y || 0}
                  points={d.points}
                  stroke={selectedIds.includes(d.id) ? userColor : d.color}
                  strokeWidth={d.strokeWidth}
                  tension={0.4} lineCap="round" lineJoin="round"
                  hitStrokeWidth={16}
                  draggable={activeTool === 'pointer'}
                  onClick={e => handleSelect(e, d.id)}
                  onDragStart={e => handleDragStart(e, d.id)}
                  onDragMove={e  => handleDragMove(e, d.id)}
                  onDragEnd={e   => handleDragEnd(e, d.id)} />
              ))}

              {isDrawing && livePoints.length > 2 && (
                <Line points={livePoints} stroke={userColor} strokeWidth={strokeSize}
                  tension={0.4} lineCap="round" lineJoin="round" listening={false} />
              )}

              {selBox && (
                <Rect
                  x={Math.min(selBox.x1,selBox.x2)} y={Math.min(selBox.y1,selBox.y2)}
                  width={Math.abs(selBox.x2-selBox.x1)} height={Math.abs(selBox.y2-selBox.y1)}
                  fill="rgba(250,255,5,0.04)" stroke="#faff05"
                  strokeWidth={1/stageScale} dash={[5/stageScale,4/stageScale]}
                  listening={false} />
              )}

              {folders.map(folder => {
                const isExp = expandedFolderIds.has(folder.id);
                let bboxX1 = null, bboxY1 = null;
                if (isExp) {
                  const fAll = folderMembers(folder);
                  if (fAll.length) {
                    const pad = 20;
                    bboxX1 = folder.frame ? folder.frame.x1 : Math.min(...fAll.map(i => i.x)) - pad;
                    bboxY1 = folder.frame ? folder.frame.y1 : Math.min(...fAll.map(i => i.y)) - pad;
                  }
                }
                return (
                  <CanvasFolder key={folder.id} folder={folder}
                    allImages={images} isExpanded={isExp}
                    activeTool={activeTool}
                    bboxX1={bboxX1} bboxY1={bboxY1}
                    onToggle={() => handleFolderToggle(folder.id)}
                    onScale={() => handleFolderScale(folder.id)}
                    onDisband={() => setDisbandConfirmId(folder.id)}
                    onEnter={() => handleFolderHoverEnter(folder.id)}
                    onLeave={handleFolderHoverLeave}
                    onNameClick={() => setEditingFolderNameId(folder.id)}
                    onDragStart={e => { if (isPanningRef.current) { e.target.stopDrag(); return; } }}
                    onDragEnd={e => handleFolderDragEnd(e, folder.id)} />
                );
              })}

              <Transformer ref={trRef}
                onTransformEnd={handleTransformEnd}
                keepRatio={allImagesSelected}
                rotateEnabled={false}
                // Only corner anchors
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                anchorSize={10} anchorCornerRadius={3}
                anchorStroke="#faff05" anchorFill="#faff05"
                borderStroke="#faff05" borderDash={[4, 3]} />
            </Layer>
          </Stage>
        )}
      </div>

      {/* Group inside group — can't drop a folder inside another folder */}
      {groupInsideGroupError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(153,27,27,0.92)', color: '#fca5a5', border: '1.5px solid #ef4444', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(220,38,38,0.3)', whiteSpace: 'nowrap' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          No se puede agregar un grupo dentro de otro grupo
        </div>
      )}

      {/* Frame resize blocked — can't shrink past images inside */}
      {frameResizeBlocked && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(153,27,27,0.92)', color: '#fca5a5', border: '1.5px solid #ef4444', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(220,38,38,0.3)', whiteSpace: 'nowrap' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          No se puede achicar el grupo dejando imágenes por fuera del mismo
        </div>
      )}

      {/* Expand button (HTML overlay, appears on selected/hovered image) */}
      {expandImg && (() => {
        const sx = expandImg.x * stageScale + stagePos.x;
        const sy = expandImg.y * stageScale + stagePos.y;
        const sw = expandImg.w * stageScale;
        return (
          <button
            className="absolute flex items-center justify-center w-7 h-7 rounded-lg text-black transition-all hover:scale-110 z-50"
            style={{ left: sx + sw - 30, top: sy + 4, background: '#faff05' }}
            onMouseEnter={() => setHoveredId(expandImg.id)}
            onClick={() => setFullscreenImg(expandImg)}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        );
      })()}

      {/* Tooltip */}
      {hoveredImg && !isDrawing && !isPanning && (
        <div className="absolute pointer-events-none px-2.5 py-1 rounded-lg text-xs text-zinc-300 border border-[#2a2a2a]"
          style={{ left: mousePos.x + 16, top: mousePos.y - 34, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(8px)', zIndex: 200 }}>
          {hoveredImg.origWidth} × {hoveredImg.origHeight} px
        </div>
      )}

      {/* Scrollbars */}
      {showScrollbars && (<>
        <div className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none z-40"
          style={{ background: 'rgba(255,255,255,0.04)', opacity: isPanning ? 1 : 0.4, transition: 'opacity 0.5s' }}>
          <div className="absolute h-full rounded-full" style={{ left: `${hPos}%`, width: `${hSize}%`, background: 'rgba(255,255,255,0.3)' }} />
        </div>
        <div className="absolute top-0 bottom-0 right-0 w-[3px] pointer-events-none z-40"
          style={{ background: 'rgba(255,255,255,0.04)', opacity: isPanning ? 1 : 0.4, transition: 'opacity 0.5s' }}>
          <div className="absolute w-full rounded-full" style={{ top: `${vPos}%`, height: `${vSize}%`, background: 'rgba(255,255,255,0.3)' }} />
        </div>
      </>)}

      {/* "Sacar del grupo" — full-canvas red overlay when dragging folder member outside its bbox */}
      {dragOutFolder && (
        <div className="absolute inset-0 pointer-events-none z-[15] flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(185,28,28,0.18)' }} />
          <div className="relative flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base"
            style={{ background: 'rgba(153,27,27,0.92)', color: '#fca5a5', border: '2px solid #ef4444', backdropFilter: 'blur(6px)', boxShadow: '0 8px 32px rgba(220,38,38,0.35)' }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sacar del grupo
          </div>
        </div>
      )}

      {/* Folder name editor — bottom bar, same style as toolbar */}
      {editingFolderNameId && (() => {
        const ef = folders.find(f => f.id === editingFolderNameId);
        if (!ef) return null;
        return (
          <div key={editingFolderNameId}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-2xl border border-[#2a2a2a] shadow-2xl z-[200]"
            style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)' }}>
            <span className="text-zinc-500 text-xs whitespace-nowrap">Nombre de carpeta</span>
            <div className="w-px h-4 bg-[#2a2a2a]" />
            <input
              autoFocus
              defaultValue={ef.name || ''}
              onBlur={e  => { updateFolderName(editingFolderNameId, e.target.value); setEditingFolderNameId(null); }}
              onKeyDown={e => {
                if (e.key === 'Enter')  { updateFolderName(editingFolderNameId, e.target.value); setEditingFolderNameId(null); }
                if (e.key === 'Escape') { setEditingFolderNameId(null); }
              }}
              placeholder="Agregar nombre..."
              className="bg-transparent outline-none text-white text-xs w-36"
              style={{ fontFamily: 'Inter, sans-serif' }} />
            <button onClick={() => setEditingFolderNameId(null)}
              className="text-zinc-600 hover:text-white text-xs transition-colors leading-none">✕</button>
          </div>
        );
      })()}

      {/* Disband confirmation modal */}
      {disbandConfirmId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-80 shadow-2xl">
            <p className="text-white text-sm font-semibold mb-2">¿Desarmar el grupo?</p>
            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
              Las imágenes quedarán sueltas en el canvas sin pertenecer a ningún grupo hasta que las vuelvas a reagrupar.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDisbandConfirmId(null)}
                className="px-4 py-2 rounded-xl text-zinc-500 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={() => disbandFolder(disbandConfirmId)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#dc2626' }}>
                Desarmar
              </button>
            </div>
          </div>
        </div>
      )}

      {canGroupAsFolder && (
        <button onClick={createFolder}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-black z-50 transition-all hover:scale-105 active:scale-95"
          style={{ background: '#faff05', boxShadow: '0 4px 20px rgba(250,255,5,0.3)' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          Agrupar en carpeta
        </button>
      )}

      <ToolBar activeTool={activeTool} setActiveTool={setActiveTool}
        userColor={userColor} strokeSize={strokeSize} setStrokeSize={setStrokeSize} />
      <Minimap images={images} postits={postits} folders={folders} expandedFolderIds={expandedFolderIds}
        stageScale={stageScale} stagePos={stagePos}
        setStagePos={setStagePos} viewW={size.w} viewH={size.h} />

      {contextMenu && <ContextMenu menu={contextMenu} onAction={handleAction} onClose={() => setContextMenu(null)} />}

      {postitModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPostitModal(null)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-white text-sm font-semibold mb-3">Nuevo Post-it</p>
            <textarea autoFocus value={postitText}
              onChange={e => setPostitText(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter'&&(e.metaKey||e.ctrlKey)) confirmPostit(); if(e.key==='Escape') setPostitModal(null); }}
              className="w-full h-24 bg-black border border-[#333] rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-[#faff05] placeholder-zinc-700 transition-colors"
              placeholder="Escribe tu nota... (⌘↵ para guardar)" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setPostitModal(null)} className="px-4 py-2 rounded-xl text-zinc-500 text-sm hover:text-white transition-colors">Cancelar</button>
              <button onClick={confirmPostit} className="px-4 py-2 rounded-xl text-sm font-semibold text-black hover:opacity-90" style={{ background: userColor }}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline postit editor — rendered as an HTML textarea over the canvas */}
      {editingPostit && (
        <div className="absolute inset-0 z-50" onClick={() => confirmPostitEdit(editingPostit.text)}>
          <textarea
            autoFocus
            value={editingPostit.text}
            onClick={e => e.stopPropagation()}
            onChange={e => setEditingPostit(ep => ({ ...ep, text: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); confirmPostitEdit(editingPostit.text); }
              if (e.key === 'Escape') setEditingPostit(null);
            }}
            onBlur={() => confirmPostitEdit(editingPostit.text)}
            style={{
              position: 'absolute',
              left: editingPostit.screenX,
              top: editingPostit.screenY,
              width: editingPostit.scaledW,
              height: editingPostit.scaledH,
              background: '#0c0c0c',
              border: `1.5px solid ${editingPostit.color}`,
              borderRadius: 8,
              padding: '12px',
              color: editingPostit.color,
              fontSize: editingPostit.fontSize,
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
              overflow: 'auto',
              boxShadow: `0 0 0 2px ${editingPostit.color}33`,
              zIndex: 60,
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {fullscreenImg && (
        <FullscreenModal
          img={fullscreenImg}
          origSrc={origSrcsRef.current[fullscreenImg.id]}
          onClose={() => setFullscreenImg(null)} />
      )}

      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />
    </div>
  );
}

// ── Boards Module ─────────────────────────────────────────────────────────────────
export default function BoardsModule() {
  const { clients, currentUser } = useApp();
  const [selected, setSelected] = useState(null);
  const [view, setView]         = useState('gallery'); // 'gallery' | 'canvas'

  const openClient = (client) => { setSelected(client); setView('gallery'); };

  if (selected && view === 'canvas') {
    return (
      <BoardCanvas
        client={selected}
        currentUser={currentUser}
        onBack={() => setSelected(null)}
        onGallery={() => setView('gallery')}
      />
    );
  }

  if (selected && view === 'gallery') {
    return (
      <BoardGallery
        client={selected}
        onBack={() => setSelected(null)}
        onEnterBoard={() => setView('canvas')}
      />
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="p-6 sm:p-8">
        <h1 className="text-white text-2xl font-bold mb-1">Boards</h1>
        <p className="text-zinc-600 text-sm mb-8">Referencias visuales por cliente</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {clients.map(client => (
            <button key={client.id} onClick={() => openClient(client)}
              className="group aspect-square rounded-2xl flex flex-col items-center justify-center p-5 transition-all duration-200 hover:scale-[1.03]"
              style={{ background: client.color + '12', border: `1.5px solid ${client.color}28` }}>
              <div className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center text-xl font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                style={{ background: client.color, color: '#000' }}>
                {client.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-white text-sm font-medium text-center leading-tight line-clamp-2">{client.name}</span>
              {client.isInternal && <span className="mt-1.5 text-[10px] text-zinc-600">Interno</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
