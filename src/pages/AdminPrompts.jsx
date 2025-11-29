import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Wand2, GripVertical } from 'lucide-react';
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

const categories = [
  { value: 'writing', label: '写作' },
  { value: 'marketing', label: '营销' },
  { value: 'coding', label: '编程' },
  { value: 'analysis', label: '分析' },
  { value: 'creative', label: '创意' },
  { value: 'business', label: '商务' },
  { value: 'other', label: '其他' },
];

const colors = [
  { value: 'violet', label: 'Violet' },
  { value: 'blue', label: 'Blue' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'orange', label: 'Orange' },
  { value: 'pink', label: 'Pink' },
  { value: 'amber', label: 'Amber' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'rose', label: 'Rose' },
];

const icons = [
  { value: 'Sparkles', label: 'Sparkles' },
  { value: 'PenTool', label: 'Pen' },
  { value: 'Video', label: 'Video' },
  { value: 'Megaphone', label: 'Marketing' },
  { value: 'Code', label: 'Code' },
  { value: 'BarChart3', label: 'Chart' },
  { value: 'Lightbulb', label: 'Idea' },
  { value: 'Briefcase', label: 'Business' },
  { value: 'FileText', label: 'Document' },
  { value: 'Palette', label: 'Design' },
  { value: 'Rocket', label: 'Rocket' },
  { value: 'Target', label: 'Target' },
];

const initialFormData = {
  title: '',
  description: '',
  system_prompt: '',
  user_prompt_template: '',
  category: 'writing',
  icon: 'Sparkles',
  color: 'violet',
  credits_multiplier: 1,
  is_active: true,
  sort_order: 0,
};

export default function AdminPrompts() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
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

  const { data: modules = [] } = useQuery({
    queryKey: ['admin-prompts'],
    queryFn: () => base44.entities.PromptModule.list('sort_order'),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PromptModule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-prompts']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PromptModule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-prompts']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PromptModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-prompts']);
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
      system_prompt: module.system_prompt || '',
      user_prompt_template: module.user_prompt_template || '',
      category: module.category || 'writing',
      icon: module.icon || 'Sparkles',
      color: module.color || 'violet',
      credits_multiplier: module.credits_multiplier || 1,
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminPrompts" />
      
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">提示词模块管理</h1>
            <p className="text-slate-500 mt-1">创建和管理预设的AI提示词模块，用户可一键调用</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            添加模块
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card key={module.id} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full bg-${module.color || 'violet'}-500`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${module.color || 'violet'}-100`}>
                      <Wand2 className={`h-5 w-5 text-${module.color || 'violet'}-600`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{module.title}</h3>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {module.category}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant={module.is_active ? "default" : "secondary"}>
                    {module.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{module.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {module.credits_multiplier}x credits
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(module)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(module)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {modules.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              暂无提示词模块，点击上方按钮创建您的第一个模块
            </div>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedModule ? '编辑提示词模块' : '创建提示词模块'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>模块名称</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="视频口播稿编写"
                  />
                </div>
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>功能描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述此模块的功能，如：一键生成专业的视频口播稿，支持多种风格和时长..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>系统提示词（核心约束）</Label>
                <Textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="你是一个专业的视频脚本编写专家。你的任务是帮助用户创作引人入胜的视频口播稿。请注意：1. 专注于视频脚本创作 2. 不处理其他类型的请求 3. 保持专业的创作风格..."
                  rows={8}
                />
                <p className="text-xs text-slate-500">
                  此提示词将约束AI的行为和专业领域。建议包含：角色定位、功能边界、输出格式、禁止事项等。
                </p>
              </div>

              <div className="space-y-2">
                <Label>用户引导模板（可选）</Label>
                <Textarea
                  value={formData.user_prompt_template}
                  onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
                  placeholder="请帮我创作一个关于 [主题] 的视频口播稿，时长约 [X] 分钟..."
                  rows={2}
                />
                <p className="text-xs text-slate-500">
                  提供给用户的输入模板提示，帮助用户更好地使用此模块
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>图标</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {icons.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          {icon.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>颜色</Label>
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData({ ...formData, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full bg-${color.value}-500`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>积分倍率</Label>
                  <Input
                    type="number"
                    value={formData.credits_multiplier}
                    onChange={(e) => setFormData({ ...formData, credits_multiplier: parseFloat(e.target.value) })}
                    min={0.5}
                    max={10}
                    step={0.5}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>排序权重</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <Label>启用状态</Label>
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
                disabled={!formData.title || !formData.system_prompt}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {selectedModule ? '保存修改' : '创建模块'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Prompt Module</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedModule?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(selectedModule?.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}