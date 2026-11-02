import React from 'react';

interface ChartTooltipPayload {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
  formatter?: (val: number, name?: string) => string;
  currency?: boolean;
  unit?: string;
}

export function CustomChartTooltip({
  active,
  payload,
  label,
  formatter,
  currency = true,
  unit
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-[#0F172A] text-white p-3 sm:p-3.5 rounded-xl border border-slate-700/90 shadow-2xl text-xs space-y-2 z-50 min-w-[180px] max-w-[280px] pointer-events-none">
      {label && (
        <div className="border-b border-slate-700/80 pb-1.5 flex items-center justify-between">
          <p className="font-bold text-slate-100 tracking-tight">{label}</p>
          <span className="text-[10px] text-slate-400">Dữ liệu đối soát</span>
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((item, idx) => {
          const val = item.value ?? 0;
          const displayVal = formatter
            ? formatter(val, item.name)
            : currency
            ? `${val.toLocaleString()} ₫`
            : unit
            ? `${val.toLocaleString()} ${unit}`
            : val.toLocaleString();

          return (
            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                  style={{ backgroundColor: item.color || '#27B4A0' }}
                />
                <span className="text-slate-300 font-medium truncate">{item.name || item.dataKey}</span>
              </div>
              <span className="font-extrabold text-white tabular-nums shrink-0">
                {displayVal}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
