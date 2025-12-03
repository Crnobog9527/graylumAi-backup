import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Image, Upload, Star, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import AdminSidebar from '../components/admin/AdminSidebar';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

const initialFormData = {
  title: '',
  description: '',
  icon: '🎬',
  image_url: '',
  badge_text: '',
  badge_type: 'none',
  card_style: 'light',
  link_module_id: '',
  link_url: '',
  credits_display: '',
  usage_count: 0,
  is_active: true,
  sort_order: 0,
};

function AdminFeaturedContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: featuredModules = [] } = useQuery({
    queryKey: ['admin-featured'],
    queryFn: () => base44.entities.FeaturedModule.list('sort_order'),
    enabled: !!user,
  });

  const { data: promptModules = [] } = useQuery({
    queryKey: ['admin-prompts-for-featured'],
    queryFn: () => base44.entities.PromptModule.filter({ is_active: true }),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FeaturedModule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-featured']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FeaturedModule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-featured']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FeaturedModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-featured']);
      setDeleteDialogOpen(false);
      setSelectedModule(null);
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedModule(null);
  };

  const handleEdit = (module) => {
    setSelectedModule(module);
    setFormData({
      title: module.title || '',
      description: module.description || '',
      icon: module.icon || '🎬',
      image_url: module.image_url || '',
      badge_text: module.badge_text || '',
      badge_type: module.badge_type || 'none',
      card_style: module.card_style || 'light',
      link_module_id: module.link_module_id || '',
      link_url: module.link_url || '',
      credits_display: module.credits_display || '',
      usage_count: module.usage_count || 0,
      is_active: module.is_active !== false,
      sort_order: module.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedModule) {
      updateMutation.mutate({ id: selectedModule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (module) => {
    setSelectedModule(module);
    setDeleteDialogOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminFeatured" />
      
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">置顶模块管理</h1>
            <p className="text-slate-500 mt-1">管理首页展示的置顶功能模块</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            添加置顶
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {featuredModules.map((module) => (
            <Card key={module.id} className="relative overflow-hidden">
              <CardContent className="p-0">
                {/* Preview Card */}
                <div className={`relative min-h-[200px] p-6 ${module.card_style === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
                  {/* Background Image */}
                  {module.image_url && (
                    <div className="absolute inset-0">
                      <img 
                        src={module.image_url} 
                        alt="" 
                        className="w-full h-full object-cover opacity-30"
                      />
                      <div className={`absolute inset-0 ${module.card_style === 'dark' ? 'bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent' : 'bg-gradient-to-r from-white via-white/80 to-transparent'}`} />
                    </div>
                  )}
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${module.card_style === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                        <span className="text-2xl">{module.icon}</span>
                      </div>
                      <h3 className="text-xl font-bold">{module.title}</h3>
                      {module.badge_text && (
                        <Badge variant="secondary" className="text-xs">
                          {module.badge_text}
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm mb-4 ${module.card_style === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {module.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className={`flex gap-3 text-xs ${module.card_style === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {module.credits_display && <span>💎 {module.credits_display}</span>}
                        {module.usage_count > 0 && <span>👤 {module.usage_count}人使用</span>}
                      </div>
                      <Badge variant={module.is_active ? "default" : "secondary"}>
                        {module.is_active ? '已启用' : '已禁用'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border-t">
                  <div className="text-sm text-slate-500">
                    排序: {module.sort_order} | 
                    关联: {module.link_module_id ? promptModules.find(m => m.id === module.link_module_id)?.title || '模块' : '无'}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(module)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(module)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {featuredModules.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              暂无置顶模块，点击上方按钮添加
            </div>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedModule ? '编辑置顶模块' : '添加置顶模块'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>标题</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="AI视频生成器"
                  />
                </div>
                <div className="space-y-2">
                  <Label>图标 (emoji)</Label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🎬"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入文本描述，AI将为您生成精美的视频内容..."
                  rows={2}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>背景图片</Label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="图片URL或上传图片"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <Button variant="outline" disabled={uploading}>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1" />
                      )}
                      上传
                    </Button>
                  </div>
                </div>
                {formData.image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border max-w-xs">
                    <img src={formData.image_url} alt="预览" className="w-full h-24 object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>标签文字</Label>
                  <Input
                    value={formData.badge_text}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    placeholder="新功能"
                  />
                </div>
                <div className="space-y-2">
                  <Label>标签类型</Label>
                  <Select
                    value={formData.badge_type}
                    onValueChange={(value) => setFormData({ ...formData, badge_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="new">新功能</SelectItem>
                      <SelectItem value="hot">热门</SelectItem>
                      <SelectItem value="recommend">推荐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>卡片样式</Label>
                  <Select
                    value={formData.card_style}
                    onValueChange={(value) => setFormData({ ...formData, card_style: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">浅色</SelectItem>
                      <SelectItem value="dark">深色</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>关联功能模块</Label>
                  <Select
                    value={formData.link_module_id}
                    onValueChange={(value) => setFormData({ ...formData, link_module_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择模块" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>不关联</SelectItem>
                      {promptModules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>积分显示</Label>
                  <Input
                    value={formData.credits_display}
                    onChange={(e) => setFormData({ ...formData, credits_display: e.target.value })}
                    placeholder="25积分/次"
                  />
                </div>
                <div className="space-y-2">
                  <Label>使用人数</Label>
                  <Input
                    type="number"
                    value={formData.usage_count}
                    onChange={(e) => setFormData({ ...formData, usage_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>排序</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <Label>启用</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.title}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {selectedModule ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除置顶模块</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除此置顶模块吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(selectedModule?.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function AdminFeatured() {
  return (
    <LanguageProvider>
      <AdminFeaturedContent />
    </LanguageProvider>
  );
}