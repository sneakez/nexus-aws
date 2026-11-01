import { describe, it, expect } from 'vitest';
import { analyticsService } from '@/analytics/analyticsService';
import { mockStore } from '@/mock/store';
import { CHANNEL_FEE_BENCHMARKS } from '@/analytics/metricsEngine';
import type { Channel } from '@/types';

describe('NexusOMS V6 Phase 2 — Digital Commerce Only Regression & Reconciliation', () => {
  const allowedDigitalChannels: Channel[] = ['shopee', 'tiktok', 'lazada', 'website', 'other_digital'];

  it('1. Confirms POS and manual counter sales are completely purged from Channel Benchmarks', () => {
    const benchmarkKeys = Object.keys(CHANNEL_FEE_BENCHMARKS);
    expect(benchmarkKeys).not.toContain('manual');
    expect(benchmarkKeys).not.toContain('pos');
    expect(benchmarkKeys).toEqual(expect.arrayContaining(['shopee', 'tiktok', 'lazada', 'website']));
  });

  it('2. Confirms all orders in mock database are 100% Digital Commerce orders', () => {
    const orders = mockStore.getOrders();
    expect(orders.length).toBeGreaterThan(0);

    orders.forEach(order => {
      expect(order.channel).toBeDefined();
      expect(allowedDigitalChannels).toContain(order.channel);
      expect(order.channel).not.toBe('manual');
      expect(order.channel).not.toBe('pos');
    });
  });

  it('3. Reconciles Channel Economics sums perfectly with Order Economics totals (Digital Only)', () => {
    const channelEcon = analyticsService.getChannelEconomics();
    const orderEcon = analyticsService.getOrderEconomics();

    // Channel list must contain only active digital channels
    const channelIds = channelEcon.map(c => c.channel);
    expect(channelIds).not.toContain('manual');
    expect(channelIds).not.toContain('pos');

    // Aggregate sums across channels
    const chTotalGross = channelEcon.reduce((sum, c) => sum + c.grossSales, 0);
    const chTotalNet = channelEcon.reduce((sum, c) => sum + c.netRevenue, 0);
    const chTotalCogs = channelEcon.reduce((sum, c) => sum + c.cogs, 0);
    const chTotalFees = channelEcon.reduce((sum, c) => sum + c.marketplaceFees, 0);
    const chTotalPayFees = channelEcon.reduce((sum, c) => sum + c.paymentFees, 0);
    const chTotalFulfillment = channelEcon.reduce((sum, c) => sum + c.fulfillmentCosts, 0);
    const chTotalShipSubsidies = channelEcon.reduce((sum, c) => sum + c.shippingSubsidies, 0);
    const chTotalReturnCosts = channelEcon.reduce((sum, c) => sum + c.returnCosts, 0);
    const chTotalMarketing = channelEcon.reduce((sum, c) => sum + c.marketingSpend, 0);
    const chTotalCm1 = channelEcon.reduce((sum, c) => sum + c.cm1, 0);
    const chTotalCm2 = channelEcon.reduce((sum, c) => sum + c.cm2, 0);
    const chTotalCm3 = channelEcon.reduce((sum, c) => sum + c.cm3, 0);
    const chTotalOrders = channelEcon.reduce((sum, c) => sum + c.orderCount, 0);

    // Aggregate sums across individual orders
    const ordTotalGross = orderEcon.reduce((sum, o) => sum + o.grossSales, 0);
    const ordTotalNet = orderEcon.reduce((sum, o) => sum + o.netRevenue, 0);
    const ordTotalCogs = orderEcon.reduce((sum, o) => sum + o.cogs, 0);
    const ordTotalFees = orderEcon.reduce((sum, o) => sum + o.marketplaceFees, 0);
    const ordTotalPayFees = orderEcon.reduce((sum, o) => sum + o.paymentFees, 0);
    const ordTotalFulfillment = orderEcon.reduce((sum, o) => sum + o.fulfillmentCosts, 0);
    const ordTotalShipSubsidies = orderEcon.reduce((sum, o) => sum + o.shippingSubsidies, 0);
    const ordTotalReturnCosts = orderEcon.reduce((sum, o) => sum + o.returnCosts, 0);
    const ordTotalMarketing = orderEcon.reduce((sum, o) => sum + o.attributedMarketingCosts, 0);
    const ordTotalCm1 = orderEcon.reduce((sum, o) => sum + o.cm1, 0);
    const ordTotalCm2 = orderEcon.reduce((sum, o) => sum + o.cm2, 0);
    const ordTotalCm3 = orderEcon.reduce((sum, o) => sum + o.cm3, 0);

    // Total orders must match exactly
    expect(chTotalOrders).toBe(orderEcon.length);

    // Totals must reconcile within exact integer precision
    expect(chTotalGross).toBe(ordTotalGross);
    expect(chTotalNet).toBe(ordTotalNet);
    expect(chTotalCogs).toBe(ordTotalCogs);
    expect(chTotalFees).toBe(ordTotalFees);
    expect(chTotalPayFees).toBe(ordTotalPayFees);
    expect(chTotalFulfillment).toBe(ordTotalFulfillment);
    expect(chTotalShipSubsidies).toBe(ordTotalShipSubsidies);
    expect(chTotalReturnCosts).toBe(ordTotalReturnCosts);
    expect(chTotalMarketing).toBe(ordTotalMarketing);
    expect(chTotalCm1).toBe(ordTotalCm1);
    expect(chTotalCm2).toBe(ordTotalCm2);
    expect(chTotalCm3).toBe(ordTotalCm3);

    // Exact reconciliation: CM1 - CM2 === Sum of all 5 cost components
    const chAllVarCosts = chTotalFees + chTotalPayFees + chTotalFulfillment + chTotalShipSubsidies + chTotalReturnCosts;
    expect(chTotalCm1 - chTotalCm2).toBe(chAllVarCosts);
    expect(ordTotalCm1 - ordTotalCm2).toBe(chAllVarCosts);
  });

  it('4. Confirms that no KPI or formula in any module returns NaN or Infinity', () => {
    const dash = analyticsService.getExecutiveDashboardData('last_30_days');
    const channelEcon = analyticsService.getChannelEconomics();
    const skuEcon = analyticsService.getSkuEconomics();
    const workingCap = analyticsService.getWorkingCapitalOverview();

    // Dashboard KPIs
    expect(Number.isFinite(dash.kpis.netRevenue.value)).toBe(true);
    expect(Number.isFinite(dash.kpis.orderVolume.value)).toBe(true);
    expect(Number.isFinite(dash.kpis.aov.value)).toBe(true);
    expect(Number.isFinite(dash.kpis.grossProfit.value)).toBe(true);
    expect(Number.isFinite(dash.kpis.cm1.value)).toBe(true);
    expect(Number.isFinite(dash.kpis.cm2.value)).toBe(true);
    expect(Number.isFinite(dash.kpis.cm3.value)).toBe(true);

    // Channel KPIs
    channelEcon.forEach(c => {
      expect(Number.isFinite(c.grossSales)).toBe(true);
      expect(Number.isFinite(c.netRevenue)).toBe(true);
      expect(Number.isFinite(c.takeRate)).toBe(true);
      expect(Number.isFinite(c.cm1Margin)).toBe(true);
      expect(Number.isFinite(c.cm2Margin)).toBe(true);
      expect(Number.isFinite(c.cm3Margin)).toBe(true);
      expect(Number.isFinite(c.blendedRoas)).toBe(true);
    });

    // SKU KPIs
    skuEcon.forEach(s => {
      expect(Number.isFinite(s.asp)).toBe(true);
      expect(Number.isFinite(s.cmPerUnit)).toBe(true);
      expect(Number.isFinite(s.cmPercent)).toBe(true);
      expect(Number.isFinite(s.breakEvenPrice)).toBe(true);
      expect(Number.isFinite(s.stockRoi)).toBe(true);
    });

    // Working Capital
    // No fixed 42/8/16/34-day conclusion when cash-document history is absent.
    expect(workingCap.cashConversionCycleDays).toBeNull();
    expect(workingCap.daysInventoryOutstanding).toBeNull();
    expect(workingCap.daysSalesOutstanding).toBeNull();
    expect(workingCap.daysPayablesOutstanding).toBeNull();
    expect(Number.isFinite(workingCap.workingCapitalGap)).toBe(true);
  });

  it('5. Confirms that Physical WMS & Operations Modules remain fully preserved', () => {
    const products = mockStore.getProducts();
    const inv5 = mockStore.getInventory5State();
    const warehouses = mockStore.getWarehouses();
    const orders = mockStore.getOrders();

    expect(products.length).toBeGreaterThan(0);
    expect(inv5.length).toBeGreaterThan(0);
    expect(warehouses.length).toBeGreaterThan(0);
    expect(orders.length).toBeGreaterThan(0);

    // Strict Inventory Invariant Check for all SKUs
    inv5.forEach(i => {
      // 1. Physical = Sellable + Reserved + Unavailable
      expect(i.physical).toBe(i.sellable + i.reserved + i.unavailable);
      // 2. Unavailable = Pending QC + Damaged
      expect(i.unavailable).toBe((i.pending_qc || 0) + (i.damaged || 0));
      // 3. Sellable is alias of Available
      expect(i.available).toBe(i.sellable);
      // 4. Pipeline stock is outside Physical
      expect(i.incoming).toBeGreaterThanOrEqual(0);
      expect(i.in_transit).toBeGreaterThanOrEqual(0);
    });
  });
});
