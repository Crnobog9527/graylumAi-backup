import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, Home, User, Search, Bell, 
  LogOut, Settings, CreditCard, Bot 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { base44 } from '@/api/base44Client';

export default function AppHeader({ user }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { name: '首页', path: 'Home', icon: Home },
    { name: '功能广场', path: 'Marketplace', icon: LayoutGrid },
    { name: '个人中心', path: 'Chat', icon: User }, // Linking to Chat/Profile for now
  ];

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">AI工具平台</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPath.includes(item.path) || (item.path === 'Home' && currentPath === '/');
              return (
                <Link key={item.path} to={createPageUrl(item.path)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50",
                      isActive && "text-indigo-600 bg-indigo-50 font-medium"
                    )}
                  >
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Search - visible on larger screens if not on Marketplace (which has its own search) */}
          {!currentPath.includes('Marketplace') && (
            <div className="hidden lg:flex items-center relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索功能..."
                className="h-9 pl-9 pr-4 rounded-full bg-slate-100 border-none text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all w-64"
              />
            </div>
          )}

          {user ? (
            <>
              <div className="hidden sm:flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium gap-2">
                <CreditCard className="h-4 w-4" />
                <span>{user.credits?.toLocaleString() || 0} 积分</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="pl-2 pr-1 gap-2 rounded-full hover:bg-slate-100">
                    <Avatar className="h-8 w-8 border border-slate-200">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-600">
                        {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-slate-700">
                      {user.full_name || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to={createPageUrl('Credits')}>
                    <DropdownMenuItem>
                      <CreditCard className="h-4 w-4 mr-2" />
                      充值中心
                    </DropdownMenuItem>
                  </Link>
                  {user.role === 'admin' && (
                    <Link to={createPageUrl('AdminDashboard')}>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        管理后台
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => base44.auth.logout()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => base44.auth.redirectToLogin()} className="bg-indigo-600 hover:bg-indigo-700">
              登录 / 注册
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}