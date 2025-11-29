import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Bot, Wand2, Package, Users, 
  CreditCard, Settings, ChevronLeft, Shield
} from 'lucide-react';
import { Button } from "@/components/ui/button";

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'AdminDashboard' },
  { name: 'AI Models', icon: Bot, page: 'AdminModels' },
  { name: 'Prompt Modules', icon: Wand2, page: 'AdminPrompts' },
  { name: 'Credit Packages', icon: Package, page: 'AdminPackages' },
  { name: 'Users', icon: Users, page: 'AdminUsers' },
  { name: 'Transactions', icon: CreditCard, page: 'AdminTransactions' },
  { name: 'Settings', icon: Settings, page: 'AdminSettings' },
];

export default function AdminSidebar({ currentPage }) {
  return (
    <div className="w-64 bg-slate-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Admin Panel</h1>
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
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <Link to={createPageUrl('Chat')}>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to App
          </Button>
        </Link>
      </div>
    </div>
  );
}