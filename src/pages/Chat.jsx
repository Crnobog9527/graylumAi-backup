import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Menu, X, Coins, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import ModelSelector from '../components/chat/ModelSelector';
import PromptModuleCard from '../components/chat/PromptModuleCard';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import ConversationList from '../components/chat/ConversationList';
import CreditBalance from '../components/credits/CreditBalance';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: () => base44.entities.AIModel.filter({ is_active: true }),
  });

  const { data: promptModules = [] } = useQuery({
    queryKey: ['promptModules'],
    queryFn: () => base44.entities.PromptModule.filter({ is_active: true }, 'sort_order'),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: () => base44.entities.Conversation.filter(
      { created_by: user?.email, is_archived: false },
      '-updated_date'
    ),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createConversationMutation = useMutation({
    mutationFn: (data) => base44.entities.Conversation.create(data),
    onSuccess: () => queryClient.invalidateQueries(['conversations']),
  });

  const updateConversationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Conversation.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['conversations']),
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (data) => setUser(prev => ({ ...prev, ...data })),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditTransaction.create(data),
  });

  const handleStartNewChat = (module = null) => {
    setCurrentConversation(null);
    setMessages([]);
    setSelectedModule(module);
  };

  const handleSelectConversation = async (convId) => {
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
      setCurrentConversation(conv);
      setMessages(conv.messages || []);
      setSelectedModel(conv.model_id);
      setSidebarOpen(false);
    }
  };

  const handleDeleteConversation = async (convId) => {
    await base44.entities.Conversation.delete(convId);
    queryClient.invalidateQueries(['conversations']);
    if (currentConversation?.id === convId) {
      handleStartNewChat();
    }
  };

  const handleArchiveConversation = async (convId) => {
    await updateConversationMutation.mutateAsync({
      id: convId,
      data: { is_archived: true }
    });
    if (currentConversation?.id === convId) {
      handleStartNewChat();
    }
  };

  const handleSendMessage = async (content) => {
    if (!selectedModel || !user) return;
    
    const model = models.find(m => m.id === selectedModel);
    if (!model) return;

    const creditsNeeded = model.credits_per_message * (selectedModule?.credits_multiplier || 1);
    const currentCredits = user.credits || 0;
    
    if (currentCredits < creditsNeeded) {
      alert('Insufficient credits. Please purchase more credits to continue.');
      return;
    }

    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);

    try {
      let systemPrompt = '';
      if (selectedModule) {
        systemPrompt = selectedModule.system_prompt;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt 
          ? `System: ${systemPrompt}\n\nUser: ${content}`
          : content,
      });

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        credits_used: creditsNeeded,
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Deduct credits
      const newBalance = currentCredits - creditsNeeded;
      await updateUserMutation.mutateAsync({
        credits: newBalance,
        total_credits_used: (user.total_credits_used || 0) + creditsNeeded,
      });

      // Create transaction record
      await createTransactionMutation.mutateAsync({
        user_email: user.email,
        type: 'usage',
        amount: -creditsNeeded,
        balance_after: newBalance,
        description: `Chat with ${model.name}${selectedModule ? ` - ${selectedModule.title}` : ''}`,
        model_used: model.name,
        prompt_module_used: selectedModule?.title,
      });

      // Save conversation
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      
      if (currentConversation) {
        await updateConversationMutation.mutateAsync({
          id: currentConversation.id,
          data: {
            messages: updatedMessages,
            total_credits_used: (currentConversation.total_credits_used || 0) + creditsNeeded,
          }
        });
      } else {
        const newConv = await createConversationMutation.mutateAsync({
          title,
          model_id: selectedModel,
          prompt_module_id: selectedModule?.id,
          system_prompt: systemPrompt,
          messages: updatedMessages,
          total_credits_used: creditsNeeded,
        });
        setCurrentConversation(newConv);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(newMessages.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <Button 
          onClick={() => handleStartNewChat()}
          className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <ConversationList
          conversations={conversations}
          selectedId={currentConversation?.id}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onArchive={handleArchiveConversation}
        />
      </ScrollArea>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-72 border-r border-slate-200 bg-white/80 backdrop-blur-xl">
          <SidebarContent />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SidebarContent />
                </SheetContent>
              </Sheet>
              
              <div className="w-48 lg:w-64">
                <ModelSelector
                  models={models}
                  selectedModel={selectedModel}
                  onSelect={setSelectedModel}
                  disabled={isStreaming}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Credits')}>
                <CreditBalance credits={user.credits} compact onBuyClick={() => {}} />
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-violet-100 text-violet-600">
                        {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="font-medium text-sm">{user.full_name || 'User'}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <Link to={createPageUrl('Credits')}>
                    <DropdownMenuItem>
                      <Coins className="h-4 w-4 mr-2" />
                      Buy Credits
                    </DropdownMenuItem>
                  </Link>
                  {user.role === 'admin' && (
                    <Link to={createPageUrl('AdminDashboard')}>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => base44.auth.logout()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {messages.length === 0 ? (
              /* Welcome Screen */
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-slate-900 mb-3">
                      Welcome to AI Chat
                    </h1>
                    <p className="text-lg text-slate-500">
                      Choose a quick action or start a free conversation
                    </p>
                  </div>

                  <Tabs defaultValue="modules" className="w-full">
                    <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                      <TabsTrigger value="modules">Quick Actions</TabsTrigger>
                      <TabsTrigger value="free">Free Chat</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="modules">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {promptModules.map((module) => (
                          <PromptModuleCard
                            key={module.id}
                            module={module}
                            onClick={() => handleStartNewChat(module)}
                            isSelected={selectedModule?.id === module.id}
                          />
                        ))}
                      </div>
                      {promptModules.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          <p>No prompt modules available yet.</p>
                          <p className="text-sm mt-1">Admins can add them from the dashboard.</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="free">
                      <div className="max-w-2xl mx-auto">
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                          <div className="p-4 rounded-full bg-violet-100 w-fit mx-auto mb-4">
                            <Plus className="h-8 w-8 text-violet-600" />
                          </div>
                          <h3 className="text-xl font-semibold text-slate-800 mb-2">
                            Start a Free Conversation
                          </h3>
                          <p className="text-slate-500 mb-6">
                            Chat freely with the AI without any predefined prompts
                          </p>
                          <Button 
                            onClick={() => handleStartNewChat()}
                            className="bg-violet-600 hover:bg-violet-700"
                          >
                            Start Chatting
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            ) : (
              /* Messages */
              <ScrollArea className="flex-1 px-4 lg:px-6">
                <div className="max-w-3xl mx-auto py-6">
                  {selectedModule && (
                    <div className="mb-6 p-4 rounded-xl bg-violet-50 border border-violet-200">
                      <p className="text-sm text-violet-600 font-medium">
                        Using: {selectedModule.title}
                      </p>
                    </div>
                  )}
                  {messages.map((message, index) => (
                    <ChatMessage 
                      key={index} 
                      message={message} 
                      isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}

            {/* Input Area */}
            <div className="p-4 lg:p-6 bg-gradient-to-t from-white to-transparent">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={isStreaming || !selectedModel}
                  placeholder={
                    selectedModule 
                      ? `Ask about ${selectedModule.title.toLowerCase()}...`
                      : "Type your message..."
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}