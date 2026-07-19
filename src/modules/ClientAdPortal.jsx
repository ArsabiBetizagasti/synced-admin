import React, { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { PipelineRow } from './LiveTasks';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function Lightbox({ url, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={onClose}>
      <img src={url} alt=""
        className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()} draggable={false} />
    </div>
  );
}

export default function ClientAdPortal({ clientId, onLogout }) {
  const { adPipelines, adPipelinesLoaded, clients, updateAdPipeline, addAdPipeline, currentUser } = useApp();
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const activeRef = useRef(null);
  const bodyRef = useRef(null);

  const handleNewIdea = () => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setTimeout(() => addAdPipeline({ name: '', clientId }), 450);
  };

  const client    = clients.find(c => c.id === clientId);
  const pipelines = adPipelines.filter(p => p.clientId === clientId);

  const makeOnUpdate = useCallback((pipelineId) => (stepKey, stepData) => {
    updateAdPipeline(pipelineId, { [stepKey]: stepData });
  }, [updateAdPipeline]);

  // Scroll-spy
  React.useEffect(() => {
    if (pipelines.length < 1) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const id = e.target.id.replace('ad-', '');
            if (activeRef.current !== id) {
              activeRef.current = id;
              setActiveId(id);
            }
          }
        });
      },
      { threshold: 0.25 }
    );
    pipelines.forEach(p => {
      const el = document.getElementById(`ad-${p.id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [pipelines]);

  const scrollToAd = (id) => {
    document.getElementById(`ad-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center px-5 py-4 border-b border-[#111] flex-shrink-0">
        {/* Left: Synced logo */}
        <img src="/admin/synced micrologo.webp" alt="Synced" className="h-7 w-auto" draggable={false} />

        {/* Right: client name + badge + hidden sign out */}
        {client && (
          <div className="ml-auto group flex items-center gap-0">
            {/* Name + badge — always at right, shift left on hover to reveal sign out */}
            <div className="flex items-center gap-3 transition-transform duration-200 group-hover:-translate-x-2">
              <div className="text-right">
                <p className="text-white font-bold text-sm leading-tight">{client.name}</p>
                <p className="text-zinc-600 text-xs">Your ads with Synced Graphics</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                style={{ background: client.color || '#faff05' }}>
                {getInitials(client.name)}
              </div>
            </div>
            {/* Sign out — expands from 0 to full width on hover, appears to the right of badge */}
            <div className="overflow-hidden max-w-0 group-hover:max-w-[110px] transition-all duration-200 ease-out">
              <button onClick={onLogout}
                className="ml-2 px-3 py-2 rounded-lg text-red-400 text-xs font-semibold whitespace-nowrap"
                style={{ background: '#f8717120', border: '1px solid #f8717150' }}>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body — relative wrapper so mobile dots can be absolutely pinned within this exact height */}
      <div className="flex-1 relative min-h-0">
        <div ref={bodyRef} className="absolute inset-0 overflow-y-auto p-5">
        {!adPipelinesLoaded ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-600">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-zinc-500 animate-spin" />
            <span className="text-sm">Loading your ads...</span>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-700 text-sm">
            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            No ads yet
          </div>
        ) : (
          <div className="flex gap-4 items-start">
            {/* Pipeline list */}
            <div className="flex-1 min-w-0 flex flex-col gap-0">
              {pipelines.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && <div className="h-[2px] my-4 rounded-full" style={{ background: 'rgba(250,255,5,0.45)' }} />}
                  <PipelineRow
                    pipeline={p}
                    adNumber={i + 1}
                    currentUser={currentUser}
                    loaded={adPipelinesLoaded}
                    onUpdate={makeOnUpdate(p.id)}
                    onDelete={() => {}}
                    onLightbox={setLightboxUrl}
                    clientMode={true}
                  />
                </React.Fragment>
              ))}
            </div>

            {/* Sticky right nav — desktop only */}
            <div className="hidden md:flex flex-col gap-1 sticky top-6 flex-shrink-0 w-20">
              {pipelines.map((p, idx) => {
                const isActive = activeId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => scrollToAd(p.id)}
                    title={`AD ${idx + 1}`}
                    className="w-full flex items-center gap-1.5 text-[9px] font-bold px-1.5 py-1.5 rounded-lg transition-all leading-tight"
                    style={isActive ? { background: '#faff05', color: '#000' } : { color: '#52525b' }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#a1a1aa'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#52525b'; } }}>
                    <span className="whitespace-nowrap">AD {idx + 1}</span>
                    <span className="flex-1 h-px" style={{ background: isActive ? 'rgba(0,0,0,0.35)' : '#2a2a2a' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>

        {/* Mobile dots — absolute within the body wrapper, never overlaps header or New Idea bar */}
        {pipelines.length >= 1 && (
          <div className="md:hidden absolute inset-y-3 right-1 flex flex-col items-center pointer-events-none"
            style={{ zIndex: 30, justifyContent: 'center', gap: '4px' }}>
            {pipelines.map((p, idx) => {
              const isActive = activeId === p.id;
              return (
                <button key={p.id} onClick={() => scrollToAd(p.id)}
                  style={{ pointerEvents: 'auto', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ display: 'block', borderRadius: '50%', transition: 'all 0.2s', flexShrink: 0, width: isActive ? '5px' : '3px', height: isActive ? '5px' : '3px', background: isActive ? '#faff05' : '#52525b' }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile-only New Idea bar — flex-shrink-0 sibling so it always sits at the bottom */}
      <div className="md:hidden flex-shrink-0 border-t" style={{ borderColor: 'rgba(250,255,5,0.4)' }}>
        <button
          onClick={handleNewIdea}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold"
          style={{ background: '#060606', color: '#faff05' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          + New Idea
        </button>
      </div>

      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
