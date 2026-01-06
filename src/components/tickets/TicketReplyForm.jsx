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
    <form onSubmit={onSubmit} className={isAdmin
      ? "bg-blue-50 rounded-lg border border-blue-200 p-4"
      : "bg-white rounded-lg border border-slate-200 p-4"
    }>
      <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
        {isAdmin && <Shield className="h-4 w-4 text-blue-600" />}
        {isAdmin ? '管理员回复' : '添加回复'}
      </h3>
      <Textarea
        value={replyMessage}
        onChange={(e) => setReplyMessage(e.target.value)}
        placeholder="输入您的回复..."
        className={`mb-3 min-h-[120px] ${isAdmin ? 'bg-white' : ''}`}
        maxLength={maxLength}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{replyMessage.length}/{maxLength}</span>
        <Button
          type="submit"
          disabled={isPending || !replyMessage.trim()}
          className="bg-blue-600 hover:bg-blue-700"
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
