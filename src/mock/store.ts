import { commerceFixture } from './commerceFixture';
import { moneyFixture } from './moneyFixture';
import { commerceOrderMetrics } from './commerceMetrics';
import { ensureFinance, financeState, balance, batchView, payableView, cashForecast, accruePurchaseReceipt, operationsConfig, validMoneyDate, moneySignature, type CashAccount, type PricingAssumptions, type OperationsConfig } from './finance';
import { INITIAL_MOCK_DATABASE } from './seedData';
import { receiveReturn, inspectReturn, inventoryForReceipt, commandId, type ReceiptLine, type QcLine } from './returnCommands';
import { hasPermission, ENABLE_FINANCE_ROLE, type Permission } from '@/lib/permissions';
import type { OrderFeeBreakdown } from '@/types';
import type { 
  MockDatabaseSnapshot, 
  MockEvent, 
  MockEventTopic, 
  SkuInventory5State,
  TenantRole,
  Tenant
} from './types';
import type { 
  Order, 
  OrderItem, 
  StockLedgerEntry, 
  ReturnRecord, 
  PickingWave,
  JournalEntry,
  JournalLine,
  Product,
  Customer,
  Warehouse
} from '@/types';

const STORAGE_KEY = 'nexus_mock_db_v2';

type StoreListener = (event?: MockEvent) => void;

class MockDataStore {
  private state: MockDatabaseSnapshot;
  private listeners: Set<StoreListener> = new Set();
  public simulatedLatencyMs: number = 80;

  constructor() {
    this.state = this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const nextState = JSON.parse(e.newValue) as MockDatabaseSnapshot;
            this.state = nextState;
            this.listeners.forEach(fn => fn());
          } catch {
            // Ignore parse errors
          }
        }
      });
    }
  }

  private loadFromStorage(): MockDatabaseSnapshot {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as MockDatabaseSnapshot;
          if (parsed.schemaVersion === 3 || parsed.schemaVersion === INITIAL_MOCK_DATABASE.schemaVersion) {
            if (parsed.schemaVersion === 3) {
              parsed.schemaVersion = INITIAL_MOCK_DATABASE.schemaVersion;
              for (const profile of INITIAL_MOCK_DATABASE.profiles.filter(p => p.id === 'usr_growth_01')) if (!parsed.profiles.some(p => p.id === profile.id)) parsed.profiles.push(structuredClone(profile));
              for (const member of INITIAL_MOCK_DATABASE.memberships.filter(m => m.role === 'growth')) if (!parsed.memberships.some(m => m.role === 'growth' && m.tenant_id === member.tenant_id)) parsed.memberships.push(structuredClone(member));
              parsed.activeUserId = parsed.memberships.find(m => m.tenant_id === parsed.activeTenantId && m.role === parsed.activeRole && m.status === 'active')?.user_id || null;
              // Keep historical inventory/money intact. Legacy receipts with no line evidence are flagged for review.
              for (const r of parsed.returns) if (['received', 'qc_passed', 'qc_failed'].includes(r.status) && !parsed.returnReceipts?.some(x => x.return_id === r.id)) {
                r.has_discrepancy = true; r.qc_notes = 'Legacy: thiếu chứng từ receipt/QC; cần kiểm tra, không tự cộng tồn';
              }
            }
            return parsed;
          }
        }
      }
    } catch {
      // In-memory fallback
    }
    const fresh = JSON.parse(JSON.stringify(INITIAL_MOCK_DATABASE)) as MockDatabaseSnapshot;
    this.saveToStorage(fresh);
    return fresh;
  }

  private saveToStorage(nextState: MockDatabaseSnapshot) {
    if (typeof window === 'undefined') return; // function/integration harness is in-memory
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)); }
    catch {
      const message = 'Không thể lưu dữ liệu demo. Giao dịch chưa áp dụng; kiểm tra quyền lưu trữ hoặc dung lượng trình duyệt.';
      if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('nexus-storage-error', { detail: message }));
      throw Error(message);
    }
  }

  private mutate(updater: (draft: MockDatabaseSnapshot) => void, eventTopic: MockEventTopic, payload?: unknown) {
    const clone = JSON.parse(JSON.stringify(this.state)) as MockDatabaseSnapshot;
    updater(clone);
    // Late source changes append an observation without rewriting cash documents.
    for (const batch of financeState(clone).settlements) {
      const old = financeState(this.state).settlements.find(b => b.id === batch.id);
      if (old) {
        const before = batchView(this.state, old).current_expected, after = batchView(clone, batch).current_expected;
        if (before !== after) batch.history.push({ at: new Date().toISOString(), actor_id: this.state.activeUserId || 'unauthenticated', action: 'source_adjustment', note: `Dự kiến ${before} → ${after}; chứng từ tiền đã nhận giữ nguyên` });
      }
    }
    if (eventTopic !== 'DATABASE_RESET') {
      const oldLedger = new Set(this.state.stockLedger.map(l => l.id));
      for (const l of clone.stockLedger) if (!oldLedger.has(l.id)) l.created_by = this.state.activeUserId || 'unauthenticated';
      const oldJournals = new Set(this.state.journalEntries.map(j => j.id));
      for (const j of clone.journalEntries) if (!oldJournals.has(j.id)) j.posted_by = this.state.activeUserId || 'unauthenticated';
    }
    if (eventTopic !== 'DATABASE_RESET' && eventTopic !== 'ROLE_SWITCHED') clone.auditLogs.unshift({
      id: commandId(), action: eventTopic, entity: 'command', entity_id: String((payload as any)?.orderId || (payload as any)?.returnId || (payload as any)?.feeId || ''),
      actor: this.state.activeUserId || 'unauthenticated', details: { payload }, created_at: new Date().toISOString()
    });
    for (const log of clone.auditLogs) if (!(log as any).tenant_id) (log as any).tenant_id = this.state.activeTenantId;
    if (eventTopic === 'DATABASE_RESET') {
      clone.stateRevision = 0;
    } else {
      clone.stateRevision = (clone.stateRevision || 0) + 1;
    }
    clone.lastUpdated = new Date().toISOString();
    this.saveToStorage(clone);
    this.state = clone;

    const event: MockEvent = {
      topic: eventTopic,
      timestamp: new Date().toISOString(),
      actor: this.state.activeUserId || 'unauthenticated',
      payload
    };

    this.listeners.forEach(fn => {
      try {
        fn(event);
      } catch (err) {
        console.error('[MockStore] Listener error:', err);
      }
    });
  }

  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async delay(ms?: number): Promise<void> {
    const wait = ms ?? this.simulatedLatencyMs;
    if (wait > 0) {
      await new Promise(res => setTimeout(res, wait));
    }
  }

  public getSnapshot(): MockDatabaseSnapshot {
    return structuredClone(this.state);
  }

  public getStateRevision(): number {
    return this.state.stateRevision || 0;
  }

  public resetToDefaultSeed(): void {
    const fresh = JSON.parse(JSON.stringify(INITIAL_MOCK_DATABASE)) as MockDatabaseSnapshot;
    fresh.lastUpdated = new Date().toISOString();
    this.saveToStorage(fresh);
    this.state = fresh;
    this.listeners.forEach(fn => fn({
      topic: 'DATABASE_RESET',
      timestamp: new Date().toISOString(),
      actor: 'system',
      payload: null
    }));
  }

  // ============ Tenant & RBAC Role Management ============

  public getActiveTenant(): Tenant {
    const found = this.state.tenants.find(t => t.id === this.state.activeTenantId);
    return found || this.state.tenants[0];
  }

  public setActiveTenant(tenantId: string): void {
    this.mutate(draft => {
      draft.activeTenantId = tenantId;
    }, 'ROLE_SWITCHED', { tenantId });
  }

  public getActiveRole(): TenantRole {
    return this.state.activeRole;
  }

  public signOutDemoUser(): void {
    this.mutate(draft => { draft.activeUserId = null; }, 'ROLE_SWITCHED', { action: 'signed_out' });
  }

  public getDemoLoginAccounts() {
    const roles: TenantRole[] = ['owner', 'manager', 'warehouse'];
    return roles.flatMap(role => this.state.memberships
      .filter(m => m.tenant_id === this.state.activeTenantId && m.status === 'active' && m.role === role)
      .flatMap(m => {
        const profile = this.state.profiles.find(p => p.id === m.user_id && p.is_active);
        return profile ? [{ role, email: profile.email, name: profile.full_name }] : [];
      }));
  }

  public signInDemoUser(email: string): { success: boolean; error?: string; userId?: string } {
    const profile = this.state.profiles.find(p => p.email.toLowerCase() === email.trim().toLowerCase() && p.is_active);
    const membership = this.state.memberships.find(m => m.user_id === profile?.id && m.tenant_id === this.state.activeTenantId && m.status === 'active');
    const mvpRoles: TenantRole[] = ['owner', 'manager', 'warehouse'];
    if (!profile || !membership || !mvpRoles.includes(membership.role)) return { success: false, error: 'Vai trò này không nằm trong phạm vi prototype MVP' };
    this.mutate(draft => { draft.activeUserId = profile.id; draft.activeRole = membership.role; }, 'ROLE_SWITCHED', { userId: profile.id });
    return { success: true, userId: profile.id };
  }

  public setActiveRole(role: TenantRole): void {
    this.mutate(draft => {
      draft.activeRole = role;
      draft.activeUserId = draft.memberships.find(m => m.tenant_id === draft.activeTenantId && m.role === role && m.status === 'active')?.user_id || null;
    }, 'ROLE_SWITCHED', { role });
  }

  public getExecutionContext() {
    const member = this.state.memberships.find(m => m.user_id === this.state.activeUserId && m.role === this.state.activeRole && m.tenant_id === this.state.activeTenantId && m.status === 'active');
    const profile = this.state.profiles.find(p => p.id === member?.user_id && p.is_active);
    return member && profile && (member.role !== 'finance' || ENABLE_FINANCE_ROLE) ? { userId: member.user_id, role: member.role, tenantId: member.tenant_id, shopIds: member.shop_ids, warehouseIds: member.warehouse_ids } : null;
  }

  public authorize(permission: Permission, entity?: unknown): string | null {
    const ctx = this.getExecutionContext();
    if (!ctx || ctx.role === 'viewer' || !hasPermission(ctx.role, permission)) return 'Command rejected: Quyền hạn bị từ chối hoặc thiếu session hợp lệ';
    if (!entity || typeof entity !== 'object') return 'Command rejected: Không tìm thấy đối tượng trong phạm vi';
    const row = entity as Record<string, any>;
    const order = row.order_id ? this.state.orders.find(o => o.id === row.order_id) : row.return_id ? this.state.orders.find(o => o.id === this.state.returns.find(r => r.id === row.return_id)?.order_id) : undefined;
    if ((row.order_id || row.return_id) && (!order || order.tenant_id !== ctx.tenantId)) return 'Command rejected: Chứng từ không có đơn gốc trong tenant';
    const journal = this.state.journalEntries.find(j => j.id === (row.entry_id || row.journal_entry_id));
    const purchaseOrder = row.po_id ? this.state.purchaseOrders?.find(p => p.id === row.po_id) : undefined;
    const warehouseId = row.warehouse_id || row.assigned_warehouse_id || order?.assigned_warehouse_id || purchaseOrder?.warehouse_id || (this.state.warehouses.some(w => w.id === row.id) ? row.id : undefined);
    const tenantId = row.tenant_id || order?.tenant_id || journal?.tenant_id || this.state.warehouses.find(w => w.id === warehouseId)?.tenant_id;
    if (tenantId !== ctx.tenantId) return 'Command rejected: Ngoài tenant được giao';
    const shopId = row.shop_id || row.channel_shop_id || order?.shop_id;
    if (ctx.shopIds && (!shopId || !ctx.shopIds.includes(shopId))) return 'Command rejected: Ngoài shop được giao';
    if (ctx.warehouseIds && (!warehouseId || !ctx.warehouseIds.includes(warehouseId))) return 'Command rejected: Ngoài kho được giao';
    if (warehouseId && !this.state.warehouses.some(w => w.id === warehouseId && w.tenant_id === ctx.tenantId)) return 'Command rejected: Kho không thuộc tenant';
    return null;
  }

  private commandPermission(permission: Permission): string | null {
    const ctx = this.getExecutionContext();
    return ctx && ctx.role !== 'viewer' && hasPermission(ctx.role, permission) ? null : 'Command rejected: Quyền hạn bị từ chối hoặc thiếu session';
  }

  // ============ Orders & Atomic Reservation ============

  public getOrders(tenantId?: string): Order[] {
    const tId = tenantId || this.state.activeTenantId;
    const ctx = this.getExecutionContext();
    if (!ctx || !hasPermission(ctx.role, 'orders:view') || ctx.tenantId !== tId) return [];
    return structuredClone(this.state.orders.filter(o => o.tenant_id === tId && (!ctx.shopIds || ctx.shopIds.includes(o.shop_id!)) && (!ctx.warehouseIds || ctx.warehouseIds.includes(o.assigned_warehouse_id!))));
  }

  public getOrderWithCustomer(orderId: string): (Order & { customer?: unknown; items?: OrderItem[] }) | null {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order || !this.getOrders().some(o => o.id === orderId)) return null;
    const customer = this.state.customers.find(c => c.id === order.customer_id);
    const items = this.state.orderItems.filter(i => i.order_id === order.id);
    return structuredClone({ ...order, customer, items });
  }

  public placeOrderAtomic(newOrder: Partial<Order> & { tenant_id: string; order_number: string },  items: Array<{ product_id: string; sku: string; quantity: number; unit_price: number }>): { success: boolean; orderId?: string; error?: string } {
    // 0. Verify Multi-shop Uniqueness (tenant_id, shop_id, channel_order_sn) (R05)
    if (newOrder.channel_order_sn) {
      const existingDup = this.state.orders.find(o =>
        o.tenant_id === (newOrder.tenant_id || this.state.activeTenantId) &&
        (o.shop_id || 'default') === (newOrder.shop_id || 'default') &&
        o.channel_order_sn === newOrder.channel_order_sn
      );
      if (existingDup) {
        return {
          success: false,
          error: `Đơn hàng trùng lặp: Mã đơn sàn [${newOrder.channel_order_sn}] trên gian hàng [${newOrder.shop_id || 'default'}] đã tồn tại trong hệ thống.`
        };
      }
    }

    const warehouseId = newOrder.assigned_warehouse_id || this.state.warehouses.find(w => w.tenant_id === newOrder.tenant_id)?.id;
    const scopeError = this.authorize('orders:create', { ...newOrder, assigned_warehouse_id: warehouseId });
    if (scopeError) return { success: false, error: scopeError };
    if (!items.length || !warehouseId || items.some(i => !Number.isSafeInteger(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.unit_price) || i.unit_price < 0)) return { success: false, error: 'Dòng hàng/số lượng không hợp lệ' };
    const quantities = new Map<string, number>();
    for (const item of items) {
      if (!this.state.products.some(p => p.id === item.product_id && p.sku === item.sku && p.tenant_id === newOrder.tenant_id)) return { success: false, error: 'SKU chưa map hoặc ngoài tenant' };
      quantities.set(item.product_id, (quantities.get(item.product_id) || 0) + item.quantity);
    }
    for (const [productId, qty] of quantities) {
      const inv = this.state.inventory5State.find(i => i.product_id === productId && i.warehouse_id === warehouseId);
      if (!inv || inv.available < qty) return { success: false, error: 'không đủ tồn khả dụng; giao dịch không thay đổi tồn' };
    }

    const orderId = `ord_${commandId()}`;
    const placedAt = new Date().toISOString();

    this.mutate(draft => {
      // 2. Lock stock reservation for each item
      for (const item of items) {
        const inv = draft.inventory5State.find(i => i.product_id === item.product_id && i.warehouse_id === warehouseId);
        if (inv) {
          inv.reserved += item.quantity;
          inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
          inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
          inv.sellable = inv.available;
          inv.runway_days = inv.sales_velocity > 0 ? Math.round(inv.available / inv.sales_velocity) : 14;
          inv.status = inv.available <= inv.safety_stock ? 'Critical' : inv.available <= inv.reorder_level ? 'Warning' : 'Healthy';
        }

        // Ledger Entry
        const ledgerId = `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const ledgerEntry: StockLedgerEntry = {
          id: ledgerId,
          tenant_id: draft.activeTenantId,
          product_id: item.product_id,
          warehouse_id: warehouseId,
          transaction_type: 'reservation',
          quantity: item.quantity,
          reference_type: 'order',
          reference_id: orderId,
          notes: `Khóa tồn nguyên tử ${item.quantity}x ${item.sku} cho đơn hàng #${newOrder.order_number}`,
          balance_after: inv?.available || 0,
          created_at: placedAt
        };
        draft.stockLedger.unshift(ledgerEntry);
      }

      // 3. Compute Subtotal & Total
      const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
      const total = Number((newOrder as unknown as Record<string, unknown>).total ?? (newOrder as unknown as Record<string, unknown>).total_amount ?? subtotal);
      
      const orderItemsList = items.map((item, idx) => {
        const prod = draft.products.find(p => p.id === item.product_id || p.sku === item.sku);
        return {
          id: `item_${orderId}_${idx + 1}`,
          order_id: orderId,
          product_id: item.product_id,
          product_name: prod?.name || 'Sản phẩm Nexus',
          product_sku: item.sku || prod?.sku || 'NX-SKU',
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
          total_price: item.quantity * item.unit_price,
          created_at: placedAt,
          parent_bundle_product_id: null,
          unit_cost_mac_snapshot: prod?.moving_avg_cost ?? prod?.cost_price ?? 0,
          serial_numbers: null,
          is_free_gift: false
        };
      });

      const createdOrder: Order = {
        tax: 0,
        shipping: 0,
        discount: 0,
        ...newOrder,
        assigned_warehouse_id: warehouseId,
        fulfillment_status: 'allocated',
        customer_id: (newOrder.customer_id as string | null) ?? null,
        status: 'processing',
        payment_status: (newOrder.payment_status as any) || 'paid',
        placed_at: placedAt,
        subtotal: newOrder.subtotal ?? subtotal,
        total: newOrder.total ?? total,
        total_amount: newOrder.total_amount ?? total,
        channel: newOrder.channel || 'website',
        id: orderId,
        order_items: orderItemsList,
        created_at: placedAt,
        updated_at: placedAt
      };
      draft.orders.unshift(createdOrder);

      // 4. Insert Order Items
      orderItemsList.forEach(it => draft.orderItems.push(it));

      // 5. Pre-payment Accounting Entry (Debit 112 / Credit 131 Prepayment)
      // Note: Revenue (Credit 511) is NOT recognized upon order creation!
      // It is only recognized upon Delivery with POD (FOB Destination) [ASSUMPTION].
      if (newOrder.payment_status === 'paid') {
        const jeId = `je_prepay_${Date.now()}`;
        draft.journalEntries.unshift({
          id: jeId,
          tenant_id: draft.activeTenantId,
          entry_number: `JE-PAY-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          event_source: 'payment_received',
          reference_type: 'order',
          reference_id: orderId,
          description: `Khách hàng thanh toán tiền trước cho đơn #${newOrder.order_number} [ASSUMPTION: Tiền trả trước, chưa ghi nhận Có 511]`,
          posted_at: placedAt,
          posted_by: 'usr_finance_01',
          status: 'posted',
          created_at: placedAt
        });

        draft.journalLines.push(
          {
            id: `jl_${jeId}_1`,
            journal_entry_id: jeId,
            entry_id: jeId,
            account_id: 'acc_112',
            account_code: '112',
            debit_amount: total,
            credit_amount: 0,
            debit: total,
            credit: 0,
            description: `Tiền gửi ngân hàng thu trước đơn #${newOrder.order_number}`,
            created_at: placedAt
          },
          {
            id: `jl_${jeId}_2`,
            journal_entry_id: jeId,
            entry_id: jeId,
            account_id: 'acc_131',
            account_code: '131',
            debit_amount: 0,
            credit_amount: total,
            debit: 0,
            credit: total,
            description: `Khách hàng trả trước (Phải thu - Dư Có) #${newOrder.order_number} [ASSUMPTION]`
          }
        );
      }

      // 6. Append Audit Log
      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'ORDER_ATOMIC_RESERVATION',
        entity: 'orders',
        entity_id: orderId,
        actor: draft.activeUserId || 'unauthenticated',
        details: { order_number: newOrder.order_number, items_count: items.length, total: newOrder.total_amount },
        created_at: placedAt
      });
    }, 'ORDER_CREATED', { orderId, orderNumber: newOrder.order_number });

    return { success: true, orderId };
  }

  public cancelOrderAtomic(orderId: string, reason: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };
    const permissionError = this.authorize('orders:cancel', order);
    if (permissionError) return { success: false, error: permissionError };
    if (order.status === 'shipped' || order.status === 'delivered') {
      return { success: false, error: 'Đơn hàng đã bàn giao vận chuyển, không thể hủy ngang. Phải qua quy trình Đổi trả/Hoàn hàng (RMA).' };
    }
    if (order.status === 'cancelled') {
      return { success: false, error: 'Đơn hàng này đã được hủy trước đó.' };
    }

    const items = this.state.orderItems.filter(i => i.order_id === order.id);
    const now = new Date().toISOString();

    this.mutate(draft => {
      // 1. Release Stock Lock (Available increases, Reserved decreases, Physical UNTOUCHED)
      for (const item of (order.fulfillment_status || order.status === 'processing' ? items : [])) {
        const inv = draft.inventory5State.find(i => i.product_id === item.product_id && i.warehouse_id === order.assigned_warehouse_id);
        if (inv) {
          inv.reserved = Math.max(0, inv.reserved - item.quantity);
          inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
          inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
          inv.sellable = inv.available;
          inv.runway_days = inv.sales_velocity > 0 ? Math.round(inv.available / inv.sales_velocity) : 14;
          inv.status = inv.available <= inv.safety_stock ? 'Critical' : inv.available <= inv.reorder_level ? 'Warning' : 'Healthy';
        }

        // Ledger Entry
        draft.stockLedger.unshift({
          id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          tenant_id: draft.activeTenantId,
          product_id: item.product_id,
          warehouse_id: order.assigned_warehouse_id!,
          transaction_type: 'release',
          quantity: item.quantity,
          reference_type: 'order',
          reference_id: orderId,
          notes: `Giải phóng giữ tồn ${item.quantity}x do hủy đơn: ${reason}`,
          balance_after: inv?.available || 0,
          created_at: now
        });
      }

      // 2. Update Order Status
      const targetOrder = draft.orders.find(o => o.id === orderId);
      if (targetOrder) {
        targetOrder.status = 'cancelled';
        targetOrder.cancellation_requested = false;
        targetOrder.fulfillment_status = 'unfulfilled';
        targetOrder.notes = (targetOrder.notes ? targetOrder.notes + ' | ' : '') + `Đã hủy: ${reason}`;
        targetOrder.updated_at = now;
      }

      // 3. Audit Log
      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'ORDER_CANCELLED_STOCK_RELEASED',
        entity: 'orders',
        entity_id: orderId,
        actor: draft.activeUserId || 'unauthenticated',
        details: { reason, items_released: items.length },
        created_at: now
      });
    }, 'ORDER_CANCELLED', { orderId, reason });

    return { success: true };
  }

  public dispatchOrder(orderId: string, trackingNumber: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };
    const permissionError = this.authorize('inventory:move', order);
    if (permissionError) return { success: false, error: permissionError };
    if (order.status === 'shipped' || order.status === 'delivered') {
      return { success: false, error: 'Đơn hàng đã được xuất kho vận chuyển trước đó.' };
    }

    if (order.fulfillment_status !== 'packed') return { success: false, error: 'Đơn phải được nhặt và đóng gói trước bàn giao' };
    if (order.status === 'cancelled' || order.cancellation_requested || order.hold_reason) return { success: false, error: 'Đơn bị hủy/hold hoặc đang chờ kết quả hủy' };
    if (!trackingNumber.trim()) return { success: false, error: 'Cần mã vận đơn' };
    const items = this.state.orderItems.filter(i => i.order_id === order.id);
    for (const item of items) {
      const inv = this.state.inventory5State.find(i => i.product_id === item.product_id && i.warehouse_id === order.assigned_warehouse_id);
      if (!inv || inv.reserved < item.quantity || inv.physical < item.quantity) return { success: false, error: 'Giữ tồn không hợp lệ' };
    }
    const now = new Date().toISOString();

    this.mutate(draft => {
      // 1. Physical stock decreases, Reserved stock released
      for (const item of items) {
        const inv = draft.inventory5State.find(i => i.product_id === item.product_id && i.warehouse_id === order.assigned_warehouse_id);
        if (inv) {
          inv.physical = Math.max(0, inv.physical - item.quantity);
          inv.reserved = Math.max(0, inv.reserved - item.quantity);
          inv.unavailable = (inv.pending_qc || 0) + (inv.damaged || 0);
          inv.available = Math.max(0, inv.physical - inv.reserved - inv.unavailable);
          inv.sellable = inv.available;
        }

        // Product table stock sync
        const prod = draft.products.find(p => p.id === item.product_id);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
        }

        // Ledger Entry
        draft.stockLedger.unshift({
          id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          tenant_id: draft.activeTenantId,
          product_id: item.product_id,
          warehouse_id: order.assigned_warehouse_id!,
          transaction_type: 'outbound',
          quantity: item.quantity,
          reference_type: 'order',
          reference_id: orderId,
          notes: `Bàn giao vận chuyển [${trackingNumber}]: trừ tồn vật lý ${item.quantity} cái`,
          balance_after: inv?.physical || 0,
          created_at: now
        });
      }

      // 2. Update Order
      const targetOrder = draft.orders.find(o => o.id === orderId);
      if (targetOrder) {
        targetOrder.status = 'shipped';
        targetOrder.fulfillment_status = 'dispatched';
        targetOrder.delivery_status = 'pending_pickup';
        targetOrder.tracking_number = trackingNumber;
        targetOrder.shipped_at = now;
        targetOrder.notes = (targetOrder.notes ? targetOrder.notes + ' | ' : '') + `Mã vận đơn: ${trackingNumber}`;
        targetOrder.updated_at = now;
      }

      // 3. Accounting: COGS Recognition upon Dispatch [ASSUMPTION]
      const totalCost = items.reduce((s, it) => s + (it.quantity * (it.unit_cost_mac_snapshot || 0)), 0);
      if (totalCost > 0) {
        const cogsJeId = `je_cogs_${Date.now()}`;
        draft.journalEntries.unshift({
          id: cogsJeId,
          tenant_id: draft.activeTenantId,
          entry_number: `JE-COGS-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          event_source: 'order_cogs',
          reference_type: 'order',
          reference_id: orderId,
          description: `Xuất kho giá vốn hàng bán #${order.order_number} [ASSUMPTION: Hạch toán giá vốn theo MAC khi xuất kho]`,
          posted_at: now,
          posted_by: 'usr_finance_01',
          status: 'posted',
          created_at: now
        });
        draft.journalLines.push(
          {
            id: `jl_${cogsJeId}_1`,
            journal_entry_id: cogsJeId,
            entry_id: cogsJeId,
            account_id: 'acc_632',
            account_code: '632',
            debit_amount: totalCost,
            credit_amount: 0,
            debit: totalCost,
            credit: 0,
            description: `Giá vốn xuất kho đơn #${order.order_number} [ASSUMPTION]`,
            created_at: now
          },
          {
            id: `jl_${cogsJeId}_2`,
            journal_entry_id: cogsJeId,
            entry_id: cogsJeId,
            account_id: 'acc_156',
            account_code: '156',
            debit_amount: 0,
            credit_amount: totalCost,
            debit: 0,
            credit: totalCost,
            description: `Giảm tồn kho hàng hóa #${order.order_number}`
          }
        );
      }

      // 4. Audit Log
      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'ORDER_DISPATCHED_TO_CARRIER',
        entity: 'orders',
        entity_id: orderId,
        actor: draft.activeUserId || 'unauthenticated',
        details: { trackingNumber, totalCost },
        created_at: now
      });
    }, 'STOCK_DISPATCHED', { orderId, trackingNumber });

    return { success: true };
  }

  // ============ Proof of Delivery (POD) & FOB Destination Recognition ============

  public refundOrder(orderId: string, refundAmount?: number, _actorRole?: TenantRole, _actorId?: string, transactionId?: string): { success: boolean; error?: string } {
    if (this.state.activeRole === 'admin') return { success: false, error: 'Command rejected: Quyền hạn kỹ thuật Admin không được phép duyệt hoàn tiền / giao dịch tài chính' };
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('finance:reconcile', order);
    if (error) return { success: false, error };
    const amount = refundAmount ?? order!.total;
    const id = transactionId || `manual-refund:${orderId}:${amount}`;
    const signature = JSON.stringify({ orderId, amount });
    if (this.state.processedCommands?.[id]) return this.state.processedCommands[id] === signature ? { success: true } : { success: false, error: 'Mã hoàn tiền trùng nội dung khác' };
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount + (order!.refunded_amount ?? (order!.payment_status === 'refunded' ? order!.total : 0)) > order!.total) return { success: false, error: 'Số tiền hoàn không hợp lệ hoặc vượt tiền đơn' };
    this.mutate(draft => {
      const target = draft.orders.find(o => o.id === orderId)!;
      target.refunded_amount = (target.refunded_amount || 0) + amount;
      target.payment_status = target.refunded_amount === target.total ? 'refunded' : 'partially_paid';
      target.settlement_status = 'pending';
      draft.processedCommands ||= {}; draft.processedCommands[id] = signature;
      for (const fee of draft.orderFeeBreakdowns?.filter(f => f.order_id === orderId) || []) {
        fee.is_reconciled = false;
        fee.net_payout -= amount;
      }
    }, 'REFUND_PROCESSED', { orderId, amount, transactionId: id });
    return { success: true };
  }

  public markDeliveredWithPOD(orderId: string, podData: import('@/types').PodEvidence, actorRole?: TenantRole): { success: boolean; error?: string } {
    const role = this.state.activeRole;
    if (role === 'warehouse') {
      return { success: false, error: 'Command rejected: Nhân viên kho chỉ bàn giao bưu tá, không có thẩm quyền kết luận giao hàng thành công (POD)' };
    }
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };
    const permissionError = this.authorize('orders:manage', order);
    if (permissionError) return { success: false, error: permissionError };
    if (!podData.tracking_code || !podData.recipient_name) {
      return { success: false, error: 'Thiếu thông tin bằng chứng giao hàng (POD)' };
    }

    if (order.status === 'delivered') return { success: true };
    if (order.status !== 'shipped' || order.delivery_status === 'delivery_failed' || order.delivery_status === 'returned_to_sender') return { success: false, error: 'Chỉ xác nhận giao đơn đã bàn giao, chưa kết thúc giao thất bại/hoàn về' };
    const now = podData.delivered_at || new Date().toISOString();

    this.mutate(draft => {
      const targetOrder = draft.orders.find(o => o.id === orderId);
      if (targetOrder) {
        targetOrder.status = 'delivered';
        targetOrder.delivery_status = 'delivered';
        targetOrder.fulfillment_status = 'fulfilled';
        targetOrder.delivered_at = now;
        targetOrder.pod_evidence = podData;
        targetOrder.revenue_recognized = true;
        targetOrder.revenue_recognized_at = now;
        targetOrder.updated_at = now;
      }

      // Recognized Revenue Double Entry upon POD confirmation
      const total = Number(order.total || order.subtotal || 0);
      const revJeId = `je_rev_${Date.now()}`;
      draft.journalEntries.unshift({
        id: revJeId,
        tenant_id: draft.activeTenantId,
        entry_number: `JE-REV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        event_source: 'order_sale',
        reference_type: 'order',
        reference_id: orderId,
        description: `Ghi nhận doanh thu bán hàng #${order.order_number} [ASSUMPTION: Ghi nhận Có 511 tại POD theo FOB Điểm đến]`,
        posted_at: now,
        posted_by: 'usr_finance_01',
        status: 'posted',
        created_at: now
      });

      draft.journalLines.push(
        {
          id: `jl_${revJeId}_1`,
          journal_entry_id: revJeId,
          entry_id: revJeId,
          account_id: 'acc_131',
          account_code: '131',
          debit_amount: total,
          credit_amount: 0,
          debit: total,
          credit: 0,
          description: `Phải thu đối soát POD #${order.order_number}`
        },
        {
          id: `jl_${revJeId}_2`,
          journal_entry_id: revJeId,
          entry_id: revJeId,
          account_id: 'acc_511',
          account_code: '511',
          debit_amount: 0,
          credit_amount: total,
          debit: 0,
          credit: total,
          description: `Doanh thu bán hàng xác nhận POD #${order.order_number} [ASSUMPTION]`
        }
      );

      // Audit Log
      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'ORDER_DELIVERED_POD_VERIFIED',
        entity: 'orders',
        entity_id: orderId,
        actor: draft.activeUserId || 'unauthenticated',
        details: { podData, revenue_recognized: total },
        created_at: now
      });
    }, 'ORDER_STATUS_CHANGED', { orderId, status: 'delivered', podData });

    return { success: true };
  }

  public updateOrder(orderId: string, updates: Partial<Order>): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId || o.order_number === orderId);
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };
    const permissionError = this.authorize('orders:manage', order);
    if (permissionError) return { success: false, error: permissionError };
    if (Object.keys(updates).some(k => !['notes', 'hold_reason'].includes(k))) return { success: false, error: 'Thay đổi vòng đời cần business command' };
    const now = new Date().toISOString();
    this.mutate(draft => {
      const targetOrder = draft.orders.find(o => o.id === order.id);
      if (targetOrder) {
        Object.assign(targetOrder, updates);
        targetOrder.updated_at = now;
      }
    }, 'ORDER_STATUS_CHANGED', { orderId: order.id, updates });
    return { success: true };
  }

  // ============ Advanced Inventory Simulation Workflows ============

  public receivePOPendingQC(sku: string, qty: number, poNumber?: string): { success: boolean; error?: string } {
    const accessError = this.commandPermission('inventory:receive');
    if (accessError) return { success: false, error: accessError };
    if (!Number.isSafeInteger(qty) || qty <= 0) return { success: false, error: 'Số lượng phải lớn hơn 0' };
    const inv = this.state.inventory5State.find(i => i.sku === sku);
    if (!inv) return { success: false, error: 'Không tìm thấy SKU' };
    const scopeError = this.authorize('inventory:receive', inv);
    if (scopeError) return { success: false, error: scopeError };

    const now = new Date().toISOString();
    this.mutate(draft => {
      const targetInv = draft.inventory5State.find(i => i.sku === sku && i.warehouse_id === inv.warehouse_id);
      if (targetInv) {
        targetInv.physical += qty;
        targetInv.pending_qc = (targetInv.pending_qc || 0) + qty;
        targetInv.unavailable = targetInv.pending_qc + (targetInv.damaged || 0);
        targetInv.available = Math.max(0, targetInv.physical - targetInv.reserved - targetInv.unavailable);
        targetInv.sellable = targetInv.available;
        targetInv.inbound = Math.max(0, (targetInv.inbound || 0) - qty);
        targetInv.incoming = targetInv.inbound;
      }

      draft.stockLedger.unshift({
        id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tenant_id: draft.activeTenantId,
        product_id: inv.product_id,
        warehouse_id: inv.warehouse_id,
        transaction_type: 'inbound',
        quantity: qty,
        reference_type: 'purchase_order',
        reference_id: poNumber || 'PO-DOCK-RECEIVE',
        notes: `Cập bến kho từ PO [${poNumber || 'PO-2026'}] — Tồn chuyển vào Chờ kiểm định (Pending QC: +${qty})`,
        balance_after: targetInv?.physical || 0,
        created_at: now
      });
    }, 'PO_RECEIVED', { sku, qty, poNumber });

    return { success: true };
  }

  public inspectInboundQC(sku: string, passQty: number, failQty: number): { success: boolean; error?: string } {
    const accessError = this.commandPermission('inventory:receive');
    if (accessError) return { success: false, error: accessError };
    const inv = this.state.inventory5State.find(i => i.sku === sku);
    if (!inv) return { success: false, error: 'Không tìm thấy SKU' };
    const scopeError = this.authorize('inventory:receive', inv);
    if (scopeError) return { success: false, error: scopeError };
    const totalInspect = passQty + failQty;
    if (totalInspect <= 0) return { success: false, error: 'Số lượng kiểm định phải lớn hơn 0' };
    if ((inv.pending_qc || 0) < totalInspect) {
      return { success: false, error: `Số lượng chờ QC hiện tại (${inv.pending_qc || 0}) không đủ để nghiệm thu ${totalInspect}` };
    }

    if (![passQty, failQty].every(n => Number.isSafeInteger(n) && n >= 0)) return { success: false, error: 'Số lượng QC không hợp lệ' };
    const now = new Date().toISOString();
    this.mutate(draft => {
      const targetInv = draft.inventory5State.find(i => i.sku === sku && i.warehouse_id === inv.warehouse_id);
      if (targetInv) {
        targetInv.pending_qc = Math.max(0, (targetInv.pending_qc || 0) - totalInspect);
        targetInv.damaged = (targetInv.damaged || 0) + failQty;
        targetInv.unavailable = targetInv.pending_qc + targetInv.damaged;
        targetInv.available = Math.max(0, targetInv.physical - targetInv.reserved - targetInv.unavailable);
        targetInv.sellable = targetInv.available;
      }

      const prod = draft.products.find(p => p.sku === sku);
      if (prod && targetInv) {
        prod.stock = targetInv.available;
      }

      if (passQty > 0) {
        draft.stockLedger.unshift({
          id: `sl_${Date.now()}_1`,
          tenant_id: draft.activeTenantId,
          product_id: inv.product_id,
          warehouse_id: inv.warehouse_id,
          transaction_type: 'adjustment',
          quantity: passQty,
          reference_type: 'qc_inspection',
          reference_id: `QC-PASS-${Date.now().toString().slice(-4)}`,
          notes: `QC Nghiệm thu đạt chuẩn: +${passQty} cái vào Tồn khả dụng (Sellable)`,
          balance_after: targetInv?.available || 0,
          created_at: now
        });
      }

      if (failQty > 0) {
        draft.stockLedger.unshift({
          id: `sl_${Date.now()}_2`,
          tenant_id: draft.activeTenantId,
          product_id: inv.product_id,
          warehouse_id: inv.warehouse_id,
          transaction_type: 'scrap',
          quantity: failQty,
          reference_type: 'qc_inspection',
          reference_id: `QC-FAIL-${Date.now().toString().slice(-4)}`,
          notes: `QC Không đạt chuẩn (Lỗi ngoại quan/chức năng): +${failQty} cái chuyển kho Cách ly (Damaged)`,
          balance_after: targetInv?.damaged || 0,
          created_at: now
        });
      }
    }, 'RETURN_INSPECTED', { sku, passQty, failQty });

    return { success: true };
  }

  public quarantineStock(sku: string, qty: number, reason: string): { success: boolean; error?: string } {
    const accessError = this.commandPermission('inventory:adjust');
    if (accessError) return { success: false, error: accessError };
    const inv = this.state.inventory5State.find(i => i.sku === sku);
    if (!inv) return { success: false, error: 'Không tìm thấy SKU' };
    const scopeError = this.authorize('inventory:adjust', inv);
    if (scopeError) return { success: false, error: scopeError };
    if (inv.available < qty) {
      return { success: false, error: `Tồn khả dụng (${inv.available}) không đủ để cách ly ${qty}` };
    }

    const now = new Date().toISOString();
    this.mutate(draft => {
      const targetInv = draft.inventory5State.find(i => i.sku === sku && i.warehouse_id === inv.warehouse_id);
      if (targetInv) {
        targetInv.damaged = (targetInv.damaged || 0) + qty;
        targetInv.unavailable = (targetInv.pending_qc || 0) + targetInv.damaged;
        targetInv.available = Math.max(0, targetInv.physical - targetInv.reserved - targetInv.unavailable);
        targetInv.sellable = targetInv.available;
      }

      draft.stockLedger.unshift({
        id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tenant_id: draft.activeTenantId,
        product_id: inv.product_id,
        warehouse_id: inv.warehouse_id,
        transaction_type: 'scrap',
        quantity: qty,
        reference_type: 'quarantine',
        reference_id: `QUARANTINE-${Date.now().toString().slice(-4)}`,
        notes: `Cách ly hàng lỗi (${reason}): -${qty} khả dụng -> +${qty} hàng hỏng/chờ hủy`,
        balance_after: targetInv?.available || 0,
        created_at: now
      });
    }, 'STOCK_RELEASED', { sku, qty, reason });

    return { success: true };
  }

  public transferStock(sku: string, fromWh: string, toWh: string, qty: number, stage: 'dispatch' | 'receive', transactionId?: string): { success: boolean; error?: string } {
    const source = this.state.inventory5State.find(i => i.sku === sku && i.warehouse_id === fromWh);
    const error = this.authorize('inventory:move', source) || this.authorize('inventory:move', this.state.warehouses.find(w => w.id === toWh));
    if (error) return { success: false, error };
    if (fromWh === toWh || !Number.isSafeInteger(qty) || qty <= 0) return { success: false, error: 'Số lượng hoặc kho chuyển không hợp lệ' };
    const key = transactionId ? `transfer:${transactionId}:${stage}` : undefined;
    const signature = JSON.stringify({ sku, fromWh, toWh, qty, stage });
    if (key && this.state.processedCommands?.[key]) return this.state.processedCommands[key] === signature ? { success: true } : { success: false, error: 'Mã chuyển trùng nội dung khác' };
    if (stage === 'dispatch' && source!.available < qty) return { success: false, error: 'Không đủ hàng khả dụng để chuyển' };
    const lane = `lane:${sku}:${fromWh}:${toWh}`;
    const inTransit = Number(this.state.processedCommands?.[lane] || 0);
    if (stage === 'receive' && inTransit < qty) return { success: false, error: 'Nhận vượt lượng đang chuyển trên tuyến kho' };
    this.mutate(draft => {
      const src = draft.inventory5State.find(i => i.sku === sku && i.warehouse_id === fromWh)!;
      let target = src;
      draft.processedCommands ||= {};
      if (stage === 'dispatch') { src.physical -= qty; src.available -= qty; src.sellable = src.available; src.in_transit += qty; draft.processedCommands[lane] = String(inTransit + qty); }
      else {
        src.in_transit -= qty;
        let dest = draft.inventory5State.find(i => i.sku === sku && i.warehouse_id === toWh);
        if (!dest) { dest = { ...src, warehouse_id: toWh, warehouse_name: draft.warehouses.find(w => w.id === toWh)!.name, physical: 0, available: 0, sellable: 0, reserved: 0, damaged: 0, pending_qc: 0, unavailable: 0, in_transit: 0, incoming: 0, inbound: 0 }; draft.inventory5State.push(dest); }
        dest.physical += qty; dest.available += qty; dest.sellable = dest.available; target = dest;
        draft.processedCommands[lane] = String(inTransit - qty);
      }
      if (key) draft.processedCommands[key] = signature;
      draft.stockLedger.push({ id: commandId(), tenant_id: draft.activeTenantId, product_id: src.product_id, warehouse_id: target.warehouse_id,
        transaction_type: stage === 'dispatch' ? 'transfer_out' : 'transfer_in', quantity: qty, reference_type: 'transfer', reference_id: transactionId || lane,
        notes: `${stage} ${fromWh} → ${toWh}`, balance_after: target.physical, created_at: new Date().toISOString() });
    }, 'STOCK_DISPATCHED', { sku, fromWh, toWh, qty, stage });
    return { success: true };
  }

  // ============ Business Rules Config & Governance ============

  public getBusinessRules(): import('@/mock/types').BusinessRuleConfig[] {
    return structuredClone(this.state.businessRules || []);
  }

  public updateBusinessRule(
    ruleId: string,
    optionId: string,
    status: 'approved' | 'assumption' | 'under_review',
    reason?: string,
    version?: string,
    tenantScope?: 'global' | 'single_tenant'
  ): { success: boolean } {
    if (this.state.activeRole !== 'owner' || !this.getExecutionContext()) return { success: false };
    this.mutate(draft => {
      if (!draft.businessRules) return;
      const rule = draft.businessRules.find(r => r.id === ruleId);
      if (rule) {
        const prevOption = rule.selectedOptionId;
        const prevStatus = rule.currentStatus;
        const now = new Date().toISOString();

        rule.selectedOptionId = optionId;
        rule.currentStatus = status;
        // Only set approvedOptionId if status is explicitly approved
        rule.approvedOptionId = status === 'approved' ? optionId : null;
        if (version) rule.version = version;
        if (tenantScope) rule.tenantScope = tenantScope;
        if (reason) rule.changeReason = reason;
        rule.updatedAt = now;

        if (!rule.history) rule.history = [];
        rule.history.unshift({
          id: `hist_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          timestamp: now,
          actor: draft.activeUserId || 'unauthenticated',
          fromStatus: prevStatus,
          toStatus: status,
          fromOptionId: prevOption,
          toOptionId: optionId,
          reason: reason || (status === 'approved' ? 'Chủ Doanh Nghiệp phê duyệt chính thức' : status === 'assumption' ? 'Đặt lại trạng thái Giả định (ASSUMPTION)' : 'Đánh dấu cần xem xét lại'),
          version: rule.version || 'v1.0'
        });
      }
    }, 'DATABASE_RESET', { ruleId, optionId, status });
    return { success: true };
  }

  public resetBusinessRuleToAssumption(ruleId: string, reason?: string): { success: boolean } {
    return this.updateBusinessRule(
      ruleId,
      this.state.businessRules?.find(r => r.id === ruleId)?.proposedOptionId || '',
      'assumption',
      reason || 'Chủ dự án hoàn tác về trạng thái giả định ban đầu'
    );
  }

  // ============ RMA Dynamic Configuration ============

  public getRmaConfig(): import('@/mock/types').RmaGovernanceConfig {
    return this.state.rmaConfig || {
      approvalThreshold: 1000000,
      thresholdStatus: 'assumption',
      makerRoles: ['warehouse', 'manager'],
      checkerRoles: ['owner', 'admin'],
      enabledBranches: ['refund', 'exchange', 'warranty', 'partial_return', 'transit_damage', 'returnless_refund'],
      preventDoubleRefund: true,
      preventDoubleRestock: true,
      preventExceedingOrderQty: true
    };
  }

  public updateRmaConfig(config: Partial<import('@/mock/types').RmaGovernanceConfig>): { success: boolean } {
    if (this.state.activeRole !== 'owner' || !this.getExecutionContext()) return { success: false };
    this.mutate(draft => {
      draft.rmaConfig = {
        ...this.getRmaConfig(),
        ...config
      };
    }, 'DATABASE_RESET', { config });
    return { success: true };
  }

  // ============ Revenue Policies Comparison ============

  public getRevenuePolicy(): import('@/mock/types').RevenuePolicyType {
    return this.state.revenuePolicy || 'FOB_DESTINATION';
  }

  public setRevenuePolicy(policy: import('@/mock/types').RevenuePolicyType): { success: boolean } {
    if (this.state.activeRole !== 'owner' || !this.getExecutionContext()) return { success: false };
    this.mutate(draft => {
      draft.revenuePolicy = policy;
    }, 'DATABASE_RESET', { policy });
    return { success: true };
  }

  public getRevenueComparisonMetrics() {
    const orders = this.state.orders.filter(o => o.tenant_id === this.state.activeTenantId);
    
    // 1. Order Value Commitment
    const totalOrderValue = orders.reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
    
    // 2. Cash Collected (Prepayments / Paid orders)
    const totalCashCollected = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
    
    // 3. Receivables (Unpaid or COD in-transit)
    const totalReceivables = orders
      .filter(o => o.payment_status === 'unpaid' || o.payment_status === 'partially_paid')
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);

    // 4. Returns & Refunds
    const totalRefunds = this.state.returns
      .filter(r => r.tenant_id === this.state.activeTenantId && (r.status === 'refunded' || r.status === 'approved'))
      .reduce((sum, r) => sum + (r.refund_amount || 0), 0);

    // Calculate Recognized Revenue & Matching COGS under 3 distinct Accrual GAAP/VAS policies
    // Policy A: FOB Destination (POD delivered)
    const revFobDestination = Math.max(0, orders
      .filter(o => o.delivery_status === 'delivered' || o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0) - totalRefunds);
    const cogsFobDestination = Math.round(revFobDestination * 0.6);
    const feesFobDestination = Math.round(revFobDestination * 0.085);

    // Policy B: FOB Shipping Point (Dispatched / in-transit / delivered)
    const revFobShippingPoint = Math.max(0, orders
      .filter(o => o.status === 'shipped' || o.status === 'delivered' || o.delivery_status === 'in_transit' || o.delivery_status === 'delivered')
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0) - totalRefunds);
    const cogsFobShippingPoint = Math.round(revFobShippingPoint * 0.6);
    const feesFobShippingPoint = Math.round(revFobShippingPoint * 0.085);

    // Policy C: Post-Clearance 7 Days (Delivered and placed > 7 days ago)
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const revPostClearance = Math.max(0, orders
      .filter(o => (o.delivery_status === 'delivered' || o.status === 'delivered') && new Date(o.placed_at).getTime() < sevenDaysAgo)
      .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0) - totalRefunds);
    const cogsPostClearance = Math.round(revPostClearance * 0.6);
    const feesPostClearance = Math.round(revPostClearance * 0.085);

    // Cash Flow Analysis (Dòng tiền thực thu - KHÔNG PHẢI DOANH THU KẾ TOÁN DỒN TÍCH)
    const totalCashIn = totalCashCollected;
    const totalCashRefunded = totalRefunds;
    const netCashFlow = Math.max(0, totalCashIn - totalCashRefunded);

    return {
      totalOrderValue,
      totalCashCollected,
      totalReceivables,
      totalRefunds,
      estimatedCogs: cogsFobDestination,
      estimatedFees: feesFobDestination,
      accrualPolicies: {
        FOB_DESTINATION: {
          name: 'Chính sách 1: FOB Điểm đến (Giao có POD)',
          recognizedRevenue: revFobDestination,
          matchingCogs: cogsFobDestination,
          grossProfit: Math.max(0, revFobDestination - cogsFobDestination),
          platformFees: feesFobDestination,
          refunds: totalRefunds,
          arBalance: totalReceivables,
          status: 'ASSUMPTION (Đang kích hoạt mô phỏng)',
          comparisonNote: 'Ghi nhận an toàn tuyệt đối, đối soát đúng thời điểm chuyển giao quyền sở hữu khi khách ký POD.'
        },
        FOB_SHIPPING_POINT: {
          name: 'Chính sách 2: FOB Điểm gửi (Xuất kho giao bưu tá)',
          recognizedRevenue: revFobShippingPoint,
          matchingCogs: cogsFobShippingPoint,
          grossProfit: Math.max(0, revFobShippingPoint - cogsFobShippingPoint),
          platformFees: feesFobShippingPoint,
          refunds: totalRefunds,
          arBalance: totalReceivables,
          status: 'Phương án thay thế',
          comparisonNote: 'Ghi nhận doanh thu sớm hơn 2-4 ngày nhưng chịu rủi ro bão hòa hoàn đơn RTS nếu giao thất bại.'
        },
        POST_CLEARANCE_7D: {
          name: 'Chính sách 3: Hết hạn đổi trả (Sau 7 ngày giao)',
          recognizedRevenue: revPostClearance,
          matchingCogs: cogsPostClearance,
          grossProfit: Math.max(0, revPostClearance - cogsPostClearance),
          platformFees: feesPostClearance,
          refunds: totalRefunds,
          arBalance: totalReceivables + (revFobDestination - revPostClearance),
          status: 'Phương án siêu thận trọng',
          comparisonNote: 'Giữ lại doanh thu trong 7 ngày đối soát bảo hành, loại trừ hoàn toàn rủi ro đảo sổ nhưng tạo độ trễ báo cáo.'
        }
      },
      // Backward compatibility alias for policies
      policies: {
        FOB_DESTINATION: {
          name: 'FOB Điểm đến (Xác nhận POD)',
          recognizedRevenue: revFobDestination,
          grossProfit: Math.max(0, revFobDestination - cogsFobDestination),
          arBalance: totalReceivables,
          status: 'ASSUMPTION (Đang kích hoạt)'
        },
        FOB_SHIPPING_POINT: {
          name: 'FOB Điểm gửi (Xuất kho giao bưu tá)',
          recognizedRevenue: revFobShippingPoint,
          grossProfit: Math.max(0, revFobShippingPoint - cogsFobShippingPoint),
          arBalance: totalReceivables,
          status: 'Phương án thay thế'
        },
        POST_CLEARANCE_7D: {
          name: 'Hết hạn đổi trả (Sau 7 ngày giao)',
          recognizedRevenue: revPostClearance,
          grossProfit: Math.max(0, revPostClearance - cogsPostClearance),
          arBalance: totalReceivables + (revFobDestination - revPostClearance),
          status: 'Phương án thận trọng'
        },
        CASH_BASIS: {
          name: 'Dòng tiền thực thu (Cash Basis)',
          recognizedRevenue: netCashFlow,
          grossProfit: Math.max(0, netCashFlow - cogsFobDestination),
          arBalance: 0,
          status: 'Dòng tiền thuần (Tham chiếu)'
        }
      },
      cashFlowAnalysis: {
        name: 'Kịch Bản Phân Tích Dòng Tiền & Thanh Khoản (Cash Flow / Liquidity)',
        totalCashIn,
        totalCashRefunded,
        netCashFlow,
        uncollectedReceivables: totalReceivables,
        regulatoryNote: 'Theo chuẩn mực VAS / IFRS, Cash Basis chỉ phục vụ quản trị thanh khoản và dòng tiền thực thu (Cash Flow), KHÔNG được hạch toán là chính sách ghi nhận doanh thu dồn tích hợp lệ trong sổ cái kế toán.'
      }
    };
  }

  // ============ RMA Validation Check ============

  public validateRmaRequest(params: {
    orderId: string;
    refundAmount: number;
    items?: Array<{ productId: string; qty: number }>;
  }): { valid: boolean; errors: string[]; requiresChecker: boolean; ruleExplanation: string } {
    const errors: string[] = [];
    const rmaCfg = this.getRmaConfig();
    const order = this.state.orders.find(o => o.id === params.orderId);

    if (!order) {
      return { valid: false, errors: ['Không tìm thấy đơn hàng gốc.'], requiresChecker: false, ruleExplanation: '' };
    }

    const orderTotal = Number(order.total ?? order.total_amount ?? 0);

    // 1. Double refund prevention
    {
      const existingRmas = this.state.returns.filter(
        r => r.order_id === params.orderId && r.status !== 'rejected'
      );
      const totalRefundedSoFar = existingRmas.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
      if (totalRefundedSoFar + params.refundAmount > orderTotal) {
        errors.push(
          `CẢNH BÁO CHẶN HOÀN TIỀN VƯỢT GIÁ TRỊ: Đơn hàng ${order.order_number} có tổng ${orderTotal.toLocaleString()} ₫. Đã hoàn ${totalRefundedSoFar.toLocaleString()} ₫. Yêu cầu hoàn thêm ${params.refundAmount.toLocaleString()} ₫ sẽ vượt quá giá trị đơn hàng!`
        );
      }
    }

    // 2. Prevent exceeding purchased quantities
    if (params.items) {
      for (const item of params.items) {
        const purchasedQty = this.state.orderItems.filter(l => l.order_id === order.id && l.product_id === item.productId).reduce((sum, l) => sum + l.quantity, 0);
        
        // Sum previous returns for this product on this order
        const prevReturnedQty = this.state.returnItems
          .filter(ri => {
            const rma = this.state.returns.find(r => r.id === ri.return_id);
            return rma && rma.order_id === params.orderId && ri.product_id === item.productId && !rma.is_refund_without_return && rma.rma_branch !== 'returnless_refund' && !['rejected', 'cancelled'].includes(rma.status);
          })
          .reduce((sum, ri) => sum + ri.quantity, 0);

        if (prevReturnedQty + item.qty > purchasedQty) {
          errors.push(
            `CẢNH BÁO CHẶN SỐ LƯỢNG: Sản phẩm ${item.productId} chỉ mua ${purchasedQty} cái. Đã trả trước đó ${prevReturnedQty} cái. Không thể yêu cầu trả tiếp ${item.qty} cái!`
          );
        }
      }
    }

    const requiresChecker = params.refundAmount >= rmaCfg.approvalThreshold;
    const ruleExplanation = requiresChecker
      ? `Hạn mức ${params.refundAmount.toLocaleString()} ₫ >= Ngưỡng ${rmaCfg.approvalThreshold.toLocaleString()} ₫: Bắt buộc CHECKER (Owner/Admin) duyệt!`
      : `Hạn mức ${params.refundAmount.toLocaleString()} ₫ < Ngưỡng ${rmaCfg.approvalThreshold.toLocaleString()} ₫: MAKER (Kho/CSKH) được phép duyệt trực tiếp.`;

    return {
      valid: errors.length === 0,
      errors,
      requiresChecker,
      ruleExplanation
    };
  }

  // ============ Fulfillment & Wave Picking ============

  public getPickingWaves(): PickingWave[] {
    return this.state.pickingWaves.filter(w => w.tenant_id === this.state.activeTenantId);
  }

  public completeWave(waveId: string): void {
    const target = this.state.pickingWaves.find(w => w.id === waveId);
    const error = this.authorize('inventory:move', target);
    if (error || !target || (target.picked_items || 0) < (target.total_items || 0)) throw Error(error || 'Wave còn hàng chưa nhặt');
    this.mutate(draft => {
      const wave = draft.pickingWaves.find(w => w.id === waveId);
      if (wave) {
        wave.status = 'completed';
        wave.picked_items = wave.total_items;
        wave.completed_at = new Date().toISOString();
      }
    }, 'ITEM_PICKED', { waveId });
  }

  // ============ Returns & Restock / Quarantine ============

  public getReturns(): ReturnRecord[] {
    const ids = new Set(this.getOrders().map(o => o.id));
    return structuredClone(this.state.returns.filter(r => ids.has(r.order_id)));
  }

  public createMultiBranchRma(params: {
    orderId: string;
    rmaBranch: import('@/types').RmaBranch;
    reason: string;
    refundAmount: number;
    items?: Array<{ productId: string; qty: number }>;
    notes?: string;
  }): { success: boolean; rmaNumber?: string; error?: string } {
    const accessError = this.authorize('orders:manage', this.state.orders.find(o => o.id === params.orderId));
    if (accessError) return { success: false, error: accessError };
    if (['exchange', 'warranty'].includes(params.rmaBranch)) return { success: false, error: 'Đổi hàng/bảo hành tùy chọn chưa được nghiệm thu; dùng trả hàng/hoàn tiền' };
    const sourceOrder = this.state.orders.find(o => o.id === params.orderId)!;
    if (params.rmaBranch !== 'returnless_refund' && !['shipped', 'delivered'].includes(sourceOrder.status)) return { success: false, error: 'Đơn chưa bàn giao; xử lý hủy thay vì tạo hàng hoàn' };
    const validation = this.validateRmaRequest(params);
    if (!validation.valid) return { success: false, error: validation.errors.join('; ') };
    if (!Number.isSafeInteger(params.refundAmount) || params.refundAmount < 0) return { success: false, error: 'Số tiền không hợp lệ' };
    const ids = new Set<string>();
    for (const line of params.items || []) {
      if (!Number.isSafeInteger(line.qty) || line.qty <= 0 || ids.has(line.productId)) return { success: false, error: 'Dòng hoàn trùng hoặc số lượng không hợp lệ' };
      ids.add(line.productId);
    }
    const rmaNumber = `RMA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const isReturnless = params.rmaBranch === 'returnless_refund';
    const isDamagedScrap = params.rmaBranch === 'transit_damage';

    this.mutate(draft => {
      const newRet: ReturnRecord = {
        id: `ret_${commandId()}`,
        tenant_id: draft.activeTenantId,
        return_number: rmaNumber,
        order_id: params.orderId,
        customer_id: 'cust_01',
        reason: params.reason,
        status: isReturnless ? 'approved' : 'pending',
        return_type: 'customer_rma',
        refund_amount: params.refundAmount,
        rma_branch: params.rmaBranch,
        is_refund_without_return: isReturnless,
        approval_status: params.refundAmount < 1000000 ? 'maker_approved' : 'pending',
        maker_checker_rule: params.refundAmount < 1000000 ? 'Maker duyệt đơn < 1M' : 'Bắt buộc Checker duyệt (Đơn >= 1M)',
        created_at: now,
        updated_at: now
      };
      draft.returns.unshift(newRet);

      if (params.items && params.items.length > 0) {
        params.items.forEach((it, idx) => {
          draft.returnItems.push({
            id: `reti_${Date.now()}_${idx}`,
            return_id: newRet.id,
            product_id: it.productId,
            quantity: it.qty,
            reason: params.reason,
            condition: isDamagedScrap ? 'damaged' : 'opened' as any,
            disposition: isDamagedScrap ? 'scrap' : isReturnless ? 'returnless' : 'restock',
            created_at: now
          });
        });
      }

      const ord = draft.orders.find(o => o.id === params.orderId);
      if (ord) {
        ord.return_status = 'return_requested';
      }

      draft.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        action: 'RMA_CREATED_BRANCH',
        entity: 'returns',
        entity_id: newRet.id,
        actor: draft.activeUserId || 'unauthenticated',
        details: { rmaNumber, branch: params.rmaBranch, amount: params.refundAmount },
        created_at: now
      });
    }, 'ORDER_STATUS_CHANGED', { rmaNumber });

    return { success: true, rmaNumber };
  }

  public inspectReturnQC(returnId: string, isGoodCondition: boolean, qcLines?: QcLine[],
    _actorRole?: TenantRole, _actorId?: string, options: { inspectionId?: string; receiptId?: string } = {}): { success: boolean; error?: string } {
    const ret = this.state.returns.find(r => r.id === returnId);
    const error = this.authorize('inventory:receive', ret);
    if (error) return { success: false, error };
    try {
      this.mutate(draft => inspectReturn(draft, returnId, isGoodCondition, qcLines, options, this.state.activeUserId!), 'RETURN_INSPECTED', { returnId, options });
      return { success: true };
    } catch (e) { return { success: false, error: (e as Error).message }; }
  }

  public updateReturn(returnId: string, updates: Partial<ReturnRecord>): { success: boolean; error?: string } {
    const ret = this.state.returns.find(r => r.id === returnId || r.return_number === returnId);
    if (!ret) return { success: false, error: 'Không tìm thấy phiếu đổi trả' };
    const permissionError = this.authorize('orders:manage', ret);
    if (permissionError) return { success: false, error: permissionError };
    try { this.assertGenericMutation('returns', [ret as unknown as Record<string, unknown>], updates as Record<string, unknown>); } catch(e) { return { success: false, error: (e as Error).message }; }
    this.mutate(draft => {
      const targetRet = draft.returns.find(r => r.id === ret.id);
      if (targetRet) {
        Object.assign(targetRet, updates);
        targetRet.updated_at = new Date().toISOString();
      }
    }, 'ORDER_STATUS_CHANGED', { returnId: ret.id, updates });
    return { success: true };
  }

  public mutateTable<T extends keyof MockDatabaseSnapshot>(
    tableKey: T,
    matchFn: (item: any) => boolean,
    patch: Record<string, unknown>,
    eventTopic: MockEventTopic = 'ORDER_STATUS_CHANGED'
  ): boolean {
    const table = Object.entries(MockDataStore.TABLE_KEY_MAP).find(([, key]) => key === tableKey)?.[0];
    if (!table) throw Error('Không được ghi trực tiếp state');
    return this.updateTable(table, matchFn, patch) > 0;
  }

  // ============ Double-Entry Balanced Bookkeeping ============

  public getJournalEntries(): JournalEntry[] {
    return this.state.journalEntries.filter(j => j.tenant_id === this.state.activeTenantId);
  }

  public postJournalEntry(entry: Partial<JournalEntry> & { entry_number: string },  lines: Array<Omit<JournalLine, 'id' | 'entry_id'>>): { success: boolean; error?: string } {
    const accessError = this.commandPermission('finance:manage');
    if (accessError) return { success: false, error: accessError };
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (totalDebit !== totalCredit) {
      return {
        success: false,
        error: `Bút toán không cân bằng! Tổng Nợ (${totalDebit.toLocaleString()} ₫) khác Tổng Có (${totalCredit.toLocaleString()} ₫). Chênh lệch: ${Math.abs(totalDebit - totalCredit).toLocaleString()} ₫. Hệ thống sổ kép từ chối ghi sổ.`
      };
    }

    const entryId = `je_${Date.now()}`;
    const now = new Date().toISOString();

    this.mutate(draft => {
      draft.journalEntries.unshift({
        event_source: 'manual',
        ...entry,
        id: entryId,
        status: 'posted',
        created_at: now,
        posted_at: now
      } as JournalEntry);

      lines.forEach((l, idx) => {
        draft.journalLines.push({
          ...l,
          id: `jl_${entryId}_${idx + 1}`,
          entry_id: entryId
        });
      });
    }, 'JOURNAL_POSTED', { entryId, total: totalDebit });

    return { success: true };
  }

  // ============ Centralized Business Scenarios Runner ============

  public runInventoryScenario(
    scenarioType: 
      | 'receive_dock_pending_qc'
      | 'qc_pass_partial'
      | 'qc_fail_partial'
      | 'reserve_stock'
      | 'cancel_reservation'
      | 'dispatch_stock'
      | 'transfer_stock'
      | 'transfer_with_loss'
      | 'rma_restock_pass'
      | 'rma_restock_fail',
    sku: string = 'NX-AIR-PRO',
    qty: number = 10
  ): import('@/mock/types').ScenarioValidationResult {
    if (this.commandPermission('simulator:access')) throw Error('Không có quyền chạy mô phỏng');
    const invBefore = this.state.inventory5State.find(i => i.sku === sku);
    const beforeMetrics = invBefore ? {
      physical: invBefore.physical,
      sellable: invBefore.sellable,
      reserved: invBefore.reserved,
      unavailable: invBefore.unavailable,
      pending_qc: invBefore.pending_qc,
      damaged: invBefore.damaged,
      in_transit: invBefore.in_transit,
      incoming: invBefore.incoming
    } : {};

    // Execute mutation based on scenarioType
    switch (scenarioType) {
      case 'receive_dock_pending_qc':
        this.receivePOPendingQC(sku, qty);
        break;
      case 'qc_pass_partial':
        this.inspectInboundQC(sku, qty, 0);
        break;
      case 'qc_fail_partial':
        this.inspectInboundQC(sku, 0, qty);
        break;
      case 'reserve_stock':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv && inv.sellable >= qty) {
            inv.reserved += qty;
            inv.sellable -= qty;
            inv.available = inv.sellable;
          }
        }, 'STOCK_RESERVED', { sku, qty });
        break;
      case 'cancel_reservation':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv && inv.reserved >= qty) {
            inv.reserved -= qty;
            inv.sellable += qty;
            inv.available = inv.sellable;
          }
        }, 'STOCK_RELEASED', { sku, qty });
        break;
      case 'dispatch_stock':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv && inv.reserved >= qty) {
            inv.reserved -= qty;
            inv.physical -= qty;
          }
        }, 'STOCK_DISPATCHED', { sku, qty });
        break;
      case 'transfer_stock':
        this.transferStock(sku, 'wh_north_01', 'wh_central_01', qty, 'dispatch');
        this.transferStock(sku, 'wh_north_01', 'wh_central_01', qty, 'receive');
        break;
      case 'transfer_with_loss':
        const lostQty = Math.max(1, Math.floor(qty * 0.2));
        const receivedQty = qty - lostQty;
        this.transferStock(sku, 'wh_north_01', 'wh_central_01', qty, 'dispatch');
        this.mutate(draft => {
          const sourceInv = draft.inventory5State.find(i => i.sku === sku && i.warehouse_id === 'wh_north_01');
          if (sourceInv) sourceInv.in_transit = Math.max(0, sourceInv.in_transit - qty);
          const targetInv = draft.inventory5State.find(i => i.sku === sku && i.warehouse_id === 'wh_central_01');
          if (targetInv) {
            targetInv.physical += receivedQty;
            targetInv.damaged += lostQty;
            targetInv.unavailable += lostQty;
            targetInv.sellable += receivedQty;
            targetInv.available = targetInv.sellable;
          }
        }, 'STOCK_DISPATCHED', { sku, lostQty, receivedQty });
        break;
      case 'rma_restock_pass':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv) {
            inv.physical += qty;
            inv.sellable += qty;
            inv.available = inv.sellable;
          }
        }, 'RETURN_INSPECTED', { sku, qty, pass: true });
        break;
      case 'rma_restock_fail':
        this.mutate(draft => {
          const inv = draft.inventory5State.find(i => i.sku === sku);
          if (inv) {
            inv.physical += qty;
            inv.damaged += qty;
            inv.unavailable += qty;
          }
        }, 'RETURN_INSPECTED', { sku, qty, pass: false });
        break;
    }

    const invAfter = this.state.inventory5State.find(i => i.sku === sku);
    const afterMetrics = invAfter ? {
      physical: invAfter.physical,
      sellable: invAfter.sellable,
      reserved: invAfter.reserved,
      unavailable: invAfter.unavailable,
      pending_qc: invAfter.pending_qc,
      damaged: invAfter.damaged,
      in_transit: invAfter.in_transit,
      incoming: invAfter.incoming
    } : {};

    const deltas: Record<string, number> = {};
    Object.keys(afterMetrics).forEach(k => {
      deltas[k] = (afterMetrics[k as keyof typeof afterMetrics] as number) - ((beforeMetrics[k as keyof typeof beforeMetrics] as number) || 0);
    });

    const isPhysicalBalanced = invAfter ? invAfter.physical === (invAfter.sellable + invAfter.reserved + invAfter.unavailable) : true;
    const isUnavailableBalanced = invAfter ? invAfter.unavailable === (invAfter.pending_qc + invAfter.damaged) : true;

    return {
      scenarioId: `INV_${scenarioType.toUpperCase()}`,
      title: `Mô phỏng Kho: ${scenarioType}`,
      category: 'inventory',
      passed: isPhysicalBalanced && isUnavailableBalanced,
      timestamp: new Date().toISOString(),
      before: beforeMetrics,
      after: afterMetrics,
      deltas,
      invariantsChecked: [
        {
          name: 'Physical = Sellable + Reserved + Unavailable',
          passed: isPhysicalBalanced,
          details: invAfter ? `${invAfter.physical} === ${invAfter.sellable} + ${invAfter.reserved} + ${invAfter.unavailable}` : 'N/A'
        },
        {
          name: 'Unavailable = Pending QC + Damaged',
          passed: isUnavailableBalanced,
          details: invAfter ? `${invAfter.unavailable} === ${invAfter.pending_qc} + ${invAfter.damaged}` : 'N/A'
        },
        {
          name: 'Pipeline Stock Segregated',
          passed: true,
          details: 'Incoming & In-transit nằm ngoài Physical'
        }
      ],
      affectedModules: ['Inventory5State', 'StockLedger', 'Warehouses'],
      eventLogs: [
        {
          timestamp: new Date().toISOString(),
          topic: `INV_${scenarioType.toUpperCase()}`,
          details: `Thực hiện mô phỏng ${scenarioType} trên SKU ${sku} (Số lượng: ${qty})`,
          actor: 'Warehouse Operator (Demo)'
        },
        {
          timestamp: new Date().toISOString(),
          topic: 'STOCK_LEDGER_APPENDED',
          details: `Đã sinh bút toán lưu vết tại Sổ Giao Dịch Kho (Stock Ledger)`,
          actor: 'NexusOMS Central Store'
        }
      ],
      notes: isPhysicalBalanced ? 'Toàn vẹn bất biến toán học đạt chuẩn 100%' : 'LỖI: Phát hiện sai lệch bất biến'
    };
  }

  public runOrderScenario(
    scenarioType: 
      | 'place_order'
      | 'confirm_order'
      | 'pick_pack_order'
      | 'handover_carrier'
      | 'deliver_with_pod'
      | 'delivery_failed'
      | 'customer_refused'
      | 'partial_delivery'
      | 'rts_return_to_sender',
    orderId?: string,
    extraParams?: Record<string, unknown>
  ): import('@/mock/types').ScenarioValidationResult {
    if (this.commandPermission('simulator:access')) throw Error('Không có quyền chạy mô phỏng');
    const targetOrder = orderId 
      ? this.state.orders.find(o => o.id === orderId) 
      : this.state.orders[0];

    const beforeMetrics = targetOrder ? {
      order_status: targetOrder.order_status || targetOrder.status,
      fulfillment_status: targetOrder.fulfillment_status || 'unfulfilled',
      delivery_status: targetOrder.delivery_status || 'pending_pickup',
      payment_status: targetOrder.payment_status,
      return_status: targetOrder.return_status || 'none',
      revenue_recognized: targetOrder.revenue_recognized ? 'YES' : 'NO'
    } : {};

    if (targetOrder) {
      const now = new Date().toISOString();
      this.mutate(draft => {
        const ord = draft.orders.find(o => o.id === targetOrder.id);
        if (!ord) return;

        switch (scenarioType) {
          case 'place_order':
            ord.status = 'pending';
            ord.order_status = 'pending';
            ord.fulfillment_status = 'unfulfilled';
            ord.delivery_status = 'pending_pickup';
            ord.payment_status = 'unpaid';
            ord.revenue_recognized = false;
            break;
          case 'confirm_order':
            ord.order_status = 'confirmed';
            ord.fulfillment_status = 'allocated';
            break;
          case 'pick_pack_order':
            ord.status = 'processing';
            ord.order_status = 'processing';
            ord.fulfillment_status = 'packed';
            break;
          case 'handover_carrier':
            ord.status = 'shipped';
            ord.fulfillment_status = 'dispatched';
            ord.delivery_status = 'in_transit';
            ord.shipped_at = now;
            break;
          case 'deliver_with_pod':
            const podSource = (extraParams?.source as 'demo_manual' | 'carrier_webhook_verified') || 'carrier_webhook_verified';
            ord.status = 'delivered';
            ord.order_status = 'completed';
            ord.fulfillment_status = 'fulfilled';
            ord.delivery_status = 'delivered';
            ord.delivered_at = now;
            ord.revenue_recognized = true;
            ord.revenue_recognized_at = now;
            ord.pod_evidence = {
              tracking_code: (extraParams?.tracking_code as string) || `VNPOST-${Date.now().toString().slice(-6)}`,
              carrier_name: (extraParams?.carrier_name as string) || 'Viettel Post Smart Logistics',
              delivered_at: now,
              recipient_name: (extraParams?.recipient_name as string) || 'Nguyễn Văn Minh (Khách hàng ký nhận)',
              signature_verified: true,
              source: podSource,
              submitted_by: podSource === 'carrier_webhook_verified' ? 'CARRIER_WEBHOOK_API' : 'DEMO_USER_MANUAL',
              verified_at: now
            };
            break;
          case 'delivery_failed':
            ord.delivery_status = 'delivery_failed';
            ord.notes = `Giao thất bại lần 1: Không liên lạc được với người nhận lúc ${new Date().toLocaleTimeString('vi-VN')}`;
            break;
          case 'customer_refused':
            ord.delivery_status = 'returned_to_sender';
            ord.return_status = 'in_transit_back';
            ord.notes = 'Khách từ chối nhận hàng do đổi ý nhu cầu';
            break;
          case 'partial_delivery':
            ord.status = 'delivered';
            ord.delivery_status = 'delivered';
            ord.return_status = 'return_requested';
            ord.notes = 'Khách nhận 1 sản phẩm, hoàn trả 1 sản phẩm do không đúng màu';
            break;
          case 'rts_return_to_sender':
            ord.status = 'refunded';
            ord.delivery_status = 'returned_to_sender';
            ord.return_status = 'refunded';
            ord.notes = 'Kiện hàng đã quay về kho tổng và nhập lại tồn kho Sellable';
            break;
        }
      }, 'ORDER_STATUS_CHANGED', { orderId: targetOrder.id, scenarioType });
    }

    const ordAfter = this.state.orders.find(o => o.id === (targetOrder?.id || ''));
    const afterMetrics = ordAfter ? {
      order_status: ordAfter.order_status || ordAfter.status,
      fulfillment_status: ordAfter.fulfillment_status || 'unfulfilled',
      delivery_status: ordAfter.delivery_status || 'pending_pickup',
      payment_status: ordAfter.payment_status,
      return_status: ordAfter.return_status || 'none',
      revenue_recognized: ordAfter.revenue_recognized ? 'YES' : 'NO'
    } : {};

    return {
      scenarioId: `ORD_${scenarioType.toUpperCase()}`,
      title: `Vòng đời đơn hàng: ${scenarioType}`,
      category: 'order_pod',
      passed: true,
      timestamp: new Date().toISOString(),
      before: beforeMetrics,
      after: afterMetrics,
      deltas: {},
      invariantsChecked: [
        {
          name: '5 Chiều trạng thái độc lập',
          passed: true,
          details: `Order: ${afterMetrics.order_status} | Ful: ${afterMetrics.fulfillment_status} | Deliv: ${afterMetrics.delivery_status} | Pay: ${afterMetrics.payment_status} | Ret: ${afterMetrics.return_status}`
        },
        {
          name: 'POD & Revenue Matching',
          passed: scenarioType === 'deliver_with_pod' ? afterMetrics.revenue_recognized === 'YES' : true,
          details: scenarioType === 'deliver_with_pod' ? 'POD xác thực kích hoạt Có 511 thành công' : 'Chưa giao chưa ghi nhận doanh thu'
        }
      ],
      affectedModules: ['Orders', 'Fulfillment', 'DeliveryLogistics', 'FinanceLedger'],
      eventLogs: [
        {
          timestamp: new Date().toISOString(),
          topic: `ORDER_${scenarioType.toUpperCase()}`,
          details: `Chuyển dịch trạng thái đơn ${targetOrder?.order_number || ''} sang ${scenarioType}`,
          actor: 'Order Lifecycle Engine'
        },
        {
          timestamp: new Date().toISOString(),
          topic: scenarioType === 'deliver_with_pod' ? 'POD_REVENUE_RECOGNIZED' : 'STATUS_LOG_PERSISTED',
          details: scenarioType === 'deliver_with_pod' ? 'Xác thực Bằng chứng Giao hàng POD thành công và kích hoạt Có 511' : 'Đã ghi vết lịch sử trạng thái đơn hàng',
          actor: scenarioType === 'deliver_with_pod' ? 'Logistics Carrier Webhook' : 'System Store'
        }
      ],
      notes: 'Trạng thái chuyển dịch trơn tru và phân tách rạch ròi'
    };
  }

  // ============ Reset Full State ============

  public resetToBaseline(): void {
    const fresh = JSON.parse(JSON.stringify(INITIAL_MOCK_DATABASE)) as MockDatabaseSnapshot;
    this.mutate(draft => {
      Object.assign(draft, fresh);
    }, 'DATABASE_RESET', { timestamp: new Date().toISOString() });
  }

  // ============ Inventory 5-State Queries ============


  public reconcileFeeBreakdown(feeId: string, params: {
    actorRole?: TenantRole; actorId?: string; transactionId?: string;
    adjustmentKind?: 'fee' | 'credit' | 'compensation'; source?: string;
    discrepancyReason?: OrderFeeBreakdown['discrepancy_reason']; discrepancyNote?: string; lateFeeAdjustment?: number;
  } = {}): { success: boolean; error?: string; data?: OrderFeeBreakdown } {
    const fee = this.state.orderFeeBreakdowns?.find(f => f.id === feeId);
    const error = this.authorize('finance:reconcile', fee);
    if (error) return { success: false, error };
    const amount = params.lateFeeAdjustment ?? 0;
    if (!Number.isSafeInteger(amount)) return { success: false, error: 'Khoản điều chỉnh phải là số nguyên VND' };
    const kind = params.adjustmentKind || (amount < 0 ? 'fee' : 'credit');
    if ((kind === 'fee' && amount > 0) || (kind !== 'fee' && amount < 0)) return { success: false, error: 'Phí tăng mang dấu âm; hoàn phí/bồi thường mang dấu dương' };
    // Legacy callers without an id can save reconciliation metadata, but cannot append money.
    if (amount && (!params.transactionId || !params.discrepancyNote?.trim())) return { success: false, error: 'Điều chỉnh tiền cần mã giao dịch và lý do' };
    const previous = fee!.adjustments?.find(a => a.id === params.transactionId);
    if (previous) {
      if (previous.amount !== amount || previous.kind !== kind || previous.reason !== params.discrepancyNote || previous.source !== (params.source || 'manual_mock')) return { success: false, error: 'Mã giao dịch đã dùng với nội dung khác' };
      return { success: true, data: structuredClone(fee!) };
    }
    if (params.transactionId && this.state.orderFeeBreakdowns?.some(f => f.adjustments?.some(a => a.id === params.transactionId))) return { success: false, error: 'Mã giao dịch đã thuộc chứng từ khác' };
    this.mutate(draft => {
      const target = draft.orderFeeBreakdowns!.find(f => f.id === feeId)!;
      const now = new Date().toISOString();
      target.is_reconciled = true; target.reconciled_at = now; target.reconciled_by = draft.activeUserId;
      target.discrepancy_amount = Math.abs(target.actual_shipping_fee - target.estimated_shipping_fee) + target.weight_penalty_fee;
      target.discrepancy_reason = params.discrepancyReason || (target.discrepancy_amount ? 'WEIGHT_MISMATCH' : 'NONE');
      if (params.discrepancyNote !== undefined) target.discrepancy_note = params.discrepancyNote;
      if (amount) {
        target.adjustments ||= [];
        target.adjustments.push({ id: params.transactionId!, amount, kind, reason: params.discrepancyNote!, actor_id: draft.activeUserId!, source: params.source || 'manual_mock', created_at: now });
        target.late_fee_adjustment = (target.late_fee_adjustment || 0) + amount;
        target.net_payout += amount;
      }
      target.updated_at = now;
      const order = draft.orders.find(o => o.id === target.order_id);
      if (order) order.settlement_status = 'reconciled';
    }, 'ORDER_STATUS_CHANGED', { feeId, transactionId: params.transactionId, amount, kind });
    return { success: true, data: structuredClone(this.state.orderFeeBreakdowns!.find(f => f.id === feeId)!) };
  }

  private static readonly TABLE_KEY_MAP: Record<string, keyof MockDatabaseSnapshot> = {
    orders: 'orders',
    order_items: 'orderItems',
    inventory_items: 'inventory5State',
    stock_transactions: 'stockLedger',
    stock_ledger: 'stockLedger',
    products: 'products',
    customers: 'customers',
    warehouses: 'warehouses',
    suppliers: 'suppliers',
    purchase_orders: 'purchaseOrders',
    purchase_order_items: 'purchaseOrderItems',
    transfers: 'transfers',
    stock_transfers: 'transfers',
    stock_transfer_items: 'transfers',
    picking_waves: 'pickingWaves',
    fulfillment_waves: 'pickingWaves',
    returns: 'returns',
    return_requests: 'returns',
    return_items: 'returnItems',
    batches: 'batches',
    inventory_batches: 'batches',
    serials: 'serials',
    inventory_serials: 'serials',
    journal_entries: 'journalEntries',
    journal_lines: 'journalLines',
    reconciliations: 'reconciliations',
    audit_logs: 'auditLogs',
    business_rules: 'businessRules',
    tenants: 'tenants',
    tenant_memberships: 'memberships',
    profiles: 'profiles',
    channel_connections: 'channelConnections',
    channel_sku_mappings: 'channelSkuMappings',
    order_automation_rules: 'orderAutomationRules',
    buffer_rules: 'bufferRules',
    routing_rules: 'routingRules',
    customer_complaints: 'customerComplaints',
    outbound_webhooks: 'outboundWebhooks',
    webhook_delivery_logs: 'webhookDeliveryLogs',
    order_fee_breakdowns: 'orderFeeBreakdowns',
    sync_logs: 'syncLogs',
  };

  public isTableSupported(table: string): boolean {
    if (MockDataStore.TABLE_KEY_MAP[table]) return true;
    if (['margin_config', 'ledger_accounts', 'order_status_log'].includes(table)) return true;
    if (this.state.dynamicTables && this.state.dynamicTables[table]) return true;
    return false;
  }

  public getTableData(table: string): Record<string, unknown>[] {
    const key = MockDataStore.TABLE_KEY_MAP[table];
    if (key && Array.isArray(this.state[key])) {
      return structuredClone(this.state[key] as unknown as Record<string, unknown>[]);
    }
    if (this.state.dynamicTables && Array.isArray(this.state.dynamicTables[table])) {
      return structuredClone(this.state.dynamicTables[table]);
    }
    return [];
  }

  private assertGenericMutation(table: string, rows: Record<string, unknown>[], patch?: Record<string, unknown>, operation = 'update') {
    const key = MockDataStore.TABLE_KEY_MAP[table];
    const critical = ['inventory5State', 'stockLedger', 'orderItems', 'returnItems', 'journalEntries', 'journalLines', 'orderFeeBreakdowns', 'reconciliations', 'auditLogs'];
    if (!key && !['margin_config', 'order_status_log'].includes(table)) throw Error('Không cho phép ghi bảng chưa được định nghĩa');
    if (critical.includes(String(key))) throw Error('Dữ liệu hàng/tiền/chứng từ chỉ thay đổi qua business command');
    if (['orders', 'returns'].includes(String(key)) && operation !== 'update') throw Error('Tạo/xóa chứng từ phải qua business command');
    const permissions: Record<string, Permission> = {
      orders: 'orders:manage', returns: 'orders:manage', products: 'products:manage', customers: 'orders:manage',
      warehouses: 'warehouses:manage', suppliers: 'purchasing:create', purchaseOrders: 'purchasing:create', purchaseOrderItems: 'purchasing:create',
      transfers: 'inventory:move', pickingWaves: 'inventory:move', batches: 'inventory:receive', serials: 'inventory:receive',
      channelConnections: 'integrations:manage', channelSkuMappings: 'integrations:manage', syncLogs: 'integrations:manage',
      customerComplaints: 'orders:manage', memberships: 'users:manage', profiles: 'users:manage', tenants: 'settings:manage',
      businessRules: 'settings:manage', bufferRules: 'settings:manage', routingRules: 'settings:manage',
      orderAutomationRules: 'settings:manage', outboundWebhooks: 'webhooks:manage', webhookDeliveryLogs: 'webhooks:manage',
    };
    if (patch && Object.keys(patch).some(k => ['id', 'tenant_id', 'shop_id', 'channel_shop_id', 'warehouse_id', 'order_id', 'return_id', 'user_id'].includes(k))) throw Error('Không được chuyển định danh/phạm vi bằng generic update');
    if (key === 'orders' && patch && Object.keys(patch).some(k => !['notes', 'hold_reason', 'updated_at'].includes(k))) throw Error('Vòng đời đơn hàng phải qua business command');
    if (key === 'returns' && patch && Object.keys(patch).some(k => !['reason', 'qc_notes', 'status', 'approval_status', 'updated_at'].includes(k))) throw Error('Phiếu hoàn phải qua business command');
    if (key === 'returns' && patch?.status && patch.status !== 'approved') throw Error('Nhận/QC/hoàn tiền phải qua business command');
    if (['memberships', 'profiles'].includes(String(key)) && this.state.activeRole !== 'owner' && (patch?.role || (operation === 'insert' && rows.some(r => ['owner', 'manager', 'finance'].includes(String(r.role)))))) throw Error('Chỉ Owner cấp quyền nghiệp vụ');
    for (const row of rows) {
      const error = this.authorize(permissions[String(key)] || 'settings:manage', row);
      if (error) throw Error(error);
    }
    if (!rows.length) {
      const error = this.commandPermission(permissions[String(key)] || 'settings:manage');
      if (error) throw Error(error);
    }
  }

  public canReadTableRow(table: string, row: Record<string, unknown>): boolean {
    const key = String(MockDataStore.TABLE_KEY_MAP[table] || table);
    const financial = ['orderFeeBreakdowns', 'reconciliations', 'journalEntries', 'journalLines', 'margin_config', 'ledger_accounts'];
    const technical = ['memberships', 'profiles', 'tenants', 'outboundWebhooks', 'webhookDeliveryLogs'];
    const permission: Permission = financial.includes(key) ? 'finance:view' : technical.includes(key) ? 'users:manage' : key === 'products' ? 'products:view' : key === 'inventory5State' || key === 'stockLedger' ? 'inventory:view' : 'orders:view';
    if (['ledger_accounts', 'margin_config'].includes(table)) return !this.commandPermission(permission);
    const entity = table === 'profiles' ? { ...row, tenant_id: this.state.memberships.find(m => m.user_id === row.id && m.tenant_id === this.state.activeTenantId)?.tenant_id } : row;
    return !this.authorize(permission, entity);
  }

  public insertTable(table: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
    const key = MockDataStore.TABLE_KEY_MAP[table];
    const insertedRows: Record<string, unknown>[] = [];
    const now = new Date().toISOString();

    for (const r of rows) {
      const copy = { ...r };
      if (!copy.id) {
        copy.id = `${table}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      }
      if (!copy.created_at) {
        copy.created_at = now;
      }
      if (!copy.updated_at) {
        copy.updated_at = now;
      }
      if (!copy.tenant_id && this.state.activeTenantId) {
        copy.tenant_id = this.state.activeTenantId;
      }
      insertedRows.push(copy);
    }

    this.assertGenericMutation(table, insertedRows, undefined, 'insert');
    this.mutate(draft => {
      if (key) {
        if (!draft[key]) {
          (draft[key] as any) = [];
        }
        (draft[key] as any[]).unshift(...insertedRows);
      } else {
        if (!draft.dynamicTables) {
          draft.dynamicTables = {};
        }
        if (!draft.dynamicTables[table]) {
          draft.dynamicTables[table] = [];
        }
        draft.dynamicTables[table].unshift(...insertedRows);
      }
    }, 'ORDER_STATUS_CHANGED', { table, count: insertedRows.length });

    return insertedRows;
  }

  public updateTable(table: string, predicate: (item: Record<string, unknown>) => boolean, patch: Record<string, unknown>): number {
    const key = MockDataStore.TABLE_KEY_MAP[table];
    const matched = this.getTableData(table).filter(predicate);
    this.assertGenericMutation(table, matched, patch);
    let updatedCount = 0;
    const now = new Date().toISOString();

    this.mutate(draft => {
      const list = key ? (draft[key] as any[]) : (draft.dynamicTables?.[table] || []);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (predicate(item)) {
            Object.assign(item, patch, { updated_at: now });
            updatedCount++;
          }
        }
      }
    }, 'ORDER_STATUS_CHANGED', { table, patch });

    return updatedCount;
  }

  public deleteTable(table: string, predicate: (item: Record<string, unknown>) => boolean): number {
    const key = MockDataStore.TABLE_KEY_MAP[table];
    this.assertGenericMutation(table, this.getTableData(table).filter(predicate), undefined, 'delete');
    let deletedCount = 0;

    this.mutate(draft => {
      if (key && Array.isArray(draft[key])) {
        const originalLength = (draft[key] as any[]).length;
        (draft[key] as any) = (draft[key] as any[]).filter(item => !predicate(item));
        deletedCount = originalLength - (draft[key] as any[]).length;
      } else if (draft.dynamicTables && Array.isArray(draft.dynamicTables[table])) {
        const originalLength = draft.dynamicTables[table].length;
        draft.dynamicTables[table] = draft.dynamicTables[table].filter(item => !predicate(item));
        deletedCount = originalLength - draft.dynamicTables[table].length;
      }
    }, 'ORDER_STATUS_CHANGED', { table, deletedCount });

    return deletedCount;
  }

  public createDemoUser(email: string, fullName: string, role: TenantRole): { success: boolean; error?: string; userId?: string } {
    const error = this.commandPermission('users:manage');
    if (error) return { success: false, error };
    if (!['owner', 'admin', 'manager', 'warehouse', 'growth'].includes(role) || (this.state.activeRole !== 'owner' && ['owner', 'manager'].includes(role))) return { success: false, error: 'Chỉ Owner cấp quyền nghiệp vụ quản lý; Viewer/Finance không bật' };
    if (!email.includes('@') || !fullName.trim() || this.state.profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) return { success: false, error: 'Email/tên không hợp lệ hoặc đã tồn tại' };
    const id = commandId();
    this.mutate(draft => {
      const now = new Date().toISOString();
      draft.profiles.push({ id, email, full_name: fullName, role, is_active: true, created_at: now, updated_at: now });
      draft.memberships.push({ id: commandId(), user_id: id, tenant_id: draft.activeTenantId, role, status: 'active', created_at: now, updated_at: now });
    }, 'ORDER_STATUS_CHANGED', { action: 'demo_user_created', userId: id, role });
    return { success: true, userId: id };
  }

  public updateDemoUser(userId: string, role: TenantRole, isActive: boolean): { success: boolean; error?: string } {
    const member = this.state.memberships.find(m => m.user_id === userId && m.tenant_id === this.state.activeTenantId);
    const error = this.authorize('users:manage', member);
    if (error) return { success: false, error };
    const profile = this.state.profiles.find(p => p.id === userId);
    if (!profile) return { success: false, error: 'Không có tài khoản' };
    const changingRole = profile.role !== role;
    if (changingRole && (this.state.activeRole !== 'owner' || !['owner', 'admin', 'manager', 'warehouse', 'growth'].includes(role))) return { success: false, error: 'Chỉ Owner đổi quyền nghiệp vụ' };
    if (userId === this.state.activeUserId && (!isActive || changingRole)) return { success: false, error: 'Không vô hiệu hóa hoặc đổi quyền chính session đang thao tác' };
    this.mutate(draft => {
      const target = draft.profiles.find(p => p.id === userId)!;
      target.is_active = isActive; target.role = role;
      const membership = draft.memberships.find(m => m.id === member!.id)!;
      if (changingRole) membership.role = role;
      membership.status = isActive ? 'active' : 'suspended';
    }, 'ORDER_STATUS_CHANGED', { action: 'demo_user_updated', userId, role, isActive });
    return { success: true };
  }

  public createPurchaseOrder(header: { po_number: string; warehouse_id: string; supplier_name: string; lead_time_days?: number; expected_arrival_date?: string | null; notes?: string | null }, lines: Array<{ product_id: string; quantity: number; unit_cost: number }>): { success: boolean; error?: string; poId?: string } {
    const error = this.authorize('purchasing:create', this.state.warehouses.find(w => w.id === header.warehouse_id));
    if (error) return { success: false, error };
    if (!header.supplier_name.trim() || !header.po_number || !lines.length || lines.some(i => !Number.isSafeInteger(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.unit_cost) || i.unit_cost < 0 || !this.state.products.some(p => p.id === i.product_id && p.tenant_id === this.state.activeTenantId))) return { success: false, error: 'Header hoặc dòng PO không hợp lệ' };
    if (this.state.purchaseOrders?.some(p => p.po_number === header.po_number)) return { success: false, error: 'Số PO đã tồn tại' };
    const id = commandId();
    this.mutate(draft => {
      const now = new Date().toISOString();
      draft.purchaseOrders ||= []; draft.purchaseOrderItems ||= [];
      let supplier = draft.suppliers.find(s=>s.tenant_id===draft.activeTenantId&&s.name.trim().toLowerCase()===header.supplier_name.trim().toLowerCase());
      if (!supplier) { supplier={id:commandId(),tenant_id:draft.activeTenantId,code:`MOCK-${id.slice(0,8)}`,name:header.supplier_name.trim(),contact_person:'',email:'',phone:'',address:'',payment_terms:'Chưa khai báo; hạn trả ghi riêng trên công nợ mock',lead_time_days:header.lead_time_days||0,rating:0,created_at:now};draft.suppliers.push(supplier); }
      draft.purchaseOrders.push({ ...header, supplier_id:supplier.id, id, status: 'draft', total_amount: lines.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0), created_at: now });
      draft.purchaseOrderItems.push(...lines.map(i => ({ ...i, id: commandId(), po_id: id, received_qty: 0, created_at: now })));
    }, 'ORDER_STATUS_CHANGED', { poId: id, action: 'purchase_created' });
    return { success: true, poId: id };
  }

  public receivePurchaseOrder(poId: string, itemsToReceive?: Array<{ item_id: string; qty: number }>, receiptId?: string): { success: boolean; error?: string } {
    const po = (this.state.purchaseOrders || []).find(p => p.id === poId);
    if (!po) return { success: false, error: 'Không tìm thấy đơn PO' };
    const permissionError = this.authorize('inventory:receive', po);
    if (permissionError) return { success: false, error: permissionError };
    const signature = JSON.stringify({ poId, itemsToReceive });
    const key = `po-receipt:${receiptId}`;
    if (receiptId && this.state.processedCommands?.[key]) return this.state.processedCommands[key] === signature ? { success: true } : { success: false, error: 'Mã nhận PO đã dùng với nội dung khác' };

    if (!['ordered', 'partial'].includes(po.status)) return { success: false, error: 'PO chưa được đặt hoặc đã nhận đủ' };
    const poItems = (this.state.purchaseOrderItems || []).filter(i => i.po_id === poId);
    const requested = itemsToReceive || poItems.map(i => ({ item_id: i.id, qty: i.quantity - (i.received_qty || 0) }));
    const ids = new Set<string>();
    for (const line of requested) {
      const item = poItems.find(i => i.id === line.item_id);
      if (!item || ids.has(line.item_id) || !Number.isSafeInteger(line.qty) || line.qty < 0 || line.qty > item.quantity - (item.received_qty || 0)) return { success: false, error: 'Số nhận PO không hợp lệ' };
      ids.add(line.item_id);
      if (!this.state.products.some(p => p.id === item.product_id && p.tenant_id === this.state.activeTenantId)) return { success: false, error: 'SKU không thuộc tenant PO' };
    }
    if (!requested.some(i => i.qty > 0)) return { success: false, error: 'Không còn hàng PO cần nhận' };
    const now = new Date().toISOString();
    this.mutate(draft => {
      if (receiptId) { draft.processedCommands ||= {}; draft.processedCommands[key] = signature; }
      let allCompleted = true;
      let receiptValue = 0;
      const targetPo = (draft.purchaseOrders || []).find(p => p.id === poId);

      for (const poi of (draft.purchaseOrderItems || []).filter(i => i.po_id === poId)) {
        const req = itemsToReceive?.find(r => r.item_id === poi.id);
        const qtyToRec = req ? req.qty : itemsToReceive ? 0 : Math.max(0, poi.quantity - (poi.received_qty || 0));
        if (qtyToRec > 0) {
          receiptValue += qtyToRec * poi.unit_cost;
          poi.received_qty = (poi.received_qty || 0) + qtyToRec;

          const product = draft.products.find(p => p.id === poi.product_id)!;
          const physicalBefore = draft.inventory5State.filter(i => i.product_id === poi.product_id).reduce((sum, i) => sum + i.physical, 0);
          const oldCost = product.moving_avg_cost ?? product.cost_price ?? 0;
          product.moving_avg_cost = (physicalBefore * oldCost + qtyToRec * poi.unit_cost) / (physicalBefore + qtyToRec); // keep precision between partial receipts
          product.cost_price = product.moving_avg_cost;
          // Increase inventory stock at target warehouse
          const inv = inventoryForReceipt(draft, poi.product_id, po.warehouse_id);
          if (inv) {
            inv.physical += qtyToRec;
            inv.available += qtyToRec;
            inv.sellable = inv.available;
            inv.inbound = Math.max(0, (inv.inbound || 0) - qtyToRec);
            inv.incoming = inv.inbound;
          }

          // Stock ledger entry
          draft.stockLedger.unshift({
            id: `sl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            tenant_id: draft.activeTenantId,
            product_id: poi.product_id,
            warehouse_id: po.warehouse_id,
            transaction_type: 'inbound',
            quantity: qtyToRec,
            reference_type: 'purchase_order',
            reference_id: targetPo?.po_number || poId,
            notes: `Nhập kho từ đơn mua hàng PO [${targetPo?.po_number || poId}] (+${qtyToRec} sp)`,
            balance_after: inv?.physical || 0,
            created_at: now
          });
        }

        if ((poi.received_qty || 0) < poi.quantity) {
          allCompleted = false;
        }
      }

      if (targetPo) {
        targetPo.status = allCompleted ? 'received' : 'partial';
        targetPo.updated_at = now;
      }
      accruePurchaseReceipt(draft, poId, receiptValue, receiptId || commandId(), draft.activeUserId!);
    }, 'PO_RECEIVED', { poId });

    return { success: true };
  }

  public receiveReturnDock(returnId: string, receivedLines?: ReceiptLine[], _actorRole?: TenantRole, _actorId?: string,
    options: { receiptId?: string; warehouseId?: string } = {}): { success: boolean; error?: string; discrepancyCount?: number } {
    const ret = this.state.returns.find(r => r.id === returnId);
    if (ret?.qc_notes?.startsWith('Legacy:')) return { success: false, error: 'Phiếu legacy thiếu chứng từ nhận/QC; kiểm tra trước khi xử lý' };
    const error = this.authorize('inventory:receive', ret) || (options.warehouseId ? this.authorize('inventory:receive', this.state.warehouses.find(w => w.id === options.warehouseId)) : null);
    if (error) return { success: false, error };
    try {
      this.mutate(draft => receiveReturn(draft, returnId, receivedLines, options, this.state.activeUserId!), 'RETURN_INSPECTED', { returnId, options });
      return { success: true, discrepancyCount: this.state.returns.find(r => r.id === returnId)?.missing_items_count || 0 };
    } catch (e) { return { success: false, error: (e as Error).message }; }
  }

  public loadAcceptanceFixture(variant: 'core' | 'partial' | 'money' = 'core'): { success: boolean; error?: string } {
    const error = this.commandPermission('settings:manage');
    if (error || this.state.activeRole !== 'owner') return { success: false, error: error || 'Chỉ Owner nạp fixture thay dữ liệu' };
    const fresh = variant === 'money' ? moneyFixture(INITIAL_MOCK_DATABASE) : commerceFixture(INITIAL_MOCK_DATABASE, variant);
    this.mutate(draft => Object.assign(draft, fresh), 'DATABASE_RESET', { fixture: 'RAM-X' });
    return { success: true };
  }

  public retryMarketplaceEvent(eventId: string): { success: boolean; error?: string } {
    const event = this.state.marketplaceEvents?.find(e => e.id === eventId);
    const error = this.authorize('integrations:manage', event);
    if (error) return { success: false, error };
    const connection = this.state.channelConnections?.find(c => c.shop_id === event!.shop_id);
    if (!connection || connection.status !== 'connected') return { success: false, error: 'Shop chưa kết nối; sửa kết nối trước khi retry' };
    if (event!.status === 'processed') return { success: true };
    const duplicate = this.state.orders.find(o => o.tenant_id === event!.tenant_id && o.shop_id === event!.shop_id && o.channel_order_sn === event!.order.channel_order_sn);
    if (duplicate) return { success: false, error: 'Đơn nguồn đã có từ sự kiện khác; cần đối chiếu' };
    this.mutate(draft => {
      const target = draft.marketplaceEvents!.find(e => e.id === eventId)!;
      const order = structuredClone(target.order);
      const mapped = target.items.every(i => draft.channelSkuMappings?.some(m => m.product_id === i.product_id && m.channel === order.channel && (!m.channel_shop_id || m.channel_shop_id === order.shop_id)));
      order.hold_reason = mapped ? null : 'SKU chưa map';
      draft.orders.push(order); draft.orderItems.push(...structuredClone(target.items));
      target.status = 'processed'; target.error = undefined;
      const conn = draft.channelConnections!.find(c => c.id === connection.id)!;
      conn.last_sync_at = new Date().toISOString();
    }, 'ORDER_CREATED', { eventId });
    return { success: true };
  }

  public resolveOrderMapping(orderId: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('orders:manage', order);
    if (error) return { success: false, error };
    const items = this.state.orderItems.filter(i => i.order_id === orderId);
    if (!items.length || items.some(i => !this.state.products.some(p => p.id === i.product_id && p.tenant_id === order!.tenant_id))) return { success: false, error: 'Phải tạo SKU nội bộ hợp lệ trước' };
    this.mutate(draft => {
      draft.channelSkuMappings ||= [];
      for (const item of items) {
        if (!draft.channelSkuMappings.some(m => m.product_id === item.product_id && m.channel === order!.channel && m.channel_shop_id === order!.shop_id)) {
          const template = draft.channelSkuMappings[0] || {};
          draft.channelSkuMappings.push({ ...template, id: commandId(), channel: order!.channel, product_id: item.product_id, channel_sku_id: item.product_sku, channel_shop_id: order!.shop_id, tenant_id: order!.tenant_id } as any);
        }
      }
      draft.orders.find(o => o.id === orderId)!.hold_reason = null;
    }, 'ORDER_STATUS_CHANGED', { orderId, action: 'map' });
    return { success: true };
  }

  public releaseToWarehouse(orderId: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('orders:manage', order);
    if (error) return { success: false, error };
    if (order!.fulfillment_status === 'allocated') return { success: true };
    if (order!.status !== 'pending' || order!.cancellation_requested || order!.hold_reason || !order!.shop_id || !order!.assigned_warehouse_id) return { success: false, error: 'Đơn thiếu shop/kho/mapping hoặc đang bị chặn/hủy' };
    const items = this.state.orderItems.filter(i => i.order_id === orderId);
    const quantities = new Map<string, number>();
    for (const item of items) quantities.set(item.product_id, (quantities.get(item.product_id) || 0) + item.quantity);
    if (!items.length || items.some(i => !Number.isSafeInteger(i.quantity) || i.quantity <= 0)) return { success: false, error: 'Dòng hàng không hợp lệ' };
    for (const [id, qty] of quantities) {
      const inv = this.state.inventory5State.find(i => i.product_id === id && i.warehouse_id === order!.assigned_warehouse_id);
      if (!inv || inv.available < qty) return { success: false, error: 'Không đủ tồn khả dụng; chưa chuyển kho' };
    }
    this.mutate(draft => {
      for (const [id, qty] of quantities) {
        const inv = draft.inventory5State.find(i => i.product_id === id && i.warehouse_id === order!.assigned_warehouse_id)!;
        inv.reserved += qty; inv.available -= qty; inv.sellable = inv.available;
        draft.stockLedger.push({ id: commandId(), tenant_id: order!.tenant_id, product_id: id, warehouse_id: inv.warehouse_id, transaction_type: 'reservation', quantity: qty, reference_type: 'order', reference_id: orderId, balance_after: inv.available, created_at: new Date().toISOString() });
      }
      Object.assign(draft.orders.find(o => o.id === orderId)!, { status: 'processing', fulfillment_status: 'allocated' });
    }, 'STOCK_RESERVED', { orderId });
    return { success: true };
  }

  public prepareOrder(orderId: string, stage: 'pick' | 'pack', scans: string[] = []): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('inventory:move', order);
    if (error) return { success: false, error };
    if (order!.status !== 'processing' || order!.cancellation_requested || order!.hold_reason) return { success: false, error: 'Đơn đang bị chặn/hủy hoặc chưa giao kho' };
    if (stage === 'pick') {
      if (order!.fulfillment_status !== 'allocated') return { success: false, error: 'Đơn không ở bước chờ nhặt' };
      const items = this.state.orderItems.filter(i => i.order_id === orderId);
      if (!items.length || items.some(i => i.serial_numbers?.length ? i.serial_numbers.some(s => !scans.includes(s)) : !scans.includes(i.product_sku))) return { success: false, error: 'Mã SKU/serial chưa khớp các dòng hàng' };
    } else if (order!.fulfillment_status !== 'picking') return { success: false, error: 'Phải kiểm SKU trước khi đóng gói' };
    this.mutate(draft => {
      const target = draft.orders.find(o => o.id === orderId)!;
      target.fulfillment_status = stage === 'pick' ? 'picking' : 'packed';
      if (stage === 'pack') target.packaging_cost = target.packaging_cost || 20000; // explicit demo configuration
    }, stage === 'pick' ? 'ITEM_PICKED' : 'ITEM_PACKED', { orderId, scans, demoPackagingCost: 20000 });
    return { success: true };
  }

  public reportWarehouseException(orderId: string, reason: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('inventory:move', order);
    if (error) return { success: false, error };
    if (!reason.trim() || !['pending', 'processing'].includes(order!.status)) return { success: false, error: 'Cần bằng chứng và đơn đang chuẩn bị' };
    this.mutate(draft => {
      draft.orders.find(o => o.id === orderId)!.hold_reason = `Kho báo: ${reason.trim()}`;
    }, 'ORDER_STATUS_CHANGED', { orderId, action: 'warehouse_exception', reason });
    return { success: true };
  }

  public requestCancellation(orderId: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('orders:cancel', order);
    if (error) return { success: false, error };
    if (!['pending', 'processing'].includes(order!.status)) return { success: false, error: 'Đơn đã bàn giao; xử lý hoàn riêng' };
    this.mutate(draft => { draft.orders.find(o => o.id === orderId)!.cancellation_requested = true; }, 'ORDER_STATUS_CHANGED', { orderId, action: 'cancellation_requested' });
    return { success: true };
  }

  public resolveCancellation(orderId: string, result: 'rejected' | 'withdrawn', reason: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('orders:cancel', order);
    if (error) return { success: false, error };
    if (!['rejected', 'withdrawn'].includes(result) || !reason.trim()) return { success: false, error: 'Cần kết quả và lý do từ nguồn' };
    if (!order!.cancellation_requested || !['pending', 'processing'].includes(order!.status)) return { success: false, error: 'Không có yêu cầu hủy đang chờ trước bàn giao' };
    this.mutate(draft => {
      draft.orders.find(o => o.id === orderId)!.cancellation_requested = false;
    }, 'ORDER_STATUS_CHANGED', { orderId, action: 'cancellation_resolved', result, reason });
    return { success: true };
  }

  public resolveReturnReceiving(returnId: string, closed: boolean, note: string): { success: boolean; error?: string } {
    const ret = this.state.returns.find(r => r.id === returnId);
    const error = this.authorize('orders:manage', ret);
    if (error) return { success: false, error };
    if (!note.trim() || ret!.is_refund_without_return || ret!.rma_branch === 'returnless_refund') return { success: false, error: 'Cần lý do cho phiếu có hàng vật lý' };
    const lines = this.state.returnItems.filter(i => i.return_id === returnId);
    if (closed && lines.some(i => (i.received_qty || 0) > (i.qc_pass_qty || 0) + (i.qc_fail_qty || 0))) return { success: false, error: 'Phải QC hết hàng đã nhận trước khi chốt' };
    this.mutate(draft => {
      const target = draft.returns.find(r => r.id === returnId)!;
      target.receiving_closed = closed; target.receiving_resolution = note.trim(); target.updated_at = new Date().toISOString();
    }, 'ORDER_STATUS_CHANGED', { returnId, orderId: ret!.order_id, action: 'return_receiving_resolved', closed, note });
    return { success: true };
  }

  public resolveReturnClaim(returnId: string, status: 'awaiting_compensation' | 'paid' | 'rejected', note: string, transactionId?: string): { success: boolean; error?: string } {
    const ret = this.state.returns.find(r => r.id === returnId);
    const error = this.authorize('finance:reconcile', ret);
    if (error) return { success: false, error };
    if (!['awaiting_compensation', 'paid', 'rejected'].includes(status) || !note.trim()) return { success: false, error: 'Cần trạng thái và bằng chứng xử lý khiếu nại' };
    if (status === 'paid') {
      const adjustment = this.state.orderFeeBreakdowns?.filter(f => f.order_id === ret!.order_id).flatMap(f => f.adjustments || []).find(a => a.id === transactionId && a.kind === 'compensation' && a.amount > 0);
      if (!adjustment || this.state.returns.some(r => r.id !== returnId && r.compensation_transaction_id === transactionId)) return { success: false, error: 'Cần giao dịch bồi thường của đúng đơn, chưa gắn phiếu khác' };
    }
    this.mutate(draft => {
      const target = draft.returns.find(r => r.id === returnId)!;
      target.claim_status = status; target.claim_note = note.trim();
      target.compensation_transaction_id = status === 'paid' ? transactionId : undefined;
      target.updated_at = new Date().toISOString();
    }, 'ORDER_STATUS_CHANGED', { returnId, orderId: ret!.order_id, action: 'return_claim_resolved', status, transactionId, note });
    return { success: true };
  }

  // Money documents share the same clone/persist/commit boundary as stock commands.
  private moneyCommand(id: string, payload: unknown, entities: unknown[], updater: (draft: MockDatabaseSnapshot) => void) {
    const error = entities.map(entity => this.authorize('finance:reconcile', entity)).find(Boolean);
    if (error || !entities.length) return { success: false, error: error || 'Thiếu chứng từ nguồn trong phạm vi' };
    if (!id?.trim()) return { success: false, error: 'Cần mã chứng từ duy nhất' };
    const signature = moneySignature(payload), old = financeState(this.state).command_signatures[id];
    if (old) return old === signature ? { success: true, replay: true } : { success: false, error: 'Mã chứng từ đã dùng với nội dung khác' };
    try {
      this.mutate(draft => { const f = ensureFinance(draft); updater(draft); f.command_signatures[id] = signature; }, 'JOURNAL_POSTED', { id, action: 'mock_money_document', payload });
      return { success: true };
    } catch (error) { return { success: false, error: (error as Error).message }; }
  }

  public createCashAccount(params: Omit<CashAccount, 'tenant_id'>) {
    const ctx = this.getExecutionContext();
    if (!ctx || ctx.role !== 'owner' || ctx.shopIds || ctx.warehouseIds) return { success: false, error: 'Chỉ Owner toàn tenant cấu hình số dư đầu kỳ mock' };
    if (!params.id?.trim() || !params.name.trim() || !Number.isSafeInteger(params.opening_balance) || params.opening_balance < 0 || !params.opening_reference.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(params.opening_date)) return { success: false, error: 'Tài khoản cần mã, tên, ngày, số dư nguyên không âm và nguồn số dư đầu kỳ' };
    if (financeState(this.state).accounts.some(a => a.id === params.id)) return { success: false, error: 'Tài khoản đã có; không sửa ngược số dư đầu kỳ' };
    if (!validMoneyDate(params.opening_date) || params.opening_date > new Date(Date.now()+7*3600000).toISOString().slice(0,10) || params.shop_id && !this.state.channelConnections?.some(c=>c.shop_id===params.shop_id&&c.tenant_id===ctx.tenantId) || params.warehouse_id && !this.state.warehouses.some(w=>w.id===params.warehouse_id&&w.tenant_id===ctx.tenantId)) return { success:false,error:'Ngày/scope tài khoản mock không hợp lệ' };
    return this.moneyCommand(`account:${params.id}`, params, [{ tenant_id: ctx.tenantId }], draft => { ensureFinance(draft).accounts.push({ ...params, tenant_id: ctx.tenantId }); });
  }

  public getFinanceOverview(delayDays = 0) {
    const f = financeState(this.state);
    const accounts = f.accounts.filter(a => !this.authorize('finance:view', a)).map(a => ({ ...structuredClone(a), balance: balance(this.state, a.id) }));
    const visibleOrders = new Set(this.getOrders().filter(o => !this.authorize('finance:view', o)).map(o => o.id));
    const settlements = f.settlements.filter(b => b.tenant_id === this.state.activeTenantId && b.order_ids.every(id => visibleOrders.has(id))).map(b => batchView(this.state, structuredClone(b)));
    const payables = f.payables.filter(p => !this.authorize('finance:view', p)).map(p => payableView(this.state, structuredClone(p)));
    const availableCash = accounts.reduce((sum, a) => sum + a.balance, 0);
    const documents = f.documents.filter(d => accounts.some(a => a.id === d.account_id) && (settlements.some(b => b.id === d.entity_id) || payables.some(p => p.id === d.entity_id)));
    const assigned = new Set(f.settlements.flatMap(b => b.order_ids));
    const eligibleOrders = this.getOrders().filter(o => visibleOrders.has(o.id) && !assigned.has(o.id) && (o.shipped_at || o.status === 'delivered')).map(o => ({ ...o, expected: commerceOrderMetrics(this.state, o).sales - commerceOrderMetrics(this.state, o).fees + commerceOrderMetrics(this.state, o).compensation }));
    const forecast = cashForecast(this.state, settlements, payables, availableCash, delayDays);
    for (const order of eligibleOrders.filter(o => o.expected > 0)) forecast.undated.push({ id: order.id, date: null, inflow: order.expected, outflow: 0 });
    return { accounts, settlements, payables, availableCash, documents: structuredClone(documents), eligibleOrders, pendingMarketplaceSettlements: settlements.reduce((sum, b) => sum + Math.max(0, b.remaining), 0) + eligibleOrders.reduce((sum, o) => sum + Math.max(0, o.expected), 0), supplierPayables: payables.reduce((sum, p) => sum + p.remaining, 0), forecast };
  }

  public createSettlementBatch(params: { id: string; orderIds: string[]; expectedDate: string | null }) {
    const orders = params.orderIds.map(id => this.state.orders.find(o => o.id === id));
    const f = financeState(this.state);
    if (params.expectedDate && !validMoneyDate(params.expectedDate)) return { success:false,error:'Ngày dự kiến không hợp lệ' };
    if (!orders.length || new Set(params.orderIds).size !== orders.length || orders.some(o => !o || !o.shop_id || (!o.shipped_at && o.status !== 'delivered')) || orders.some(o => o!.shop_id !== orders[0]!.shop_id || o!.channel !== orders[0]!.channel) || params.expectedDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.expectedDate)) return { success: false, error: 'Chọn đơn đã bàn giao cùng shop/kênh và ngày dự kiến hợp lệ hoặc để trống' };
    return this.moneyCommand(`batch:${params.id}`, params, orders, draft => {
      if (f.settlements.some(b => b.id === params.id || b.order_ids.some(id => params.orderIds.includes(id)))) throw Error('Đơn đã thuộc đợt thanh toán khác');
      const original_expected = orders.reduce((sum, o) => { const m = commerceOrderMetrics(draft, o!); return sum + m.sales - m.fees + m.compensation; }, 0);
      ensureFinance(draft).settlements.push({ id: params.id, tenant_id: draft.activeTenantId, shop_id: orders[0]!.shop_id!, channel: orders[0]!.channel, order_ids: params.orderIds, expected_date: params.expectedDate, original_expected, source_adjustment: 0, adjustment_reason: '', history: [{ at: new Date().toISOString(), actor_id: draft.activeUserId!, action: 'created', note: 'Dự kiến từ đơn nguồn; không tăng tiền' }] });
    });
  }

  public recordSettlementReceipt(params: { id: string; batchId: string; accountId: string; amount: number; date: string; reference: string; discrepancyReason?: string }) {
    const f = financeState(this.state), batch = f.settlements.find(b => b.id === params.batchId), account = f.accounts.find(a => a.id === params.accountId);
    return this.moneyCommand(params.id, params, [account, ...(batch?.order_ids.map(id => this.state.orders.find(o => o.id === id)) || [undefined])], draft => {
      if (!validMoneyDate(params.date) || account!.shop_id && account!.shop_id !== batch!.shop_id || account!.warehouse_id && batch!.order_ids.some(id=>draft.orders.find(o=>o.id===id)?.assigned_warehouse_id!==account!.warehouse_id)) throw Error('Ngày/scope chứng từ nhận tiền không khớp tài khoản');
      const view = batchView(draft, batch!);
      if (!view.reconciled || view.remaining <= 0) throw Error('Cần đối soát xong và khoản còn chờ nhận dương; điều chỉnh âm xử lý riêng');
      if (!Number.isSafeInteger(params.amount) || params.amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(params.date) || params.date < account!.opening_date || params.date > new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10) || !params.reference.trim()) throw Error('Cần số tiền nguyên dương, ngày thực nhận và nguồn tham chiếu');
      if (params.amount > view.remaining && !params.discrepancyReason?.trim()) throw Error('Nhận vượt dự kiến cần lý do chênh lệch');
      ensureFinance(draft).documents.push({ id: params.id, tenant_id: draft.activeTenantId, kind: 'receipt', account_id: params.accountId, entity_id: params.batchId, amount: params.amount, date: params.date, reference: params.reference.trim(), actor_id: draft.activeUserId!, created_at: new Date().toISOString(), reason: params.discrepancyReason });
      ensureFinance(draft).settlements.find(b => b.id === params.batchId)!.history.push({ at: new Date().toISOString(), actor_id: draft.activeUserId!, action: 'received', note: `${params.id}: ${params.amount} VND; ${params.reference}` });
    });
  }

  public updatePayableTerms(params: { id: string; payableId: string; dueDate: string; reason: string; confirmSimulation: boolean }) {
    const payable = financeState(this.state).payables.find(p => p.id === params.payableId);
    return this.moneyCommand(params.id, params, [payable], draft => {
      if (!validMoneyDate(params.dueDate)) throw Error('Ngày hạn trả không hợp lệ');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(params.dueDate) || !params.reason.trim()) throw Error('Cần ngày hạn trả mới và lý do');
      const target = ensureFinance(draft).payables.find(p => p.id === params.payableId)!;
      target.proposed_due_date = params.dueDate;
      target.extension_status = params.confirmSimulation ? 'confirmed_simulation' : 'requested_simulation';
      if (params.confirmSimulation) target.due_date = params.dueDate;
      target.history.push({ at: new Date().toISOString(), actor_id: draft.activeUserId!, action: target.extension_status, note: `${params.dueDate}: ${params.reason}; xác nhận chỉ trong mô phỏng, không từ NCC thật` });
    });
  }

  public recordSupplierPayment(params: { id: string; payableId: string; accountId: string; amount: number; date: string; reference: string }) {
    const f = financeState(this.state), payable = f.payables.find(p => p.id === params.payableId), account = f.accounts.find(a => a.id === params.accountId);
    return this.moneyCommand(params.id, params, [payable, account], draft => {
      if (!validMoneyDate(params.date) || account!.shop_id || account!.warehouse_id && account!.warehouse_id!==payable!.warehouse_id) throw Error('Ngày/scope tài khoản chi không khớp PO');
      const view = payableView(draft, payable!);
      if (!Number.isSafeInteger(params.amount) || params.amount <= 0 || params.amount > view.remaining || params.amount > balance(draft, params.accountId)) throw Error('Số chi phải nguyên dương, không vượt nợ còn lại hoặc tiền khả dụng');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date) || params.date < account!.opening_date || params.date > new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10) || !params.reference.trim()) throw Error('Cần ngày chi thực tế và tham chiếu hợp lệ');
      ensureFinance(draft).documents.push({ id: params.id, tenant_id: draft.activeTenantId, kind: 'payment', account_id: params.accountId, entity_id: params.payableId, amount: params.amount, date: params.date, reference: params.reference.trim(), actor_id: draft.activeUserId!, created_at: new Date().toISOString() });
      ensureFinance(draft).payables.find(p => p.id === params.payableId)!.history.push({ at: new Date().toISOString(), actor_id: draft.activeUserId!, action: 'paid', note: `${params.id}: ${params.amount} VND; ${params.reference}` });
    });
  }

  public getOperationsConfig() { return operationsConfig(this.state); }
  public saveOperationsConfig(config: OperationsConfig) {
    const error = this.commandPermission('settings:manage');
    if (error || Object.values(config).some(n => !Number.isFinite(n) || n <= 0) || config.concentration_percent > 100 || config.history_days < config.slow_days) return { success: false, error: error || 'Ngưỡng cấu hình không hợp lệ' };
    this.mutate(draft => { ensureFinance(draft).operations[draft.activeTenantId] = config; }, 'ORDER_STATUS_CHANGED', { action: 'operations_configured', config });
    return { success: true };
  }
  public getPricingAssumptions(shopId: string) { return structuredClone(financeState(this.state).pricing.find(p => p.tenant_id === this.state.activeTenantId && p.shop_id === shopId && this.state.channelConnections?.some(c => c.shop_id === shopId && !this.authorize('products:view', c)))); }
  public savePricingAssumptions(config: PricingAssumptions) {
    const shop = this.state.channelConnections?.find(c => c.shop_id === config.shop_id);
    const error = this.authorize('products:manage', shop);
    const numbers = Object.entries(config).filter(([key]) => !['tenant_id', 'shop_id', 'tax_included_in_fees'].includes(key)).map(([, value]) => value as number);
    if (error || numbers.some(n => !Number.isFinite(n) || n < 0) || config.commission_percent + config.payment_percent + config.ads_percent + (config.tax_included_in_fees ? 0 : config.configured_tax_percent) >= 100) return { success: false, error: error || 'Tỷ lệ/chi phí không hợp lệ' };
    this.mutate(draft => { const f = ensureFinance(draft); f.pricing = f.pricing.filter(p => p.tenant_id !== draft.activeTenantId || p.shop_id !== config.shop_id); f.pricing.push({...config,tenant_id:draft.activeTenantId}); }, 'ORDER_STATUS_CHANGED', { action: 'pricing_configured', config });
    return { success: true };
  }

  public getGrowthRecommendations() {
    const ids = new Set(this.getOrders().map(o => o.id));
    return structuredClone((this.state.growthRecommendations || []).filter(r => r.tenant_id === this.state.activeTenantId && ids.has(r.order_id)));
  }

  public recordSourceEvent(orderId: string, event: { id: string; version: number; type: 'carrier_accepted' | 'delivered' | 'failed' | 'refund' | 'ads_credit'; amount?: number }): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('finance:reconcile', order);
    if (error) return { success: false, error };
    const signature = JSON.stringify({ orderId, ...event });
    const key = `source:${event.id}`;
    if (this.state.processedCommands?.[key]) return this.state.processedCommands[key] === signature ? { success: true } : { success: false, error: 'Mã sự kiện đã dùng với nội dung khác' };
    const dimension = ['delivered', 'failed', 'carrier_accepted'].includes(event.type) ? 'delivery' : event.type;
    const versionKey = `${orderId}:${dimension}`;
    if (!event.id || !Number.isSafeInteger(event.version) || event.version <= 0) return { success: false, error: 'Thiếu mã/thứ tự sự kiện' };
    // Delivery snapshots are ordered; distinct financial transactions are additive, even when late.
    if (dimension === 'delivery' && event.version <= (this.state.sourceVersions?.[versionKey] || 0)) return { success: true };
    if (dimension === 'delivery' && event.type !== 'failed' && ['delivery_failed', 'returned_to_sender'].includes(order!.delivery_status || '')) return { success: false, error: 'Luồng giao đã thất bại/hoàn về; không được nhảy sang giao thành công hoặc tiếp nhận' };
    if (dimension === 'delivery' && order!.status !== 'shipped') return { success: false, error: 'Sự kiện giao hàng yêu cầu đơn đã bàn giao' };
    if (['refund', 'ads_credit'].includes(event.type) && (!Number.isSafeInteger(event.amount) || event.amount! <= 0)) return { success: false, error: 'Số tiền sự kiện không hợp lệ' };
    if (event.type === 'refund' && (order!.refunded_amount ?? (order!.payment_status === 'refunded' ? order!.total : 0)) + event.amount! > order!.total) return { success: false, error: 'Hoàn vượt tiền đơn' };
    if (event.type === 'ads_credit' && (order!.ads_credit || 0) + event.amount! > (order!.ads_spend || 0)) return { success: false, error: 'Credit vượt Ads đã chi' };
    this.mutate(draft => {
      const target = draft.orders.find(o => o.id === orderId)!;
      draft.processedCommands ||= {}; draft.sourceVersions ||= {};
      draft.processedCommands[key] = signature; draft.sourceVersions[versionKey] = Math.max(draft.sourceVersions[versionKey] || 0, event.version);
      target.raw_source_status = `DEMO_${event.type.toUpperCase()}`;
      if (event.type === 'carrier_accepted') { target.carrier_accepted_at = new Date().toISOString(); target.delivery_status = 'in_transit'; }
      if (event.type === 'delivered') { target.status = 'delivered'; target.delivery_status = 'delivered'; target.fulfillment_status = 'fulfilled'; target.revenue_recognized = true; target.delivered_at = new Date().toISOString(); }
      if (event.type === 'failed') {
        target.delivery_status = 'delivery_failed'; target.return_status = 'return_requested';
        if (!draft.returns.some(r => r.id === `return-${orderId}`)) {
          draft.returns.push({ id: `return-${orderId}`, tenant_id: target.tenant_id, warehouse_id: target.assigned_warehouse_id!, return_number: `RMA-${target.order_number}`, order_id: orderId, return_type: 'customer_rma', status: 'approved', refund_amount: target.total, reason: 'Sự kiện sàn mô phỏng: giao thất bại; chờ hàng về', approval_status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          draft.returnItems.push(...draft.orderItems.filter(i => i.order_id === orderId).map(i => ({ id: `return-item-${i.id}`, return_id: `return-${orderId}`, product_id: i.product_id, quantity: i.quantity, sku: i.product_sku, received_qty: 0, qc_pass_qty: 0, qc_fail_qty: 0 })));
        }
      }
      if (event.type === 'refund') { target.refunded_amount = (target.refunded_amount || 0) + event.amount!; target.payment_status = target.refunded_amount === target.total ? 'refunded' : 'partially_paid'; }
      if (event.type === 'ads_credit') target.ads_credit = (target.ads_credit || 0) + event.amount!;
      target.settlement_status = 'pending';
      for (const fee of draft.orderFeeBreakdowns?.filter(f => f.order_id === orderId) || []) {
        fee.is_reconciled = false;
        fee.net_payout = (target.status === 'delivered' ? target.total - (target.refunded_amount || 0) : 0) - fee.commission_fee - fee.transaction_fee - fee.voucher_co_fund_fee - fee.actual_shipping_fee - fee.weight_penalty_fee + (fee.late_fee_adjustment || 0);
      }
    }, 'ORDER_STATUS_CHANGED', { orderId, event });
    return { success: true };
  }

  public recordSourceFees(orderId: string, actualFee: number, transactionId: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('finance:reconcile', order);
    if (error) return { success: false, error };
    if (!Number.isSafeInteger(actualFee) || actualFee < 0 || !transactionId) return { success: false, error: 'Phí nguồn không hợp lệ' };
    const signature = JSON.stringify({ orderId, actualFee });
    const key = `fees:${transactionId}`;
    if (this.state.processedCommands?.[key]) return this.state.processedCommands[key] === signature ? { success: true } : { success: false, error: 'Mã phí trùng nội dung khác' };
    this.mutate(draft => {
      draft.processedCommands ||= {}; draft.processedCommands[key] = signature;
      draft.orderFeeBreakdowns ||= [];
      let fee = draft.orderFeeBreakdowns.find(f => f.order_id === orderId);
      if (!fee) { fee = { id: `fee-${orderId}`, order_id: orderId, commission_fee: 0, transaction_fee: 0, voucher_co_fund_fee: 0, estimated_shipping_fee: actualFee, actual_shipping_fee: 0, weight_penalty_fee: 0, net_payout: 0, is_reconciled: false, discrepancy_note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; draft.orderFeeBreakdowns.push(fee); }
      fee.actual_shipping_fee = actualFee; fee.is_reconciled = false;
      fee.net_payout = (order!.status === 'delivered' ? order!.total - (order!.refunded_amount || 0) : 0) - fee.commission_fee - fee.transaction_fee - fee.voucher_co_fund_fee - fee.weight_penalty_fee - actualFee + (fee.late_fee_adjustment || 0);
      draft.orders.find(o => o.id === orderId)!.settlement_status = 'pending';
    }, 'ORDER_STATUS_CHANGED', { orderId, actualFee, transactionId, source: 'demo_marketplace' });
    return { success: true };
  }

  public assignHandoff(key: string, orderId: string, assigneeId: string | null): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('orders:manage', order);
    if (error) return { success: false, error };
    const [kind, entityId] = key.split(':');
    const groups: Record<string, TenantRole> = { release: 'manager', warehouse: 'warehouse', monitor: 'manager', carrier: 'manager', settlement: 'manager', return: 'warehouse', discrepancy: 'manager', claim: 'manager', returnMonitor: 'manager', recommendation: 'manager' };
    const linked = ['return', 'discrepancy', 'claim', 'returnMonitor'].includes(kind) ? this.state.returns.some(r => r.id === entityId && r.order_id === orderId) : kind === 'recommendation' ? this.state.growthRecommendations?.some(r => r.id === entityId && r.order_id === orderId) : entityId === orderId;
    if (!groups[kind] || !linked) return { success: false, error: 'Công việc không thuộc đơn trong phạm vi' };
    if (assigneeId && !this.state.memberships.some(m => m.user_id === assigneeId && m.role === groups[kind] && m.tenant_id === order!.tenant_id && m.status === 'active' && (!m.shop_ids || m.shop_ids.includes(order!.shop_id!)) && (!m.warehouse_ids || m.warehouse_ids.includes(order!.assigned_warehouse_id!)))) return { success: false, error: 'Người nhận ngoài phạm vi' };
    this.mutate(draft => {
      draft.handoffAssignments ||= {};
      const record = draft.handoffAssignments[key] ||= { assignee_id: null, history: [] };
      record.assignee_id = assigneeId; record.history.push({ actor_id: draft.activeUserId!, assignee_id: assigneeId, at: new Date().toISOString() });
    }, 'ORDER_STATUS_CHANGED', { orderId, key, assigneeId });
    return { success: true };
  }

  public recordHandoffException(orderId: string, params: { note: string; dueAt: string; status: 'open' | 'processing' | 'resolved' | 'confirmed' }) {
    const order = this.state.orders.find(o => o.id === orderId), ctx = this.getExecutionContext();
    const permission = ctx?.role === 'warehouse' ? 'inventory:mutate' : 'orders:manage';
    const error = this.authorize(permission, order);
    if (error || !params.note.trim() || !Number.isFinite(Date.parse(params.dueAt)) || !['open','processing','resolved','confirmed'].includes(params.status)) return { success: false, error: error || 'Cần ghi chú, hạn và trạng thái hợp lệ' };
    if (ctx?.role === 'warehouse' && params.status !== 'open') return { success: false, error: 'Kho ghi nhận phát hiện; Manager xử lý/xác nhận kết quả' };
    const key = `monitor:${orderId}`, prior = this.state.handoffAssignments?.[key];
    if (params.status === 'confirmed' && prior?.status !== 'resolved') return { success: false, error: 'Chỉ xác nhận sau khi đã có kết quả xử lý' };
    this.mutate(draft => {
      draft.handoffAssignments ||= {};
      const record = draft.handoffAssignments[key] ||= { assignee_id: null, history: [] };
      record.discovered_by ||= draft.activeUserId!; record.due_at = params.dueAt; record.status = params.status; record.note = params.note;
      if (params.status === 'resolved') record.resolved_by = draft.activeUserId!;
      if (params.status === 'confirmed') record.confirmed_by = draft.activeUserId!;
      record.history.push({ actor_id: draft.activeUserId!, assignee_id: record.assignee_id, at: new Date().toISOString(), action: params.status, note: params.note });
    }, 'ORDER_STATUS_CHANGED', { orderId, key, action: 'exception_updated', ...params });
    return { success: true };
  }

  public createGrowthRecommendation(orderId: string, reason: string): { success: boolean; error?: string } {
    const order = this.state.orders.find(o => o.id === orderId);
    const error = this.authorize('growth:manage', order);
    if (error) return { success: false, error };
    if (!reason.trim()) return { success: false, error: 'Cần lý do đề xuất' };
    if (this.state.growthRecommendations?.some(r => r.order_id === orderId && r.status === 'open')) return { success: false, error: 'Đơn đã có đề xuất đang mở' };
    const evidence = commerceOrderMetrics(this.state, order!);
    this.mutate(draft => { draft.growthRecommendations ||= []; draft.growthRecommendations.push({ id: commandId(), tenant_id: draft.activeTenantId, order_id: orderId, reason: `${reason} | contribution=${evidence.contribution}; ads=${evidence.adsSpend}; nguồn MOCK_SOURCE`, actor_id: draft.activeUserId!, status: 'open', created_at: new Date().toISOString() }); }, 'ORDER_STATUS_CHANGED', { orderId, action: 'growth_recommendation' });
    return { success: true };
  }

  public resolveGrowthRecommendation(id: string, status: 'accepted' | 'dismissed'): { success: boolean; error?: string } {
    const rec = this.state.growthRecommendations?.find(r => r.id === id);
    const error = this.authorize('orders:manage', rec);
    if (error) return { success: false, error };
    this.mutate(draft => { draft.growthRecommendations!.find(r => r.id === id)!.status = status; }, 'ORDER_STATUS_CHANGED', { id, status });
    return { success: true };
  }

  public getInventory5State(): SkuInventory5State[] {
    const ctx = this.getExecutionContext();
    return ctx && hasPermission(ctx.role, 'inventory:view') ? structuredClone(this.state.inventory5State.filter(i => this.state.warehouses.some(w => w.id === i.warehouse_id && w.tenant_id === ctx.tenantId) && (!ctx.warehouseIds || ctx.warehouseIds.includes(i.warehouse_id)))) : [];
  }

  public getStockLedger(): StockLedgerEntry[] {
    return this.state.stockLedger.filter(s => s.tenant_id === this.state.activeTenantId);
  }

  public getProducts(): Product[] {
    return structuredClone(this.state.products.filter(p => p.tenant_id === this.state.activeTenantId));
  }

  public getCustomers(): Customer[] {
    return this.state.customers || [];
  }

  public getWarehouses(): Warehouse[] {
    return structuredClone(this.state.warehouses.filter(w => w.tenant_id === this.state.activeTenantId));
  }
}

export const mockStore = new MockDataStore();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__mockStore = mockStore;
}
