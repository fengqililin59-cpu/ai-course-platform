import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setSiteUserToken } from "@/lib/siteUserAuth";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSiteUser } = useAuth();
  const { showToast } = useToast();
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const err = params.get("error");
    const token = params.get("token");

    if (err) {
      showToast("第三方登录失败，请换一种方式或稍后重试", "error");
      navigate("/", { replace: true });
      return;
    }

    if (token) {
      setSiteUserToken(token);
      void refreshSiteUser().then(() => {
        showToast("登录成功", "success");
        navigate("/", { replace: true });
      });
      return;
    }

    navigate("/", { replace: true });
  }, [params, navigate, refreshSiteUser, showToast]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4 text-muted-foreground">
      <p className="text-sm">正在完成登录…</p>
    </div>
  );
}
