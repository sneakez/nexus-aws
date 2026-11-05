import { parseMoneyResponse } from '@/lib/orderFormatting';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

type RequestOptions = {
  signal?: AbortSignal;
  body?: object;
  method?: 'POST' | 'PUT' | 'DELETE';
  exactMoneyFields?: ReadonlySet<string>;
};

async function request<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!baseUrl) throw new Error('Chưa cấu hình VITE_API_BASE_URL.');
  const { signal, body, method, exactMoneyFields } = options;
  const response = await fetch(baseUrl.replace(/\/+$/, '') + path, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  const data: unknown = await (exactMoneyFields && response.ok
    ? response.text().then(json => parseMoneyResponse(json, exactMoneyFields))
    : response.status === 204 ? Promise.resolve(null) : response.json()).catch(() => null);
  if (!response.ok) {
    let message = 'Không thể xử lý yêu cầu (HTTP ' + response.status + ').';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    else if (response.status === 403) message = 'Tài khoản không có quyền thực hiện thao tác này.';
    else if (response.status === 404) message = 'Không tìm thấy dữ liệu được yêu cầu.';
    else if (response.status < 500 && data && typeof data === 'object') {
      const error = data as Record<string, unknown>;
      if (typeof error.message === 'string') message = error.message;
      else if (error.errors && typeof error.errors === 'object') {
        const values = Object.values(error.errors).flat().filter((value): value is string => typeof value === 'string');
        if (values.length) message = values.join(' ');
      }
    }
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export const apiClient = {
  get: <T>(path: string, token: string, signal?: AbortSignal, exactMoneyFields?: ReadonlySet<string>) => request<T>(path, token, { signal, exactMoneyFields }),
  post: <T>(path: string, token: string, body: object, exactMoneyFields?: ReadonlySet<string>) => request<T>(path, token, { body, exactMoneyFields }),
  put: <T>(path: string, token: string, body: object) => request<T>(path, token, { body, method: 'PUT' }),
  delete: (path: string, token: string) => request<null>(path, token, { method: 'DELETE' }),
};
