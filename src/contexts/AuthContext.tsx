import * as React from "react";
import { LoginModal } from "@/components/LoginModal";

export type MembershipTier = "none" | "month" | "year" | "lifetime";

type AuthContextValue = {
  phone: string | null;
  membership: MembershipTier;
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  login: (phone: string) => void;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [phone, setPhone] = React.useState<string | null>(null);
  const [membership, setMembership] = React.useState<MembershipTier>("none");
  const [loginOpen, setLoginOpen] = React.useState(false);

  const login = React.useCallback((nextPhone: string) => {
    setPhone(nextPhone.trim());
  }, []);

  const logout = React.useCallback(() => {
    setPhone(null);
    setMembership("none");
  }, []);

  const value = React.useMemo(
    () => ({
      phone,
      membership,
      loginOpen,
      setLoginOpen,
      login,
      logout,
    }),
    [phone, membership, loginOpen, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onLoginSuccess={login}
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
