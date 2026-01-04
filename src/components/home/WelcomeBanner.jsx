import React from 'react';
import { Crown, Plus, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WelcomeBanner({ user }) {
  if (!user) return null;

  // 会员级别映射
  const membershipLevelMap = {
    'free': '普通会员',
    'pro': 'Pro会员',
    'gold': 'Gold会员'
  };

  const membershipLevel = membershipLevelMap[user.membership_level] || '普通会员';
  const membershipExpiry = user.membership_expiry_date 
    ? new Date(user.membership_expiry_date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : null;

  return (
    <div className="bg-[#111111] rounded-3xl p-8 md:p-10 border border-[#222222] mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:border-[#333333]">
      <div>
        {/* 微标签 */}
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888] font-medium">Online</span>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3 tracking-tight leading-tight">
          欢迎回来，{user.full_name || user.email?.split('@')[0] || '用户'}
        </h1>
        
        <div className="flex items-center gap-3 text-[#888888] text-sm">
          <div className="flex items-center gap-2 bg-[#0A0A0A] px-3 py-1.5 rounded-full border border-[#222222]">
            <Crown className="h-4 w-4 text-[#FFD02F]" />
            <span className="text-[#FFD02F] font-medium">{membershipLevel}</span>
          </div>
          {membershipExpiry && (
            <span className="text-[#666666]">有效期至 {membershipExpiry}</span>
          )}
        </div>
      </div>
      
      <Link to={createPageUrl('Credits')}>
        <Button 
          className="bg-[#FFD02F] hover:bg-[#F0C000] text-black font-bold h-12 px-8 text-sm rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(255,208,47,0.3)] hover:shadow-[0_0_40px_rgba(255,208,47,0.4)]"
        >
          <Zap className="h-4 w-4 mr-2" />
          充值积分
        </Button>
      </Link>
    </div>
  );
}