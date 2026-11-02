import { beforeEach, describe, expect, it } from 'vitest';
import { mockStore } from '@/mock/store';

describe('Independent handover regressions', () => {
  beforeEach(() => mockStore.resetToBaseline());

  it('A: replay QC must not increase stock twice', () => {
    mockStore.setActiveRole('warehouse');
    const inventory = () => mockStore.getInventory5State().find(i => i.product_id === 'prod_kb_wave')!;
    const before = inventory().available;
    expect(mockStore.receiveReturnDock('ret_005').success).toBe(true);
    expect(mockStore.inspectReturnQC('ret_005', true).success).toBe(true);
    expect(inventory().available).toBe(before + 1);
    expect(mockStore.inspectReturnQC('ret_005', true).success).toBe(false);
    expect(inventory().available).toBe(before + 1);
  });

  it('B: replay of one fee transaction does not pay twice', () => {
    mockStore.setActiveRole('manager');
    const params = { lateFeeAdjustment: 5000, transactionId: 'independent-fee-1', discrepancyNote: 'Carrier credit' };
    expect(mockStore.reconcileFeeBreakdown('fee_002', params).success).toBe(true);
    expect(mockStore.reconcileFeeBreakdown('fee_002', params).success).toBe(true);
    expect(mockStore.getSnapshot().orderFeeBreakdowns!.find(f => f.id === 'fee_002')!.net_payout).toBe(1055000);
  });

  it('C: payload role cannot override warehouse session', () => {
    mockStore.setActiveRole('warehouse');
    const before = JSON.stringify(mockStore.getSnapshot());
    expect(mockStore.reconcileFeeBreakdown('fee_002', { actorRole: 'manager', actorId: 'usr_owner_01', lateFeeAdjustment: 5000 }).success).toBe(false);
    expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
  });
});
