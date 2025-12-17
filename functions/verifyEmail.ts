import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { verification_code } = await req.json();

    if (!verification_code) {
      return Response.json({ error: '请输入验证码' }, { status: 400 });
    }

    // 检查验证码是否正确
    if (user.email_verification_token !== verification_code) {
      return Response.json({ error: '验证码错误' }, { status: 400 });
    }

    // 检查验证码是否过期
    const expiresAt = new Date(user.email_verification_expires);
    if (expiresAt < new Date()) {
      return Response.json({ error: '验证码已过期，请重新发送' }, { status: 400 });
    }

    // 更新用户邮箱验证状态
    await base44.asServiceRole.auth.updateMe({
      email_verified: true,
      email_verification_token: null,
      email_verification_expires: null
    });

    return Response.json({ 
      success: true,
      message: '邮箱验证成功'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return Response.json({ 
      error: error.message || '验证失败，请稍后重试' 
    }, { status: 500 });
  }
});