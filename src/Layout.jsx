import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

// 公开页面列表（无需登录即可访问）
const publicPages = ['Landing'];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // 如果已登录用户访问Landing页面，重定向到Home
        if (currentPageName === 'Landing') {
          navigate(createPageUrl('Home'), { replace: true });
        }
      } catch (e) {
        setUser(null);
        // 如果未登录且不是公开页面，重定向到Landing
        if (!publicPages.includes(currentPageName)) {
          navigate(createPageUrl('Landing'), { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [location.pathname, currentPageName, navigate]);

  // 公开页面（Landing）不显示AppHeader，直接渲染内容
  if (currentPageName === 'Landing') {
    return children;
  }

  // 加载中显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 未登录且非公开页面已在useEffect中重定向
  if (!user && !publicPages.includes(currentPageName)) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AppHeader user={user} />
      <main className="animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}