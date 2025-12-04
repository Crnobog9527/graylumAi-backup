import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Play } from 'lucide-react';

export default function QuickStartGuide() {
  const navigate = useNavigate();

  const { data: guides = [] } = useQuery({
    queryKey: ['quick-start-guide'],
    queryFn: () => base44.entities.QuickStartGuide.filter({ is_active: true }),
  });

  const guide = guides[0]; // 只显示第一个激活的引导

  if (!guide) return null;

  const handleClick = () => {
    if (guide.link_module_id) {
      navigate(`${createPageUrl('Chat')}?module_id=${guide.link_module_id}&auto_start=true`);
    } else {
      navigate(createPageUrl('Chat'));
    }
  };

  const steps = guide.steps || [];

  return (
    <div className="mb-10 bg-gradient-to-b from-slate-700 to-slate-800 rounded-2xl p-8 text-white">
      {/* 标题区域 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-3">{guide.title}</h2>
        {guide.subtitle && (
          <p className="text-slate-300 text-sm max-w-2xl mx-auto">{guide.subtitle}</p>
        )}
      </div>

      {/* 步骤卡片网格 */}
      {steps.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl p-5 text-slate-800"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white text-sm font-bold mb-3">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="font-bold text-base mb-2">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* 开始按钮 */}
      <div className="text-center">
        <Button 
          onClick={handleClick}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-full text-base font-medium"
        >
          <Play className="h-4 w-4 mr-2" />
          {guide.button_text || '开始分析'}
        </Button>
      </div>
    </div>
  );
}