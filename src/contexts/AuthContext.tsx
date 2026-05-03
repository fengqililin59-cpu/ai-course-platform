import * as React from "react";
import { LoginModal } from "@/components/LoginModal";
import { fetchSiteIdentityFromToken } from "@/lib/siteAuthApi";
import { clearSiteUserToken, getSiteUserToken } from "@/lib/siteUserAuth";

export type MembershipTier = "none" | "month" | "year" | "lifetime";

type AuthContextValue = {
  phone: string | null;
  membership: MembershipTier;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  login: (phone: string) => void;
  /** 根据本地 site_token 重新拉取并更新当前登录展示信息 */
  refreshSiteUser: () => Promise<void>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [phone, setPhone] = React.useState<string | null>(null);
  const [membership, setMembership] = React.useState<MembershipTier>("none");
  const [loginOpen, setLoginOpen] = React.useState(false);

  const refreshSiteUser = React.useCallback(async () => {
    const tok = getSiteUserToken();
    if (!tok) return;
    try {
      const id = await fetchSiteIdentityFromToken(tok);
      if (id) setPhone(id);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    void refreshSiteUser();
  }, [refreshSiteUser]);

  const login = React.useCallback((nextPhone: string) => {
    setPhone(nextPhone.trim());
  }, []);

  const logout = React.useCallback(() => {
    setPhone(null);
    setMembership("none");
    clearSiteUserToken();
  }, []);

  const value = React.useMemo(
    () => ({
      phone,
      membership,
      loginOpen,
      setLoginOpen,
      login,
      refreshSiteUser,
      logout,
    }),
    [phone, membership, loginOpen, login, refreshSiteUser, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onLoginSuccess={login}
        onSessionEstablished={refreshSiteUser}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
