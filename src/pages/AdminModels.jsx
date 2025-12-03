import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Bot, Sparkles, Brain, Zap, Check, X, FlaskConical, Loader2, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const providerIcons = {
  anthropic: Sparkles,
  google: Brain,
  openai: Zap,
  custom: Bot,
  builtin: Zap
};

const initialFormData = {
  name: '',
  model_id: '',
  provider: 'anthropic',
  api_key: '',
  api_endpoint: '',
  is_active: true,
  description: '',
  max_tokens: 4096,
  input_limit: 180000,
  enable_web_search: false,
  input_token_cost: 0,
  output_token_cost: 0,
  input_token_cost_above_200k: 0,
  output_token_cost_above_200k: 0,
};

function AdminModelsContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingModel, setTestingModel] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
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

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['admin-models'],
    queryFn: () => base44.entities.AIModel.list(),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AIModel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-models']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AIModel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-models']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AIModel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-models']);
      setDeleteDialogOpen(false);
      setSelectedModel(null);
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedModel(null);
  };

  const handleEdit = (model) => {
    setSelectedModel(model);
    setFormData({
      name: model.name || '',
      model_id: model.model_id || '',
      provider: model.provider || 'anthropic',
      api_key: model.api_key || '',
      api_endpoint: model.api_endpoint || '',
      is_active: model.is_active !== false,
      description: model.description || '',
      max_tokens: model.max_tokens || 4096,
      input_limit: model.input_limit || 180000,
      enable_web_search: model.enable_web_search || false,
      input_token_cost: model.input_token_cost || 0,
      output_token_cost: model.output_token_cost || 0,
      input_token_cost_above_200k: model.input_token_cost_above_200k || 0,
      output_token_cost_above_200k: model.output_token_cost_above_200k || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedModel) {
      updateMutation.mutate({ id: selectedModel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (model) => {
    setSelectedModel(model);
    setDeleteDialogOpen(true);
  };

  const handleTest = async (model) => {
    setTestingModel(model);
    setTestResult(null);
    setTestDialogOpen(true);
    setIsTesting(true);

    try {
      // 生成测试消息，模拟接近 input_limit 的场景
      const inputLimit = model.input_limit || 180000;
      const maxTokens = model.max_tokens || 4096;
      
      // 创建一个较大的测试消息来验证截断功能
      const testContent = '测试消息内容。'.repeat(100);
      const testMessages = [
        { role: 'user', content: `这是一个API测试请求，请简短回复"测试成功"。附加内容: ${testContent}` }
      ];

      const { data: result } = await base44.functions.invoke('callAIModel', {
        model_id: model.id,
        messages: testMessages,
        system_prompt: '你是一个测试助手，请简短回复。'
      });

      if (result.error) {
        setTestResult({
          success: false,
          error: result.error,
          inputLimit,
          maxTokens
        });
      } else {
        setTestResult({
          success: true,
          response: result.response?.substring(0, 200) + (result.response?.length > 200 ? '...' : ''),
          inputLimit,
          maxTokens,
          usage: result.usage || null,
          modelVersion: result.modelVersion || result.model || null
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
        inputLimit: model.input_limit || 180000,
        maxTokens: model.max_tokens || 4096
      });
    } finally {
      setIsTesting(false);
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
      <AdminSidebar currentPage="AdminModels" />
      
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{t('modelsTitle')}</h1>
                <p className="text-slate-500 mt-1">{t('modelsSubtitle')}</p>
              </div>
              <Button 
                onClick={() => { resetForm(); setDialogOpen(true); }}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('addModel')}
              </Button>
            </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('displayName')}</TableHead>
                  <TableHead>{t('provider')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="w-[100px]">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => {
                  const Icon = providerIcons[model.provider] || Bot;
                  return (
                    <TableRow key={model.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-100">
                            <Icon className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium">{model.name}</p>
                            <p className="text-sm text-slate-500">{model.model_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {model.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={model.is_active ? "default" : "secondary"}>
                          {model.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTest(model)}
                            title={t('testModel')}
                          >
                            <FlaskConical className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(model)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(model)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {models.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                      {t('noModelsYet')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedModel ? t('editModel') : t('addModel')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('displayName')}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Claude 4.5 Sonnet"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('modelId')}</Label>
                  <Input
                    value={formData.model_id}
                    onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                    placeholder="claude-4.5-sonnet"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('provider')}</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="google">Google (Gemini)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="builtin">内置 (支持联网)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('apiKey')}</Label>
                <Input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="sk-..."
                />
              </div>

              <div className="space-y-2">
                <Label>{t('apiEndpoint')}</Label>
                <Input
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  placeholder="https://api.example.com/v1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('maxTokens')}</Label>
                  <Input
                    type="number"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                    min={256}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('inputLimit')}</Label>
                  <Input
                    type="number"
                    value={formData.input_limit}
                    onChange={(e) => setFormData({ ...formData, input_limit: parseInt(e.target.value) || 180000 })}
                    min={1000}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('description')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the model..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{t('active')}</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div>
                  <Label className="text-blue-900">{t('enableWebSearch')}</Label>
                  <p className="text-xs text-blue-600 mt-0.5">{t('webSearchNote')}</p>
                </div>
                <Switch
                  checked={formData.enable_web_search}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_web_search: checked })}
                />
              </div>

              {/* Token 成本设置 */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 space-y-4">
                <Label className="text-amber-900 font-medium">{t('tokenCostSettings')}</Label>
                
                {/* ≤200K tokens 区间 */}
                <div className="space-y-2">
                  <p className="text-xs text-amber-800 font-medium">≤ 200K tokens</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-amber-700">{t('inputTokenCost')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.input_token_cost}
                        onChange={(e) => setFormData({ ...formData, input_token_cost: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-9"
                      />
                      <p className="text-xs text-amber-600">$/1M tokens</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-amber-700">{t('outputTokenCost')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.output_token_cost}
                        onChange={(e) => setFormData({ ...formData, output_token_cost: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-9"
                      />
                      <p className="text-xs text-amber-600">$/1M tokens</p>
                    </div>
                  </div>
                </div>

                {/* >200K tokens 区间 */}
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <p className="text-xs text-amber-800 font-medium">&gt; 200K tokens</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-amber-700">{t('inputTokenCost')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.input_token_cost_above_200k}
                        onChange={(e) => setFormData({ ...formData, input_token_cost_above_200k: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-9"
                      />
                      <p className="text-xs text-amber-600">$/1M tokens</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-amber-700">{t('outputTokenCost')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.output_token_cost_above_200k}
                        onChange={(e) => setFormData({ ...formData, output_token_cost_above_200k: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-9"
                      />
                      <p className="text-xs text-amber-600">$/1M tokens</p>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name || !formData.model_id}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {selectedModel ? t('update') : t('create')}
              </Button>
              </DialogFooter>
              </DialogContent>
              </Dialog>

              {/* Test Dialog */}
              <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FlaskConical className="h-5 w-5 text-blue-600" />
                      {t('testModel')} - {testingModel?.name}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    {/* 配置信息 */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-500">{t('maxTokens')}</p>
                        <p className="font-medium">{testingModel?.max_tokens || 4096}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{t('inputLimit')}</p>
                        <p className="font-medium">{(testingModel?.input_limit || 180000).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* 测试状态 */}
                    {isTesting && (
                      <div className="flex items-center justify-center gap-3 py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="text-slate-600">{t('testingInProgress')}</span>
                      </div>
                    )}

                    {/* 测试结果 */}
                    {testResult && !isTesting && (
                      <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {testResult.success ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-red-600" />
                          )}
                          <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                            {testResult.success ? t('testSuccess') : t('testFailed')}
                          </span>
                        </div>
                        
                        {testResult.success ? (
                          <div className="space-y-2 text-sm">
                            <p className="text-green-700">{t('testResponsePreview')}:</p>
                            <p className="text-slate-600 bg-white p-2 rounded border">{testResult.response}</p>
                            {testResult.usage && (
                              <div className="text-xs text-slate-500 mt-2">
                                Tokens: {testResult.usage.prompt_tokens} (input) / {testResult.usage.completion_tokens} (output)
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-red-700">{testResult.error}</p>
                        )}
                      </div>
                    )}

                    {/* 核心代码展示 */}
                    {testResult?.success && (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowCode(!showCode)}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Code className="h-4 w-4" />
                          {t('viewImplementationCode')}
                          {showCode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        
                        {showCode && (
                          <div className="mt-3 p-3 bg-slate-900 rounded-lg overflow-auto max-h-64">
                            <pre className="text-xs text-slate-300 whitespace-pre-wrap">
{`// ========== 上下文阈值 (input_limit) ==========
// Token 估算函数
const estimateTokens = (text) => Math.ceil((text || '').length / 4);

// 截断历史记录，保持在安全阈值内
const truncateMessages = (msgs, sysPrompt, maxTokens) => {
  let truncatedMsgs = [...msgs];
  let totalTokens = calculateTotalTokens(truncatedMsgs, sysPrompt);
  
  // 当超过阈值时，从最早的对话开始删除
  while (totalTokens > maxTokens && truncatedMsgs.length > 2) {
    truncatedMsgs = truncatedMsgs.slice(2);
    totalTokens = calculateTotalTokens(truncatedMsgs, sysPrompt);
  }
  return { truncatedMsgs, totalTokens };
};

// 使用模型配置的 input_limit: ${testingModel?.input_limit || 180000}
const { truncatedMsgs } = truncateMessages(messages, system_prompt, ${testingModel?.input_limit || 180000});

// ========== 最大Token数 (max_tokens) ==========
// API 请求时限制输出 Token 数
fetch(endpoint, {
  body: JSON.stringify({
    model: "${testingModel?.model_id}",
    messages: formattedMessages,
    max_tokens: ${testingModel?.max_tokens || 4096}  // ← 限制输出
  })
});`}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                      {t('cancel')}
                    </Button>
                    <Button 
                      onClick={() => handleTest(testingModel)}
                      disabled={isTesting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FlaskConical className="h-4 w-4 mr-2" />}
                      {t('retest')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete Confirmation */}
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteModel')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteModelConfirm')}
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(selectedModel?.id)}
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

              export default function AdminModels() {
              return (
              <LanguageProvider>
              <AdminModelsContent />
              </LanguageProvider>
              );
              }