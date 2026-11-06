import { exactMoney } from '@/lib/orderFormatting';
import { apiClient } from './apiClient';

export interface BackendReturnRequest { id: string; orderId: string; reason: string; items: { orderItemId: string; quantity: number }[]; }
export interface BackendReturnCase extends Omit<BackendReturnRequest, 'reason'> { reason: string | null; status: string; }
export interface BackendReturnSummary { id: string; status: string; reason: string | null; createdAt: string; orderId: string; orderNumber: string; orderStatus: string; customerName: string | null; channelConnectionId: string | null; channelName: string | null; }
export interface BackendContribution { orderId: string; revenue: string; costOfGoods: string | null; operatingFees: string; advertisingFees: string; cm1: string | null; cm2: string | null; cm3: string | null; hasCompleteCost: boolean; }
const contributionFields = new Set(['revenue', 'costOfGoods', 'operatingFees', 'advertisingFees', 'cm1', 'cm2', 'cm3']);
const obj = (value: unknown) => { if (!value || typeof value !== 'object') throw new Error('Dữ liệu trả về không hợp lệ.'); return value as Record<string, unknown>; };
const str = (value: unknown) => { if (typeof value !== 'string') throw new Error('Dữ liệu văn bản không hợp lệ.'); return value; };
const num = (value: unknown) => { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Dữ liệu số tiền không hợp lệ.'); return value; };
function returnCase(value: unknown): BackendReturnCase { const data = obj(value); if (!Array.isArray(data.items)) throw new Error('Dòng trả hàng không hợp lệ.'); return { id: str(data.id), orderId: str(data.orderId), status: str(data.status), reason: data.reason === null ? null : str(data.reason), items: data.items.map(value => { const line = obj(value); return { orderItemId: str(line.orderItemId), quantity: num(line.quantity) }; }) }; }
function returnSummary(value: unknown): BackendReturnSummary { const data = obj(value); return { id: str(data.id), status: str(data.status), reason: data.reason === null ? null : str(data.reason), createdAt: str(data.createdAt), orderId: str(data.orderId), orderNumber: str(data.orderNumber), orderStatus: str(data.orderStatus), customerName: data.customerName === null ? null : str(data.customerName), channelConnectionId: data.channelConnectionId === null ? null : str(data.channelConnectionId), channelName: data.channelName === null ? null : str(data.channelName) }; }

export const afterSalesService = {
  async listReturns(token: string, signal?: AbortSignal, dateRange?: { from: string; to: string }): Promise<BackendReturnSummary[]> {
    const query = dateRange ? '?from=' + encodeURIComponent(dateRange.from) + '&to=' + encodeURIComponent(dateRange.to) : '';
    const data = await apiClient.get<unknown>('/api/v1/returns' + query, token, signal);
    if (!Array.isArray(data)) throw new Error('Danh sách đổi trả không hợp lệ.');
    return data.map(returnSummary);
  },
  getReturn: async (id: string, token: string, signal?: AbortSignal) => returnCase(await apiClient.get('/api/v1/returns/' + encodeURIComponent(id), token, signal)),
  createReturn: async (body: BackendReturnRequest, token: string) => returnCase(await apiClient.post('/api/v1/returns', token, body)),
  async contribution(orderId: string, token: string, signal?: AbortSignal): Promise<BackendContribution> {
    const data = obj(await apiClient.get<unknown>('/api/v1/orders/' + encodeURIComponent(orderId) + '/contribution', token, signal, contributionFields));
    if (data.orderId !== orderId || typeof data.hasCompleteCost !== 'boolean') throw new Error('Báo cáo không hợp lệ.');
    const nullableMoney = (value: unknown) => value === null ? null : exactMoney(value);
    return { orderId, hasCompleteCost: data.hasCompleteCost, revenue: exactMoney(data.revenue), costOfGoods: nullableMoney(data.costOfGoods), operatingFees: exactMoney(data.operatingFees), advertisingFees: exactMoney(data.advertisingFees), cm1: nullableMoney(data.cm1), cm2: nullableMoney(data.cm2), cm3: nullableMoney(data.cm3) };
  },
};
export const returnStatusLabels: Record<string, string> = { requested: 'Đã yêu cầu', approved: 'Đã duyệt', received: 'Đã nhận hàng', rejected: 'Đã từ chối', refunded: 'Đã hoàn tiền', closed: 'Đã đóng' };
