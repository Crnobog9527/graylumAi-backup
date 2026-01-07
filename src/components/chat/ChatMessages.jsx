import React, { memo, useState, useCallback, useMemo } from 'react';
import { MessageSquare, Bot, Copy } from 'lucide-react';
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

// Markdown 组件配置 - 提取到外部避免重复创建
const markdownComponents = {
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
};

// 自定义比较函数 - 只在关键属性变化时重新渲染
const areMessageBubblePropsEqual = (prevProps, nextProps) => {
  // 如果是流式传输中，总是需要更新
  if (prevProps.isStreaming !== nextProps.isStreaming) return false;
  if (nextProps.isStreaming) return false;

  // 比较消息内容
  const prevMsg = prevProps.message;
  const nextMsg = nextProps.message;

  // 检查关键字段
  if (prevMsg.role !== nextMsg.role) return false;
  if (prevMsg.content !== nextMsg.content) return false;
  if (prevMsg.text !== nextMsg.text) return false;
  if (prevMsg.timestamp !== nextMsg.timestamp) return false;
  if (prevMsg.credits_used !== nextMsg.credits_used) return false;
  if (prevMsg.input_tokens !== nextMsg.input_tokens) return false;
  if (prevMsg.output_tokens !== nextMsg.output_tokens) return false;

  // 检查附件数量
  const prevAttachments = prevMsg.attachments || [];
  const nextAttachments = nextMsg.attachments || [];
  if (prevAttachments.length !== nextAttachments.length) return false;

  return true;
};

// 用户消息气泡组件
const UserMessageBubble = memo(function UserMessageBubble({ displayContent, attachments, time }) {
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

        {attachments?.length > 0 && (
          <div className="space-y-2">
            {attachments.map((attachment, idx) => (
              <FileAttachmentCard key={idx} attachment={attachment} />
            ))}
          </div>
        )}

        <div className="text-xs text-right mt-1" style={{ color: 'var(--text-disabled)' }}>{time}</div>
      </div>
    </div>
  );
});

// AI 消息操作按钮组
const MessageActions = memo(function MessageActions({ onCopy }) {
  return (
    <div className="flex items-center gap-1 ml-auto">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:opacity-80"
        style={{ color: 'var(--text-tertiary)' }}
        onClick={onCopy}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
});

// Token 使用信息显示
const TokenInfo = memo(function TokenInfo({ creditsUsed, inputTokens, outputTokens }) {
  if (!creditsUsed) return null;

  const title = inputTokens ? `输入: ${inputTokens} tokens, 输出: ${outputTokens} tokens` : '';

  return (
    <span title={title}>
      消耗 {creditsUsed} 积分
      {inputTokens && (
        <span className="ml-1" style={{ color: 'var(--text-disabled)' }}>
          ({inputTokens}+{outputTokens} tokens)
        </span>
      )}
    </span>
  );
});

// 消息气泡组件 - 使用自定义比较函数
const MessageBubble = memo(function MessageBubble({ message, isStreaming }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  // 缓存时间格式化
  const formattedTime = useMemo(() => {
    return message.timestamp ? format(new Date(message.timestamp), 'HH:mm') : '';
  }, [message.timestamp]);

  // 缓存显示内容
  const displayContent = useMemo(() => {
    return isUser
      ? (message.text || message.content || '')
      : filterThinkingContent(message.content);
  }, [isUser, message.text, message.content]);

  // 缓存复制处理函数
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayContent]);

  // 用户消息
  if (isUser) {
    return (
      <UserMessageBubble
        displayContent={displayContent}
        attachments={message.attachments}
        time={formattedTime}
      />
    );
  }

  // AI 空响应
  if (!displayContent) {
    return (
      <div className="flex gap-4 py-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
          <Bot className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="italic" style={{ color: 'var(--text-disabled)' }}>AI 响应内容为空</div>
          <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-disabled)' }}>
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>
    );
  }

  // AI 响应
  return (
    <div className="flex gap-4 py-4">
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
        <Bot className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none prose-invert">
          <ReactMarkdown components={markdownComponents}>
            {displayContent}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-5 animate-pulse ml-1 rounded-sm" style={{ background: 'var(--color-primary)' }} />
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-disabled)' }}>
          <span>{formattedTime}</span>
          <MessageActions onCopy={handleCopy} />
        </div>
      </div>
    </div>
  );
}, areMessageBubblePropsEqual);

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

// 消息列表渲染组件
const MessageList = memo(function MessageList({ messages, isStreaming }) {
  return (
    <>
      {messages.map((message, index) => (
        <MessageBubble
          key={message.timestamp || index}
          message={message}
          isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
        />
      ))}
    </>
  );
});

// 主消息区组件
const ChatMessages = memo(function ChatMessages({
  messages,
  isStreaming,
  user,
  messagesEndRef
}) {
  // 缓存是否显示流式指示器
  const showStreamingIndicator = useMemo(() => {
    return isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'user';
  }, [isStreaming, messages]);

  // 缓存消息是否为空
  const isEmpty = useMemo(() => messages.length === 0, [messages.length]);

  return (
    <div className="flex-1 overflow-hidden relative" style={{ zIndex: 1 }}>
      <ScrollArea className="h-full">
        <div className="max-w-3xl mx-auto py-6 px-4">
          {isEmpty ? (
            <EmptyState />
          ) : (
            <MessageList messages={messages} isStreaming={isStreaming} />
          )}
          {showStreamingIndicator && <StreamingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
});

export default ChatMessages;
export { MessageBubble };