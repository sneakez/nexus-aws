import type { MockDatabaseSnapshot } from './types';

export type ReceiptLine = { item_id?: string; product_id?: string; received_qty: number; serials?: string[] };
export type QcLine = { item_id?: string; product_id?: string; pass_qty: number; fail_qty: number };
export const commandId = () => crypto.randomUUID();
const quantity = (n: number) => Number.isSafeInteger(n) && n >= 0;

export function inventoryForReceipt(draft: MockDatabaseSnapshot, productId: string, warehouseId: string) {
  let inv = draft.inventory5State.find(i => i.product_id === productId && i.warehouse_id === warehouseId);
  if (inv) return inv;
  const product = draft.products.find(p => p.id === productId);
  const warehouse = draft.warehouses.find(w => w.id === warehouseId);
  if (!product || !warehouse || product.tenant_id !== warehouse.tenant_id) throw Error('SKU/kho không thuộc cùng tenant');
  inv = { sku: product.sku, product_id: product.id, name: product.name, warehouse_id: warehouseId, warehouse_name: warehouse.name,
    physical: 0, available: 0, sellable: 0, reserved: 0, unavailable: 0, pending_qc: 0, damaged: 0, in_transit: 0, incoming: 0, inbound: 0,
    safety_stock: product.safety_stock || 0, reorder_level: product.reorder_level || 0, sales_velocity: 0, runway_days: 0, status: 'Critical' };
  draft.inventory5State.push(inv);
  return inv;
}

// Work only on the transaction draft. A thrown validation error discards the entire draft.
export function receiveReturn(draft: MockDatabaseSnapshot, returnId: string, lines: ReceiptLine[] | undefined,
  options: { receiptId?: string; warehouseId?: string }, actorId: string) {
  const ret = draft.returns.find(r => r.id === returnId)!;
  if (ret.is_refund_without_return || ret.rma_branch === 'returnless_refund') throw Error('Hoàn tiền không nhận hàng: không có thao tác kho');
  if (['rejected', 'cancelled', 'closed', 'completed'].includes(ret.status)) throw Error('Phiếu đã bị từ chối/hủy/đóng; không nhận thêm hàng');
  const order = draft.orders.find(o => o.id === ret.order_id)!;
  const warehouseId = options.warehouseId || ret.warehouse_id || order.assigned_warehouse_id;
  if (!warehouseId) throw Error('Phiếu hoàn chưa được chỉ định kho');
  const items = draft.returnItems.filter(i => i.return_id === returnId);
  if (ret.receiving_closed) throw Error('Phần nhận hàng đã chốt; Vận hành phải mở lại khi hàng đến muộn');
  if (!items.length) throw Error('Phiếu không có hàng cần nhận');
  const id = options.receiptId || commandId();
  draft.returnReceipts ||= [];
  const previous = draft.returnReceipts.find(r => r.id === id);
  const signature = JSON.stringify({ returnId, warehouseId, lines });
  draft.processedCommands ||= {};
  if (previous) {
    if (draft.processedCommands[`receipt:${id}`] !== signature) throw Error('Mã nhận hàng đã dùng với nội dung khác');
    return;
  }
  if (ret.warehouse_id && ret.warehouse_id !== warehouseId) throw Error('Không được đổi kho giữa các lần nhận');
  const used = new Set<string>();
  const planned = (lines || items.map<ReceiptLine>(i => ({ item_id: i.id, received_qty: i.quantity - (i.received_qty || 0) }))).map(line => {
    const matches = items.filter(i => line.item_id ? i.id === line.item_id : i.product_id === line.product_id);
    if (matches.length !== 1) throw Error('Dòng nhận không xác định duy nhất');
    const item = matches[0];
    if (!item.id || used.has(item.id)) throw Error('Dòng nhận trùng lặp');
    used.add(item.id);
    if (!quantity(line.received_qty) || line.received_qty > item.quantity - (item.received_qty || 0)) throw Error('Số lượng nhận âm, lẻ hoặc vượt lượng còn chờ');
    const inv = inventoryForReceipt(draft, item.product_id, warehouseId);
    const serials = 'serials' in line ? line.serials : undefined;
    if (serials && (serials.length !== line.received_qty || new Set(serials).size !== serials.length)) throw Error('Serial trùng hoặc không khớp số nhận');
    if (serials?.some(s => draft.returnReceipts!.some(r => r.lines.some(l => l.serials?.includes(s))))) throw Error('Serial đã được nhận trước đó');
    const expectedSerials = draft.orderItems.filter(i => i.order_id === order.id && i.product_id === item.product_id).flatMap(i => i.serial_numbers || []);
    const wrongSerial = expectedSerials.length > 0 && (!serials || serials.some(s => !expectedSerials.includes(s)));
    return { item, inv, qty: line.received_qty, serials, wrongSerial };
  });
  if (!planned.some(p => p.qty > 0)) throw Error('Không còn số lượng để nhận');
  const now = new Date().toISOString();
  for (const { item, inv, qty } of planned) {
    item.received_qty = (item.received_qty || 0) + qty;
    inv.physical += qty;
    inv.pending_qc += qty;
    inv.unavailable = inv.pending_qc + inv.damaged;
    inv.available = inv.sellable = inv.physical - inv.reserved - inv.unavailable;
    if (qty) draft.stockLedger.unshift({ id: commandId(), tenant_id: order.tenant_id, product_id: item.product_id,
      warehouse_id: warehouseId, transaction_type: 'inbound', quantity: qty, reference_type: 'return', reference_id: returnId,
      notes: `Thực nhận ${qty}; chứng từ ${id}`, balance_after: inv.physical, created_at: now });
  }
  draft.returnReceipts.push({ id, return_id: returnId, warehouse_id: warehouseId, actor_id: actorId, created_at: now,
    lines: planned.filter(p => p.qty > 0).map(p => ({ item_id: p.item.id!, quantity: p.qty, pass_qty: 0, fail_qty: 0, serials: p.serials, wrong_serial: p.wrongSerial })) });
  draft.processedCommands[`receipt:${id}`] = signature;
  ret.warehouse_id = warehouseId;
  ret.status = 'received';
  ret.updated_at = now;
  updateDiscrepancy(draft, returnId);
}

export function inspectReturn(draft: MockDatabaseSnapshot, returnId: string, good: boolean, lines: QcLine[] | undefined,
  options: { inspectionId?: string; receiptId?: string }, actorId: string) {
  const ret = draft.returns.find(r => r.id === returnId)!;
  if (ret.is_refund_without_return || ret.rma_branch === 'returnless_refund') throw Error('Hoàn tiền không nhận hàng: không có thao tác kho');
  if (['rejected', 'cancelled', 'closed', 'completed'].includes(ret.status)) throw Error('Phiếu không còn ở bước kiểm hàng');
  const id = options.inspectionId || commandId();
  const signature = JSON.stringify({ returnId, good, lines, receiptId: options.receiptId });
  draft.processedCommands ||= {};
  if (draft.processedCommands[`qc:${id}`]) {
    if (draft.processedCommands[`qc:${id}`] !== signature) throw Error('Mã QC đã dùng với nội dung khác');
    return;
  }
  const receipts = (draft.returnReceipts || []).filter(r => r.return_id === returnId && (!options.receiptId || r.id === options.receiptId));
  if (!receipts.length) throw Error('Phải nhận hàng thực tế trước khi QC');
  const items = draft.returnItems.filter(i => i.return_id === returnId);
  const used = new Set<string>();
  const plan = (lines || items.map<QcLine>(i => {
    const pending = receipts.reduce((s, r) => s + r.lines.filter(l => l.item_id === i.id).reduce((n, l) => n + l.quantity - l.pass_qty - l.fail_qty, 0), 0);
    return { item_id: i.id, pass_qty: good ? pending : 0, fail_qty: good ? 0 : pending };
  })).map(line => {
    const matches = items.filter(i => line.item_id ? i.id === line.item_id : i.product_id === line.product_id);
    if (matches.length !== 1 || !matches[0].id || used.has(matches[0].id!)) throw Error('Dòng QC không hợp lệ hoặc trùng');
    const item = matches[0]; used.add(item.id!);
    const pending = receipts.reduce((s, r) => s + r.lines.filter(l => l.item_id === item.id).reduce((n, l) => n + l.quantity - l.pass_qty - l.fail_qty, 0), 0);
    const total = line.pass_qty + line.fail_qty;
    if (!quantity(line.pass_qty) || !quantity(line.fail_qty) || total > pending) throw Error('QC vượt số thực nhận còn chờ hoặc số lượng âm/lẻ');
    const inv = draft.inventory5State.find(i => i.product_id === item.product_id && i.warehouse_id === ret.warehouse_id);
    if (!inv || inv.pending_qc < total) throw Error('Tồn chờ QC không khớp chứng từ');
    if (line.pass_qty && receipts.some(r => r.lines.some(l => l.item_id === item.id && l.wrong_serial && l.quantity > l.pass_qty + l.fail_qty))) throw Error('Sai hoặc thiếu serial: phải cách ly, không nhập khả dụng');
    return { item, inv, ...line, total };
  });
  if (!plan.some(p => p.total > 0)) throw Error('Không còn hàng chờ QC; kết quả đã áp dụng');
  for (const p of plan) {
    let pass = p.pass_qty, fail = p.fail_qty;
    for (const receipt of receipts) for (const line of receipt.lines.filter(l => l.item_id === p.item.id)) {
      let pending = line.quantity - line.pass_qty - line.fail_qty;
      const passed = Math.min(pass, pending); line.pass_qty += passed; pass -= passed; pending -= passed;
      const failed = Math.min(fail, pending); line.fail_qty += failed; fail -= failed;
    }
    p.item.qc_pass_qty = (p.item.qc_pass_qty || 0) + p.pass_qty;
    p.item.qc_fail_qty = (p.item.qc_fail_qty || 0) + p.fail_qty;
    p.item.disposition = p.item.qc_fail_qty ? 'quarantine' : 'restock';
    p.inv.pending_qc -= p.total;
    p.inv.damaged += p.fail_qty;
    p.inv.unavailable = p.inv.pending_qc + p.inv.damaged;
    p.inv.available = p.inv.sellable = p.inv.physical - p.inv.reserved - p.inv.unavailable;
    if (p.total) draft.stockLedger.unshift({ id: commandId(), tenant_id: draft.activeTenantId, product_id: p.item.product_id,
      warehouse_id: ret.warehouse_id!, transaction_type: 'adjustment', quantity: p.total, reference_type: 'return_qc', reference_id: returnId,
      notes: `QC ${id}: đạt ${p.pass_qty}, cách ly ${p.fail_qty}; người ${actorId}`, balance_after: p.inv.available, created_at: new Date().toISOString() });
  }
  const pending = items.some(i => (i.received_qty || 0) > (i.qc_pass_qty || 0) + (i.qc_fail_qty || 0));
  ret.status = pending ? 'received' : items.some(i => (i.qc_fail_qty || 0) > 0) ? 'qc_failed' : 'qc_passed';
  ret.updated_at = new Date().toISOString();
  draft.processedCommands[`qc:${id}`] = signature;
  updateDiscrepancy(draft, returnId);
}

function updateDiscrepancy(draft: MockDatabaseSnapshot, returnId: string) {
  const ret = draft.returns.find(r => r.id === returnId)!;
  const items = draft.returnItems.filter(i => i.return_id === returnId);
  items.forEach(i => { i.missing_qty = i.quantity - (i.received_qty || 0); });
  const missing = items.reduce((s, i) => s + i.missing_qty!, 0);
  const failed = items.reduce((s, i) => s + (i.qc_fail_qty || 0), 0);
  ret.has_discrepancy = missing + failed > 0;
  ret.missing_items_count = missing;
  const id = `task_discrepancy_${returnId}`;
  draft.customerComplaints ||= [];
  const existing = draft.customerComplaints.find(c => c.id === id);
  const raw_content = `[Biên bản kiểm đếm kho] ${ret.return_number}: thiếu ${missing} sản phẩm; cách ly ${failed}. Vận hành kiểm tra chứng từ nhận/QC trước khi khiếu nại.`;
  if (existing) Object.assign(existing, { raw_content, status: ret.has_discrepancy ? 'open' : 'closed', updated_at: new Date().toISOString() });
  else if (ret.has_discrepancy) draft.customerComplaints.unshift({ id, order_id: ret.order_id, customer_id: ret.customer_id || null,
    raw_content, redacted_content: null, sentiment: 'negative', urgency_score: 9, issue_category: 'Return Discrepancy',
    suggested_reply: null, status: 'open', analyzed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
}
