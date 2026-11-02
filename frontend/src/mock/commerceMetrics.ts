import type { MockDatabaseSnapshot } from './types';
import type { Order } from '@/types';

/** One money calculation for work queues, Growth and order P&L. Credits never become sales. */
export function commerceOrderMetrics(state: MockDatabaseSnapshot, order: Order) {
  const items = state.orderItems.filter(i => i.order_id === order.id);
  const returns = state.returns.filter(r => r.order_id === order.id);
  const returned = state.returnItems.filter(i => returns.some(r => r.id === i.return_id));
  const sales = order.status === 'delivered' ? Math.max(0, order.total - (order.refunded_amount || (order.payment_status === 'refunded' ? order.total : 0))) : 0;
  const dispatched = !!order.shipped_at;
  const goodByProduct = new Map<string, number>();
  for (const line of returned) goodByProduct.set(line.product_id, (goodByProduct.get(line.product_id) || 0) + (line.qc_pass_qty || 0));
  const cogs = dispatched ? Math.round(items.reduce((s, i) => {
    const reversed = Math.min(i.quantity, goodByProduct.get(i.product_id) || 0);
    goodByProduct.set(i.product_id, (goodByProduct.get(i.product_id) || 0) - reversed);
    return s + (i.quantity - reversed) * i.unit_cost_mac_snapshot;
  }, 0)) : 0;
  const fees = state.orderFeeBreakdowns?.filter(f => f.order_id === order.id) || [];
  const baseFees = fees.reduce((s, f) => s + f.commission_fee + f.transaction_fee + f.voucher_co_fund_fee + f.actual_shipping_fee + f.weight_penalty_fee, 0);
  const adjustments = fees.flatMap(f => f.adjustments || []);
  const feeCredit = adjustments.filter(a => a.kind !== 'compensation').reduce((s, a) => s + a.amount, 0);
  const compensation = adjustments.filter(a => a.kind === 'compensation').reduce((s, a) => s + a.amount, 0);
  const adsSpend = order.ads_spend || 0, adsCredit = order.ads_credit || 0;
  const packaging = order.packaging_cost || 0;
  const contribution = sales - cogs - baseFees + feeCredit + compensation - packaging - adsSpend + adsCredit;
  return { orderId: order.id, sales, cogs, fees: baseFees - feeCredit, packaging, adsSpend, adsCredit, netAds: adsSpend - adsCredit, compensation, contribution,
    sourceRevenue: order.source_ads_revenue || 0, finalized: !!fees.length && fees.every(f => f.is_reconciled), source: 'MOCK_SOURCE' as const };
}

export function commerceSummary(state: MockDatabaseSnapshot, orders = state.orders.filter(o => o.tenant_id === state.activeTenantId)) {
  const rows = orders.map(o => commerceOrderMetrics(state, o));
  const sum = (key: keyof typeof rows[number]) => rows.reduce((s, r) => s + (typeof r[key] === 'number' ? r[key] as number : 0), 0);
  const sales = sum('sales'), netAds = sum('netAds'), adsSpend = sum('adsSpend');
  return { rows, sales, adsSpend, netAds, adsCredit: sum('adsCredit'), compensation: sum('compensation'), contribution: sum('contribution'),
    retainedRevenueRatio: netAds ? sales / netAds : 0, sourceRatio: adsSpend ? sum('sourceRevenue') / adsSpend : 0 };
}
