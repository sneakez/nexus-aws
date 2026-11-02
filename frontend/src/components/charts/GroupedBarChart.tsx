import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { CustomChartTooltip } from './ChartTooltip';
import { cn } from '@/lib/cn';

interface GroupedBarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  series: Array<{
    key: string;
    label: string;
    color: string;
  }>;
  height?: number;
  currency?: boolean;
  className?: string;
}

export function GroupedBarChart({
  data,
  xKey,
  series,
  height = 300,
  currency = true,
  className
}: GroupedBarChartProps) {
  if (!data || !data.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-xs text-ink-400">
        Chưa có đủ dữ liệu so sánh
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={{ stroke: '#CBD5E1' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) =>
              currency
                ? val >= 1000000
                  ? `${(val / 1000000).toFixed(1)}M`
                  : `${(val / 1000).toFixed(0)}k`
                : val.toLocaleString()
            }
          />
          <Tooltip content={<CustomChartTooltip currency={currency} />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
            formatter={(val) => <span className="text-xs text-ink-700 font-medium">{val}</span>}
          />
          {series.map(s => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
