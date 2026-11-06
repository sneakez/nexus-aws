import { apiClient } from './apiClient';

export type FinanceTimelineRow = { date: string; orderCount: number; revenue: number; costOfGoods: number | null; operatingFees: number; advertisingFees: number; cm1: number | null; cm2: number | null; cm3: number | null };

const record = (value: unknown) => {
  if (!value || typeof value !== 'object') throw new Error('Dữ liệu biểu đồ không hợp lệ.');
  return value as Record<string, unknown>;
};
const text = (value: unknown) => { if (typeof value !== 'string') throw new Error('Dữ liệu biểu đồ không hợp lệ.'); return value; };
const numeric = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new Error('Dữ liệu số không hợp lệ.');
  return parsed;
};
const optionalNumeric = (value: unknown) => value === null ? null : numeric(value);

export const financeService = {
  async timeline(token: string, dateRange: { from: string; to: string }, signal?: AbortSignal): Promise<FinanceTimelineRow[]> {
    const query = '?from=' + encodeURIComponent(dateRange.from) + '&to=' + encodeURIComponent(dateRange.to);
    const data = await apiClient.get<unknown>('/api/v1/finance-summary/timeline' + query, token, signal);
    if (!Array.isArray(data)) throw new Error('Danh sách biểu đồ không hợp lệ.');
    return data.map(value => {
      const item = record(value);
      return { date: text(item.date), orderCount: numeric(item.orderCount), revenue: numeric(item.revenue), costOfGoods: optionalNumeric(item.costOfGoods), operatingFees: numeric(item.operatingFees), advertisingFees: numeric(item.advertisingFees), cm1: optionalNumeric(item.cm1), cm2: optionalNumeric(item.cm2), cm3: optionalNumeric(item.cm3) };
    });
  },
};
