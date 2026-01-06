import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  statusOptions,
  priorityOptions,
  categoryOptions,
  categoryMap
} from '@/constants/ticketConstants';
import {
  LoadingSpinner,
  TicketStatusBadge,
  TicketPriorityBadge
} from '@/components/tickets';

export default function AdminTickets() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allTickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: () => base44.entities.Ticket.list('-created_date'),
    enabled: user?.role === 'admin',
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--error)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>无权访问此页面</p>
        </div>
      </div>
    );
  }

  const filteredTickets = allTickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.ticket_number.toLowerCase().includes(query) ||
        ticket.title.toLowerCase().includes(query) ||
        ticket.user_email.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const inputStyle = {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)'
  };

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

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-6 animate-fadeInUp">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>工单管理</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>查看和管理所有用户工单</p>
        </div>

        {/* Filters */}
        <div
          className="rounded-xl p-4 mb-6 space-y-4 animate-fadeInUp"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            animationDelay: '0.1s'
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>筛选：</span>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" style={inputStyle}>
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <SelectItem value="all">全部状态</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]" style={inputStyle}>
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <SelectItem value="all">全部优先级</SelectItem>
                {priorityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]" style={inputStyle}>
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <SelectItem value="all">全部分类</SelectItem>
                {categoryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工单编号、标题或用户邮箱..."
              className="pl-10"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{allTickets.length}</div>
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>总工单数</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
            <div className="text-2xl font-bold text-yellow-400">
              {allTickets.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>待处理</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div className="text-2xl font-bold text-blue-400">
              {allTickets.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>处理中</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <div className="text-2xl font-bold text-green-400">
              {allTickets.filter(t => t.status === 'resolved').length}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>已解决</div>
          </div>
        </div>

        {/* Tickets Table */}
        {isLoading ? (
          <LoadingSpinner className="py-20" />
        ) : filteredTickets.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center animate-fadeInUp"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              animationDelay: '0.3s'
            }}
          >
            <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>未找到工单</h3>
            <p style={{ color: 'var(--text-secondary)' }}>调整筛选条件或搜索关键词</p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden animate-fadeInUp"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              animationDelay: '0.3s'
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-primary)' }}>
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>工单编号</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>标题</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>用户</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>分类</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>状态</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>优先级</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>创建时间</th>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket, index) => (
                    <tr
                      key={ticket.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>{ticket.ticket_number}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ticket.title}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{ticket.user_email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{categoryMap[ticket.category]}</span>
                      </td>
                      <td className="py-3 px-4">
                        <TicketStatusBadge status={ticket.status} />
                      </td>
                      <td className="py-3 px-4">
                        <TicketPriorityBadge priority={ticket.priority} showLabel={false} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                          {new Date(ticket.created_date).toLocaleDateString('zh-CN')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link to={createPageUrl('AdminTicketDetail') + `?id=${ticket.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            查看详情
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
