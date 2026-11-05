import { apiClient } from './apiClient';

export const webhookSimulatorService = {
  dispatch: (connectionId: string, body: object, token: string) => apiClient.post('/api/v1/webhook-simulator/' + encodeURIComponent(connectionId) + '/dispatch', token, body),
};
