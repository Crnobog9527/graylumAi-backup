import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import {
  LoadingSpinner,
  TicketInfo,
  TicketReplyList,
  TicketReplyForm,
  TicketClosedNotice
} from '@/components/tickets';

export default function TicketDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  const ticketId = new URLSearchParams(location.search).get('id');

  // 1. 首先获取用户数据
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  // 2. 用户数据加载后再获取工单数据
  const { data: ticket, isLoading: ticketLoading, isError } = useQuery({
    queryKey: ['user-ticket', ticketId, user?.email],
    queryFn: async () => {
      console.log('=== 工单查询调试 ===');
      console.log('ticketId from URL:', ticketId);
      console.log('user.email:', user.email);
      
      // 直接通过ID过滤获取工单（RLS会自动验证权限）
      const tickets = await base44.entities.Ticket.filter({ id: ticketId });
      console.log('查询结果:', tickets);
      
      const found = tickets.length > 0 ? tickets[0] : null;
      console.log('找到匹配工单:', found ? '是' : '否');
      
      setDebugInfo({
        ticketId,
        userEmail: user.email,
        queryResult: tickets,
        found: !!found
      });
      
      return found;
    },
    enabled: !!ticketId && !!user?.email,
    retry: false,
  });

  // 3. 获取回复数据
  const { data: replies = [] } = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: () => base44.entities.TicketReply.filter({ ticket_id: ticketId }, '-created_date'),
    enabled: !!ticketId && !!user,
  });

  const addReplyMutation = useMutation({
    mutationFn: async (message) => {
      const reply = await base44.entities.TicketReply.create({
        ticket_id: ticketId,
        user_email: user.email,
        message,
        is_admin_reply: false
      });

      await base44.entities.Ticket.update(ticketId, {
        updated_date: new Date().toISOString()
      });

      return reply;
    },
    onSuccess: () => {
      setReplyMessage('');
      queryClient.invalidateQueries(['ticket-replies', ticketId]);
      queryClient.invalidateQueries(['ticket', ticketId]);
      toast.success('回复已发送');
    },
    onError: () => {
      toast.error('发送失败，请重试');
    }
  });

  const closeTicketMutation = useMutation({
    mutationFn: () => base44.entities.Ticket.update(ticketId, {
      status: 'closed',
      resolved_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticketId]);
      toast.success('工单已关闭');
    }
  });

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error('请输入回复内容');
      return;
    }
    addReplyMutation.mutate(replyMessage);
  };

  // 等待用户数据加载
  if (userLoading) {
    return <LoadingSpinner />;
  }

  // 等待工单数据加载
  if (ticketLoading) {
    return <LoadingSpinner />;
  }

  if (isError || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center max-w-2xl mx-auto p-6">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }} className="mb-4">工单不存在</p>
          
          {/* 调试信息 */}
          {debugInfo && (
            <div className="text-left p-4 rounded-lg mt-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <h3 className="font-bold mb-2" style={{ color: 'var(--color-primary)' }}>调试信息：</h3>
              <pre className="text-xs overflow-auto" style={{ color: 'var(--text-secondary)' }}>
{JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('Tickets'))}
            className="mt-4"
          >
            返回工单列表
          </Button>
        </div>
      </div>
    );
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

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-6 animate-fadeInUp">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Tickets'))}
            className="mb-4 -ml-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回工单列表
          </Button>
        </div>

        {/* Ticket Info */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <TicketInfo ticket={ticket}>
            {ticket.status === 'resolved' && (
              <Button
                onClick={() => closeTicketMutation.mutate()}
                disabled={closeTicketMutation.isPending}
                style={{
                  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                  color: 'white'
                }}
              >
                {closeTicketMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                确认解决
              </Button>
            )}
          </TicketInfo>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>回复记录</h2>
          <TicketReplyList replies={replies} isAdmin={false} />
        </div>

        {/* Reply Form */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          {ticket.status !== 'closed' ? (
            <TicketReplyForm
              replyMessage={replyMessage}
              setReplyMessage={setReplyMessage}
              onSubmit={handleReplySubmit}
              isPending={addReplyMutation.isPending}
              isAdmin={false}
            />
          ) : (
            <TicketClosedNotice />
          )}
        </div>
      </div>
    </div>
  );
}