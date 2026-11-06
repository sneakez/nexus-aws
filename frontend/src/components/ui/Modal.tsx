import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: ModalProps) {
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

  const maxWidth =
    size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : size === '2xl' ? 'max-w-6xl' : size === 'full' ? 'max-w-7xl' : 'max-w-xl';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 !m-0" style={{ margin: 0 }}>
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-backdrop"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl shadow-ink-950/20 border border-ink-200/80 animate-scale-in max-h-[90vh] flex flex-col overflow-hidden',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between p-6 shrink-0 border-b border-ink-100 bg-gradient-to-r from-ink-50/50 to-transparent">
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
          <div className="flex items-center justify-end gap-3 p-6 shrink-0 border-t border-ink-100 bg-ink-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>, document.body
  );
}
