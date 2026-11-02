import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/mock/store';
import { analyticsService } from '@/analytics/analyticsService';
import { hasPermission, ENABLE_FINANCE_ROLE, getAllowedPagesForRole } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';

describe('Audit Remediation & UAT Verification Suite (R01 - R28 & Roles)', () => {
  beforeEach(() => {
    mockStore.resetToBaseline();
  });

  it('R10 & O-E1: filterOrdersByPeriod returns empty array for empty period, never falling back to all orders', () => {
    const orders = mockStore.getOrders();
    expect(orders.length).toBeGreaterThan(0);

    const futureOrders: Order[] = [
      {
        ...orders[0],
        id: 'ord_future_01',
        created_at: '2099-01-01T00:00:00Z',
        placed_at: '2099-01-01T00:00:00Z',
      }
    ];

    const resToday = analyticsService.filterOrdersByPeriod(futureOrders, 'today');
    expect(resToday.current).toEqual([]);
    expect(resToday.current.length).toBe(0);

    const resMonth = analyticsService.filterOrdersByPeriod(futureOrders, 'this_month');
    expect(resMonth.current).toEqual([]);
    expect(resMonth.current.length).toBe(0);
  });

  it('R11 & G-H1/G-E1/G-E2: getMarketingPerformance dynamically derives metrics, handles zero spend safely, and tags as ESTIMATED', () => {
    const perf = analyticsService.getMarketingPerformance();
    expect(perf.length).toBeGreaterThan(0);

    perf.forEach(campaign => {
      expect(Number.isFinite(campaign.roas)).toBe(true);
      expect(campaign.roas).toBeGreaterThanOrEqual(0);
      expect(campaign.attributionType).toBe('ESTIMATED');
      expect(campaign.adSpend).toBeGreaterThanOrEqual(0);
      expect(campaign.attributedRevenue).toBeGreaterThanOrEqual(0);
    });
  });

  it('R17 & M-E7: Fee reconciliation resolves discrepancies, records late fee adjustment (+5000), updates Net Payout without overwriting base fees', async () => {
    const feeId = 'fee_002';
    const beforeFee = (mockStore as any).state.orderFeeBreakdowns?.find((f: any) => f.id === feeId);
    expect(beforeFee).toBeDefined();
    expect(beforeFee.is_reconciled).toBe(false);
    const initialPayout = beforeFee.net_payout; // 1,050,000
    const initialCommission = beforeFee.commission_fee; // 65,000

    // Reconcile fee with discrepancy reason and late compensation adjustment (+5000 VND)
    mockStore.setActiveRole('manager');
    const res = mockStore.reconcileFeeBreakdown(feeId, {
      transactionId: 'uat-fee-credit',
      actorRole: 'manager',
      actorId: 'usr_manager_01',
      discrepancyReason: 'WEIGHT_MISMATCH',
      discrepancyNote: 'Lệch cân nặng bưu kiện 250g; đã bổ sung khoản bồi hoàn sau +5.000 ₫',
      lateFeeAdjustment: 5000
    });

    expect(res.success).toBe(true);
    expect(res.data?.is_reconciled).toBe(true);
    expect(res.data?.discrepancy_reason).toBe('WEIGHT_MISMATCH');
    expect(res.data?.late_fee_adjustment).toBe(5000);
    expect(res.data?.net_payout).toBe(initialPayout + 5000); // 1,055,000
    expect(res.data?.commission_fee).toBe(initialCommission); // Base commission fee intact!

    // Verify persistence in mockStore
    const afterFee = (mockStore as any).state.orderFeeBreakdowns?.find((f: any) => f.id === feeId);
    expect(afterFee.is_reconciled).toBe(true);
    expect(afterFee.reconciled_by).toBe('usr_manager_01');
    expect(afterFee.net_payout).toBe(1055000);
  });

  it('Command-Level Authorization: Warehouse cannot mark delivered, Admin cannot refund, Warehouse cannot reconcile fees', () => {
    // 1. Warehouse calling markDeliveredWithPOD directly is rejected at command level
    mockStore.setActiveRole('warehouse');
    const podRes = mockStore.markDeliveredWithPOD('ord_90214', {
      tracking_code: 'SPX-VN-123456',
      carrier_name: 'Shopee Xpress',
      recipient_name: 'Nguyễn Văn A',
      delivered_at: new Date().toISOString(),
      signature_verified: true,
      submitted_by: 'WAREHOUSE',
      verified_at: new Date().toISOString()
    }, 'warehouse');

    expect(podRes.success).toBe(false);
    expect(podRes.error).toContain('Command rejected: Nhân viên kho chỉ bàn giao bưu tá');

    // 2. Admin calling refundOrder directly is rejected at command level (A-E5)
    mockStore.setActiveRole('admin');
    const refundRes = mockStore.refundOrder('ord_90214', 500000, 'admin');
    expect(refundRes.success).toBe(false);
    expect(refundRes.error).toContain('Command rejected: Quyền hạn kỹ thuật Admin không được phép duyệt hoàn tiền');

    // 3. Warehouse calling reconcileFeeBreakdown directly is rejected at command level
    mockStore.setActiveRole('warehouse');
    const reconRes = mockStore.reconcileFeeBreakdown('fee_001', { actorRole: 'warehouse' });
    expect(reconRes.success).toBe(false);
    expect(reconRes.error).toContain('Command rejected: Quyền hạn bị từ chối');
  });

  it('W-E2: Return package partial receipt — expected 2 items, actually received 1, missing 1, QC good 1 -> on-hand increases by exactly 1, discrepancy flagged, Manager task created', () => {
    // Setup a return with expected quantity = 2
    const returnId = 'ret_we2_test';
    const prodId = 'prod_air_pro';
    const sku = 'NX-AIR-PRO';

    const invBefore = mockStore.getInventory5State().find(i => i.sku === sku);
    expect(invBefore).toBeDefined();
    const initialPhysical = invBefore!.physical;
    const initialAvailable = invBefore!.available;
    const initialPendingQc = invBefore!.pending_qc || 0;

    // Inject test return record with 2 expected items
    (mockStore as any).mutate((draft: any) => {
      draft.returns.push({
        id: returnId,
        return_number: 'RMA-WE2-001',
        order_id: 'ord_90214',
        return_type: 'customer_return',
        status: 'pending',
        refund_amount: 500000,
        reason: 'Khách gửi hoàn 2 sản phẩm',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      draft.returnItems.push({
        id: 'reti_we2_01',
        return_id: returnId,
        product_id: prodId,
        sku: sku,
        quantity: 2 // Expected 2 units!
      });
    }, 'SETUP_TEST_RETURN');

    // Step 1: Dock receipt receives only 1 unit (1 missing)
    const dockRes = mockStore.receiveReturnDock(returnId, [{ product_id: prodId, received_qty: 1 }], 'warehouse');
    expect(dockRes.success).toBe(true);
    expect(dockRes.discrepancyCount).toBe(1);

    // Verify 5-state stock after Dock receipt: physical +1, pending_qc +1, available UNCHANGED
    const invAfterDock = mockStore.getInventory5State().find(i => i.sku === sku);
    expect(invAfterDock!.physical).toBe(initialPhysical + 1);
    expect(invAfterDock!.pending_qc).toBe(initialPendingQc + 1);
    expect(invAfterDock!.available).toBe(initialAvailable); // Available has NOT increased yet!

    // Verify Manager discrepancy task was created
    const discrepancyTask = (mockStore as any).state.customerComplaints?.find((d: any) => d.id.startsWith('task_discrepancy_'));
    expect(discrepancyTask).toBeDefined();
    expect(discrepancyTask?.raw_content).toContain('thiếu 1 sản phẩm');

    // Step 2: QC inspection passes the 1 received unit in good condition
    const qcRes = mockStore.inspectReturnQC(returnId, true, [{ product_id: prodId, pass_qty: 1, fail_qty: 0 }], 'warehouse');
    expect(qcRes.success).toBe(true);

    // Verify 5-state stock after QC: physical remains initialPhysical + 1 (NO double increment!), pending_qc restored, available +1
    const invAfterQC = mockStore.getInventory5State().find(i => i.sku === sku);
    expect(invAfterQC!.physical).toBe(initialPhysical + 1); // Total on-hand increased by EXACTLY 1!
    expect(invAfterQC!.available).toBe(initialAvailable + 1);
    expect(invAfterQC!.pending_qc).toBe(initialPendingQc);
  });

  it('R16: Stock transfer moves stock to in_transit and into destination warehouse without double counting', () => {
    const sku = 'NX-AIR-PRO';
    const before = mockStore.getInventory5State().find(i => i.sku === sku);
    expect(before).toBeDefined();
    const initialPhysical = before!.physical;
    const initialInTransit = before!.in_transit || 0;

    // Use a real destination warehouse; the old test silently accepted a nonexistent warehouse.
    // Dispatch 2 units
    const dispatchRes = mockStore.transferStock(sku, 'wh_north_01', 'wh_danang_01', 2, 'dispatch');
    expect(dispatchRes.success).toBe(true);

    const afterDispatch = mockStore.getInventory5State().find(i => i.sku === sku);
    expect(afterDispatch!.physical).toBe(initialPhysical - 2);
    expect(afterDispatch!.in_transit).toBe(initialInTransit + 2);

    // Receive 2 units
    const receiveRes = mockStore.transferStock(sku, 'wh_north_01', 'wh_danang_01', 2, 'receive');
    expect(receiveRes.success).toBe(true);

    const afterReceive = mockStore.getInventory5State().find(i => i.sku === sku);
    expect(afterReceive!.in_transit).toBe(initialInTransit);
    expect(afterReceive!.physical).toBe(initialPhysical - 2);
    expect(mockStore.getInventory5State().find(i => i.sku === sku && i.warehouse_id === 'wh_danang_01')!.physical).toBe(2);
  });

  it('R26 & R27: Finance role disabled by default; Viewer role disallowed in allowed pages', () => {
    expect(ENABLE_FINANCE_ROLE).toBe(false);

    const viewerPages = getAllowedPagesForRole('viewer' as any);
    expect(viewerPages.length).toBe(0);

    const managerPages = getAllowedPagesForRole('manager');
    expect(managerPages).toContain('orders');
    expect(managerPages).toContain('orderEconomics');
    expect(managerPages).toContain('channelEconomics');
    expect(managerPages).not.toContain('feeReconciliation');
  });
});
