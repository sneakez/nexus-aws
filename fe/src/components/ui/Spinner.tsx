import { Loader2 } from 'lucide-react';

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <Loader2
      size={size}
      className="animate-spin text-[var(--brand-500)]"
    />
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-ink-100" />
        <Loader2
          size={32}
          className="absolute inset-0 m-auto animate-spin text-[var(--brand-500)]"
        />
      </div>
      {label && <p className="text-sm text-ink-400">{label}</p>}
    </div>
  );
}
