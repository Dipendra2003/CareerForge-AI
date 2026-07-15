import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextProps {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
  };
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps>({} as ToastContextProps);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toastInput: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toastInput.duration ?? 4000;
    
    const newToast: Toast = {
      ...toastInput,
      id,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (message: string, title?: string) => addToast({ message, type: "success", title }),
    error: (message: string, title?: string) => addToast({ message, type: "error", title }),
    info: (message: string, title?: string) => addToast({ message, type: "info", title }),
    warning: (message: string, title?: string) => addToast({ message, type: "warning", title }),
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      
      {/* Toast Portal/Container */}
      <div id="toast-portal" className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            let Icon = Info;
            let iconColor = "text-blue-500";
            let borderColor = "border-blue-100 dark:border-blue-900";
            let bgColor = "bg-white dark:bg-slate-900";

            if (t.type === "success") {
              Icon = CheckCircle2;
              iconColor = "text-emerald-500";
              borderColor = "border-emerald-100 dark:border-emerald-900";
            } else if (t.type === "error") {
              Icon = AlertCircle;
              iconColor = "text-rose-500";
              borderColor = "border-rose-100 dark:border-rose-900";
            } else if (t.type === "warning") {
              Icon = AlertTriangle;
              iconColor = "text-amber-500";
              borderColor = "border-amber-100 dark:border-amber-900";
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm ${bgColor} ${borderColor}`}
                role="alert"
                id={`toast-${t.id}`}
              >
                <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 space-y-1">
                  {t.title && (
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {t.title}
                    </h4>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t.message}
                  </p>
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  id={`toast-close-${t.id}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
};
