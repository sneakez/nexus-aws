import { describe, it, expect } from 'vitest';
import {
  safeDivide,
  calculatePercentDelta,
  calculateOrderContribution,
  simulatePricing
} from '../analytics/metricsEngine';
import { analyticsService } from '../analytics/analyticsService';
import { mockStore } from '../mock/store';

describe('V6 Unit Economics & Analytics Engine', () => {
  it('safeDivide handles zero, NaN, and infinity gracefully without crashing', () => {
    expect(safeDivide(100, 0, 0)).toBe(0);
    expect(safeDivide(100, 0, -1)).toBe(-1);
    expect(safeDivide(0, 0)).toBe(0);
    expect(safeDivide(NaN, 10)).toBe(0);
    expect(safeDivide(100, NaN)).toBe(0);
    expect(safeDivide(100, 2)).toBe(50);
  });

  it('calculatePercentDelta handles zero previous value properly', () => {
    const res = calculatePercentDelta(150, 0);
    expect(res.delta).toBe(150);
    expect(res.deltaPercent).toBe(100);
    expect(res.trend).toBe('up');

    const res2 = calculatePercentDelta(100, 100);
    expect(res2.delta).toBe(0);
    expect(res2.deltaPercent).toBe(0);
    expect(res2.trend).toBe('flat');

    const res3 = calculatePercentDelta(80, 100);
    expect(res3.delta).toBe(-20);
    expect(res3.deltaPercent).toBe(-20);
    expect(res3.trend).toBe('down');
  });

  it('maintains strict 3-tier Contribution Margin invariant: Net >= CM1 >= CM2 >= CM3', () => {
    const contrib = calculateOrderContribution({
      grossSales: 1000000,
      discounts: 50000,
      returnsRefunds: 0,
      cogs: 400000,
      channel: 'shopee',
      attributedMarketing: 80000
    });

    expect(contrib.netRevenue).toBe(950000);
    expect(contrib.cogs).toBe(400000);
    expect(contrib.cm1).toBe(550000);
    expect(contrib.cm1).toBeLessThanOrEqual(contrib.netRevenue);
    expect(contrib.cm2).toBeLessThanOrEqual(contrib.cm1);
    expect(contrib.cm3).toBeLessThanOrEqual(contrib.cm2);
  });

  it('simulates dynamic pricing, break-even, and safety discount caps correctly', () => {
    const sim = simulatePricing({
      basePrice: 500000,
      cogs: 200000,
      marketplaceFeePercent: 10,
      paymentFeePercent: 2,
      packagingFulfillmentCost: 20000,
      allocatedMarketingPercent: 8,
      targetCm2Percent: 30,
      voucherDiscountAmount: 30000
    });

    expect(sim.breakEvenPrice).toBeGreaterThan(sim.waterfallBreakdown[3].amount); // Break-even > COGS
    expect(sim.recommendedPrice).toBeGreaterThan(sim.breakEvenPrice);
    expect(sim.maxAllowedDiscount).toBe(Math.max(0, 500000 - sim.breakEvenPrice));
    expect(sim.waterfallBreakdown.length).toBe(10);
  });

  it('pulls unified numbers from Centralized Mock Store for Executive Dashboard', () => {
    const dash = analyticsService.getExecutiveDashboardData('last_30_days');
    expect(dash.kpis.netRevenue.value).toBeGreaterThan(0);
    expect(dash.kpis.orderVolume.value).toBeGreaterThan(0);
    expect(dash.waterfallPnL.length).toBe(14);
    expect(dash.channelComparison.length).toBe(4);
    expect(dash.decisionInsights.every(insight => insight.dataAttribution === 'DEMO-OBSERVED')).toBe(true); // No mandatory invented insights when thresholds are not reached
  });

  it('keeps CCC unavailable without sufficient observations and reconciles working capital gap', () => {
    const wc = analyticsService.getWorkingCapitalOverview();
    expect(wc.cashConversionCycleDays).toBeNull();
    expect(wc.daysInventoryOutstanding).toBeNull();
    expect(wc.daysSalesOutstanding).toBeNull();
    expect(wc.daysPayablesOutstanding).toBeNull();
    expect(wc.workingCapitalGap).toBe(
      (wc.pendingMarketplaceSettlements + wc.inventoryCapital) - wc.supplierPayables
    );
  });

  it('calculates SKU Economics and Pareto classification accurately', () => {
    const skus = analyticsService.getSkuEconomics();
    expect(skus.length).toBeGreaterThan(0);
    
    // Check that ABC categories are assigned
    const hasCategoryA = skus.some(s => s.abcCategory === 'A');
    expect(hasCategoryA).toBe(true);

    skus.forEach(s => {
      expect(s.asp).toBeGreaterThanOrEqual(0);
      expect(s.cogs).toBeGreaterThanOrEqual(0);
      expect(s.breakEvenPrice).toBeGreaterThan(0);
    });
  });

  it('guarantees 100% unified reproducible snapshot reconciliation across Dashboard, Channel, and Order Economics', () => {
    const dash = analyticsService.getExecutiveDashboardData('last_30_days');
    const orderEcon = analyticsService.getOrderEconomics();
    const channels = analyticsService.getChannelEconomics();
    const skus = analyticsService.getSkuEconomics();
    const inv5 = mockStore.getInventory5State();

    const orderNet = orderEcon.reduce((sum, o) => sum + o.netRevenue, 0);
    const channelNet = channels.reduce((sum, c) => sum + c.netRevenue, 0);
    const dashNet = dash.kpis.netRevenue.value;

    const orderCm3 = orderEcon.reduce((sum, o) => sum + o.cm3, 0);
    const channelCm3 = channels.reduce((sum, c) => sum + c.cm3, 0);
    const dashCm3 = dash.kpis.cm3.value;

    // Cross-module Net Revenue equality (0 VND gap)
    expect(orderNet).toBe(channelNet);
    expect(dashNet).toBe(orderNet);
    // Historical gross-booking constants are not recognition evidence.
    // Independent VND acceptance values are asserted in commerceAcceptance.test.ts.

    // Cross-module CM3 equality (0 VND gap)
    expect(orderCm3).toBe(channelCm3);
    expect(dashCm3).toBe(orderCm3);


    // Inventory valuation and physical invariant
    const totalPhysical = inv5.reduce((sum, i) => sum + i.physical, 0);
    const totalStockValue = skus.reduce((sum, s) => sum + s.stockValue, 0);
    expect(totalPhysical).toBe(980);
    expect(totalStockValue).toBe(304575000);
    expect(totalStockValue).toBeGreaterThan(0);
  });
  it('truthfully assigns confidenceStatus and cogsSource without masquerading fallback estimates as actuals', () => {
    const orderEcon = analyticsService.getOrderEconomics();
    expect(orderEcon.length).toBeGreaterThan(0);
    orderEcon.forEach(o => {
      expect(['VERIFIED', 'PARTIALLY_RECONCILED', 'ESTIMATED', 'INCOMPLETE']).toContain(o.confidenceStatus);
      expect(['MAC_SNAPSHOT', 'PRODUCT_MASTER', 'ESTIMATED_BENCHMARK']).toContain(o.cogsSource);
      if (o.cogsSource === 'ESTIMATED_BENCHMARK') {
        expect(o.confidenceStatus).toBe('ESTIMATED');
        expect(o.attributionType).toBe('ESTIMATED');
      }
    });
  });
});
