import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Menu, X, Sparkles, Bot } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import ModelSelector from '@/components/chat/ModelSelector';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import TemplateCard from '@/components/chat/TemplateCard';
import CreditDisplay from '@/components/common/CreditDisplay';
import ConversationList from '@/components/common/ConversationList';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: () => base44.entities.AIModel.filter({ is_active: true }, 'sort_order'),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.PromptTemplate.filter({ is_active: true }, 'sort_order'),
  });

  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: () => base44.entities.Conversation.filter(
      { created_by: user?.email, is_archived: false }, 
      '-created_date'
    ),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].model_id);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (conversation) => {
    const msgs = await base44.entities.Message.filter(
      { conversation_id: conversation.id },
      'created_date'
    );
    setMessages(msgs);
    setShowTemplates(false);
  };

  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation);
    setSelectedModel(conversation.model_id);
    await loadMessages(conversation);
    setSidebarOpen(false);
  };

  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setShowTemplates(true);
    setSidebarOpen(false);
  };

  const handleSelectTemplate = async (template) => {
    const currentModel = models.find(m => m.model_id === selectedModel);
    if (!currentModel) {
      toast.error('Please select an AI model first');
      return;
    }

    const totalCost = (template.credits_cost || 0);
    if ((user?.credits || 0) < totalCost) {
      toast.error('Insufficient credits');
      return;
    }

    const conversation = await base44.entities.Conversation.create({
      title: template.title,
      model_id: selectedModel,
      template_id: template.id,
      system_prompt: template.system_prompt,
    });

    setActiveConversation(conversation);
    setShowTemplates(false);
    refetchConversations();

    if (template.starter_message) {
      setMessages([{
        id: 'starter',
        role: 'assistant',
        content: template.starter_message,
        credits_used: 0,
      }]);
    }
  };

  const handleSendMessage = async (content) => {
    if (!selectedModel) {
      toast.error('Please select an AI model');
      return;
    }

    const currentModel = models.find(m => m.model_id === selectedModel);
    if (!currentModel) return;

    const creditCost = currentModel.credits_per_message;
    if ((user?.credits || 0) < creditCost) {
      toast.error('Insufficient credits. Please purchase more.');
      return;
    }

    setIsLoading(true);

    let conversation = activeConversation;
    if (!conversation) {
      conversation = await base44.entities.Conversation.create({
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        model_id: selectedModel,
      });
      setActiveConversation(conversation);
      refetchConversations();
    }

    const userMessage = {
      conversation_id: conversation.id,
      role: 'user',
      content,
      credits_used: 0,
    };
    
    await base44.entities.Message.create(userMessage);
    setMessages(prev => [...prev, { ...userMessage, id: Date.now() }]);

    const contextMessages = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = conversation.system_prompt || 
      "You are a helpful AI assistant. Be concise, accurate, and helpful.";

    const fullPrompt = `${systemPrompt}\n\nConversation history:\n${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${content}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
    });

    const assistantMessage = {
      conversation_id: conversation.id,
      role: 'assistant',
      content: response,
      credits_used: creditCost,
    };

    await base44.entities.Message.create(assistantMessage);
    setMessages(prev => [...prev, { ...assistantMessage, id: Date.now() + 1 }]);

    const newCredits = (user?.credits || 0) - creditCost;
    await base44.auth.updateMe({ credits: newCredits });
    setUser(prev => ({ ...prev, credits: newCredits }));

    await base44.entities.CreditTransaction.create({
      user_email: user.email,
      type: 'usage',
      amount: -creditCost,
      balance_after: newCredits,
      description: `Chat message with ${currentModel.name}`,
      reference_id: conversation.id,
    });

    await base44.entities.Conversation.update(conversation.id, {
      message_count: (conversation.message_count || 0) + 2,
      total_credits_used: (conversation.total_credits_used || 0) + creditCost,
    });

    setIsLoading(false);
  };

  const handleDeleteConversation = async (conv) => {
    await base44.entities.Conversation.delete(conv.id);
    if (activeConversation?.id === conv.id) {
      handleNewChat();
    }
    refetchConversations();
    toast.success('Conversation deleted');
  };

  const handleArchiveConversation = async (conv) => {
    await base44.entities.Conversation.update(conv.id, { is_archived: true });
    if (activeConversation?.id === conv.id) {
      handleNewChat();
    }
    refetchConversations();
    toast.success('Conversation archived');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-50/80 backdrop-blur-xl">
      <div className="p-4 border-b border-slate-200">
        <Button 
          onClick={handleNewChat}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      <div className="p-4 border-b border-slate-200">
        <CreditDisplay credits={user?.credits || 0} compact />
      </div>
      
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversation?.id}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
        onArchive={handleArchiveConversation}
      />
    </div>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 border-r border-slate-200">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-slate-800">AI Assistant</h1>
                <p className="text-xs text-slate-500">
                  {activeConversation?.title || 'Start a new conversation'}
                </p>
              </div>
            </div>
          </div>
          
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            disabled={!!activeConversation}
          />
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          {showTemplates && messages.length === 0 ? (
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto p-6 lg:p-8">
                <div className="text-center mb-10">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
                    <Sparkles className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    How can I help you today?
                  </h2>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Start with a template below or type your own message
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onClick={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              <div className="max-w-3xl mx-auto p-6 lg:p-8 space-y-6">
                {messages.map((message, index) => (
                  <MessageBubble key={message.id || index} message={message} />
                ))}
                {isLoading && (
                  <div className="flex gap-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-100" />
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 lg:p-6 border-t border-slate-100 bg-gradient-to-t from-white to-transparent">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isLoading}
              disabled={!selectedModel}
              placeholder={activeConversation?.system_prompt 
                ? "Continue the conversation..." 
                : "Type your message or select a template above..."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}