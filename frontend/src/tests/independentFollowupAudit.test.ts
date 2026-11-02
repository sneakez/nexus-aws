import { beforeEach, expect, it } from 'vitest';
import { mockStore } from '@/mock/store';
import { workQueue } from '@/mock/workQueue';

const ok = (r: {success:boolean;error?:string}) => expect(r, r.error).toMatchObject({success:true});
beforeEach(() => {
  mockStore.resetToBaseline(); ok(mockStore.loadAcceptanceFixture());
  mockStore.setActiveRole('admin');
  mockStore.updateTable('channel_connections', () => true, {status:'connected'});
  ok(mockStore.retryMarketplaceEvent('acceptance-event-A'));
  mockStore.setActiveRole('manager'); ok(mockStore.releaseToWarehouse('acceptance-A'));
  mockStore.setActiveRole('warehouse');
  ok(mockStore.prepareOrder('acceptance-A','pick',['RAM-X']));
  ok(mockStore.prepareOrder('acceptance-A','pack'));
  ok(mockStore.dispatchOrder('acceptance-A','TRACK-A'));
  mockStore.setActiveRole('manager');
  ok(mockStore.recordSourceEvent('acceptance-A',{id:'delivered',version:1,type:'delivered'}));
});

it('keeps both distinct refund transactions arriving out of order', () => {
  ok(mockStore.recordSourceEvent('acceptance-A',{id:'refund-2',version:20,type:'refund',amount:200000}));
  ok(mockStore.recordSourceEvent('acceptance-A',{id:'refund-1',version:10,type:'refund',amount:100000}));
  expect(mockStore.getOrders()[0].refunded_amount).toBe(300000);
});

it('keeps both distinct Ads credits arriving out of order', () => {
  ok(mockStore.recordSourceEvent('acceptance-A',{id:'credit-2',version:20,type:'ads_credit',amount:20000}));
  ok(mockStore.recordSourceEvent('acceptance-A',{id:'credit-1',version:10,type:'ads_credit',amount:10000}));
  expect(mockStore.getOrders()[0].ads_credit).toBe(30000);
});

it('returnless refund never creates warehouse receiving work', () => {
  ok(mockStore.createMultiBranchRma({orderId:'acceptance-A',rmaBranch:'returnless_refund',refundAmount:100000,reason:'Refund without receiving goods',items:[{productId:'ram-x',qty:1}]}));
  mockStore.setActiveRole('warehouse');
  expect(workQueue(mockStore.getSnapshot(),'warehouse').filter(t=>t.step==='return')).toHaveLength(0);
});

it('blocks physical receipt for returnless refund', () => {
  ok(mockStore.createMultiBranchRma({orderId:'acceptance-A',rmaBranch:'returnless_refund',refundAmount:100000,reason:'Refund without receiving goods',items:[{productId:'ram-x',qty:1}]}));
  const ret = mockStore.getSnapshot().returns[0];
  mockStore.setActiveRole('warehouse');
  expect(mockStore.receiveReturnDock(ret.id).success).toBe(false);
});

it('late money replay is idempotent, conflicting identity and over-refund leave state unchanged', () => {
  const newer = {id:'r-new',version:20,type:'refund' as const,amount:200000};
  const older = {id:'r-old',version:10,type:'refund' as const,amount:100000};
  ok(mockStore.recordSourceEvent('acceptance-A',newer)); ok(mockStore.recordSourceEvent('acceptance-A',older));
  const before = JSON.stringify(mockStore.getSnapshot());
  ok(mockStore.recordSourceEvent('acceptance-A',older));
  expect(mockStore.recordSourceEvent('acceptance-A',{...older,amount:999}).success).toBe(false);
  expect(mockStore.recordSourceEvent('acceptance-A',{id:'over',version:5,type:'refund',amount:800000}).success).toBe(false);
  expect(JSON.stringify(mockStore.getSnapshot())).toBe(before);
});

it('Growth cannot read or resolve recommendations outside its newly assigned shop', () => {
  mockStore.setActiveRole('growth'); ok(mockStore.createGrowthRecommendation('acceptance-A','Review A'));
  const rec = mockStore.getGrowthRecommendations()[0];
  mockStore.setActiveRole('owner');
  mockStore.updateTable('tenant_memberships', m=>m.id==='mship_growth',{shop_ids:['acceptance-shop-1']});
  mockStore.setActiveRole('growth'); expect(mockStore.getGrowthRecommendations()).toEqual([]);
  expect(mockStore.resolveGrowthRecommendation(rec.id,'accepted').success).toBe(false);
  mockStore.setActiveRole('owner');
  mockStore.updateTable('tenant_memberships', m=>m.id==='mship_manager',{shop_ids:['acceptance-shop-1']});
  mockStore.setActiveRole('manager');
  expect(mockStore.resolveGrowthRecommendation(rec.id,'accepted').success).toBe(false);
});

it('rejected or withdrawn cancellation resumes warehouse work without reallocating inventory', () => {
  mockStore.setActiveRole('admin'); ok(mockStore.retryMarketplaceEvent('acceptance-event-B'));
  mockStore.setActiveRole('manager'); ok(mockStore.releaseToWarehouse('acceptance-B'));
  const stockBefore = mockStore.getInventory5State();
  ok(mockStore.requestCancellation('acceptance-B'));
  mockStore.setActiveRole('warehouse');
  expect(mockStore.prepareOrder('acceptance-B','pick',['RAM-X']).success).toBe(false);
  expect(mockStore.resolveCancellation('acceptance-B','rejected','source').success).toBe(false);
  mockStore.setActiveRole('manager');
  expect(mockStore.resolveCancellation('acceptance-B','rejected','').success).toBe(false);
  ok(mockStore.resolveCancellation('acceptance-B','rejected','Source rejects cancellation'));
  expect(mockStore.getInventory5State()).toEqual(stockBefore);
  ok(mockStore.requestCancellation('acceptance-B'));
  ok(mockStore.resolveCancellation('acceptance-B','withdrawn','Customer withdraws request'));
  mockStore.setActiveRole('warehouse');
  ok(mockStore.prepareOrder('acceptance-B','pick',['RAM-X']));
  ok(mockStore.prepareOrder('acceptance-B','pack')); ok(mockStore.dispatchOrder('acceptance-B','B'));
  mockStore.setActiveRole('manager');
  expect(mockStore.resolveCancellation('acceptance-B','withdrawn','too late').success).toBe(false);
});

it('Manager assigns Warehouse, retains history, and rejects an out-of-scope recipient', () => {
  mockStore.setActiveRole('admin'); ok(mockStore.retryMarketplaceEvent('acceptance-event-B'));
  mockStore.setActiveRole('manager'); ok(mockStore.releaseToWarehouse('acceptance-B'));
  ok(mockStore.assignHandoff('warehouse:acceptance-B','acceptance-B','usr_warehouse_01'));
  ok(mockStore.assignHandoff('warehouse:acceptance-B','acceptance-B',null));
  expect(mockStore.getSnapshot().handoffAssignments!['warehouse:acceptance-B'].history).toHaveLength(2);
  mockStore.setActiveRole('owner');
  mockStore.updateTable('tenant_memberships', m=>m.id==='mship_warehouse',{warehouse_ids:['wh_south_01']});
  mockStore.setActiveRole('manager');
  expect(mockStore.assignHandoff('warehouse:acceptance-B','acceptance-B','usr_warehouse_01').success).toBe(false);
});

it('closing a missing parcel ends warehouse work, keeps compensation open, and supports a late arrival', () => {
  ok(mockStore.createMultiBranchRma({orderId:'acceptance-A',rmaBranch:'partial_return',refundAmount:100000,reason:'Parcel lost',items:[{productId:'ram-x',qty:1}]}));
  const id = mockStore.getReturns()[0].id;
  const beforeStock = mockStore.getInventory5State();
  ok(mockStore.resolveReturnClaim(id,'awaiting_compensation','Carrier investigating'));
  ok(mockStore.resolveReturnReceiving(id,true,'Confirmed lost parcel'));
  mockStore.setActiveRole('warehouse');
  expect(workQueue(mockStore.getSnapshot(),'warehouse').filter(t=>t.step==='return')).toEqual([]);
  expect(mockStore.receiveReturnDock(id).success).toBe(false);
  expect(mockStore.getInventory5State()).toEqual(beforeStock);
  mockStore.setActiveRole('manager');
  expect(workQueue(mockStore.getSnapshot(),'manager').some(t=>t.step==='claim')).toBe(true);
  expect(mockStore.resolveReturnClaim(id,'paid','Paid','missing').success).toBe(false);
  ok(mockStore.recordSourceFees('acceptance-A',0,'fees'));
  ok(mockStore.reconcileFeeBreakdown('fee-acceptance-A',{lateFeeAdjustment:50000,adjustmentKind:'compensation',transactionId:'claim-money',discrepancyNote:'Lost parcel compensation'}));
  ok(mockStore.resolveReturnClaim(id,'paid','Carrier paid','claim-money'));
  expect(workQueue(mockStore.getSnapshot(),'manager').some(t=>t.step==='claim')).toBe(false);
  ok(mockStore.resolveReturnReceiving(id,false,'Parcel found and returned'));
  mockStore.setActiveRole('warehouse'); ok(mockStore.receiveReturnDock(id));
  mockStore.setActiveRole('manager'); expect(mockStore.resolveReturnReceiving(id,true,'Too early').success).toBe(false);
  mockStore.setActiveRole('warehouse'); ok(mockStore.inspectReturnQC(id,true));
  expect(mockStore.getInventory5State()[0].available).toBe(10);
});

it('paid refund does not erase outstanding physical receipt work', () => {
  ok(mockStore.createMultiBranchRma({orderId:'acceptance-A',rmaBranch:'partial_return',refundAmount:100000,reason:'Early refund',items:[{productId:'ram-x',qty:1}]}));
  const ret = mockStore.getReturns()[0];
  // Old snapshots may use refunded for the return's financial status.
  const snapshot = mockStore.getSnapshot();
  snapshot.returns.find(r=>r.id===ret.id)!.status='refunded';
  mockStore.setActiveRole('warehouse');
  snapshot.activeRole='warehouse'; snapshot.activeUserId='usr_warehouse_01';
  expect(workQueue(snapshot,'warehouse').some(t=>t.entityId===ret.id && t.step==='return')).toBe(true);
});
