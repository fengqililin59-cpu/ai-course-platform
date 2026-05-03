import * as React from "react";
import QRCode from "react-qr-code";
import { Chrome, Github } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchGithubOAuthUrl,
  fetchGoogleOAuthUrl,
  fetchOauthConfig,
  fetchWechatLoginStatus,
  fetchWechatQrUrl,
  friendlyAuthErrorMessage,
  loginSiteEmail,
  loginSitePhonePassword,
  pollWechatScan,
  registerSiteEmail,
  registerSitePhone,
  requestPasswordResetCode,
  resetSitePassword,
  sendSiteEmailCode,
  sendSitePhoneCode,
  verifyPhoneForSiteLogin,
} from "@/lib/siteAuthApi";
import { useToast } from "@/contexts/ToastContext";
import { setSiteUserToken } from "@/lib/siteUserAuth";
import {
  detectLoginLocale,
  loginStrings,
  registerWelcomeToastMessage,
  type LoginCopy,
  wechatLoginToastMessage,
  welcomeBackToastMessage,
} from "@/components/loginModalLocale";

const LS_REMEMBER_PHONE = "site_login_remember_phone";
const LS_SAVED_PHONE = "site_login_saved_phone";

const dividerLine = "border-[#e2e8f0]";
const errText = "text-[13px] text-[#ef4444]";

function useLoginCopy(): LoginCopy {
  return React.useMemo(() => {
    const loc = detectLoginLocale();
    return loginStrings[loc];
  }, []);
}

function oauthEnabled(name: "github" | "google"): boolean {
  const v =
    name === "github"
      ? import.meta.env.VITE_LOGIN_OAUTH_GITHUB
      : import.meta.env.VITE_LOGIN_OAUTH_GOOGLE;
  const s = String(v ?? "").toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function fieldInputClass(extra?: string) {
  return cn(
    "min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-base shadow-sm",
    "border-[#e2e8f0] placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
    "focus-visible:border-[hsl(262_78%_52%)] focus-visible:ring-[hsl(262_78%_52%)]/40",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "sm:min-h-10 sm:text-sm",
    extra,
  );
}

function primarySubmitClass(disabled?: boolean) {
  return cn(
    "inline-flex min-h-[48px] h-12 w-full items-center justify-center rounded-md px-4 text-base font-medium text-white shadow-md transition-[opacity,box-shadow]",
    "bg-gradient-to-r from-[hsl(262_78%_52%)] to-[hsl(330_76%_55%)]", // from-hsl(262 78% 52%) → to-hsl(330 76% 55%)
    "hover:opacity-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_78%_52%)]/35 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-45",
    "sm:text-sm",
    disabled && "pointer-events-none",
  );
}

type Tab = "phone" | "email" | "wechat";
type EmailMode = "login" | "register";
type PhoneSubTab = "code" | "password" | "register";
type LoginPanel = "main" | "reset";

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: (identity: string) => void;
  onSessionEstablished?: () => void | Promise<void>;
};

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone.trim());
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function finishSiteSession(
  identity: string,
  onLoginSuccess: (identity: string) => void,
  onOpenChange: (open: boolean) => void,
  showToast: (msg: string, type: "success" | "error" | "info") => void,
  toastMsg: string,
  onSessionEstablished?: () => void | Promise<void>,
) {
  showToast(toastMsg, "success");
  onLoginSuccess(identity);
  onOpenChange(false);
  void Promise.resolve(onSessionEstablished?.());
}

export function LoginModal({
  open,
  onOpenChange,
  onLoginSuccess,
  onSessionEstablished,
}: LoginModalProps) {
  const s = useLoginCopy();
  const locale = React.useMemo(() => detectLoginLocale(), []);
  const { showToast } = useToast();
  const [oauthCfg, setOauthCfg] = React.useState({ github: false, google: false });
  const showGithub = oauthEnabled("github") || oauthCfg.github;
  const showGoogle = oauthEnabled("google") || oauthCfg.google;

  const [panel, setPanel] = React.useState<LoginPanel>("main");
  const [resetStep, setResetStep] = React.useState<1 | 2>(1);
  const [resetAccount, setResetAccount] = React.useState("");
  const [resetCode, setResetCode] = React.useState("");
  const [resetNewPwd, setResetNewPwd] = React.useState("");
  const [resetConfirmPwd, setResetConfirmPwd] = React.useState("");
  const [resetCd, setResetCd] = React.useState(0);
  const [resetSendBusy, setResetSendBusy] = React.useState(false);
  const [resetSubmitBusy, setResetSubmitBusy] = React.useState(false);
  const [resetErr, setResetErr] = React.useState("");

  const [tab, setTab] = React.useState<Tab>("phone");
  const [phoneSubTab, setPhoneSubTab] = React.useState<PhoneSubTab>("password");

  const [phone, setPhone] = React.useState("");
  const [rememberPhone, setRememberPhone] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [countdown, setCountdown] = React.useState(0);
  const prevCountdown = React.useRef(0);
  const [phoneError, setPhoneError] = React.useState("");
  const [sendError, setSendError] = React.useState("");
  const [loginError, setLoginError] = React.useState("");
  const [sendingCode, setSendingCode] = React.useState(false);
  const [loggingIn, setLoggingIn] = React.useState(false);
  const phoneCodeRef = React.useRef<HTMLInputElement>(null);

  const [phonePwd, setPhonePwd] = React.useState("");
  const [phonePwdError, setPhonePwdError] = React.useState("");
  const [phonePwdBusy, setPhonePwdBusy] = React.useState(false);

  const [regCode, setRegCode] = React.useState("");
  const [regPwd, setRegPwd] = React.useState("");
  const [regPwdConfirm, setRegPwdConfirm] = React.useState("");
  const [regCd, setRegCd] = React.useState(0);
  const prevRegCd = React.useRef(0);
  const [regBusy, setRegBusy] = React.useState(false);
  const [regError, setRegError] = React.useState("");
  const [sendingRegCode, setSendingRegCode] = React.useState(false);
  const phoneRegCodeRef = React.useRef<HTMLInputElement>(null);

  const [emailMode, setEmailMode] = React.useState<EmailMode>("login");
  const [email, setEmail] = React.useState("");
  const [emailPwd, setEmailPwd] = React.useState("");
  const [emailPwdConfirm, setEmailPwdConfirm] = React.useState("");
  const [emailCode, setEmailCode] = React.useState("");
  const [emailCd, setEmailCd] = React.useState(0);
  const prevEmailCd = React.useRef(0);
  const [emailBusy, setEmailBusy] = React.useState(false);
  const [emailErr, setEmailErr] = React.useState("");
  const emailCodeRef = React.useRef<HTMLInputElement>(null);

  const [wxQrUrl, setWxQrUrl] = React.useState<string | null>(null);
  const [wxState, setWxState] = React.useState<string | null>(null);
  const [wxAvailable, setWxAvailable] = React.useState<boolean | null>(null);
  const [wxLoading, setWxLoading] = React.useState(false);
  const wxBootRef = React.useRef(false);

  const initWechatPanel = React.useCallback(async () => {
    setWxLoading(true);
    setWxQrUrl(null);
    setWxState(null);
    try {
      const { available } = await fetchWechatLoginStatus();
      if (!available) {
        setWxAvailable(false);
        return;
      }
      const d = await fetchWechatQrUrl();
      if (!d.configured || !d.qrUrl || !d.state) {
        setWxAvailable(false);
        return;
      }
      setWxAvailable(true);
      setWxQrUrl(d.qrUrl);
      setWxState(d.state);
    } catch (e) {
      setWxAvailable(false);
      const msg = friendlyAuthErrorMessage(e, "暂时无法使用微信登录，请换一种方式");
      showToast(msg, "error");
    } finally {
      setWxLoading(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    if (!open) {
      setPanel("main");
      setResetStep(1);
      setResetAccount("");
      setResetCode("");
      setResetNewPwd("");
      setResetConfirmPwd("");
      setResetCd(0);
      setResetSendBusy(false);
      setResetSubmitBusy(false);
      setResetErr("");
      setTab("phone");
      setPhoneSubTab("password");
      setPhone("");
      setRememberPhone(false);
      setCode("");
      setCountdown(0);
      prevCountdown.current = 0;
      setPhoneError("");
      setSendError("");
      setLoginError("");
      setSendingCode(false);
      setLoggingIn(false);
      setPhonePwd("");
      setPhonePwdError("");
      setPhonePwdBusy(false);
      setRegCode("");
      setRegPwd("");
      setRegPwdConfirm("");
      setRegCd(0);
      prevRegCd.current = 0;
      setRegBusy(false);
      setRegError("");
      setSendingRegCode(false);
      setEmailMode("login");
      setEmail("");
      setEmailPwd("");
      setEmailPwdConfirm("");
      setEmailCode("");
      setEmailCd(0);
      prevEmailCd.current = 0;
      setEmailBusy(false);
      setEmailErr("");
      setWxQrUrl(null);
      setWxState(null);
      setWxAvailable(null);
      setWxLoading(false);
      wxBootRef.current = false;
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    void fetchOauthConfig().then(setOauthCfg);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    try {
      const remember = window.localStorage.getItem(LS_REMEMBER_PHONE) === "1";
      setRememberPhone(remember);
      if (remember) {
        const saved = (window.localStorage.getItem(LS_SAVED_PHONE) || "").replace(/\D/g, "").slice(0, 11);
        setPhone(saved);
      }
    } catch {
      /* ignore */
    }
  }, [open]);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  React.useEffect(() => {
    if (prevCountdown.current > 0 && countdown === 0 && tab === "phone" && phoneSubTab === "code") {
      window.requestAnimationFrame(() => phoneCodeRef.current?.focus());
    }
    prevCountdown.current = countdown;
  }, [countdown, tab, phoneSubTab]);

  React.useEffect(() => {
    if (emailCd <= 0) return;
    const t = window.setTimeout(() => setEmailCd((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [emailCd]);

  React.useEffect(() => {
    if (prevEmailCd.current > 0 && emailCd === 0 && tab === "email" && emailMode === "register") {
      window.requestAnimationFrame(() => emailCodeRef.current?.focus());
    }
    prevEmailCd.current = emailCd;
  }, [emailCd, tab, emailMode]);

  React.useEffect(() => {
    if (resetCd <= 0) return;
    const t = window.setTimeout(() => setResetCd((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resetCd]);

  React.useEffect(() => {
    if (regCd <= 0) return;
    const t = window.setTimeout(() => setRegCd((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [regCd]);

  React.useEffect(() => {
    if (prevRegCd.current > 0 && regCd === 0 && tab === "phone" && phoneSubTab === "register") {
      window.requestAnimationFrame(() => phoneRegCodeRef.current?.focus());
    }
    prevRegCd.current = regCd;
  }, [regCd, tab, phoneSubTab]);

  React.useEffect(() => {
    if (tab !== "wechat" || !wxState || !wxQrUrl || wxAvailable !== true) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const r = await pollWechatScan(wxState);
          if (r.status === "done" && r.wechatOpenId) {
            window.clearInterval(id);
            if (r.token) setSiteUserToken(r.token);
            finishSiteSession(
              `wx:${r.wechatOpenId}`,
              onLoginSuccess,
              onOpenChange,
              showToast,
              wechatLoginToastMessage(locale),
              onSessionEstablished,
            );
          }
        } catch {
          /* 继续轮询 */
        }
      })();
    }, 2000);
    return () => window.clearInterval(id);
  }, [tab, wxState, wxQrUrl, wxAvailable, onLoginSuccess, onOpenChange, showToast, onSessionEstablished, locale]);

  function persistRememberPhoneIfNeeded(nextPhone: string) {
    try {
      if (rememberPhone) {
        window.localStorage.setItem(LS_REMEMBER_PHONE, "1");
        window.localStorage.setItem(LS_SAVED_PHONE, nextPhone);
      } else {
        window.localStorage.removeItem(LS_REMEMBER_PHONE);
        window.localStorage.removeItem(LS_SAVED_PHONE);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleGetCode() {
    const p = phone.trim();
    if (!isValidPhone(p)) {
      setPhoneError(s.errPhone);
      return;
    }
    setPhoneError("");
    setSendError("");
    if (countdown > 0 || sendingCode) return;

    setSendingCode(true);
    try {
      await sendSitePhoneCode(p, "login");
      setCountdown(60);
      showToast(s.toastSent, "success");
      window.requestAnimationFrame(() => {
        phoneCodeRef.current?.focus();
      });
    } catch (e) {
      const msg = friendlyAuthErrorMessage(e, "验证码发送失败，请稍后重试");
      setSendError(msg);
      showToast(msg, "error");
    } finally {
      setSendingCode(false);
    }
  }

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    const p = phone.trim();
    if (!isValidPhone(p)) {
      setPhoneError(s.errPhone);
      return;
    }
    if (!code.trim()) {
      setLoginError(s.errCode);
      return;
    }
    setLoginError("");
    setLoggingIn(true);
    try {
      const r = await verifyPhoneForSiteLogin(p, code.trim());
      if (r.token) setSiteUserToken(r.token);
      persistRememberPhoneIfNeeded(p);
      finishSiteSession(p, onLoginSuccess, onOpenChange, showToast, welcomeBackToastMessage(p, locale), onSessionEstablished);
    } catch (e) {
      const msg = friendlyAuthErrorMessage(e, "登录失败，请检查验证码后重试");
      setLoginError(msg);
      showToast(msg, "error");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleGetRegCode() {
    const p = phone.trim();
    if (!isValidPhone(p)) {
      setPhoneError(s.errPhone);
      return;
    }
    setPhoneError("");
    setRegError("");
    if (regCd > 0 || sendingRegCode) return;
    setSendingRegCode(true);
    try {
      await sendSitePhoneCode(p, "register");
      setRegCd(60);
      showToast(s.toastSent, "success");
      window.requestAnimationFrame(() => {
        phoneRegCodeRef.current?.focus();
      });
    } catch (e) {
      const msg = friendlyAuthErrorMessage(e, "验证码发送失败，请稍后重试");
      setRegError(msg);
      showToast(msg, "error");
    } finally {
      setSendingRegCode(false);
    }
  }

  async function handlePhonePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    const p = phone.trim();
    if (!isValidPhone(p)) {
      setPhoneError(s.errPhone);
      return;
    }
    if (!phonePwd) {
      const msg = s.errPwd;
      setPhonePwdError(msg);
      showToast(msg, "error");
      return;
    }
    setPhonePwdError("");
    setPhoneError("");
    setPhonePwdBusy(true);
    try {
      const r = await loginSitePhonePassword(p, phonePwd);
      if (r.token) setSiteUserToken(r.token);
      persistRememberPhoneIfNeeded(p);
      finishSiteSession(
        p,
        onLoginSuccess,
        onOpenChange,
        showToast,
        welcomeBackToastMessage(p, locale),
        onSessionEstablished,
      );
    } catch (e) {
      const msg = friendlyAuthErrorMessage(e, "登录失败，请检查手机号与密码");
      setPhonePwdError(msg);
      showToast(msg, "error");
    } finally {
      setPhonePwdBusy(false);
    }
  }

  async function handlePhoneRegister(e: React.FormEvent) {
    e.preventDefault();
    const p = phone.trim();
    if (!isValidPhone(p)) {
      setPhoneError(s.errPhone);
      return;
    }
    if (!regCode.trim()) {
      const msg = s.errCode;
      setRegError(msg);
      showToast(msg, "error");
      return;
    }
    if (regPwd.length < 6) {
      const msg = s.pwdMin;
      setRegError(msg);
      showToast(msg, "error");
      return;
    }
    if (regPwd !== regPwdConfirm) {
      const msg = s.pwdMismatch;
      setRegError(msg);
      showToast(msg, "error");
      return;
    }
    setRegError("");
    setPhoneError("");
    setRegBusy(true);
    try {
      const r = await registerSitePhone({
        phone: p,
        code: regCode.trim(),
        password: regPwd,
        confirmPassword: regPwdConfirm,
      });
      if (r.token) setSiteUserToken(r.token);
      persistRememberPhoneIfNeeded(p);
      finishSiteSession(
        r.phone,
        onLoginSuccess,
        onOpenChange,
        showToast,
        registerWelcomeToastMessage(locale),
        onSessionEstablished,
      );
    } catch (e) {
      const msg = friendlyAuthErrorMessage(e, "注册失败，请稍后重试");
      setRegError(msg);
      showToast(msg, "error");
    } finally {
      setRegBusy(false);
    }
  }

  async function handleSendEmailCode() {
    const em = email.trim();
    if (!isValidEmail(em)) {
      const msg = s.errEmail;
      setEmailErr(msg);
      showToast(msg, "error");
      return;
    }
    if (emailCd > 0 || emailBusy) return;
    setEmailErr("");
    setEmailBusy(true);
    try {
      await sendSiteEmailCode(em);
      setEmailCd(60);
      showToast(s.toastSent, "success");
      window.requestAnimationFrame(() => {
        emailCodeRef.current?.focus();
      });
    } catch (e) {
      const msg = friendlyAuthErrorMessage(e, "验证码发送失败，请稍后重试");
      setEmailErr(msg);
      showToast(msg, "error");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!isValidEmail(em)) {
      const msg = s.errEmail;
      setEmailErr(msg);
      showToast(msg, "error");
      return;
    }
    if (!emailPwd) {
      const msg = s.errPwd;
      setEmailErr(msg);
      showToast(msg, "error");
      return;
    }
    setEmailErr("");
    setEmailBusy(true);
    try {
      const auth = await loginSiteEmail(em, emailPwd);
      if (auth.token) setSiteUserToken(auth.token);
      finishSiteSession(
        `mail:${em}`,
        onLoginSuccess,
        onOpenChange,
        showToast,
        welcomeBackToastMessage(`mail:${em}`, locale),
        onSessionEstablished,
      );
    } catch (err) {
      const msg = friendlyAuthErrorMessage(err, "登录失败，请稍后重试");
      setEmailErr(msg);
      showToast(msg, "error");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!isValidEmail(em)) {
      const msg = s.errEmail;
      setEmailErr(msg);
      showToast(msg, "error");
      return;
    }
    if (!emailCode.trim()) {
      const msg = s.errEmailCode;
      setEmailErr(msg);
      showToast(msg, "error");
      return;
    }
    if (emailPwd.length < 6) {
      const msg = s.pwdMin;
      setEmailErr(msg);
      showToast(msg, "error");
      return;
    }
    if (emailPwd !== emailPwdConfirm) {
      const msg = s.pwdMismatch;
      setEmailErr(msg);
      showToast(msg, "error");
      return;
    }
    setEmailErr("");
    setEmailBusy(true);
    try {
      const reg = await registerSiteEmail({
        email: em,
        password: emailPwd,
        code: emailCode.trim(),
      });
      if (reg.token) setSiteUserToken(reg.token);
      else {
        const auth = await loginSiteEmail(em, emailPwd);
        if (auth.token) setSiteUserToken(auth.token);
      }
      finishSiteSession(
        `mail:${em}`,
        onLoginSuccess,
        onOpenChange,
        showToast,
        registerWelcomeToastMessage(locale),
        onSessionEstablished,
      );
    } catch (err) {
      const msg = friendlyAuthErrorMessage(err, "注册失败，请稍后重试");
      setEmailErr(msg);
      showToast(msg, "error");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleGithubOAuth() {
    try {
      const url = await fetchGithubOAuthUrl();
      window.location.href = url;
    } catch (e) {
      showToast(friendlyAuthErrorMessage(e, "GitHub 登录暂不可用"), "error");
    }
  }

  async function handleGoogleOAuth() {
    try {
      const url = await fetchGoogleOAuthUrl();
      window.location.href = url;
    } catch (e) {
      showToast(friendlyAuthErrorMessage(e, "Google 登录暂不可用"), "error");
    }
  }

  async function sendResetVerification(isResend: boolean) {
    const acc = resetAccount.trim();
    if (!isValidPhone(acc) && !isValidEmail(acc)) {
      setResetErr(s.resetErrAccount);
      return;
    }
    setResetErr("");
    if (resetCd > 0 || resetSendBusy) return;
    setResetSendBusy(true);
    try {
      await requestPasswordResetCode(acc);
      if (!isResend) setResetStep(2);
      setResetCd(60);
      showToast(s.toastSent, "success");
    } catch (e) {
      const msg = friendlyAuthErrorMessage(e, "发送失败，请稍后重试");
      setResetErr(msg);
      showToast(msg, "error");
    } finally {
      setResetSendBusy(false);
    }
  }

  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const acc = resetAccount.trim();
    if (!isValidPhone(acc) && !isValidEmail(acc)) {
      setResetErr(s.resetErrAccount);
      return;
    }
    if (!resetCode.trim()) {
      setResetErr(s.errCode);
      return;
    }
    if (resetNewPwd.length < 6) {
      setResetErr(s.pwdMin);
      return;
    }
    if (resetNewPwd !== resetConfirmPwd) {
      setResetErr(s.pwdMismatch);
      return;
    }
    setResetErr("");
    setResetSubmitBusy(true);
    try {
      await resetSitePassword({
        account: acc,
        code: resetCode.trim(),
        newPassword: resetNewPwd,
        confirmPassword: resetConfirmPwd,
      });
      showToast(s.resetSuccess, "success");
      setPanel("main");
      setResetStep(1);
      setResetAccount("");
      setResetCode("");
      setResetNewPwd("");
      setResetConfirmPwd("");
      setResetCd(0);
    } catch (e) {
      const msg = friendlyAuthErrorMessage(e, "重置失败，请检查验证码与密码");
      setResetErr(msg);
      showToast(msg, "error");
    } finally {
      setResetSubmitBusy(false);
    }
  }

  React.useEffect(() => {
    if (tab !== "wechat") wxBootRef.current = false;
  }, [tab]);

  React.useEffect(() => {
    if (!open) {
      wxBootRef.current = false;
      return;
    }
    if (tab !== "wechat" || wxBootRef.current) return;
    wxBootRef.current = true;
    void initWechatPanel();
  }, [open, tab, initWechatPanel]);

  const tabBtn =
    "shrink-0 rounded-md px-3 py-2 text-base font-medium transition-colors data-[on=true]:bg-background data-[on=true]:text-foreground data-[on=true]:shadow-sm sm:py-1.5 sm:text-sm";

  const phoneSubBtn =
    "shrink-0 whitespace-nowrap rounded-md px-3 py-2.5 text-base font-medium transition-colors data-[on=true]:bg-background data-[on=true]:text-foreground data-[on=true]:shadow-sm sm:py-2 sm:text-sm";

  function OtherLoginWays({ exclude }: { exclude: Tab }) {
    const opts = (["phone", "email", "wechat"] as const).filter((t) => t !== exclude);
    const labels: Record<Tab, string> = {
      phone: s.linkPhone,
      email: s.linkEmail,
      wechat: s.linkWechat,
    };
    return (
      <div className="relative py-3">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className={cn("w-full border-t", dividerLine)} />
        </div>
        <div className="relative flex justify-center text-base sm:text-xs">
          <span className="bg-background px-2 text-muted-foreground">{s.otherWays}</span>
        </div>
        {(showGithub || showGoogle) && (
          <div className="mt-4 flex justify-center gap-4" role="group" aria-label="OAuth">
            {showGithub ? (
              <button
                type="button"
                title="GitHub"
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background transition-colors",
                  dividerLine,
                  "hover:border-[hsl(262_78%_52%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_78%_52%)]/30",
                )}
                onClick={() => void handleGithubOAuth()}
              >
                <Github className="h-5 w-5 text-foreground" aria-hidden />
              </button>
            ) : null}
            {showGoogle ? (
              <button
                type="button"
                title="Google"
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background transition-colors",
                  dividerLine,
                  "hover:border-[hsl(262_78%_52%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_78%_52%)]/30",
                )}
                onClick={() => void handleGoogleOAuth()}
              >
                <Chrome className="h-5 w-5 text-foreground" aria-hidden />
              </button>
            ) : null}
          </div>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {opts.map((t) => (
            <Button key={t} type="button" variant="ghost" size="sm" className="h-10 min-h-[44px] text-base sm:h-8 sm:min-h-0 sm:text-xs" onClick={() => setTab(t)}>
              {labels[t]}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const outlineCodeBtn =
    "min-h-[44px] h-11 w-full shrink-0 rounded-md border border-[#e2e8f0] bg-background px-3 text-base font-medium transition-colors hover:border-[hsl(262_78%_52%)]/50 sm:h-10 sm:w-auto sm:text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] gap-4 overflow-y-auto border shadow-xl",
          "w-[95%] max-w-[380px] p-5 text-base",
          "sm:w-[80%] sm:max-w-[500px] sm:p-5",
          "md:w-[480px] md:max-w-[480px] md:p-6",
          dividerLine,
        )}
      >
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-[hsl(262_78%_52%)] to-[hsl(330_76%_55%)] bg-clip-text text-xl font-semibold text-transparent sm:text-lg">
            {panel === "main" ? s.title : s.resetTitle}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground sm:text-sm">
            {panel === "main" ? s.subtitle : s.resetSubtitle}
          </DialogDescription>
        </DialogHeader>

        {panel === "reset" ? (
          <div className="space-y-4">
            {resetStep === 1 ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="reset-account" className="text-base font-medium sm:text-sm">
                    {s.resetAccountLabel}
                  </label>
                  <input
                    id="reset-account"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    placeholder={s.resetAccountPh}
                    value={resetAccount}
                    onChange={(e) => {
                      setResetAccount(e.target.value);
                      setResetErr("");
                    }}
                    className={fieldInputClass(resetErr ? "border-[#ef4444] ring-[#ef4444]/20" : "")}
                  />
                </div>
                {resetErr ? <p className={errText}>{resetErr}</p> : null}
                <button
                  type="button"
                  className={primarySubmitClass(resetSendBusy)}
                  disabled={resetSendBusy}
                  onClick={() => void sendResetVerification(false)}
                >
                  {resetSendBusy ? s.sending : s.resetSendCode}
                </button>
                <button
                  type="button"
                  className="w-full text-base text-muted-foreground underline-offset-2 hover:underline sm:text-xs"
                  onClick={() => {
                    setPanel("main");
                    setResetErr("");
                  }}
                >
                  {s.resetBack}
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleResetPasswordSubmit(e)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reset-acc-readonly" className="text-base font-medium sm:text-sm">
                    {s.resetAccountLabel}
                  </label>
                  <input
                    id="reset-acc-readonly"
                    readOnly
                    className={fieldInputClass("bg-muted/50")}
                    value={resetAccount}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reset-code" className="text-base font-medium sm:text-sm">
                    {s.resetCodeLabel}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className={fieldInputClass("min-w-0 flex-1")}
                      value={resetCode}
                      onChange={(e) => {
                        setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setResetErr("");
                      }}
                      placeholder={s.regCodePh}
                    />
                    <button
                      type="button"
                      className={outlineCodeBtn}
                      disabled={resetCd > 0 || resetSendBusy}
                      onClick={() => void sendResetVerification(true)}
                    >
                      {resetCd > 0 ? s.retryIn(resetCd) : resetSendBusy ? s.sending : s.resetSendCode}
                    </button>
                  </div>
                  <p className="text-[13px] text-muted-foreground sm:text-[11px]">{s.resetCodeDeliveryHint}</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reset-new-pwd" className="text-base font-medium sm:text-sm">
                    {s.resetNewPwd}
                  </label>
                  <input
                    id="reset-new-pwd"
                    type="password"
                    autoComplete="new-password"
                    className={fieldInputClass()}
                    value={resetNewPwd}
                    onChange={(e) => {
                      setResetNewPwd(e.target.value);
                      setResetErr("");
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reset-confirm-pwd" className="text-base font-medium sm:text-sm">
                    {s.resetConfirmPwd}
                  </label>
                  <input
                    id="reset-confirm-pwd"
                    type="password"
                    autoComplete="new-password"
                    className={fieldInputClass()}
                    value={resetConfirmPwd}
                    onChange={(e) => {
                      setResetConfirmPwd(e.target.value);
                      setResetErr("");
                    }}
                  />
                </div>
                {resetErr ? <p className={errText}>{resetErr}</p> : null}
                <button type="submit" className={primarySubmitClass(resetSubmitBusy)} disabled={resetSubmitBusy}>
                  {resetSubmitBusy ? s.resetSubmitting : s.resetSubmit}
                </button>
                <div className="flex flex-wrap justify-between gap-2">
                  <button
                    type="button"
                    className="text-base text-muted-foreground underline-offset-2 hover:underline sm:text-xs"
                    onClick={() => {
                      setResetStep(1);
                      setResetErr("");
                    }}
                  >
                    {s.resetPrevStep}
                  </button>
                  <button
                    type="button"
                    className="text-base text-muted-foreground underline-offset-2 hover:underline sm:text-xs"
                    onClick={() => {
                      setPanel("main");
                      setResetStep(1);
                      setResetErr("");
                    }}
                  >
                    {s.resetBack}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <>
        <div
          className={cn(
            "flex gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            dividerLine,
          )}
        >
          <button
            type="button"
            data-on={tab === "phone"}
            className={cn(tabBtn, tab === "phone" ? "" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setTab("phone")}
          >
            {s.tabPhone}
          </button>
          <button
            type="button"
            data-on={tab === "email"}
            className={cn(tabBtn, tab === "email" ? "" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setTab("email")}
          >
            {s.tabEmail}
          </button>
          <button
            type="button"
            data-on={tab === "wechat"}
            className={cn(tabBtn, tab === "wechat" ? "" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setTab("wechat")}
          >
            {s.tabWechat}
          </button>
        </div>

        {tab === "phone" ? (
          <>
            <div
              className={cn(
                "flex gap-1 overflow-x-auto rounded-md border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                dividerLine,
              )}
            >
              <button
                type="button"
                data-on={phoneSubTab === "password"}
                className={cn(
                  phoneSubBtn,
                  phoneSubTab === "password" ? "" : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setPhoneSubTab("password");
                  setPhonePwdError("");
                  setRegError("");
                  setLoginError("");
                }}
              >
                {s.phonePwdLogin}
              </button>
              <button
                type="button"
                data-on={phoneSubTab === "code"}
                className={cn(phoneSubBtn, phoneSubTab === "code" ? "" : "text-muted-foreground hover:text-foreground")}
                onClick={() => {
                  setPhoneSubTab("code");
                  setPhonePwdError("");
                  setRegError("");
                  setLoginError("");
                }}
              >
                {s.phoneCodeLogin}
              </button>
              <button
                type="button"
                data-on={phoneSubTab === "register"}
                className={cn(
                  phoneSubBtn,
                  phoneSubTab === "register" ? "" : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setPhoneSubTab("register");
                  setPhonePwdError("");
                  setRegError("");
                  setLoginError("");
                }}
              >
                {s.phoneRegister}
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-phone" className="text-base font-medium sm:text-sm">
                {s.phoneLabel}
              </label>
              <input
                id="login-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                placeholder={s.phonePlaceholder}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ""));
                  setPhoneError("");
                  setSendError("");
                  setPhonePwdError("");
                  setRegError("");
                }}
                className={fieldInputClass(phoneError ? "border-[#ef4444] ring-[#ef4444]/20" : "")}
              />
              {phoneError ? <p className={errText}>{phoneError}</p> : null}
              {(phoneSubTab === "code" || phoneSubTab === "password") && (
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 py-1 text-base text-muted-foreground sm:min-h-0 sm:text-sm">
                  <input
                    type="checkbox"
                    checked={rememberPhone}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRememberPhone(checked);
                      try {
                        if (checked && isValidPhone(phone)) {
                          window.localStorage.setItem(LS_REMEMBER_PHONE, "1");
                          window.localStorage.setItem(LS_SAVED_PHONE, phone.trim());
                        }
                        if (!checked) {
                          window.localStorage.removeItem(LS_REMEMBER_PHONE);
                          window.localStorage.removeItem(LS_SAVED_PHONE);
                        }
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#e2e8f0] text-[hsl(262_78%_52%)]"
                  />
                  <span className="leading-snug">{s.rememberPhone}</span>
                </label>
              )}
            </div>

            {phoneSubTab === "code" ? (
              <form onSubmit={(e) => void handlePhoneLogin(e)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="login-code" className="text-base font-medium sm:text-sm">
                    {s.codeLabel}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      ref={phoneCodeRef}
                      id="login-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder={s.codePlaceholder}
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setLoginError("");
                      }}
                      className={fieldInputClass("min-w-0 flex-1")}
                    />
                    <button
                      type="button"
                      className={outlineCodeBtn}
                      disabled={countdown > 0 || sendingCode}
                      onClick={() => void handleGetCode()}
                    >
                      {countdown > 0 ? s.retryIn(countdown) : sendingCode ? s.sending : s.sendCode}
                    </button>
                  </div>
                  {sendError ? (
                    <p className={errText}>{sendError}</p>
                  ) : (
                    <p className="text-[13px] text-muted-foreground sm:text-[11px]">{s.phoneSmsHint}</p>
                  )}
                  {loginError ? <p className={errText}>{loginError}</p> : null}
                </div>
                <DialogFooter className="gap-2 pt-2 sm:gap-0">
                  <button type="submit" className={primarySubmitClass(loggingIn)} disabled={loggingIn}>
                    {loggingIn ? s.loggingIn : s.login}
                  </button>
                </DialogFooter>
              </form>
            ) : null}

            {phoneSubTab === "password" ? (
              <form onSubmit={(e) => void handlePhonePasswordLogin(e)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="login-phone-pwd" className="text-base font-medium sm:text-sm">
                    {s.pwdLabel}
                  </label>
                  <input
                    id="login-phone-pwd"
                    type="password"
                    autoComplete="current-password"
                    className={fieldInputClass()}
                    value={phonePwd}
                    onChange={(e) => {
                      setPhonePwd(e.target.value);
                      setPhonePwdError("");
                    }}
                    placeholder={s.pwdPlaceholder}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      className="text-base text-[hsl(262_78%_52%)] underline-offset-2 hover:underline sm:text-xs"
                      onClick={() => {
                        setPanel("reset");
                        setResetStep(1);
                        setResetAccount(isValidPhone(phone) ? phone.trim() : "");
                        setResetCode("");
                        setResetNewPwd("");
                        setResetConfirmPwd("");
                        setResetCd(0);
                        setResetErr("");
                      }}
                    >
                      {s.forgotPwd}
                    </button>
                    <button
                      type="button"
                      className="text-base text-muted-foreground underline-offset-2 hover:underline sm:text-xs"
                      onClick={() => {
                        setPhoneSubTab("register");
                        setPhonePwdError("");
                        setRegError("");
                      }}
                    >
                      {s.noAccount}
                    </button>
                  </div>
                  {phonePwdError ? <p className={errText}>{phonePwdError}</p> : null}
                </div>
                <button type="submit" className={primarySubmitClass(phonePwdBusy)} disabled={phonePwdBusy}>
                  {phonePwdBusy ? s.loggingIn : s.login}
                </button>
              </form>
            ) : null}

            {phoneSubTab === "register" ? (
              <form onSubmit={(e) => void handlePhoneRegister(e)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reg-phone-code" className="text-base font-medium sm:text-sm">
                    {s.regCodeLabel}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      ref={phoneRegCodeRef}
                      id="reg-phone-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className={fieldInputClass("min-w-0 flex-1")}
                      value={regCode}
                      onChange={(e) => {
                        setRegCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setRegError("");
                      }}
                      placeholder={s.regCodePh}
                    />
                    <button
                      type="button"
                      className={outlineCodeBtn}
                      disabled={regCd > 0 || sendingRegCode}
                      onClick={() => void handleGetRegCode()}
                    >
                      {regCd > 0 ? s.retryIn(regCd) : sendingRegCode ? s.sending : s.sendCode}
                    </button>
                  </div>
                  <p className="text-[13px] text-muted-foreground sm:text-[11px]">{s.phoneSmsHint}</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-phone-pwd" className="text-base font-medium sm:text-sm">
                    {s.regPwdLabel}
                  </label>
                  <input
                    id="reg-phone-pwd"
                    type="password"
                    autoComplete="new-password"
                    className={fieldInputClass()}
                    value={regPwd}
                    onChange={(e) => {
                      setRegPwd(e.target.value);
                      setRegError("");
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-phone-pwd2" className="text-base font-medium sm:text-sm">
                    {s.regPwd2Label}
                  </label>
                  <input
                    id="reg-phone-pwd2"
                    type="password"
                    autoComplete="new-password"
                    className={fieldInputClass()}
                    value={regPwdConfirm}
                    onChange={(e) => {
                      setRegPwdConfirm(e.target.value);
                      setRegError("");
                    }}
                  />
                </div>
                {regError ? <p className={errText}>{regError}</p> : null}
                <button type="submit" className={primarySubmitClass(regBusy)} disabled={regBusy}>
                  {regBusy ? s.registering : s.register}
                </button>
                <p className="text-center text-base text-muted-foreground sm:text-xs">
                  <button
                    type="button"
                    className="text-[hsl(262_78%_52%)] underline-offset-2 hover:underline"
                    onClick={() => {
                      setPhoneSubTab("password");
                      setRegError("");
                    }}
                  >
                    {s.hasAccount}
                  </button>
                </p>
              </form>
            ) : null}

            <OtherLoginWays exclude="phone" />
          </>
        ) : null}

        {tab === "email" ? (
          <>
            <div
              className={cn(
                "flex gap-1 overflow-x-auto rounded-md border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                dividerLine,
              )}
            >
              <button
                type="button"
                className={cn(phoneSubBtn, emailMode === "login" ? "" : "text-muted-foreground hover:text-foreground")}
                onClick={() => {
                  setEmailMode("login");
                  setEmailErr("");
                }}
              >
                {s.emailLogin}
              </button>
              <button
                type="button"
                className={cn(
                  phoneSubBtn,
                  emailMode === "register" ? "" : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setEmailMode("register");
                  setEmailErr("");
                }}
              >
                {s.emailRegister}
              </button>
            </div>

            {emailMode === "login" ? (
              <form onSubmit={(e) => void handleEmailLogin(e)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-base font-medium sm:text-sm" htmlFor="login-email">
                    {s.emailLabel}
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    className={fieldInputClass()}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailErr("");
                    }}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-base font-medium sm:text-sm" htmlFor="login-email-pwd">
                    {s.pwdLabel}
                  </label>
                  <input
                    id="login-email-pwd"
                    type="password"
                    autoComplete="current-password"
                    className={fieldInputClass()}
                    value={emailPwd}
                    onChange={(e) => {
                      setEmailPwd(e.target.value);
                      setEmailErr("");
                    }}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-base text-[hsl(262_78%_52%)] underline-offset-2 hover:underline sm:text-xs"
                      onClick={() => {
                        setPanel("reset");
                        setResetStep(1);
                        setResetAccount(isValidEmail(email) ? email.trim() : "");
                        setResetCode("");
                        setResetNewPwd("");
                        setResetConfirmPwd("");
                        setResetCd(0);
                        setResetErr("");
                      }}
                    >
                      {s.emailPwdHint}
                    </button>
                  </div>
                </div>
                {emailErr ? <p className={errText}>{emailErr}</p> : null}
                <button type="submit" className={primarySubmitClass(emailBusy)} disabled={emailBusy}>
                  {emailBusy ? s.loggingIn : s.login}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => void handleEmailRegister(e)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-base font-medium sm:text-sm" htmlFor="reg-email">
                    {s.emailLabel}
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    className={fieldInputClass()}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailErr("");
                    }}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-base font-medium sm:text-sm" htmlFor="reg-email-code">
                    {s.emailCodeLabel}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      ref={emailCodeRef}
                      id="reg-email-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className={fieldInputClass("min-w-0 flex-1")}
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder={s.regCodePh}
                    />
                    <button
                      type="button"
                      className={outlineCodeBtn}
                      disabled={emailCd > 0 || emailBusy}
                      onClick={() => void handleSendEmailCode()}
                    >
                      {emailCd > 0 ? s.retryIn(emailCd) : emailBusy ? s.sending : s.sendCode}
                    </button>
                  </div>
                  <p className="text-[13px] text-muted-foreground sm:text-[11px]">{s.devEmail}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-base font-medium sm:text-sm" htmlFor="reg-email-pwd">
                    {s.regPwdLabel}
                  </label>
                  <input
                    id="reg-email-pwd"
                    type="password"
                    autoComplete="new-password"
                    className={fieldInputClass()}
                    value={emailPwd}
                    onChange={(e) => {
                      setEmailPwd(e.target.value);
                      setEmailErr("");
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-base font-medium sm:text-sm" htmlFor="reg-email-pwd2">
                    {s.regPwd2Label}
                  </label>
                  <input
                    id="reg-email-pwd2"
                    type="password"
                    autoComplete="new-password"
                    className={fieldInputClass()}
                    value={emailPwdConfirm}
                    onChange={(e) => {
                      setEmailPwdConfirm(e.target.value);
                      setEmailErr("");
                    }}
                  />
                </div>
                {emailErr ? <p className={errText}>{emailErr}</p> : null}
                <button type="submit" className={primarySubmitClass(emailBusy)} disabled={emailBusy}>
                  {emailBusy ? s.registering : s.register}
                </button>
              </form>
            )}
            <OtherLoginWays exclude="email" />
          </>
        ) : null}

        {tab === "wechat" ? (
          <>
            <div className="flex flex-col items-center gap-4 py-2">
              {wxLoading ? <p className="text-base text-muted-foreground sm:text-sm">{s.wxLoading}</p> : null}
              {!wxLoading && wxAvailable === false ? (
                <div className="flex w-full flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-[48px] w-full bg-muted text-base text-muted-foreground hover:bg-muted/80 sm:text-sm"
                    onClick={() => showToast(s.toastWxSoon, "info")}
                  >
                    {s.wxClosed}
                  </Button>
                  <p className="text-center text-base text-muted-foreground sm:text-xs">{s.wxClosedHint}</p>
                </div>
              ) : null}
              {!wxLoading && wxAvailable === true && wxQrUrl ? (
                <>
                  <div className="rounded-lg border border-[#e2e8f0] bg-white p-3">
                    <QRCode value={wxQrUrl} size={200} level="M" />
                  </div>
                  <p className="text-center text-base text-muted-foreground sm:text-sm">{s.wxScan}</p>
                  <p className="text-center text-sm text-muted-foreground sm:text-xs">{s.wxHint}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] border-[#e2e8f0] text-base sm:min-h-9 sm:text-sm"
                    onClick={() => void initWechatPanel()}
                  >
                    {s.wxRefresh}
                  </Button>
                </>
              ) : null}
            </div>
            <OtherLoginWays exclude="wechat" />
          </>
        ) : null}
          </>
        )}

        {panel === "main" ? (
          <p className="text-center text-base leading-relaxed text-muted-foreground sm:text-[11px]">
            {s.agreement}{" "}
            <a href="#" className="text-[hsl(262_78%_52%)] underline-offset-2 hover:underline">
              {s.terms}
            </a>{" "}
            {s.and}{" "}
            <a href="#" className="text-[hsl(262_78%_52%)] underline-offset-2 hover:underline">
              {s.privacy}
            </a>
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
