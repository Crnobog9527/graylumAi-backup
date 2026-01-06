import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Megaphone, RefreshCw, Plus, Pencil, Trash2, Star, GripVertical, Upload, X, Loader2, Bell, Sparkles, Volume2, Wrench, Gift, AlertTriangle, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import AdminSidebar from '../components/admin/AdminSidebar';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

const defaultSettings = {
  // 聊天页面
  chat_billing_hint: { value: '⚡ 按实际Token消耗计费：输入 {input}积分/1K tokens，输出 {output}积分/1K tokens', type: 'string', label: '聊天提示文案', description: '聊天页面底部显示的公告说明' },
  chat_show_model_selector: { value: 'true', type: 'boolean', label: '显示模型选择器', description: '是否在聊天页面顶部显示模型切换按钮' },
  // 首页引导
  home_guide_button_module_id: { value: '', type: 'string', label: '首页引导按钮关联模块', description: '选择"开始分析"按钮点击后跳转的功能模块' },
};

const initialFeaturedForm = {
  title: '',
  description: '',
  icon: '🚀',
  image_url: '',
  badge_text: '',
  badge_type: 'none',
  card_style: 'light',
  link_module_id: '',
  link_url: '',
  credits_display: '',
  usage_count: null,
  is_active: true,
  sort_order: 0,
};

const initialAnnouncementForm = {
  title: '',
  description: '',
  icon: 'Megaphone',
  icon_color: 'text-blue-500',
  tag: '',
  tag_color: 'blue',
  announcement_type: 'homepage',
  banner_style: 'info',
  banner_link: '',
  publish_date: '',
  expire_date: '',
  is_active: true,
  sort_order: 0,
};

const bannerStyles = [
  { value: 'info', label: '信息（蓝色）', class: 'bg-blue-500' },
  { value: 'warning', label: '警告（橙色）', class: 'bg-amber-500' },
  { value: 'success', label: '成功（绿色）', class: 'bg-green-500' },
  { value: 'error', label: '错误（红色）', class: 'bg-red-500' },
  { value: 'promo', label: '促销（金色）', class: 'bg-yellow-500' },
  { value: 'announcement', label: '公告（靛蓝）', class: 'bg-indigo-500' },
];

const announcementIcons = [
  { value: 'Megaphone', label: '公告', icon: Megaphone },
  { value: 'Sparkles', label: '新功能', icon: Sparkles },
  { value: 'Wrench', label: '维护', icon: Wrench },
  { value: 'Gift', label: '优惠', icon: Gift },
  { value: 'Bell', label: '通知', icon: Bell },
  { value: 'AlertTriangle', label: '警告', icon: AlertTriangle },
  { value: 'Info', label: '信息', icon: Info },
  { value: 'Star', label: '推荐', icon: Star },
];

const tagColors = [
  { value: 'blue', label: '蓝色', class: 'bg-blue-100 text-blue-700' },
  { value: 'orange', label: '橙色', class: 'bg-amber-100 text-amber-700' },
  { value: 'green', label: '绿色', class: 'bg-green-100 text-green-700' },
  { value: 'red', label: '红色', class: 'bg-red-100 text-red-700' },
  { value: 'purple', label: '紫色', class: 'bg-purple-100 text-purple-700' },
];

function AdminAnnouncementsContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [featuredDialogOpen, setFeaturedDialogOpen] = useState(false);
  const [editingFeatured, setEditingFeatured] = useState(null);
  const [featuredForm, setFeaturedForm] = useState(initialFeaturedForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState(initialAnnouncementForm);
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

  const { data: savedSettings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
    enabled: !!user,
  });

  const { data: featuredModules = [] } = useQuery({
    queryKey: ['featured-modules'],
    queryFn: () => base44.entities.FeaturedModule.filter({}, 'sort_order'),
    enabled: !!user,
  });

  const { data: promptModules = [] } = useQuery({
    queryKey: ['prompt-modules'],
    queryFn: () => base44.entities.PromptModule.filter({ is_active: true }),
    enabled: !!user,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements-admin'],
    queryFn: () => base44.entities.Announcement.filter({}, 'sort_order'),
    enabled: !!user,
  });

  const createFeaturedMutation = useMutation({
    mutationFn: (data) => base44.entities.FeaturedModule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['featured-modules']);
      toast.success('置顶模块已添加');
    },
  });

  const updateFeaturedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FeaturedModule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['featured-modules']);
      toast.success('置顶模块已更新');
    },
  });

  const deleteFeaturedMutation = useMutation({
    mutationFn: (id) => base44.entities.FeaturedModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['featured-modules']);
      toast.success('置顶模块已删除');
    },
  });

  // 公告管理 mutations
  const createAnnouncementMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements-admin']);
      queryClient.invalidateQueries(['announcements']);
      toast.success('公告已添加');
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Announcement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements-admin']);
      queryClient.invalidateQueries(['announcements']);
      toast.success('公告已更新');
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements-admin']);
      queryClient.invalidateQueries(['announcements']);
      toast.success('公告已删除');
    },
  });

  useEffect(() => {
    const mergedSettings = { ...defaultSettings };
    savedSettings.forEach(s => {
      if (mergedSettings[s.setting_key]) {
        mergedSettings[s.setting_key] = {
          ...mergedSettings[s.setting_key],
          value: s.setting_value,
          id: s.id,
        };
      }
    });
    setSettings(mergedSettings);
  }, [savedSettings]);

  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value, id }) => {
      if (id) {
        return base44.entities.SystemSettings.update(id, { setting_value: value });
      } else {
        return base44.entities.SystemSettings.create({
          setting_key: key,
          setting_value: value,
          setting_type: defaultSettings[key]?.type || 'string',
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['admin-settings']),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(settings).map(([key, data]) => 
        saveSettingMutation.mutateAsync({ key, value: data.value, id: data.id })
      );
      await Promise.all(promises);
      toast.success('保存成功');
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const handleOpenFeaturedDialog = (featured = null) => {
    if (featured) {
      setEditingFeatured(featured);
      setFeaturedForm({
        title: featured.title || '',
        description: featured.description || '',
        icon: featured.icon || '🚀',
        image_url: featured.image_url || '',
        badge_text: featured.badge_text || '',
        badge_type: featured.badge_type || 'none',
        card_style: featured.card_style || 'light',
        link_module_id: featured.link_module_id || '',
        link_url: featured.link_url || '',
        credits_display: featured.credits_display || '',
        usage_count: featured.usage_count ?? null,
        is_active: featured.is_active !== false,
        sort_order: featured.sort_order || 0,
      });
    } else {
      setEditingFeatured(null);
      setFeaturedForm(initialFeaturedForm);
    }
    setFeaturedDialogOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFeaturedForm(prev => ({ ...prev, image_url: file_url }));
      toast.success('图片上传成功');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('图片上传失败');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveFeatured = async () => {
    if (!featuredForm.title.trim()) {
      toast.error('请输入标题');
      return;
    }
    try {
      if (editingFeatured) {
        await updateFeaturedMutation.mutateAsync({ id: editingFeatured.id, data: featuredForm });
      } else {
        await createFeaturedMutation.mutateAsync(featuredForm);
      }
      setFeaturedDialogOpen(false);
    } catch (error) {
      toast.error('保存失败');
    }
  };

  // 公告管理
  const handleOpenAnnouncementDialog = (announcement = null, type = 'homepage') => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setAnnouncementForm({
        title: announcement.title || '',
        description: announcement.description || '',
        icon: announcement.icon || 'Megaphone',
        icon_color: announcement.icon_color || 'text-blue-500',
        tag: announcement.tag || '',
        tag_color: announcement.tag_color || 'blue',
        announcement_type: announcement.announcement_type || 'homepage',
        banner_style: announcement.banner_style || 'info',
        banner_link: announcement.banner_link || '',
        publish_date: announcement.publish_date || '',
        expire_date: announcement.expire_date || '',
        is_active: announcement.is_active !== false,
        sort_order: announcement.sort_order || 0,
      });
    } else {
      setEditingAnnouncement(null);
      setAnnouncementForm({ ...initialAnnouncementForm, announcement_type: type });
    }
    setAnnouncementDialogOpen(true);
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementForm.title.trim()) {
      toast.error('请输入标题');
      return;
    }
    try {
      if (editingAnnouncement) {
        await updateAnnouncementMutation.mutateAsync({ id: editingAnnouncement.id, data: announcementForm });
      } else {
        await createAnnouncementMutation.mutateAsync(announcementForm);
      }
      setAnnouncementDialogOpen(false);
    } catch (error) {
      toast.error('保存失败');
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
      <AdminSidebar currentPage="AdminAnnouncements" />
      
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">公告管理</h1>
            <p className="text-slate-500 mt-1">管理平台公告和提示信息</p>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>

        <div className="space-y-6">
          {/* 全站横幅公告 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-violet-500" />
                    全站横幅公告
                  </CardTitle>
                  <CardDescription>在导航栏下方显示的横幅公告，所有页面可见（用户可关闭）</CardDescription>
                </div>
                <Button onClick={() => handleOpenAnnouncementDialog(null, 'banner')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  添加横幅
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {announcements.filter(a => a.announcement_type === 'banner').length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  暂无横幅公告，点击上方按钮添加
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.filter(a => a.announcement_type === 'banner').map((announcement) => {
                    const styleInfo = bannerStyles.find(s => s.value === announcement.banner_style) || bannerStyles[0];
                    
                    return (
                      <div
                        key={announcement.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-white border-slate-200"
                      >
                        <div className={`w-3 h-10 rounded-full ${styleInfo.class}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{announcement.title}</span>
                            {!announcement.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">已禁用</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 truncate">{announcement.description}</p>
                          {announcement.banner_link && (
                            <p className="text-xs text-blue-500 truncate mt-1">链接: {announcement.banner_link}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenAnnouncementDialog(announcement)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要删除横幅公告"{announcement.title}"吗？此操作无法撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
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
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 首页平台公告 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-500" />
                    首页平台公告
                  </CardTitle>
                  <CardDescription>管理首页显示的平台公告（最多显示3条）</CardDescription>
                </div>
                <Button onClick={() => handleOpenAnnouncementDialog(null, 'homepage')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  添加公告
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {announcements.filter(a => a.announcement_type !== 'banner').length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  暂无公告，点击上方按钮添加
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.filter(a => a.announcement_type !== 'banner').map((announcement) => {
                    const IconComp = announcementIcons.find(i => i.value === announcement.icon)?.icon || Megaphone;
                    const colorInfo = tagColors.find(c => c.value === announcement.tag_color) || tagColors[0];
                    
                    return (
                      <div
                        key={announcement.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-white border-slate-200"
                      >
                        <div className={`p-2 rounded-lg ${colorInfo.class.replace('text-', 'bg-').split(' ')[0].replace('bg-', 'bg-').replace('100', '50')} ${colorInfo.class.split(' ')[1]?.replace('700', '600')}`}>
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{announcement.title}</span>
                            
                            {announcement.tag && (
                              <span className={`text-xs px-2 py-0.5 rounded ${colorInfo.class}`}>
                                {announcement.tag}
                              </span>
                            )}
                            {!announcement.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">已禁用</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 truncate">{announcement.description}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                            {announcement.publish_date && <span>发布: {announcement.publish_date}</span>}
                            {announcement.expire_date && <span>截止: {announcement.expire_date}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenAnnouncementDialog(announcement)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要删除公告"{announcement.title}"吗？此操作无法撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
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
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 功能广场置顶模块 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    功能广场置顶模块
                  </CardTitle>
                  <CardDescription>管理功能广场页面顶部的推荐模块展示</CardDescription>
                </div>
                <Button onClick={() => handleOpenFeaturedDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  添加置顶
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {featuredModules.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  暂无置顶模块，点击上方按钮添加
                </div>
              ) : (
                <div className="space-y-3">
                  {featuredModules.map((featured, index) => (
                    <div
                      key={featured.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        featured.card_style === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-2xl">{featured.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${featured.card_style === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {featured.title}
                          </span>
                          {featured.badge_text && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              featured.badge_type === 'new' ? 'bg-green-100 text-green-600' :
                              featured.badge_type === 'hot' ? 'bg-amber-100 text-amber-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {featured.badge_text}
                            </span>
                          )}
                          {!featured.is_active && (
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">已禁用</span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${featured.card_style === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {featured.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenFeaturedDialog(featured)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除置顶模块"{featured.title}"吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteFeaturedMutation.mutate(featured.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 首页引导设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-500" />
                首页引导设置
              </CardTitle>
              <CardDescription>配置首页"6步打造爆款账号"引导区域</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{settings.home_guide_button_module_id?.label}</Label>
                <p className="text-sm text-slate-500">{settings.home_guide_button_module_id?.description}</p>
                <Select
                  value={settings.home_guide_button_module_id?.value || ''}
                  onValueChange={(v) => updateSetting('home_guide_button_module_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择关联模块" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>默认跳转功能广场</SelectItem>
                    {promptModules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 聊天页面公告 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-violet-500" />
                聊天页面
              </CardTitle>
              <CardDescription>配置聊天页面显示的提示信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 模型选择器开关 */}
              <div className="flex items-center justify-between py-4 border-b border-slate-100">
                <div>
                  <Label className="text-base">{settings.chat_show_model_selector?.label}</Label>
                  <p className="text-sm text-slate-500 mt-1">{settings.chat_show_model_selector?.description}</p>
                </div>
                <Switch
                  checked={settings.chat_show_model_selector?.value === 'true'}
                  onCheckedChange={(checked) => updateSetting('chat_show_model_selector', checked.toString())}
                />
              </div>

              {/* 聊天提示文案 */}
              <div className="space-y-3 pt-4">
                <div>
                  <Label className="text-base">{settings.chat_billing_hint?.label}</Label>
                  <p className="text-sm text-slate-500 mt-1">{settings.chat_billing_hint?.description}</p>
                </div>
                <Textarea
                  value={settings.chat_billing_hint?.value || ''}
                  onChange={(e) => updateSetting('chat_billing_hint', e.target.value)}
                  placeholder="输入聊天提示文案..."
                  className="min-h-[80px]"
                />
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-xs text-slate-500 mb-1">预览效果：</p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {(settings.chat_billing_hint?.value || '')
                      .replace('{input}', '1')
                      .replace('{output}', '5')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 公告编辑弹窗 */}
        <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingAnnouncement ? '编辑公告' : '添加公告'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>标题 *</Label>
                <Input
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="如：系统维护通知"
                />
              </div>

              <div className="space-y-2">
                <Label>描述内容 *</Label>
                <Textarea
                  value={announcementForm.description}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, description: e.target.value })}
                  placeholder="公告详细内容..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>图标</Label>
                  <Select
                    value={announcementForm.icon}
                    onValueChange={(v) => setAnnouncementForm({ ...announcementForm, icon: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {announcementIcons.map((item) => {
                        const IconComp = item.icon;
                        return (
                          <SelectItem key={item.value} value={item.value}>
                            <div className="flex items-center gap-2">
                              <IconComp className="h-4 w-4" />
                              {item.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>标签颜色</Label>
                  <Select
                    value={announcementForm.tag_color}
                    onValueChange={(v) => setAnnouncementForm({ ...announcementForm, tag_color: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tagColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${color.class.split(' ')[0]}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>标签文字</Label>
                <Input
                  value={announcementForm.tag}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, tag: e.target.value })}
                  placeholder="如：新功能、系统公告、限时优惠"
                />
              </div>

              {/* 横幅专属设置 */}
              {announcementForm.announcement_type === 'banner' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>横幅样式</Label>
                      <Select
                        value={announcementForm.banner_style}
                        onValueChange={(v) => setAnnouncementForm({ ...announcementForm, banner_style: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bannerStyles.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${style.class}`} />
                                {style.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>跳转链接（可选）</Label>
                      <Input
                        value={announcementForm.banner_link}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, banner_link: e.target.value })}
                        placeholder="如：/Marketplace 或 https://..."
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>发布日期</Label>
                  <Input
                    type="date"
                    value={announcementForm.publish_date}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, publish_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>过期日期（可选）</Label>
                  <Input
                    type="date"
                    value={announcementForm.expire_date}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, expire_date: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">设置后公告将在此日期后自动隐藏</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>排序</Label>
                  <Input
                    type="number"
                    value={announcementForm.sort_order}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, sort_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={announcementForm.is_active}
                    onCheckedChange={(checked) => setAnnouncementForm({ ...announcementForm, is_active: checked })}
                  />
                  <Label>启用此公告</Label>
                </div>
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>取消</Button>
              <Button onClick={handleSaveAnnouncement} className="bg-violet-600 hover:bg-violet-700">
                {editingAnnouncement ? '更新' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 置顶模块编辑弹窗 */}
        <Dialog open={featuredDialogOpen} onOpenChange={setFeaturedDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFeatured ? '编辑置顶模块' : '添加置顶模块'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>标题 *</Label>
                  <Input
                    value={featuredForm.title}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, title: e.target.value })}
                    placeholder="如：AI视频生成器"
                  />
                </div>
                <div className="space-y-2">
                  <Label>图标</Label>
                  <Input
                    value={featuredForm.icon}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, icon: e.target.value })}
                    placeholder="emoji或图片URL"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={featuredForm.description}
                  onChange={(e) => setFeaturedForm({ ...featuredForm, description: e.target.value })}
                  placeholder="模块功能描述..."
                  rows={2}
                />
              </div>

              {/* 横幅大图上传 */}
              <div className="space-y-2">
                <Label>横幅大图</Label>
                {featuredForm.image_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200">
                    <img 
                      src={featuredForm.image_url} 
                      alt="横幅预览" 
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFeaturedForm(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">点击上传横幅图片</span>
                        <span className="text-xs text-slate-400 mt-1">建议尺寸: 800x200</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>标签文字</Label>
                  <Input
                    value={featuredForm.badge_text}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, badge_text: e.target.value })}
                    placeholder="如：新功能、热门"
                  />
                </div>
                <div className="space-y-2">
                  <Label>标签类型</Label>
                  <Select
                    value={featuredForm.badge_type}
                    onValueChange={(v) => setFeaturedForm({ ...featuredForm, badge_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="new">新功能（绿色）</SelectItem>
                      <SelectItem value="hot">热门（橙色）</SelectItem>
                      <SelectItem value="recommend">推荐（蓝色）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>卡片样式</Label>
                  <Select
                    value={featuredForm.card_style}
                    onValueChange={(v) => setFeaturedForm({ ...featuredForm, card_style: v })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>关联功能模块</Label>
                  <Select
                    value={featuredForm.link_module_id}
                    onValueChange={(v) => {
                      const selectedModule = promptModules.find(m => m.id === v);
                      if (selectedModule) {
                        setFeaturedForm({ 
                          ...featuredForm, 
                          link_module_id: v,
                          title: selectedModule.title || '',
                          description: selectedModule.description || ''
                        });
                      } else {
                        setFeaturedForm({ ...featuredForm, link_module_id: v });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择关联模块" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>不关联</SelectItem>
                      {promptModules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>自定义链接</Label>
                  <Input
                    value={featuredForm.link_url}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, link_url: e.target.value })}
                    placeholder="如未选择模块，使用此链接"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>积分显示</Label>
                  <Input
                    value={featuredForm.credits_display}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, credits_display: e.target.value })}
                    placeholder="如：25积分/次"
                  />
                </div>
                <div className="space-y-2">
                  <Label>使用人数</Label>
                  <Input
                    type="number"
                    value={featuredForm.usage_count || ''}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, usage_count: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="留空则不显示"
                  />
                </div>
                <div className="space-y-2">
                  <Label>排序</Label>
                  <Input
                    type="number"
                    value={featuredForm.sort_order}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, sort_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={featuredForm.is_active}
                  onCheckedChange={(checked) => setFeaturedForm({ ...featuredForm, is_active: checked })}
                />
                <Label>启用此置顶模块</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeaturedDialogOpen(false)}>取消</Button>
              <Button onClick={handleSaveFeatured} className="bg-violet-600 hover:bg-violet-700">
                {editingFeatured ? '更新' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function AdminAnnouncements() {
  return (
    <LanguageProvider>
      <AdminAnnouncementsContent />
    </LanguageProvider>
  );
}