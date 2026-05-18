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
    <div
      className="fixed inset-0 sm:p-[72px] flex"
      style={{
        backgroundImage: [
          'radial-gradient(circle, #141414 1px, transparent 1px)',
          'linear-gradient(to bottom, #0c0c0c 0%, #060606 55%, #000000 100%)',
        ].join(', '),
        backgroundSize: '22px 22px, 100% 100%',
      }}
    >
      <div className="flex-1 bg-black sm:border border-[#111] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
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
