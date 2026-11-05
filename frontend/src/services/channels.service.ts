import { apiClient } from './apiClient';
import type { ApiRow } from './workspace.service';

const rows = async (path: string, token: string, signal?: AbortSignal): Promise<ApiRow[]> => {
  const data = await apiClient.get<unknown>(path, token, signal);
  if (!Array.isArray(data) || data.some(row => !row || typeof row !== 'object' || typeof (row as ApiRow).id !== 'string')) throw new Error('Danh sách trả về không hợp lệ.');
  return data as ApiRow[];
};
export const channelsService = {
  list: (token: string, signal?: AbortSignal) => rows('/api/v1/channel-connections', token, signal),
  create: (body: object, token: string) => apiClient.post('/api/v1/channel-connections', token, body),
  update: (id: string, body: object, token: string) => apiClient.put('/api/v1/channel-connections/' + encodeURIComponent(id), token, body),
  remove: (id: string, token: string) => apiClient.delete('/api/v1/channel-connections/' + encodeURIComponent(id), token),
  listMappings: (connectionId: string, token: string, signal?: AbortSignal) => rows('/api/v1/channel-connections/' + encodeURIComponent(connectionId) + '/sku-mappings', token, signal),
  createMapping: (connectionId: string, body: object, token: string) => apiClient.post('/api/v1/channel-connections/' + encodeURIComponent(connectionId) + '/sku-mappings', token, body),
  removeMapping: (connectionId: string, id: string, token: string) => apiClient.delete('/api/v1/channel-connections/' + encodeURIComponent(connectionId) + '/sku-mappings/' + encodeURIComponent(id), token),
};
