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

  const ticketId = new URLSearchParams(location.search).get('id');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => base44.entities.Ticket.get(ticketId),
    enabled: !!ticketId,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: () => base44.entities.TicketReply.filter({ ticket_id: ticketId }, '-created_date'),
    enabled: !!ticketId,
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

  if (isLoading || !user) {
    return <LoadingSpinner />;
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">工单不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Tickets'))}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回工单列表
          </Button>
        </div>

        {/* Ticket Info */}
        <TicketInfo ticket={ticket}>
          {ticket.status === 'resolved' && (
            <Button
              onClick={() => closeTicketMutation.mutate()}
              disabled={closeTicketMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
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

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-900">回复记录</h2>
          <TicketReplyList replies={replies} isAdmin={false} />
        </div>

        {/* Reply Form */}
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
  );
}
