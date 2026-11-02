import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { CustomChartTooltip } from './ChartTooltip';
import { cn } from '@/lib/cn';

interface ParetoItem {
  name: string;
  revenue: number;
  cumulativePercent: number;
}

interface ParetoChartProps {
  data: ParetoItem[];
  height?: number;
  className?: string;
  xKey?: string;
  barKey?: string;
  lineKey?: string;
}

export function ParetoChart({ data, height = 300, className }: ParetoChartProps) {
  if (!data || !data.length) return null;

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={{ stroke: '#CBD5E1' }}
            tickLine={false}
          />
          {/* Left Axis: Revenue */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
          />
          {/* Right Axis: Cumulative % */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#0EA5E9' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip
            content={
              <CustomChartTooltip
                formatter={(val, name) =>
                  name?.includes('%') ? `${val}%` : `${val.toLocaleString()} ₫`
                }
              />
            }
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
          />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name="Doanh thu SKU (₫)"
            fill="#27B4A0"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePercent"
            name="% Tích lũy (Pareto)"
            stroke="#0284C7"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#0284C7' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
