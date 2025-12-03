import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [sortOrder, setSortOrder] = useState('newest'); // newest (sort_order), popular
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

  // Filter and Sort Logic
  const filteredModules = modules.filter(module => {
    // Search
    const matchesSearch = module.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          module.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category
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

  // Pagination
  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const displayedModules = filteredModules.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <FeaturedModules />

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 sticky top-16 z-40 bg-slate-50/90 backdrop-blur-sm py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-lg bg-white h-9 text-sm font-normal">
                {sortOrder === 'newest' ? '最新上线' : '最受欢迎'}
                <ChevronDown className="h-4 w-4 ml-2 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOrder('newest')}>最新上线</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder('popular')}>最受欢迎</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
        {displayedModules.map((module) => (
          <ModuleCard key={module.id} module={module} models={models} />
        ))}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-20 text-slate-400">
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
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={page === p ? "default" : "outline"}
              onClick={() => setPage(p)}
              className={`h-9 w-9 ${page === p ? 'bg-indigo-600' : ''}`}
            >
              {p}
            </Button>
          ))}

          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-slate-500 ml-4">
            共 {filteredModules.length} 个功能，第 {page} / {totalPages} 页
          </span>
        </div>
      )}
    </div>
  );
}