import { HandoffException } from './HandoffException';
import { useEffect, useState } from 'react';
import { omsStore as mockStore } from '@/stores/omsStore';
import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';

export function OrderActions({ orderId, onUpdated }: { orderId: string; onUpdated?: () => void }) {
  const { activeRole } = useAuth();
  const toast = useToast();
  const [, refresh] = useState(0);
  const [scan, setScan] = useState('');
  const [tracking, setTracking] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [eventVersion, setEventVersion] = useState(() => Date.now());
  const [eventId, setEventId] = useState<string>(() => crypto.randomUUID());
  useEffect(() => mockStore.subscribe(() => refresh(n => n + 1)), []);
  const order = mockStore.getOrders().find(o => o.id === orderId);
  if (!order) return null;
  const state = mockStore.getSnapshot();
  const manage = hasPermission(activeRole, 'orders:manage');
  const warehouse = activeRole === 'warehouse' || activeRole === 'owner';
  const financial = hasPermission(activeRole, 'finance:reconcile');
  const preparing = ['pending', 'processing'].includes(order.status);
  const run = (action: () => { success: boolean; error?: string }) => {
    try { const r = action(); toast(r.success ? 'Đã lưu kết quả và bàn giao.' : r.error || 'Thao tác thất bại', r.success ? 'success' : 'error'); if (r.success) onUpdated?.(); }
    catch (e) { toast((e as Error).message, 'error'); }
  };
  const source = (type: 'carrier_accepted' | 'delivered' | 'failed' | 'refund' | 'ads_credit') => run(() => mockStore.recordSourceEvent(order.id, { id: eventId, version: eventVersion, type, amount: Number(amount) }));
  return <div className="space-y-3 text-sm" data-testid="order-actions">
    <HandoffException orderId={order.id}/>
    <p className="text-slate-600">Bước kho: {order.fulfillment_status || 'chưa giao kho'} · Nhóm nhận tiếp: {preparing ? order.fulfillment_status ? 'Kho' : 'Vận hành' : 'Vận hành / Đối soát'}</p>
    {order.hold_reason && <p role="status" className="text-rose-700">{order.hold_reason}</p>}
    {manage && preparing && <div className="space-y-3">
      {!order.fulfillment_status && <button className="btn-primary" data-action="release" onClick={() => run(() => mockStore.releaseToWarehouse(order.id))}>Giữ tồn & giao kho</button>}
      {order.fulfillment_status && <label className="block">Phân công kho<select aria-label="Phân công kho" className="input mt-1" value={state.handoffAssignments?.[`warehouse:${order.id}`]?.assignee_id || ''} onChange={e => run(() => mockStore.assignHandoff(`warehouse:${order.id}`, order.id, e.target.value || null))}>
        <option value="">Nhóm kho · chưa phân công</option>{state.memberships.filter(m => m.tenant_id === order.tenant_id && m.role === 'warehouse' && m.status === 'active' && (!m.shop_ids || m.shop_ids.includes(order.shop_id!)) && (!m.warehouse_ids || m.warehouse_ids.includes(order.assigned_warehouse_id!))).map(m => <option key={m.id} value={m.user_id}>{m.user_id}</option>)}
      </select></label>}
      <label className="block">Lý do / bằng chứng<input aria-label="Lý do vận hành" className="input mt-1" value={reason} onChange={e => setReason(e.target.value)}/></label>
      {order.hold_reason && <button className="btn-secondary" onClick={() => { if (!reason.trim()) return toast('Cần bằng chứng xử lý', 'error'); run(() => mockStore.updateOrder(order.id, { hold_reason: null, notes: reason })); }}>Đã xử lý ngoại lệ · cho kho làm tiếp</button>}
      <div className="flex flex-wrap gap-2">
        {!order.cancellation_requested ? <button className="btn-secondary" onClick={() => run(() => mockStore.requestCancellation(order.id))}>Ghi nhận yêu cầu hủy</button> : <>
          <button className="btn-secondary" onClick={() => run(() => mockStore.resolveCancellation(order.id, 'rejected', reason))}>Sàn từ chối hủy</button>
          <button className="btn-secondary" onClick={() => run(() => mockStore.resolveCancellation(order.id, 'withdrawn', reason))}>Khách rút yêu cầu hủy</button>
        </>}
        <button className="btn-secondary text-rose-700" onClick={() => run(() => reason.trim() ? mockStore.cancelOrderAtomic(order.id, reason) : { success: false, error: 'Cần lý do/kết quả hủy từ nguồn' })}>Sàn demo xác nhận hủy</button>
      </div>
    </div>}
    {warehouse && order.status === 'processing' && <div className="space-y-3">
      {order.cancellation_requested && <p role="status" className="text-rose-700">Đang chờ kết quả hủy · dừng xử lý kho.</p>}
      <label className="block">SKU / serial, cách nhau bằng dấu phẩy<input aria-label="SKU hoặc serial" className="input mt-1" value={scan} onChange={e => setScan(e.target.value)}/></label>
      <div className="flex flex-wrap gap-2">
        {order.fulfillment_status === 'allocated' && <button className="btn-primary" onClick={() => run(() => mockStore.prepareOrder(order.id, 'pick', scan.split(',').map(s => s.trim())))}>Kiểm SKU & nhặt hàng</button>}
        {order.fulfillment_status === 'picking' && <button className="btn-primary" onClick={() => run(() => mockStore.prepareOrder(order.id, 'pack'))}>Đóng gói · chi phí demo 20.000 ₫</button>}
      </div>
      {order.fulfillment_status === 'packed' && <><label className="block">Mã vận đơn<input aria-label="Mã vận đơn" className="input mt-1" value={tracking} onChange={e => setTracking(e.target.value)}/></label><button className="btn-primary" onClick={() => run(() => mockStore.dispatchOrder(order.id, tracking))}>Xác nhận kho bàn giao</button></>}
      <label className="block">Bằng chứng thiếu / sai / hỏng<input aria-label="Ngoại lệ kho" className="input mt-1" value={reason} onChange={e => setReason(e.target.value)}/></label>
      <button className="btn-secondary" onClick={() => run(() => mockStore.reportWarehouseException(order.id, reason))}>Báo chặn cho Vận hành</button>
    </div>}
    {financial && <details className="border-t pt-3"><summary className="cursor-pointer font-semibold">Kết quả sàn mô phỏng & giao dịch tiền</summary><div className="space-y-3 pt-3">
      <p className="text-xs text-slate-500">Sự kiện demo; sàn/carrier xác nhận giao, Kho chỉ ghi nhận bàn giao.</p>
      <label className="block">Mã sự kiện / giao dịch<input aria-label="Mã sự kiện nguồn" className="input mt-1" value={eventId} onChange={e => { setEventId(e.target.value); setEventVersion(Date.now()); }}/></label>
      <button className="btn-secondary" onClick={() => { setEventId(crypto.randomUUID()); setEventVersion(Date.now()); }}>Tạo mã sự kiện mới</button>
      <label className="block">Số tiền (VND)<input aria-label="Số tiền nguồn" type="number" className="input mt-1" value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <div className="flex flex-wrap gap-2">{order.status === 'shipped' && <>
        <button className="btn-secondary" onClick={() => source('carrier_accepted')}>Sàn xác nhận tiếp nhận</button><button className="btn-secondary" onClick={() => source('delivered')}>Sàn báo giao thành công</button><button className="btn-secondary" onClick={() => source('failed')}>Sàn báo giao thất bại</button></>}
        <button className="btn-secondary" onClick={() => source('refund')}>Nhận sự kiện refund</button><button className="btn-secondary" onClick={() => source('ads_credit')}>Nhận credit Ads</button>
        <button className="btn-secondary" onClick={() => run(() => mockStore.recordSourceFees(order.id, Number(amount), eventId))}>Nhận phí nguồn</button>
      </div><a className="text-blue-700 underline" href={`/app?page=orderEconomics&order=${order.id}`}>Mở lợi nhuận và phí của đơn</a>
    </div></details>}
    <div className="flex flex-wrap gap-3 text-xs"><a className="text-blue-700 underline" href={`/app?page=fulfillment&order=${order.id}`}>Mở xử lý kho</a>{manage && <a className="text-blue-700 underline" href={`/app?page=returns&order=${order.id}`}>Mở đổi trả của đơn</a>}</div>
    <details className="text-xs"><summary>Lịch sử bàn giao</summary>{state.handoffAssignments?.[`warehouse:${order.id}`]?.history.map((h, i) => <p key={i}>{h.at} · {h.actor_id} → {h.assignee_id || 'nhóm kho'}</p>)}</details>
  </div>;
}
