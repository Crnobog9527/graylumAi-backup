import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Play, Loader2, CheckCircle, XCircle, TrendingDown, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const TEST_MESSAGES = [
  "你好，请介绍一下自己",
  "什么是人工智能？",
  "能帮我写一首关于春天的诗吗？",
  "请解释一下量子计算的原理",
  "推荐几本适合初学者的编程书籍",
  "如何提高工作效率？",
  "介绍一下机器学习的基本概念",
  "什么是区块链技术？",
  "能帮我制定一个健身计划吗？",
  "请解释一下云计算的优势"
];

export default function TokenOptimizationTest() {
  const [user, setUser] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [currentTest, setCurrentTest] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  React.useEffect(() => {
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

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: () => base44.entities.AIModel.filter({ is_active: true }),
    enabled: !!user,
  });

  const runTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest(0);
    setConversationId(null);

    const selectedModel = models[0];
    if (!selectedModel) {
      alert('没有可用的AI模型');
      setIsRunning(false);
      return;
    }

    for (let i = 0; i < TEST_MESSAGES.length; i++) {
      setCurrentTest(i + 1);
      const message = TEST_MESSAGES[i];

      try {
        const { data: result } = await base44.functions.invoke('smartChatWithSearch', {
          conversation_id: conversationId,
          message: message,
          system_prompt: undefined,
          image_files: null
        });

        if (result.error) {
          setTestResults(prev => [...prev, {
            message,
            success: false,
            error: result.error
          }]);
          continue;
        }

        // 保存对话ID用于后续消息
        if (!conversationId && result.conversation_id) {
          setConversationId(result.conversation_id);
        }

        setTestResults(prev => [...prev, {
          message,
          success: true,
          model_used: result.model_used,
          input_tokens: result.input_tokens,
          output_tokens: result.output_tokens,
          compression_used: result.compression_used,
          context_type: result.context_type,
          compression_info: result.compression_info,
          web_search_used: result.search_info?.executed || false,
          cache_hit: result.search_info?.cache_hit || false,
        }]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          message,
          success: false,
          error: error.message
        }]);
      }

      // 延迟500ms避免过快请求
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  // 计算统计数据
  const stats = React.useMemo(() => {
    const successResults = testResults.filter(r => r.success);
    const totalInput = successResults.reduce((sum, r) => sum + (r.input_tokens || 0), 0);
    const totalOutput = successResults.reduce((sum, r) => sum + (r.output_tokens || 0), 0);
    const totalTokens = totalInput + totalOutput;
    
    const compressionCount = successResults.filter(r => r.compression_used).length;
    const webSearchCount = successResults.filter(r => r.web_search_used).length;
    
    // 计算节省的tokens（通过压缩）
    const savedTokens = successResults
      .filter(r => r.compression_info)
      .reduce((sum, r) => sum + (r.compression_info.saved_tokens || 0), 0);
    
    const savePercentage = totalTokens > 0 
      ? ((savedTokens / (totalTokens + savedTokens)) * 100).toFixed(1)
      : 0;

    return {
      totalTests: testResults.length,
      successCount: successResults.length,
      failureCount: testResults.length - successResults.length,
      totalInput,
      totalOutput,
      totalTokens,
      compressionCount,
      webSearchCount,
      savedTokens,
      savePercentage
    };
  }, [testResults]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Token优化测试</h1>
          <p className="text-slate-600">一键测试系统的Token优化效果，包括历史压缩、联网搜索和缓存命中</p>
        </div>

        {/* Control Panel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>测试控制</span>
              <Button
                onClick={runTest}
                disabled={isRunning || models.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    测试中... {currentTest}/{TEST_MESSAGES.length}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    开始测试 ({TEST_MESSAGES.length}条消息)
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          {isRunning && (
            <CardContent>
              <Progress value={(currentTest / TEST_MESSAGES.length) * 100} className="mb-2" />
              <p className="text-sm text-slate-600 text-center">
                正在测试第 {currentTest} 条消息...
              </p>
            </CardContent>
          )}
        </Card>

        {/* Summary Stats */}
        {testResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-slate-800">{stats.totalTokens.toLocaleString()}</div>
                <div className="text-sm text-slate-500">总Tokens</div>
                <div className="text-xs text-slate-400 mt-1">
                  输入: {stats.totalInput.toLocaleString()} | 输出: {stats.totalOutput.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.savedTokens.toLocaleString()}</div>
                <div className="text-sm text-slate-500">节省Tokens</div>
                <div className="text-xs text-green-600 mt-1 font-medium">
                  节省 {stats.savePercentage}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.compressionCount}</div>
                <div className="text-sm text-slate-500">使用压缩</div>
                <div className="text-xs text-slate-400 mt-1">
                  {stats.totalTests} 次测试
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">{stats.webSearchCount}</div>
                <div className="text-sm text-slate-500">联网搜索</div>
                <div className="text-xs text-slate-400 mt-1">
                  成功: {stats.successCount} | 失败: {stats.failureCount}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>测试结果详情</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>点击"开始测试"按钮运行测试</p>
              </div>
            ) : (
              <div className="space-y-3">
                {testResults.map((result, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-600">#{idx + 1}</span>
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-slate-700">{result.message}</span>
                        </div>
                        {result.success && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary">{result.model_used}</Badge>
                            <Badge variant="outline">
                              输入: {result.input_tokens?.toLocaleString()} tokens
                            </Badge>
                            <Badge variant="outline">
                              输出: {result.output_tokens?.toLocaleString()} tokens
                            </Badge>
                            {result.compression_used && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                压缩
                              </Badge>
                            )}
                            <Badge variant="outline">{result.context_type}</Badge>
                            {result.web_search_used && (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                                联网搜索
                              </Badge>
                            )}
                            {result.cache_hit && (
                              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                                缓存命中
                              </Badge>
                            )}
                          </div>
                        )}
                        {result.compression_info && (
                          <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                            压缩: {result.compression_info.before_tokens.toLocaleString()} → {result.compression_info.after_tokens.toLocaleString()} tokens
                            (节省 {result.compression_info.saved_tokens.toLocaleString()} tokens, {result.compression_info.compression_ratio}%)
                          </div>
                        )}
                        {!result.success && (
                          <div className="text-xs text-red-600 mt-2">
                            错误: {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}