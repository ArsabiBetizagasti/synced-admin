import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Login from './components/Login';
import Layout from './components/Layout';
import BrandPortal from './modules/BrandPortal';

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('sg_user');
    const authed = sessionStorage.getItem('sg_auth') === 'true';
    return authed && stored ? stored : null;
  });

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

  return (
    <div className="fixed inset-0 bg-[#080808] sm:p-[72px] flex">
      <div className="flex-1 bg-[#0f0f0f] sm:border border-zinc-800/60 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : user.startsWith('brand_') ? (
          <AppProvider>
            <BrandPortal clientId={user.slice(6)} onLogout={handleLogout} />
          </AppProvider>
        ) : (
          <AppProvider>
            <Layout onLogout={handleLogout} currentUser={user} />
          </AppProvider>
        )}
      </div>
    </div>
  );
}
