import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in-up">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl gradient-brand-soft flex items-center justify-center">
          <Icon size={32} className="text-[var(--brand-500)]" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-brand-200/30 blur-xl -z-10" />
      </div>
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {description && (
        <p className="text-sm text-ink-400 mt-1 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
