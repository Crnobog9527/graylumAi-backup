import React from 'react';
import { cn } from '@/lib/utils';
import { User, Bot, Copy, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';

export default function ChatMessage({ message, isStreaming }) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className={cn(
      "flex gap-4 py-6",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "shrink-0 h-9 w-9 rounded-xl flex items-center justify-center",
        isUser ? "bg-violet-100" : "bg-slate-100"
      )}>
        {isUser ? (
          <User className="h-5 w-5 text-violet-600" />
        ) : (
          <Bot className="h-5 w-5 text-slate-600" />
        )}
      </div>
      
      <div className={cn(
        "flex-1 max-w-[85%]",
        isUser && "flex justify-end"
      )}>
        <div className={cn(
          "rounded-2xl px-5 py-3.5 relative group",
          isUser 
            ? "bg-violet-600 text-white" 
            : "bg-white border border-slate-200 shadow-sm"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  code: ({ inline, children }) => 
                    inline ? (
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-violet-600">{children}</code>
                    ) : (
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto my-3">
                        <code className="text-sm font-mono">{children}</code>
                      </pre>
                    ),
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-violet-200 pl-4 italic text-slate-600 my-3">{children}</blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-violet-400 animate-pulse ml-1 rounded-sm" />
              )}
            </div>
          )}
          
          {!isUser && !isStreaming && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
        
        {message.credits_used && !isUser && (
          <div className="text-xs text-slate-400 mt-2 ml-2">
            {message.credits_used} credits used
          </div>
        )}
      </div>
    </div>
  );
}