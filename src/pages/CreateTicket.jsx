import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { categoryOptions, priorityOptions } from '@/constants/ticketConstants';
import { LoadingSpinner } from '@/components/tickets';

export default function CreateTicket() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'technical_support'
  });
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data) => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

      const todayTickets = await base44.entities.Ticket.filter({
        created_date: { $gte: today.toISOString().split('T')[0] }
      });

      const nextNum = (todayTickets.length + 1).toString().padStart(3, '0');
      const ticketNumber = `TK${dateStr}${nextNum}`;

      return base44.entities.Ticket.create({
        ...data,
        ticket_number: ticketNumber,
        user_email: user.email,
        status: 'pending'
      });
    },
    onSuccess: (ticket) => {
      toast.success('工单创建成功');
      navigate(createPageUrl('TicketDetail') + `?id=${ticket.id}`);
    },
    onError: () => {
      toast.error('创建失败，请重试');
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return {
            name: file.name,
            url: file_url,
            type: file.type,
            size: file.size
          };
        })
      );
      setAttachments([...attachments, ...uploadedFiles]);
    } catch (error) {
      toast.error('文件上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('请填写标题和问题描述');
      return;
    }

    createTicketMutation.mutate({
      ...formData,
      attachments: attachments.length > 0 ? attachments : undefined
    });
  };

  if (!user) {
    return <LoadingSpinner />;
  }

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

      <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
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
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>创建工单</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>请详细描述您遇到的问题，我们会尽快回复</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl p-6 space-y-6 animate-fadeInUp"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            animationDelay: '0.1s'
          }}
        >
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>工单标题 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请简要描述您的问题"
              className="mt-2"
              style={inputStyle}
              maxLength={100}
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>问题分类 *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="mt-2" style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                {categoryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} style={{ color: 'white' }}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>问题描述 *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请详细描述您遇到的问题，包括具体的场景、步骤和期望结果"
              className="mt-2 min-h-[200px]"
              style={inputStyle}
              maxLength={2000}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{formData.description.length}/2000</p>
          </div>

          {/* Attachments */}
          <div>
            <Label className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>附件（可选）</Label>
            <div className="mt-2">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="file-upload">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  asChild
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <span className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    上传文件
                  </span>
                </Button>
              </label>
              <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>支持图片、PDF、Word文档，单个文件不超过10MB</p>
            </div>

            {/* Attachment List */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(index)}
                      style={{ color: 'var(--text-tertiary)' }}
                      className="hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('Tickets'))}
              className="flex-1"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)'
              }}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={createTicketMutation.isPending}
              className="flex-1"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                color: 'var(--bg-primary)'
              }}
            >
              {createTicketMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交工单'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}