import React, { memo, useState, useCallback } from 'react';
import { MessageSquare, Bot, Copy, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import FileAttachmentCard from './FileAttachmentCard';

// 过滤掉AI思考过程的函数
function filterThinkingContent(content) {
  if (!content) return content;

  let filtered = content;

  filtered = filtered.replace(/<think>[\s\S]*?<\/think>/gi, '');
  filtered = filtered.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

  filtered = filtered.replace(/\n{3,}/g, '\n\n').trim();

  return filtered || content;
}

// 消息气泡组件
const MessageBubble = memo(function MessageBubble({ message, isStreaming, user }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const time = message.timestamp ? format(new Date(message.timestamp), 'HH:mm') : '';

  const displayContent = isUser ? (message.text || message.content || '') : filterThinkingContent(message.content);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayContent]);

  if (isUser) {
    return (
      <div className="flex justify-end py-4">
        <div className="max-w-[80%] space-y-2">
          {displayContent && (
            <div
              className="rounded-2xl rounded-tr-md px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                color: 'var(--bg-primary)',
              }}
            >
              <p className="whitespace-pre-wrap leading-relaxed font-medium">{displayContent}</p>
            </div>
          )}

          {message.attachments?.length > 0 && (
            <div className="space-y-2">
              {message.attachments.map((attachment, idx) => (
                <FileAttachmentCard key={idx} attachment={attachment} />
              ))}
            </div>
          )}

          <div className="text-xs text-right mt-1" style={{ color: 'var(--text-disabled)' }}>{time}</div>
        </div>
      </div>
    );
  }

  if (!displayContent) {
    return (
      <div className="flex gap-4 py-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
          <Bot className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="italic" style={{ color: 'var(--text-disabled)' }}>AI 响应内容为空</div>
          <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-disabled)' }}>
            <span>{time}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 py-4">
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
        <Bot className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none prose-invert">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</li>,
              strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</strong>,
              pre: ({ children }) => (
                <pre className="p-4 rounded-lg overflow-x-auto my-3 whitespace-pre-wrap" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                  {children}
                </pre>
              ),
              code: ({ inline, className, children }) => {
                if (!inline && className) {
                  return <code className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{children}</code>;
                }
                return (
                  <code className="px-1.5 py-0.5 rounded text-sm font-mono" style={{ background: 'var(--bg-secondary)', color: 'var(--color-primary)' }}>{children}</code>
                );
              },
              h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0" style={{ color: 'var(--text-primary)' }}>{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0" style={{ color: 'var(--text-primary)' }}>{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0" style={{ color: 'var(--text-primary)' }}>{children}</h3>,
            }}
          >
            {displayContent}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-5 animate-pulse ml-1 rounded-sm" style={{ background: 'var(--color-primary)' }} />
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-disabled)' }}>
          <span>{time}</span>
          {message.credits_used && (
            <span title={message.input_tokens ? `输入: ${message.input_tokens} tokens, 输出: ${message.output_tokens} tokens` : ''}>
              消耗 {message.credits_used} 积分
              {message.input_tokens && <span className="ml-1" style={{ color: 'var(--text-disabled)' }}>({message.input_tokens}+{message.output_tokens} tokens)</span>}
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
              onClick={handleCopy}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:opacity-80" style={{ color: 'var(--text-tertiary)' }}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:opacity-80" style={{ color: 'var(--text-tertiary)' }}>
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:opacity-80" style={{ color: 'var(--text-tertiary)' }}>
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

// 加载中指示器
const StreamingIndicator = memo(function StreamingIndicator() {
  return (
    <div className="flex gap-4 py-4">
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
        <Bot className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
      </div>
      <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
        <span className="flex gap-1">
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-primary)', animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-primary)', animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-primary)', animationDelay: '300ms' }} />
        </span>
        <span className="text-sm">AI正在思考中...</span>
      </div>
    </div>
  );
});

// 空状态组件
const EmptyState = memo(function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
        <MessageSquare className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
      </div>
      <h2 className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>开始新对话</h2>
      <p style={{ color: 'var(--text-secondary)' }}>请输入您的问题，AI将为您解答</p>
    </div>
  );
});

// 主消息区组件
const ChatMessages = memo(function ChatMessages({
  messages,
  isStreaming,
  user,
  messagesEndRef
}) {
  return (
    <div className="flex-1 overflow-hidden relative" style={{ zIndex: 1 }}>
      <ScrollArea className="h-full">
        <div className="max-w-3xl mx-auto py-6 px-4">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={index}
                message={message}
                isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                user={user}
              />
            ))
          )}
          {isStreaming && messages[messages.length - 1]?.role === 'user' && (
            <StreamingIndicator />
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
});

export default ChatMessages;
export { MessageBubble };
