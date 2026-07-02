/**
 * 邮件发送模块
 *
 * 支持两种方式（按优先级）:
 * 1. SendGrid（推荐）— 设置 SENDGRID_API_KEY 环境变量即可
 * 2. 开发模式 — 无配置时验证码打印到日志，不实际发送
 *
 * QQ 邮箱 SMTP 方式已废弃（Railway 海外服务器无法连通）。
 */

const sgMail = require('@sendgrid/mail');

/**
 * 发送邮箱验证码
 * @param {string} to - 收件邮箱
 * @param {string} code - 6 位验证码
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendEmailCode(to, code) {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    // 开发模式：无 SendGrid 配置时打印到日志
    console.log('===== 开发模式 =====');
    console.log('[验证码] 邮箱: ' + to + ', 验证码: ' + code);
    console.log('[提示] 设置 SENDGRID_API_KEY 可启用真实邮件发送');
    return { success: true, message: '验证码已发送（开发模式）' };
  }

  sgMail.setApiKey(apiKey);

  console.log('[验证码] 邮箱: ' + to + ', 验证码: ' + code);

  try {
    await sgMail.send({
      to: to,
      from: process.env.SENDGRID_FROM || 'noreply@flight-shooter.com',
      subject: '您的登录验证码',
      html:
        '<div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">' +
        '<h2 style="color: #4488ff;">登录验证码</h2>' +
        '<p>您的验证码为：</p>' +
        '<div style="font-size: 32px; font-weight: bold; color: #4488ff; letter-spacing: 6px; text-align: center; padding: 20px; background: #f5f8ff; border-radius: 8px; margin: 16px 0;">' +
        code +
        '</div>' +
        '<p style="color: #666;">验证码有效期为 10 分钟，请勿泄露给他人。</p>' +
        '<p style="color: #999; font-size: 12px;">如果您没有请求此验证码，请忽略此邮件。</p>' +
        '</div>'
    });
    console.log('[邮件] 已发送至 ' + to);

    return { success: true, message: '验证码已发送' };
  } catch (err) {
    console.error('[邮件] 发送失败:', err.message);
    return { success: false, message: '邮件发送失败: ' + (err.message || '未知错误') };
  }
}

module.exports = { sendEmailCode };