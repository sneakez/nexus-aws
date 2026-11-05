import { exactMoney } from './orderFormatting';
import { orderApiRequest } from './backendOrders';
export interface BackendReturnRequest {
  id: string; orderId: string; reason: string;
  items: { orderItemId: string; quantity: number }[];
}
export interface BackendReturnCase extends Omit<BackendReturnRequest, 'reason'> {
  reason: string | null; status: string;
}
export interface BackendFeeRequest { id: string; feeType: string; amount: number }
export interface BackendFee extends BackendFeeRequest { orderId: string }
export interface BackendContribution {
  orderId: string; revenue: string; costOfGoods: string | null;
  operatingFees: string; advertisingFees: string; cm1: string | null;
  cm2: string | null; cm3: string | null; hasCompleteCost: boolean;
}
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('Dữ liệu trả về không hợp lệ.');
  return value as Record<string, unknown>;
}
function str(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Dữ liệu văn bản không hợp lệ.');
  return value;
}
function num(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Dữ liệu số tiền không hợp lệ.');
  return value;
}
const nullableMoney = (value: unknown): string | null => value === null ? null : exactMoney(value);
function returnCase(value: unknown): BackendReturnCase {
  const data = obj(value);
  if (!Array.isArray(data.items)) throw new Error('Dòng trả hàng không hợp lệ.');
  return { id: str(data.id), orderId: str(data.orderId), status: str(data.status),
    reason: data.reason === null ? null : str(data.reason),
    items: data.items.map(value => { const line = obj(value); return { orderItemId: str(line.orderItemId), quantity: num(line.quantity) }; }) };
}
function fee(value: unknown): BackendFee {
  const data = obj(value);
  return { id: str(data.id), orderId: str(data.orderId), feeType: str(data.feeType), amount: num(data.amount) };
}
export async function getBackendReturn(id: string, token: string, signal?: AbortSignal) {
  return returnCase(await orderApiRequest('/api/v1/returns/' + encodeURIComponent(id), token, signal));
}
export async function createBackendReturn(body: BackendReturnRequest, token: string) {
  const result = returnCase(await orderApiRequest('/api/v1/returns', token, undefined, body));
  if (result.id !== body.id || result.orderId !== body.orderId) throw new Error('Chưa xác nhận được yêu cầu trả hàng.');
  return result;
}
export async function getBackendFees(orderId: string, token: string, signal?: AbortSignal): Promise<BackendFee[]> {
  const data = await orderApiRequest('/api/v1/orders/' + encodeURIComponent(orderId) + '/fees', token, signal);
  if (!Array.isArray(data)) throw new Error('Danh sách phí không hợp lệ.');
  const fees = data.map(fee);
  if (fees.some(value => value.orderId !== orderId)) throw new Error('Khoản phí không thuộc đơn hàng.');
  return fees;
}
export async function createBackendFee(orderId: string, body: BackendFeeRequest, token: string) {
  const result = fee(await orderApiRequest('/api/v1/orders/' + encodeURIComponent(orderId) + '/fees', token, undefined, body));
  if (result.id !== body.id || result.orderId !== orderId || result.feeType !== body.feeType || result.amount !== body.amount)
    throw new Error('Chưa xác nhận được khoản phí.');
  return result;
}
const contributionFields = new Set(['revenue', 'costOfGoods', 'operatingFees', 'advertisingFees', 'cm1', 'cm2', 'cm3']);
export async function getBackendContribution(orderId: string, token: string, signal?: AbortSignal): Promise<BackendContribution> {
  const data = obj(await orderApiRequest('/api/v1/orders/' + encodeURIComponent(orderId) + '/contribution', token, signal, undefined, contributionFields));
  if (data.orderId !== orderId || typeof data.hasCompleteCost !== 'boolean') throw new Error('Báo cáo không hợp lệ.');
  return { orderId, hasCompleteCost: data.hasCompleteCost, revenue: exactMoney(data.revenue),
    costOfGoods: nullableMoney(data.costOfGoods), operatingFees: exactMoney(data.operatingFees),
    advertisingFees: exactMoney(data.advertisingFees), cm1: nullableMoney(data.cm1), cm2: nullableMoney(data.cm2), cm3: nullableMoney(data.cm3) };
}
export const feeLabels: Record<string, string> = {
  commission: 'Hoa hồng', payment: 'Thanh toán', shipping: 'Vận chuyển',
  packaging: 'Đóng gói', ads: 'Quảng cáo', return_processing: 'Xử lý trả hàng',
};
export const returnStatusLabels: Record<string, string> = {
  requested: 'Đã yêu cầu', approved: 'Đã duyệt', received: 'Đã nhận hàng',
  rejected: 'Đã từ chối', refunded: 'Đã hoàn tiền', closed: 'Đã đóng',
};
