import { apiClient } from './apiClient';

export type BackendRole = 'admin' | 'manager' | 'warehouse';
export interface BackendSession { userId: string; roles: BackendRole[]; }
const isRole = (value: unknown): value is BackendRole => value === 'admin' || value === 'manager' || value === 'warehouse';

export const sessionService = {
  async me(accessToken: string, signal?: AbortSignal): Promise<BackendSession> {
    const value = await apiClient.get<unknown>('/api/v1/session/me', accessToken, signal);
    if (!value || typeof value !== 'object') throw new Error('Dữ liệu phiên từ backend không hợp lệ.');
    const data = value as Record<string, unknown>;
    if (typeof data.userId !== 'string' || !Array.isArray(data.roles) || !data.roles.length || !data.roles.every(isRole)) throw new Error('Tài khoản chưa được cấp quyền hoặc đã bị khóa.');
    return { userId: data.userId, roles: data.roles };
  },
};
