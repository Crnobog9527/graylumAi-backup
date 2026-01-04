import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {featuredModules.slice(0, 2).map((featured, index) => (
        <motion.div 
          key={featured.id} 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="group relative rounded-2xl overflow-hidden bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-300"
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          {/* Content */}
          <div className="relative p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl shrink-0">
                <span className="text-2xl">{featured.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-500 transition-colors">
                    {featured.title}
                  </h3>
                  {featured.badge_text && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                      featured.badge_type === 'new' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      featured.badge_type === 'hot' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {featured.badge_text}
                    </span>
                  )}
                </div>
                <p className="text-[#666666] text-sm leading-relaxed">
                  {featured.description}
                </p>
              </div>
            </div>
            
            {/* Image */}
            {featured.image_url && (
              <div className="rounded-xl overflow-hidden mb-4 border border-[#1a1a1a]">
                <img 
                  src={featured.image_url} 
                  alt={featured.title}
                  className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-4 text-sm text-[#666666]">
                {featured.credits_display && (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    {featured.credits_display}
                  </span>
                )}
                {featured.usage_count != null && featured.usage_count > 0 && (
                  <span>{featured.usage_count.toLocaleString()} 人使用</span>
                )}
              </div>
              <Button 
                onClick={() => handleClick(featured)}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg px-5 h-10 transition-all hover:scale-105"
              >
                立即体验
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent className="bg-[#0a0a0a] border-[#1a1a1a]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">确认使用「{confirmDialog.featured?.title}」</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-[#a3a3a3]">
              <p>{confirmDialog.linkedModule?.description || confirmDialog.featured?.description}</p>
              <p className="text-amber-500 font-medium">
                点击"确认"以后，将按实际Token消耗计费
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}