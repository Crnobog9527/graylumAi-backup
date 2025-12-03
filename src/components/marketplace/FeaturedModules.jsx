import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
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

export default function FeaturedModules() {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, featured: null });
  const navigate = useNavigate();

  const { data: featuredModules = [] } = useQuery({
    queryKey: ['featured-modules-active'],
    queryFn: () => base44.entities.FeaturedModule.filter({ is_active: true }, 'sort_order'),
  });

  const { data: promptModules = [] } = useQuery({
    queryKey: ['prompt-modules-for-featured'],
    queryFn: () => base44.entities.PromptModule.filter({ is_active: true }),
  });

  if (featuredModules.length === 0) {
    return null;
  }

  const getLink = (featured) => {
    if (featured.link_module_id) {
      return `${createPageUrl('Chat')}?module_id=${featured.link_module_id}&auto_start=true`;
    }
    if (featured.link_url) {
      return featured.link_url;
    }
    return createPageUrl('Chat');
  };

  const handleClick = (featured) => {
    // 查找关联的模块信息
    const linkedModule = featured.link_module_id 
      ? promptModules.find(m => m.id === featured.link_module_id)
      : null;
    setConfirmDialog({ open: true, featured, linkedModule });
  };

  const handleConfirm = () => {
    const { featured } = confirmDialog;
    navigate(getLink(featured));
    setConfirmDialog({ open: false, featured: null });
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'new':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'hot':
        return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'recommend':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      default:
        return '';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {featuredModules.slice(0, 2).map((featured, index) => (
        <div 
          key={featured.id} 
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {/* 顶部：图标 + 标题 + 标签 + 描述 */}
          <div className="p-5 pb-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2.5 rounded-xl shrink-0">
                <span className="text-2xl">{featured.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900">{featured.title}</h3>
                  {featured.badge_text && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      featured.badge_type === 'new' ? 'bg-green-100 text-green-600' :
                      featured.badge_type === 'hot' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {featured.badge_text}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                  {featured.description}
                </p>
              </div>
            </div>
          </div>
          
          {/* 中间：横幅大图 */}
          {featured.banner_image && (
            <div className="px-5">
              <div className="rounded-xl overflow-hidden border border-slate-100">
                <img 
                  src={featured.banner_image} 
                  alt={featured.title}
                  className="w-full h-32 object-cover"
                />
              </div>
            </div>
          )}
          
          {/* 底部：按钮 */}
          <div className="p-5 pt-4 flex justify-end">
            <Button 
              onClick={() => handleClick(featured)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6"
            >
              立即体验
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      ))}

      {/* 确认弹窗 */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认使用「{confirmDialog.featured?.title}」</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{confirmDialog.linkedModule?.description || confirmDialog.featured?.description}</p>
              <p className="text-amber-600 font-medium">
                点击"确认"以后，将按实际Token消耗计费
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}