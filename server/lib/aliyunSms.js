"use strict";

/**
 * 阿里云国内短信 SendSms（验证码模板需在控制台审核通过）
 * 环境变量见 server/.env.example
 * AccessKey 支持 ALIYUN_ACCESS_KEY_* 或 ALIYUN_SMS_ACCESS_KEY_*（后者为常见部署别名）
 */

function accessKeyId() {
  return String(
    process.env.ALIYUN_ACCESS_KEY_ID || process.env.ALIYUN_SMS_ACCESS_KEY_ID || "",
  ).trim();
}

function accessKeySecret() {
  return String(
    process.env.ALIYUN_ACCESS_KEY_SECRET || process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || "",
  ).trim();
}

function smsTemplateParamName() {
  const n = String(
    process.env.ALIYUN_SMS_CODE_PARAM || process.env.ALIYUN_SMS_TEMPLATE_PARAM || "code",
  ).trim();
  return n || "code";
}

function isSmsConfigured() {
  const id = accessKeyId();
  const sec = accessKeySecret();
  const sign = String(process.env.ALIYUN_SMS_SIGN_NAME || "").trim();
  const tpl = String(process.env.ALIYUN_SMS_TEMPLATE_CODE || "").trim();
  return Boolean(id && sec && sign && tpl);
}

/**
 * @param {string} phone 11 位国内手机号
 * @param {string} code 6 位数字验证码
 * @returns {Promise<void>}
 */
async function sendVerificationCode(phone, code) {
  if (!isSmsConfigured()) {
    const err = new Error("SMS_NOT_CONFIGURED");
    err.code = "SMS_NOT_CONFIGURED";
    throw err;
  }

  const DysmsClient = require("@alicloud/dysmsapi20170525").default;
  const { SendSmsRequest } = require("@alicloud/dysmsapi20170525/dist/models/model");

  const accessKeyIdVal = accessKeyId();
  const accessKeySecretVal = accessKeySecret();
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
  const endpoint = process.env.ALIYUN_SMS_ENDPOINT || "dysmsapi.aliyuncs.com";
  const paramName = smsTemplateParamName();

  const client = new DysmsClient({
    accessKeyId: accessKeyIdVal,
    accessKeySecret: accessKeySecretVal,
    endpoint,
  });

  const req = new SendSmsRequest({
    phoneNumbers: phone,
    signName,
    templateCode,
    templateParam: JSON.stringify({ [paramName]: code }),
  });

  const res = await client.sendSms(req);
  const body = res.body;
  if (!body || body.code !== "OK") {
    const msg = body ? `${body.code || ""}: ${body.message || ""}` : "SendSms 无响应";
    const err = new Error(msg.trim() || "短信发送失败");
    err.code = body?.code || "SMS_SEND_FAILED";
    throw err;
  }
}

module.exports = {
  isSmsConfigured,
  sendVerificationCode,
};
