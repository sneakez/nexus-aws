import { mockStore } from './store';
import type { MockDatabaseSnapshot } from './types';
import type { Order } from '@/types';

type FilterOp =
  | { col: string; op: 'eq'; val: unknown }
  | { col: string; op: 'neq'; val: unknown }
  | { col: string; op: 'in'; val: unknown[] }
  | { col: string; op: 'is'; val: unknown }
  | { col: string; op: 'not'; subOp: string; val: unknown }
  | { col: string; op: 'gte'; val: unknown }
  | { col: string; op: 'gt'; val: unknown }
  | { col: string; op: 'lte'; val: unknown }
  | { col: string; op: 'lt'; val: unknown }
  | { col: string; op: 'like'; val: string }
  | { col: string; op: 'ilike'; val: string };

export const DEFAULT_LEDGER_ACCOUNTS = [
  { id: 'acc_112', account_code: '112', account_name: 'Tiền gửi ngân hàng', account_type: 'asset', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_131', account_code: '131', account_name: 'Phải thu khách hàng & Sàn TMĐT', account_type: 'asset', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_156', account_code: '156', account_name: 'Hàng hóa tồn kho', account_type: 'asset', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_3331', account_code: '3331', account_name: 'Thuế GTGT phải nộp', account_type: 'liability', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_3388', account_code: '3388', account_name: 'Phải trả phí dịch vụ & hoa hồng sàn', account_type: 'liability', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_511', account_code: '511', account_name: 'Doanh thu bán hàng & cung cấp dịch vụ', account_type: 'revenue', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_632', account_code: '632', account_name: 'Giá vốn hàng bán (COGS)', account_type: 'expense', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'acc_641', account_code: '641', account_name: 'Chi phí bán hàng & Logistics', account_type: 'expense', parent_account_id: null, is_active: true, created_at: '2026-01-01T00:00:00Z' },
];

export class MockQueryBuilder {
  private table: string;
  private filters: FilterOp[] = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private rangeBounds: [number, number] | null = null;
  private selectedFields: string = '*';

  constructor(table: string) {
    this.table = table;
  }

  public select(fields: string = '*') {
    this.selectedFields = fields;
    return this;
  }

  public eq(col: string, val: unknown) {
    this.filters.push({ col, op: 'eq', val });
    return this;
  }

  public neq(col: string, val: unknown) {
    this.filters.push({ col, op: 'neq', val });
    return this;
  }

  public in(col: string, vals: unknown[]) {
    this.filters.push({ col, op: 'in', val: vals });
    return this;
  }

  public is(col: string, val: unknown) {
    this.filters.push({ col, op: 'is', val });
    return this;
  }

  public not(col: string, subOp: string, val: unknown) {
    this.filters.push({ col, op: 'not', subOp, val });
    return this;
  }

  public gte(col: string, val: unknown) {
    this.filters.push({ col, op: 'gte', val });
    return this;
  }

  public gt(col: string, val: unknown) {
    this.filters.push({ col, op: 'gt', val });
    return this;
  }

  public lte(col: string, val: unknown) {
    this.filters.push({ col, op: 'lte', val });
    return this;
  }

  public lt(col: string, val: unknown) {
    this.filters.push({ col, op: 'lt', val });
    return this;
  }

  public like(col: string, pattern: string) {
    this.filters.push({ col, op: 'like', val: pattern });
    return this;
  }

  public ilike(col: string, pattern: string) {
    this.filters.push({ col, op: 'ilike', val: pattern });
    return this;
  }

  public order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  public limit(n: number) {
    this.limitCount = n;
    return this;
  }

  public range(from: number, to: number) {
    this.rangeBounds = [from, to];
    return this;
  }

  private normalizeOrder(o: Record<string, unknown>, snap: MockDatabaseSnapshot): Record<string, unknown> {
    const orderId = String(o.id || '');
    const items = snap.orderItems.filter(i => i.order_id === orderId).map(item => {
      const prod = snap.products.find(p => p.id === item.product_id);
      const unitPrice = Number(item.unit_price || 0);
      const quantity = Number(item.quantity || 1);
      const lineTotal = Number(item.line_total ?? item.total_price ?? (unitPrice * quantity));
      return {
        ...item,
        product_name: item.product_name || prod?.name || 'Sản phẩm Nexus',
        product_sku: item.product_sku || prod?.sku || 'NX-SKU',
        unit_price: unitPrice,
        quantity,
        line_total: lineTotal,
        total_price: lineTotal,
        unit_cost_mac_snapshot: item.unit_cost_mac_snapshot || prod?.cost_price || 0,
        is_free_gift: item.is_free_gift || false
      };
    });

    const subtotal = items.length > 0
      ? items.reduce((s, it) => s + it.line_total, 0)
      : Number(o.subtotal ?? o.total ?? o.total_amount ?? 0);
    const tax = Number(o.tax ?? 0);
    const shipping = Number(o.shipping ?? 0);
    const discount = Number(o.discount ?? 0);
    const total = Number(o.total ?? o.total_amount ?? (subtotal + tax + shipping - discount));
    const customer = snap.customers.find(c => c.id === o.customer_id) || snap.customers[0];

    return {
      ...o,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      total_amount: total,
      channel: o.channel || 'shopee',
      customer,
      order_items: items,
      items_count: items.length
    };
  }

  private getTableData(): Record<string, unknown>[] {
    const snap = mockStore.getSnapshot();

    // 1. Orders (Deep populated & Normalized)
    if (this.table === 'orders') {
      return snap.orders.map(o => this.normalizeOrder(o as unknown as Record<string, unknown>, snap));
    }

    // 2. Order Items (Deep populated)
    if (this.table === 'order_items') {
      return snap.orderItems.map(item => {
        const prod = snap.products.find(p => p.id === item.product_id);
        const unitPrice = Number(item.unit_price || 0);
        const quantity = Number(item.quantity || 1);
        const lineTotal = Number(item.line_total ?? item.total_price ?? (unitPrice * quantity));
        return {
          ...item,
          product_name: item.product_name || prod?.name || 'Sản phẩm Nexus',
          product_sku: item.product_sku || prod?.sku || 'NX-SKU',
          unit_price: unitPrice,
          quantity,
          line_total: lineTotal,
          total_price: lineTotal,
          product: prod || null
        };
      });
    }

    // 3. Synthetic Inventory Items (Always synced to inventory5State)
    if (this.table === 'inventory_items') {
      return snap.inventory5State.map(inv => {
        const prod = snap.products.find(p => p.id === inv.product_id || p.sku === inv.sku);
        const wh = snap.warehouses.find(w => w.id === inv.warehouse_id) || snap.warehouses[0];
        return {
          id: `inv_${inv.product_id}_${inv.warehouse_id}`,
          tenant_id: wh?.tenant_id,
          warehouse_id: wh?.id || 'wh_north_01',
          product_id: prod?.id || inv.product_id,
          physical_qty: inv.physical,
          reserved_qty: inv.reserved,
          available_qty: inv.available,
          unavailable_qty: (inv.pending_qc || 0) + (inv.damaged || 0),
          pending_qc_qty: inv.pending_qc || 0,
          damaged_qty: inv.damaged || 0,
          in_transit_qty: inv.in_transit || 0,
          incoming_qty: inv.inbound || inv.incoming || 0,
          updated_at: new Date().toISOString(),
          warehouses: wh,
          products: prod ? { id: prod.id, name: prod.name, sku: prod.sku, safety_stock: prod.safety_stock || 10 } : { id: inv.product_id, name: inv.name, sku: inv.sku, safety_stock: 10 }
        };
      });
    }

    // 4. Fulfillment / Picking Waves
    if (this.table === 'fulfillment_waves' || this.table === 'picking_waves') {
      const defaultWh = snap.warehouses[0] || { id: 'wh_north_01', name: 'Tổng kho Miền Bắc (Bắc Ninh)' };
      return snap.pickingWaves.map(w => {
        const matchingOrders = snap.orders
          .filter(o => o.fulfillment_wave_id === w.id || (w.status === 'picking' && o.status === 'processing'))
          .slice(0, 5)
          .map(o => this.normalizeOrder(o as unknown as Record<string, unknown>, snap));
        const wh = snap.warehouses.find(item => item.id === w.warehouse_id) || defaultWh;
        const totalItems = w.total_items || (matchingOrders.length ? matchingOrders.length * 2 : 6);
        const pickedItems = w.picked_items || (w.status === 'completed' ? totalItems : Math.floor(totalItems * 0.85));
        return {
          ...w,
          wave_code: w.wave_code || w.wave_number || 'WAVE-W410',
          warehouse_id: w.warehouse_id || wh.id,
          warehouse: wh,
          must_ship_by_sla: w.must_ship_by_sla || new Date(Date.now() + 18 * 3600000).toISOString(),
          created_at: w.created_at || new Date().toISOString(),
          orders: matchingOrders,
          order_count: matchingOrders.length || w.total_orders || 1,
          total_items: totalItems,
          picked_items: pickedItems
        };
      });
    }

    // 5. Return Requests / Returns
    if (this.table === 'return_requests' || this.table === 'returns') {
      return snap.returns.map(r => {
        const rawOrd = snap.orders.find(o => o.id === r.order_id);
        const ord = rawOrd ? this.normalizeOrder(rawOrd as unknown as Record<string, unknown>, snap) : null;
        return {
          ...r,
          id: r.id,
          return_number: r.return_number,
          order_id: r.order_id,
          rma_branch: r.rma_branch || 'refund',
          is_refund_without_return: Boolean(r.is_refund_without_return),
          qc_notes: r.qc_notes || '',
          maker_checker_rule: r.maker_checker_rule || (Number(r.refund_amount) >= 1000000 ? 'Bắt buộc Checker duyệt (>= 1M)' : 'Maker duyệt trực tiếp (< 1M)'),
          return_type: r.return_type || 'customer_rma',
          status: r.status || 'pending',
          refund_amount: Number(r.refund_amount ?? 1250000),
          reason: r.reason || 'Khách muốn đổi sang sản phẩm khác',
          approval_status: r.approval_status || (r.status === 'refunded' ? 'checker_approved' : 'pending'),
          order: ord,
          created_at: r.created_at,
          updated_at: r.updated_at
        };
      });
    }

    // 6. Stock Transactions / Stock Ledger
    if (this.table === 'stock_transactions' || this.table === 'stock_ledger') {
      return snap.stockLedger.map(sl => {
        const prod = snap.products.find(p => p.id === sl.product_id) || snap.products[0];
        const wh = snap.warehouses.find(w => w.id === sl.warehouse_id) || snap.warehouses[0];
        return {
          ...sl,
          type: sl.transaction_type || 'inbound',
          product: prod ? { id: prod.id, name: prod.name, sku: prod.sku } : null,
          warehouse: wh
        };
      });
    }

    if (this.table === 'purchase_orders') {
      return (snap.purchaseOrders || []).map(po => ({ ...po,
        warehouse: snap.warehouses.find(w => w.id === po.warehouse_id),
        purchase_order_items: (snap.purchaseOrderItems || []).filter(i => i.po_id === po.id).map(i => ({ ...i, product: snap.products.find(p => p.id === i.product_id) }))
      }));
    }

    // 7. Channel SKU Mappings (With Product join)
    if (this.table === 'channel_sku_mappings') {
      const mappings = mockStore.getTableData('channel_sku_mappings');
      return mappings.map(m => {
        const prod = snap.products.find(p => p.id === m.product_id);
        return {
          ...m,
          internal_product: prod,
          product: prod
        };
      });
    }

    // 8. Buffer Rules (With Warehouse and Product join)
    if (this.table === 'buffer_rules') {
      const rules = mockStore.getTableData('buffer_rules');
      return rules.map(r => {
        const wh = snap.warehouses.find(w => w.id === r.warehouse_id);
        const prod = snap.products.find(p => p.id === r.product_id);
        return {
          ...r,
          warehouse: wh,
          product: prod
        };
      });
    }

    // 9. Routing Rules (With Warehouse join)
    if (this.table === 'routing_rules') {
      const rules = mockStore.getTableData('routing_rules');
      return rules.map(r => {
        const wh = snap.warehouses.find(w => w.id === r.preferred_warehouse_id);
        return {
          ...r,
          warehouse: wh
        };
      });
    }

    // 10. Purchase Orders (With Warehouse and Items join)
    if (this.table === 'purchase_orders') {
      const orders = mockStore.getTableData('purchase_orders');
      const allItems = mockStore.getTableData('purchase_order_items');
      return orders.map(po => {
        const wh = snap.warehouses.find(w => w.id === po.warehouse_id);
        const items = allItems.filter(i => i.po_id === po.id).map(i => ({
          ...i,
          product: snap.products.find(p => p.id === i.product_id)
        }));
        return {
          ...po,
          warehouse: wh,
          purchase_order_items: items
        };
      });
    }

    // 11. Webhook Delivery Logs (With Webhook join)
    if (this.table === 'webhook_delivery_logs') {
      const logs = mockStore.getTableData('webhook_delivery_logs');
      const webhooks = mockStore.getTableData('outbound_webhooks');
      return logs.map(l => {
        const wh = webhooks.find(w => w.id === l.webhook_id);
        return {
          ...l,
          webhook: wh
        };
      });
    }

    // 12. Ledger Accounts & Journal Entries
    if (this.table === 'ledger_accounts') {
      return DEFAULT_LEDGER_ACCOUNTS.map(a => ({ ...a }));
    }

    if (this.table === 'journal_entries') {
      return snap.journalEntries.map(j => ({
        ...j,
        event_source: (j as unknown as Record<string, string>).event_source || (j as unknown as Record<string, string>).reference_type || 'order_sale',
        reference_id: j.reference_id || null,
        description: j.description || 'Hạch toán tự động nghiệp vụ bán hàng',
        posted_at: j.posted_at || j.created_at || new Date().toISOString()
      }));
    }

    if (this.table === 'journal_lines') {
      return snap.journalLines.map(jl => {
        const acc = DEFAULT_LEDGER_ACCOUNTS.find(a => a.id === jl.account_id || a.account_code === (jl as unknown as Record<string, string>).account_code) || DEFAULT_LEDGER_ACCOUNTS[0];
        return {
          ...jl,
          journal_entry_id: (jl as unknown as Record<string, string>).journal_entry_id || (jl as unknown as Record<string, string>).entry_id || 'je_89021',
          debit_amount: Number((jl as unknown as Record<string, number>).debit_amount ?? (jl as unknown as Record<string, number>).debit ?? 0),
          credit_amount: Number((jl as unknown as Record<string, number>).credit_amount ?? (jl as unknown as Record<string, number>).credit ?? 0),
          account: acc
        };
      });
    }

    // 13. Order Fee Breakdowns (Reconciliation)
    if (this.table === 'order_fee_breakdowns') {
      const existing = mockStore.getTableData('order_fee_breakdowns');
      if (existing.length > 0) {
        return existing.map(item => {
          const rawOrd = snap.orders.find(o => o.id === item.order_id);
          return {
            ...item,
            order: rawOrd ? this.normalizeOrder(rawOrd as unknown as Record<string, unknown>, snap) : null
          };
        });
      }
      return []; // No fabricated fee rows when source evidence is missing.
    }

    // 14. Margin Config
    if (this.table === 'margin_config') {
      return [
        {
          id: 'mc_default',
          tenant_id: snap.activeTenantId,
          min_margin_percent: 15,
          max_loss_per_order: 500000,
          circuit_breaker_enabled: true,
          auto_zero_stock_on_trigger: false,
          updated_at: new Date().toISOString()
        }
      ];
    }

    // 15. Default mockStore.getTableData for other recognized tables
    return mockStore.getTableData(this.table);
  }

  private applyFilters(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    let result = rows.filter(row => mockStore.canReadTableRow(this.table, row));
    const snap = mockStore.getSnapshot();

    for (const f of this.filters) {
      if (f.op === 'eq') {
        if (f.col === 'tenant_id' && (f.val === undefined || f.val === null || f.val === '')) {
          result = result.filter(r => r.tenant_id === snap.activeTenantId || !r.tenant_id);
        } else {
          result = result.filter(r => r[f.col] === f.val);
        }
      } else if (f.op === 'neq') {
        result = result.filter(r => r[f.col] !== f.val);
      } else if (f.op === 'in') {
        const arr = Array.isArray(f.val) ? f.val : [];
        result = result.filter(r => arr.includes(r[f.col]));
      } else if (f.op === 'is') {
        if (f.val === null) {
          result = result.filter(r => r[f.col] == null);
        } else {
          result = result.filter(r => r[f.col] === f.val);
        }
      } else if (f.op === 'not') {
        if (f.subOp === 'is') {
          if (f.val === null) {
            result = result.filter(r => r[f.col] != null);
          } else {
            result = result.filter(r => r[f.col] !== f.val);
          }
        }
      } else if (f.op === 'gte') {
        result = result.filter(r => {
          const val = r[f.col];
          if (val == null) return false;
          return (val as string | number) >= (f.val as string | number);
        });
      } else if (f.op === 'gt') {
        result = result.filter(r => {
          const val = r[f.col];
          if (val == null) return false;
          return (val as string | number) > (f.val as string | number);
        });
      } else if (f.op === 'lte') {
        result = result.filter(r => {
          const val = r[f.col];
          if (val == null) return false;
          return (val as string | number) <= (f.val as string | number);
        });
      } else if (f.op === 'lt') {
        result = result.filter(r => {
          const val = r[f.col];
          if (val == null) return false;
          return (val as string | number) < (f.val as string | number);
        });
      } else if (f.op === 'like' || f.op === 'ilike') {
        const cleanPattern = f.val.replace(/%/g, '').toLowerCase();
        result = result.filter(r => {
          const val = String(r[f.col] ?? '').toLowerCase();
          return val.includes(cleanPattern);
        });
      }
    }

    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      result.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA == null) return asc ? -1 : 1;
        if (valB == null) return asc ? 1 : -1;
        if (valA < valB) return asc ? -1 : 1;
        return asc ? 1 : -1;
      });
    }

    if (this.rangeBounds) {
      const [from, to] = this.rangeBounds;
      result = result.slice(from, to + 1);
    } else if (this.limitCount != null) {
      result = result.slice(0, this.limitCount);
    }

    return result;
  }

  public async then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    await mockStore.delay(20);
    if (!mockStore.isTableSupported(this.table)) {
      const res = { data: null, error: { message: `Table "${this.table}" not found in schema`, code: 'PGRST100' } };
      return Promise.resolve(res).then(onfulfilled, onrejected);
    }
    const rows = this.getTableData();
    const filtered = this.applyFilters(rows);
    const res = { data: filtered, error: null };
    return Promise.resolve(res).then(onfulfilled, onrejected);
  }

  public async single() {
    await mockStore.delay(20);
    if (!mockStore.isTableSupported(this.table)) {
      return { data: null, error: { message: `Table "${this.table}" not found in schema`, code: 'PGRST100' } };
    }
    const rows = this.getTableData();
    const filtered = this.applyFilters(rows);
    return { data: filtered[0] || null, error: filtered.length === 0 ? { message: 'Row not found' } : null };
  }

  public async maybeSingle() {
    await mockStore.delay(20);
    if (!mockStore.isTableSupported(this.table)) {
      return { data: null, error: { message: `Table "${this.table}" not found in schema`, code: 'PGRST100' } };
    }
    const rows = this.getTableData();
    const filtered = this.applyFilters(rows);
    return { data: filtered[0] || null, error: null };
  }

  public insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    const table = this.table;
    const items = Array.isArray(payload) ? payload : [payload];

    if (!mockStore.isTableSupported(table)) {
      const err = { message: `Table "${table}" not found in schema`, code: 'PGRST100' };
      const errBuilder = {
        select: () => errBuilder,
        single: async () => ({ data: null, error: err }),
        maybeSingle: async () => ({ data: null, error: err }),
        then: (onfulfilled?: any, onrejected?: any) => Promise.resolve({ data: null, error: err }).then(onfulfilled, onrejected)
      };
      return errBuilder;
    }

    let inserted: Record<string, unknown>[] | null = null;
    let insertError: { message: string; code: string } | null = null;
    const executeInsert = async () => {
      if (inserted === null) {
        await mockStore.delay(20);
        try { inserted = mockStore.insertTable(table, items); }
        catch (e) { inserted = []; insertError = { message: (e as Error).message, code: '42501' }; }
      }
      return inserted;
    };

    const builder = {
      select: (_fields?: string) => builder,
      single: async () => {
        const rows = await executeInsert();
        return { data: rows[0] || null, error: insertError };
      },
      maybeSingle: async () => {
        const rows = await executeInsert();
        return { data: rows[0] || null, error: insertError };
      },
      then: async (onfulfilled?: any, onrejected?: any) => {
        const rows = await executeInsert();
        return Promise.resolve({ data: rows, error: insertError }).then(onfulfilled, onrejected);
      }
    };
    return builder;
  }

  public update(payload: Record<string, unknown>) {
    const table = this.table;
    const updateFilters: FilterOp[] = [...this.filters];

    const builder = {
      eq: (col: string, val: unknown) => {
        updateFilters.push({ col, op: 'eq', val });
        return builder;
      },
      neq: (col: string, val: unknown) => {
        updateFilters.push({ col, op: 'neq', val });
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        updateFilters.push({ col, op: 'in', val: vals });
        return builder;
      },
      select: (_fields?: string) => builder,
      single: async () => {
        const res = await builder.execute();
        return { data: (res.data as any[])?.[0] || payload, error: res.error };
      },
      maybeSingle: async () => {
        const res = await builder.execute();
        return { data: (res.data as any[])?.[0] || payload, error: res.error };
      },
      execute: async () => {
        await mockStore.delay(20);
        if (!mockStore.isTableSupported(table)) {
          return { data: null, error: { message: `Table "${table}" not found in schema`, code: 'PGRST100' } };
        }
        const predicate = (item: Record<string, unknown>) => {
          for (const f of updateFilters) {
            if (f.op === 'eq' && item[f.col] !== f.val) return false;
            if (f.op === 'neq' && item[f.col] === f.val) return false;
            if (f.op === 'in' && Array.isArray(f.val) && !f.val.includes(item[f.col])) return false;
          }
          return true;
        };
        try { mockStore.updateTable(table, predicate, payload); }
        catch (e) { return { data: null, error: { message: (e as Error).message, code: '42501' } }; }

        return { data: [payload], error: null };
      },
      then: async (onfulfilled?: any, onrejected?: any) => {
        const res = await builder.execute();
        return Promise.resolve(res).then(onfulfilled, onrejected);
      }
    };
    return builder;
  }

  public delete() {
    const table = this.table;
    const deleteFilters: FilterOp[] = [...this.filters];

    const builder = {
      eq: (col: string, val: unknown) => {
        deleteFilters.push({ col, op: 'eq', val });
        return builder;
      },
      neq: (col: string, val: unknown) => {
        deleteFilters.push({ col, op: 'neq', val });
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        deleteFilters.push({ col, op: 'in', val: vals });
        return builder;
      },
      execute: async () => {
        await mockStore.delay(20);
        if (!mockStore.isTableSupported(table)) {
          return { data: null, error: { message: `Table "${table}" not found in schema`, code: 'PGRST100' } };
        }
        const predicate = (item: Record<string, unknown>) => {
          for (const f of deleteFilters) {
            if (f.op === 'eq' && item[f.col] !== f.val) return false;
            if (f.op === 'neq' && item[f.col] === f.val) return false;
            if (f.op === 'in' && Array.isArray(f.val) && !f.val.includes(item[f.col])) return false;
          }
          return true;
        };
        try { mockStore.deleteTable(table, predicate); }
        catch (e) { return { data: null, error: { message: (e as Error).message, code: '42501' } }; }
        return { data: null, error: null };
      },
      then: async (onfulfilled?: any, onrejected?: any) => {
        const res = await builder.execute();
        return Promise.resolve(res).then(onfulfilled, onrejected);
      }
    };
    return builder;
  }
}

export const mockSupabaseClient = {
  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  },
  rpc(fnName: string, params: Record<string, unknown> = {}) {
    return {
      async then(resolve: (val: { data: unknown; error: { code?: string; message: string } | null }) => void) {
        await mockStore.delay(25);
        const snap = mockStore.getSnapshot();
        if (!mockStore.getExecutionContext() || (params.p_tenant_id && params.p_tenant_id !== snap.activeTenantId)) { resolve({ data: null, error: { message: 'Session hoặc tenant không hợp lệ', code: '42501' } }); return; }
        snap.orders = mockStore.getOrders(); snap.inventory5State = mockStore.getInventory5State();
        if (fnName === 'admin_create_user' || fnName === 'admin_update_profile') {
          const result = fnName === 'admin_create_user'
            ? mockStore.createDemoUser(String(params.p_email || ''), String(params.p_full_name || ''), params.p_role as import('@/types').TenantRole)
            : mockStore.updateDemoUser(String(params.p_user_id || ''), params.p_role as import('@/types').TenantRole, params.p_is_active === true);
          resolve({ data: result.success ? result : null, error: result.success ? null : { message: result.error || 'Không có quyền' } }); return;
        }
        if (fnName === 'verify_inventory_consistency') {
          if (mockStore.authorize('inventory:view', { tenant_id: snap.activeTenantId })) { resolve({ data: null, error: { message: 'Không có quyền xem tồn' } }); return; }
          const issues = snap.inventory5State.filter(i => [i.physical, i.reserved, i.available, i.pending_qc, i.damaged].some(n => n < 0) || i.available !== i.physical - i.reserved - i.pending_qc - i.damaged || i.available !== i.sellable).map(i => ({ product_id: i.product_id, sku: i.sku, issue: 'Vi phạm bất biến tồn 5 trạng thái' }));
          resolve({ data: issues, error: null }); return;
        }

        // 1. Dashboard Metrics (Fully Computed from Valid Orders)
        if (fnName === 'get_dashboard_metrics') {
          const nonCancelledOrders = snap.orders.filter(o => o.status !== 'cancelled');
          const recognizedRevenue = nonCancelledOrders
            .filter(o => o.status === 'shipped' || o.status === 'delivered')
            .reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);
          
          const collectedCash = snap.orders
            .filter(o => o.payment_status === 'paid' && o.status !== 'cancelled')
            .reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);

          const refundAmount = snap.returns
            .filter(r => r.status === 'refunded')
            .reduce((sum, r) => sum + Number(r.refund_amount || 1250000), 0);

          const revenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);

          resolve({
            data: {
              revenue,
              prev_revenue: Math.round(revenue * 0.85),
              recognized_revenue: recognizedRevenue,
              collected_cash: collectedCash,
              refund_amount: refundAmount,
              total_orders: snap.orders.length,
              recent_orders_count: snap.orders.length,
              pending_orders: snap.orders.filter(o => o.status === 'pending' || o.status === 'processing').length,
              active_customers: snap.customers.length,
              total_customers: snap.customers.length,
              total_products: snap.products.length,
              low_stock_count: snap.products.filter(p => p.stock <= (p.safety_stock || 15)).length,
              status_counts: {
                pending: snap.orders.filter(o => o.status === 'pending').length,
                processing: snap.orders.filter(o => o.status === 'processing').length,
                shipped: snap.orders.filter(o => o.status === 'shipped').length,
                delivered: snap.orders.filter(o => o.status === 'delivered').length,
                cancelled: snap.orders.filter(o => o.status === 'cancelled').length,
                refunded: snap.orders.filter(o => o.status === 'refunded').length,
              }
            },
            error: null
          });
          return;
        }

        // 2. Dashboard Daily Revenue (7 Days Array Calculated Directly from Real Orders)
        if (fnName === 'get_dashboard_daily') {
          const daily: Array<{ day: string; revenue: number; order_count: number }> = [];
          const now = new Date();
          
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const dayStr = `${y}-${m}-${dayNum}`;

            // Filter real orders placed on this date (excluding cancelled)
            const matchedOrders = snap.orders.filter(o => {
              if (o.status === 'cancelled') return false;
              const oDate = new Date(o.placed_at || o.created_at);
              const oDayStr = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}`;
              return oDayStr === dayStr;
            });

            const rev = matchedOrders.reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);
            daily.push({
              day: dayStr,
              revenue: rev,
              order_count: matchedOrders.length
            });
          }

          resolve({ data: daily, error: null });
          return;
        }

        // 3. Sales By Channel (Accurately Summed from Orders)
        if (fnName === 'get_sales_by_channel') {
          const channels = ['shopee', 'tiktok', 'lazada', 'website'] as const;
          const result = channels.map(ch => {
            const chOrders = snap.orders.filter(o => o.channel === ch && o.status !== 'cancelled');
            const rev = chOrders.reduce((sum, o) => sum + Number(o.total || o.total_amount || 0), 0);
            return {
              channel: ch,
              total_sales: rev,
              order_count: chOrders.length
            };
          });

          resolve({ data: result, error: null });
          return;
        }

        // 4. Low Stock Alerts
        if (fnName === 'get_low_stock_alerts') {
          const lowStock = snap.inventory5State
            .filter(i => i.available <= i.reorder_level || i.available <= i.safety_stock)
            .map(i => {
              const p = snap.products.find(prod => prod.id === i.product_id);
              const w = snap.warehouses.find(wh => wh.id === i.warehouse_id);
              return {
                product_id: i.product_id,
                sku: i.sku,
                product_name: i.name,
                warehouse_name: w?.name || i.warehouse_name,
                stock: i.available,
                reorder_level: i.reorder_level,
                safety_stock: i.safety_stock,
                cost_price: p?.cost_price || 0,
                price: p?.price || 0
              };
            });
          resolve({ data: lowStock, error: null });
          return;
        }

        // 5. Sequence Generators
        if (fnName === 'next_order_number') {
          resolve({ data: `ORD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`, error: null });
          return;
        }

        if (fnName === 'next_rma_number') {
          resolve({ data: `RMA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`, error: null });
          return;
        }

        if (fnName === 'next_journal_entry_number') {
          resolve({ data: `JE-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`, error: null });
          return;
        }

        // 6. Audit Chain Verification
        if (fnName === 'verify_audit_chain') {
          resolve({ data: null, error: { message: 'Mock lưu lịch sử thao tác, chưa triển khai chuỗi băm', code: '42883' } });
          return;
        }

        // 7. Atomic Business Mutations
        if (fnName === 'place_order_atomic') {
          const rawItems = (params.p_items as Array<{ product_id: string; product_name?: string; product_sku?: string; quantity: number; unit_price: number }>) || [];
          const items = rawItems.map(i => {
            const prod = snap.products.find(p => p.id === i.product_id);
            return {
              product_id: i.product_id,
              sku: prod?.sku || i.product_sku || 'NX-SKU',
              quantity: Number(i.quantity || 1),
              unit_price: Number(i.unit_price || prod?.price || 0)
            };
          });

          const total = Number(params.p_total) || items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
          const subtotal = Number(params.p_subtotal) || total;
          const tax = Number(params.p_tax) || 0;
          const shipping = Number(params.p_shipping) || 0;
          const discount = Number(params.p_discount) || 0;

          const res = mockStore.placeOrderAtomic(
            {
              tenant_id: (params.p_tenant_id as string) || snap.activeTenantId,
              order_number: (params.p_order_number as string) || `ORD-${Date.now()}`,
              customer_id: (params.p_customer_id as string) || snap.customers[0]?.id || 'cust_01',
              status: (params.p_status as unknown as Order['status']) || 'pending',
              payment_status: (params.p_payment_status as unknown as Order['payment_status']) || 'paid',
              subtotal,
              tax,
              shipping,
              discount,
              total,
              total_amount: total,
              channel: 'website',
              notes: (params.p_notes as string) || null,
              shipping_address: (params.p_shipping_address as string) || null,
              placed_at: new Date().toISOString()
            },
            items
          );

          if (!res.success) {
            resolve({ data: null, error: { message: res.error || 'Lỗi khóa tồn nguyên tử' } });
            return;
          }

          resolve({ data: { success: true, order_id: res.orderId }, error: null });
          return;
        }

        if (fnName === 'cancel_order_atomic') {
          const res = mockStore.cancelOrderAtomic(params.p_order_id as string, (params.p_reason as string) || 'Hủy theo yêu cầu');
          if (!res.success) {
            resolve({ data: null, error: { message: res.error || 'Lỗi hủy đơn' } });
            return;
          }
          resolve({ data: { success: true }, error: null });
          return;
        }

        if (fnName === 'process_return_restock_atomic') {
          const res = mockStore.inspectReturnQC(params.p_return_id as string, params.p_is_good !== false);
          resolve({ data: res.success ? { success: true } : null, error: res.success ? null : { message: res.error || 'QC bị từ chối' } });
          return;
        }

        if (fnName === 'post_journal_entry_atomic') {
          resolve({ data: null, error: { message: 'Dùng business command postJournalEntry với bút toán cân đối', code: '42883' } });
          return;
        }

        resolve({ data: null, error: { message: `RPC ${fnName} chưa được triển khai trong mock`, code: '42883' } });
      }
    };
  },
  auth: {
    async getSession() {
      const snap = mockStore.getSnapshot();
      const ctx = mockStore.getExecutionContext();
      const profile = snap.profiles.find(p => p.id === ctx?.userId);
      return { data: { session: ctx && profile ? { user: { id: profile.id, email: profile.email }, access_token: 'mock-prototype-token', expires_at: 9999999999 } : null }, error: null };
    },
    async signInWithPassword({ email }: { email: string }) {
      const result = mockStore.signInDemoUser(email);
      return { data: { user: result.success ? { id: result.userId, email } : null }, error: result.success ? null : { message: result.error } };
    },
    async signUp({ email }: { email: string }) {
      await mockStore.delay(50);
      return { data: { user: { id: `usr_${Date.now()}`, email } }, error: null };
    },
    async signOut() {
      mockStore.signOutDemoUser();
      await mockStore.delay(30);
      return { error: null };
    },
    onAuthStateChange(cb: (event: string, session: unknown) => void) {
      const ctx = mockStore.getExecutionContext();
      cb(ctx ? 'SIGNED_IN' : 'SIGNED_OUT', ctx ? { user: { id: ctx.userId } } : null);
      return { data: { subscription: { unsubscribe() {} } } };
    }
  }
};
