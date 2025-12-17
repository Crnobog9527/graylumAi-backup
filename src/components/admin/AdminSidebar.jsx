import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Bot, Wand2, Package, Users, 
  CreditCard, Settings, ChevronLeft, Shield, Globe, DollarSign, Megaphone, Headphones
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLanguage } from './LanguageContext';

const menuItems = [
  { nameKey: 'dashboard', icon: LayoutDashboard, page: 'AdminDashboard' },
  { nameKey: 'aiModels', icon: Bot, page: 'AdminModels' },
  { nameKey: 'promptModules', icon: Wand2, page: 'AdminPrompts' },
  { nameKey: 'creditPackages', icon: Package, page: 'AdminPackages' },
  { nameKey: 'users', icon: Users, page: 'AdminUsers' },
  { nameKey: 'transactions', icon: CreditCard, page: 'AdminTransactions' },
  { nameKey: 'finance', icon: DollarSign, page: 'AdminFinance' },
  { nameKey: 'announcements', icon: Megaphone, page: 'AdminAnnouncements' },
  { nameKey: 'tickets', icon: Headphones, page: 'AdminTickets' },
  { nameKey: 'settings', icon: Settings, page: 'AdminSettings' },
];

export default function AdminSidebar({ currentPage }) {
  const { language, toggleLanguage, t } = useLanguage();
  
  return (
    <div className="w-64 bg-slate-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">{t('adminPanel')}</h1>
            <p className="text-xs text-slate-400">Manage your platform</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;
          return (
            <Link key={item.page} to={createPageUrl(item.page)}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-11 text-sm font-medium",
                  isActive 
                    ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 hover:text-violet-300" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                {t(item.nameKey)}
              </Button>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800 space-y-2">
        {/* Language Toggle */}
        <Button
          variant="ghost"
          onClick={toggleLanguage}
          className="w-full justify-start gap-3 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <Globe className="h-4 w-4" />
          {language === 'zh' ? 'English' : '中文'}
        </Button>
        
        <Link to={createPageUrl('Chat')}>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('backToApp')}
          </Button>
        </Link>
      </div>
    </div>
  );
}