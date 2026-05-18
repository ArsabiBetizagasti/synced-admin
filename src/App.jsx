import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Login from './components/Login';
import { AppHeader, LayoutContent } from './components/Layout';
import BrandPortal from './modules/BrandPortal';

const BG_STYLE = {
  backgroundImage: [
    'radial-gradient(circle, #1c1c1c 1px, transparent 1px)',
    'linear-gradient(to bottom, #141414 0%, #0c0c0c 55%, #060606 100%)',
  ].join(', '),
  backgroundSize: '22px 22px, 100% 100%',
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
            <div className="w-full sm:-mt-[4px]">
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
    <div className="fixed inset-0 sm:p-[72px] flex" style={BG_STYLE}>
      <div className="flex-1 bg-black sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <AppProvider>
            <BrandPortal clientId={user.slice(6)} onLogout={handleLogout} />
          </AppProvider>
        )}
      </div>
    </div>
  );
}
