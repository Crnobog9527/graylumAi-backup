import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, Filter } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TemplateCard from '@/components/chat/TemplateCard';
import { cn } from "@/lib/utils";

const categories = [
  { id: 'all', label: 'All Templates' },
  { id: 'writing', label: 'Writing' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'coding', label: 'Coding' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'creative', label: 'Creative' },
  { id: 'business', label: 'Business' },
];

export default function Templates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const navigate = useNavigate();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.PromptTemplate.filter({ is_active: true }, 'sort_order'),
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template) => {
    navigate(createPageUrl('Chat') + `?template=${template.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
              <Sparkles className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3">
              AI Templates
            </h1>
            <p className="text-slate-500 max-w-lg mx-auto">
              Pre-configured AI assistants for specific tasks. Choose a template to get started instantly.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-12 h-12 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollArea className="w-full">
            <div className="flex items-center gap-2 py-4">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "rounded-full whitespace-nowrap",
                    activeCategory === category.id
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                  )}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-4 rounded-full bg-slate-100 inline-block mb-4">
              <Filter className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No templates found</h3>
            <p className="text-slate-500">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => handleSelectTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}