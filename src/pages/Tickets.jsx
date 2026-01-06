import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Plus, Filter, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusOptions } from '@/constants/ticketConstants';
import { LoadingSpinner, TicketCard } from '@/components/tickets';

export default function Tickets() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', user?.email, statusFilter],
    queryFn: async () => {
      if (!user?.email) return [];
      const filter = { user_email: user.email };
      if (statusFilter !== 'all') {
        filter.status = statusFilter;
      }
      return base44.entities.Ticket.filter(filter, '-created_date');
    },
    enabled: !!user?.email,
  });

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

        {/* Filter */}
        <div
          className="rounded-xl p-4 mb-6 animate-fadeInUp"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            animationDelay: '0.1s'
          }}
        >
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>筛选状态：</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-[180px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <SelectItem value="all">全部</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <LoadingSpinner className="py-20" />
        ) : tickets.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center animate-fadeInUp"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              animationDelay: '0.2s'
            }}
          >
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>暂无工单</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>您还没有创建任何工单</p>
            <Link to={createPageUrl('CreateTicket')}>
              <Button
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                  color: 'var(--bg-primary)'
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                创建第一个工单
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket, index) => (
              <div key={ticket.id} className="animate-fadeInUp" style={{ animationDelay: `${0.1 * (index + 1)}s` }}>
                <TicketCard ticket={ticket} linkTo="TicketDetail" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
