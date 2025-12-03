import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Package, Star, Crown, Users, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const initialPackageFormData = {
  name: '',
  credits: 100,
  price: 9.99,
  bonus_credits: 0,
  is_popular: false,
  is_active: true,
  sort_order: 0,
};

const initialMembershipFormData = {
  name: '',
  level: 'pro',
  monthly_price: 9.9,
  yearly_price: 99,
  monthly_credits: 1500,
  yearly_credits: 20000,
  monthly_bonus_credits: 0,
  package_discount: 100,
  features: [],
  is_active: true,
  sort_order: 0,
};

const levelLabels = {
  free: '免费会员',
  pro: '进阶会员',
  gold: '黄金会员'
};

const levelColors = {
  free: 'bg-slate-100 text-slate-700',
  pro: 'bg-blue-100 text-blue-700',
  gold: 'bg-amber-100 text-amber-700'
};

function AdminPackagesContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [membershipDeleteOpen, setMembershipDeleteOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [formData, setFormData] = useState(initialPackageFormData);
  const [membershipFormData, setMembershipFormData] = useState(initialMembershipFormData);
  const [featuresText, setFeaturesText] = useState('');
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

  const { data: packages = [] } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => base44.entities.CreditPackage.list('sort_order'),
    enabled: !!user,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['admin-memberships'],
    queryFn: () => base44.entities.MembershipPlan.list('sort_order'),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CreditPackage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      setDeleteDialogOpen(false);
      setSelectedPackage(null);
    },
  });

  // Membership mutations
  const createMembershipMutation = useMutation({
    mutationFn: (data) => base44.entities.MembershipPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-memberships']);
      setMembershipDialogOpen(false);
      resetMembershipForm();
    },
  });

  const updateMembershipMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MembershipPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-memberships']);
      setMembershipDialogOpen(false);
      resetMembershipForm();
    },
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: (id) => base44.entities.MembershipPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-memberships']);
      setMembershipDeleteOpen(false);
      setSelectedMembership(null);
    },
  });

  const resetForm = () => {
    setFormData(initialPackageFormData);
    setSelectedPackage(null);
  };

  const resetMembershipForm = () => {
    setMembershipFormData(initialMembershipFormData);
    setFeaturesText('');
    setSelectedMembership(null);
  };

  const handleEditMembership = (plan) => {
    setSelectedMembership(plan);
    setMembershipFormData({
      name: plan.name || '',
      level: plan.level || 'pro',
      monthly_price: plan.monthly_price || 0,
      yearly_price: plan.yearly_price || 0,
      monthly_credits: plan.monthly_credits || 0,
      yearly_credits: plan.yearly_credits || 0,
      monthly_bonus_credits: plan.monthly_bonus_credits || 0,
      package_discount: plan.package_discount || 100,
      features: plan.features || [],
      is_active: plan.is_active !== false,
      sort_order: plan.sort_order || 0,
    });
    setFeaturesText((plan.features || []).join('\n'));
    setMembershipDialogOpen(true);
  };

  const handleMembershipSubmit = () => {
    const data = {
      ...membershipFormData,
      features: featuresText.split('\n').filter(f => f.trim())
    };
    if (selectedMembership) {
      updateMembershipMutation.mutate({ id: selectedMembership.id, data });
    } else {
      createMembershipMutation.mutate(data);
    }
  };

  const handleEdit = (pkg) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name || '',
      credits: pkg.credits || 100,
      price: pkg.price || 9.99,
      bonus_credits: pkg.bonus_credits || 0,
      is_popular: pkg.is_popular || false,
      is_active: pkg.is_active !== false,
      sort_order: pkg.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedPackage) {
      updateMutation.mutate({ id: selectedPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (pkg) => {
    setSelectedPackage(pkg);
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
      <AdminSidebar currentPage="AdminPackages" />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">积分与会员管理</h1>
          <p className="text-slate-500 mt-1">管理积分套餐和会员等级</p>
        </div>

        <Tabs defaultValue="packages" className="space-y-6">
          <TabsList>
            <TabsTrigger value="packages" className="gap-2">
              <Package className="h-4 w-4" />
              积分加油包
            </TabsTrigger>
            <TabsTrigger value="memberships" className="gap-2">
              <Crown className="h-4 w-4" />
              会员等级
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">积分加油包</h2>
                <p className="text-sm text-slate-500">积分永不过期，可与会员月度积分叠加使用</p>
              </div>
              <Button 
                onClick={() => { resetForm(); setDialogOpen(true); }}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('addPackage')}
              </Button>
            </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('packageName')}</TableHead>
                  <TableHead>{t('credits')}</TableHead>
                  <TableHead>{t('bonusCredits')}</TableHead>
                  <TableHead>{t('price')}</TableHead>
                  <TableHead>$/Credit</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="w-[100px]">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => {
                  const totalCredits = pkg.credits + (pkg.bonus_credits || 0);
                  const pricePerCredit = (pkg.price / totalCredits).toFixed(3);
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100">
                            <Package className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pkg.name}</span>
                            {pkg.is_popular && (
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{pkg.credits.toLocaleString()}</TableCell>
                      <TableCell>
                        {pkg.bonus_credits > 0 ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            +{pkg.bonus_credits}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">${pkg.price}</TableCell>
                      <TableCell className="text-slate-500">${pricePerCredit}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.is_active ? "default" : "secondary"}>
                          {pkg.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(pkg)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(pkg)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {packages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      {t('noPackagesYet')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
            </Card>
          </TabsContent>

          {/* Membership Tab */}
          <TabsContent value="memberships">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">会员等级设置</h2>
                <p className="text-sm text-slate-500">配置不同会员等级的权益和定价</p>
              </div>
              <Button 
                onClick={() => { resetMembershipForm(); setMembershipDialogOpen(true); }}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                <Plus className="h-4 w-4" />
                添加会员等级
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {memberships.map((plan) => (
                <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className={levelColors[plan.level]}>
                        {levelLabels[plan.level]}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditMembership(plan)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-600"
                          onClick={() => { setSelectedMembership(plan); setMembershipDeleteOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">月付</span>
                        <span className="font-medium">${plan.monthly_price}/月 → {plan.monthly_credits?.toLocaleString()} 积分</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">年付</span>
                        <span className="font-medium">${plan.yearly_price}/年 → {plan.yearly_credits?.toLocaleString()} 积分</span>
                      </div>
                      {plan.monthly_bonus_credits > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">月度赠送</span>
                          <span className="font-medium text-emerald-600">+{plan.monthly_bonus_credits} 积分</span>
                        </div>
                      )}
                      {plan.package_discount < 100 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">加油包折扣</span>
                          <span className="font-medium text-blue-600">{plan.package_discount}折</span>
                        </div>
                      )}
                    </div>
                    {plan.features?.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-slate-500 mb-2">权益列表：</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {plan.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-amber-500" />
                              {f}
                            </li>
                          ))}
                          {plan.features.length > 4 && (
                            <li className="text-slate-400">+{plan.features.length - 4} 更多权益...</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {memberships.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center text-slate-500">
                    暂无会员等级，点击上方按钮添加
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Package Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedPackage ? t('editPackage') : t('addPackage')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('packageName')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Starter Pack"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('credits')}</Label>
                  <Input
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('bonusCredits')}</Label>
                  <Input
                    type="number"
                    value={formData.bonus_credits}
                    onChange={(e) => setFormData({ ...formData, bonus_credits: parseInt(e.target.value) })}
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('price')} (USD)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    min={0.01}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('sortOrder')}</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>{t('isPopular')}</Label>
                <Switch
                  checked={formData.is_popular}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{t('active')}</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name || formData.credits < 1}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {selectedPackage ? t('update') : t('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Package Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deletePackage')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deletePackageConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(selectedPackage?.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                {t('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add/Edit Membership Dialog */}
        <Dialog open={membershipDialogOpen} onOpenChange={setMembershipDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedMembership ? '编辑会员等级' : '添加会员等级'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>会员名称</Label>
                  <Input
                    value={membershipFormData.name}
                    onChange={(e) => setMembershipFormData({ ...membershipFormData, name: e.target.value })}
                    placeholder="进阶会员"
                  />
                </div>
                <div className="space-y-2">
                  <Label>等级类型</Label>
                  <Select
                    value={membershipFormData.level}
                    onValueChange={(value) => setMembershipFormData({ ...membershipFormData, level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">免费会员</SelectItem>
                      <SelectItem value="pro">进阶会员</SelectItem>
                      <SelectItem value="gold">黄金会员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-800 mb-2">月付方案</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">月付价格 (USD)</Label>
                    <Input
                      type="number"
                      value={membershipFormData.monthly_price}
                      onChange={(e) => setMembershipFormData({ ...membershipFormData, monthly_price: parseFloat(e.target.value) || 0 })}
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">月度积分</Label>
                    <Input
                      type="number"
                      value={membershipFormData.monthly_credits}
                      onChange={(e) => setMembershipFormData({ ...membershipFormData, monthly_credits: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm font-medium text-amber-800 mb-2">年付方案</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">年付价格 (USD)</Label>
                    <Input
                      type="number"
                      value={membershipFormData.yearly_price}
                      onChange={(e) => setMembershipFormData({ ...membershipFormData, yearly_price: parseFloat(e.target.value) || 0 })}
                      step="1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">年付总积分</Label>
                    <Input
                      type="number"
                      value={membershipFormData.yearly_credits}
                      onChange={(e) => setMembershipFormData({ ...membershipFormData, yearly_credits: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>月度赠送积分</Label>
                  <Input
                    type="number"
                    value={membershipFormData.monthly_bonus_credits}
                    onChange={(e) => setMembershipFormData({ ...membershipFormData, monthly_bonus_credits: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500">每月额外赠送的加油包积分</p>
                </div>
                <div className="space-y-2">
                  <Label>加油包折扣</Label>
                  <Input
                    type="number"
                    value={membershipFormData.package_discount}
                    onChange={(e) => setMembershipFormData({ ...membershipFormData, package_discount: parseInt(e.target.value) || 100 })}
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-slate-500">如95表示95折，100为无折扣</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>会员权益（每行一条）</Label>
                <Textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="对话历史保存1个月&#10;对话记录批量导出&#10;购买加油包享受95折"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label>启用</Label>
                  <Switch
                    checked={membershipFormData.is_active}
                    onCheckedChange={(checked) => setMembershipFormData({ ...membershipFormData, is_active: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>排序</Label>
                  <Input
                    type="number"
                    value={membershipFormData.sort_order}
                    onChange={(e) => setMembershipFormData({ ...membershipFormData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMembershipDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleMembershipSubmit}
                disabled={!membershipFormData.name}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {selectedMembership ? t('update') : t('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Membership Confirmation */}
        <AlertDialog open={membershipDeleteOpen} onOpenChange={setMembershipDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除会员等级</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除此会员等级吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMembershipMutation.mutate(selectedMembership?.id)}
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

export default function AdminPackages() {
  return (
    <LanguageProvider>
      <AdminPackagesContent />
    </LanguageProvider>
  );
}