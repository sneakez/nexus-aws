/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const config: Record<ToastType, { color: string; bg: string; border: string }> = {
  success: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  error: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  info: { color: 'text-[var(--brand-600)]', bg: 'bg-brand-50', border: 'border-brand-200' },
  warning: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 w-96 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          const c = config[t.type];
          return (
            <div
              key={t.id}
              role="status"
              data-toast-type={t.type}
              className={cn(
                'flex items-start gap-3 rounded-xl border shadow-lg p-4 animate-fade-in-up',
                c.bg,
                c.border
              )}
            >
              <Icon size={20} className={cn('shrink-0 mt-0.5', c.color)} />
              <p className="text-sm text-ink-800 flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-ink-400 hover:text-ink-700 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
