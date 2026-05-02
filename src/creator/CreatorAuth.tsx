import { Navigate, Outlet, useLocation } from "react-router-dom";

export const CREATOR_TOKEN_KEY = "creator_token";
export const CREATOR_PROFILE_KEY = "creator_profile";

export type CreatorProfile = {
  id: string | number;
  phone: string;
  displayName?: string | null;
  status?: string;
  joinedAt?: string;
};

export function getCreatorToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CREATOR_TOKEN_KEY);
}

export function getCreatorProfile(): CreatorProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CREATOR_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CreatorProfile;
  } catch {
    return null;
  }
}

export function setCreatorSession(token: string, creator: CreatorProfile): void {
  window.localStorage.setItem(CREATOR_TOKEN_KEY, token);
  window.localStorage.setItem(CREATOR_PROFILE_KEY, JSON.stringify(creator));
}

export function clearCreatorSession(): void {
  window.localStorage.removeItem(CREATOR_TOKEN_KEY);
  window.localStorage.removeItem(CREATOR_PROFILE_KEY);
}

export function isCreatorLoggedIn(): boolean {
  return Boolean(getCreatorToken());
}

export function CreatorRequireAuth() {
  const location = useLocation();
  if (!isCreatorLoggedIn()) {
    return (
      <Navigate
        to="/creator/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <Outlet />;
}
