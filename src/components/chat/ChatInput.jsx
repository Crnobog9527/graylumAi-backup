import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ChatInput({ onSend, isLoading, disabled, placeholder }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={cn(
        "relative flex items-end gap-3 p-4 rounded-2xl border transition-all duration-300",
        "bg-white/80 backdrop-blur-xl shadow-lg",
        disabled 
          ? "border-slate-200 opacity-60" 
          : "border-slate-200 hover:border-indigo-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50"
      )}>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type your message..."}
          disabled={disabled || isLoading}
          className="flex-1 min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent focus:ring-0 focus-visible:ring-0 p-0 text-[15px] placeholder:text-slate-400"
          rows={1}
        />
        
        <Button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          className={cn(
            "h-10 w-10 rounded-xl transition-all duration-300",
            message.trim() && !disabled
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200"
              : "bg-slate-100 text-slate-400"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl">
          <div className="flex items-center gap-2 text-slate-500">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Select a model to start chatting</span>
          </div>
        </div>
      )}
    </form>
  );
}