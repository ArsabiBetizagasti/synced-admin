import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Login from './components/Login';
import { AppHeader, LayoutContent } from './components/Layout';
import BrandPortal from './modules/BrandPortal';

const BG_STYLE = {
  backgroundImage: 'linear-gradient(to bottom, #1a1a1a 0%, #111 55%, #080808 100%)',
  backgroundSize: '100% 100%',
};

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('sg_user');
    const authed = sessionStorage.getItem('sg_auth') === 'true';
    return authed && stored ? stored : null;
  });
  const [activeTab, setActiveTab] = useState('kanban');

  const handleLogin = (userId) => {
    sessionStorage.setItem('sg_auth', 'true');
    sessionStorage.setItem('sg_user', userId);
    setUser(userId);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sg_auth');
    sessionStorage.removeItem('sg_user');
    setUser(null);
  };

  const isTeam = user && !user.startsWith('brand_');

  if (isTeam) {
    return (
      <AppProvider>
        <div className="fixed inset-0 flex flex-col" style={BG_STYLE}>
          {/* Header floats in top margin, 4px above center */}
          <div className="flex-shrink-0 flex items-center px-4 py-3 sm:px-[72px] sm:h-[72px] sm:py-0">
            <div className="w-full sm:-mt-[3px]">
              <AppHeader
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                currentUser={user}
                onLogout={handleLogout}
              />
            </div>
          </div>
          {/* Rectangle with side + bottom margins */}
          <div className="flex-1 flex min-h-0 sm:px-[72px] sm:pb-[72px]">
            <div className="flex-1 bg-black sm:rounded-3xl overflow-hidden flex flex-col"
              style={{ boxShadow: '0 0 0 8px #000, 0 25px 50px -12px rgba(0,0,0,0.8)' }}>
              <LayoutContent activeTab={activeTab} currentUser={user} />
            </div>
          </div>
        </div>
      </AppProvider>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={BG_STYLE}>
      {/* Header outside rectangle */}
      <div className="flex-shrink-0 relative flex items-center justify-center px-4 py-3 sm:px-[72px] sm:h-[72px] sm:py-0">
        <div className="sm:mt-[2px]">
          <span className="text-white font-semibold text-sm">Synced</span>
          <span className="text-sm font-light ml-1" style={{ color: '#faff05' }}>
            {user ? 'Live' : 'Graphics Admin'}
          </span>
        </div>
        {user && (
          <button onClick={handleLogout}
            className="absolute right-4 sm:right-[72px] sm:mt-[2px] text-zinc-600 hover:text-red-400 text-sm transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        )}
      </div>
      {/* Rectangle */}
      <div className="flex-1 flex min-h-0 sm:px-[72px] sm:pb-[72px]">
        <div className="flex-1 bg-black sm:rounded-3xl overflow-hidden flex flex-col"
          style={{ boxShadow: '0 0 0 8px #000, 0 25px 50px -12px rgba(0,0,0,0.8)' }}>
          {!user ? (
            <Login onLogin={handleLogin} />
          ) : (
            <AppProvider>
              <BrandPortal clientId={user.slice(6)} />
            </AppProvider>
          )}
        </div>
      </div>
    </div>
  );
}
