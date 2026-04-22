import * as React from "react";
import { ToastStack, type ToastRecord, type ToastType } from "@/components/Toast";

type ToastContextValue = {
  showToast: (message: string, type: ToastType) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function newToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  const timersRef = React.useRef<Map<string, number>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    const tid = timersRef.current.get(id);
    if (tid !== undefined) {
      window.clearTimeout(tid);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (message: string, type: ToastType) => {
      const id = newToastId();
      setToasts((prev) => [{ id, message, type }, ...prev]);
      const tid = window.setTimeout(() => {
        dismiss(id);
      }, 3000);
      timersRef.current.set(id, tid);
    },
    [dismiss],
  );

  React.useEffect(() => {
    return () => {
      for (const tid of timersRef.current.values()) {
        window.clearTimeout(tid);
      }
      timersRef.current.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

export type { ToastType };
