import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

import AdminSidebar from '../components/admin/AdminSidebar';
import AIPerformanceMonitor from '../components/admin/AIPerformanceMonitor';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

function AdminPerformanceContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminPerformance" />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{t('performanceTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('performanceSubtitle')}</p>
        </div>

        <AIPerformanceMonitor />
      </div>
    </div>
  );
}

export default function AdminPerformance() {
  return (
    <LanguageProvider>
      <AdminPerformanceContent />
    </LanguageProvider>
  );
}