import type { MockDatabaseSnapshot } from './types';
import type { TenantRole } from '@/types';

export interface WorkItem {
  id: string; orderId?: string; entityId: string; group: TenantRole; title: string; step: string;
  status: 'new' | 'processing' | 'blocked' | 'overdue'; due?: string; href: string;
}

export function workQueue(state: MockDatabaseSnapshot, role: TenantRole): WorkItem[] {
  const tasks: WorkItem[] = [];
  const member = state.memberships.find(m => m.user_id === state.activeUserId && m.tenant_id === state.activeTenantId && m.role === role && m.status === 'active');
  if (!member || role === 'viewer') return [];
  const orders = state.orders.filter(o => o.tenant_id === member.tenant_id && (!member.shop_ids || member.shop_ids.includes(o.shop_id!)) && (!member.warehouse_ids || member.warehouse_ids.includes(o.assigned_warehouse_id!)));
  const add = (item: WorkItem) => { if (role === item.group || role === 'owner') tasks.push(item); };
  for (const o of orders) {
    if (o.status === 'pending' && !o.fulfillment_status) add({ id: `release:${o.id}`, orderId: o.id, entityId: o.id, group: 'manager', title: `Đơn ${o.order_number} · ${o.hold_reason || 'kiểm tra và giao kho'}`, step: 'release', status: o.hold_reason || o.cancellation_requested ? 'blocked' : 'new', due: o.must_ship_by_sla || undefined, href: `orders&order=${o.id}` });
    if (['pending', 'processing'].includes(o.status) && o.fulfillment_status) add({ id: `warehouse:${o.id}`, orderId: o.id, entityId: o.id, group: 'warehouse', title: `Đơn ${o.order_number} · ${o.fulfillment_status}`, step: 'prepare', status: o.cancellation_requested || o.hold_reason ? 'blocked' : o.must_ship_by_sla && new Date(o.must_ship_by_sla).getTime() < Date.now() ? 'overdue' : 'processing', due: o.must_ship_by_sla || undefined, href: `orders&order=${o.id}` });
    if (['pending', 'processing'].includes(o.status) && o.fulfillment_status) add({ id: `monitor:${o.id}`, orderId: o.id, entityId: o.id, group: 'manager', title: `Đơn ${o.order_number} · ${o.hold_reason || (o.cancellation_requested ? 'chờ kết quả hủy · kho dừng xuất' : 'kho đang chuẩn bị')}`, step: 'monitor', status: o.hold_reason || o.cancellation_requested ? 'blocked' : 'processing', due: o.must_ship_by_sla || undefined, href: `orders&order=${o.id}` });
    if (o.status === 'shipped' && o.delivery_status !== 'delivery_failed') add({ id: `carrier:${o.id}`, orderId: o.id, entityId: o.id, group: 'manager', title: `Đơn ${o.order_number} · ${o.carrier_accepted_at ? 'theo dõi giao hàng' : 'kho đã giao, chờ sàn tiếp nhận'}`, step: 'carrier', status: 'processing', href: `orders&order=${o.id}` });
    if (['delivered', 'cancelled'].includes(o.status) || o.delivery_status === 'delivery_failed') {
      const fee = state.orderFeeBreakdowns?.find(f => f.order_id === o.id);
      if (!fee?.is_reconciled) add({ id: `settlement:${o.id}`, orderId: o.id, entityId: fee?.id || o.id, group: 'manager', title: `Đơn ${o.order_number} · ${fee ? 'chờ đối soát tiền' : 'chờ dữ liệu phí sàn'}`, step: 'settlement', status: fee ? 'new' : 'blocked', href: `feeReconciliation&order=${o.id}` });
    }
  }
  for (const ret of state.returns.filter(r => orders.some(o => o.id === r.order_id))) {
    const physicalOpen = !['rejected', 'cancelled', 'closed', 'completed'].includes(ret.status);
    const lines = state.returnItems.filter(i => i.return_id === ret.id);
    const outstanding = physicalOpen && lines.some(i => (!ret.receiving_closed && (i.received_qty || 0) < i.quantity) || (i.received_qty || 0) > (i.qc_pass_qty || 0) + (i.qc_fail_qty || 0));
    if (outstanding && !ret.is_refund_without_return && ret.rma_branch !== 'returnless_refund') add({ id: `return:${ret.id}`, orderId: ret.order_id, entityId: ret.id, group: 'warehouse', title: `${ret.return_number} · nhận thực tế / QC`, step: 'return', status: 'processing', href: `returns&return=${ret.id}` });
    if (outstanding && !ret.receiving_closed && !ret.is_refund_without_return && ret.rma_branch !== 'returnless_refund' && (!ret.has_discrepancy || state.customerComplaints?.find(c => c.id === `task_discrepancy_${ret.id}`)?.status === 'closed')) add({ id: `returnMonitor:${ret.id}`, orderId: ret.order_id, entityId: ret.id, group: 'manager', title: `${ret.return_number} · theo dõi hàng hoàn`, step: 'returnMonitor', status: 'processing', href: `returns&return=${ret.id}` });
    if (ret.claim_status === 'awaiting_compensation') add({ id: `claim:${ret.id}`, orderId: ret.order_id, entityId: ret.id, group: 'manager', title: `${ret.return_number} · chờ bồi thường`, step: 'claim', status: 'processing', href: `returns&return=${ret.id}` });
    if (ret.has_discrepancy) {
      const complaint = state.customerComplaints?.find(c => c.id === `task_discrepancy_${ret.id}`);
      if (complaint?.status !== 'closed') add({ id: `discrepancy:${ret.id}`, orderId: ret.order_id, entityId: ret.id, group: 'manager', title: `${ret.return_number} · thiếu/hỏng, kiểm tra bằng chứng`, step: 'discrepancy', status: 'blocked', href: `returns&return=${ret.id}` });
    }
  }
  for (const event of state.marketplaceEvents || []) if (event.tenant_id === member.tenant_id && event.status !== 'processed' && (!member.shop_ids || member.shop_ids.includes(event.shop_id))) add({ id: `sync:${event.id}`, entityId: event.id, group: 'admin', title: `${event.order.order_number} · ${event.shop_id} · đồng bộ đơn nguồn`, step: 'sync', status: event.status === 'failed' ? 'blocked' : 'new', href: 'syncMonitor' });
  for (const rec of state.growthRecommendations || []) if (rec.tenant_id === member.tenant_id && orders.some(o => o.id === rec.order_id) && rec.status === 'open') add({ id: `recommendation:${rec.id}`, orderId: rec.order_id, entityId: rec.id, group: 'manager', title: rec.reason, step: 'recommendation', status: 'new', href: `orderEconomics&order=${rec.order_id}` });
  for (const o of orders) {
    const record=state.handoffAssignments?.[`monitor:${o.id}`];
    if(record?.status && record.status!=='confirmed') {
      const existing=tasks.find(t=>t.id===`monitor:${o.id}`);
      const item: WorkItem={id:`monitor:${o.id}`,orderId:o.id,entityId:o.id,group:'manager',title:`Đơn ${o.order_number} · ngoại lệ: ${record.note}`,step:'monitor',status:record.due_at&&Date.parse(record.due_at)<Date.now()?'overdue':'processing',due:record.due_at,href:`orders&order=${o.id}`};
      if(existing)Object.assign(existing,item);else add(item);
    }
  }
  return tasks.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
}
