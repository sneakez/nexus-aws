import { exactMoney, parseMoneyResponse } from './orderFormatting';
export interface BackendOrderSummary {
  id: string; orderNumber: string; status: string; total: string; createdAt: string;
}
export interface BackendOrderLine {
  id: string; productId: string | null; productSku: string | null; productName: string;
  quantity: number; unitPrice: number; lineTotal: string; unitCost: number | null;
}
export interface BackendOrderDetail extends BackendOrderSummary {
  customerId: string | null; customerName?: string | null; subtotal: string; tax: number; shippingFee: number;
  items: BackendOrderLine[];
}
export interface OrderCatalogOption { id: string; name: string; code: string }
export interface BackendCreateOrder {
  idempotencyKey: string; orderNumber: string; customerId: string | null; warehouseId: string;
  tax: number; shippingFee: number;
  items: { productId: string; quantity: number; unitPrice: number }[];
}
export class OrderApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) throw new Error('Dữ liệu đơn hàng không hợp lệ.');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Dữ liệu văn bản không hợp lệ.');
  return value;
}
function money(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Dữ liệu số tiền không hợp lệ.');
  return value;
}
function nullableText(value: unknown): string | null { return value === null ? null : text(value); }
function summary(value: unknown): BackendOrderSummary {
  const o = record(value);
  return { id: text(o.id), orderNumber: text(o.orderNumber), status: text(o.status),
    total: exactMoney(o.total), createdAt: text(o.createdAt) };
}
function detail(value: unknown): BackendOrderDetail {
  const o = record(value);
  if (!Array.isArray(o.items)) throw new Error('Danh sách sản phẩm không hợp lệ.');
  return { ...summary(o), customerId: nullableText(o.customerId), customerName: o.customerName == null ? null : text(o.customerName), subtotal: exactMoney(o.subtotal),
    tax: money(o.tax), shippingFee: money(o.shippingFee),
    items: o.items.map(value => {
      const line = record(value);
      return { id: text(line.id), productId: nullableText(line.productId),
        productSku: nullableText(line.productSku), productName: text(line.productName),
        quantity: money(line.quantity), unitPrice: money(line.unitPrice), lineTotal: exactMoney(line.lineTotal),
        unitCost: line.unitCost == null ? null : money(line.unitCost) };
    }) };
}
async function request(path: string, token: string, signal?: AbortSignal, body?: object, exactFields?: ReadonlySet<string>, method?: 'PUT' | 'DELETE'): Promise<unknown> {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!base) throw new Error('Chưa cấu hình địa chỉ dịch vụ.');
  const response = await fetch(base.replace(/\/+$/, '') + path, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  const data: unknown = await (exactFields && response.ok ? response.text().then(json => parseMoneyResponse(json, exactFields)) : response.json()).catch(() => null);
  if (!response.ok) {
    let message = 'Không thể xử lý yêu cầu (HTTP ' + response.status + ').';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    else if (response.status === 403) message = 'Tài khoản không có quyền thực hiện thao tác này.';
    else if (response.status === 404) message = 'Không tìm thấy dữ liệu được yêu cầu.';
    else if (response.status < 500 && data && typeof data === 'object') {
      const error = data as Record<string, unknown>;
      if (typeof error.message === 'string') message = error.message;
      else if (error.errors && typeof error.errors === 'object') {
        const values = Object.values(error.errors).flat().filter((v): v is string => typeof v === 'string');
        if (values.length) message = values.join(' ');
      }
    }
    throw new OrderApiError(message, response.status);
  }
  return data;
}
const exactOrderFields = new Set(['total', 'subtotal', 'lineTotal']);
export async function getBackendOrders(token: string, signal?: AbortSignal): Promise<BackendOrderSummary[]> {
  const data = await request('/api/v1/orders', token, signal, undefined, exactOrderFields);
  if (!Array.isArray(data)) throw new Error('Danh sách đơn hàng không hợp lệ.');
  return data.map(summary);
}
export async function getBackendOrder(id: string, token: string, signal?: AbortSignal): Promise<BackendOrderDetail> {
  return detail(await request('/api/v1/orders/' + encodeURIComponent(id), token, signal, undefined, exactOrderFields));
}
export async function createBackendOrder(payload: BackendCreateOrder, token: string): Promise<BackendOrderDetail> {
  return detail(await request('/api/v1/orders', token, undefined, payload, exactOrderFields));
}
export async function getOrderCatalog(token: string, signal: AbortSignal) {
  const [products, warehouses, customers] = await Promise.all([
    request('/api/v1/products?status=active', token, signal),
    request('/api/v1/warehouses?status=active', token, signal),
    request('/api/v1/customers', token, signal),
  ]);
  function options(data: unknown, codeField: string): OrderCatalogOption[] {
    if (!Array.isArray(data)) throw new Error('Danh mục không hợp lệ.');
    return data.map(value => {
      const item = record(value);
      return { id: text(item.id), name: text(item.name), code: text(item[codeField]) };
    });
  }
  return { products: options(products, 'sku'), warehouses: options(warehouses, 'code'), customers: options(customers, 'name') };
}
export const backendOrderStatuses: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang chuẩn bị',
  shipped: 'Đã xuất kho', delivered: 'Đã giao', cancelled: 'Đã hủy', returned: 'Đã trả hàng',
};

export type BackendOrderOperation = 'confirm' | 'process' | 'ship' | 'cancel';
export interface BackendOrderOperationRequest { idempotencyKey: string; reason?: string }
export interface BackendOrderOperationResult { orderId: string; status: string; replayed: boolean }
export interface BackendOrderHistoryEntry {
  id: string; fromStatus: string | null; toStatus: string; note: string | null; createdBy: string | null; createdAt: string;
}
export async function advanceBackendOrder(id: string, operation: BackendOrderOperation,
  payload: BackendOrderOperationRequest, token: string): Promise<BackendOrderOperationResult> {
  const result = record(await request('/api/v1/orders/' + encodeURIComponent(id) + '/' + operation, token, undefined, payload));
  if (result.orderId !== id || typeof result.replayed !== 'boolean') throw new Error('Chưa xác nhận được kết quả thao tác.');
  return { orderId: text(result.orderId), status: text(result.status), replayed: result.replayed };
}
export async function getBackendOrderHistory(id: string, token: string, signal?: AbortSignal): Promise<BackendOrderHistoryEntry[]> {
  const data = await request('/api/v1/orders/' + encodeURIComponent(id) + '/history', token, signal);
  if (!Array.isArray(data)) throw new Error('Lịch sử đơn hàng không hợp lệ.');
  return data.map(value => {
    const entry = record(value);
    return { id: text(entry.id), fromStatus: nullableText(entry.fromStatus), toStatus: text(entry.toStatus),
      note: nullableText(entry.note), createdBy: nullableText(entry.createdBy), createdAt: text(entry.createdAt) };
  });
}

export { request as orderApiRequest };
