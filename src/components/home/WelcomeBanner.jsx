import React from 'react';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function WelcomeBanner({ user }) {
  if (!user) return null;

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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a0a] to-[#111111] border border-[#1a1a1a] p-8 md:p-10 mb-8"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
      
      {/* Content */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              在线
            </span>
            <span className="text-[#666666] text-sm">欢迎回来</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            {user.full_name || user.email?.split('@')[0] || '用户'}
          </h1>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-amber-500 font-medium text-sm">{membershipLevel}</span>
            </div>
            {membershipExpiry && (
              <span className="text-[#666666] text-sm">有效期至 {membershipExpiry}</span>
            )}
          </div>
        </div>
        
        <Link to={createPageUrl('Credits')}>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold h-12 px-6 text-base rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:scale-105">
            <Sparkles className="h-4 w-4 mr-2" />
            充值积分
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}