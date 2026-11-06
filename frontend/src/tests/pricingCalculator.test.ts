import { expect, it } from 'vitest';
import { calculatePricing } from '@/app/BackendPricingCalculator';

it('calculates break-even, recommended price and CM3 from the same pricing assumptions', () => {
  const result = calculatePricing({ listPrice: 500_000, cost: 200_000, marketplaceFee: 8, paymentFee: 2, fulfillmentCost: 18_000, advertisingFee: 8, targetMargin: 35, voucher: 30_000 });

  expect(result.breakEven).toBe(242_223);
  expect(result.recommended).toBe(396_364);
  expect(result.cm1).toBe(270_000);
  expect(result.cm2).toBe(205_000);
  expect(result.cm3).toBe(167_400);
});

it('does not invent a recommended price when fees and target margin reach 100%', () => {
  const result = calculatePricing({ listPrice: 100_000, cost: 20_000, marketplaceFee: 60, paymentFee: 10, fulfillmentCost: 5_000, advertisingFee: 0, targetMargin: 30, voucher: 0 });
  expect(result.recommended).toBeNull();
});
