import React from 'react';
import { Crown, Plus } from 'lucide-react';
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
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          欢迎回来，{user.full_name || user.email?.split('@')[0] || '用户'}！
        </h1>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Crown className="h-4 w-4 text-amber-500" />
          <span className="text-amber-600 font-medium">{membershipLevel}</span>
          {membershipExpiry && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>有效期至 {membershipExpiry}</span>
            </>
          )}
        </div>
      </div>
      
      <Link to={createPageUrl('Credits')}>
        <Button className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 text-base shadow-lg shadow-indigo-100">
          <Plus className="h-4 w-4 mr-2" />
          充值积分
        </Button>
      </Link>
    </div>
  );
}