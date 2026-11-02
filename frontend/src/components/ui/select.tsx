import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-400)] focus:border-[var(--brand-400)] transition-all duration-200 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
      />
    </div>
  )
);
Select.displayName = 'Select';
