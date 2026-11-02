import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CaretLeft,
  CaretRight,
  CaretDown
} from '@phosphor-icons/react';
import type { TimeDimension, ComparisonDimension } from '@/analytics/types';
import { cn } from '@/lib/cn';

export interface MetaDateRangePickerProps {
  period: TimeDimension;
  onPeriodChange: (period: TimeDimension) => void;
  comparison?: ComparisonDimension;
  onComparisonChange?: (comparison: ComparisonDimension) => void;
  className?: string;
}

interface PresetItem {
  id: string;
  label: string;
  periodKey: TimeDimension;
  computeRange: (anchor: Date) => { start: Date; end: Date };
}

// Fixed system anchor date: October 29, 2026
const SYSTEM_ANCHOR = new Date(2026, 9, 29); // 29 Oct 2026

const RECENT_PRESETS: PresetItem[] = [
  {
    id: 'rec_today',
    label: 'Hôm nay',
    periodKey: 'today',
    computeRange: (d) => ({ start: new Date(d), end: new Date(d) })
  },
  {
    id: 'rec_max',
    label: 'Tối đa',
    periodKey: 'last_30_days',
    computeRange: (d) => {
      const s = new Date(d);
      s.setDate(s.getDate() - 90);
      return { start: s, end: new Date(d) };
    }
  }
];

const ALL_PRESETS: PresetItem[] = [
  {
    id: 'today',
    label: 'Hôm nay',
    periodKey: 'today',
    computeRange: (d) => ({ start: new Date(d), end: new Date(d) })
  },
  {
    id: 'yesterday',
    label: 'Hôm qua',
    periodKey: 'yesterday',
    computeRange: (d) => {
      const y = new Date(d);
      y.setDate(y.getDate() - 1);
      return { start: y, end: y };
    }
  },
  {
    id: 'today_yesterday',
    label: 'Hôm nay và hôm qua',
    periodKey: 'last_7_days',
    computeRange: (d) => {
      const y = new Date(d);
      y.setDate(y.getDate() - 1);
      return { start: y, end: new Date(d) };
    }
  },
  {
    id: 'last_7_days',
    label: '7 ngày qua',
    periodKey: 'last_7_days',
    computeRange: (d) => {
      const s = new Date(d);
      s.setDate(s.getDate() - 6);
      return { start: s, end: new Date(d) };
    }
  },
  {
    id: 'last_14_days',
    label: '14 ngày qua',
    periodKey: 'last_7_days',
    computeRange: (d) => {
      const s = new Date(d);
      s.setDate(s.getDate() - 13);
      return { start: s, end: new Date(d) };
    }
  },
  {
    id: 'last_28_days',
    label: '28 ngày qua',
    periodKey: 'last_30_days',
    computeRange: (d) => {
      const s = new Date(d);
      s.setDate(s.getDate() - 27);
      return { start: s, end: new Date(d) };
    }
  },
  {
    id: 'last_30_days',
    label: '30 ngày qua',
    periodKey: 'last_30_days',
    computeRange: (d) => {
      // Exactly matching Facebook Ads: 29 Tháng 9, 2026 – 28 Tháng 10, 2026
      const end = new Date(d);
      end.setDate(end.getDate() - 1); // 28 Oct
      const start = new Date(end);
      start.setDate(start.getDate() - 29); // 29 Sept
      return { start, end };
    }
  },
  {
    id: 'this_week',
    label: 'Tuần này',
    periodKey: 'last_7_days',
    computeRange: (d) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(d);
      start.setDate(diff);
      return { start, end: new Date(d) };
    }
  },
  {
    id: 'last_week',
    label: 'Tuần trước',
    periodKey: 'last_7_days',
    computeRange: (d) => {
      const day = d.getDay();
      const diff = d.getDate() - day - 6;
      const start = new Date(d);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }
  },
  {
    id: 'this_month',
    label: 'Tháng này',
    periodKey: 'this_month',
    computeRange: (d) => {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      return { start, end: new Date(d) };
    }
  },
  {
    id: 'last_month',
    label: 'Tháng trước',
    periodKey: 'last_month',
    computeRange: (d) => {
      const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const end = new Date(d.getFullYear(), d.getMonth(), 0);
      return { start, end };
    }
  },
  {
    id: 'maximum',
    label: 'Tối đa',
    periodKey: 'last_30_days',
    computeRange: (d) => {
      const start = new Date(d);
      start.setDate(start.getDate() - 90);
      return { start, end: new Date(d) };
    }
  }
];

// Helper to format Date into DD/MM/YYYY
const toDateInputString = (d: Date) => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to parse DD/MM/YYYY into valid Date
const parseDateInputString = (str: string): Date | null => {
  const clean = str.trim();
  const parts = clean.split(/[/.-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year >= 2020 && year <= 2035) {
      const d = new Date(year, month, day);
      if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
        return d;
      }
    }
  }
  return null;
};

export function MetaDateRangePicker({
  period,
  onPeriodChange,
  className
}: MetaDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Internal draft states
  const [selectedPresetId, setSelectedPresetId] = useState<string>('last_30_days');
  const [rangeStart, setRangeStart] = useState<Date>(() => {
    const p = ALL_PRESETS.find(x => x.id === 'last_30_days')!;
    return p.computeRange(SYSTEM_ANCHOR).start;
  });
  const [rangeEnd, setRangeEnd] = useState<Date>(() => {
    const p = ALL_PRESETS.find(x => x.id === 'last_30_days')!;
    return p.computeRange(SYSTEM_ANCHOR).end;
  });

  // Fast input field states (DD/MM/YYYY)
  const [startInputText, setStartInputText] = useState<string>(() => toDateInputString(rangeStart));
  const [endInputText, setEndInputText] = useState<string>(() => toDateInputString(rangeEnd));

  // Sync text inputs whenever rangeStart or rangeEnd changes
  useEffect(() => {
    setStartInputText(toDateInputString(rangeStart));
    setEndInputText(toDateInputString(rangeEnd));
  }, [rangeStart, rangeEnd]);

  // Month views for dual calendar (September & October 2026 by default)
  const [leftViewDate, setLeftViewDate] = useState<Date>(new Date(2026, 8, 1)); // September 2026
  const rightViewDate = useMemo(() => {
    return new Date(leftViewDate.getFullYear(), leftViewDate.getMonth() + 1, 1);
  }, [leftViewDate]);

  // Sync preset selection
  const handleSelectPreset = (preset: PresetItem) => {
    setSelectedPresetId(preset.id);
    const { start, end } = preset.computeRange(SYSTEM_ANCHOR);
    setRangeStart(start);
    setRangeEnd(end);
  };

  const handleApply = () => {
    // Check if user manually typed valid dates into the input fields
    const parsedStart = parseDateInputString(startInputText);
    const parsedEnd = parseDateInputString(endInputText);
    if (parsedStart && parsedEnd && parsedStart <= parsedEnd) {
      setRangeStart(parsedStart);
      setRangeEnd(parsedEnd);
    }

    const activePreset = ALL_PRESETS.find(p => p.id === selectedPresetId);
    if (activePreset) {
      onPeriodChange(activePreset.periodKey);
    }
    setIsOpen(false);
  };

  const formatShortDate = (d: Date) => {
    return `${d.getDate()} Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  };

  const currentPresetDisplay = useMemo(() => {
    const found = ALL_PRESETS.find(p => p.id === selectedPresetId) || ALL_PRESETS.find(p => p.periodKey === period);
    return found ? found.label : '30 ngày qua';
  }, [selectedPresetId, period]);

  // Navigate months
  const handlePrevMonth = () => {
    setLeftViewDate(new Date(leftViewDate.getFullYear(), leftViewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setLeftViewDate(new Date(leftViewDate.getFullYear(), leftViewDate.getMonth() + 1, 1));
  };

  // Click day in calendar
  const handleDayClick = (clickedDate: Date) => {
    if (clickedDate < rangeStart) {
      setRangeStart(clickedDate);
      setSelectedPresetId('custom');
    } else if (clickedDate > rangeStart && clickedDate <= rangeEnd) {
      setRangeEnd(clickedDate);
      setSelectedPresetId('custom');
    } else {
      setRangeEnd(clickedDate);
      setSelectedPresetId('custom');
    }
  };

  // Render calendar month: clean text headers without fake non-clickable dropdown carets
  const renderCalendarMonth = (monthDate: Date, showPrevArrow: boolean, showNextArrow: boolean) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }

    return (
      <div className="w-[230px] shrink-0 select-none">
        {/* Month & Year header - Clean text title without fake non-clickable dropdown carets */}
        <div className="flex items-center justify-between h-9 px-1 mb-1 text-xs select-none">
          {showPrevArrow ? (
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded text-[#1c1e21] hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tháng trước"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
          ) : <div className="w-6" />}

          <div className="flex items-center gap-1.5 font-bold text-sm text-[#1c1e21]">
            <span>Tháng {month + 1}</span>
            <span className="text-slate-400 font-normal">/</span>
            <span>{year}</span>
          </div>

          {showNextArrow ? (
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded text-[#1c1e21] hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tháng sau"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          ) : <div className="w-6" />}
        </div>

        {/* Weekday headers: CN, T2, T3, T4, T5, T6, T7 */}
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#65676b] mb-1 select-none">
          <span>CN</span>
          <span>T2</span>
          <span>T3</span>
          <span>T4</span>
          <span>T5</span>
          <span>T6</span>
          <span>T7</span>
        </div>

        {/* Days grid - Clean Meta Ads flat row style */}
        <div className="grid grid-cols-7 text-center text-xs select-none">
          {days.map((dateObj, idx) => {
            if (!dateObj) {
              return <div key={`empty_${idx}`} className="h-8 w-8" />;
            }

            const time = dateObj.getTime();
            const startTime = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
            const endTime = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()).getTime();

            const isStart = time === startTime;
            const isEnd = time === endTime;
            const isInRange = time >= startTime && time <= endTime;

            return (
              <div
                key={`day_${dateObj.toISOString()}`}
                className={cn(
                  'h-8 w-8 mx-auto flex items-center justify-center relative cursor-pointer',
                  // Clean uniform pastel blue bar across days in range
                  isInRange && !isStart && !isEnd && 'bg-[#DCEBFB]'
                )}
                onClick={() => handleDayClick(dateObj)}
              >
                {/* Solid Meta Blue circle for Start and End dates */}
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors z-10 select-none',
                    (isStart || isEnd) && 'bg-[#0064e0] text-white font-bold shadow-xs',
                    isInRange && !isStart && !isEnd && 'text-[#1c1e21] font-normal',
                    !isInRange && 'text-[#1c1e21] hover:bg-slate-100'
                  )}
                >
                  {dateObj.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('relative inline-block', className)} ref={containerRef}>
      {/* Trigger Button - Meta Ads Style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#ccd0d5] bg-white hover:bg-[#f0f2f5] transition-colors shadow-2xs text-[#1c1e21] text-xs font-semibold cursor-pointer select-none"
      >
        <CalendarIcon size={15} weight="bold" className="text-[#0064e0]" />
        <span>
          {currentPresetDisplay}: {formatShortDate(rangeStart)} – {formatShortDate(rangeEnd)}
        </span>
        <CaretDown size={11} weight="bold" className={cn('text-slate-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Meta Ads Popover Dialog (Comfortable 720px on Desktop, Centered & Responsive on Tablet/Mobile) */}
      {isOpen && (
        <div className="absolute right-0 max-sm:left-1/2 max-sm:-translate-x-1/2 top-full mt-2 z-50 bg-white rounded-xl border border-[#ccd0d5] shadow-2xl p-4 w-[720px] max-w-[calc(100vw-24px)] text-xs font-sans select-none animate-scale-in">
          {/* Main Content Area: Responsive flex-col on small screens, flex-row on desktop */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Left Sidebar: Presets with authentic Meta Radio Buttons */}
            <div className="w-full sm:w-[170px] shrink-0 border-b sm:border-b-0 sm:border-r border-[#e4e6eb] pb-3 sm:pb-0 sm:pr-3 select-none">
              <div className="max-h-[160px] sm:max-h-[350px] overflow-y-auto space-y-0.5 pr-1 text-xs">
                {/* Section: Đã dùng mới đây */}
                <p className="px-2 pt-1 pb-1.5 text-xs font-bold text-[#1c1e21]">
                  Đã dùng mới đây
                </p>
                {RECENT_PRESETS.map((p) => {
                  const isChecked = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs text-[#1c1e21] hover:bg-[#f0f2f5]"
                    >
                      <div className={cn(
                        'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all',
                        isChecked ? 'border-[#0064e0] bg-[#0064e0]' : 'border-[#ccd0d5] bg-white'
                      )}>
                        {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}

                <div className="my-2 border-t border-[#e4e6eb]" />

                {/* Section: Toàn bộ Presets */}
                {ALL_PRESETS.map((p) => {
                  const isChecked = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs text-[#1c1e21] hover:bg-[#f0f2f5]"
                    >
                      <div className={cn(
                        'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all',
                        isChecked ? 'border-[#0064e0] bg-[#0064e0]' : 'border-[#ccd0d5] bg-white'
                      )}>
                        {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Dual Calendar + Direct Date Inputs */}
            <div className="flex-1 space-y-3 pl-0 sm:pl-1 overflow-x-auto">
              {/* Dual Month Calendar (On mobile shows 1 month with arrows; on desktop shows 2 months side-by-side) */}
              <div className="flex items-start justify-between gap-4">
                {renderCalendarMonth(leftViewDate, true, false)}
                <div className="hidden sm:block">
                  {renderCalendarMonth(rightViewDate, false, true)}
                </div>
              </div>

              {/* Fast Direct Input Row (No unused checkbox) */}
              <div className="pt-3 border-t border-[#e4e6eb]">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Preset Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedPresetId}
                      onChange={(e) => {
                        const targetPreset = ALL_PRESETS.find(x => x.id === e.target.value);
                        if (targetPreset) handleSelectPreset(targetPreset);
                      }}
                      className="text-xs py-1.5 pl-2.5 pr-7 rounded-lg border border-[#ccd0d5] bg-white font-semibold text-[#1c1e21] focus:outline-none focus:border-[#0064e0] focus:ring-1 focus:ring-[#0064e0] cursor-pointer appearance-none shadow-2xs"
                    >
                      {ALL_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <CaretDown size={11} weight="fill" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                  </div>

                  {/* Start Date Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={startInputText}
                      onChange={(e) => {
                        setStartInputText(e.target.value);
                        const parsed = parseDateInputString(e.target.value);
                        if (parsed) {
                          setRangeStart(parsed);
                          setSelectedPresetId('custom');
                        }
                      }}
                      placeholder="DD/MM/YYYY"
                      className="w-[120px] px-3 py-1.5 rounded-lg border border-[#ccd0d5] bg-white text-xs text-[#1c1e21] font-semibold tracking-wide shadow-2xs focus:outline-none focus:border-[#0064e0] focus:ring-1 focus:ring-[#0064e0] text-center"
                      title="Nhập ngày bắt đầu (Định dạng: ngày/tháng/năm, VD: 29/09/2026)"
                    />
                  </div>

                  <span className="text-slate-400 font-bold">–</span>

                  {/* End Date Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={endInputText}
                      onChange={(e) => {
                        setEndInputText(e.target.value);
                        const parsed = parseDateInputString(e.target.value);
                        if (parsed) {
                          setRangeEnd(parsed);
                          setSelectedPresetId('custom');
                        }
                      }}
                      placeholder="DD/MM/YYYY"
                      className="w-[120px] px-3 py-1.5 rounded-lg border border-[#ccd0d5] bg-white text-xs text-[#1c1e21] font-semibold tracking-wide shadow-2xs focus:outline-none focus:border-[#0064e0] focus:ring-1 focus:ring-[#0064e0] text-center"
                      title="Nhập ngày kết thúc (Định dạng: ngày/tháng/năm, VD: 28/10/2026)"
                    />
                  </div>

                  <span className="text-[11px] text-slate-400 hidden xl:inline">
                    (Gõ ngày trực tiếp hoặc bấm trên lịch)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Actions - Exact Meta Ads Layout */}
          <div className="mt-4 pt-3 border-t border-[#e4e6eb] flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-[#65676b]">
              Ngày hiển thị theo Giờ TP Hồ Chí Minh
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-[#ccd0d5] bg-white hover:bg-[#f0f2f5] text-xs font-semibold text-[#1c1e21] transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 rounded-lg bg-[#0064e0] hover:bg-[#0057c7] text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
