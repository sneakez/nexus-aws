import React, { ElementType } from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  icon?: ElementType<{ size?: number | string; className?: string }>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-ink-100',
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
            {Icon && <Icon size={26} className="text-brand-600 shrink-0" />}
            <span>{title}</span>
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-ink-500 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
