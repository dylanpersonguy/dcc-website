"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS: Record<ToastType, string> = {
  success: "text-green-400 bg-green-400/10",
  error: "text-red-400 bg-red-400/10",
  warning: "text-yellow-400 bg-yellow-400/10",
  info: "text-primary bg-primary/10",
};

const BORDER: Record<ToastType, string> = {
  success: "border-green-400/20",
  error: "border-red-400/20",
  warning: "border-yellow-400/20",
  info: "border-primary/20",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const duration = opts.duration ?? 4000;
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]); // max 5 toasts
    const timer = setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container — bottom right */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-[380px] w-full">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`pointer-events-auto glass-card !p-3 flex items-start gap-3 border ${BORDER[t.type]}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${COLORS[t.type]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{t.title}</p>
                  {t.description && (
                    <p className="text-[11px] text-muted/60 mt-0.5 leading-relaxed">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="p-1 rounded hover:bg-foreground/[0.06] text-muted hover:text-foreground transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
