import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, Gift, Users, Link2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function InviteDialog({ open, onOpenChange, user }) {
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState(user?.invite_code || '');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: systemSettings = [] } = useQuery({
    queryKey: ['invite-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
  });

  const inviterReward = systemSettings.find(s => s.setting_key === 'inviter_reward')?.setting_value || '100';
  const refereeBonus = systemSettings.find(s => s.setting_key === 'referee_bonus')?.setting_value || '50';

  useEffect(() => {
    if (open && !inviteCode && user && !user.invite_code) {
      generateAndSaveCode();
    } else if (user?.invite_code) {
      setInviteCode(user.invite_code);
    }
  }, [open, user]);

  const generateAndSaveCode = async () => {
    setIsGenerating(true);
    try {
      const newCode = generateInviteCode();
      await base44.auth.updateMe({ invite_code: newCode });
      setInviteCode(newCode);
    } catch (error) {
      console.error('Failed to generate invite code:', error);
      toast.error('生成邀请码失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const inviteLink = inviteCode ? `${window.location.origin}?invite=${inviteCode}` : '';

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="h-5 w-5 text-amber-500" />
            邀请好友
          </DialogTitle>
          <DialogDescription className="text-[#666666]">
            分享您的专属邀请链接，好友注册后双方都能获得积分奖励
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Rewards Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-4 text-center">
              <Users className="h-6 w-6 text-amber-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-amber-500">+{inviterReward}</div>
              <div className="text-xs text-[#666666]">您获得积分</div>
            </div>
            <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-4 text-center">
              <Gift className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-500">+{refereeBonus}</div>
              <div className="text-xs text-[#666666]">好友获得积分</div>
            </div>
          </div>

          {/* Invite Code */}
          <div className="space-y-2">
            <label className="text-sm text-[#a3a3a3]">您的专属邀请码</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#111111] border border-[#1a1a1a] rounded-lg px-4 py-3 font-mono text-lg text-amber-500 tracking-widest text-center">
                {isGenerating ? '生成中...' : inviteCode || '---'}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => handleCopy(inviteCode)}
                disabled={!inviteCode || isGenerating}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a] h-12 w-12"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Invite Link */}
          <div className="space-y-2">
            <label className="text-sm text-[#a3a3a3]">邀请链接</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#111111] border border-[#1a1a1a] rounded-lg px-4 py-3 text-sm text-[#666666] truncate">
                {isGenerating ? '生成中...' : inviteLink || '---'}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => handleCopy(inviteLink)}
                disabled={!inviteLink || isGenerating}
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a] h-12 w-12"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Copy Full Link Button */}
          <Button 
            className="w-full bg-amber-500 hover:bg-amber-600 text-black h-11"
            onClick={() => handleCopy(inviteLink)}
            disabled={!inviteLink || isGenerating}
          >
            <Copy className="h-4 w-4 mr-2" />
            复制邀请链接
          </Button>

          <p className="text-xs text-[#444444] text-center">
            好友通过您的链接注册并完成首次对话后，双方将自动获得积分奖励
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}