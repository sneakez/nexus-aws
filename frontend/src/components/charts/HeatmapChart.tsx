import React, { useState, useMemo } from 'react';
import { mockStore } from '@/mock/store';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { Sparkles, CheckCircle2, Info } from 'lucide-react';

interface HeatmapChartProps {
  tenantId?: string;
  className?: string;
}

export function HeatmapChart({ tenantId, className }: HeatmapChartProps) {
  const [dataMode, setDataMode] = useState<'OBSERVED' | 'SIMULATED'>('OBSERVED');

  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const hours = ['00h-04h', '04h-08h', '08h-12h', '12h-16h', '16h-20h', '20h-24h'];

  // 1. OBSERVED DATA: Direct distinct aggregation from actual orders in mock store
  const orders = useMemo(() => mockStore.getOrders(tenantId), [tenantId]);

  const observedMatrix = useMemo(() => {
    // 7 days x 6 hour buckets
    const matrix: { count: number; revenue: number; orderIds: string[] }[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 6 }, () => ({ count: 0, revenue: 0, orderIds: [] }))
    );

    orders.forEach((o) => {
      const d = new Date(o.placed_at || o.created_at || '');
      // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
      const dayIdx = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
      const hour = d.getHours();
      const hourIdx = Math.min(5, Math.max(0, Math.floor(hour / 4)));

      matrix[dayIdx][hourIdx].count += 1;
      matrix[dayIdx][hourIdx].revenue += o.total || 0;
      matrix[dayIdx][hourIdx].orderIds.push(o.order_number);
    });

    return matrix;
  }, [orders]);

  // Total distinct orders in observed matrix
  const totalObservedOrders = useMemo(() => {
    return observedMatrix.reduce(
      (sum, row) => sum + row.reduce((rSum, cell) => rSum + cell.count, 0),
      0
    );
  }, [observedMatrix]);

  // 2. SIMULATED DATA: Synthetic high-traffic scenario for demoing multi-channel spikes
  const simulatedMatrix = [
    [0, 1, 3, 2, 3, 4],
    [0, 0, 2, 3, 3, 3],
    [0, 1, 3, 3, 4, 3],
    [0, 1, 2, 2, 3, 4],
    [1, 1, 4, 3, 4, 4],
    [1, 2, 4, 4, 4, 4],
    [1, 2, 3, 4, 4, 3],
  ];

  const getCellColor = (count: number, maxCount: number) => {
    if (count === 0) return 'bg-ink-100/60 text-ink-400 border border-ink-200/50';
    const ratio = count / Math.max(maxCount, 1);
    if (ratio <= 0.25) return 'bg-brand-100 text-brand-800 border border-brand-200 font-semibold';
    if (ratio <= 0.5) return 'bg-brand-300 text-brand-950 border border-brand-400 font-bold';
    if (ratio <= 0.75) return 'bg-brand-500 text-white border border-brand-600 font-bold';
    return 'bg-brand-800 text-white border border-brand-900 font-extrabold shadow-xs';
  };

  const currentMax = useMemo(() => {
    if (dataMode === 'SIMULATED') return 4;
    return Math.max(...observedMatrix.flatMap((r) => r.map((c) => c.count)), 1);
  }, [dataMode, observedMatrix]);

  return (
    <div className={cn('overflow-x-auto space-y-3', className)}>
      {/* Mode Selector & Data Provenance Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-ink-100 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-ink-700">Nguồn dữ liệu:</span>
          <div className="inline-flex rounded-lg border border-ink-200 p-0.5 bg-ink-50">
            <button
              onClick={() => setDataMode('OBSERVED')}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer',
                dataMode === 'OBSERVED'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-ink-500 hover:text-ink-800'
              )}
            >
              Thực tế ({totalObservedOrders} đơn)
            </button>
            <button
              onClick={() => setDataMode('SIMULATED')}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer',
                dataMode === 'SIMULATED'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-ink-500 hover:text-ink-800'
              )}
            >
              Mô phỏng cao điểm [SIMULATED]
            </button>
          </div>
        </div>

        <span
          className={cn(
            'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
            dataMode === 'OBSERVED'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          )}
        >
          {dataMode === 'OBSERVED' ? '[DEMO-OBSERVED]' : '[SIMULATED TRAFFIC]'}
        </span>
      </div>

      {/* Main Heatmap Grid */}
      <div className="grid grid-cols-7 gap-1.5 min-w-[520px]">
        {/* Header hours */}
        <div className="text-[10px] font-bold text-ink-400 uppercase py-1">Khung giờ</div>
        {hours.map((h, i) => (
          <div key={i} className="text-[10px] font-bold text-ink-500 text-center uppercase py-1">
            {h}
          </div>
        ))}

        {/* Matrix rows */}
        {days.map((day, dIdx) => (
          <React.Fragment key={dIdx}>
            <div className="text-xs font-semibold text-ink-700 flex items-center">{day}</div>
            {hours.map((_, hIdx) => {
              if (dataMode === 'OBSERVED') {
                const cell = observedMatrix[dIdx][hIdx];
                return (
                  <div
                    key={hIdx}
                    title={`${day} lúc ${hours[hIdx]}: ${cell.count} đơn hàng thực tế${
                      cell.count > 0 ? ` (${formatCurrency(cell.revenue)})` : ''
                    }`}
                    className={cn(
                      'h-8 rounded-md flex items-center justify-center text-[10px] font-mono transition-transform hover:scale-105 cursor-pointer',
                      getCellColor(cell.count, currentMax)
                    )}
                  >
                    {cell.count > 0 ? `${cell.count} đơn` : '—'}
                  </div>
                );
              }

              // Simulated
              const val = simulatedMatrix[dIdx][hIdx];
              return (
                <div
                  key={hIdx}
                  title={`[SIMULATED] ${day} lúc ${hours[hIdx]}: Mật độ mô phỏng cấp ${val}/4`}
                  className={cn(
                    'h-8 rounded-md flex items-center justify-center text-[10px] transition-transform hover:scale-105 cursor-pointer',
                    getCellColor(val, 4)
                  )}
                >
                  {val > 2 ? `${val * 12} đơn` : val > 0 ? `${val * 5} đơn` : '—'}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend & Verification Summary */}
      <div className="flex items-center justify-between gap-3 text-[11px] text-ink-500 pt-2 border-t border-ink-100 flex-wrap">
        <div className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span>
            {dataMode === 'OBSERVED'
              ? `Tổng: ${totalObservedOrders} đơn hàng đối soát 100% khớp Mock Store`
              : 'Dữ liệu kịch bản tải cao phục vụ kế hoạch nhân sự kho'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          <span>Mật độ:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-ink-100 border border-ink-200" title="Không có đơn" />
            <span className="w-3 h-3 rounded bg-brand-100 border border-brand-200" title="Thấp" />
            <span className="w-3 h-3 rounded bg-brand-300 border border-brand-400" title="Trung bình" />
            <span className="w-3 h-3 rounded bg-brand-500 border border-brand-600" title="Cao" />
            <span className="w-3 h-3 rounded bg-brand-800 border border-brand-900" title="Đỉnh điểm" />
          </div>
        </div>
      </div>
    </div>
  );
}
