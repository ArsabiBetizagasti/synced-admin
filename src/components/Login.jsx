import React, { useState, useRef, useEffect } from 'react';

const ALL_USERS = {
  'kann':              { id: 'kann',     label: 'Kann',             initials: 'K',  bg: '#faff05', text: '#000', pin: '515051' },
  'jero':              { id: 'jero',     label: 'Jero',             initials: 'J',  bg: '#60a5fa', text: '#000', pin: '882001' },
  'facu':              { id: 'facu',     label: 'Facu',             initials: 'F',  bg: '#a78bfa', text: '#000', pin: '182026' },
  'hollywood browzer': { id: 'brand_c1', label: 'Hollywood Browzer',initials: 'HB', bg: '#f472b6', text: '#000', pin: '012026' },
  '360 optimum':       { id: 'brand_c2', label: '360 Optimum',      initials: '36', bg: '#38bdf8', text: '#000', pin: '032026' },
  'foreshank':         { id: 'brand_c3', label: 'Foreshank',        initials: 'FS', bg: '#34d399', text: '#000', pin: '022026' },
  'adam':              { id: 'brand_c4', label: 'ADAM',             initials: 'AD', bg: '#fb923c', text: '#000', pin: '042026' },
};

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
          setTimeout(() => { setError(false); setPin(''); setChecking(false); }, 900);
        }
      }, 150);
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
    <div className="flex-1 flex flex-col p-4 relative overflow-y-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #faff05, transparent 70%)' }} />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-xs relative z-10 text-center">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-sm mb-8 transition-colors mx-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3"
            style={{ background: user.bg, color: user.text }}>
            {user.initials}
          </div>
          <p className="text-white font-semibold text-xl mb-1">{user.label}</p>
          <p className="text-zinc-500 text-sm mb-8">Enter your 6-digit code</p>

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
            {error && <p className="text-red-400 text-sm">Incorrect code. Try again.</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
              <button key={d} onClick={() => handleDigit(String(d))}
                className="h-16 rounded-2xl bg-[#080808] border border-[#111] text-white text-2xl font-semibold hover:bg-zinc-800 active:scale-95 transition-all select-none">
                {d}
              </button>
            ))}
            <div />
            <button onClick={() => handleDigit('0')}
              className="h-16 rounded-2xl bg-[#080808] border border-[#111] text-white text-2xl font-semibold hover:bg-zinc-800 active:scale-95 transition-all select-none">
              0
            </button>
            <button onClick={handleDelete}
              className="h-16 rounded-2xl bg-[#080808] border border-[#111] text-zinc-400 hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center select-none">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <p className="text-zinc-700 text-xs text-center pb-2 relative z-10">© 2026 Synced Graphics — All rights reserved.</p>
    </div>
  );
}

export default function Login({ onLogin }) {
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
        onSuccess={onLogin}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 relative overflow-y-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #faff05, transparent 70%)' }} />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm relative z-10">
          <div className="bg-[#080808] border border-[#111] rounded-2xl p-8">
            <p className="text-white font-semibold text-center mb-1">Welcome</p>
            <p className="text-zinc-500 text-sm text-center mb-7">Enter your username to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wider">Username</label>
                <input
                  ref={inputRef}
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="e.g. kann, jero, hollywood browzer..."
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-[#080808] border border-[#1a1a1a] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05] transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              <button type="submit"
                className="w-full py-3 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90 active:scale-[0.98] transition-all"
                style={{ background: '#faff05' }}>
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>

      <p className="text-zinc-700 text-xs text-center pb-2 relative z-10">© 2026 Synced Graphics — All rights reserved.</p>
    </div>
  );
}
