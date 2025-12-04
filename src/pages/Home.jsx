import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import WelcomeBanner from '@/components/home/WelcomeBanner';
import QuickStart from '@/components/home/QuickStart';
import UpdatesSection from '@/components/home/UpdatesSection';
import ModuleCard from '@/components/modules/ModuleCard';

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules', 'featured'],
    queryFn: () => base44.entities.PromptModule.list('-sort_order', 4), // Get top 4
  });

  if (!user) {
    // Assuming Layout handles redirect or waiting for auth, but for Home we might want to show something even if loading
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <WelcomeBanner user={user} />
      
      <QuickStart />
      
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">热门功能推荐</h2>
          <Link 
            to={createPageUrl('Marketplace')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center"
          >
            查看更多功能
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </div>
      
      <UpdatesSection />
    </div>
  );
}