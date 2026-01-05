import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import FeaturedModules from '@/components/marketplace/FeaturedModules';
import ModuleCard from '@/components/modules/ModuleCard';
import ModuleDetailDialog from '@/components/modules/ModuleDetailDialog';

const categories = [
{ id: 'all', label: '全部功能' },
{ id: 'writing', label: '内容创作' },
{ id: 'marketing', label: '营销文案' },
{ id: 'video', label: '视频制作' },
{ id: 'business', label: '商务办公' },
{ id: 'education', label: '教育学习' },
{ id: 'other', label: '其他分类' }];


const categoryMap = {
  writing: 'writing',
  marketing: 'marketing',
  video: 'video',
  business: 'business',
  education: 'education',
  tool: 'other',
  analysis: 'other',
  coding: 'other',
  creative: 'other',
  audio: 'other'
};

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.PromptModule.filter({ is_active: true }, 'sort_order', 100)
  });

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: () => base44.entities.AIModel.filter({ is_active: true })
  });

  const filteredModules = modules.filter((module) => {
    const matchesSearch = module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesCategory = true;
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'other') {
        matchesCategory = ['tool', 'analysis', 'coding', 'creative', 'audio'].includes(module.category);
      } else {
        matchesCategory = module.category === selectedCategory;
      }
    }

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const displayedModules = filteredModules.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}>

      {/* ============================================
           动态背景系统 - 功能市场专属设计
           ============================================ */}

      {/* 1. 深邃渐变基底 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 120% 80% at 50% 0%, rgba(30,25,40,1) 0%, var(--bg-primary) 50%, rgba(15,15,20,1) 100%)`
        }} />


      {/* 2. 顶部中央 - 主金色光源（聚焦市场标题） */}
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-70 blur-[120px]"
        style={{
          background: `radial-gradient(circle, var(--color-primary) 0%, rgba(255,180,0,0.5) 40%, transparent 70%)`,
          animation: 'pulseGlow 12s ease-in-out infinite'
        }} />


      {/* 3. 左下角 - 紫色/蓝色渐变光晕 */}
      <div
        className="absolute bottom-0 -left-32 w-[600px] h-[600px] rounded-full opacity-50 blur-[110px]"
        style={{
          background: `linear-gradient(45deg, rgba(99,102,241,0.8) 0%, rgba(139,92,246,0.6) 50%, transparent 100%)`,
          animation: 'driftDiagonal 28s ease-in-out infinite'
        }} />


      {/* 4. 右下角 - 青绿色光晕 */}
      <div
        className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full opacity-45 blur-[100px]"
        style={{
          background: `radial-gradient(circle, rgba(34,197,94,0.7) 0%, rgba(20,184,166,0.5) 50%, transparent 80%)`,
          animation: 'driftCorner 24s ease-in-out infinite reverse'
        }} />


      {/* 5. 中部偏右 - 橙色点缀 */}
      <div
        className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full opacity-35 blur-[90px]"
        style={{
          background: `radial-gradient(circle, var(--color-secondary) 0%, transparent 60%)`,
          animation: 'floatSoft 20s ease-in-out infinite'
        }} />


      {/* 6. 斜向网格纹理 */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(30deg, rgba(255,215,0,0.15) 1px, transparent 1px), linear-gradient(-30deg, rgba(255,215,0,0.15) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          animation: 'gridDrift 80s linear infinite'
        }} />


      {/* 7. 水平光带扫描 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,215,0,0.05) 50%, transparent 100%)',
          animation: 'scanVertical 20s ease-in-out infinite'
        }} />


      {/* 8. 噪点纹理层 */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
        }} />


      {/* 9. 星尘浮动光点 - 更明显 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => {
          const size = 2 + Math.random() * 2;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                background: i % 3 === 0 ? 'var(--color-primary)' : i % 3 === 1 ? 'rgba(139,92,246,1)' : 'rgba(34,197,94,1)',
                boxShadow: `0 0 ${size * 6}px ${i % 3 === 0 ? 'var(--color-primary)' : i % 3 === 1 ? 'rgba(139,92,246,0.8)' : 'rgba(34,197,94,0.8)'}`,
                opacity: 0.6 + Math.random() * 0.4,
                left: `${5 + Math.random() * 90}%`,
                top: `${5 + Math.random() * 90}%`,
                animation: `twinkle ${6 + Math.random() * 8}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`
              }} />);


        })}
      </div>

      {/* 10. 边缘渐隐遮罩 - 减弱遮罩让光晕更明显 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 90% at 50% 30%, transparent 40%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0.35) 85%, rgba(0,0,0,0.5) 100%)'
        }} />


      {/* 动画样式定义 - 功能市场专属 */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateX(-50%) scale(1.08); }
        }
        @keyframes driftDiagonal {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(40px, -30px) rotate(5deg); }
          66% { transform: translate(-20px, 20px) rotate(-3deg); }
        }
        @keyframes driftCorner {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          50% { transform: translate(-40px, -30px); opacity: 0.4; }
        }
        @keyframes floatSoft {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          50% { transform: translate(-30px, 20px) scale(1.1); opacity: 0.3; }
        }
        @keyframes gridDrift {
          0% { background-position: 0 0; }
          100% { background-position: 60px 60px; }
        }
        @keyframes scanVertical {
          0%, 100% { transform: translateY(-100%); opacity: 0; }
          40%, 60% { transform: translateY(0); opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .module-card-animate {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease forwards;
        }
        .animate-pulse {
          animation: twinkle 2s ease-in-out infinite;
        }
        
        /* 滚动条美化 */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative" style={{ zIndex: 1 }}>
        {/* 页面标题 - 更具冲击力的设计 */}
        <div className="text-center mb-12 pt-4">
          <div
            className="inline-flex items-center gap-2 mb-6 animate-fadeIn"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,180,0,0.05) 100%)',
              border: '1px solid rgba(255,215,0,0.2)',
              borderRadius: 'var(--radius-full)',
              padding: '8px 16px',
              backdropFilter: 'blur(10px)'
            }}>

            <Sparkles className="h-4 w-4 animate-pulse" style={{ color: 'var(--color-primary)' }} />
            <span
              className="uppercase tracking-widest font-semibold"
              style={{ fontSize: '11px', color: 'var(--color-primary)' }}>

              AI TOOLS MARKETPLACE
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-slideUp"

          style={{
            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--color-primary) 50%, var(--color-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>功能广场


          </h1>
          <p
            className="text-lg md:text-xl max-w-2xl mx-auto animate-slideUp"
            style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              animationDelay: '0.1s'
            }}>

            探索强大的 AI 工具集合，一键解锁无限创作可能
          </p>
        </div>

        <FeaturedModules />

        {/* Filter Bar - 更精致的筛选栏 */}
        <div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 sticky top-16 z-40 backdrop-blur-xl py-4 px-6 rounded-2xl animate-slideUp"
          style={{
            background: 'linear-gradient(135deg, rgba(30,30,35,0.9) 0%, rgba(20,20,25,0.95) 100%)',
            border: '1px solid rgba(255,215,0,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
            animationDelay: '0.2s'
          }}>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((cat, index) =>
            <button
              key={cat.id}
              onClick={() => {setSelectedCategory(cat.id);setPage(1);}}
              className="px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 hover:scale-105"
              style={{
                background: selectedCategory === cat.id ?
                'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' :
                'rgba(255,255,255,0.03)',
                color: selectedCategory === cat.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                border: selectedCategory === cat.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: selectedCategory === cat.id ?
                '0 4px 20px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)' :
                'none',
                fontWeight: selectedCategory === cat.id ? 600 : 500
              }}>

                {cat.label}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs hidden md:block" style={{ color: 'var(--text-disabled)' }}>
              共 {filteredModules.length} 个工具
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl h-10 text-sm font-medium transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'var(--text-secondary)'
                  }}>

                  {sortOrder === 'newest' ? '🕐 最新上线' : '🔥 最受欢迎'}
                  <ChevronDown className="h-4 w-4 ml-2" style={{ color: 'var(--text-tertiary)' }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-primary)'
                }}>

                <DropdownMenuItem
                  onClick={() => setSortOrder('newest')}
                  className="rounded-lg"
                  style={{ color: 'var(--text-secondary)' }}>

                  🕐 最新上线
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOrder('popular')}
                  className="rounded-lg"
                  style={{ color: 'var(--text-secondary)' }}>

                  🔥 最受欢迎
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Grid - 优化卡片网格布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-12">
          {displayedModules.map((module, index) =>
          <div
            key={module.id}
            className="module-card-animate"
            style={{ animationDelay: `${index * 0.06}s`, opacity: 0 }}>

              <ModuleCard module={module} models={models} />
            </div>
          )}
        </div>

        {filteredModules.length === 0 &&
        <div
          className="text-center py-24 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(30,30,35,0.5) 0%, rgba(20,20,25,0.5) 100%)',
            border: '1px solid var(--border-primary)'
          }}>

            <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>

              <Sparkles className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
            </div>
            <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>未找到相关功能</p>
            <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>尝试选择其他分类或调整筛选条件</p>
          </div>
        }

        {/* Pagination - 更精致的分页 */}
        {totalPages > 1 &&
        <div
          className="flex items-center justify-center gap-3 py-6 px-8 rounded-2xl mx-auto max-w-fit"
          style={{
            background: 'linear-gradient(135deg, rgba(30,30,35,0.8) 0%, rgba(20,20,25,0.9) 100%)',
            border: '1px solid rgba(255,215,0,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>

            <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-10 w-10 rounded-xl transition-all duration-300 hover:scale-110 disabled:opacity-30"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'var(--text-secondary)'
            }}>

              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
            <Button
              key={p}
              variant={page === p ? "default" : "outline"}
              onClick={() => setPage(p)}
              className="h-10 w-10 rounded-xl transition-all duration-300 hover:scale-110"
              style={{
                background: page === p ?
                'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' :
                'rgba(255,255,255,0.03)',
                borderColor: page === p ? 'transparent' : 'rgba(255,255,255,0.08)',
                color: page === p ? 'var(--bg-primary)' : 'var(--text-secondary)',
                boxShadow: page === p ? '0 4px 20px rgba(255, 215, 0, 0.3)' : 'none',
                fontWeight: page === p ? 700 : 500
              }}>

                  {p}
                </Button>
            )}
            </div>

            <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-10 w-10 rounded-xl transition-all duration-300 hover:scale-110 disabled:opacity-30"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'var(--text-secondary)'
            }}>

              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <div className="h-6 w-px mx-2" style={{ background: 'var(--border-primary)' }} />
            
            <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
              第 <span style={{ color: 'var(--color-primary)' }}>{page}</span> / {totalPages} 页
            </span>
          </div>
        }
      </div>
    </div>);

}