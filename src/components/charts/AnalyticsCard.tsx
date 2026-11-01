import React from 'react';
import { Sparkles, Info, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  sourceType?: 'ACTUAL' | 'ESTIMATED' | 'ASSUMPTION' | 'SIMULATED';
  formulaExplanation?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export function AnalyticsCard({
  title,
  subtitle,
  sourceType = 'ACTUAL',
  formulaExplanation,
  action,
  children,
  className,
  footer
}: AnalyticsCardProps) {
  const sourceLabel = {
    ACTUAL: 'DỮ LIỆU THỰC',
    ESTIMATED: 'ƯỚC TÍNH',
    ASSUMPTION: 'GIẢ ĐỊNH',
    SIMULATED: 'MÔ PHỎNG',
  }[sourceType];
  return (
    <div className={cn('bg-white border border-[#D9E3E8] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col', className)}>
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-[#123A52] tracking-tight">{title}</h3>
            {sourceType !== 'ACTUAL' && (
              <span
                className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider border',
                  sourceType === 'ASSUMPTION'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-blue-50 text-blue-800 border-blue-300'
                )}
              >
                {sourceLabel}
              </span>
            )}
            {formulaExplanation && (
              <div className="group relative cursor-pointer" title={formulaExplanation}>
                <HelpCircle size={13} className="text-slate-400 hover:text-slate-600 transition-colors" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-[#081B2C] text-white text-[11px] rounded-lg shadow-xl z-30 pointer-events-none leading-relaxed border border-slate-700">
                  <span className="font-bold text-[#27B4A0] block mb-0.5">Công thức & Nguồn dữ liệu:</span>
                  {formulaExplanation}
                </div>
              </div>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 leading-normal">{subtitle}</p>}
        </div>

        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </div>

      {/* Card Body */}
      <div className="pt-4 flex-1">{children}</div>

      {/* Optional Footer */}
      {footer && <div className="pt-3 mt-3 border-t border-ink-100 text-xs text-ink-500">{footer}</div>}
    </div>
  );
}
