import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { CustomChartTooltip } from './ChartTooltip';
import { cn } from '@/lib/cn';

interface LineAreaChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  series: Array<{
    key: string;
    label: string;
    color: string;
    fillOpacity?: number;
  }>;
  height?: number;
  currency?: boolean;
  className?: string;
}

export function LineAreaChart({
  data,
  xKey,
  series,
  height = 300,
  currency = true,
  className
}: LineAreaChartProps) {
  if (!data || !data.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-xs text-ink-400">
        Chưa có đủ dữ liệu chuỗi thời gian cho phạm vi này
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            {series.map(s => (
              <linearGradient key={s.key} id={`grad_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={s.fillOpacity ?? 0.35} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>
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
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#grad_${s.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
