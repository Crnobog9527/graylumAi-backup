import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import {
  Sparkles, Zap, MessageSquare, Wand2, Shield,
  ArrowRight, Check, Star, Users, Bot, Rocket } from
'lucide-react';

export default function Landing() {
  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl('Home'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Graylum AI</span>
            </div>
            <Button
              onClick={handleLogin}
              className="bg-indigo-600 hover:bg-indigo-700 text-white">

              登录 / 注册
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full text-sm mb-8">
            <Sparkles className="h-4 w-4" />
            强大的AI助手，助您高效工作
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            一站式 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI工具平台</span>
            <br />智能创作从此开始
          </h1>
          
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            集成多种AI模型，提供丰富的提示词模板，帮助您快速生成高质量内容。
            无论是文案写作、内容营销还是创意设计，都能轻松搞定。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg px-8 h-14 rounded-xl">

              立即开始使用
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg" className="bg-slate-600 text-white px-8 text-lg font-medium rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground border-white/20 hover:bg-white/10 h-14"

              onClick={handleLogin}>

              了解更多
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">核心功能</h2>
            <p className="text-slate-400 text-lg">强大的功能组合，满足您的各种创作需求</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
            {
              icon: MessageSquare,
              title: '智能对话',
              description: '与多种AI模型自由对话，获取专业解答和创意灵感',
              color: 'from-blue-500 to-cyan-500'
            },
            {
              icon: Wand2,
              title: '提示词模板',
              description: '丰富的预设模板，快速生成文案、脚本、笔记等内容',
              color: 'from-purple-500 to-pink-500'
            },
            {
              icon: Zap,
              title: '积分系统',
              description: '灵活的积分充值方案，按需使用，经济实惠',
              color: 'from-amber-500 to-orange-500'
            }].
            map((feature, idx) =>
            <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-indigo-950/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                为什么选择我们？
              </h2>
              <div className="space-y-4">
                {[
                '多种主流AI模型支持',
                '丰富的提示词模板库',
                '灵活的会员订阅方案',
                '安全可靠的数据保护',
                '7x24小时技术支持'].
                map((item, idx) =>
                <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-400" />
                    </div>
                    <span className="text-lg text-slate-300">{item}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) =>
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-slate-900 flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">10,000+</div>
                  <div className="text-slate-400 text-sm">活跃用户</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold text-white">50+</div>
                  <div className="text-slate-400 text-sm">功能模块</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">99.9%</div>
                  <div className="text-slate-400 text-sm">服务可用性</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12">
            <Rocket className="h-12 w-12 text-white mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              准备好开始了吗？
            </h2>
            <p className="text-indigo-100 text-lg mb-8">
              注册即送100积分，立即体验AI的强大能力
            </p>
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-white text-indigo-600 hover:bg-slate-100 text-lg px-10 h-14 rounded-xl font-semibold">

              免费注册
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Graylum AI</span>
          </div>
          <p className="text-slate-500 text-sm">© 2025 Grayscale Luminary LLC. 

          </p>
        </div>
      </footer>
    </div>);

}