import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockStore } from '@/mock/store';
import { analyticsService } from '@/analytics/analyticsService';
import { orderSla, slaSummary, operationalInsights } from '@/analytics/operations';
import { simulatePricing } from '@/analytics/metricsEngine';
import type { Order } from '@/types';

const ok=(r:{success:boolean;error?:string})=>expect(r,r.error).toMatchObject({success:true});
const f=()=>mockStore.getFinanceOverview();
const today=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
function ingest() {
  mockStore.setActiveRole('admin');mockStore.updateTable('channel_connections',()=>true,{status:'connected'});
  for(const i of [1,2])ok(mockStore.retryMarketplaceEvent(`money-event-${i}`));
}
function deliver() {
  ingest();mockStore.setActiveRole('manager');for(const i of [1,2])ok(mockStore.releaseToWarehouse(`money-order-${i}`));
  mockStore.setActiveRole('warehouse');for(const i of [1,2]){ok(mockStore.prepareOrder(`money-order-${i}`,'pick',['RAM-X']));ok(mockStore.prepareOrder(`money-order-${i}`,'pack'));ok(mockStore.dispatchOrder(`money-order-${i}`,`MONEY-TRACK-${i}`));}
  mockStore.setActiveRole('manager');for(const i of [1,2]){ok(mockStore.recordSourceEvent(`money-order-${i}`,{id:`delivery-${i}`,version:1,type:'delivered'}));ok(mockStore.recordSourceFees(`money-order-${i}`,i===1?100000:50000,`fee-source-${i}`));ok(mockStore.reconcileFeeBreakdown(`fee-money-order-${i}`));}
}
const receipt=(id:string,amount:number)=>({id,batchId:'batch-money',accountId:'money-bank',amount,date:today(),reference:`source-${id}`});
function batch(){ok(mockStore.createSettlementBatch({id:'batch-money',orderIds:['money-order-1','money-order-2'],expectedDate:today()}));}
function po(){ok(mockStore.createPurchaseOrder({po_number:'MONEY-PO',warehouse_id:'wh_north_01',supplier_name:'NCC fixture tiền'},[{product_id:'ram-x',quantity:4,unit_cost:100000}]));const state=mockStore.getSnapshot();return {po:state.purchaseOrders![0],line:state.purchaseOrderItems![0]};}

describe('Money documents and cross-role operational acceptance — independent VND expectations',()=>{
  beforeEach(()=>{mockStore.resetToBaseline();ok(mockStore.loadAcceptanceFixture('money'));});
  it('delivered/reconciled profit does not mint cash; multi-order partial receipts and forecast remaining',()=>{
    deliver();expect(f().availableCash).toBe(200000);batch();
    expect(f().settlements[0]).toMatchObject({original_expected:1350000,current_expected:1350000,received:0,remaining:1350000,status:'reconciled_waiting'});
    ok(mockStore.recordSettlementReceipt(receipt('receipt-1',600000)));expect(f().availableCash).toBe(800000);expect(f().settlements[0]).toMatchObject({status:'partial',remaining:750000});
    expect(f().forecast.days.reduce((s,d)=>s+d.inflow,0)).toBe(750000);
    const snapshot=mockStore.getSnapshot();ok(mockStore.recordSettlementReceipt(receipt('receipt-1',600000)));expect(mockStore.getSnapshot()).toEqual(snapshot);
    const same=receipt('receipt-1',600000);ok(mockStore.recordSettlementReceipt({reference:same.reference,date:same.date,amount:same.amount,accountId:same.accountId,batchId:same.batchId,id:same.id}));expect(mockStore.getSnapshot()).toEqual(snapshot);
    expect(mockStore.recordSettlementReceipt(receipt('receipt-1',600001)).success).toBe(false);expect(mockStore.getSnapshot()).toEqual(snapshot);
    ok(mockStore.recordSettlementReceipt(receipt('receipt-2',750000)));expect(f().availableCash).toBe(1550000);expect(f().forecast.days.reduce((s,d)=>s+d.inflow,0)).toBe(0);expect(f().settlements[0].status).toBe('received');
  });
  it('late refund/fee/credit preserve immutable cash history and create adjustment to handle',()=>{
    deliver();batch();ok(mockStore.recordSettlementReceipt(receipt('receipt-1',1350000)));const docs=structuredClone(f().documents);
    ok(mockStore.recordSourceEvent('money-order-1',{id:'late-refund',version:1,type:'refund',amount:100000}));
    expect(f().settlements[0]).toMatchObject({current_expected:1250000,remaining:-100000,status:'adjustment_required'});expect(f().availableCash).toBe(1550000);
    ok(mockStore.recordSourceFees('money-order-1',120000,'late-fees'));
    ok(mockStore.recordSourceEvent('money-order-1',{id:'late-ads',version:1,type:'ads_credit',amount:50000}));
    ok(mockStore.reconcileFeeBreakdown('fee-money-order-1',{transactionId:'compensation',adjustmentKind:'compensation',lateFeeAdjustment:7000,discrepancyNote:'proof'}));
    expect(f().settlements[0].current_expected).toBe(1237000);expect(f().documents).toEqual(docs);expect(f().availableCash).toBe(1550000);
    expect(analyticsService.getOrderEconomics().reduce((s,o)=>s+o.netRevenue,0)).toBe(1400000);
    const before=mockStore.getSnapshot();ok(mockStore.recordSourceEvent('money-order-1',{id:'late-refund',version:1,type:'refund',amount:100000}));expect(mockStore.getSnapshot()).toEqual(before);
  });
  it('over-receipt requires discrepancy evidence; receipt records preserve account/reference/actor',()=>{
    deliver();batch();expect(mockStore.recordSettlementReceipt(receipt('too-much',1400000)).success).toBe(false);
    ok(mockStore.recordSettlementReceipt({...receipt('over-proof',1400000),discrepancyReason:'Sàn báo thêm 50k; cần đối chiếu'}));
    expect(f().availableCash).toBe(1600000);expect(f().settlements[0].discrepancy).toBe(50000);expect(f().documents[0]).toMatchObject({actor_id:'usr_manager_01',reference:'source-over-proof',account_id:'money-bank'});
  });
  it('PO creates no cash/debt until actual receipt; partial payment, overpay, terms and replay',()=>{
    mockStore.setActiveRole('manager');const {po:purchase,line}=po();expect(f().supplierPayables).toBe(0);expect(f().availableCash).toBe(200000);
    mockStore.updateTable('purchase_orders',r=>r.id===purchase.id,{status:'ordered'});
    mockStore.setActiveRole('warehouse');ok(mockStore.receivePurchaseOrder(purchase.id,[{item_id:line.id,qty:1}],'dock-1'));
    const stock=mockStore.getSnapshot();ok(mockStore.receivePurchaseOrder(purchase.id,[{item_id:line.id,qty:1}],'dock-1'));expect(mockStore.getSnapshot()).toEqual(stock);
    ok(mockStore.receivePurchaseOrder(purchase.id,[{item_id:line.id,qty:3}],'dock-2'));
    mockStore.setActiveRole('manager');expect(f().supplierPayables).toBe(400000);expect(f().availableCash).toBe(200000);
    expect(f().payables[0].supplier_id).toBe(purchase.supplier_id);expect(purchase.supplier_id).toBeTruthy();
    const payableId=f().payables[0].id;
    const terms={id:'terms-1',payableId,dueDate:'2020-01-01',reason:'Ngày kiểm thử quá hạn',confirmSimulation:false};
    ok(mockStore.updatePayableTerms(terms));expect(f().payables[0].due_date).toBeNull();expect(f().availableCash).toBe(200000);
    ok(mockStore.updatePayableTerms({...terms,id:'terms-2',confirmSimulation:true}));expect(f().payables[0].overdue).toBe(true);
    const payment={id:'payment-1',payableId,accountId:'money-bank',amount:100000,date:today(),reference:'NCC mock receipt'};
    ok(mockStore.recordSupplierPayment(payment));expect(f().availableCash).toBe(100000);expect(f().supplierPayables).toBe(300000);
    const before=mockStore.getSnapshot();ok(mockStore.recordSupplierPayment(payment));expect(mockStore.getSnapshot()).toEqual(before);
    expect(mockStore.recordSupplierPayment({...payment,id:'payment-2',amount:300001}).success).toBe(false);expect(mockStore.getSnapshot()).toEqual(before);
    expect(mockStore.recordSupplierPayment({...payment,id:'payment-3',amount:-1}).success).toBe(false);expect(mockStore.getSnapshot()).toEqual(before);
    expect(mockStore.getInventory5State()[0].physical).toBe(14);
  });
  it('commands and reads enforce session and every related shop/warehouse, no role spoof',()=>{
    deliver();batch();for(const role of ['admin','warehouse','growth'] as const){mockStore.setActiveRole(role);const before=mockStore.getSnapshot();expect(mockStore.recordSettlementReceipt(receipt('unauthorized',1000)).success).toBe(false);expect(mockStore.getSnapshot()).toEqual(before);expect(f().accounts).toEqual([]);expect(f().settlements).toEqual([]);}
    mockStore.setActiveRole('owner');const m=mockStore.getSnapshot().memberships.find(m=>m.role==='manager')!;mockStore.updateTable('tenant_memberships',r=>r.id===m.id,{shop_ids:['another-shop']});mockStore.setActiveRole('manager');expect(f().settlements).toEqual([]);expect(mockStore.recordSettlementReceipt(receipt('scope',1000)).success).toBe(false);
    mockStore.signOutDemoUser();expect(mockStore.recordSettlementReceipt(receipt('no-session',1000)).success).toBe(false);
  });
  it('storage failure is atomic for cash and receipt accrual',()=>{
    deliver();batch();const before=mockStore.getSnapshot();const spy=vi.spyOn(mockStore as any,'saveToStorage').mockImplementation(()=>{throw Error('disk failed');});
    expect(mockStore.recordSettlementReceipt(receipt('failure',600000))).toMatchObject({success:false,error:'disk failed'});expect(mockStore.getSnapshot()).toEqual(before);spy.mockRestore();
  });
  it('full supplier payment removes the remaining forecast without duplicating cash outflow',()=>{
    deliver();batch();ok(mockStore.recordSettlementReceipt(receipt('receipt-funded',1350000)));
    const {po:purchase,line}=po();mockStore.updateTable('purchase_orders',r=>r.id===purchase.id,{status:'ordered'});
    mockStore.setActiveRole('warehouse');ok(mockStore.receivePurchaseOrder(purchase.id,[{item_id:line.id,qty:4}],'dock-full'));mockStore.setActiveRole('manager');
    const payableId=f().payables[0].id;ok(mockStore.updatePayableTerms({id:'due-confirmed',payableId,dueDate:today(),reason:'Fixture due',confirmSimulation:true}));
    for(const [id,amount]of [['pay-one',100000],['pay-rest',300000]] as const)ok(mockStore.recordSupplierPayment({id,payableId,accountId:'money-bank',amount,date:today(),reference:id}));
    expect(f().availableCash).toBe(1150000);expect(f().payables[0]).toMatchObject({remaining:0,status:'paid'});expect(f().forecast.days.reduce((s,d)=>s+d.outflow,0)).toBe(0);
    for(const role of ['admin','warehouse','growth'] as const){mockStore.setActiveRole(role);const before=mockStore.getSnapshot();expect(mockStore.recordSupplierPayment({id:'denied',payableId,accountId:'money-bank',amount:1,date:today(),reference:'denied'}).success).toBe(false);expect(mockStore.updatePayableTerms({id:'denied-term',payableId,dueDate:today(),reason:'no rights',confirmSimulation:true}).success).toBe(false);expect(mockStore.getSnapshot()).toEqual(before);}
  });
  it('PO receipt failure does not write stock, debt or receipt replay key',()=>{
    mockStore.setActiveRole('manager');const {po:purchase,line}=po();mockStore.updateTable('purchase_orders',r=>r.id===purchase.id,{status:'ordered'});mockStore.setActiveRole('warehouse');const before=mockStore.getSnapshot();
    const spy=vi.spyOn(mockStore as any,'saveToStorage').mockImplementation(()=>{throw Error('disk failed');});
    expect(()=>mockStore.receivePurchaseOrder(purchase.id,[{item_id:line.id,qty:1}],'dock-failed')).toThrow('disk failed');expect(mockStore.getSnapshot()).toEqual(before);spy.mockRestore();
  });
  it('unknown/invalid dates and account scope are rejected without money mutation',()=>{
    deliver();batch();const before=mockStore.getSnapshot();expect(mockStore.recordSettlementReceipt({...receipt('invalid-date',10000),date:'2026-02-31'}).success).toBe(false);expect(mockStore.getSnapshot()).toEqual(before);
    mockStore.setActiveRole('owner');ok(mockStore.createCashAccount({id:'scoped-bank',name:'Scoped mock',opening_balance:0,opening_date:today(),opening_reference:'fixture',shop_id:'acceptance-shop-1'}));mockStore.setActiveRole('manager');expect(mockStore.recordSettlementReceipt({...receipt('wrong-account-shop',10000),accountId:'scoped-bank'}).success).toBe(false);
  });
  it('order/SKU/channel/dashboard reconcile in the same date period including compensation',()=>{
    deliver();ok(mockStore.reconcileFeeBreakdown('fee-money-order-1',{transactionId:'comp-fixture',adjustmentKind:'compensation',lateFeeAdjustment:7000,discrepancyNote:'separate proof'}));
    const orders=analyticsService.getOrderEconomics(undefined,'today'),skus=analyticsService.getSkuEconomics(undefined,'today'),channels=analyticsService.getChannelEconomics(undefined,'today'),dash=analyticsService.getExecutiveDashboardData('today');
    const contribution=orders.reduce((s,o)=>s+o.cm3,0);expect(contribution).toBe(17000); // 1.5M − 1.2M COGS − 150k fee − 40k packaging −100k Ads +7k compensation
    expect(skus.reduce((s,o)=>s+o.totalContribution,0)).toBe(contribution);expect(channels.reduce((s,o)=>s+o.cm3,0)).toBe(contribution);expect(dash.kpis.cm3.value).toBe(contribution);expect(dash.revenueTrend.reduce((s,d)=>s+d.cm3,0)).toBe(contribution);
    expect(dash.waterfallPnL.find(w=>w.name.startsWith('11.'))?.amount).toBe(7000);expect(dash.kpis.netRevenue.value).toBe(1500000);
  });
  it('Ads zero and empty periods have no Healthy/Infinity or fallback revenue',()=>{
    deliver();const zero=analyticsService.getMarketingPerformance().find(c=>c.campaignId==='acceptance-shop-0')!;expect(zero.adsCredit).toBe(0);
    mockStore.setActiveRole('owner');(mockStore as any).mutate((state:any)=>{ for(const order of state.orders)Object.assign(order,{ads_spend:0,ads_credit:0,created_at:'2000-01-01T00:00:00Z',placed_at:'2000-01-01T00:00:00Z'}); },'DATABASE_RESET'); // isolated fixture-only setup, not a browser action
    expect(analyticsService.getMarketingPerformance()[0]).toMatchObject({status:'INSUFFICIENT_DATA',roas:0,netSpend:0});
    const dashboard=analyticsService.getExecutiveDashboardData('today');expect(dashboard.kpis.netRevenue.value).toBe(0);expect(dashboard.revenueTrend.every(d=>d.netRevenue===0)).toBe(true);expect(dashboard.channelComparison.every(c=>c.netRevenue===0)).toBe(true);
  });
  it('SLA upcoming/overdue/completed use one definition and completed does not age',()=>{
    const base={id:'sla',status:'processing',must_ship_by_sla:'2026-01-02T00:00:00Z'} as Order,now=Date.parse('2026-01-01T12:00:00Z');
    expect(orderSla(base,24,now).status).toBe('due_soon');expect(orderSla(base,24,now+86400000).status).toBe('overdue');
    const completed={...base,status:'shipped' as const,shipped_at:'2026-01-01T23:00:00Z'};expect(orderSla(completed,24,now+86400000*99).status).toBe('on_time');expect(slaSummary([base],24,now).compliance).toBeNull();
    expect(slaSummary([completed,{...base,id:'late',shipped_at:'2026-01-02T01:00:00Z'}],24,now).compliance).toBe(50);
  });
  it('configured tax is separate or already included, no double counting',()=>{
    const input={basePrice:1000000,cogs:500000,marketplaceFeePercent:10,paymentFeePercent:2,packagingFulfillmentCost:20000,allocatedMarketingPercent:10,targetCm2Percent:20,voucherDiscountAmount:0,configuredTaxPercent:5};
    expect(simulatePricing(input).simulatedCm3).toBe(210000);expect(simulatePricing({...input,taxIncludedInFees:true}).simulatedCm3).toBe(260000);
  });
  it('new SKU is insufficient history; exception actors and scope remain distinct',()=>{
    ingest();mockStore.setActiveRole('warehouse');const due=new Date(Date.now()+3600000).toISOString();ok(mockStore.recordHandoffException('money-order-1',{note:'Thiếu nhãn',dueAt:due,status:'open'}));
    expect(mockStore.recordHandoffException('money-order-1',{note:'Tự xác nhận',dueAt:due,status:'confirmed'}).success).toBe(false);
    mockStore.setActiveRole('manager');ok(mockStore.recordHandoffException('money-order-1',{note:'Đã bổ sung',dueAt:due,status:'resolved'}));mockStore.setActiveRole('owner');ok(mockStore.recordHandoffException('money-order-1',{note:'Đã đối chiếu',dueAt:due,status:'confirmed'}));
    expect(mockStore.getSnapshot().handoffAssignments?.['monitor:money-order-1']).toMatchObject({discovered_by:'usr_warehouse_01',resolved_by:'usr_manager_01',confirmed_by:'usr_owner_01'});
    expect(operationalInsights(mockStore.getSnapshot(),mockStore.getOrders(),mockStore.getInventory5State()).products[0].sufficient).toBe(false);
  });
});
