import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockStore } from '@/mock/store';
import { commerceSummary } from '@/mock/commerceMetrics';
import { workQueue } from '@/mock/workQueue';
import { analyticsService } from '@/analytics/analyticsService';
import { supabase } from '@/lib/supabase';

const ok = (r: { success: boolean; error?: string }) => expect(r, r.error).toMatchObject({ success: true });
const stock = () => {
  const i = mockStore.getInventory5State()[0];
  return [i.physical, i.reserved, i.pending_qc, i.available];
};
function ingest() {
  mockStore.setActiveRole('admin');
  mockStore.updateTable('channel_connections', () => true, { status: 'connected' });
  for (const name of ['A', 'B', 'C']) ok(mockStore.retryMarketplaceEvent(`acceptance-event-${name}`));
  mockStore.setActiveRole('manager');
}
function reserve() { ingest(); for (const name of ['A', 'B', 'C']) ok(mockStore.releaseToWarehouse(`acceptance-${name}`)); }
function pack() {
  reserve(); mockStore.setActiveRole('warehouse');
  for (const name of ['A', 'B', 'C']) {
    ok(mockStore.prepareOrder(`acceptance-${name}`, 'pick', ['RAM-X']));
    ok(mockStore.prepareOrder(`acceptance-${name}`, 'pack'));
  }
}
function deliverAndReturn() {
  pack();
  ok(mockStore.dispatchOrder('acceptance-A', 'TRACK-A')); ok(mockStore.dispatchOrder('acceptance-C', 'TRACK-C'));
  expect(stock()).toEqual([8, 1, 0, 7]);
  expect(workQueue(mockStore.getSnapshot(), 'warehouse').filter(t => t.step === 'prepare')).toHaveLength(1);
  mockStore.setActiveRole('manager');
  ok(mockStore.requestCancellation('acceptance-B'));
  mockStore.setActiveRole('warehouse'); expect(mockStore.dispatchOrder('acceptance-B', 'TRACK-B').success).toBe(false);
  mockStore.setActiveRole('manager'); ok(mockStore.cancelOrderAtomic('acceptance-B', 'Source cancellation accepted'));
  expect(stock()).toEqual([8, 0, 0, 8]);
  ok(mockStore.recordSourceEvent('acceptance-A', { id: 'delivered-A', version: 2, type: 'delivered' }));
  ok(mockStore.recordSourceEvent('acceptance-C', { id: 'failed-C', version: 2, type: 'failed' }));
  expect(stock()).toEqual([8, 0, 0, 8]); // failed delivery is not a warehouse receipt
  mockStore.setActiveRole('warehouse');
  ok(mockStore.receiveReturnDock('return-acceptance-C', undefined, undefined, undefined, { receiptId: 'receipt-C' }));
  expect(stock()).toEqual([9, 0, 1, 8]);
  ok(mockStore.inspectReturnQC('return-acceptance-C', true, undefined, undefined, undefined, { inspectionId: 'qc-C' }));
  expect(stock()).toEqual([9, 0, 0, 9]);
  expect(workQueue(mockStore.getSnapshot(), 'warehouse')).toHaveLength(0);
  mockStore.setActiveRole('manager');
  for (const [name, fee] of [['A', 100000], ['B', 0], ['C', 60000]] as const) {
    ok(mockStore.recordSourceFees(`acceptance-${name}`, fee, `source-fee-${name}`));
    ok(mockStore.reconcileFeeBreakdown(`fee-acceptance-${name}`));
  }
}

describe('Isolated RAM-X business acceptance, VND', () => {
  beforeEach(() => { mockStore.resetToBaseline(); ok(mockStore.loadAcceptanceFixture()); });

  it('matches every inventory checkpoint, role queue and A/B/C contribution independently', () => {
    reserve(); expect(stock()).toEqual([10, 3, 0, 7]);
    mockStore.resetToBaseline(); ok(mockStore.loadAcceptanceFixture());
    deliverAndReturn();
    const summary = commerceSummary(mockStore.getSnapshot());
    expect(summary.rows.map(r => r.contribution)).toEqual([180000, -120000, -180000]);
    expect(summary).toMatchObject({ sales: 1000000, adsSpend: 300000, contribution: -120000 });
    expect(summary.retainedRevenueRatio).toBeCloseTo(3.333333, 5);
    expect(summary.sourceRatio).toBe(10);
    expect(analyticsService.getOrderEconomics().reduce((s, o) => s + o.cm3, 0)).toBe(-120000);
    expect(analyticsService.getSkuEconomics().reduce((s, p) => s + p.totalContribution, 0)).toBe(-120000);
    expect(analyticsService.getChannelEconomics().reduce((s, p) => s + p.cm3, 0)).toBe(-120000);
    ok(mockStore.recordSourceEvent('acceptance-C', { id: 'ads-credit-C', version: 1, type: 'ads_credit', amount: 40000 }));
    const after = commerceSummary(mockStore.getSnapshot());
    expect(after).toMatchObject({ netAds: 260000, contribution: -80000, sales: 1000000 });
    expect(after.retainedRevenueRatio).toBeCloseTo(3.8461538, 6);
    expect(workQueue(mockStore.getSnapshot(), 'manager').some(t => t.step === 'settlement' && t.orderId === 'acceptance-C')).toBe(true);
  });

  it('receives multiple batches, mixed QC and replays receipts without any partial failed write', () => {
    ingest();
    (mockStore as any).mutate((s: any) => {
      s.returns.push({ id: 'r-partial', tenant_id: 'tenant_flagship', order_id: 'acceptance-A', warehouse_id: 'wh_north_01', return_number: 'PARTIAL', status: 'approved' });
      s.returnItems.push({ id: 'ri-partial', return_id: 'r-partial', product_id: 'ram-x', quantity: 3 });
    }, 'DATABASE_RESET');
    mockStore.setActiveRole('warehouse');
    const receive = (qty: number, id: string) => mockStore.receiveReturnDock('r-partial', [{ item_id: 'ri-partial', received_qty: qty }], undefined, undefined, { receiptId: id });
    ok(receive(2, 'r1')); ok(receive(2, 'r1'));
    expect(stock()).toEqual([12, 0, 2, 10]);
    const before = JSON.stringify(mockStore.getSnapshot());
    expect(receive(-1, 'bad-negative').success).toBe(false);
    expect(receive(2, 'over-receipt').success).toBe(false);
    expect(mockStore.inspectReturnQC('r-partial', true, [{ item_id: 'ri-partial', pass_qty: 3, fail_qty: 0 }]).success).toBe(false);
    expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
    ok(mockStore.inspectReturnQC('r-partial', true, [{ item_id: 'ri-partial', pass_qty: 1, fail_qty: 1 }], undefined, undefined, { inspectionId: 'mixed' }));
    expect(stock()).toEqual([12, 0, 0, 11]);
    expect(mockStore.getInventory5State()[0].damaged).toBe(1);
    ok(receive(1, 'r2')); ok(mockStore.inspectReturnQC('r-partial', true));
    expect(stock()).toEqual([13, 0, 0, 12]);
    expect(mockStore.getSnapshot().returnReceipts).toHaveLength(2);
    mockStore.setActiveRole('manager');
    expect(workQueue(mockStore.getSnapshot(), 'manager').some(t => t.step === 'discrepancy')).toBe(true);
  });

  it('blocks wrong serial restock and retains it in quarantine', () => {
    deliverAndReturn();
    (mockStore as any).mutate((s: any) => {
      s.orderItems.find((i: any) => i.order_id === 'acceptance-A').serial_numbers = ['SERIAL-A'];
      s.returns.push({ id: 'serial-rma', tenant_id: 'tenant_flagship', warehouse_id: 'wh_north_01', order_id: 'acceptance-A', status: 'approved' });
      s.returnItems.push({ id: 'serial-item', return_id: 'serial-rma', product_id: 'ram-x', quantity: 1 });
    }, 'DATABASE_RESET');
    mockStore.setActiveRole('warehouse');
    ok(mockStore.receiveReturnDock('serial-rma', [{ item_id: 'serial-item', received_qty: 1, serials: ['WRONG'] }]));
    expect(mockStore.inspectReturnQC('serial-rma', true).success).toBe(false);
    ok(mockStore.inspectReturnQC('serial-rma', false));
    expect(mockStore.getInventory5State()[0]).toMatchObject({ available: 9, damaged: 1, physical: 10 });
  });

  it('allows two distinct equal fee credits, rejects conflicting replay, separates compensation', () => {
    deliverAndReturn();
    for (const id of ['credit-1', 'credit-2']) ok(mockStore.reconcileFeeBreakdown('fee-acceptance-A', { transactionId: id, lateFeeAdjustment: 5000, adjustmentKind: 'credit', discrepancyNote: 'Refund of fee' }));
    ok(mockStore.reconcileFeeBreakdown('fee-acceptance-A', { transactionId: 'comp-1', lateFeeAdjustment: 7000, adjustmentKind: 'compensation', discrepancyNote: 'Carrier compensation' }));
    const before = JSON.stringify(mockStore.getSnapshot());
    expect(mockStore.reconcileFeeBreakdown('fee-acceptance-A', { transactionId: 'credit-1', lateFeeAdjustment: 6000, discrepancyNote: 'Conflict' }).success).toBe(false);
    expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
    const m = commerceSummary(mockStore.getSnapshot());
    expect(m).toMatchObject({ sales: 1000000, compensation: 7000, contribution: -103000 });
    expect(mockStore.getSnapshot().orderFeeBreakdowns![0].net_payout).toBe(917000);
    expect(mockStore.getSnapshot().orderFeeBreakdowns![0].adjustments!.every(a => a.actor_id === 'usr_manager_01')).toBe(true);
  });

  it('does not oversell shared SKU across shops or duplicate product rows', async () => {
    ingest();
    (mockStore as any).mutate((s: any) => { s.inventory5State[0].physical = 1; s.inventory5State[0].available = s.inventory5State[0].sellable = 1; }, 'DATABASE_RESET');
    const results = await Promise.all(['A', 'B'].map(async name => mockStore.releaseToWarehouse(`acceptance-${name}`)));
    expect(results.filter(r => r.success)).toHaveLength(1);
    expect(stock()).toEqual([1, 1, 0, 0]);
    const before = JSON.stringify(mockStore.getSnapshot());
    expect(mockStore.placeOrderAtomic({ tenant_id: 'tenant_flagship', shop_id: 'acceptance-shop-0', order_number: 'D', assigned_warehouse_id: 'wh_north_01' }, [{ product_id: 'ram-x', sku: 'RAM-X', quantity: 1, unit_price: 1000000 }, { product_id: 'ram-x', sku: 'RAM-X', quantity: 1, unit_price: 1000000 }]).success).toBe(false);
    expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
  });

  it('holds unmapped orders, maps then retries without losing or duplicating orders/reservations', () => {
    (mockStore as any).mutate((s: any) => { s.channelSkuMappings = []; }, 'DATABASE_RESET');
    ingest();
    expect(mockStore.releaseToWarehouse('acceptance-A').success).toBe(false);
    ok(mockStore.resolveOrderMapping('acceptance-A')); ok(mockStore.releaseToWarehouse('acceptance-A')); ok(mockStore.releaseToWarehouse('acceptance-A'));
    mockStore.setActiveRole('admin'); ok(mockStore.retryMarketplaceEvent('acceptance-event-A'));
    expect(mockStore.getOrders()).toHaveLength(3); expect(stock()).toEqual([10, 1, 0, 9]);
  });

  it('rejects session/tenant/shop/warehouse spoofing and generic mutation bypasses', async () => {
    ingest(); mockStore.setActiveRole('warehouse');
    expect(mockStore.reconcileFeeBreakdown('fee_002', { actorRole: 'owner' }).success).toBe(false);
    for (const operation of [supabase.from('orders').update({ status: 'delivered' }).eq('id', 'acceptance-A'), supabase.from('order_fee_breakdowns').insert({ order_id: 'acceptance-A', net_payout: 100 }), supabase.from('inventory_items').delete().eq('product_id', 'ram-x')]) {
      expect((await operation).error).not.toBeNull();
    }
    expect(() => mockStore.mutateTable('inventory5State', () => true, { available: 100 })).toThrow();
    mockStore.setActiveRole('manager');
    (mockStore as any).mutate((s: any) => { s.memberships.find((m: any) => m.role === 'manager').shop_ids = ['different-shop']; }, 'DATABASE_RESET');
    expect(mockStore.releaseToWarehouse('acceptance-A').success).toBe(false);
    (mockStore as any).mutate((s: any) => { s.memberships.find((m: any) => m.role === 'manager').shop_ids = undefined; s.memberships.find((m: any) => m.role === 'manager').warehouse_ids = ['other-warehouse']; }, 'DATABASE_RESET');
    expect(mockStore.releaseToWarehouse('acceptance-A').success).toBe(false);
    (mockStore as any).mutate((s: any) => { s.activeUserId = null; }, 'DATABASE_RESET');
    expect(mockStore.releaseToWarehouse('acceptance-A').success).toBe(false);
    mockStore.setActiveRole('viewer'); expect(mockStore.cancelOrderAtomic('acceptance-A', 'legacy').success).toBe(false);
    expect(mockStore.getOrders()).toEqual([]);
    expect(mockStore.getInventory5State()).toEqual([]);
    mockStore.setActiveRole('admin'); expect(mockStore.cancelOrderAtomic('acceptance-A', 'technical').success).toBe(false);
    expect(mockStore.loadAcceptanceFixture().success).toBe(false);
    expect(mockStore.recordSourceFees('acceptance-A', 1, 'admin-spoof-fee').success).toBe(false);
    expect(mockStore.refundOrder('acceptance-A', 1, 'owner').success).toBe(false);
    mockStore.setActiveTenant('tenant_retail_hanoi'); expect(mockStore.retryMarketplaceEvent('acceptance-event-A').success).toBe(false);
  });

  it('keeps assignment history, shared role handoffs and tracked Growth decisions', () => {
    deliverAndReturn();
    ok(mockStore.assignHandoff('warehouse:acceptance-A', 'acceptance-A', 'usr_warehouse_01'));
    ok(mockStore.assignHandoff('warehouse:acceptance-A', 'acceptance-A', null));
    expect(mockStore.assignHandoff('warehouse:unrelated-order', 'acceptance-A', 'usr_warehouse_01').success).toBe(false);
    expect(mockStore.getSnapshot().handoffAssignments!['warehouse:acceptance-A'].history).toHaveLength(2);
    mockStore.setActiveRole('growth'); ok(mockStore.createGrowthRecommendation('acceptance-C', 'Reduce loss on failed deliveries'));
    expect(mockStore.cancelOrderAtomic('acceptance-A', 'wrong role').success).toBe(false);
    mockStore.setActiveRole('manager');
    const task = workQueue(mockStore.getSnapshot(), 'manager').find(t => t.step === 'recommendation')!;
    expect(task).toBeDefined(); ok(mockStore.resolveGrowthRecommendation(task.entityId, 'accepted'));
    expect(workQueue(mockStore.getSnapshot(), 'manager').some(t => t.step === 'recommendation')).toBe(false);
    mockStore.setActiveRole('growth'); expect(mockStore.getSnapshot().growthRecommendations![0].status).toBe('accepted');
  });

  it('ignores replay and old delivery events; partial refund leaves other lines and inventory intact', () => {
    deliverAndReturn();
    const before = JSON.stringify(mockStore.getSnapshot());
    ok(mockStore.recordSourceEvent('acceptance-A', { id: 'delivered-A', version: 2, type: 'delivered' }));
    ok(mockStore.recordSourceEvent('acceptance-A', { id: 'old-failure', version: 1, type: 'failed' }));
    expect(mockStore.recordSourceEvent('acceptance-C', { id: 'illegal-delivery-after-return', version: 3, type: 'delivered' }).success).toBe(false);
    expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
    ok(mockStore.recordSourceEvent('acceptance-A', { id: 'partial-refund', version: 1, type: 'refund', amount: 200000 }));
    expect(stock()).toEqual([9, 0, 0, 9]);
    expect(mockStore.getOrders().find(o => o.id === 'acceptance-A')).toMatchObject({ status: 'delivered', refunded_amount: 200000, payment_status: 'partially_paid' });
    expect(commerceSummary(mockStore.getSnapshot()).sales).toBe(800000);
  });

  it('returns just one product from a multi-line delivered order, preserving remaining sales/COGS', () => {
    ingest();
    (mockStore as any).mutate((s: any) => {
      s.products.push({ ...s.products[0], id: 'second', sku: 'SECOND', cost_price: 400000 });
      s.inventory5State.push({ ...s.inventory5State[0], product_id: 'second', sku: 'SECOND', physical: 5, available: 5, sellable: 5 });
      s.orders.find((o: any) => o.id === 'acceptance-A').total = 2000000;
      s.orderItems.push({ ...s.orderItems[0], id: 'second-item', order_id: 'acceptance-A', product_id: 'second', product_sku: 'SECOND', unit_cost_mac_snapshot: 400000 });
    }, 'DATABASE_RESET');
    ok(mockStore.releaseToWarehouse('acceptance-A'));
    mockStore.setActiveRole('warehouse');
    ok(mockStore.prepareOrder('acceptance-A', 'pick', ['RAM-X', 'SECOND'])); ok(mockStore.prepareOrder('acceptance-A', 'pack'));
    ok(mockStore.dispatchOrder('acceptance-A', 'PARTIAL-TRACK'));
    mockStore.setActiveRole('manager'); ok(mockStore.recordSourceEvent('acceptance-A', { id: 'multi-delivered', version: 1, type: 'delivered' }));
    const result = mockStore.createMultiBranchRma({ orderId: 'acceptance-A', rmaBranch: 'partial_return', reason: 'Return first product only', refundAmount: 1000000, items: [{ productId: 'ram-x', qty: 1 }] }); ok(result);
    const ret = mockStore.getReturns().find(r => r.return_number === result.rmaNumber)!;
    mockStore.setActiveRole('warehouse'); ok(mockStore.receiveReturnDock(ret.id)); ok(mockStore.inspectReturnQC(ret.id, true));
    mockStore.setActiveRole('manager'); ok(mockStore.recordSourceEvent('acceptance-A', { id: 'multi-refund', version: 1, type: 'refund', amount: 1000000 }));
    const rows = commerceSummary(mockStore.getSnapshot()).rows;
    expect(rows.find(r => r.orderId === 'acceptance-A')).toMatchObject({ sales: 1000000, cogs: 400000 });
    expect(mockStore.getInventory5State().find(i => i.sku === 'SECOND')).toMatchObject({ physical: 4, available: 4 });
    expect(mockStore.getInventory5State().find(i => i.sku === 'RAM-X')).toMatchObject({ physical: 10, available: 10 });
    expect(mockStore.getOrders().find(o => o.id === 'acceptance-A')!.status).toBe('delivered');
  });

  it('receives PO partially then remaining with weighted cost, refuses invalid or replayed excess', () => {
    (mockStore as any).mutate((s: any) => {
      s.purchaseOrders.push({ id: 'partial-po', po_number: 'PO-FIXED', warehouse_id: 'wh_north_01', status: 'ordered', total_amount: 3600000 });
      s.purchaseOrderItems.push({ id: 'partial-po-item', po_id: 'partial-po', product_id: 'ram-x', quantity: 4, received_qty: 0, unit_cost: 900000 });
    }, 'DATABASE_RESET');
    mockStore.setActiveRole('warehouse');
    ok(mockStore.receivePurchaseOrder('partial-po', [{ item_id: 'partial-po-item', qty: 1 }]));
    expect(stock()).toEqual([11, 0, 0, 11]);
    expect(mockStore.getSnapshot().purchaseOrders![0].status).toBe('partial');
    const before = JSON.stringify(mockStore.getSnapshot());
    expect(mockStore.receivePurchaseOrder('partial-po', [{ item_id: 'partial-po-item', qty: -1 }]).success).toBe(false);
    expect(mockStore.receivePurchaseOrder('partial-po', [{ item_id: 'partial-po-item', qty: 4 }]).success).toBe(false);
    expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
    ok(mockStore.receivePurchaseOrder('partial-po', [{ item_id: 'partial-po-item', qty: 3 }]));
    expect(stock()).toEqual([14, 0, 0, 14]);
    expect(mockStore.getProducts()[0].moving_avg_cost).toBeCloseTo(685714.285714, 5);
    expect(mockStore.receivePurchaseOrder('partial-po').success).toBe(false);
  });

  it('rolls back an injected mid-transaction exception, including stock and audit', () => {
    const before = JSON.stringify(mockStore.getSnapshot());
    expect(() => (mockStore as any).mutate((s: any) => { s.inventory5State[0].physical = 999; throw Error('injected failure'); }, 'STOCK_RESERVED')).toThrow('injected failure');
    expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
  });

  it('unknown RPC and rejected QC report errors, and account mutations persist with actual membership', async () => {
    const before = JSON.stringify(mockStore.getSnapshot());
    expect((await supabase.rpc('nonexistent_mutation')).error).not.toBeNull();
    expect((await supabase.rpc('process_return_restock_atomic', { p_return_id: 'missing' })).error).not.toBeNull();
    expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
    const created = mockStore.createDemoUser('new-warehouse@example.test', 'New warehouse', 'warehouse'); ok(created);
    expect(mockStore.getSnapshot().memberships.find(m => m.user_id === created.userId)!.role).toBe('warehouse');
    mockStore.setActiveRole('admin');
    expect(mockStore.createDemoUser('fake-owner@example.test', 'Spoof', 'owner').success).toBe(false);
    ok(mockStore.updateDemoUser(created.userId!, 'warehouse', false));
    expect(mockStore.getSnapshot().memberships.find(m => m.user_id === created.userId)!.status).toBe('suspended');
    expect(mockStore.signInDemoUser('new-warehouse@example.test').success).toBe(false);
    expect(mockStore.signInDemoUser('unregistered-owner@example.test').success).toBe(false);
    mockStore.signOutDemoUser();
    expect(mockStore.getExecutionContext()).toBeNull();
    expect(mockStore.createDemoUser('after-signout@example.test', 'Missing session', 'warehouse').success).toBe(false);
  });

  it('rejects storage failure without changing memory or reporting a successful business command', () => {
    ingest();
    const before = JSON.stringify(mockStore.getSnapshot());
    vi.stubGlobal('window', { localStorage: { setItem() { throw Error('quota'); } } });
    try {
      expect(() => mockStore.releaseToWarehouse('acceptance-A')).toThrow('Không thể lưu');
      expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
    } finally { vi.unstubAllGlobals(); }
  });
});
