import { cn } from '@/lib/cn';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-ink-100',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full bg-[var(--brand-500)] transition-all duration-700 ease-out',
          indicatorClassName
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
