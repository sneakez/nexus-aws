import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ApiRow } from '@/services/workspace.service';

const compactMoney = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
const asMoney = (value: unknown) => {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(amount) ? amount : null;
};

export function ChannelPerformanceChart({ rows }: { rows: ApiRow[] }) {
  const data = rows.map(row => ({ name: String(row.label ?? 'Chưa gắn kênh'), revenue: asMoney(row.revenue), cm3: asMoney(row.cm3) }));
  const height = Math.max(280, data.length * 58);
  return <section className="card p-4 sm:p-5"><h2 className="font-semibold text-ink-900">So sánh theo kênh</h2><p className="mt-1 text-sm text-ink-600">Doanh thu và lợi nhuận sau quảng cáo của các đơn chưa hủy.</p><div className="mt-4" style={{ height }}><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}><XAxis type="number" tickFormatter={value => compactMoney.format(value)} tickLine={false} axisLine={false} fontSize={12}/><YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={260}/><Tooltip formatter={(value: unknown, name: unknown) => [Number(value ?? 0).toLocaleString('vi-VN') + ' ₫', name === 'revenue' ? 'Doanh thu' : 'Lợi nhuận']} /><Legend formatter={value => value === 'revenue' ? 'Doanh thu' : 'Lợi nhuận'} /><Bar dataKey="revenue" name="revenue" fill="#0f766e" radius={[0, 4, 4, 0]} /><Bar dataKey="cm3" name="cm3" fill="#7c3aed" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></section>;
}
