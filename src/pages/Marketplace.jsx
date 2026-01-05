import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FeaturedModules from '@/components/marketplace/FeaturedModules';
import ModuleCard from '@/components/modules/ModuleCard';

const categories = [
  { id: 'all', label: '全部功能' },
  { id: 'writing', label: '内容创作' },
  { id: 'marketing', label: '营销文案' },
  { id: 'video', label: '视频制作' },
  { id: 'business', label: '商务办公' },
  { id: 'education', label: '教育学习' },
  { id: 'other', label: '其他分类' },
];

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
  audio: 'other',
};

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => base44.entities.PromptModule.list('-sort_order', 100),
  });

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: () => base44.entities.AIModel.filter({ is_active: true }),
  });

  const filteredModules = modules.filter(module => {
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
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* 背景动效 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[120px]"
          style={{ 
            background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            animation: 'floatSlow 25s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[100px]"
          style={{ 
            background: 'radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)',
            animation: 'floatSlow 30s ease-in-out infinite reverse'
          }}
        />
      </div>

      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.05); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .module-card-animate {
          animation: fadeInUp 0.5s ease forwards;
        }
      `}</style>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative" style={{ zIndex: 1 }}>
        {/* 页面标题 */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 mb-4"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-sm) var(--space-md)'
            }}
          >
            <Sparkles className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
            <span
              className="uppercase tracking-widest font-medium"
              style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}
            >
              AI TOOLS
            </span>
          </div>
          <h1 
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            功能市场
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>
            探索强大的 AI 工具，提升你的创作效率
          </p>
        </div>

        <FeaturedModules />

        {/* Filter Bar */}
        <div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 sticky top-16 z-40 backdrop-blur-md py-3 px-4 rounded-2xl"
          style={{ 
            background: 'rgba(20, 20, 25, 0.8)',
            border: '1px solid var(--border-primary)'
          }}
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300"
                style={{
                  background: selectedCategory === cat.id 
                    ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)'
                    : 'var(--bg-secondary)',
                  color: selectedCategory === cat.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: selectedCategory === cat.id ? 'none' : '1px solid var(--border-primary)',
                  boxShadow: selectedCategory === cat.id ? '0 4px 15px rgba(255, 215, 0, 0.25)' : 'none'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="rounded-lg h-9 text-sm font-normal transition-all duration-300"
                  style={{ 
                    background: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {sortOrder === 'newest' ? '最新上线' : '最受欢迎'}
                  <ChevronDown className="h-4 w-4 ml-2" style={{ color: 'var(--text-tertiary)' }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end"
                style={{ 
                  background: 'var(--bg-secondary)', 
                  borderColor: 'var(--border-primary)'
                }}
              >
                <DropdownMenuItem 
                  onClick={() => setSortOrder('newest')}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  最新上线
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortOrder('popular')}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  最受欢迎
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
          {displayedModules.map((module, index) => (
            <div 
              key={module.id} 
              className="module-card-animate"
              style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
            >
              <ModuleCard module={module} models={models} />
            </div>
          ))}
        </div>

        {filteredModules.length === 0 && (
          <div className="text-center py-20" style={{ color: 'var(--text-disabled)' }}>
            <p>未找到相关功能</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-9 w-9 transition-all duration-300"
              style={{ 
                background: 'var(--bg-secondary)', 
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)'
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={page === p ? "default" : "outline"}
                onClick={() => setPage(p)}
                className="h-9 w-9 transition-all duration-300"
                style={{ 
                  background: page === p 
                    ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)'
                    : 'var(--bg-secondary)',
                  borderColor: page === p ? 'transparent' : 'var(--border-primary)',
                  color: page === p ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  boxShadow: page === p ? '0 4px 15px rgba(255, 215, 0, 0.25)' : 'none'
                }}
              >
                {p}
              </Button>
            ))}

            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-9 w-9 transition-all duration-300"
              style={{ 
                background: 'var(--bg-secondary)', 
                borderColor: 'var(--border-primary)',
                color: 'var(--text-secondary)'
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <span className="text-sm ml-4" style={{ color: 'var(--text-disabled)' }}>
              共 {filteredModules.length} 个功能，第 {page} / {totalPages} 页
            </span>
          </div>
        )}
      </div>
    </div>
  );
}