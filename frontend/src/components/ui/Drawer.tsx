import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end !m-0" style={{ margin: 0 }}>
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-backdrop"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-2xl bg-white shadow-2xl shadow-ink-950/20 flex flex-col animate-slide-in h-full overflow-hidden">
        <div className="flex items-start justify-between p-6 border-b border-ink-100 bg-gradient-to-r from-brand-50/30 to-transparent shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-ink-900 tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-lg p-1.5 transition-all duration-200 hover:scale-105"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-ink-100 bg-ink-50/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>, document.body
  );
}
