import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { AppProvider } from './context/AppContext';
import Login from './components/Login';
import { AppHeader, LayoutContent, WelcomeOverlay } from './components/Layout';
import ClientAdPortal from './modules/ClientAdPortal';
import Mentoria from './modules/Mentoria';

function MentoriaPortal({ onLogout }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#111] flex-shrink-0">
        <span className="text-zinc-700 text-xs uppercase tracking-wider">Solo lectura</span>
        <button onClick={onLogout} className="text-zinc-600 hover:text-white text-xs transition-colors">Salir</button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Mentoria readOnly />
      </div>
    </div>
  );
}

const BG_STYLE = {
  backgroundImage: 'linear-gradient(to bottom, #1a1a1a 0%, #111 55%, #080808 100%)',
  backgroundSize: '100% 100%',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lobby');
  const [showIntro, setShowIntro] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const prevUserRef = useRef(null);

  useEffect(() => {
    // Remove any leftover zoom from previous deploys
    document.documentElement.style.removeProperty('zoom');
    const apply = () => document.documentElement.style.removeProperty('zoom');
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  useEffect(() => {
    // Safety timeout: if Firebase Auth doesn't respond in 7s (e.g. blocked by an
    // extension or corrupted IndexedDB), bail out to the login screen instead of
    // showing a permanent black screen.
    const bail = setTimeout(() => setAuthLoading(false), 7000);

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      clearTimeout(bail);
      if (fbUser) {
        // Extract userId from email: kann@synced.graphics → kann
        const userId = fbUser.email.split('@')[0];
        // Always start on lobby (login or reload)
        if (prevUserRef.current === null && !userId.startsWith('brand_')) {
          setActiveTab('lobby');
        }
        prevUserRef.current = userId;
        setUser(userId);
        if (!userId.startsWith('brand_') && userId !== 'mentor') setShowWelcome(true);
      } else {
        prevUserRef.current = null;
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => { unsub(); clearTimeout(bail); };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    // onAuthStateChanged will set user to null
  };

  // Blank screen while Firebase resolves session (avoids login flash on reload)
  if (authLoading) {
    return <div style={{ position: 'fixed', inset: 0, background: '#080808' }} />;
  }

  if (!user) {
    return <Login />;
  }

  const isTeam = !user.startsWith('brand_') && user !== 'mentor';

  // Mentor → read-only Mentoría portal
  if (user === 'mentor') {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ ...BG_STYLE, paddingTop: 0 }}>
        <div className="flex-1 flex min-h-0 sm:px-[36px] sm:py-[36px]">
          <div className="flex-1 bg-black sm:rounded-3xl overflow-hidden flex flex-col"
            style={{ boxShadow: '0 0 0 8px #000, 0 25px 50px -12px rgba(0,0,0,0.8)' }}>
            <AppProvider currentUser={user}>
              <MentoriaPortal onLogout={handleLogout} />
            </AppProvider>
          </div>
        </div>
      </div>
    );
  }

  // Team user → full app
  if (isTeam) {
    return (
      <AppProvider currentUser={user}>
        {showWelcome && <WelcomeOverlay currentUser={user} onDismiss={() => setShowWelcome(false)} />}
        <div className="fixed inset-0 flex flex-col sm:pt-6" style={BG_STYLE}>
          <div data-app-header className="flex-shrink-0 flex items-center px-4 py-3 sm:pl-[74px] sm:pr-[74px] sm:h-[72px] sm:py-0 bg-[#080808] sm:bg-transparent">
            <div className="w-full sm:-mt-[3px]">
              <AppHeader
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                currentUser={user}
                onLogout={handleLogout}
              />
            </div>
          </div>
          <div className="flex-1 flex min-h-0 sm:px-[72px] sm:pb-[72px]">
            <div className="flex-1 bg-black sm:rounded-3xl overflow-hidden flex flex-col"
              style={{ boxShadow: '0 0 0 8px #000, 0 25px 50px -12px rgba(0,0,0,0.8)' }}>
              <LayoutContent activeTab={activeTab} setActiveTab={setActiveTab} currentUser={user} showIntro={showIntro} onIntroDone={() => setShowIntro(false)} />
            </div>
          </div>
        </div>
      </AppProvider>
    );
  }

  // Brand portal
  const BRAND_BG = {
    ...BG_STYLE,
    paddingTop: 0,
  };
  return (
    <div className="fixed inset-0 flex flex-col" style={BRAND_BG}>
      <div className="flex-1 flex min-h-0 sm:px-[36px] sm:py-[36px]">
        <div className="flex-1 bg-black sm:rounded-3xl overflow-hidden flex flex-col"
          style={{ boxShadow: '0 0 0 8px #000, 0 25px 50px -12px rgba(0,0,0,0.8)' }}>
          <AppProvider currentUser={user}>
            <ClientAdPortal clientId={user.slice(6)} onLogout={handleLogout} />
          </AppProvider>
        </div>
      </div>
    </div>
  );
}
