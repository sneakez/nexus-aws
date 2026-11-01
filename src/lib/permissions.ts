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
  // R1 — Owner / Founder: Unrestricted governance, final approvals, audit review
  owner: [
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

  // R2 — System Administrator: Systems, integrations, users (no financial approvals)
  admin: [
    'orders:view', 'inventory:view', 'products:view', 'audit:view',
    'users:manage', 'integrations:manage', 'settings:manage', 'simulator:access', 'webhooks:manage',
  ],

  // R3 — Operations / Commerce Manager: Multi-channel orders, fulfillment, RMA, inventory
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

  // R4 — Warehouse Operator: Stock receipt, wave picking, packing, stock movements
  warehouse: [
    'orders:view',
    'inventory:view', 'inventory:receive', 'inventory:move', 'inventory:mutate',
    'products:view',
    'purchasing:view',
  ],

  // R5 — Finance / Accountant: Ledger, reconciliation, fee audit, financial records
  finance: [
    'orders:view',
    'purchasing:view',
    'finance:view', 'finance:reconcile', 'finance:adjust', 'finance:manage',
    'analytics:view', 'audit:view',
  ],

  // R6 — Growth / Marketing: Campaigns, ROAS, funnel, KOC, attributed orders
  growth: [
    'orders:view',
    'products:view',
    'inventory:view',
    'growth:view', 'growth:manage',
    'analytics:view',
  ],

  // R7 — Read-only Analyst: Authorized reports and analytics
  viewer: [],
};

export function hasPermission(role: TenantRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && permissions.includes(permission));
}

function getRolePages(role: TenantRole | null | undefined): string[] {
  if (!role) return ['dashboard'];
  switch (role) {
    case 'owner':
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

    case 'admin':
    case 'finance':
    case 'growth':
    case 'viewer':
      return [];

    default:
      return ['dashboard'];
  }
}

// Preserve all original modules; role access is independent of module readiness.
export const OPTIONAL_PAGES = new Set<string>();
export function getAllowedPagesForRole(role: TenantRole | null | undefined): string[] {
  return getRolePages(role);
}
