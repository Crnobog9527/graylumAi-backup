import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Shield } from 'lucide-react';

export default function TicketReplyForm({
  replyMessage,
  setReplyMessage,
  onSubmit,
  isPending,
  isAdmin = false,
  maxLength = 1000
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl p-4"
      style={{
        background: isAdmin ? 'rgba(255, 215, 0, 0.05)' : 'var(--bg-secondary)',
        border: isAdmin ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid var(--border-primary)'
      }}
    >
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        {isAdmin && <Shield className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />}
        {isAdmin ? '管理员回复' : '添加回复'}
      </h3>
      <Textarea
        value={replyMessage}
        onChange={(e) => setReplyMessage(e.target.value)}
        placeholder="输入您的回复..."
        className="mb-3 min-h-[120px]"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-primary)'
        }}
        maxLength={maxLength}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{replyMessage.length}/{maxLength}</span>
        <Button
          type="submit"
          disabled={isPending || !replyMessage.trim()}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            color: 'var(--bg-primary)'
          }}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          发送回复
        </Button>
      </div>
    </form>
  );
}
