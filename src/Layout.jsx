import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

// 公开页面列表（无需登录即可访问）
const publicPages = ['Landing'];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // 检查是否需要发放注册奖励
        if (userData && !userData.registration_bonus_granted) {
          try {
            // 获取系统设置中的注册奖励积分
            const settings = await base44.entities.SystemSettings.list();
            const getSettingValue = (key, defaultValue) => {
              const setting = settings.find(s => s.setting_key === key);
              return setting ? setting.setting_value : defaultValue;
            };

            const bonusCredits = parseInt(getSettingValue('new_user_credits', '100')) || 100;
            const refereeBonus = parseInt(getSettingValue('referee_bonus', '50')) || 50;

            let totalBonus = bonusCredits;
            let updateData = {
              registration_bonus_granted: true
            };

            // 检查是否有邀请码
            const pendingInviteCode = localStorage.getItem('pending_invite_code');
            if (pendingInviteCode) {
              // 处理邀请奖励
              try {
                const { data: inviteResult } = await base44.functions.invoke('processInviteReward', {
                  invitee_email: userData.email,
                  invite_code: pendingInviteCode,
                  register_ip: '', // 前端无法获取真实IP
                  device_fingerprint: navigator.userAgent // 简单的设备指纹
                });

                if (inviteResult.success) {
                  totalBonus += refereeBonus;
                  updateData.referred_by_code = pendingInviteCode;
                }
              } catch (inviteError) {
                console.error('处理邀请奖励失败:', inviteError);
              }
              // 清除存储的邀请码
              localStorage.removeItem('pending_invite_code');
            }

            // 发放注册奖励
            const newBalance = (userData.credits || 0) + totalBonus;
            updateData.credits = newBalance;

            await base44.auth.updateMe(updateData);

            // 创建积分交易记录
            await base44.entities.CreditTransaction.create({
              user_email: userData.email,
              type: 'bonus',
              amount: totalBonus,
              balance_after: newBalance,
              description: pendingInviteCode 
                ? `新用户注册奖励 ${bonusCredits}积分 + 被邀请奖励 ${refereeBonus}积分`
                : `新用户注册奖励 - ${bonusCredits}积分`
            });

            // 更新本地用户状态
            setUser({
              ...userData,
              credits: newBalance,
              registration_bonus_granted: true,
              ...updateData
            });
          } catch (error) {
            console.error('发放注册奖励失败:', error);
          }
        }
      } catch (e) {
        setUser(null);
        // 如果未登录且不是公开页面，重定向到Landing
        if (!publicPages.includes(currentPageName)) {
          navigate(createPageUrl('Landing'), { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [location.pathname, currentPageName, navigate]);

  // 公开页面（Landing）不显示AppHeader，直接渲染内容
  if (currentPageName === 'Landing') {
    return children;
  }

  // 加载中显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 未登录且非公开页面已在useEffect中重定向
  if (!user && !publicPages.includes(currentPageName)) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AppHeader user={user} />
      <main className="animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}