import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Gift, Copy, Check, Award, Loader2 } from 'lucide-react';

// 生成6位唯一邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function InviteDialog({ open, onOpenChange, user }) {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const queryClient = useQueryClient();

  const { data: systemSettings = [] } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => base44.entities.SystemSettings.list(),
    enabled: open,
  });

  const getSettingValue = (key, defaultValue) => {
    const setting = systemSettings.find(s => s.setting_key === key);
    return setting ? setting.setting_value : defaultValue;
  };

  const inviterReward = parseInt(getSettingValue('invite_inviter_reward', '50')) || 50;
  const inviteeReward = parseInt(getSettingValue('invite_invitee_reward', '30')) || 30;

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => queryClient.invalidateQueries(['user']),
  });

  // 如果用户没有邀请码，自动生成一个唯一的
  useEffect(() => {
    if (open && user && !user.invite_code) {
      const newCode = generateInviteCode();
      updateUserMutation.mutate({ invite_code: newCode });
    }
  }, [open, user]);

  const inviteCode = user?.invite_code;
  const inviteLink = inviteCode 
    ? `${window.location.origin}?invite=${inviteCode}`
    : '';

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span>邀请好友</span>
          </DialogTitle>
          <DialogDescription>
            分享邀请链接给好友，双方都能获得积分奖励
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* 奖励说明 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
              <Gift className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-green-600">+{inviterReward}</div>
              <div className="text-xs text-slate-500">您获得积分</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
              <Award className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-blue-600">+{inviteeReward}</div>
              <div className="text-xs text-slate-500">好友获得积分</div>
            </div>
          </div>

          {/* 邀请码 */}
          <div>
            <label className="text-sm text-slate-500 mb-1.5 block">我的邀请码</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 rounded-lg px-4 py-2.5 font-mono text-lg font-bold text-center tracking-widest">
                {inviteCode || (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                )}
              </div>
              <Button 
                onClick={handleCopyCode} 
                variant="outline" 
                size="icon"
                disabled={!inviteCode}
              >
                {copiedCode ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* 邀请链接 */}
          <div>
            <label className="text-sm text-slate-500 mb-1.5 block">邀请链接</label>
            <div className="flex gap-2">
              <Input 
                value={inviteLink} 
                readOnly 
                className="font-mono text-xs"
                placeholder="生成中..."
              />
              <Button 
                onClick={handleCopyLink} 
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
                disabled={!inviteLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
          </div>

          {/* 提示 */}
          <p className="text-xs text-slate-400 text-center">
            好友通过链接注册后，奖励将自动发放到双方账户
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}