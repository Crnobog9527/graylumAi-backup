import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 生成6位数验证码
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 设置验证码过期时间（30分钟）
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // 更新用户记录
    await base44.asServiceRole.auth.updateMe({
      email_verification_token: verificationCode,
      email_verification_expires: expiresAt.toISOString()
    });

    // 发送验证邮件
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: '邮箱验证 - AI工具平台',
      body: `您好 ${user.full_name || '用户'}，

您正在验证您的邮箱地址。您的验证码是：

${verificationCode}

此验证码将在30分钟后失效。

如果这不是您的操作，请忽略此邮件。

祝好！
AI工具平台团队`
    });

    return Response.json({ 
      success: true,
      message: '验证邮件已发送，请查收邮箱'
    });
  } catch (error) {
    console.error('Send verification email error:', error);
    return Response.json({ 
      error: error.message || '发送失败，请稍后重试' 
    }, { status: 500 });
  }
});