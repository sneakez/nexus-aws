import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 !m-0" style={{ margin: 0 }}>
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-backdrop"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-ink-950/20 border border-ink-200/80 p-6 animate-scale-in">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              danger ? 'bg-rose-50' : 'bg-brand-50'
            )}
          >
            <AlertTriangle
              size={20}
              className={danger ? 'text-rose-600' : 'text-[var(--brand-600)]'}
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
            <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
