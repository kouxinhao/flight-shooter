/**
 * 邮件发送模块 — 基于 nodemailer + QQ 邮箱 SMTP
 *
 * 配置方式（.env 环境变量）:
 *   MAIL_HOST=smtp.qq.com
 *   MAIL_PORT=465
 *   MAIL_USER=your@qq.com
 *   MAIL_PASS=授权码（QQ邮箱 → 设置 → 账号 → POP3/SMTP服务 → 生成授权码）
 *   MAIL_FROM=your@qq.com
 *
 * 未配置时 sendEmailCode() 返回错误提示，不崩溃。
 */

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST;
  const port = parseInt(process.env.MAIL_PORT || '465', 10);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465,
    auth: { user, pass }
  });

  return transporter;
}

/**
 * 发送邮箱验证码
 * @param {string} to - 收件邮箱
 * @param {string} code - 6 位验证码
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendEmailCode(to, code) {
  const transport = getTransporter();
  if (!transport) {
    // 未配置邮件服务时自动进入开发模式：验证码打印到日志，前端仍返回成功
    console.log('===== 开发模式 =====');
    console.log('[验证码] 邮箱: ' + to + ', 验证码: ' + code);
    console.log('[提示] 配置 MAIL_HOST/MAIL_USER/MAIL_PASS 可启用真实邮件发送');
    return { success: true, message: '验证码已发送' };
  }

  const from = process.env.MAIL_FROM || process.env.MAIL_USER;
  console.log('[验证码] 邮箱: ' + to + ', 验证码: ' + code);

  try {
    await transport.sendMail({
      from: '"游戏登录验证" <' + from + '>',
      to: to,
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
    return { success: false, message: '邮件发送失败: ' + (err.message || '未知错误') };
  }
}

module.exports = { sendEmailCode };