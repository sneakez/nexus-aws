import { apiClient } from './apiClient';

export interface WebhookDispatchResult {
  orderId: string | null;
  replayed: boolean;
  status: string;
}

export interface WebhookQueueStatus {
  mode: 'Direct' | 'Sqs';
  available: number;
  inFlight: number;
  delayed: number;
  deadLetter: number;
}

export interface WebhookDemoCleanupResult {
  batchId: string;
  deletedOrders: number;
  releasedReservations: number;
}

function dispatchResult(value: unknown): WebhookDispatchResult {
  if (!value || typeof value !== 'object') throw new Error('Kết quả webhook không hợp lệ.');
  const result = value as Record<string, unknown>;
  if ((result.orderId !== null && typeof result.orderId !== 'string')
    || typeof result.replayed !== 'boolean' || typeof result.status !== 'string')
    throw new Error('Kết quả webhook không hợp lệ.');
  return { orderId: result.orderId as string | null, replayed: result.replayed, status: result.status };
}

function record(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Kết quả webhook không hợp lệ.');
  return value as Record<string, unknown>;
}

function queueStatus(value: unknown): WebhookQueueStatus {
  const result = record(value);
  if ((result.mode !== 'Direct' && result.mode !== 'Sqs')
    || !['available', 'inFlight', 'delayed', 'deadLetter'].every(key => typeof result[key] === 'number'))
    throw new Error('Trạng thái hàng đợi không hợp lệ.');
  return result as unknown as WebhookQueueStatus;
}

function cleanupResult(value: unknown): WebhookDemoCleanupResult {
  const result = record(value);
  if (typeof result.batchId !== 'string' || typeof result.deletedOrders !== 'number'
    || typeof result.releasedReservations !== 'number')
    throw new Error('Kết quả dọn dữ liệu demo không hợp lệ.');
  return result as unknown as WebhookDemoCleanupResult;
}

export const webhookSimulatorService = {
  dispatch: async (connectionId: string, body: object, token: string) => dispatchResult(
    await apiClient.post<unknown>('/api/v1/webhook-simulator/' + encodeURIComponent(connectionId) + '/dispatch', token, body, undefined, 120000)),
  queueStatus: async (token: string) => queueStatus(
    await apiClient.get<unknown>('/api/v1/webhook-simulator/queue-status', token)),
  cleanupBatch: async (batchId: string, token: string) => cleanupResult(
    await apiClient.delete<unknown>('/api/v1/webhook-simulator/demo-batches/' + encodeURIComponent(batchId), token, 120000)),
};
