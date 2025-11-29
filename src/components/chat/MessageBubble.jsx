import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";
import { User, Bot, Copy, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MessageBubble({ message }) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm",
        isUser 
          ? "bg-gradient-to-br from-indigo-500 to-purple-600" 
          : "bg-gradient-to-br from-slate-100 to-slate-200"
      )}>
        {isUser 
          ? <User className="h-4 w-4 text-white" />
          : <Bot className="h-4 w-4 text-slate-600" />
        }
      </div>
      
      <div className={cn(
        "flex-1 max-w-[80%] relative",
        isUser ? "flex justify-end" : ""
      )}>
        <div className={cn(
          "rounded-2xl px-5 py-3.5 shadow-sm",
          isUser 
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white" 
            : "bg-white border border-slate-100"
        )}>
          {isUser ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown 
              className={cn(
                "prose prose-sm max-w-none",
                "prose-p:text-slate-700 prose-p:leading-relaxed prose-p:my-2",
                "prose-headings:text-slate-800 prose-headings:font-semibold",
                "prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-indigo-600 prose-code:text-sm",
                "prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:shadow-inner",
                "prose-ul:my-2 prose-li:my-0.5",
                "prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
              )}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        
        {!isUser && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-slate-400" />}
          </Button>
        )}
        
        {message.credits_used > 0 && !isUser && (
          <div className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {message.credits_used} credits used
          </div>
        )}
      </div>
    </div>
  );
}