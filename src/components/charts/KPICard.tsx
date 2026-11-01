import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: number;
  deltaPercent?: number;
  trend?: 'up' | 'down' | 'flat';
  isInverseTrend?: boolean; // When down is good (e.g. return rate, failed deliveries)
  badge?: string;
  sourceType?: 'ACTUAL' | 'ESTIMATED' | 'ASSUMPTION' | 'SIMULATED';
  icon?: React.ElementType;
  className?: string;
  highlight?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  deltaPercent,
  trend = 'flat',
  isInverseTrend = false,
  badge,
  sourceType = 'ACTUAL',
  icon: Icon,
  className
}: KPICardProps) {
  const sourceLabel = {
    ACTUAL: 'DỮ LIỆU THỰC',
    ESTIMATED: 'ƯỚC TÍNH',
    ASSUMPTION: 'GIẢ ĐỊNH',
    SIMULATED: 'MÔ PHỎNG',
  }[sourceType];
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  // Determine sentiment color
  let trendColor = 'text-ink-400 bg-ink-50';
  if (isPositive) {
    trendColor = isInverseTrend ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (isNegative) {
    trendColor = isInverseTrend ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200';
  }

  const hasTag = Boolean(badge || sourceType !== 'ACTUAL');

  return (
    <div
      className={cn(
        'p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white relative overflow-hidden group shadow-xs hover:border-slate-300 transition-all duration-150 flex flex-col justify-between h-full min-h-[142px]',
        className
      )}
    >
      {/* Top Header: Title & Icon */}
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <p
            className="text-xs font-semibold text-[#475569] leading-snug line-clamp-2 flex-1"
            title={title}
          >
            {title}
          </p>

          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-teal-50 group-hover:text-[#1E647F] transition-colors mt-0.5">
              <Icon size={14} />
            </div>
          )}
        </div>

        {/* Dedicated Badge / Tag Row (Wraps cleanly underneath title so words are never cut off) */}
        {hasTag && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-[#1E647F] border border-teal-200 inline-block">
                {badge}
              </span>
            )}
            {sourceType !== 'ACTUAL' && (
              <span
                className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
                  sourceType === 'ASSUMPTION' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                )}
              >
                {sourceLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Metric Value & Trend */}
      <div className="mt-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl sm:text-2xl font-bold text-[#123A52] tracking-tight">
            {value}
          </span>

          {deltaPercent !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold border',
                trendColor
              )}
            >
              {isPositive && <ArrowUpRight size={12} />}
              {isNegative && <ArrowDownRight size={12} />}
              {trend === 'flat' && <Minus size={12} />}
              {isPositive ? '+' : ''}
              {deltaPercent}%
            </span>
          )}
        </div>

        {/* Subtitle / Context */}
        {subtitle && (
          <p className="text-[11px] text-[#6D7175] mt-1 line-clamp-1" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
