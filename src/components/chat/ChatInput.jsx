import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput({ onSend, disabled, placeholder }) {
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
    if (!message.trim() || disabled) return;
    onSend(message);
    setMessage('');
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100/50 overflow-hidden">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type your message..."}
          disabled={disabled}
          className="min-h-[56px] max-h-[200px] resize-none border-0 focus-visible:ring-0 pr-14 py-4 px-5 text-base placeholder:text-slate-400"
          rows={1}
        />
        <Button
          type="submit"
          disabled={!message.trim() || disabled}
          size="icon"
          className="absolute right-3 bottom-3 h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-slate-400 text-center mt-3">
        Press Enter to send, Shift + Enter for new line
      </p>
    </form>
  );
}