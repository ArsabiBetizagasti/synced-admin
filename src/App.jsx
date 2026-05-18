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

  if (!user) return <Login onLogin={handleLogin} />;

  if (user.startsWith('brand_')) {
    const clientId = user.slice(6);
    return <BrandPortal clientId={clientId} onLogout={handleLogout} />;
  }

  return (
    <AppProvider>
      <Layout onLogout={handleLogout} currentUser={user} />
    </AppProvider>
  );
}
