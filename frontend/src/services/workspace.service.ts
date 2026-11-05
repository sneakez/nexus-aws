import { apiClient } from './apiClient';

export type ApiRow = Record<string, unknown> & { id: string };
const rows = async (path: string, token: string, signal?: AbortSignal): Promise<ApiRow[]> => {
  const data = await apiClient.get<unknown>(path, token, signal);
  if (!Array.isArray(data) || data.some(row => !row || typeof row !== 'object' || typeof (row as ApiRow).id !== 'string')) throw new Error('Danh sách trả về không hợp lệ.');
  return data as ApiRow[];
};

export const workspaceService = {
  listCustomers: (token: string, signal?: AbortSignal) => rows('/api/v1/customers', token, signal),
  createCustomer: (body: object, token: string) => apiClient.post('/api/v1/customers', token, body),
  listProducts: (token: string, signal?: AbortSignal) => rows('/api/v1/products?status=active', token, signal),
  createProduct: (body: object, token: string) => apiClient.post('/api/v1/products', token, body),
  updateProduct: (id: string, body: object, token: string) => apiClient.put('/api/v1/products/' + encodeURIComponent(id), token, body),
  deactivateProduct: (id: string, token: string) => apiClient.delete('/api/v1/products/' + encodeURIComponent(id), token),
  listBrands: (token: string, signal?: AbortSignal) => rows('/api/v1/brands', token, signal),
  listWarehouses: (token: string, signal?: AbortSignal) => rows('/api/v1/warehouses?status=active', token, signal),
  listInventory: (token: string, signal?: AbortSignal) => rows('/api/v1/inventory', token, signal),
  listInventoryTransactions: (token: string, signal?: AbortSignal, filters?: Record<string, string>) => {
    const query = filters ? '?' + new URLSearchParams(filters).toString() : '';
    return rows('/api/v1/inventory/transactions' + query, token, signal);
  },
  receiveInventory: (body: object, token: string) => apiClient.post('/api/v1/inventory/receipts', token, body),
  adjustInventory: (body: object, token: string) => apiClient.post('/api/v1/inventory/adjustments', token, body),
  listSkuEconomics: (token: string, signal?: AbortSignal) => rows('/api/v1/finance-summary/sku', token, signal),
  listChannelEconomics: (token: string, signal?: AbortSignal) => rows('/api/v1/finance-summary/channels', token, signal),
};
