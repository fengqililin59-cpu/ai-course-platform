import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export type ToastRecord = {
  id: string;
  message: string;
  type: ToastType;
};

function toastStyles(type: ToastType) {
  switch (type) {
    case "success":
      return "border-emerald-200/80 bg-emerald-50 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-50";
    case "error":
      return "border-red-200/80 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-50";
    default:
      return "border-blue-200/80 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-50";
  }
}

type ToastStackProps = {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 z-[200] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      style={{ top: 80 }}
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex animate-toast-in items-start gap-3 rounded-lg border px-3.5 py-3 text-sm shadow-lg backdrop-blur-sm",
            toastStyles(t.type),
          )}
        >
          <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="-m-1 shrink-0 rounded-md p-1 opacity-70 ring-offset-background transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="关闭通知"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
