import { exactMoney } from '@/lib/orderFormatting';
import { apiClient } from './apiClient';

export interface BackendOrderSummary { id: string; orderNumber: string; status: string; total: string; createdAt: string; channelConnectionId: string | null; }
export interface BackendOrderLine { id: string; productId: string | null; productSku: string | null; productName: string; quantity: number; unitPrice: number; lineTotal: string; unitCost: number | null; }
export interface BackendOrderDetail extends BackendOrderSummary { customerId: string | null; customerName?: string | null; subtotal: string; tax: number; shippingFee: number; items: BackendOrderLine[]; }
export interface OrderCatalogOption { id: string; name: string; code: string; }
export interface BackendCreateOrder { idempotencyKey: string; orderNumber: string; customerId: string | null; warehouseId: string; tax: number; shippingFee: number; items: { productId: string; quantity: number; unitPrice: number }[]; }
export type BackendOrderOperation = 'confirm' | 'process' | 'ship' | 'cancel';
export interface BackendOrderOperationRequest { idempotencyKey: string; reason?: string; }
export interface BackendOrderOperationResult { orderId: string; status: string; replayed: boolean; }
export interface BackendOrderHistoryEntry { id: string; fromStatus: string | null; toStatus: string; note: string | null; createdBy: string | null; createdAt: string; }

const exactOrderFields = new Set(['total', 'subtotal', 'lineTotal']);
const record = (value: unknown) => {
  if (typeof value !== 'object' || value === null) throw new Error('Dữ liệu đơn hàng không hợp lệ.');
  return value as Record<string, unknown>;
};
const text = (value: unknown) => { if (typeof value !== 'string') throw new Error('Dữ liệu văn bản không hợp lệ.'); return value; };
const money = (value: unknown) => { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Dữ liệu số tiền không hợp lệ.'); return value; };
const nullableText = (value: unknown) => value === null ? null : text(value);
const nullableId = (value: unknown) => value == null ? null : text(value);
function summary(value: unknown): BackendOrderSummary {
  const order = record(value);
  return { id: text(order.id), orderNumber: text(order.orderNumber), status: text(order.status), total: exactMoney(order.total), createdAt: text(order.createdAt), channelConnectionId: nullableId(order.channelConnectionId) };
}
function detail(value: unknown): BackendOrderDetail {
  const order = record(value);
  if (!Array.isArray(order.items)) throw new Error('Danh sách sản phẩm không hợp lệ.');
  return { ...summary(order), customerId: nullableText(order.customerId), customerName: order.customerName == null ? null : text(order.customerName), subtotal: exactMoney(order.subtotal), tax: money(order.tax), shippingFee: money(order.shippingFee), items: order.items.map(value => {
    const line = record(value);
    return { id: text(line.id), productId: nullableText(line.productId), productSku: nullableText(line.productSku), productName: text(line.productName), quantity: money(line.quantity), unitPrice: money(line.unitPrice), lineTotal: exactMoney(line.lineTotal), unitCost: line.unitCost == null ? null : money(line.unitCost) };
  }) };
}
function catalogOptions(data: unknown, codeField: string): OrderCatalogOption[] {
  if (!Array.isArray(data)) throw new Error('Danh mục không hợp lệ.');
  return data.map(value => { const item = record(value); return { id: text(item.id), name: text(item.name), code: text(item[codeField]) }; });
}

export const ordersService = {
  async list(token: string, signal?: AbortSignal, dateRange?: { from: string; to: string }): Promise<BackendOrderSummary[]> {
    const query = dateRange ? '?from=' + encodeURIComponent(dateRange.from) + '&to=' + encodeURIComponent(dateRange.to) : '';
    const data = await apiClient.get<unknown>('/api/v1/orders' + query, token, signal, exactOrderFields);
    if (!Array.isArray(data)) throw new Error('Danh sách đơn hàng không hợp lệ.');
    return data.map(summary);
  },
  get: async (id: string, token: string, signal?: AbortSignal) => detail(await apiClient.get<unknown>('/api/v1/orders/' + encodeURIComponent(id), token, signal, exactOrderFields)),
  create: async (payload: BackendCreateOrder, token: string) => detail(await apiClient.post<unknown>('/api/v1/orders', token, payload, exactOrderFields)),
  async catalog(token: string, signal: AbortSignal) {
    const [products, warehouses, customers] = await Promise.all([
      apiClient.get<unknown>('/api/v1/products?status=active', token, signal), apiClient.get<unknown>('/api/v1/warehouses?status=active', token, signal), apiClient.get<unknown>('/api/v1/customers', token, signal),
    ]);
    return { products: catalogOptions(products, 'sku'), warehouses: catalogOptions(warehouses, 'code'), customers: catalogOptions(customers, 'name') };
  },
  async advance(id: string, operation: BackendOrderOperation, payload: BackendOrderOperationRequest, token: string): Promise<BackendOrderOperationResult> {
    const result = record(await apiClient.post<unknown>('/api/v1/orders/' + encodeURIComponent(id) + '/' + operation, token, payload));
    if (result.orderId !== id || typeof result.replayed !== 'boolean') throw new Error('Chưa xác nhận được kết quả thao tác.');
    return { orderId: text(result.orderId), status: text(result.status), replayed: result.replayed };
  },
  async history(id: string, token: string, signal?: AbortSignal): Promise<BackendOrderHistoryEntry[]> {
    const data = await apiClient.get<unknown>('/api/v1/orders/' + encodeURIComponent(id) + '/history', token, signal);
    if (!Array.isArray(data)) throw new Error('Lịch sử đơn hàng không hợp lệ.');
    return data.map(value => { const entry = record(value); return { id: text(entry.id), fromStatus: nullableText(entry.fromStatus), toStatus: text(entry.toStatus), note: nullableText(entry.note), createdBy: nullableText(entry.createdBy), createdAt: text(entry.createdAt) }; });
  },
};

export const backendOrderStatuses: Record<string, string> = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang chuẩn bị', shipped: 'Đã xuất kho', delivered: 'Đã giao', cancelled: 'Đã hủy', returned: 'Đã trả hàng' };
