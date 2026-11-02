export type { Tenant, TenantRole };
import type {
  Tenant,
  TenantRole,
  TenantMembership,
  Profile,
  Product,
  Warehouse,
  Customer,
  Order,
  OrderItem,
  StockLedgerEntry,
  PurchaseOrder,
  PurchaseOrderItem,
  Transfer,
  PickingWave,
  ReturnRecord,
  ReturnItem,
  Batch,
  JournalEntry,
  JournalLine,
  Channel,
  SerialStatus,
  ChannelConnection,
  ChannelSkuMapping,
  OrderAutomationRule,
  BufferRule,
  RoutingRule,
  CustomerComplaint,
  OutboundWebhook,
  WebhookDeliveryLog,
  OrderFeeBreakdown,
  SyncLog
} from '@/types';

// ============ 5-State Inventory Model ============
export interface SkuInventory5State {
  sku: string;
  product_id: string;
  name: string;
  warehouse_id: string;
  warehouse_name: string;
  // Non-overlapping Invariant: physical = sellable + reserved + unavailable (pending_qc + damaged)
  physical: number;    // Actual items on shelf in warehouse = sellable + reserved + unavailable
  sellable: number;    // Free stock available for new sales (alias: available)
  available: number;   // Backward compatibility: available === sellable
  reserved: number;    // Locked for pending/processing orders
  unavailable: number; // Quarantined = pending_qc + damaged
  pending_qc: number;  // Arrived at warehouse dock, awaiting QC inspection
  damaged: number;     // QC failed / defective / scrap quarantine
  in_transit: number;  // In transit between warehouses or carrier dispatch (NOT counted in physical)
  incoming: number;    // Confirmed PO from supplier en route to dock (alias: inbound)
  inbound: number;     // Backward compatibility: inbound === incoming
  safety_stock: number;
  reorder_level: number;
  sales_velocity: number; // Avg units sold per day
  runway_days: number;    // sellable / sales_velocity
  status: 'Healthy' | 'Warning' | 'Critical';
}

// ============ Supplier Model ============
export interface Supplier {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  lead_time_days: number;
  rating: number;
  created_at: string;
}

// ============ Warranty & Serial Item ============
export interface SerialWarrantyRecord {
  id: string;
  tenant_id: string;
  serial_number: string;
  sku: string;
  product_name: string;
  status: SerialStatus;
  warehouse_id: string;
  order_id?: string;
  customer_name?: string;
  warranty_start?: string;
  warranty_months: number;
  warranty_end?: string;
  rma_history: Array<{
    date: string;
    issue: string;
    resolution: string;
  }>;
}

// ============ Marketplace Reconciliation Item ============
export interface MarketplaceReconciliation {
  id: string;
  tenant_id: string;
  settlement_id: string;
  channel: Channel;
  period_start: string;
  period_end: string;
  order_count: number;
  gross_sales: number;
  platform_fees: number;
  commission: number;
  shipping_subsidies: number;
  net_payout: number;
  system_calculated_payout: number;
  discrepancy: number;
  status: 'matched' | 'discrepancy_flagged' | 'reconciled';
  settled_at: string;
}

// ============ Demo Scenarios ============
export type DemoScenarioId =
  | 'SCENARIO_NORMAL_DAY'
  | 'SCENARIO_FLASH_SALE'
  | 'SCENARIO_STOCKOUT'
  | 'SCENARIO_CANCELLATION'
  | 'SCENARIO_MISMATCH_PICK'
  | 'SCENARIO_FAILED_DELIVERY'
  | 'SCENARIO_PARTIAL_RETURN'
  | 'SCENARIO_DAMAGED_QC'
  | 'SCENARIO_WARRANTY_RMA'
  | 'SCENARIO_SUPPLIER_SHORTAGE'
  | 'SCENARIO_FEE_MISMATCH'
  | 'SCENARIO_UNAUTHORIZED_ACTION';

export interface DemoScenario {
  id: DemoScenarioId;
  name: string;
  description: string;
  category: 'Orders' | 'Inventory' | 'Fulfillment' | 'Returns' | 'Finance' | 'RBAC';
  roleRecommended: TenantRole;
  steps: string[];
}

// ============ Event Bus Payload ============
export type MockEventTopic =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'STOCK_RESERVED'
  | 'STOCK_RELEASED'
  | 'STOCK_DISPATCHED'
  | 'WAVE_CREATED'
  | 'ITEM_PICKED'
  | 'ITEM_PACKED'
  | 'RETURN_INSPECTED'
  | 'REFUND_PROCESSED'
  | 'PO_RECEIVED'
  | 'JOURNAL_POSTED'
  | 'DATABASE_RESET'
  | 'SCENARIO_TRIGGERED'
  | 'ROLE_SWITCHED';

export interface MockEvent<T = unknown> {
  topic: MockEventTopic;
  timestamp: string;
  actor: string;
  payload: T;
}

// ============ Business Rules Review Configuration ============
export interface BusinessRuleHistoryEntry {
  id: string;
  timestamp: string;
  actor: string;
  fromStatus: string;
  toStatus: string;
  fromOptionId: string;
  toOptionId: string;
  reason: string;
  version: string;
}

export interface BusinessRuleConfig {
  id: string;
  category: 'inventory' | 'revenue' | 'delivery_pod' | 'rma' | 'accounting';
  name: string;
  code: string;
  summary: string;
  currentStatus: 'approved' | 'assumption' | 'under_review';
  proposedOptionId: string;       // Phương án ban đầu được hệ thống đề xuất
  selectedOptionId: string;       // Phương án đang được chọn để mô phỏng (Simulating)
  approvedOptionId: string | null;// Phương án đã được Chủ Doanh Nghiệp phê duyệt chính thức (null nếu chưa duyệt)
  version: string;                // Ví dụ: v1.0, v1.1
  effectiveDate: string;          // Ngày bắt đầu áp dụng
  tenantScope: 'global' | 'single_tenant'; // Phạm vi áp dụng
  changeReason: string;           // Lý do thay đổi gần nhất
  options: Array<{
    id: string;
    label: string;
    description: string;
    isAssumption?: boolean;
    financialImpact?: string;
  }>;
  complianceNotes: string;
  history: BusinessRuleHistoryEntry[];
  updatedAt: string;
}

// ============ RMA Dynamic Configuration ============
export interface RmaGovernanceConfig {
  approvalThreshold: number; // e.g. 1000000 VND
  thresholdStatus: 'approved' | 'assumption' | 'under_review';
  makerRoles: string[];      // ['warehouse', 'manager']
  checkerRoles: string[];    // ['owner', 'admin']
  enabledBranches: import('@/types').RmaBranch[];
  preventDoubleRefund: boolean;
  preventDoubleRestock: boolean;
  preventExceedingOrderQty: boolean;
}

// ============ Revenue Policies Comparison ============
export type RevenuePolicyType =
  | 'FOB_DESTINATION'     // Ghi nhận Có 511 khi có POD giao thành công
  | 'FOB_SHIPPING_POINT'  // Ghi nhận Có 511 khi xuất kho bàn giao vận chuyển
  | 'POST_CLEARANCE_7D'   // Ghi nhận Có 511 sau 7 ngày kết thúc hạn đổi trả
  | 'CASH_BASIS';         // Ghi nhận Có 511 ngay khi khách thanh toán xong

// ============ Validation Scenario Result ============
export interface ScenarioValidationResult {
  scenarioId: string;
  title: string;
  category: 'inventory' | 'order_pod' | 'revenue' | 'rma' | 'cross_module';
  passed: boolean;
  timestamp: string;
  before: Record<string, any>;
  after: Record<string, any>;
  deltas: Record<string, any>;
  invariantsChecked: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
  affectedModules: string[];
  eventLogs?: Array<{
    timestamp: string;
    topic: string;
    details: string;
    actor: string;
  }>;
  notes: string;
}

// ============ Database Snapshot Structure ============
export interface MockDatabaseSnapshot {
  finance?: import('./finance').FinanceState;
  marketplaceEvents?: Array<{ id: string; tenant_id: string; shop_id: string; status: 'pending' | 'failed' | 'processed'; error?: string; order: Order; items: OrderItem[] }>;
  sourceVersions?: Record<string, number>;
  activeUserId?: string | null;
  returnReceipts?: Array<{
    id: string; return_id: string; warehouse_id: string; actor_id: string; created_at: string;
    lines: Array<{ item_id: string; quantity: number; pass_qty: number; fail_qty: number; serials?: string[]; wrong_serial?: boolean }>;
  }>;
  processedCommands?: Record<string, string>;
  handoffAssignments?: Record<string, { assignee_id: string | null; due_at?: string; status?: 'open' | 'processing' | 'resolved' | 'confirmed'; discovered_by?: string; resolved_by?: string; confirmed_by?: string; note?: string; history: Array<{ actor_id: string; assignee_id: string | null; at: string; action?: string; note?: string }> }>;
  growthRecommendations?: Array<{ id: string; tenant_id: string; order_id: string; reason: string; actor_id: string; status: 'open' | 'accepted' | 'dismissed'; created_at: string }>;
  schemaVersion: number;
  snapshotId?: string;
  stateRevision?: number;
  lastUpdated: string;
  activeTenantId: string;
  activeRole: TenantRole;
  tenants: Tenant[];
  memberships: TenantMembership[];
  profiles: Profile[];
  products: Product[];
  warehouses: Warehouse[];
  inventory5State: SkuInventory5State[];
  stockLedger: StockLedgerEntry[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  orderItems: OrderItem[];
  purchaseOrders?: PurchaseOrder[];
  purchaseOrderItems?: PurchaseOrderItem[];
  transfers?: Transfer[];
  pickingWaves: PickingWave[];
  returns: ReturnRecord[];
  returnItems: ReturnItem[];
  batches: Batch[];
  serials: SerialWarrantyRecord[];
  journalEntries: JournalEntry[];
  journalLines: JournalLine[];
  reconciliations: MarketplaceReconciliation[];
  businessRules?: BusinessRuleConfig[];
  rmaConfig?: RmaGovernanceConfig;
  revenuePolicy?: RevenuePolicyType;
  channelConnections?: ChannelConnection[];
  channelSkuMappings?: ChannelSkuMapping[];
  orderAutomationRules?: OrderAutomationRule[];
  bufferRules?: BufferRule[];
  routingRules?: RoutingRule[];
  customerComplaints?: CustomerComplaint[];
  outboundWebhooks?: OutboundWebhook[];
  webhookDeliveryLogs?: WebhookDeliveryLog[];
  orderFeeBreakdowns?: OrderFeeBreakdown[];
  syncLogs?: SyncLog[];
  dynamicTables?: Record<string, Record<string, unknown>[]>;
  auditLogs: Array<{
    id: string;
    action: string;
    entity: string;
    entity_id: string;
    actor: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
}
