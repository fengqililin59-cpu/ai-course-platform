"use strict";

/**
 * 可选 SMTP（生产发邮箱验证码）。未配置时返回 ok:false。
 * @returns {Promise<{ ok: boolean, status?: number, message: string }>}
 */
async function sendMailOptional({ to, subject, text }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    return {
      ok: false,
      status: 503,
      message: "未配置 SMTP（SMTP_HOST / SMTP_USER / SMTP_PASS），无法发送邮件验证码",
    };
  }

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (e) {
    console.error("[mailer] 未安装 nodemailer，请执行: npm install nodemailer", e);
    return {
      ok: false,
      status: 503,
      message: "服务器未安装邮件模块 nodemailer",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({ from, to, subject, text });
    return { ok: true, message: "sent" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mailer] sendMail error", e);
    return { ok: false, status: 502, message: `邮件发送失败：${msg}` };
  }
}

module.exports = { sendMailOptional };
