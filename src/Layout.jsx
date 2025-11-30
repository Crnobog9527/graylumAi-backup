import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        // Not logged in
      }
    };
    checkAuth();
  }, [location.pathname]);

  // Pages that might have their own specific layout or full screen mode
  // For now, we wrap everything with AppHeader for consistency with the request
  // except maybe the login page (handled by platform)
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AppHeader user={user} />
      <main className="animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}