import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { afterSalesService, type BackendContribution } from '@/services/afterSales.service';
import { formatOrderMoney } from '@/lib/orderFormatting';

export function BackendOrderFinance({ orderId }: { orderId: string }) {
  const { session, activeRole } = useAuth();
  const token = session?.access_token;
  const canViewProfit = activeRole === 'admin' || activeRole === 'manager';
  const [report, setReport] = useState<BackendContribution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setReport(null); setError(null);
    if (!canViewProfit || !token) return () => controller.abort();
    void afterSalesService.contribution(orderId, token, controller.signal)
      .then(value => { if (!controller.signal.aborted) setReport(value); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được lợi nhuận đơn.');
      });
    return () => controller.abort();
  }, [canViewProfit, orderId, token]);

  if (!canViewProfit) return <p className="text-sm text-ink-600">Bạn không có quyền xem lợi nhuận đơn.</p>;
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!report) return <p role="status" className="text-sm text-ink-600">Đang tải lợi nhuận đơn…</p>;

  const amount = (value: string | null) => value === null ? 'Chưa đủ giá vốn' : formatOrderMoney(value);
  return <dl className="space-y-3 text-sm" aria-label="Lợi nhuận đơn">
    {([
      ['Doanh thu', report.revenue],
      ['Giá vốn', report.costOfGoods],
      ['CM1', report.cm1],
      ['CM2', report.cm2],
      ['CM3', report.cm3],
    ] as [string, string | null][]).map(([label, value]) => (
      <div key={label} className="flex items-center justify-between gap-4">
        <dt className="text-ink-700">{label}</dt>
        <dd className="text-right font-semibold tabular-nums text-ink-900">{amount(value)}</dd>
      </div>
    ))}
    {!report.hasCompleteCost && <p className="pt-1 text-sm text-amber-900">Chưa có đủ giá vốn để tính CM1–CM3.</p>}
  </dl>;
}
