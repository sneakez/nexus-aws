import type {
  PricingSimulationInput,
  PricingSimulationResult,
  OrderUnitEconomics,
  SkuUnitEconomics,
  ChannelUnitEconomics
} from './types';
import type { Channel } from '@/types';

// ============ Safe Arithmetic Helpers ============

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!denominator || isNaN(denominator) || denominator === 0 || !isFinite(numerator) || !isFinite(denominator)) {
    return fallback;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
}

export function calculatePercentDelta(current: number, previous: number): { delta: number; deltaPercent: number; trend: 'up' | 'down' | 'flat' } {
  const delta = current - previous;
  if (!previous || previous === 0) {
    return {
      delta,
      deltaPercent: current > 0 ? 100 : 0,
      trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
    };
  }
  const deltaPercent = (delta / Math.abs(previous)) * 100;
  return {
    delta,
    deltaPercent: Number(deltaPercent.toFixed(1)),
    trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  };
}

// ============ Default Channel Fee Benchmarks ============
export const CHANNEL_FEE_BENCHMARKS: Record<Channel, { commissionRate: number; paymentRate: number; avgFulfillmentCost: number; defaultReturnRate: number }> = {
  shopee: { commissionRate: 0.085, paymentRate: 0.02, avgFulfillmentCost: 18000, defaultReturnRate: 0.045 },
  tiktok: { commissionRate: 0.060, paymentRate: 0.015, avgFulfillmentCost: 20000, defaultReturnRate: 0.070 },
  lazada: { commissionRate: 0.075, paymentRate: 0.02, avgFulfillmentCost: 19000, defaultReturnRate: 0.035 },
  website: { commissionRate: 0.000, paymentRate: 0.025, avgFulfillmentCost: 22000, defaultReturnRate: 0.020 },
  other_digital: { commissionRate: 0.050, paymentRate: 0.020, avgFulfillmentCost: 18000, defaultReturnRate: 0.025 }
};

// ============ Unit Economics Calculations ============

/**
 * Computes CM1, CM2, CM3 for an individual order or order line
 */
export function calculateOrderContribution(params: {
  grossSales: number;
  discounts: number;
  returnsRefunds: number;
  cogs: number;
  channel: Channel;
  customMarketplaceFees?: number;
  customFulfillmentCost?: number;
  shippingSubsidies?: number;
  returnCosts?: number;
  attributedMarketing?: number;
}): {
  netRevenue: number;
  cogs: number;
  cm1: number;
  cm1Margin: number;
  marketplaceFees: number;
  paymentFees: number;
  fulfillmentCosts: number;
  shippingSubsidies: number;
  returnCosts: number;
  totalVariableCosts: number;
  cm2: number;
  cm2Margin: number;
  attributedMarketingCosts: number;
  cm3: number;
  cm3Margin: number;
} {
  const benchmarks = CHANNEL_FEE_BENCHMARKS[params.channel] || CHANNEL_FEE_BENCHMARKS.website;
  const netRevenue = Math.max(0, params.grossSales - params.discounts - params.returnsRefunds);
  const cogs = Math.max(0, params.cogs);

  // CM1: Net Revenue - COGS
  const cm1 = netRevenue - cogs;
  const cm1Margin = safeDivide(cm1, netRevenue) * 100;

  // Variable Costs for CM2
  const marketplaceFees = params.customMarketplaceFees ?? Math.round(params.grossSales * benchmarks.commissionRate);
  const paymentFees = Math.round(netRevenue * benchmarks.paymentRate);
  const fulfillmentCosts = params.customFulfillmentCost ?? benchmarks.avgFulfillmentCost;
  const shippingSubsidies = params.shippingSubsidies ?? 0;
  const returnCosts = params.returnCosts ?? 0;
  const totalVariableCosts = marketplaceFees + paymentFees + fulfillmentCosts + shippingSubsidies + returnCosts;

  // CM2: CM1 - Variable Fulfillment, Transaction, Shipping & Return Costs
  const cm2 = cm1 - totalVariableCosts;
  const cm2Margin = safeDivide(cm2, netRevenue) * 100;

  // CM3: CM2 - Attributed Marketing Costs
  const attributedMarketingCosts = params.attributedMarketing ?? 0;
  const cm3 = cm2 - attributedMarketingCosts;
  const cm3Margin = safeDivide(cm3, netRevenue) * 100;

  return {
    netRevenue,
    cogs,
    cm1,
    cm1Margin: Number(cm1Margin.toFixed(1)),
    marketplaceFees,
    paymentFees,
    fulfillmentCosts,
    shippingSubsidies,
    returnCosts,
    totalVariableCosts,
    cm2,
    cm2Margin: Number(cm2Margin.toFixed(1)),
    attributedMarketingCosts,
    cm3,
    cm3Margin: Number(cm3Margin.toFixed(1))
  };
}

/**
 * Dynamic Pricing Simulator Engine
 * Calculates Break-even price, Recommended price, and Max allowable discount
 */
export function simulatePricing(input: PricingSimulationInput): PricingSimulationResult {
  const taxRate = input.taxIncludedInFees ? 0 : (input.configuredTaxPercent || 0);
  const feeRate = (input.marketplaceFeePercent + input.paymentFeePercent + taxRate) / 100;
  const targetMarginRate = input.targetCm2Percent / 100;
  const adsRate = input.allocatedMarketingPercent / 100;

  // Break-even price (CM2 = 0)
  // Price * (1 - feeRate) = COGS + Fulfillment
  // Price = (COGS + Fulfillment) / (1 - feeRate)
  const denominatorCm2 = 1 - feeRate;
  const breakEvenPrice = denominatorCm2 > 0
    ? Math.round((input.cogs + input.packagingFulfillmentCost) / denominatorCm2)
    : 0;

  // Break-even price with Marketing (CM3 = 0)
  const denominatorCm3 = 1 - feeRate - adsRate;
  const breakEvenWithAds = denominatorCm3 > 0
    ? Math.round((input.cogs + input.packagingFulfillmentCost) / denominatorCm3)
    : 0;

  // Recommended Price to achieve Target CM2%
  // Price * (1 - feeRate - targetMarginRate) = COGS + Fulfillment
  const denominatorTarget = 1 - feeRate - targetMarginRate;
  const recommendedPrice = denominatorTarget > 0
    ? Math.round((input.cogs + input.packagingFulfillmentCost) / denominatorTarget)
    : 0;

  // Maximum allowed discount on current base price before CM2 turns negative:
  // BasePrice - MaxDiscount = BreakEvenPrice
  const maxAllowedDiscount = Math.max(0, input.basePrice - breakEvenPrice);

  // Simulate current waterfall for base price minus current voucher discount
  const actualEffectivePrice = Math.max(0, input.basePrice - input.voucherDiscountAmount);
  const platformFees = Math.round(actualEffectivePrice * (input.marketplaceFeePercent / 100));
  const paymentFees = Math.round(actualEffectivePrice * (input.paymentFeePercent / 100));
  const configuredTax = Math.round(actualEffectivePrice * taxRate / 100);
  const adsCost = Math.round(actualEffectivePrice * adsRate);

  const simulatedCm1 = actualEffectivePrice - input.cogs;
  const simulatedCm1Margin = safeDivide(simulatedCm1, actualEffectivePrice) * 100;

  const simulatedCm2 = simulatedCm1 - (platformFees + paymentFees + configuredTax + input.packagingFulfillmentCost);
  const simulatedCm2Margin = safeDivide(simulatedCm2, actualEffectivePrice) * 100;

  const simulatedCm3 = simulatedCm2 - adsCost;
  const simulatedCm3Margin = safeDivide(simulatedCm3, actualEffectivePrice) * 100;

  const waterfallBreakdown: PricingSimulationResult['waterfallBreakdown'] = [
    { name: '1. Giá niêm yết (List Price)', amount: input.basePrice, percentageOfRevenue: 100, type: 'positive' },
    { name: '2. Voucher / Giảm giá', amount: -input.voucherDiscountAmount, percentageOfRevenue: safeDivide(-input.voucherDiscountAmount, actualEffectivePrice) * 100, type: 'negative' },
    { name: '3. Doanh thu thuần (Net)', amount: actualEffectivePrice, percentageOfRevenue: 100, type: 'subtotal' },
    { name: '4. Giá vốn hàng bán (COGS)', amount: -input.cogs, percentageOfRevenue: safeDivide(-input.cogs, actualEffectivePrice) * 100, type: 'negative' },
    { name: '5. Lãi gộp CM1', amount: simulatedCm1, percentageOfRevenue: simulatedCm1Margin, type: 'subtotal' },
    { name: '6. Phí sàn / thanh toán / thuế tự cấu hình', amount: -(platformFees + paymentFees + configuredTax), percentageOfRevenue: safeDivide(-(platformFees + paymentFees + configuredTax), actualEffectivePrice) * 100, type: 'negative' },
    { name: '7. Đóng gói & Vận hành', amount: -input.packagingFulfillmentCost, percentageOfRevenue: safeDivide(-input.packagingFulfillmentCost, actualEffectivePrice) * 100, type: 'negative' },
    { name: '8. Lợi nhuận đóng góp CM2', amount: simulatedCm2, percentageOfRevenue: simulatedCm2Margin, type: 'subtotal' },
    { name: '9. Phân bổ Chi phí Ads', amount: -adsCost, percentageOfRevenue: safeDivide(-adsCost, actualEffectivePrice) * 100, type: 'negative' },
    { name: '10. Lợi nhuận sau Ads CM3', amount: simulatedCm3, percentageOfRevenue: simulatedCm3Margin, type: 'subtotal' }
  ];

  return {
    valid: denominatorCm2 > 0 && denominatorCm3 > 0 && denominatorTarget > 0,
    invalidReason: denominatorCm2 <= 0 || denominatorCm3 <= 0 || denominatorTarget <= 0 ? 'Tỷ lệ phí/Ads/biên mục tiêu không khả thi; không có giá đề xuất hợp lệ.' : undefined,
    breakEvenPrice,
    breakEvenWithAds,
    recommendedPrice,
    maxAllowedDiscount,
    waterfallBreakdown,
    simulatedCm1,
    simulatedCm1Margin: Number(simulatedCm1Margin.toFixed(1)),
    simulatedCm2,
    simulatedCm2Margin: Number(simulatedCm2Margin.toFixed(1)),
    simulatedCm3,
    simulatedCm3Margin: Number(simulatedCm3Margin.toFixed(1))
  };
}
