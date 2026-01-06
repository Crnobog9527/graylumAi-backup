import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import {
  LayoutGrid, Home, User, Search, Bell,
  LogOut, Settings, CreditCard, Bot, Sparkles } from
'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { base44 } from '@/api/base44Client';

export default function AppHeader({ user }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
  { name: '首页', path: 'Home', icon: Home },
  { name: '对话', path: 'Chat', icon: Bot },
  { name: '功能广场', path: 'Marketplace', icon: LayoutGrid },
  { name: '个人中心', path: 'Profile', icon: User }];


  return (
    <header
      className="h-16 border-b sticky top-0 z-50 backdrop-blur-xl"
      style={{
        background: 'rgba(10, 10, 10, 0.95)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* 顶部金色装饰线 */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--color-primary) 50%, transparent 100%)',
          opacity: 0.6,
        }}
      />

      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link to={createPageUrl('Home')} className="flex items-center group">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692afcdbb00f0dc8d8ad66eb/225fd6b2d_image.png"
              alt="Graylum AI"
              className="h-9 transition-all duration-300 group-hover:scale-105"
              style={{ filter: 'brightness(1.05)' }}
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPath.includes(item.path) || item.path === 'Home' && currentPath === '/';
              const Icon = item.icon;
              return (
                <Link key={item.path} to={createPageUrl(item.path)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "relative px-4 py-2 transition-all duration-300 gap-2",
                      isActive ? "font-medium" : ""
                    )}
                    style={{
                      color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                      background: isActive ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'var(--color-primary)';
                        e.currentTarget.style.background = 'rgba(255, 215, 0, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
                        }}
                      />
                    )}
                  </Button>
                </Link>);

            })}
          </nav>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {user ?
          <>
              <div
                className="hidden sm:flex items-center px-3 py-1.5 rounded-full text-sm font-medium gap-2 transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.1) 100%)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  color: 'var(--color-primary)',
                }}
              >
                <Sparkles className="h-4 w-4" />
                <span>{user.credits?.toLocaleString() || 0} 积分</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="pl-2 pr-2 gap-2 rounded-full transition-all duration-300"
                    style={{
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Avatar
                      className="h-8 w-8 ring-2 transition-all duration-300"
                      style={{
                        '--tw-ring-color': 'rgba(255, 215, 0, 0.5)',
                      }}
                    >
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback
                        style={{
                          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                          color: 'var(--bg-primary)',
                          fontWeight: 600,
                        }}
                      >
                        {user.nickname?.[0] || user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className="hidden sm:inline text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {user.nickname || user.full_name || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 border"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <DropdownMenuLabel style={{ color: 'var(--text-primary)' }}>我的账户</DropdownMenuLabel>
                  <DropdownMenuSeparator style={{ background: 'var(--border-primary)' }} />
                  <Link to={createPageUrl('Profile')}>
                    <DropdownMenuItem
                      className="cursor-pointer transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <User className="h-4 w-4 mr-2" />
                      个人中心
                    </DropdownMenuItem>
                  </Link>
                  <Link to={createPageUrl('Credits')}>
                    <DropdownMenuItem
                      className="cursor-pointer transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      充值中心
                    </DropdownMenuItem>
                  </Link>
                  {user.role === 'admin' &&
                <Link to={createPageUrl('AdminDashboard')}>
                      <DropdownMenuItem
                        className="cursor-pointer transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                          e.currentTarget.style.color = 'var(--color-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        管理后台
                      </DropdownMenuItem>
                    </Link>
                }
                  <DropdownMenuSeparator style={{ background: 'var(--border-primary)' }} />
                  <DropdownMenuItem
                    className="cursor-pointer transition-colors"
                    style={{ color: '#ef4444' }}
                    onClick={() => base44.auth.logout(createPageUrl('Landing'))}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </> :

          <Button
            onClick={() => base44.auth.redirectToLogin()}
            className="font-medium transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              color: 'var(--bg-primary)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
            }}
          >
              登录 / 注册
            </Button>
          }
        </div>
      </div>
    </header>);

}