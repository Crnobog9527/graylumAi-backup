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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">无权访问此页面</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
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

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error('请输入回复内容');
      return;
    }
    addReplyMutation.mutate(replyMessage);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('AdminTickets'))}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回工单列表
          </Button>
        </div>

        {/* Ticket Info & Controls */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-sm font-mono text-slate-500">{ticket.ticket_number}</span>
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{ticket.title}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                <span>用户：{ticket.user_email}</span>
                <span>•</span>
                <span>{categoryMap[ticket.category]}</span>
                <span>•</span>
                <span>创建于 {new Date(ticket.created_date).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>

          {/* Admin Controls */}
          <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">更改状态</label>
              <Select
                value={ticket.status}
                onValueChange={(value) => updateTicketMutation.mutate({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">更改优先级</label>
              <Select
                value={ticket.priority}
                onValueChange={(value) => updateTicketMutation.mutate({ priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">分配给</label>
              <Select
                value={ticket.assigned_to || 'unassigned'}
                onValueChange={(value) => updateTicketMutation.mutate({
                  assigned_to: value === 'unassigned' ? null : value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="未分配" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">未分配</SelectItem>
                  <SelectItem value="simonni@grayscalegroup.cn">simonni@grayscalegroup.cn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">问题描述</h3>
            <p className="text-slate-600 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-900">回复记录</h2>
          <TicketReplyList replies={replies} isAdmin={true} />
        </div>

        {/* Admin Reply Form */}
        {ticket.status !== 'closed' && (
          <TicketReplyForm
            replyMessage={replyMessage}
            setReplyMessage={setReplyMessage}
            onSubmit={handleReplySubmit}
            isPending={addReplyMutation.isPending}
            isAdmin={true}
          />
        )}
      </div>
    </div>
  );
}
