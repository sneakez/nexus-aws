import type { MockDatabaseSnapshot } from './types';
import { commerceFixture } from './commerceFixture';

/** Independent MONEY fixture: opening 200k, expected 1.35M, debt accrues on receipt. */
export function moneyFixture(base: MockDatabaseSnapshot): MockDatabaseSnapshot {
  const state = commerceFixture(base);
  const templates = state.marketplaceEvents!;
  const now = new Date().toISOString();
  state.snapshotId = 'MONEY-ACCEPTANCE';
  state.finance = { accounts: [{ id: 'money-bank', tenant_id: state.activeTenantId, name: 'Tài khoản mock · fixture tiền', opening_balance: 200000, opening_date: now.slice(0, 10), opening_reference: 'Fixture độc lập: 200.000 VND mô phỏng' }], documents: [], settlements: [], payables: [], command_signatures: {}, pricing: [], operations: {} };
  state.marketplaceEvents = templates.slice(0, 2).map((event, index) => ({ ...event, id: `money-event-${index + 1}`, shop_id: 'acceptance-shop-0', status: 'pending', order: { ...event.order, id: `money-order-${index + 1}`, shop_id: 'acceptance-shop-0', channel: 'shopee', order_number: `MONEY-${index + 1}`, channel_order_sn: `MONEY-SOURCE-${index + 1}`, total: index ? 500000 : 1000000, subtotal: index ? 500000 : 1000000, ads_spend: index ? 0 : 100000 }, items: event.items.map(item => ({ ...item, id: `money-item-${index + 1}`, order_id: `money-order-${index + 1}`, unit_price: index ? 500000 : 1000000, line_total: index ? 500000 : 1000000 })) }));
  return state;
}
