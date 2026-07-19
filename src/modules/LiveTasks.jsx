import React, { useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';

const STEP_META = [
  { num: 1, title: 'Reference Ad',  sub: 'Visual reference' },
  { num: 2, title: 'Copy Idea',     sub: 'Team copy idea' },
  { num: 3, title: 'Feedback',      sub: 'Approval' },
  { num: 4, title: 'Finished Ad',   sub: 'Final piece' },
];

const TRAFFIC = [
  { id: 'green',  color: '#34d399', label: 'OK' },
  { id: 'yellow', color: '#faff05', label: 'Changes' },
  { id: 'red',    color: '#f87171', label: 'Review' },
];

const PERF_RATING = [
  { id: 'up',      color: '#34d399', icon: '↑' },
  { id: 'neutral', color: '#faff05', icon: '−' },
  { id: 'down',    color: '#f87171', icon: '↓' },
];

const STEP4_ASSIGN = [
  { id: 'kann', color: '#faff05', label: 'K' },
  { id: 'jero', color: '#60a5fa', label: 'J' },
  { id: 'facu', color: '#a78bfa', label: 'F' },
];

function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Compress image client-side and return base64 data URL — no Firebase Storage needed
function compressImage(file, maxPx = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Image with loading skeleton ───────────────────────────────────────────────
function ImageCell({ src }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="w-full aspect-square bg-black rounded-lg overflow-hidden relative">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-zinc-800 border-t-zinc-500 animate-spin" />
          <span className="text-[10px] text-zinc-600 tracking-wide">Loading image...</span>
        </div>
      )}
      <img
        src={src}
        alt=""
        className={`w-full h-full object-contain transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        draggable={false}
      />
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ url, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <img src={url} alt="" className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} draggable={false} />
    </div>
  );
}

// ── Step card — inline editing, no modal ──────────────────────────────────────
function StepCard({ stepNum, stepData, pipelineId, currentUser, loaded, onUpdate, onLightbox, feedbackPerson, readOnly = false, transparentText = false }) {
  const [uploading,     setUploading]     = useState(false);
  const [uploadErr,     setUploadErr]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [textOnAd,      setTextOnAd]      = useState(stepData?.textOnAd      || '');
  const [primaryText,   setPrimaryText]   = useState(stepData?.primaryText   || '');
  const [headlineCta,   setHeadlineCta]   = useState(stepData?.headlineCta   || '');
  const [trafficLight,  setTrafficLight]  = useState(stepData?.trafficLight  || null);
  const [perfRating,    setPerfRating]    = useState(stepData?.perfRating    || null);
  const [step4Assignee, setStep4Assignee] = useState(stepData?.assignee     || null);
  const [step4Finished, setStep4Finished] = useState(stepData?.finished     || false);
  const [editingFP,     setEditingFP]     = useState(false);
  const [fpVal,         setFpVal]         = useState(feedbackPerson || 'Wayne');
  const [expandedField, setExpandedField] = useState(null);
  const cardBodyRef = useRef(null);

  // Non-passive wheel listener so textareas don't swallow scroll when at their limits
  React.useEffect(() => {
    const div = cardBodyRef.current;
    if (!div) return;
    const onWheel = (e) => {
      const ta = e.target.closest?.('textarea');
      if (!ta) return;
      const atTop    = ta.scrollTop === 0 && e.deltaY < 0;
      const atBottom = ta.scrollTop + ta.clientHeight >= ta.scrollHeight - 1 && e.deltaY > 0;
      if (!atTop && !atBottom) return;
      e.preventDefault();
      let p = div.parentElement;
      while (p) {
        const oy = window.getComputedStyle(p).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) {
          p.scrollBy(0, e.deltaY); return;
        }
        p = p.parentElement;
      }
      window.scrollBy(0, e.deltaY);
    };
    div.addEventListener('wheel', onWheel, { passive: false });
    return () => div.removeEventListener('wheel', onWheel);
  }, []);
  const timerRef   = useRef(null);
  const isTypingRef = useRef(false); // true while debounce is pending — blocks incoming Firebase overwrites
  // ref so debounced callbacks always see latest values
  const valsRef  = useRef({ textOnAd, primaryText, headlineCta, trafficLight });
  valsRef.current = { textOnAd, primaryText, headlineCta, trafficLight };

  // Sync text state when Firebase delivers data (e.g. on first load or real-time update from another user).
  // Skipped while the user is actively typing so we never overwrite in-progress edits.
  React.useEffect(() => {
    if (!isTypingRef.current) {
      setTextOnAd(stepData?.textOnAd      || '');
      setPrimaryText(stepData?.primaryText  || '');
      setHeadlineCta(stepData?.headlineCta  || '');
      setTrafficLight(stepData?.trafficLight || null);
      setPerfRating(stepData?.perfRating    || null);
      setStep4Assignee(stepData?.assignee   || null);
      setStep4Finished(stepData?.finished   || false);
    }
  }, [stepData]);

  React.useEffect(() => { if (!editingFP) setFpVal(feedbackPerson || 'Wayne'); }, [feedbackPerson, editingFP]);

  const meta   = STEP_META[stepNum - 1];
  const isImg  = stepNum === 1 || stepNum === 4;
  const hasImg = isImg && stepData?.imageUrl;

  const debounce = (fn, ms = 600) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, ms);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadErr(null);
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      const extra = stepNum === 1 ? { perfRating: stepData?.perfRating || null }
                  : stepNum === 4 ? { assignee: stepData?.assignee || null }
                  : {};
      onUpdate(`step${stepNum}`, { imageUrl: dataUrl, uploadedBy: currentUser, uploadedAt: new Date().toISOString(), ...extra });
    } catch (err) {
      console.error('Image error:', err);
      setUploadErr('Failed to process image');
    } finally {
      setUploading(false);
    }
  };

  const handlePerfRating = (id) => {
    const next = perfRating === id ? null : id;
    setPerfRating(next);
    onUpdate('step1', { ...(stepData || {}), perfRating: next });
  };

  const handleStep4Assign = (id) => {
    const next = step4Assignee === id ? null : id;
    setStep4Assignee(next);
    onUpdate('step4', { ...(stepData || {}), assignee: next });
  };

  const handleStep4Finished = () => {
    const next = !step4Finished;
    setStep4Finished(next);
    onUpdate('step4', { ...(stepData || {}), finished: next });
  };

  const saveStep2 = (override = {}) => {
    const v = { ...valsRef.current, ...override };
    onUpdate('step2', { trafficLight: v.trafficLight, textOnAd: v.textOnAd, primaryText: v.primaryText, headlineCta: v.headlineCta, updatedBy: currentUser, updatedAt: new Date().toISOString() });
  };
  const saveStep3 = (override = {}) => {
    const v = { ...valsRef.current, ...override };
    onUpdate('step3', { textOnAd: v.textOnAd, primaryText: v.primaryText, headlineCta: v.headlineCta, updatedBy: currentUser, updatedAt: new Date().toISOString() });
  };

  const handleTextField = (setter, field, val) => {
    isTypingRef.current = true;
    setter(val);
    debounce(() => {
      stepNum === 2 ? saveStep2({ [field]: val }) : saveStep3({ [field]: val });
      isTypingRef.current = false;
    });
  };

  const handleTraffic = (id) => {
    const next = trafficLight === id ? null : id;
    setTrafficLight(next);
    saveStep2({ trafficLight: next });
  };

  const textareaBase = `w-full min-h-[120px] md:flex-1 md:min-h-0 text-white text-xs leading-relaxed placeholder-zinc-600 resize-none focus:outline-none ${transparentText ? 'bg-transparent border border-zinc-500/[0.08]' : 'bg-[#060606] border border-[#1c1c1c]'} rounded-lg p-2.5 focus:border-[#2a2a2a] transition-colors`;


  return (
  <>
    <div className="w-full md:flex-1 md:min-w-[150px] flex flex-col bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="px-3 py-2.5 border-b border-[#111] flex-shrink-0">
        <span className="text-[10px] font-medium text-zinc-700 uppercase tracking-wider">Step {stepNum}</span>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-white text-xs font-semibold leading-tight">{meta.title}</p>
          {stepNum === 2 ? (
            <div className="flex gap-1 flex-shrink-0">
              {TRAFFIC.map(t => (
                readOnly ? (
                  <span key={t.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-medium"
                    style={trafficLight === t.id
                      ? { background: t.color + '20', borderColor: t.color, color: t.color }
                      : { background: 'transparent', borderColor: '#222', color: '#3f3f46' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: trafficLight === t.id ? t.color : '#27272a' }} />
                    {t.label}
                  </span>
                ) : (
                  <button key={t.id} type="button" onClick={() => handleTraffic(t.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-medium transition-all"
                    style={trafficLight === t.id
                      ? { background: t.color + '20', borderColor: t.color, color: t.color }
                      : { background: 'transparent', borderColor: '#222', color: '#3f3f46' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: trafficLight === t.id ? t.color : '#27272a' }} />
                    {t.label}
                  </button>
                )
              ))}
            </div>
          ) : stepNum === 3 ? (
            <div className="flex-shrink-0">
              {readOnly ? (
                fpVal ? (
                  <span className="px-2 py-1 rounded-full text-[9px] font-medium"
                    style={{ background: '#f9a8d415', border: '1px solid #f9a8d430', color: '#f9a8d4' }}>
                    {fpVal}
                  </span>
                ) : null
              ) : editingFP ? (
                <input
                  autoFocus
                  value={fpVal}
                  onChange={e => setFpVal(e.target.value)}
                  onBlur={() => { setEditingFP(false); onUpdate('feedbackPerson', fpVal.trim()); }}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setFpVal(feedbackPerson || ''); setEditingFP(false); } }}
                  placeholder="Name..."
                  className="text-[9px] bg-transparent border-b focus:outline-none py-0.5 w-24"
                  style={{ borderColor: '#f9a8d4', color: '#f9a8d4' }}
                />
              ) : fpVal ? (
                <button
                  onClick={() => setEditingFP(true)}
                  title="Click to edit"
                  className="px-2 py-1 rounded-full text-[9px] font-medium transition-all hover:opacity-80"
                  style={{ background: '#f9a8d415', border: '1px solid #f9a8d430', color: '#f9a8d4' }}>
                  {fpVal}
                </button>
              ) : (
                <button
                  onClick={() => setEditingFP(true)}
                  className="px-2 py-1 rounded-full text-[9px] font-medium transition-all"
                  style={{ background: 'transparent', border: '1px dashed #3f3f46', color: '#3f3f46' }}>
                  + Add name
                </button>
              )}
            </div>
          ) : stepNum === 1 ? (
            <div className="flex gap-1 flex-shrink-0">
              {PERF_RATING.map(r => (
                readOnly ? (
                  <span key={r.id}
                    className="flex items-center justify-center w-6 h-6 rounded-md border transition-all"
                    style={perfRating === r.id
                      ? { background: r.color + '20', borderColor: r.color }
                      : { background: 'transparent', borderColor: '#222' }}>
                    <span className="rounded-full" style={{ width: '7px', height: '7px', background: perfRating === r.id ? r.color : '#3f3f46' }} />
                  </span>
                ) : (
                  <button key={r.id} type="button" onClick={() => handlePerfRating(r.id)}
                    className="flex items-center justify-center w-6 h-6 rounded-md border transition-all"
                    style={perfRating === r.id
                      ? { background: r.color + '20', borderColor: r.color }
                      : { background: 'transparent', borderColor: '#222' }}>
                    <span className="rounded-full" style={{ width: '7px', height: '7px', background: perfRating === r.id ? r.color : '#3f3f46' }} />
                  </button>
                )
              ))}
            </div>
          ) : stepNum === 4 && !readOnly ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button type="button" onClick={handleStep4Finished}
                className="flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-medium transition-all"
                style={step4Finished
                  ? { background: '#34d39920', borderColor: '#34d399', color: '#34d399' }
                  : { background: 'transparent', borderColor: '#333', color: '#52525b' }}>
                {step4Finished && <span>✓</span>}
                Finished
              </button>
              <div style={{ width: '1px', height: '12px', background: '#222', flexShrink: 0 }} />
              {STEP4_ASSIGN.map(a => (
                <button key={a.id} type="button" onClick={() => handleStep4Assign(a.id)}
                  className="flex items-center justify-center w-7 h-6 rounded-md border text-[10px] font-bold transition-all"
                  style={step4Assignee === a.id
                    ? { background: a.color + '25', borderColor: a.color, color: a.color }
                    : { background: 'transparent', borderColor: '#222', color: '#3f3f46' }}>
                  {a.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1 flex-shrink-0 invisible pointer-events-none" aria-hidden="true">
              {TRAFFIC.map(t => <div key={t.id} className="px-2 py-1 rounded-md border border-transparent text-[9px]">{t.label}</div>)}
            </div>
          )}
        </div>
      </div>

      <div ref={cardBodyRef} className="p-3 flex flex-col md:flex-1 md:min-h-0">
        {/* Image steps — empty or loading */}
        {isImg && !hasImg && (
          readOnly ? (
            <div className="w-full aspect-square rounded-lg flex items-center justify-center" style={{ background: '#0d0d0d', border: '1px dashed #222' }}>
              <span className="text-zinc-700 text-[10px]">Not uploaded yet</span>
            </div>
          ) : !loaded && !uploading && !uploadErr ? (
            /* Skeleton: Firebase hasn't confirmed yet — image might be loading */
            <div className="w-full aspect-square rounded-lg animate-pulse flex flex-col items-center justify-center gap-2.5" style={{ background: '#111' }}>
              <div className="w-9 h-9 rounded-xl bg-zinc-800" />
              <div className="w-24 h-2 rounded-full bg-zinc-800" />
              <div className="w-16 h-1.5 rounded-full bg-zinc-800/60" />
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center gap-2 aspect-square w-full rounded-lg border border-dashed border-[#222] cursor-pointer hover:border-[#faff05]/40 transition-colors ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
              {uploading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-[#faff05] animate-spin" />
                  <span className="text-zinc-500 text-xs">Uploading...</span>
                </>
              ) : uploadErr ? (
                <span className="text-red-500 text-[10px] text-center px-2">{uploadErr}</span>
              ) : (
                <>
                  <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-zinc-600 text-xs">{stepNum === 1 ? 'Upload reference' : 'Upload final ad'}</span>
                </>
              )}
            </label>
          )
        )}

        {/* Image steps — filled */}
        {isImg && hasImg && (
          <div className="relative group">
            <ImageCell src={stepData.imageUrl} />

            {/* Hover action overlay */}
            {!uploading && !confirmDelete && (
              <div className="absolute inset-0 rounded-lg bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {stepNum === 1 && (
                  <button className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors" onClick={() => onLightbox(stepData.imageUrl)}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                )}
                {stepNum === 4 && (
                  <>
                    <a href={stepData.imageUrl} download target="_blank" rel="noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors" onClick={e => e.stopPropagation()}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors" onClick={() => onLightbox(stepData.imageUrl)}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </>
                )}
                {!readOnly && (
                  <>
                    <label className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    </label>
                    <button className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors" onClick={() => setConfirmDelete(true)}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Confirm delete overlay */}
            {confirmDelete && (
              <div className="absolute inset-0 rounded-lg bg-black/90 flex flex-col items-center justify-center gap-3 p-3">
                <p className="text-white text-xs font-semibold text-center">Remove this image?</p>
                <div className="flex gap-2 w-full">
                  <button
                    className="flex-1 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-zinc-400 text-xs font-medium transition-colors"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition-colors border border-red-500/30"
                    onClick={() => { setConfirmDelete(false); onUpdate(`step${stepNum}`, null); }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {uploading && (
              <div className="absolute inset-0 rounded-lg bg-black/70 flex items-center justify-center">
                <span className="text-white text-xs">Uploading...</span>
              </div>
            )}
          </div>
        )}

        {/* Steps 2 & 3 — three text fields */}
        {(stepNum === 2 || stepNum === 3) && !loaded && !textOnAd && !primaryText && !headlineCta && (
          <div className="flex flex-col gap-2 md:flex-1 md:min-h-0 animate-pulse">
            {['Text on AD', 'Primary Text', 'Headline / CTA'].map(lbl => (
              <div key={lbl} className="flex flex-col md:flex-1 md:min-h-0">
                <div className="w-14 h-1.5 bg-zinc-800 rounded-full mb-1.5" />
                <div className="min-h-[120px] md:flex-1 md:min-h-0 rounded-lg" style={{ background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
                  <div className="m-2.5 space-y-1.5">
                    <div className="h-1.5 bg-zinc-800 rounded-full w-4/5" />
                    <div className="h-1.5 bg-zinc-800 rounded-full w-3/5" />
                    <div className="h-1.5 bg-zinc-800/50 rounded-full w-2/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {(stepNum === 2 || stepNum === 3) && (loaded || textOnAd || primaryText || headlineCta) && (
          <div className="flex flex-col gap-2 md:flex-1 md:min-h-0">
            {[
              { key: 'textOnAd',    label: 'Text on AD',     val: textOnAd,    set: setTextOnAd,    ph: 'Text shown on the ad...' },
              { key: 'primaryText', label: 'Primary Text',   val: primaryText, set: setPrimaryText, ph: 'Main message...' },
              { key: 'headlineCta', label: 'Headline / CTA', val: headlineCta, set: setHeadlineCta, ph: 'Headline or call to action...' },
            ].map(f => (
              <div key={f.key} className="flex flex-col md:flex-1 md:min-h-0">
                <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1 flex-shrink-0">{f.label}</p>
                <textarea value={f.val}
                  onChange={readOnly ? undefined : e => handleTextField(f.set, f.key, e.target.value)}
                  onFocus={readOnly ? undefined : () => setExpandedField(f.key)}
                  onBlur={readOnly ? undefined : () => setExpandedField(null)}
                  readOnly={readOnly}
                  placeholder={f.ph}
                  className={`${textareaBase} ${!readOnly && expandedField === f.key ? 'min-h-[160px]' : ''} transition-all duration-200 ${readOnly ? 'cursor-default' : ''}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </>
  );
}

// ── Pipeline row ──────────────────────────────────────────────────────────────
export function PipelineRow({ pipeline, currentUser, loaded, onUpdate, onDelete, onLightbox, adNumber, readOnly = false, clientMode = false }) {
  const [hovered,          setHovered]          = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div id={`ad-${pipeline.id}`} className="bg-[#0a0a0a] border border-[#111] rounded-xl p-3"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="flex items-center justify-center md:justify-between mb-3 gap-2 relative">
        <div className="flex items-center gap-2">
          {adNumber && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0"
              style={{ background: '#faff0518', color: '#faff05', border: '1px solid #faff0528' }}>
              AD {adNumber}
            </span>
          )}
        </div>
        {!readOnly && !clientMode && hovered && (
          <button onClick={() => setConfirmingDelete(true)} className="absolute right-0 text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        {confirmingDelete && createPortal(
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            onClick={() => setConfirmingDelete(false)}>
            <div className="bg-[#111] border border-[#222] rounded-2xl p-5 w-full max-w-xs" onClick={e => e.stopPropagation()}>
              <p className="text-white font-semibold text-sm mb-1">Delete this ad?</p>
              <p className="text-zinc-500 text-xs mb-4 leading-relaxed">
                This ad and all its content will be permanently removed.
              </p>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-xl bg-[#1a1a1a] text-zinc-400 text-sm font-medium"
                  onClick={() => setConfirmingDelete(false)}>Cancel</button>
                <button className="flex-1 py-2 rounded-xl text-red-400 text-sm font-semibold border border-red-500/30"
                  style={{ background: '#f8717115' }}
                  onClick={() => { setConfirmingDelete(false); onDelete(pipeline.id); }}>Delete</button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
      <div className="flex flex-col md:flex-row md:items-stretch md:min-h-[320px] gap-3">
        {[1, 2, 3, 4].map(stepNum => {
          // clientMode: step 1 (upload/delete), step 3 (edit text) are interactive; step 2, 4 readonly
          const stepReadOnly = clientMode ? (stepNum === 2 || stepNum === 4) : readOnly;
          const stepTransparent = clientMode && stepNum === 2;
          return (
            <StepCard key={stepNum} stepNum={stepNum} stepData={pipeline[`step${stepNum}`]}
              pipelineId={pipeline.id} currentUser={currentUser} loaded={loaded} onUpdate={onUpdate} onLightbox={onLightbox}
              feedbackPerson={stepNum === 3 ? (pipeline.feedbackPerson || 'Wayne') : undefined}
              readOnly={stepReadOnly} transparentText={stepTransparent} />
          );
        })}
      </div>
    </div>
  );
}

// ── Client folder card (grid view) ────────────────────────────────────────────
function ClientFolderCard({ client, pipelineCount, onClick }) {
  return (
    <button onClick={onClick}
      className="h-full min-h-[160px] bg-[#141414] border border-[#111] rounded-2xl p-7 text-left hover:border-zinc-700 hover:bg-[#181818] transition-all group flex flex-col justify-between w-full">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-black flex-shrink-0"
        style={{ background: client.color || '#faff05' }}>
        {getInitials(client.name)}
      </div>
      <div>
        <p className="text-white font-bold text-xl">{client.name}</p>
        <p className="text-zinc-500 text-sm mt-1.5">
          {pipelineCount === 0 ? 'No ads' : `${pipelineCount} ${pipelineCount === 1 ? 'ad' : 'ads'}`}
        </p>
      </div>
    </button>
  );
}

// ── Client detail view ────────────────────────────────────────────────────────
function ClientDetailView({ client, pipelines, currentUser, loaded, onBack, onUpdatePipeline, onDeletePipeline, onAddPipeline, onLightbox }) {
  const makeOnUpdate = useCallback((pipelineId) => (stepKey, stepData) => {
    onUpdatePipeline(pipelineId, { [stepKey]: stepData });
  }, [onUpdatePipeline]);

  const [activeId, setActiveId] = useState(pipelines[0]?.id ?? null);
  const activeRef = useRef(activeId);
  const bottomRef = useRef(null);
  const newIdeaBarRef = useRef(null);
  const sidebarRef = useRef(null);
  const sidebarAnchorRef = useRef(null);
  const [sidebarRect, setSidebarRect] = useState(null);
  const [dotsTop, setDotsTop] = useState(60);
  const [dotsBottom, setDotsBottom] = useState(50);

  const handleNewIdea = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setTimeout(() => onAddPipeline({ name: '', clientId: client.id }), 450);
  };

  React.useLayoutEffect(() => {
    const measure = () => {
      const header = document.querySelector('[data-app-header]');
      if (header) setDotsTop(header.getBoundingClientRect().bottom + 4);
      if (newIdeaBarRef.current) {
        setDotsBottom(window.innerHeight - newIdeaBarRef.current.getBoundingClientRect().top + 4);
      }
      if (sidebarAnchorRef.current) {
        const r = sidebarAnchorRef.current.getBoundingClientRect();
        setSidebarRect({ top: r.top, right: window.innerWidth - r.right, width: r.width });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Scroll-spy: highlight the AD whose top is closest to 30% from the top of the scroll container
  React.useEffect(() => {
    if (pipelines.length < 2) return;
    const firstEl = document.getElementById(`ad-${pipelines[0]?.id}`);
    if (!firstEl) return;
    // Walk up to find the scrollable ancestor
    let scroller = firstEl.parentElement;
    while (scroller && scroller !== document.body) {
      const { overflowY } = window.getComputedStyle(scroller);
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      scroller = scroller.parentElement;
    }
    if (!scroller || scroller === document.body) return;

    const update = () => {
      const containerTop = scroller.getBoundingClientRect().top;
      const triggerY = containerTop + scroller.clientHeight * 0.30;
      let best = null, bestDist = Infinity;
      pipelines.forEach(p => {
        const el = document.getElementById(`ad-${p.id}`);
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        const dist = Math.abs(top - triggerY);
        if (dist < bestDist) { bestDist = dist; best = p.id; }
      });
      if (best && activeRef.current !== best) {
        activeRef.current = best;
        setActiveId(best);
      }
    };

    update();
    scroller.addEventListener('scroll', update, { passive: true });
    return () => scroller.removeEventListener('scroll', update);
  }, [pipelines]);

  const scrollToAd = (id) => {
    document.getElementById(`ad-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Move the tape so the active button always sits at y=0 of the tape window
  React.useEffect(() => {
    const inner = sidebarRef.current;
    if (!inner) return;
    const activeIdx = pipelines.findIndex(p => p.id === activeId);
    const btn = inner.querySelectorAll('button')[activeIdx];
    if (!btn) return;
    inner.style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1)';
    inner.style.transform = `translateY(${-btn.offsetTop}px)`;
  }, [activeId, pipelines]);

  return (
    <div>
      {/* Back + header */}
      <div className="mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs mb-4 transition-colors group">
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All clients
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
            style={{ background: client.color || '#faff05' }}>
            {getInitials(client.name)}
          </div>
          <h2 className="text-white font-bold text-xl">{client.name}</h2>
          {pipelines.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {pipelines.length} {pipelines.length === 1 ? 'ad' : 'ads'}
            </span>
          )}
        </div>
      </div>

      {/* Main area: pipelines + sticky right nav (desktop only) */}
      <div className="flex gap-4 items-start">
        {/* Pipeline list */}
        <div className="flex-1 min-w-0 flex flex-col gap-0">
          {pipelines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-zinc-700 text-sm gap-3">
              <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>No ads yet</span>
            </div>
          )}

          {pipelines.map((pipeline, idx) => (
            <React.Fragment key={pipeline.id}>
              {idx > 0 && <div className="h-[2px] my-4 rounded-full" style={{ background: 'rgba(250,255,5,0.45)' }} />}
              <PipelineRow
                pipeline={pipeline}
                adNumber={idx + 1}
                currentUser={currentUser}
                loaded={loaded}
                onUpdate={makeOnUpdate(pipeline.id)}
                onDelete={onDeletePipeline}
                onLightbox={onLightbox}
              />
            </React.Fragment>
          ))}

          {/* Desktop: inline new idea button */}
          <button
            onClick={handleNewIdea}
            className="hidden md:flex w-full items-center justify-center gap-2 py-4 mt-2 rounded-xl border border-dashed border-[#222] text-zinc-600 hover:text-zinc-300 hover:border-[#333] transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New idea
          </button>

          {/* Bottom anchor for scroll-then-create */}
          <div ref={bottomRef} />
          {/* Mobile: spacer so fixed bar doesn't cover last AD */}
          <div className="h-14 md:hidden" />
        </div>

        {/* Invisible anchor — reserves layout space and gives us the fixed coords */}
        {pipelines.length >= 1 && (
          <div ref={sidebarAnchorRef} className="hidden md:block flex-shrink-0 w-20" style={{ height: 1 }} />
        )}

        {/* Fixed portal sidebar — not affected by overflow-x-hidden on the scroll container */}
        {pipelines.length >= 1 && sidebarRect && createPortal(
          <div className="hidden md:flex flex-col" style={{ position: 'fixed', top: dotsTop + 8, right: sidebarRect.right, width: sidebarRect.width, bottom: 88, zIndex: 40 }}>

            {/* Step 1 perf counter */}
            {(() => {
              const counts = { up: 0, neutral: 0, down: 0 };
              pipelines.forEach(p => { if (p.step1?.perfRating) counts[p.step1.perfRating] = (counts[p.step1.perfRating] || 0) + 1; });
              return (
                <div className="flex items-center justify-center flex-shrink-0 py-2 px-1">
                  {PERF_RATING.map((r, i) => (
                    <React.Fragment key={r.id}>
                      {i > 0 && <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.07)', flexShrink: 0, margin: '0 5px' }} />}
                      <span className="flex items-center gap-1 text-[9px] font-bold">
                        <span className="rounded-full flex-shrink-0" style={{ width: '5px', height: '5px', background: r.color }} />
                        <span style={{ color: counts[r.id] ? r.color : '#3f3f46' }}>{counts[r.id] || 0}</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              );
            })()}

            <div className="flex-shrink-0" style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 4px' }} />

            {/* Step 4 K/J/F counter */}
            {(() => {
              const counts = { kann: 0, jero: 0, facu: 0 };
              pipelines.forEach(p => { if (p.step4?.assignee) counts[p.step4.assignee] = (counts[p.step4.assignee] || 0) + 1; });
              return (
                <div className="flex items-center justify-center flex-shrink-0 py-2 px-1">
                  {STEP4_ASSIGN.map((a, i) => (
                    <React.Fragment key={a.id}>
                      {i > 0 && <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.07)', flexShrink: 0, margin: '0 5px' }} />}
                      <span className="flex items-center gap-0.5 text-[9px] font-bold">
                        <span style={{ color: counts[a.id] ? '#a1a1aa' : '#3f3f46' }}>{a.label}</span>
                        <span style={{ color: counts[a.id] ? '#a1a1aa' : '#3f3f46' }}>{counts[a.id] || 0}</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              );
            })()}

            <div className="flex-shrink-0" style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 4px' }} />

            {/* Top arrow */}
            <button
              onClick={() => scrollToAd(pipelines[0].id)}
              className="w-full flex items-center justify-center py-1 flex-shrink-0"
              style={{ color: '#52525b', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#faff05'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#52525b'; }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 8L5 2M5 2L2 5M5 2L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Tape — takes remaining space */}
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div ref={sidebarRef} className="flex flex-col gap-1">
                {pipelines.map((p, idx) => {
                  const isActive = activeId === p.id;
                  const perfColor = PERF_RATING.find(r => r.id === p.step1?.perfRating)?.color;
                  return (
                    <button
                      key={p.id}
                      onClick={() => scrollToAd(p.id)}
                      title={p.name || `AD ${idx + 1}`}
                      className="w-full flex items-center gap-1.5 text-[9px] font-bold px-1.5 py-1.5 rounded-lg leading-tight flex-shrink-0"
                      style={isActive ? { background: '#faff05', color: '#000' } : { color: '#52525b' }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#a1a1aa'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#52525b'; } }}>
                      <span className="whitespace-nowrap">AD {idx + 1}</span>
                      <span className="flex-1 h-px" style={{ background: isActive ? 'rgba(0,0,0,0.35)' : '#2a2a2a' }} />
                      {perfColor && (
                        <span className="flex-shrink-0 rounded-full" style={{ width: '5px', height: '5px', background: perfColor }} />
                      )}
                      {p.step4?.assignee && (
                        <span className="flex-shrink-0 text-[8px] font-bold" style={{ color: isActive ? 'rgba(0,0,0,0.5)' : '#52525b' }}>
                          {STEP4_ASSIGN.find(a => a.id === p.step4.assignee)?.label}
                        </span>
                      )}
                      {p.step4?.finished && (
                        <span className="flex-shrink-0 text-[9px] font-bold" style={{ color: isActive ? 'rgba(0,0,0,0.6)' : '#34d399' }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom arrow */}
            <button
              onClick={() => scrollToAd(pipelines[pipelines.length - 1].id)}
              className="w-full flex items-center justify-center py-1 flex-shrink-0"
              style={{ color: '#52525b', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#faff05'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#52525b'; }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 2L5 8M5 8L2 5M5 8L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>,
          document.body
        )}

        {/* Mobile dots — fixed portal, bounds measured from actual header and New Idea bar */}
        {pipelines.length >= 1 && createPortal(
          <div className="flex md:hidden" style={{ position: 'fixed', right: '4px', top: `${dotsTop}px`, bottom: `${dotsBottom}px`, zIndex: 40, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', pointerEvents: 'none' }}>
            {pipelines.map((p, idx) => {
              const isActive = activeId === p.id;
              return (
                <button key={p.id} onClick={() => scrollToAd(p.id)}
                  style={{ pointerEvents: 'auto', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ display: 'block', borderRadius: '50%', transition: 'all 0.2s', flexShrink: 0, width: isActive ? '5px' : '3px', height: isActive ? '5px' : '3px', background: isActive ? '#faff05' : '#52525b' }} />
                </button>
              );
            })}
          </div>,
          document.body
        )}
      </div>

      {/* Mobile-only bar — fixed at bottom (zoom is removed on mobile so position:fixed works on iOS) */}
      <div ref={newIdeaBarRef} className="md:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <button
          onClick={handleNewIdea}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold"
          style={{ background: '#060606', borderTop: '1px solid rgba(250,255,5,0.4)', color: '#faff05' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          + New Idea
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LiveTasks() {
  const { adPipelines, adPipelinesLoaded, clients, addAdPipeline, updateAdPipeline, deleteAdPipeline, currentUser } = useApp();
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [lightboxUrl,      setLightboxUrl]      = useState(null);

  const visibleClients = useMemo(() => clients.filter(c => c.active !== false), [clients]);

  const pipelinesByClient = useMemo(() => {
    const map = {};
    visibleClients.forEach(c => { map[c.id] = adPipelines.filter(p => p.clientId === c.id); });
    return map;
  }, [adPipelines, visibleClients]);

  const selectedClient = useMemo(
    () => visibleClients.find(c => c.id === selectedClientId) ?? null,
    [visibleClients, selectedClientId]
  );

  if (!adPipelinesLoaded) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 select-none">
        <div className="w-14 h-14 rounded-full border-[3px] border-zinc-800 border-t-zinc-400 animate-spin" />
        <span className="text-zinc-500 text-sm tracking-widest uppercase">Loading ads…</span>
      </div>
    );
  }

  const lightbox = lightboxUrl !== null && (
    <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
  );

  // ── Grid view ─────────────────────────────────────────────────────────────
  if (!selectedClientId) {
    const n = visibleClients.length;
    const cols = n <= 4 ? Math.max(n, 1) : 3;
    const header = (
      <div className="flex items-center gap-3 flex-shrink-0">
        <h2 className="text-white font-bold text-xl">Live Tasks</h2>
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#faff0520', color: '#faff05' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#faff05] animate-pulse" />
          {adPipelines.length} {adPipelines.length === 1 ? 'pipeline' : 'pipelines'}
        </span>
      </div>
    );
    const cards = visibleClients.map(client => (
      <ClientFolderCard
        key={client.id}
        client={client}
        pipelineCount={(pipelinesByClient[client.id] || []).length}
        onClick={() => setSelectedClientId(client.id)}
      />
    ));
    return (
      <>
        {/* Mobile: single column, scrolls naturally */}
        <div className="md:hidden space-y-5">
          {header}
          <div className="grid grid-cols-1 gap-4">{cards}</div>
        </div>

        {/* Desktop: multi-column, fills full content area height */}
        <div className="hidden md:flex flex-col h-full gap-5">
          {header}
          <div className="flex-1 grid gap-4 min-h-0"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: '1fr' }}>
            {cards}
          </div>
        </div>

        {lightbox}
      </>
    );
  }

  // ── Detail view: single client (normal scrollable layout) ─────────────────
  return (
    <div className="space-y-5">
      {selectedClient && (
        <ClientDetailView
          client={selectedClient}
          pipelines={pipelinesByClient[selectedClientId] || []}
          currentUser={currentUser}
          loaded={adPipelinesLoaded}
          onBack={() => setSelectedClientId(null)}
          onUpdatePipeline={updateAdPipeline}
          onDeletePipeline={deleteAdPipeline}
          onAddPipeline={addAdPipeline}
          onLightbox={setLightboxUrl}
        />
      )}
      {lightbox}
    </div>
  );
}
