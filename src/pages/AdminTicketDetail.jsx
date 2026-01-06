import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  statusOptions,
  priorityOptions,
  categoryMap
} from '@/constants/ticketConstants';
import {
  LoadingSpinner,
  TicketStatusBadge,
  TicketPriorityBadge,
  TicketReplyList,
  TicketReplyForm
} from '@/components/tickets';

export default function AdminTicketDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');

  const ticketId = new URLSearchParams(location.search).get('id');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => base44.entities.Ticket.get(ticketId),
    enabled: !!ticketId && user?.role === 'admin',
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: () => base44.entities.TicketReply.filter({ ticket_id: ticketId }, '-created_date'),
    enabled: !!ticketId && user?.role === 'admin',
  });

  const updateTicketMutation = useMutation({
    mutationFn: (data) => base44.entities.Ticket.update(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticketId]);
      toast.success('工单已更新');
    }
  });

  const addReplyMutation = useMutation({
    mutationFn: async (message) => {
      const reply = await base44.entities.TicketReply.create({
        ticket_id: ticketId,
        user_email: user.email,
        message,
        is_admin_reply: true
      });

      await base44.entities.Ticket.update(ticketId, {
        status: ticket.status === 'pending' ? 'in_progress' : ticket.status,
        updated_date: new Date().toISOString()
      });

      return reply;
    },
    onSuccess: () => {
      setReplyMessage('');
      queryClient.invalidateQueries(['ticket-replies', ticketId]);
      queryClient.invalidateQueries(['ticket', ticketId]);
      toast.success('回复已发送');
    }
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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>工单不存在</p>
        </div>
      </div>
    );
  }

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error('请输入回复内容');
      return;
    }
    addReplyMutation.mutate(replyMessage);
  };

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

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-6 animate-fadeInUp">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('AdminTickets'))}
            className="mb-4 -ml-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回工单列表
          </Button>
        </div>

        {/* Ticket Info & Controls */}
        <div
          className="rounded-xl p-6 mb-6 animate-fadeInUp"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            animationDelay: '0.1s'
          }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>{ticket.ticket_number}</span>
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{ticket.title}</h1>
              <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
                <span>用户：{ticket.user_email}</span>
                <span>•</span>
                <span>{categoryMap[ticket.category]}</span>
                <span>•</span>
                <span>创建于 {new Date(ticket.created_date).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>

          {/* Admin Controls */}
          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>更改状态</label>
              <Select
                value={ticket.status}
                onValueChange={(value) => updateTicketMutation.mutate({ status: value })}
              >
                <SelectTrigger style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>更改优先级</label>
              <Select
                value={ticket.priority}
                onValueChange={(value) => updateTicketMutation.mutate({ priority: value })}
              >
                <SelectTrigger style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>分配给</label>
              <Select
                value={ticket.assigned_to || 'unassigned'}
                onValueChange={(value) => updateTicketMutation.mutate({
                  assigned_to: value === 'unassigned' ? null : value
                })}
              >
                <SelectTrigger style={inputStyle}>
                  <SelectValue placeholder="未分配" />
                </SelectTrigger>
                <SelectContent style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                  <SelectItem value="unassigned">未分配</SelectItem>
                  <SelectItem value="simonni@grayscalegroup.cn">simonni@grayscalegroup.cn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>问题描述</h3>
            <p className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{ticket.description}</p>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>回复记录</h2>
          <TicketReplyList replies={replies} isAdmin={true} />
        </div>

        {/* Admin Reply Form */}
        {ticket.status !== 'closed' && (
          <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <TicketReplyForm
              replyMessage={replyMessage}
              setReplyMessage={setReplyMessage}
              onSubmit={handleReplySubmit}
              isPending={addReplyMutation.isPending}
              isAdmin={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
