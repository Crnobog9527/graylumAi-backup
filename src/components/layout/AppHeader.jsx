import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import {
  LayoutGrid, Home, User, CreditCard, Bot, LogOut, Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { base44 } from '@/api/base44Client';

export default function AppHeader({ user, isAdmin = false }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { name: '首页', path: 'Home', icon: Home },
    { name: '对话', path: 'Chat', icon: Bot },
    { name: '功能广场', path: 'Marketplace', icon: LayoutGrid },
    { name: '个人中心', path: 'Profile', icon: User }
  ];

  // 管理员页面使用浅色主题
  if (isAdmin) {
    return (
      <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900">Graylum AI</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="pl-2 pr-1 gap-2 rounded-full hover:bg-slate-100">
                    <Avatar className="h-8 w-8 border border-slate-200">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-600">
                        {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link to={createPageUrl('Home')}>
                    <DropdownMenuItem>
                      <Home className="h-4 w-4 mr-2" />
                      返回首页
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => base44.auth.logout()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
    );
  }

  // 深色主题头部
  return (
    <header className="h-16 border-b border-[#1a1a1a] bg-[#050505]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo & Nav */}
        <div className="flex items-center gap-10">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-2 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">Graylum AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPath.includes(item.path) || (item.path === 'Home' && currentPath === '/');
              return (
                <Link key={item.path} to={createPageUrl(item.path)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-[#a3a3a3] hover:text-white hover:bg-white/5 transition-all duration-200",
                      isActive && "text-white bg-white/10"
                    )}
                  >
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden sm:flex items-center px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-sm font-medium gap-2">
                <CreditCard className="h-4 w-4" />
                <span>{user.credits?.toLocaleString() || 0}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="pl-2 pr-1 gap-2 rounded-full hover:bg-white/5">
                    <Avatar className="h-8 w-8 border border-[#2a2a2a]">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-amber-500/20 text-amber-500">
                        {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-[#a3a3a3]">
                      {user.full_name || '用户'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0a] border-[#1a1a1a] text-white">
                  <DropdownMenuLabel className="text-[#a3a3a3]">我的账户</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#1a1a1a]" />
                  <Link to={createPageUrl('Profile')}>
                    <DropdownMenuItem className="text-[#a3a3a3] hover:text-white hover:bg-white/5 focus:bg-white/5 focus:text-white">
                      <User className="h-4 w-4 mr-2" />
                      个人中心
                    </DropdownMenuItem>
                  </Link>
                  <Link to={createPageUrl('Credits')}>
                    <DropdownMenuItem className="text-[#a3a3a3] hover:text-white hover:bg-white/5 focus:bg-white/5 focus:text-white">
                      <CreditCard className="h-4 w-4 mr-2" />
                      充值中心
                    </DropdownMenuItem>
                  </Link>
                  {user.role === 'admin' && (
                    <Link to={createPageUrl('AdminDashboard')}>
                      <DropdownMenuItem className="text-[#a3a3a3] hover:text-white hover:bg-white/5 focus:bg-white/5 focus:text-white">
                        <Settings className="h-4 w-4 mr-2" />
                        管理后台
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator className="bg-[#1a1a1a]" />
                  <DropdownMenuItem 
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300" 
                    onClick={() => base44.auth.logout()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button 
              onClick={() => base44.auth.redirectToLogin()} 
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              登录 / 注册
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}