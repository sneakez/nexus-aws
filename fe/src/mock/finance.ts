import type { MockDatabaseSnapshot } from './types';
import { commerceOrderMetrics } from './commerceMetrics';

export interface CashAccount { id: string; tenant_id: string; name: string; opening_balance: number; opening_date: string; opening_reference: string; shop_id?: string; warehouse_id?: string }
export interface CashDocument { id: string; tenant_id: string; kind: 'receipt' | 'payment'; account_id: string; entity_id: string; amount: number; date: string; reference: string; actor_id: string; created_at: string; reason?: string }
export interface MoneyHistory { at: string; actor_id: string; action: string; note: string }
export interface SettlementBatch { id: string; tenant_id: string; shop_id: string; channel: string; order_ids: string[]; expected_date: string | null; original_expected: number; source_adjustment: number; adjustment_reason: string; history: MoneyHistory[] }
export interface SupplierPayable { id: string; tenant_id: string; po_id: string; warehouse_id: string; supplier_id?: string; supplier_name: string; accrued: number; due_date: string | null; receipts: Array<{ id: string; amount: number; at: string }>; extension_status?: 'requested_simulation' | 'confirmed_simulation'; proposed_due_date?: string; history: MoneyHistory[] }
export interface PricingAssumptions { tenant_id?: string; shop_id: string; commission_percent: number; payment_percent: number; packaging: number; ads_percent: number; seller_voucher: number; configured_tax_percent: number; tax_included_in_fees: boolean; low_margin_percent: number }
export interface OperationsConfig { slow_days: number; concentration_percent: number; sla_warning_hours: number; history_days: number; exception_hours: number }
export interface FinanceState { accounts: CashAccount[]; documents: CashDocument[]; settlements: SettlementBatch[]; payables: SupplierPayable[]; command_signatures: Record<string, string>; pricing: PricingAssumptions[]; operations: Record<string, OperationsConfig> }
export function financeState(state: MockDatabaseSnapshot): FinanceState {
  return state.finance || { accounts: [], documents: [], settlements: [], payables: [], command_signatures: {}, pricing: [], operations: {} };
}
export function ensureFinance(state: MockDatabaseSnapshot) { return state.finance ||= structuredClone(financeState(state)); }
export function validMoneyDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value; }
export function moneySignature(value: unknown): string {
  const canonical = (item: unknown): unknown => Array.isArray(item) ? item.map(canonical) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)])) : item;
  return JSON.stringify(canonical(value));
}
export const defaultOperations: OperationsConfig = { slow_days: 14, concentration_percent: 80, sla_warning_hours: 24, history_days: 30, exception_hours: 24 };
export function operationsConfig(state: MockDatabaseSnapshot) { return { ...defaultOperations, ...financeState(state).operations[state.activeTenantId] }; }
export function balance(state: MockDatabaseSnapshot, accountId: string) {
  const f = financeState(state), account = f.accounts.find(a => a.id === accountId);
  return (account?.opening_balance || 0) + f.documents.filter(d => d.account_id === accountId).reduce((sum, d) => sum + (d.kind === 'receipt' ? d.amount : -d.amount), 0);
}
export function batchView(state: MockDatabaseSnapshot, batch: SettlementBatch) {
  const metrics = batch.order_ids.map(id => state.orders.find(o => o.id === id)).filter(o => !!o).map(o => commerceOrderMetrics(state, o!));
  const current_expected = metrics.reduce((s, m) => s + m.sales - m.fees + m.compensation, 0) + batch.source_adjustment;
  const receipts = financeState(state).documents.filter(d => d.entity_id === batch.id && d.kind === 'receipt');
  const received = receipts.reduce((s, d) => s + d.amount, 0), remaining = current_expected - received;
  const reconciled = metrics.length === batch.order_ids.length && metrics.every(m => m.finalized);
  const status = remaining < 0 ? 'adjustment_required' : received > 0 ? remaining === 0 ? 'received' : 'partial' : reconciled ? 'reconciled_waiting' : 'expected';
  return { ...batch, current_expected, received, remaining, adjustment: current_expected - batch.original_expected, discrepancy: received - current_expected, status, receipts, reconciled };
}
export function payableView(state: MockDatabaseSnapshot, payable: SupplierPayable, now = new Date()) {
  const payments = financeState(state).documents.filter(d => d.entity_id === payable.id && d.kind === 'payment');
  const paid = payments.reduce((s, d) => s + d.amount, 0), remaining = payable.accrued - paid;
  const overdue = remaining > 0 && !!payable.due_date && new Date(payable.due_date + 'T23:59:59+07:00') < now;
  return { ...payable, paid, remaining, overdue, status: remaining === 0 ? 'paid' : overdue ? 'overdue' : paid > 0 ? 'partial' : 'unpaid', payments };
}
export function accruePurchaseReceipt(state: MockDatabaseSnapshot, poId: string, amount: number, receiptId: string, actor: string) {
  const f = ensureFinance(state), po = state.purchaseOrders!.find(p => p.id === poId)!;
  const now = new Date().toISOString();
  let payable = f.payables.find(p => p.po_id === poId);
  if (!payable) { payable = { id: `payable-${poId}`, tenant_id: state.activeTenantId, po_id: poId, warehouse_id: po.warehouse_id, supplier_id: po.supplier_id, supplier_name: po.supplier_name, accrued: 0, due_date: null, receipts: [], history: [] }; f.payables.push(payable); }
  payable.accrued += amount;
  payable.receipts.push({ id: receiptId, amount, at: now });
  payable.history.push({ at: now, actor_id: actor, action: 'receipt_accrual', note: `${receiptId}: ${amount} VND; nợ ghi theo giá trị thực nhận PO` });
}
export function cashForecast(state: MockDatabaseSnapshot, batches: ReturnType<typeof batchView>[], payables: ReturnType<typeof payableView>[], available: number, delayDays = 0, now = new Date()) {
  const start = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const dated = [...batches.filter(b => b.remaining > 0).map(b => ({ id: b.id, date: b.expected_date ? new Date(new Date(b.expected_date).getTime() + delayDays * 86400000).toISOString().slice(0, 10) : null, inflow: b.remaining, outflow: 0 })), ...payables.filter(p => p.remaining > 0).map(p => ({ id: p.id, date: p.due_date, inflow: 0, outflow: p.remaining }))];
  let running = available;
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(new Date(start).getTime() + index * 86400000).toISOString().slice(0, 10);
    const entries = dated.filter(e => e.date === date || (index === 0 && e.date && e.date < start));
    const inflow = entries.reduce((s, e) => s + e.inflow, 0), outflow = entries.reduce((s, e) => s + e.outflow, 0);
    running += inflow - outflow;
    return { date, label: index === 0 ? 'Hôm nay / quá hạn' : date, inflow, outflow, netCash: running, references: entries.map(e => e.id), warning: running < 0 ? 'Dự kiến âm theo lịch đã nhập' : '' };
  });
  return { days, undated: dated.filter(e => !e.date), scheduled: dated.length, start };
}
