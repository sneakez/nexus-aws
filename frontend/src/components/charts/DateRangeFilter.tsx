import React from 'react';
import { Calendar, SlidersHorizontal } from 'lucide-react';
import type { TimeDimension, ComparisonDimension } from '@/analytics/types';
import { cn } from '@/lib/cn';

interface DateRangeFilterProps {
  value: TimeDimension;
  onChange: (val: TimeDimension) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const options: Array<{ id: TimeDimension; label: string }> = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'last_7_days', label: '7 ngày qua' },
    { id: 'last_30_days', label: '30 ngày qua' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'last_month', label: 'Tháng trước' }
  ];

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-ink-100/80 rounded-lg border border-ink-200 text-xs overflow-x-auto scrollbar-none', className)}>
      <div className="flex items-center gap-1 px-2 text-ink-500 font-medium shrink-0">
        <Calendar size={13} />
        <span className="hidden sm:inline">Thời gian:</span>
      </div>
      {options.map(opt => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'px-2.5 py-1 rounded-md font-semibold transition-all shrink-0',
              isSelected
                ? 'bg-white text-brand-900 shadow-xs border border-ink-200'
                : 'text-ink-600 hover:text-ink-900 hover:bg-white/50'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface ComparisonSelectorProps {
  value: ComparisonDimension;
  onChange: (val: ComparisonDimension) => void;
  className?: string;
}

export function ComparisonSelector({ value, onChange, className }: ComparisonSelectorProps) {
  const options: Array<{ id: ComparisonDimension; label: string }> = [
    { id: 'previous_period', label: 'Vs Kỳ trước' },
    { id: 'same_period_last_year', label: 'Vs Cùng kỳ năm trước' },
    { id: 'target', label: 'Vs Mục tiêu (Target)' },
    { id: 'none', label: 'Không đối chiếu' }
  ];

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      <SlidersHorizontal size={12} className="text-ink-500 shrink-0" />
      <span className="text-ink-500 font-medium hidden sm:inline">Đối chiếu:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ComparisonDimension)}
        className="input text-xs py-1 px-2.5 bg-white border border-ink-200 rounded-lg font-medium text-ink-800"
      >
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
