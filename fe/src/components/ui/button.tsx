import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] shadow-sm shadow-brand-900/20 focus-visible:ring-[var(--brand-400)]',
        secondary:
          'bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 hover:border-ink-300 focus-visible:ring-ink-300',
        danger:
          'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-900/20 focus-visible:ring-rose-400',
        ghost:
          'text-ink-600 hover:bg-ink-100 focus-visible:ring-ink-300',
        outline:
          'border border-[var(--brand-600)] text-[var(--brand-600)] hover:bg-[var(--brand-50)] focus-visible:ring-[var(--brand-400)]',
        link: 'text-[var(--brand-600)] underline-offset-4 hover:underline focus-visible:ring-[var(--brand-400)]',
      },
      size: {
        default: 'px-4 py-2.5',
        sm: 'px-3 py-1.5 text-xs',
        lg: 'px-5 py-3 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';
