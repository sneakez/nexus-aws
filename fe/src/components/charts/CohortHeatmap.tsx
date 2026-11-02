import React from 'react';
import type { CustomerCohortMonth } from '@/analytics/types';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/utils';

interface CohortHeatmapProps {
  cohorts: CustomerCohortMonth[];
  displayMode?: 'retention' | 'revenue';
  className?: string;
}

export function CohortHeatmap({
  cohorts,
  displayMode = 'retention',
  className,
}: CohortHeatmapProps) {
  if (!cohorts || !cohorts.length) return null;

  const getRetentionColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-600 text-white font-bold';
    if (rate >= 40) return 'bg-emerald-400 text-emerald-950 font-semibold';
    if (rate >= 30) return 'bg-teal-200 text-teal-900';
    if (rate >= 20) return 'bg-brand-100 text-brand-800';
    if (rate >= 10) return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-500';
  };

  const getRevenueColor = (rev: number) => {
    if (rev >= 40000000) return 'bg-indigo-600 text-white font-bold';
    if (rev >= 20000000) return 'bg-indigo-400 text-indigo-950 font-semibold';
    if (rev >= 10000000) return 'bg-indigo-100 text-indigo-900 font-medium';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className={cn('overflow-x-auto space-y-2', className)}>
      <table className="w-full text-xs min-w-[550px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50/70">
            <th className="py-2.5 px-3 text-left font-semibold">Tháng Gia Nhập</th>
            <th className="py-2.5 px-3 text-right font-semibold">Khách Ban Đầu</th>
            <th className="py-2.5 px-3 text-center font-semibold">Tháng 0 (M0)</th>
            <th className="py-2.5 px-3 text-center font-semibold">Tháng 1 (M1)</th>
            <th className="py-2.5 px-3 text-center font-semibold">Tháng 2 (M2)</th>
            <th className="py-2.5 px-3 text-center font-semibold">Tháng 3 (M3)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cohorts.map((cohort, cIdx) => (
            <tr key={cIdx} className="hover:bg-slate-50/60 transition-colors">
              <td className="py-2.5 px-3 font-semibold text-slate-900">{cohort.cohortMonth}</td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                {cohort.initialCustomers} khách
              </td>
              {[0, 1, 2, 3].map((mIdx) => {
                const item = cohort.retentionByMonth.find((r) => r.monthIndex === mIdx);
                if (!item) {
                  return (
                    <td key={mIdx} className="py-2 px-2 text-center text-slate-300">
                      —
                    </td>
                  );
                }

                return (
                  <td key={mIdx} className="py-1.5 px-2 text-center">
                    {displayMode === 'retention' ? (
                      <span
                        title={`${item.activeCount} khách hàng hoạt động (Doanh thu: ${formatCurrency(item.revenueGenerated)})`}
                        className={cn(
                          'inline-block px-2.5 py-1 rounded text-xs tabular-nums',
                          getRetentionColor(item.retentionRate)
                        )}
                      >
                        {item.retentionRate.toFixed(1)}%
                      </span>
                    ) : (
                      <span
                        title={`Tỷ lệ giữ chân: ${item.retentionRate.toFixed(1)}% (${item.activeCount} khách)`}
                        className={cn(
                          'inline-block px-2 py-1 rounded text-xs tabular-nums',
                          getRevenueColor(item.revenueGenerated)
                        )}
                      >
                        {formatCurrency(item.revenueGenerated)}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
