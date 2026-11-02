import type { MockDatabaseSnapshot } from './types';

/** Isolated acceptance fixture. Values are specified by the business handover, not computed by the engine. */
export function commerceFixture(base: MockDatabaseSnapshot, variant: 'core' | 'partial' = 'core'): MockDatabaseSnapshot {
  const state = structuredClone(base);
  state.snapshotId = 'RAM-X-ACCEPTANCE';
  state.activeTenantId = 'tenant_flagship';
  state.activeRole = 'owner'; state.activeUserId = 'usr_owner_01';
  state.orders = []; state.orderItems = []; state.returns = []; state.returnItems = [];
  state.returnReceipts = []; state.orderFeeBreakdowns = []; state.auditLogs = []; state.stockLedger = [];
  state.journalEntries = []; state.journalLines = []; state.customerComplaints = [];
  state.pickingWaves = []; state.processedCommands = {}; state.sourceVersions = {};
  state.handoffAssignments = {}; state.growthRecommendations = [];
  state.purchaseOrders = []; state.purchaseOrderItems = []; state.transfers = [];
  state.products = [{ ...state.products[0], id: 'ram-x', sku: 'RAM-X', name: 'RAM-X', cost_price: 600000, moving_avg_cost: 600000, cost: 600000, price: 1000000, stock: 10 }];
  state.inventory5State = [{ ...state.inventory5State[0], product_id: 'ram-x', sku: 'RAM-X', name: 'RAM-X', warehouse_id: 'wh_north_01', physical: 10, reserved: 0, available: 10, sellable: 10, pending_qc: 0, damaged: 0, unavailable: 0, inbound: 0, incoming: 0, in_transit: 0 }];
  const now = new Date().toISOString();
  const channels = ['shopee', 'tiktok', 'lazada'] as const;
  state.channelConnections = channels.map((channel, i) => ({ ...state.channelConnections![i], id: `acceptance-connection-${i}`, channel, shop_id: `acceptance-shop-${i}`, status: i === 0 ? 'error' : 'connected', last_sync_at: null }));
  state.channelSkuMappings = channels.map((channel, i) => ({ ...state.channelSkuMappings![0], id: `acceptance-map-${i}`, channel, product_id: 'ram-x', channel_sku_id: 'RAM-X', channel_shop_id: `acceptance-shop-${i}`, tenant_id: state.activeTenantId }));
  state.marketplaceEvents = ['A', 'B', 'C'].map((name, i) => {
    const order = {
      id: `acceptance-${name}`, tenant_id: state.activeTenantId, shop_id: `acceptance-shop-${i}`, order_number: name,
      customer_id: null, status: 'pending' as const, channel: channels[i], channel_order_sn: `SOURCE-${name}`,
      subtotal: 1000000, total: 1000000, tax: 0, shipping: 0, discount: 0, payment_status: 'paid' as const,
      assigned_warehouse_id: 'wh_north_01', placed_at: now, created_at: now, updated_at: now,
      ads_spend: 100000, ads_credit: 0, source_ads_revenue: 1000000, packaging_cost: 0,
      must_ship_by_sla: new Date(Date.now() + 86400000).toISOString(), raw_source_status: 'DEMO_NEW',
      notes: 'Fixture demo; SLA và phí giả lập, không phải chính sách sàn', settlement_status: 'pending' as const,
    };
    const item = { id: `acceptance-item-${name}`, order_id: order.id, product_id: 'ram-x', product_name: 'RAM-X', product_sku: 'RAM-X', quantity: 1,
      unit_price: 1000000, line_total: 1000000, unit_cost_mac_snapshot: 600000, parent_bundle_product_id: null, serial_numbers: null, is_free_gift: false, created_at: now };
    return { id: `acceptance-event-${name}`, tenant_id: state.activeTenantId, shop_id: order.shop_id, status: 'pending' as const, order, items: [item] };
  });
  if (variant === 'partial') {
    state.purchaseOrders = [{ id: 'acceptance-po', po_number: 'PO-ACCEPTANCE', warehouse_id: 'wh_north_01', supplier_name: 'Nhà cung cấp demo', status: 'ordered', total_amount: 3600000, created_at: now }];
    state.purchaseOrderItems = [{ id: 'acceptance-po-item', po_id: 'acceptance-po', product_id: 'ram-x', quantity: 4, received_qty: 0, unit_cost: 900000, created_at: now }];
    state.snapshotId = 'RAM-X-PARTIAL-ACCEPTANCE';
    state.marketplaceEvents = state.marketplaceEvents.slice(0, 1);
    const event = state.marketplaceEvents[0];
    event.order.total = event.order.subtotal = 3000000;
    event.items[0].quantity = 2; event.items[0].line_total = 2000000;
    state.products.push({ ...state.products[0], id: 'second', sku: 'SECOND', name: 'SECOND serial', cost_price: 400000, cost: 400000, moving_avg_cost: 400000, stock: 5 });
    state.inventory5State.push({ ...state.inventory5State[0], product_id: 'second', sku: 'SECOND', name: 'SECOND serial', physical: 5, available: 5, sellable: 5 });
    event.items.push({ ...event.items[0], id: 'acceptance-item-SECOND', product_id: 'second', product_sku: 'SECOND', product_name: 'SECOND serial', quantity: 1, line_total: 1000000, unit_cost_mac_snapshot: 400000, serial_numbers: ['SERIAL-SECOND'] });
    state.channelSkuMappings!.push({ ...state.channelSkuMappings![0], id: 'second-map', product_id: 'second', channel_sku_id: 'SECOND' });
  }
  return state;
}
