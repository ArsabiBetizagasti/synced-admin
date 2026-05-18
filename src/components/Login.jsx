import React, { useState } from 'react';

function loadBrands() {
  try {
    const stored = localStorage.getItem('sg_clients_v7');
    if (stored) return JSON.parse(stored).filter(c => c.active !== false && !c.isInternal);
    return [];
  } catch { return []; }
}

const USERS = [
  { id: 'kann', label: 'Kann', initials: 'K', bg: '#faff05', text: '#000', pin: '515051' },
  { id: 'jero', label: 'Jero', initials: 'J', bg: '#60a5fa', text: '#000', pin: '882001' },
  { id: 'facu', label: 'Facu', initials: 'F', bg: '#a78bfa', text: '#000', pin: '182026' },
];

function PinPad({ user, onBack, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [checking, setChecking] = useState(false);

  const handleDigit = (d) => {
    if (checking || error) return;
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 6) {
      setChecking(true);
      setTimeout(() => {
        if (next === user.pin) {
          onSuccess(user.id);
        } else {
          setError(true);
          setShakeKey(k => k + 1);
          setTimeout(() => {
            setError(false);
            setPin('');
            setChecking(false);
          }, 900);
        }
      }, 150);
    }
  };

  const handleDelete = () => {
    if (checking) return;
    if (error) { setError(false); setPin(''); return; }
    setPin(p => p.slice(0, -1));
  };

  const dots = Array.from({ length: 6 });

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #faff05, transparent 70%)' }} />

      <div className="w-full max-w-xs relative z-10 text-center">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-sm mb-8 transition-colors mx-auto">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        {/* Avatar */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3"
          style={{ background: user.bg, color: user.text }}>
          {user.initials}
        </div>
        <p className="text-white font-semibold text-xl mb-1">{user.label}</p>
        <p className="text-zinc-500 text-sm mb-8">Ingresá tu PIN de 6 dígitos</p>

        {/* PIN dots */}
        <div key={shakeKey} className={`flex justify-center gap-3 mb-3 ${error ? 'pin-shake' : ''}`}>
          {dots.map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-full border-2 transition-all duration-150"
              style={{
                borderColor: error ? '#f87171' : i < pin.length ? 'white' : '#3f3f46',
                background:  error ? '#f87171' : i < pin.length ? 'white' : 'transparent',
              }} />
          ))}
        </div>

        <div className="h-5 mb-5">
          {error && <p className="text-red-400 text-sm">PIN incorrecto. Intentá de nuevo.</p>}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <button key={d} onClick={() => handleDigit(String(d))}
              className="h-16 rounded-2xl bg-[#1a1a1a] border border-zinc-800 text-white text-2xl font-semibold hover:bg-zinc-800 active:scale-95 transition-all select-none">
              {d}
            </button>
          ))}
          {/* Empty */}
          <div />
          <button onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-[#1a1a1a] border border-zinc-800 text-white text-2xl font-semibold hover:bg-zinc-800 active:scale-95 transition-all select-none">
            0
          </button>
          {/* Backspace */}
          <button onClick={handleDelete}
            className="h-16 rounded-2xl bg-[#1a1a1a] border border-zinc-800 text-zinc-400 hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center select-none">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const brands = loadBrands();

  const user = USERS.find(u => u.id === selectedUser);

  if (selectedUser) return (
    <PinPad
      user={user}
      onBack={() => setSelectedUser(null)}
      onSuccess={onLogin}
    />
  );

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #faff05, transparent 70%)' }} />

      <div className="w-full max-w-lg relative z-10 text-center">
        <div className="inline-flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-black text-xs"
            style={{ background: '#faff05' }}>SG</div>
          <div className="text-left">
            <div className="text-white font-semibold text-lg leading-none">Synced</div>
            <div className="text-xs leading-none mt-0.5" style={{ color: '#faff05' }}>Graphics Admin</div>
          </div>
        </div>

        <div className="bg-[#111] border border-zinc-800 rounded-2xl p-8">
          {/* Team section */}
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">Equipo interno</p>
          <div className="flex gap-4 justify-center mb-6">
            {USERS.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u.id)}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-all group w-24">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110"
                  style={{ background: u.bg, color: u.text }}>
                  {u.initials}
                </div>
                <span className="text-white font-semibold text-sm">{u.label}</span>
              </button>
            ))}
          </div>

          {/* Brand section */}
          {brands.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-zinc-600 text-xs uppercase tracking-wider">Acceso de marcas</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {brands.map(b => {
                  const initials = (b.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <button key={b.id} onClick={() => onLogin('brand_' + b.id)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all group">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-black transition-transform group-hover:scale-110"
                        style={{ background: b.color }}>
                        {initials}
                      </div>
                      <span className="text-zinc-400 text-xs font-medium leading-tight text-center group-hover:text-white transition-colors line-clamp-2">
                        {b.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p className="text-zinc-700 text-xs mt-6">© 2026 Synced Graphics</p>
      </div>
    </div>
  );
}
