import React from 'react';
import { cn } from '@/lib/cn';

interface WaterfallItem {
  name: string;
  amount: number;
  type: 'positive' | 'negative' | 'subtotal';
  percentageOfRevenue: number;
}

interface WaterfallChartProps {
  data: WaterfallItem[];
  currency?: boolean;
  className?: string;
}

export function WaterfallChart({ data, currency = true, className }: WaterfallChartProps) {
  if (!data || !data.length) return null;

  const maxAmount = Math.max(...data.map(d => Math.abs(d.amount)), 1);

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-ink-400 px-3 pb-1 border-b border-ink-100">
        <span className="col-span-5 sm:col-span-4">Khoản mục tài chính</span>
        <span className="col-span-4 sm:col-span-5 text-center">Trực quan dòng tiền & chi phí</span>
        <span className="col-span-3 text-right">Giá trị (₫)</span>
      </div>

      <div className="space-y-1.5">
        {data.map((item, idx) => {
          const isNegative = item.type === 'negative';
          const isSubtotal = item.type === 'subtotal';
          const isPositive = item.type === 'positive';

          const barWidthPercent = Math.min(100, Math.max(4, Math.round((Math.abs(item.amount) / maxAmount) * 100)));

          return (
            <div
              key={idx}
              className={cn(
                'grid grid-cols-12 items-center p-2 rounded-lg text-xs transition-colors',
                isSubtotal
                  ? 'bg-ink-100/70 font-bold border border-ink-200'
                  : 'hover:bg-ink-50/80 border border-transparent'
              )}
            >
              {/* Item Name */}
              <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5 truncate">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-brand-600'
                  )}
                />
                <span className={cn('truncate', isSubtotal ? 'text-ink-950 font-bold' : 'text-ink-700')}>
                  {item.name}
                </span>
              </div>

              {/* Bar visualization */}
              <div className="col-span-4 sm:col-span-5 px-2">
                <div className="w-full bg-ink-100 rounded-full h-3 overflow-hidden flex items-center">
                  <div
                    style={{ width: `${barWidthPercent}%` }}
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isPositive
                        ? 'bg-emerald-500'
                        : isNegative
                        ? 'bg-rose-500'
                        : 'bg-gradient-to-r from-brand-600 to-teal-500'
                    )}
                  />
                </div>
              </div>

              {/* Amount & % of Net Revenue */}
              <div className="col-span-3 text-right">
                <span
                  className={cn(
                    'tabular-nums font-bold block',
                    isPositive
                      ? 'text-emerald-700'
                      : isNegative
                      ? 'text-rose-700'
                      : 'text-brand-900'
                  )}
                >
                  {isNegative ? '-' : isPositive && !isSubtotal ? '+' : ''}
                  {Math.abs(item.amount).toLocaleString()} ₫
                </span>
                <span className="text-[10px] text-ink-400">
                  {Math.abs(item.percentageOfRevenue).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
