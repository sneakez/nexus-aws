import { describe, it, expect } from 'vitest';
import {
  calculateOrderContribution,
  simulatePricing,
  safeDivide
} from '../analytics/metricsEngine';
import { analyticsService } from '../analytics/analyticsService';
import { mockStore } from '../mock/store';
import fs from 'fs';
import path from 'path';

describe('V6 Independent Reference Reconciliation & Acceptance Verification', () => {
  it('1. Independent Reference Check: Order Contribution (CM1, CM2, CM3)', () => {
    // Independent manual calculation baseline
    const grossSales = 1250000;
    const discounts = 50000;
    const refunds = 0;
    const cogs = 500000;
    const commissionRate = 0.085; // Shopee benchmark 8.5%
    const paymentRate = 0.02;     // 2.0%
    const fulfillmentCost = 18000;
    const marketingAlloc = 100000;

    // Expected independent manual values:
    const expectedNetRevenue = 1250000 - 50000 - 0; // 1,200,000
    const expectedCm1 = expectedNetRevenue - cogs;   // 1,200,000 - 500,000 = 700,000
    const expectedPlatformFees = Math.round(1250000 * 0.085); // 106,250
    const expectedPaymentFees = Math.round(1200000 * 0.02);   // 24,000
    const expectedCm2 = expectedCm1 - (expectedPlatformFees + expectedPaymentFees + fulfillmentCost);
    // 700,000 - (106,250 + 24,000 + 18,000) = 551,750
    const expectedCm3 = expectedCm2 - marketingAlloc; // 551,750 - 100,000 = 451,750

    const actual = calculateOrderContribution({
      grossSales,
      discounts,
      returnsRefunds: refunds,
      cogs,
      channel: 'shopee',
      attributedMarketing: marketingAlloc
    });

    expect(actual.netRevenue).toBe(expectedNetRevenue);
    expect(actual.cogs).toBe(cogs);
    expect(actual.cm1).toBe(expectedCm1);
    expect(actual.marketplaceFees).toBe(expectedPlatformFees);
    expect(actual.paymentFees).toBe(expectedPaymentFees);
    expect(actual.fulfillmentCosts).toBe(fulfillmentCost);
    expect(actual.cm2).toBe(expectedCm2);
    expect(actual.cm3).toBe(expectedCm3);
    expect(actual.cm1Margin).toBe(Number(((expectedCm1 / expectedNetRevenue) * 100).toFixed(1)));
    expect(actual.cm2Margin).toBe(Number(((expectedCm2 / expectedNetRevenue) * 100).toFixed(1)));
    expect(actual.cm3Margin).toBe(Number(((expectedCm3 / expectedNetRevenue) * 100).toFixed(1)));
  });

  it('2. Independent Reference Check: Break-Even Price Formula', () => {
    // Formula: Price = (COGS + Fulfillment) / (1 - (Fee% + Payment%))
    const cogs = 250000;
    const fulfillment = 20000;
    const feeRate = 0.095;
    const paymentRate = 0.02;
    const denominator = 1 - (feeRate + paymentRate); // 0.885

    const expectedBreakEven = Math.round((cogs + fulfillment) / denominator);
    // 270,000 / 0.885 = 305,085

    const sim = simulatePricing({
      basePrice: 500000,
      cogs,
      marketplaceFeePercent: 9.5,
      paymentFeePercent: 2.0,
      packagingFulfillmentCost: fulfillment,
      allocatedMarketingPercent: 0,
      targetCm2Percent: 30,
      voucherDiscountAmount: 0
    });

    expect(sim.breakEvenPrice).toBe(expectedBreakEven);
  });

  it('3. Reconciles Executive Dashboard KPI vs Order Economics Table Under Same Scope', () => {
    const dash = analyticsService.getExecutiveDashboardData('last_30_days');
    const orderEcon = analyticsService.getOrderEconomics();

    // The order economics list should sum up to consistent positive metrics
    const totalOrderNet = orderEcon.reduce((sum, o) => sum + o.netRevenue, 0);
    const totalOrderGross = orderEcon.reduce((sum, o) => sum + o.grossSales, 0);
    const totalOrderCm1 = orderEcon.reduce((sum, o) => sum + o.cm1, 0);

    expect(totalOrderGross).toBeGreaterThanOrEqual(totalOrderNet);
    expect(totalOrderNet).toBeGreaterThanOrEqual(totalOrderCm1);
    expect(dash.kpis.netRevenue.value).toBeGreaterThan(0);

    // Dashboard 30-day KPI aligns with 30-day order volume
    const allOrders = mockStore.getOrders();
    const { current: orders30d } = analyticsService.filterOrdersByPeriod(allOrders, 'last_30_days');
    expect(dash.kpis.orderVolume.value).toBe(orders30d.length);
    expect(orderEcon.length).toBeGreaterThanOrEqual(orders30d.length);
  });

  it('4. Confirms absence of Tài chính Terus Tech.xlsx in workspace', () => {
    const rootPath = path.resolve(__dirname, '../../');
    const filesInRoot = fs.readdirSync(rootPath);
    const hasTerus = filesInRoot.some(f => f.toLowerCase().includes('terus') || f.toLowerCase().includes('tài chính terus'));
    expect(hasTerus).toBe(false);
  });

  it('5. Audit all cost components of CM1 - CM2: Gap is exactly 0', () => {
    const orders = analyticsService.getOrderEconomics();
    let totalGross = 0;
    let totalNet = 0;
    let totalCogs = 0;
    let totalCm1 = 0;
    let totalMktFees = 0;
    let totalPayFees = 0;
    let totalFulfillment = 0;
    let totalShipSubsidies = 0;
    let totalReturnCosts = 0;
    let totalCm2 = 0;

    orders.forEach(o => {
      totalGross += o.grossSales;
      totalNet += o.netRevenue;
      totalCogs += o.cogs;
      totalCm1 += o.cm1;
      totalMktFees += o.marketplaceFees;
      totalPayFees += o.paymentFees;
      totalFulfillment += o.fulfillmentCosts;
      totalShipSubsidies += o.shippingSubsidies;
      totalReturnCosts += o.returnCosts;
      totalCm2 += o.cm2;

      // Order-level invariant check
      const orderVarCosts = o.marketplaceFees + o.paymentFees + o.fulfillmentCosts + o.shippingSubsidies + o.returnCosts;
      expect(o.cm1 - o.cm2).toBe(orderVarCosts);
    });

    const sumVarCosts = totalMktFees + totalPayFees + totalFulfillment + totalShipSubsidies + totalReturnCosts;
    expect(totalCm1 - totalCm2).toBe(sumVarCosts);
    expect((totalCm1 - totalCm2) - sumVarCosts).toBe(0);
  });
});
