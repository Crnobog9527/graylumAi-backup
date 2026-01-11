import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Shield, Bot, FileText, Users, Settings, 
  ChevronLeft, LayoutDashboard, Activity 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import SystemStats from '@/components/admin/SystemStats';
import ModelManagement from '@/components/admin/ModelManagement';
import TemplateManagement from '@/components/admin/TemplateManagement';
import UserManagement from '@/components/admin/UserManagement';
import AIPerformanceMonitor from '@/components/admin/AIPerformanceMonitor';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      if (userData.role !== 'admin') {
        navigate(createPageUrl('Chat'));
      }
    };
    checkAdmin();
  }, [navigate]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Checking admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(createPageUrl('Chat'))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Chat
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-800">Admin Dashboard</h1>
                  <p className="text-xs text-slate-500">Manage your AI platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 p-1 mb-8">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="models"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Bot className="h-4 w-4 mr-2" />
              AI Models
            </TabsTrigger>
            <TabsTrigger 
              value="templates"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger 
              value="users"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="performance"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Activity className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SystemStats />
            
            <div className="grid lg:grid-cols-2 gap-6">
              <ModelManagement />
              <TemplateManagement />
            </div>
          </TabsContent>

          <TabsContent value="models">
            <ModelManagement />
          </TabsContent>

          <TabsContent value="templates">
            <TemplateManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="performance">
            <AIPerformanceMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}