import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Wand2, GripVertical, Bot } from 'lucide-react';
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
  model_id: '',
  platform: '',
  usage_count: 0,
  is_active: true,
  sort_order: 0,
};

function AdminPromptsContent() {
  const { t } = useLanguage();
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

  const { data: models = [] } = useQuery({
    queryKey: ['admin-models'],
    queryFn: () => base44.entities.AIModel.filter({ is_active: true }),
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
      model_id: module.model_id || '',
      platform: module.platform || '',
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
            <h1 className="text-3xl font-bold text-slate-900">{t('promptsTitle')}</h1>
            <p className="text-slate-500 mt-1">{t('promptsSubtitle')}</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('addPrompt')}
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
                    {module.is_active ? t('active') : t('inactive')}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{module.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {module.model_id && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Bot className="h-3 w-3" />
                        {models.find(m => m.id === module.model_id)?.name || '指定模型'}
                      </Badge>
                    )}
                  </div>
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
              {t('noPromptsYet')}
            </div>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedModule ? t('editPrompt') : t('addPrompt')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('title')}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="视频口播稿编写"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('category')}</Label>
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
                <Label>{t('description')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述此模块的功能，如：一键生成专业的视频口播稿，支持多种风格和时长..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('systemPrompt')}</Label>
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
                <Label>{t('userPromptTemplate')}</Label>
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

              <div className="space-y-2">
                <Label>{t('assignedModel')}</Label>
                <Select
                  value={formData.model_id}
                  onValueChange={(value) => setFormData({ ...formData, model_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('useUserModel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>{t('useUserModel')}</SelectItem>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          {model.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  为此模块指定专用模型，留空则使用用户在对话中选择的模型
                </p>
              </div>

              <div className="space-y-2">
                <Label>适用平台</Label>
                <Input
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  placeholder="如：小红书、抖音、公众号等"
                />
                <p className="text-xs text-slate-500">
                  标注此模块适用的平台，留空显示为"通用"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('icon')}</Label>
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
                  <Label>{t('color')}</Label>
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('sortOrder')}</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>使用次数</Label>
                  <Input
                    type="number"
                    value={formData.usage_count}
                    onChange={(e) => setFormData({ ...formData, usage_count: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-500">用户使用后自动增长</p>
                </div>
                <div className="flex items-center justify-between pt-6">
                  <Label>{t('active')}</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.title || !formData.system_prompt}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {selectedModule ? t('update') : t('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deletePrompt')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deletePromptConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(selectedModule?.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                {t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function AdminPrompts() {
  return (
    <LanguageProvider>
      <AdminPromptsContent />
    </LanguageProvider>
  );
}