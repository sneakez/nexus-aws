import type { TimeDimension } from '@/analytics/types';
export type EconomicsPeriodValue = TimeDimension | 'all';
export function EconomicsPeriod({ value, onChange }: { value: EconomicsPeriodValue; onChange: (value: EconomicsPeriodValue) => void }) {
  return <label className="text-xs font-medium text-slate-600">Kỳ dữ liệu<select aria-label="Kỳ số liệu kinh tế" className="input ml-2 text-xs" value={value} onChange={e=>onChange(e.target.value as EconomicsPeriodValue)}><option value="all">Toàn bộ dữ liệu demo</option><option value="today">Hôm nay</option><option value="yesterday">Hôm qua</option><option value="last_7_days">7 ngày gần nhất</option><option value="last_30_days">30 ngày gần nhất</option><option value="this_month">Tháng này</option><option value="last_month">Tháng trước</option></select></label>;
}
