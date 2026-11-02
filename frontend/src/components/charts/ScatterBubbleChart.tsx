import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { Info, RotateCcw } from 'lucide-react';
import type { SkuUnitEconomics } from '@/analytics/types';
import { cn } from '@/lib/cn';

interface ScatterBubbleChartProps {
  data: SkuUnitEconomics[];
  height?: number;
  filterName?: string;
  onResetFilter?: () => void;
  onSelectSku?: (sku: string) => void;
  className?: string;
}

export function ScatterBubbleChart({
  data,
  height = 320,
  filterName,
  onResetFilter,
  onSelectSku,
  className
}: ScatterBubbleChartProps) {
  if (!data || !data.length) {
    return (
      <div
        className={cn(
          'w-full flex flex-col items-center justify-center p-8 rounded-xl bg-ink-50/70 border border-dashed border-ink-300 text-center space-y-3 animate-fade-in',
          className
        )}
        style={{ minHeight: height }}
      >
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shadow-xs">
          <Info size={22} />
        </div>
        <div className="max-w-md space-y-1">
          <h4 className="text-sm font-bold text-ink-900 tracking-tight">
            {filterName ? `Không có SKU nào thuộc phân nhóm [${filterName}]` : 'Không có dữ liệu SKU phù hợp'}
          </h4>
          <p className="text-xs text-ink-600 leading-relaxed">
            {filterName?.toLowerCase().includes('star') || filterName?.toLowerCase().includes('ngôi sao')
              ? 'Tiêu chí nhóm Ngôi sao (Star) yêu cầu Biên lợi nhuận CM ≥ 30% và Sản lượng bán ≥ 10 đơn vị trong kỳ. Trong tập dữ liệu hiện tại, chưa có SKU nào đạt ngưỡng sản lượng này.'
              : 'Bộ lọc hiện tại không tìm thấy sản phẩm nào trong kho dữ liệu.'}
          </p>
        </div>
        {onResetFilter && (
          <button
            onClick={onResetFilter}
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold text-brand-700 border-brand-300 hover:bg-brand-50 cursor-pointer shadow-xs"
          >
            <RotateCcw size={13} />
            <span>Xem tất cả SKU trong Portfolio</span>
          </button>
        )}
      </div>
    );
  }

  const chartData = data.map(s => ({
    name: s.name,
    sku: s.sku,
    cmPercent: s.cmPercent ?? 0,
    revenue: s.totalRevenue ?? s.revenue ?? 0,
    stockValue: s.stockValue ?? 100,
    rank: s.contributionRank ?? s.rank ?? 'STAR'
  }));

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'STAR':
        return '#10B981'; // Green
      case 'CASH_COW':
        return '#0284C7'; // Blue
      case 'QUESTION_MARK':
        return '#F59E0B'; // Amber
      case 'DOG':
        return '#EF4444'; // Red
      default:
        return '#64748B';
    }
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="flex items-center justify-between text-xs text-ink-500 flex-wrap gap-2">
        <span>Trục X: Biên CM% • Trục Y: Doanh thu thuần • Bong bóng: Vốn tồn kho (₫)</span>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ngôi sao (Star)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Bò sữa (Cash Cow)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Dấu hỏi (Question)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Chậm bán (Dog)</span>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              type="number"
              dataKey="cmPercent"
              name="Biên lợi nhuận CM"
              unit="%"
              tick={{ fontSize: 11, fill: '#475569' }}
            />
            <YAxis
              type="number"
              dataKey="revenue"
              name="Doanh thu"
              tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
              tick={{ fontSize: 11, fill: '#475569' }}
            />
            <ZAxis
              type="number"
              dataKey="stockValue"
              range={[80, 450]}
              name="Giá trị tồn"
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-[#0F172A] text-white p-3 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-1.5 z-50 min-w-[200px] pointer-events-none">
                    <div className="border-b border-slate-700/80 pb-1">
                      <p className="font-bold text-slate-100">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</p>
                    </div>
                    <div className="space-y-1 text-slate-300">
                      <div className="flex justify-between gap-2">
                        <span>Biên lợi nhuận CM:</span>
                        <strong className="text-white">{item.cmPercent}%</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Doanh thu thuần:</span>
                        <strong className="text-emerald-400">{item.revenue.toLocaleString()} ₫</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Giá trị vốn tồn:</span>
                        <strong className="text-white">{item.stockValue.toLocaleString()} ₫</strong>
                      </div>
                      <div className="flex justify-between gap-2 pt-1 border-t border-slate-800">
                        <span>Phân nhóm:</span>
                        <strong className="text-brand-400 font-bold">{item.rank}</strong>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter
              name="SKUs"
              data={chartData}
              onClick={(node: any) => {
                if (node && node.sku && onSelectSku) {
                  onSelectSku(node.sku);
                }
              }}
              className="cursor-pointer"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getRankColor(entry.rank)} className="hover:opacity-80 transition-opacity cursor-pointer" />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
