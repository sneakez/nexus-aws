import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';
import { mockStore } from '@/mock/store';
import { hasPermission, getAllowedPagesForRole } from '@/lib/permissions';

describe('Mock Core Correctness & Table Persistence (R01, R02, R03, R04, R05, R06)', () => {
  beforeEach(() => {
    mockStore.resetToBaseline();
  });

  it('R01: supports chained insert with .select().single() and persists data', async () => {
    const newConn = {
      channel: 'shopee',
      shop_name: 'Shop Test R01',
      shop_id: 'shp_test_r01',
      status: 'connected',
      api_key_masked: 'shp_test••••'
    };

    // Insert with chained select and single
    const { data: inserted, error: insertError } = await supabase
      .from('channel_connections')
      .insert(newConn)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(inserted).not.toBeNull();
    expect((inserted as any).shop_name).toBe('Shop Test R01');
    expect((inserted as any).id).toBeDefined();

    // Query back to verify persistence
    const { data: fetched, error: fetchError } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('shop_id', 'shp_test_r01')
      .single();

    expect(fetchError).toBeNull();
    expect((fetched as any).shop_name).toBe('Shop Test R01');
  });

  it('R01: supports chained update with .eq() and persists modification', async () => {
    const { error: updateError } = await supabase
      .from('channel_connections')
      .update({ status: 'disconnected' })
      .eq('shop_id', 'shp_vn_90214');

    expect(updateError).toBeNull();

    const { data: fetched } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('shop_id', 'shp_vn_90214')
      .single();

    expect((fetched as any).status).toBe('disconnected');
  });

  it('R01: supports chained delete with .eq() and persists removal', async () => {
    const { error: delError } = await supabase
      .from('channel_connections')
      .delete()
      .eq('id', 'conn_website');

    expect(delError).toBeNull();

    const { data: fetched } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('id', 'conn_website')
      .maybeSingle();

    expect(fetched).toBeNull();
  });

  it('R03: returns PGRST100 error for unsupported/unknown tables', async () => {
    const { data, error } = await supabase
      .from('completely_fake_unknown_table')
      .select('*');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.code).toBe('PGRST100');
    expect(error?.message).toContain('not found in schema');
  });

  it('R03: supports all standard prototype tables with proper schema', async () => {
    const tables = [
      'channel_connections',
      'channel_sku_mappings',
      'order_automation_rules',
      'buffer_rules',
      'routing_rules',
      'customer_complaints',
      'outbound_webhooks',
      'webhook_delivery_logs',
      'sync_logs',
      'purchase_orders',
      'purchase_order_items',
      'margin_config'
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBeGreaterThan(0);
    }
  });

  it('R05: rejects duplicate orders with identical (tenant_id, shop_id, channel_order_sn)', () => {
    const existingOrder = mockStore.getOrders()[0];
    expect(existingOrder).toBeDefined();

    const dupRes = mockStore.placeOrderAtomic(
      {
        tenant_id: existingOrder.tenant_id || 'tenant_flagship',
        shop_id: existingOrder.shop_id || 'default',
        channel_order_sn: existingOrder.channel_order_sn || '261028SHP90214',
        order_number: 'ORD-TEST-DUP-01',
        customer_id: 'cust_01',
        channel: existingOrder.channel || 'shopee',
      },
      [{ product_id: 'prod_air_pro', sku: 'NX-AIR-PRO', quantity: 1, unit_price: 1250000 }]
    );

    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toContain('trùng lặp');
  });

  it('R06: keeps Manager reconciliation permission inside the consolidated MVP economics pages', () => {
    expect(hasPermission('manager', 'finance:reconcile')).toBe(true);
    expect(getAllowedPagesForRole('manager')).toContain('orderEconomics');
    expect(getAllowedPagesForRole('manager')).toContain('channelEconomics');
    expect(getAllowedPagesForRole('manager')).not.toContain('feeReconciliation');
  });

  it('R07/R08: prevents double restock on return QC inspection', () => {
    const invBefore = mockStore.getInventory5State().find(i => i.product_id === 'prod_kb_wave')!;
    expect(invBefore).toBeDefined();
    const physicalBefore = invBefore.physical;
    const availableBefore = invBefore.available;
    const pendingQcBefore = invBefore.pending_qc || 0;

    // Step 1: Dock receipt of RMA (ret_005 item is prod_kb_wave qty 1)
    const dockRes = mockStore.receiveReturnDock('ret_005');
    expect(dockRes.success).toBe(true);

    const invAfterDock = mockStore.getInventory5State().find(i => i.product_id === 'prod_kb_wave')!;
    expect(invAfterDock.physical).toBe(physicalBefore + 1);
    expect(invAfterDock.pending_qc).toBe(pendingQcBefore + 1);
    expect(invAfterDock.available).toBe(availableBefore); // Available hasn't increased yet

    // Step 2: QC pass
    const qcRes = mockStore.inspectReturnQC('ret_005', true);
    expect(qcRes.success).toBe(true);

    const invAfterQC = mockStore.getInventory5State().find(i => i.product_id === 'prod_kb_wave')!;
    // Physical MUST stay the same (no double increment)
    expect(invAfterQC.physical).toBe(physicalBefore + 1);
    expect(invAfterQC.pending_qc).toBe(pendingQcBefore);
    expect(invAfterQC.available).toBe(availableBefore + 1); // Now sellable stock increases!
  });

  it('R16: PO receiving increments physical and available inventory correctly', () => {
    const invBefore = mockStore.getInventory5State().find(i => i.product_id === 'prod_air_pro' && i.warehouse_id === 'wh_north_01')!;
    expect(invBefore).toBeDefined();
    const physicalBefore = invBefore.physical;
    const availableBefore = invBefore.available;

    const res = mockStore.receivePurchaseOrder('po_01', [{ item_id: 'poi_01', qty: 25 }]);
    expect(res.success).toBe(true);

    const invAfter = mockStore.getInventory5State().find(i => i.product_id === 'prod_air_pro' && i.warehouse_id === 'wh_north_01')!;
    expect(invAfter.physical).toBe(physicalBefore + 25);
    expect(invAfter.available).toBe(availableBefore + 25);
  });
});
