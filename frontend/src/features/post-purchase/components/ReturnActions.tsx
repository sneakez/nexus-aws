import { HandoffException } from '@/features/orders/components/HandoffException';
import { useEffect, useState } from 'react';
import { omsStore as mockStore } from '@/stores/omsStore';
import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';

export function ReturnActions({ returnId }: { returnId: string }) {
  const { activeRole } = useAuth();
  const toast = useToast();
  const [, refresh] = useState(0);
  const [receive, setReceive] = useState<Record<string, string>>({});
  const [pass, setPass] = useState<Record<string, string>>({});
  const [fail, setFail] = useState<Record<string, string>>({});
  const [serials, setSerials] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [transaction, setTransaction] = useState('');
  useEffect(() => mockStore.subscribe(() => refresh(n => n + 1)), []);
  const ret = mockStore.getReturns().find(r => r.id === returnId);
  if (!ret) return null;
  const state = mockStore.getSnapshot();
  const lines = state.returnItems.filter(i => i.return_id === returnId);
  const warehouse = activeRole === 'warehouse' || activeRole === 'owner';
  const manage = hasPermission(activeRole, 'orders:manage');
  const finance = hasPermission(activeRole, 'finance:reconcile');
  const returnless = ret.is_refund_without_return || ret.rma_branch === 'returnless_refund';
  function run(fn: () => { success: boolean; error?: string }) {
    try { const result = fn(); toast(result.success ? 'Đã lưu kết quả.' : result.error || 'Không thể lưu', result.success ? 'success' : 'error'); if (result.success) { setReceive({}); setPass({}); setFail({}); setSerials({}); } }
    catch (e) { toast((e as Error).message, 'error'); }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-sm" data-testid="return-actions">
    <HandoffException orderId={ret.order_id}/><p className="text-xs text-slate-500">Tiền refund và hàng thực nhận/QC độc lập. Đổi hàng/bảo hành/chi tay Maker-Checker chưa hỗ trợ hoàn chỉnh.</p>
    <h3 className="font-semibold text-slate-900">Thực nhận, QC & bàn giao đối soát</h3>
    <p>Phần hàng: {returnless ? 'Không yêu cầu trả hàng' : ret.receiving_closed ? 'Đã chốt thực nhận' : 'Theo chứng từ từng đợt'} · Claim: {ret.claim_status || 'chưa mở'}</p>
    {lines.map(i => <div key={i.id} className="border-t pt-3 space-y-2"><p>{i.sku || i.product_id} · dự kiến {i.quantity} · nhận {i.received_qty || 0} · đạt {i.qc_pass_qty || 0} · lỗi {i.qc_fail_qty || 0}</p>
      {warehouse && !returnless && !ret.receiving_closed && <div className="grid grid-cols-2 gap-2">
        <label>Nhận đợt này<input aria-label={`Nhận ${i.id}`} type="number" min="0" className="input" value={receive[i.id!] || ''} onChange={e => setReceive({ ...receive, [i.id!]: e.target.value })}/></label>
        <label>Serial thực nhận<input aria-label={`Serial ${i.id}`} className="input" value={serials[i.id!] || ''} onChange={e => setSerials({ ...serials, [i.id!]: e.target.value })}/></label>
        <label>QC đạt<input aria-label={`Đạt ${i.id}`} type="number" min="0" className="input" value={pass[i.id!] || ''} onChange={e => setPass({ ...pass, [i.id!]: e.target.value })}/></label>
        <label>QC lỗi<input aria-label={`Lỗi ${i.id}`} type="number" min="0" className="input" value={fail[i.id!] || ''} onChange={e => setFail({ ...fail, [i.id!]: e.target.value })}/></label>
      </div>}
    </div>)}
    {warehouse && !returnless && !ret.receiving_closed && <div className="flex flex-wrap gap-2">
      <button className="btn-primary" onClick={() => run(() => mockStore.receiveReturnDock(ret.id, lines.map(i => ({ item_id: i.id, received_qty: Number(receive[i.id!] || 0), serials: serials[i.id!] ? serials[i.id!].split(',').map(s => s.trim()) : undefined })), undefined, undefined, { receiptId: crypto.randomUUID() }))}>Lưu thực nhận</button>
      <button className="btn-primary" onClick={() => run(() => mockStore.inspectReturnQC(ret.id, true, lines.map(i => ({ item_id: i.id, pass_qty: Number(pass[i.id!] || 0), fail_qty: Number(fail[i.id!] || 0) })), undefined, undefined, { inspectionId: crypto.randomUUID() }))}>Lưu kết quả QC</button>
    </div>}
    {(manage || finance) && <label className="block">Kết quả / bằng chứng<input aria-label="Kết quả khiếu nại" className="input mt-1" value={reason} onChange={e => setReason(e.target.value)}/></label>}
    {manage && !returnless && <div className="space-y-3"><div className="flex flex-wrap gap-2">
      <button className="btn-secondary" onClick={() => run(() => mockStore.resolveReturnReceiving(ret.id, true, reason))}>Chốt thực nhận · xác nhận phần thiếu</button>
      <button className="btn-secondary" onClick={() => run(() => mockStore.resolveReturnReceiving(ret.id, false, reason))}>Mở lại nhận hàng đến muộn</button>
    </div><label className="block">Phân công nhận hoàn<select aria-label="Phân công nhận hoàn" className="input mt-1" value={state.handoffAssignments?.[`return:${ret.id}`]?.assignee_id || ''} onChange={e => run(() => mockStore.assignHandoff(`return:${ret.id}`, ret.order_id, e.target.value || null))}><option value="">Nhóm kho nhận</option>{state.memberships.filter(m => m.role === 'warehouse' && m.status === 'active' && m.tenant_id === ret.tenant_id).map(m => <option key={m.id} value={m.user_id}>{m.user_id}</option>)}</select></label></div>}
    {finance && <div className="flex flex-wrap gap-2">
      <button className="btn-secondary" onClick={() => run(() => mockStore.resolveReturnClaim(ret.id, 'awaiting_compensation', reason))}>Theo dõi chờ bồi thường</button>
      <select aria-label="Giao dịch bồi thường" className="input" value={transaction} onChange={e => setTransaction(e.target.value)}><option value="">Giao dịch bồi thường đã ghi nhận</option>{state.orderFeeBreakdowns?.filter(f => f.order_id === ret.order_id).flatMap(f => f.adjustments || []).filter(a => a.kind === 'compensation').map(a => <option key={a.id} value={a.id}>{a.id} · {a.amount}</option>)}</select>
      <button className="btn-secondary" onClick={() => run(() => mockStore.resolveReturnClaim(ret.id, 'paid', reason, transaction))}>Xác nhận đã nhận bồi thường</button>
      <button className="btn-secondary" onClick={() => run(() => mockStore.resolveReturnClaim(ret.id, 'rejected', reason))}>Đóng yêu cầu · không được bồi thường</button>
    </div>}
    {(manage || finance) && <a className="block text-blue-700 underline" href={`/app?page=orders&order=${ret.order_id}`}>Mở đơn gốc để ghi nhận refund / phí từ nguồn</a>}
  </section>;
}
