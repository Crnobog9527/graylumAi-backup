import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import {
  TicketInfo,
  TicketReplyList,
  TicketReplyForm,
  TicketClosedNotice
} from '@/components/tickets';

export default function TicketDetail() {
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');

  // 获取URL参数
  const urlParams = new URLSearchParams(window.location.search);
  const ticketId = urlParams.get('id');

  // 加载所有数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. 获取用户
        const userData = await base44.auth.me();
        setUser(userData);

        if (!ticketId) {
          setError('无效的工单ID');
          setLoading(false);
          return;
        }

        // 2. 获取工单（RLS会自动验证权限）
        const tickets = await base44.entities.Ticket.filter({ id: ticketId });
        if (tickets.length === 0) {
          setError('工单不存在或无权访问');
          setLoading(false);
          return;
        }
        setTicket(tickets[0]);

        // 3. 获取回复
        const repliesData = await base44.entities.TicketReply.filter(
          { ticket_id: ticketId }, 
          '-created_date'
        );
        setReplies(repliesData);

      } catch (e) {
        console.error('加载数据失败:', e);
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ticketId]);

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
    onSuccess: async () => {
      setReplyMessage('');
      // 重新获取回复
      const repliesData = await base44.entities.TicketReply.filter(
        { ticket_id: ticketId }, 
        '-created_date'
      );
      setReplies(repliesData);
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
    onSuccess: async () => {
      // 重新获取工单
      const tickets = await base44.entities.Ticket.filter({ id: ticketId });
      if (tickets.length > 0) {
        setTicket(tickets[0]);
      }
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

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }} className="mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('Tickets'))}
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