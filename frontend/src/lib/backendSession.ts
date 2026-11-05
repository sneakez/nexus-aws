export type BackendRole = 'admin' | 'manager' | 'warehouse';

export interface BackendSession {
  userId: string;
  roles: BackendRole[];
}

function isBackendRole(value: unknown): value is BackendRole {
  return value === 'admin'
    || value === 'manager'
    || value === 'warehouse';
}

export async function getBackendSession(
  accessToken: string,
  signal?: AbortSignal,
): Promise<BackendSession> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error('Chưa cấu hình VITE_API_BASE_URL.');
  }

  const response = await fetch(
    `${baseUrl.replace(/\/+$/, '')}/api/v1/session/me`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
      cache: 'no-store',
    },
  );

  if (response.status === 401) {
    throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }

  if (response.status === 403) {
    throw new Error('Tài khoản chưa được cấp quyền hoặc đã bị khóa.');
  }

  if (!response.ok) {
    throw new Error(`Không tải được quyền tài khoản (HTTP ${response.status}).`);
  }

  const data: unknown = await response.json();

  if (typeof data !== 'object' || data === null) {
    throw new Error('Dữ liệu phiên từ backend không hợp lệ.');
  }

  const session = data as Record<string, unknown>;

  if (Array.isArray(session.roles) && session.roles.length === 0) {
    throw new Error('Tài khoản chưa được cấp quyền. Liên hệ quản trị viên.');
  }

  if (
    typeof session.userId !== 'string'
    || !Array.isArray(session.roles)
    || session.roles.length === 0
    || !session.roles.every(isBackendRole)
  ) {
    throw new Error('Backend trả về tài khoản hoặc role không hợp lệ.');
  }

  return {
    userId: session.userId,
    roles: session.roles,
  };
}