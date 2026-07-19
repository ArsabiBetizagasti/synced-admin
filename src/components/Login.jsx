import React, { useState, useRef, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

// Username → internal id + Firebase email (no passwords stored here — verified server-side)
const ALL_USERS = {
  'kann':              { id: 'kann',     label: 'Kann',             initials: 'K',  bg: '#faff05', text: '#000', email: 'kann@synced.graphics' },
  'jero':              { id: 'jero',     label: 'Jero',             initials: 'J',  bg: '#60a5fa', text: '#000', email: 'jero@synced.graphics' },
  'facu':              { id: 'facu',     label: 'Facu',             initials: 'F',  bg: '#a78bfa', text: '#000', email: 'facu@synced.graphics' },
  'angel':             { id: 'angel',    label: 'Angel',            initials: 'A',  bg: '#4ade80', text: '#000', email: 'angel@synced.graphics' },
  'hollywood browzer': { id: 'brand_c1', label: 'Hollywood Browzer',initials: 'HB', bg: '#f472b6', text: '#000', email: 'brand_c1@synced.graphics' },
  '360 optimum':       { id: 'brand_c2', label: '360 Optimum',      initials: '36', bg: '#38bdf8', text: '#000', email: 'brand_c2@synced.graphics' },
  'foreshank':         { id: 'brand_c3', label: 'Foreshank',        initials: 'FS', bg: '#34d399', text: '#000', email: 'brand_c3@synced.graphics' },
  'adam':              { id: 'brand_c4', label: 'ADAM',             initials: 'AD', bg: '#fb923c', text: '#000', email: 'brand_c4@synced.graphics' },
};

const BG = {
  position: 'fixed',
  inset: 0,
  backgroundImage: 'url(/admin/login-bg.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center bottom',
};

function PinPad({ user, onBack }) {
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
      signInWithEmailAndPassword(auth, user.email, next)
        .catch(() => {
          setError(true);
          setShakeKey(k => k + 1);
          setTimeout(() => { setError(false); setPin(''); setChecking(false); }, 900);
        });
      // On success: App.jsx onAuthStateChanged picks up the session automatically
    }
  };

  const handleDelete = () => {
    if (checking) return;
    if (error) { setError(false); setPin(''); return; }
    setPin(p => p.slice(0, -1));
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      else if (e.key === 'Backspace') handleDelete();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pin, error, checking]);

  const dots = Array.from({ length: 6 });

  return (
    <div style={BG} className="flex flex-col items-center justify-center">
      <div className="w-full max-w-xs text-center px-6 -mt-16">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4"
          style={{ background: user.bg, color: user.text }}>
          {user.initials}
        </div>
        <p className="text-white font-bold text-xl mb-1">{user.label}</p>
        <p className="text-white/40 text-sm mb-10">Enter your 6-digit code</p>

        <div key={shakeKey} className={`flex justify-center gap-3 mb-3 ${error ? 'pin-shake' : ''}`}>
          {dots.map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-full border-2 transition-all duration-150"
              style={{
                borderColor: error ? '#f87171' : i < pin.length ? 'white' : 'rgba(255,255,255,0.2)',
                background:  error ? '#f87171' : i < pin.length ? 'white' : 'transparent',
              }} />
          ))}
        </div>

        <div className="h-5 mb-6">
          {error && <p className="text-red-400 text-sm">Código incorrecto. Intentá de nuevo.</p>}
          {checking && !error && <p className="text-white/30 text-sm">Verificando…</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <button key={d} onClick={() => handleDigit(String(d))}
              className="h-16 rounded-2xl text-white text-2xl font-semibold active:scale-95 transition-all select-none bg-white/[0.07] border border-white/[0.08] hover:bg-[#faff05] hover:text-black hover:border-[#faff05]">
              {d}
            </button>
          ))}
          <button onClick={onBack}
            className="h-16 rounded-2xl text-white/40 text-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 select-none bg-white/[0.07] border border-white/[0.08] hover:bg-red-950/60 hover:text-red-400 hover:border-red-600/40">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            back
          </button>
          <button onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl text-white text-2xl font-semibold active:scale-95 transition-all select-none bg-white/[0.07] border border-white/[0.08] hover:bg-[#faff05] hover:text-black hover:border-[#faff05]">
            0
          </button>
          <button onClick={handleDelete}
            className="h-16 rounded-2xl text-white/50 active:scale-95 transition-all flex items-center justify-center select-none bg-white/[0.07] border border-white/[0.08] hover:bg-red-950/60 hover:text-red-400 hover:border-red-600/40">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>
      </div>

      <p className="absolute bottom-5 right-5 text-white text-xs select-none">© 2026 Synced Graphics</p>
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const key = username.trim().toLowerCase();
    const found = ALL_USERS[key];
    if (found) {
      setError('');
      setSelectedUser(found);
    } else {
      setError('User not found. Check the name and try again.');
    }
  };

  if (selectedUser) {
    return (
      <PinPad
        user={selectedUser}
        onBack={() => { setSelectedUser(null); setUsername(''); }}
      />
    );
  }

  return (
    <div style={BG} className="flex flex-col items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center w-full px-[12%] sm:max-w-[340px] sm:px-6 -mt-[344px]">
        <h1 className="text-white font-bold text-[30px] leading-none tracking-[-0.01em] mb-0 select-none">WELCOME</h1>
        <p className="text-[20px] font-normal mb-4 select-none"><span className="text-white">synced.graphics</span><span style={{ color: '#009bff' }}>/admin</span></p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-5 pointer-events-auto">
          <input
            ref={inputRef}
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="Enter your username to continue"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-full px-6 py-[14px] text-white text-[13px] text-center placeholder-white/30 focus:outline-none transition-colors"
            style={{
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.22)',
            }}
          />

          {error && <p className="text-red-400 text-xs pointer-events-none">{error}</p>}

          <button type="submit"
            className="px-16 py-[9px] rounded-full text-black font-bold text-[13px] hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: '#faff05' }}>
            continue
          </button>
        </form>
      </div>

      <p className="absolute bottom-5 right-5 text-white text-xs select-none">© 2026 Synced Graphics</p>
    </div>
  );
}
