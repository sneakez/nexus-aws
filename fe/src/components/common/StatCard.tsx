import React, { ElementType } from 'react';
import { cn } from '@/lib/cn';

interface StatCardProps {
  icon: ElementType<{ size?: number | string; className?: string }>;
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  onClick?: () => void;
  className?: string;
  valueMono?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50 border-blue-100',
  onClick,
  className,
  valueMono = false,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 transition-colors',
        onClick ? 'hover:border-slate-300 cursor-pointer' : '',
        className
      )}
    >
      <div
        className={cn(
          'w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border',
          iconBg,
          iconColor
        )}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
          {label}
        </p>
        <p
          className={cn(
            'text-xl font-bold text-slate-900 mt-0.5',
            valueMono && ''
          )}
        >
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{subtext}</p>
        )}
      </div>
    </div>
  );
}
