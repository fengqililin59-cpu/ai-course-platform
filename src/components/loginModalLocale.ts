/** 登录弹窗文案（中英），后续可接入 i18n 库 */
export type LoginLocale = "zh" | "en";

export function detectLoginLocale(): LoginLocale {
  if (typeof navigator !== "undefined" && /^en/i.test(navigator.language || "")) return "en";
  return "zh";
}

/** Toast 中展示的脱敏用户标识 */
export function formatIdentityBrief(identity: string, locale: LoginLocale): string {
  const t = identity.trim();
  if (t.startsWith("mail:")) return t.slice(5);
  if (t.startsWith("wx:")) {
    const id = t.slice(3);
    if (locale === "en") {
      return id.length <= 8 ? `WeChat ${id}` : `WeChat ${id.slice(0, 4)}…${id.slice(-4)}`;
    }
    return id.length <= 8 ? `微信·${id}` : `微信·${id.slice(0, 4)}…${id.slice(-4)}`;
  }
  if (t.startsWith("gh:")) {
    const id = t.slice(3);
    if (locale === "en") return id.length <= 10 ? `GitHub ${id}` : `GitHub ${id.slice(0, 4)}…${id.slice(-4)}`;
    return id.length <= 10 ? `GitHub·${id}` : `GitHub·${id.slice(0, 4)}…${id.slice(-4)}`;
  }
  if (t.startsWith("google:")) {
    const id = t.slice(7);
    if (locale === "en") return id.length <= 12 ? `Google ${id}` : `Google ${id.slice(0, 4)}…${id.slice(-4)}`;
    return id.length <= 12 ? `Google·${id}` : `Google·${id.slice(0, 4)}…${id.slice(-4)}`;
  }
  if (/^1\d{10}$/.test(t)) return `${t.slice(0, 3)}****${t.slice(-4)}`;
  return t;
}

/** 登录成功：欢迎回来，{标识} */
export function welcomeBackToastMessage(identity: string, locale: LoginLocale): string {
  const brief = formatIdentityBrief(identity, locale);
  return locale === "en" ? `Welcome back, ${brief}` : `欢迎回来，${brief}`;
}

/** 注册成功 */
export function registerWelcomeToastMessage(locale: LoginLocale): string {
  return locale === "en" ? "Registration successful — welcome!" : "注册成功，欢迎加入";
}

/** 微信登录成功 */
export function wechatLoginToastMessage(locale: LoginLocale): string {
  return locale === "en" ? "Signed in with WeChat" : "微信登录成功";
}

/** OAuth 占位（规范要求固定中文提示） */
export const OAUTH_COMING_SOON_ZH = "即将开放";

export const loginStrings = {
  zh: {
    title: "登录 / 注册",
    subtitle: "选择一种方式完成登录",
    tabPhone: "手机号",
    tabEmail: "邮箱",
    tabWechat: "微信",
    phoneCodeLogin: "验证码登录",
    phonePwdLogin: "密码登录",
    phoneRegister: "注册",
    phoneLabel: "手机号",
    phonePlaceholder: "请输入手机号",
    rememberPhone: "记住手机号（下次打开自动填充）",
    codeLabel: "验证码",
    codePlaceholder: "请输入验证码",
    sendCode: "获取验证码",
    sending: "发送中…",
    retryIn: (s: number) => `${s}秒后重试`,
    login: "登录",
    loggingIn: "登录中…",
    pwdLabel: "密码",
    pwdPlaceholder: "请输入密码",
    forgotPwd: "忘记密码？",
    forgotPwdToast: "通过手机或邮箱验证码重置密码",
    resetTitle: "重置密码",
    resetSubtitle: "输入已注册的手机号或邮箱",
    resetBack: "返回登录",
    resetPrevStep: "上一步",
    resetAccountLabel: "手机号或邮箱",
    resetAccountPh: "11 位手机号或邮箱",
    resetSendCode: "获取验证码",
    resetNext: "下一步",
    resetCodeLabel: "验证码",
    resetNewPwd: "新密码（至少 6 位）",
    resetConfirmPwd: "确认新密码",
    resetSubmit: "确认重置",
    resetSubmitting: "提交中…",
    resetSuccess: "密码已重置，请使用新密码登录",
    resetCodeDeliveryHint: "验证码已发送至手机或邮箱，请在有效期内填写；收不到时请检查拦截或垃圾箱。",
    resetErrAccount: "请输入有效手机号或邮箱",
    noAccount: "还没有账号？立即注册",
    hasAccount: "已有账号？返回密码登录",
    regCodeLabel: "验证码",
    regCodePh: "6 位数字",
    regPwdLabel: "密码（至少 6 位）",
    regPwd2Label: "确认密码",
    register: "注册",
    registering: "注册中…",
    emailLogin: "登录",
    emailRegister: "注册",
    emailLabel: "邮箱",
    emailCodeLabel: "邮箱验证码",
    emailPwdHint: "忘记密码？",
    emailPwdToast: "通过手机或邮箱验证码重置密码",
    otherWays: "其他登录方式",
    linkPhone: "手机号登录",
    linkEmail: "邮箱登录",
    linkWechat: "微信登录",
    agreement: "登录即代表同意",
    terms: "用户协议",
    and: "和",
    privacy: "隐私政策",
    wxLoading: "正在获取二维码…",
    wxClosed: "微信登录暂未开放",
    wxClosedHint: "配置微信开放平台后将启用扫码登录",
    wxScan: "使用微信扫码登录",
    wxHint: "授权成功后约 2 秒内自动完成登录",
    wxRefresh: "刷新二维码",
    /** 手机号收验证码（与后端是否走真实短信一致，以实际收到为准） */
    phoneSmsHint: "验证码将发送至该手机号，5 分钟内有效；收不到时请检查拦截短信或号码是否正确。",
    devEmail: "开发环境固定验证码为 888888；生产环境需配置 SMTP 后方可发送真实邮件。",
    toastSent: "验证码已发送",
    toastWxSoon: "敬请期待",
    errPhone: "请输入 11 位有效手机号",
    errCode: "请输入验证码",
    errPwd: "请输入密码",
    errEmail: "请输入有效邮箱",
    errEmailCode: "请输入邮箱验证码",
    pwdMin: "密码至少 6 位",
    pwdMismatch: "两次输入的密码不一致",
  },
  en: {
    title: "Sign in",
    subtitle: "Choose a sign-in method",
    tabPhone: "Phone",
    tabEmail: "Email",
    tabWechat: "WeChat",
    phoneCodeLogin: "SMS code",
    phonePwdLogin: "Password",
    phoneRegister: "Register",
    phoneLabel: "Phone number",
    phonePlaceholder: "11-digit mobile number",
    rememberPhone: "Remember phone for next time",
    codeLabel: "Verification code",
    codePlaceholder: "Enter code",
    sendCode: "Send code",
    sending: "Sending…",
    retryIn: (s: number) => `Retry in ${s}s`,
    login: "Sign in",
    loggingIn: "Signing in…",
    pwdLabel: "Password",
    pwdPlaceholder: "Password",
    forgotPwd: "Forgot password?",
    forgotPwdToast: "Reset with a code sent to your phone or email",
    resetTitle: "Reset password",
    resetSubtitle: "Enter the phone or email you registered with",
    resetBack: "Back to sign in",
    resetPrevStep: "Back",
    resetAccountLabel: "Phone or email",
    resetAccountPh: "Phone number or email",
    resetSendCode: "Send code",
    resetNext: "Continue",
    resetCodeLabel: "Verification code",
    resetNewPwd: "New password (min 6 characters)",
    resetConfirmPwd: "Confirm new password",
    resetSubmit: "Reset password",
    resetSubmitting: "Submitting…",
    resetSuccess: "Password updated. Sign in with your new password.",
    resetCodeDeliveryHint: "Check your phone or inbox for the code; check spam if missing.",
    resetErrAccount: "Enter a valid phone number or email",
    noAccount: "No account? Register",
    hasAccount: "Have an account? Password sign-in",
    regCodeLabel: "Code",
    regCodePh: "6 digits",
    regPwdLabel: "Password (min 6 characters)",
    regPwd2Label: "Confirm password",
    register: "Register",
    registering: "Registering…",
    emailLogin: "Sign in",
    emailRegister: "Register",
    emailLabel: "Email",
    emailCodeLabel: "Email code",
    emailPwdHint: "Forgot password?",
    emailPwdToast: "Reset with a code sent to your phone or email",
    otherWays: "Other options",
    linkPhone: "Phone",
    linkEmail: "Email",
    linkWechat: "WeChat",
    agreement: "By continuing you agree to the",
    terms: "Terms",
    and: "and",
    privacy: "Privacy Policy",
    wxLoading: "Loading QR code…",
    wxClosed: "WeChat sign-in unavailable",
    wxClosedHint: "Enable WeChat Open Platform to use QR login",
    wxScan: "Scan with WeChat to sign in",
    wxHint: "You will be signed in within about 2 seconds",
    wxRefresh: "Refresh QR",
    phoneSmsHint: "We will send a code to this number — valid 5 minutes. Check spam filters if missing.",
    devEmail: "Dev: email code is 888888. Production needs SMTP.",
    toastSent: "Code sent",
    toastWxSoon: "Coming soon",
    errPhone: "Enter a valid 11-digit phone number",
    errCode: "Enter the verification code",
    errPwd: "Enter your password",
    errEmail: "Enter a valid email",
    errEmailCode: "Enter the email verification code",
    pwdMin: "Password must be at least 6 characters",
    pwdMismatch: "Passwords do not match",
  },
} as const;

export type LoginCopy = (typeof loginStrings)[LoginLocale];
