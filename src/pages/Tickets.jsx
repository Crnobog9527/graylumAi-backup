import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Inbox, Archive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner, TicketCard } from '@/components/tickets';

export default function Tickets() {
  const [activeTab, setActiveTab] = useState('active');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Ticket.filter({ user_email: user.email }, '-created_date');
    },
    enabled: !!user?.email,
  });

  // 按状态分类工单
  const activeTickets = tickets.filter(t => t.status !== 'closed');
  const closedTickets = tickets.filter(t => t.status === 'closed');

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* 动态背景 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-32 left-1/3 w-[600px] h-[400px] rounded-full opacity-40 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            animation: 'pulseGlow 15s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-30 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
            animation: 'floatSoft 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,215,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes floatSoft {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, -20px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease forwards;
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-fadeInUp">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>我的工单</h1>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>查看和管理您的支持工单</p>
          </div>
          <Link to={createPageUrl('CreateTicket')}>
            <Button
              className="gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                color: 'var(--bg-primary)'
              }}
            >
              <Plus className="h-4 w-4" />
              创建工单
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <TabsList 
            className="mb-6 p-1 rounded-xl"
            style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-primary)' 
            }}
          >
            <TabsTrigger 
              value="active" 
              className="gap-2 rounded-lg data-[state=active]:text-[var(--bg-primary)]"
              style={{ 
                color: 'var(--text-secondary)',
              }}
            >
              <Inbox className="h-4 w-4" />
              现有工单
              {activeTickets.length > 0 && (
                <span 
                  className="ml-1 px-2 py-0.5 text-xs rounded-full"
                  style={{ 
                    background: 'rgba(255, 215, 0, 0.2)', 
                    color: 'var(--color-primary)' 
                  }}
                >
                  {activeTickets.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="closed" 
              className="gap-2 rounded-lg data-[state=active]:text-[var(--bg-primary)]"
              style={{ 
                color: 'var(--text-secondary)',
              }}
            >
              <Archive className="h-4 w-4" />
              已关闭
              {closedTickets.length > 0 && (
                <span 
                  className="ml-1 px-2 py-0.5 text-xs rounded-full"
                  style={{ 
                    background: 'var(--bg-tertiary)', 
                    color: 'var(--text-tertiary)' 
                  }}
                >
                  {closedTickets.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <LoadingSpinner className="py-20" />
            ) : activeTickets.length === 0 ? (
              <div
                className="rounded-xl p-12 text-center"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>暂无现有工单</h3>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>您还没有进行中的工单</p>
                <Link to={createPageUrl('CreateTicket')}>
                  <Button
                    style={{
                      background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                      color: 'var(--bg-primary)'
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    创建工单
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {activeTickets.map((ticket, index) => (
                  <div key={ticket.id} className="animate-fadeInUp" style={{ animationDelay: `${0.05 * (index + 1)}s` }}>
                    <TicketCard ticket={ticket} linkTo="TicketDetail" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed">
            {isLoading ? (
              <LoadingSpinner className="py-20" />
            ) : closedTickets.length === 0 ? (
              <div
                className="rounded-xl p-12 text-center"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <Archive className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>暂无已关闭工单</h3>
                <p style={{ color: 'var(--text-secondary)' }}>关闭的工单会显示在这里</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {closedTickets.map((ticket, index) => (
                  <div key={ticket.id} className="animate-fadeInUp" style={{ animationDelay: `${0.05 * (index + 1)}s` }}>
                    <TicketCard ticket={ticket} linkTo="TicketDetail" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}