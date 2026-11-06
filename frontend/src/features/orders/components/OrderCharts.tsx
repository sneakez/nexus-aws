import { useMemo } from 'react';
import { Area, AreaChart, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BackendOrderSummary } from '@/services/orders.service';
import type { FinanceTimelineRow } from '@/services/finance.service';

const statusLabels: Record<string, string> = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang chuẩn bị', shipped: 'Đã xuất kho', delivered: 'Đã giao', cancelled: 'Đã hủy', returned: 'Đã trả hàng' };
const statusColors = ['#eab308', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#ef4444', '#64748b'];
const money = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
const dateLabel = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(value + 'T00:00:00'));
const tooltipMoney = (value: unknown) => Number(value ?? 0).toLocaleString('vi-VN') + ' ₫';
const tooltipProfit = (value: unknown) => [tooltipMoney(value), 'Lợi nhuận'] as [string, string];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-ink-200 bg-white p-4"><h3 className="mb-4 text-sm font-semibold text-ink-900">{title}</h3><div className="h-64">{children}</div></section>;
}

export function OrderOverviewCharts({ orders }: { orders: BackendOrderSummary[] }) {
  const revenueByDay = useMemo(() => {
    const grouped = new Map<string, number>();
    orders.filter(order => order.status !== 'cancelled').forEach(order => {
      const day = order.createdAt.slice(0, 10);
      grouped.set(day, (grouped.get(day) ?? 0) + Number(order.total));
    });
    return [...grouped].sort(([left], [right]) => left.localeCompare(right)).map(([date, revenue]) => ({ date: dateLabel(date), revenue }));
  }, [orders]);
  const statusData = useMemo(() => Object.entries(statusLabels).map(([status, name]) => ({ name, value: orders.filter(order => order.status === status).length })).filter(item => item.value), [orders]);
  return <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><ChartCard title="Doanh thu theo ngày"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="orderRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0f766e" stopOpacity={0.32}/><stop offset="95%" stopColor="#0f766e" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12}/><YAxis tickFormatter={value => money.format(value)} tickLine={false} axisLine={false} fontSize={12} width={48}/><Tooltip formatter={tooltipMoney} /><Area type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={2.5} fill="url(#orderRevenue)" /></AreaChart></ResponsiveContainer></ChartCard><ChartCard title="Trạng thái đơn hàng"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>{statusData.map((item, index) => <Cell key={item.name} fill={statusColors[index % statusColors.length]} />)}</Pie><Tooltip formatter={value => String(value ?? 0) + ' đơn'} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></ChartCard></div>;
}

export function ProfitTimelineChart({ rows }: { rows: FinanceTimelineRow[] }) {
  const chartData = rows.map(row => ({ date: dateLabel(row.date), profit: row.cm3 }));
  const hasIncompleteCost = rows.some(row => row.cm3 === null);
  return <div className="space-y-3"><ChartCard title="Lợi nhuận mỗi ngày"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12}/><YAxis tickFormatter={value => money.format(value)} tickLine={false} axisLine={false} fontSize={12} width={48}/><Tooltip formatter={tooltipProfit} /><Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} /></LineChart></ResponsiveContainer></ChartCard>{hasIncompleteCost && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Một số ngày chưa có đủ giá vốn nên không hiển thị điểm lợi nhuận.</p>}</div>;
}
