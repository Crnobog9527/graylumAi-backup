import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, AlertCircle, Inbox, Archive, ArrowLeft, Loader2,
  CheckCircle, MessageSquare, Clock, Send, Upload, X, FileText
} from 'lucide-react';
import { format } from 'date-fns';

const categoryOptions = [
  { value: 'technical_support', label: '技术支持' },
  { value: 'feature_request', label: '功能建议' },
  { value: 'bug_report', label: 'Bug反馈' },
  { value: 'account_issue', label: '账户问题' },
  { value: 'other', label: '其他' },
];

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

const statusLabels = {
  pending: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  closed: '已关闭'
};

const statusColors = {
  pending: { bg: 'rgba(234, 179, 8, 0.1)', color: '#EAB308', border: 'rgba(234, 179, 8, 0.3)' },
  in_progress: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
  resolved: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', border: 'rgba(34, 197, 94, 0.3)' },
  closed: { bg: 'rgba(107, 114, 128, 0.1)', color: '#6B7280', border: 'rgba(107, 114, 128, 0.3)' }
};

const categoryMap = {
  technical_support: '技术支持',
  feature_request: '功能建议',
  bug_report: 'Bug反馈',
  account_issue: '账户问题',
  other: '其他'
};

// 工单列表视图
function TicketListView({ tickets, isLoading, onSelectTicket, onCreateNew }) {
  const [activeTab, setActiveTab] = useState('active');

  const activeTickets = tickets.filter(t => t.status !== 'closed');
  const closedTickets = tickets.filter(t => t.status === 'closed');
  const displayTickets = activeTab === 'active' ? activeTickets : closedTickets;

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>我的工单</h3>
        <Button
          onClick={onCreateNew}
          size="sm"
          className="gap-2"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            color: 'var(--bg-primary)'
          }}
        >
          <Plus className="h-4 w-4" />
          创建工单
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: activeTab === 'active' ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
            color: activeTab === 'active' ? 'var(--color-primary)' : 'var(--text-secondary)',
            border: activeTab === 'active' ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid transparent'
          }}
        >
          <Inbox className="h-4 w-4" />
          现有工单
          {activeTickets.length > 0 && (
            <span
              className="px-2 py-0.5 text-xs rounded-full"
              style={{ background: 'rgba(255, 215, 0, 0.2)', color: 'var(--color-primary)' }}
            >
              {activeTickets.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: activeTab === 'closed' ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
            color: activeTab === 'closed' ? 'var(--color-primary)' : 'var(--text-secondary)',
            border: activeTab === 'closed' ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid transparent'
          }}
        >
          <Archive className="h-4 w-4" />
          已关闭
          {closedTickets.length > 0 && (
            <span
              className="px-2 py-0.5 text-xs rounded-full"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
            >
              {closedTickets.length}
            </span>
          )}
        </button>
      </div>

      {/* Ticket List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : displayTickets.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="mb-2" style={{ color: 'var(--text-primary)' }}>
            {activeTab === 'active' ? '暂无现有工单' : '暂无已关闭工单'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {activeTab === 'active' ? '有问题？创建一个工单吧' : '关闭的工单会显示在这里'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayTickets.map((ticket) => {
            const statusStyle = statusColors[ticket.status] || statusColors.pending;
            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket)}
                className="p-4 rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        {ticket.ticket_number}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`
                        }}
                      >
                        {statusLabels[ticket.status]}
                      </span>
                    </div>
                    <h4 className="font-medium mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {ticket.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <span>{categoryMap[ticket.category]}</span>
                      <span>•</span>
                      <span>{format(new Date(ticket.created_date), 'MM-dd HH:mm')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 工单详情视图
function TicketDetailView({ ticket, user, onBack, onTicketUpdate }) {
  const [replyMessage, setReplyMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ['ticket-replies', ticket.id],
    queryFn: () => base44.entities.TicketReply.filter({ ticket_id: ticket.id }, 'created_date'),
    enabled: !!ticket.id,
  });

  const addReplyMutation = useMutation({
    mutationFn: async (message) => {
      await base44.entities.TicketReply.create({
        ticket_id: ticket.id,
        user_email: user.email,
        message,
        is_admin_reply: false
      });
    },
    onSuccess: () => {
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['ticket-replies', ticket.id] });
      toast.success('回复已发送');
    }
  });

  const closeTicketMutation = useMutation({
    mutationFn: () => base44.entities.Ticket.update(ticket.id, {
      status: 'closed',
      resolved_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
      onTicketUpdate();
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

  const statusStyle = statusColors[ticket.status] || statusColors.pending;

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 -ml-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回工单列表
        </Button>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>
                {ticket.ticket_number}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: statusStyle.bg,
                  color: statusStyle.color,
                  border: `1px solid ${statusStyle.border}`
                }}
              >
                {statusLabels[ticket.status]}
              </span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {ticket.title}
            </h2>
            <div className="flex items-center gap-3 text-sm flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
              <span>{categoryMap[ticket.category]}</span>
              <span>•</span>
              <span>创建于 {format(new Date(ticket.created_date), 'yyyy-MM-dd HH:mm')}</span>
            </div>
          </div>
          {ticket.status === 'resolved' && (
            <Button
              onClick={() => closeTicketMutation.mutate()}
              disabled={closeTicketMutation.isPending}
              size="sm"
              style={{
                background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                color: 'white'
              }}
            >
              {closeTicketMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  确认解决
                </>
              )}
            </Button>
          )}
        </div>

        <div className="pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>问题描述</h4>
          <p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
            {ticket.description}
          </p>
        </div>
      </div>

      {/* Replies */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>回复记录</h3>

        {repliesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            暂无回复
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="p-4 rounded-xl"
                style={{
                  background: reply.is_admin_reply ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)',
                  border: `1px solid ${reply.is_admin_reply ? 'rgba(59, 130, 246, 0.2)' : 'var(--border-primary)'}`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: reply.is_admin_reply ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 215, 0, 0.1)',
                      color: reply.is_admin_reply ? '#3B82F6' : 'var(--color-primary)'
                    }}
                  >
                    {reply.is_admin_reply ? '客服回复' : '我的回复'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                    {format(new Date(reply.created_date), 'MM-dd HH:mm')}
                  </span>
                </div>
                <p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                  {reply.message}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Reply Form */}
        {ticket.status !== 'closed' && (
          <form onSubmit={handleReplySubmit} className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <Textarea
              placeholder="输入您的回复..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="mb-3 min-h-[100px]"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={addReplyMutation.isPending || !replyMessage.trim()}
                className="gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                  color: 'var(--bg-primary)'
                }}
              >
                {addReplyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                发送回复
              </Button>
            </div>
          </form>
        )}

        {ticket.status === 'closed' && (
          <div
            className="mt-6 p-4 rounded-xl text-center"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>此工单已关闭</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 创建工单表单
function CreateTicketForm({ user, onBack, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical_support'
  });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error('只支持上传图片文件');
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error('图片大小不能超过5MB');
          continue;
        }
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setAttachments(prev => [...prev, { name: file.name, url: file_url }]);
      }
    } catch (error) {
      toast.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const today = new Date();
      const dateStr = format(today, 'yyyyMMdd');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const ticketNumber = `TK${dateStr}${randomNum}`;

      return base44.entities.Ticket.create({
        ...data,
        ticket_number: ticketNumber,
        user_email: user.email,
        status: 'pending',
        attachments: attachments
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
      toast.success('工单创建成功');
      onSuccess();
    },
    onError: () => {
      toast.error('创建失败，请重试');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('请填写完整信息');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}
    >
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4 -ml-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回工单列表
      </Button>

      <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>创建新工单</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            标题 <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="简要描述您的问题"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              分类
            </label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              优先级
            </label>
            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
              <SelectTrigger style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            问题描述 <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="请详细描述您遇到的问题..."
            className="min-h-[150px]"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            style={{
              background: 'transparent',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-secondary)'
            }}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              color: 'var(--bg-primary)'
            }}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            提交工单
          </Button>
        </div>
      </form>
    </div>
  );
}

// 主组件
export default function TicketsPanel({ user }) {
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'create'
  const [selectedTicket, setSelectedTicket] = useState(null);

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['user-tickets', user?.email],
    queryFn: () => base44.entities.Ticket.list('-created_date'),
    enabled: !!user?.email,
  });

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedTicket(null);
    refetch();
  };

  const handleCreateNew = () => {
    setView('create');
  };

  const handleCreateSuccess = () => {
    setView('list');
    refetch();
  };

  if (view === 'create') {
    return <CreateTicketForm user={user} onBack={handleBack} onSuccess={handleCreateSuccess} />;
  }

  if (view === 'detail' && selectedTicket) {
    return (
      <TicketDetailView
        ticket={selectedTicket}
        user={user}
        onBack={handleBack}
        onTicketUpdate={() => {
          refetch();
          handleBack();
        }}
      />
    );
  }

  return (
    <TicketListView
      tickets={tickets}
      isLoading={isLoading}
      onSelectTicket={handleSelectTicket}
      onCreateNew={handleCreateNew}
    />
  );
}