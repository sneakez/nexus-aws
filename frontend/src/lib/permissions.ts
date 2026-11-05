export const ENABLE_FINANCE_ROLE = false;
import type { TenantRole } from '@/types';

export type Permission =
  // Orders
  | 'orders:view'
  | 'orders:create'
  | 'orders:manage'
  | 'orders:cancel'
  | 'orders:delete'
  // Inventory
  | 'inventory:view'
  | 'inventory:receive'
  | 'inventory:move'
  | 'inventory:adjust'
  | 'inventory:mutate'
  // Products & Warehouses
  | 'products:view'
  | 'products:manage'
  | 'warehouses:manage'
  // Purchasing
  | 'purchasing:view'
  | 'purchasing:create'
  | 'purchasing:approve'
  // Finance & Accounting
  | 'finance:view'
  | 'finance:reconcile'
  | 'finance:adjust'
  | 'finance:approve'
  | 'finance:manage'
  // Growth & Marketing
  | 'growth:view'
  | 'growth:manage'
  | 'growth:budget_approve'
  // Analytics & Audit
  | 'analytics:view'
  | 'audit:view'
  // System Governance
  | 'users:manage'
  | 'integrations:manage'
  | 'settings:manage'
  | 'simulator:access'
  | 'webhooks:manage';

const ROLE_PERMISSIONS: Record<TenantRole, readonly Permission[]> = {
  admin: [
    'orders:view', 'orders:create', 'orders:manage', 'orders:cancel', 'orders:delete',
    'inventory:view', 'inventory:receive', 'inventory:move', 'inventory:adjust', 'inventory:mutate',
    'products:view', 'products:manage', 'warehouses:manage',
    'purchasing:view', 'purchasing:create', 'purchasing:approve',
    'finance:view', 'finance:reconcile', 'finance:adjust', 'finance:approve', 'finance:manage',
    'growth:view', 'growth:manage', 'growth:budget_approve',
    'analytics:view', 'audit:view',
    'users:manage', 'integrations:manage', 'settings:manage',
    'simulator:access', 'webhooks:manage',
  ],

  manager: [
    'orders:view', 'orders:create', 'orders:manage', 'orders:cancel',
    'inventory:view', 'inventory:receive', 'inventory:move', 'inventory:mutate',
    'products:view', 'products:manage', 'warehouses:manage',
    'purchasing:view', 'purchasing:create',
    'finance:view', 'finance:reconcile',
    'growth:view',
    'analytics:view', 'audit:view',
    'simulator:access',
  ],

  warehouse: [
    'orders:view',
    'inventory:view', 'inventory:receive', 'inventory:move', 'inventory:mutate',
    'products:view',
    'purchasing:view',
  ],

};

export function hasPermission(role: TenantRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && permissions.includes(permission));
}

function getRolePages(role: TenantRole | null | undefined): string[] {
  if (!role) return ['dashboard'];
  switch (role) {
    case 'admin':
      return [
        'dashboard', 'inventory',
        'orders', 'fulfillment', 'returns', 'customers',
        'orderEconomics', 'skuEconomics', 'channelEconomics', 'cashWorkingCapital', 'pricingCalculator',
        'channelConnections', 'channelMapping', 'simulator',
      ];

    case 'manager':
      return [
        'dashboard', 'inventory',
        'orders', 'fulfillment', 'returns', 'customers',
        'orderEconomics', 'skuEconomics', 'channelEconomics', 'cashWorkingCapital', 'pricingCalculator',
        'simulator',
      ];

    case 'warehouse':
      return ['dashboard', 'inventory', 'orders', 'fulfillment', 'returns'];

    default:
      return ['dashboard'];
  }
}

// Preserve all original modules; role access is independent of module readiness.
export const OPTIONAL_PAGES = new Set<string>();
export function getAllowedPagesForRole(role: TenantRole | null | undefined, backendMode = false): string[] {
  if (backendMode) {
    if (role === 'admin' || role === 'manager') return [...getRolePages('admin').filter(page => page !== 'cashWorkingCapital' && page !== 'simulator'), 'products'];
    return role === 'warehouse' ? [...getRolePages('warehouse'), 'products'] : [];
  }
  return getRolePages(role);
}
