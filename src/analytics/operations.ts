import type { Order } from '@/types';
import type { MockDatabaseSnapshot } from '@/mock/types';
import { operationsConfig } from '@/mock/finance';
import { commerceOrderMetrics } from '@/mock/commerceMetrics';

export function orderSla(order: Order, warningHours = 24, now = Date.now()) {
  const deadline = Date.parse(order.must_ship_by_sla || '');
  const handoff = Date.parse(order.shipped_at || '');
  if (order.status === 'cancelled') return { status: 'excluded', label: 'Đã hủy · không tính bàn giao', hours: null };
  if (!Number.isFinite(deadline)) return { status: 'unknown', label: 'Chưa có SLA', hours: null };
  if (Number.isFinite(handoff)) return { status: handoff <= deadline ? 'on_time' : 'late_handoff', label: handoff <= deadline ? 'Đã bàn giao đúng hạn' : 'Đã bàn giao trễ hạn', hours: (deadline - handoff) / 3600000 };
  if (['delivered', 'shipped'].includes(order.status)) return { status: 'unknown', label: 'Thiếu mốc bàn giao', hours: null };
  const hours = (deadline - now) / 3600000;
  return { status: hours < 0 ? 'overdue' : hours <= warningHours ? 'due_soon' : 'within', hours, label: hours < 0 ? `${Math.ceil(-hours)}g quá hạn` : `Còn ${Math.ceil(hours)}g${hours <= warningHours ? ' · sắp hạn' : ''}` };
}
export function slaSummary(orders: Order[], warningHours = 24, now = Date.now()) {
  const rows = orders.map(order => ({ order, ...orderSla(order, warningHours, now) }));
  const onTime = rows.filter(r => r.status === 'on_time').length, late = rows.filter(r => r.status === 'late_handoff').length;
  return { rows, overdue: rows.filter(r => r.status === 'overdue').length, dueSoon: rows.filter(r => r.status === 'due_soon').length, unknown: rows.filter(r => r.status === 'unknown').length, onTime, late, compliance: onTime + late ? 100 * onTime / (onTime + late) : null };
}
export function operationalInsights(state: MockDatabaseSnapshot, orders: Order[], inventory: MockDatabaseSnapshot['inventory5State'], now = Date.now()) {
  const config = operationsConfig(state);
  const allowed = new Set(orders.map(o => o.id));
  const items = state.orderItems.filter(i => allowed.has(i.order_id));
  const channelSales = new Map<string, number>();
  for (const order of orders) channelSales.set(order.channel, (channelSales.get(order.channel) || 0) + commerceOrderMetrics(state, order).sales);
  const total = [...channelSales.values()].reduce((s, n) => s + n, 0);
  const concentration = [...channelSales].map(([channel, net]) => ({ channel, net, percent: total > 0 ? net / total * 100 : null })).filter(r => r.percent !== null && r.percent >= config.concentration_percent);
  const historyOrders=orders.filter(o=>Date.parse(o.placed_at)>=now-config.history_days*86400000);
  const products = [...new Set(inventory.map(i => i.product_id))].map(id => {
    const product = state.products.find(p => p.id === id)!;
    const related = historyOrders.filter(o => o.status === 'delivered' && items.some(i => i.product_id === id && i.order_id === o.id));
    const earliest = Math.min(...historyOrders.map(o => Date.parse(o.placed_at)).filter(Number.isFinite));
    const productSince = Date.parse(product?.created_at || '');
    const historySince = Math.max(earliest, Number.isFinite(productSince) ? productSince : earliest);
    const sufficient = Number.isFinite(historySince) && now - historySince >= config.slow_days * 86400000;
    const recent = related.filter(o => now - Date.parse(o.delivered_at || o.placed_at) <= config.slow_days * 86400000);
    const units = items.filter(i => i.product_id === id && recent.some(o => o.id === i.order_id)).reduce((s, i) => s + i.quantity, 0);
    return { productId: id, sku: product?.sku || id, available: inventory.filter(i => i.product_id === id).reduce((s, i) => s + i.available, 0), units, sufficient, slow: sufficient && recent.length === 0, historyDays: Number.isFinite(historySince) ? Math.max(0, Math.floor((now - historySince) / 86400000)) : 0 };
  });
  return { config, concentration, products, totalNetSales: total, definition: 'Doanh thu net đã giao − refund; cùng kỳ lọc và scope. Lịch sử quan sát mock, không dự báo nâng cao.' };
}
