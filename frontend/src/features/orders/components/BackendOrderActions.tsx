import { useRef, useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { advanceBackendOrder, OrderApiError, type BackendOrderDetail,
  type BackendOrderOperation, type BackendOrderOperationRequest } from '@/lib/backendOrders';

interface PendingOperation { operation: BackendOrderOperation; request: BackendOrderOperationRequest }
const labels: Record<BackendOrderOperation, string> = {
  confirm: 'Xác nhận đơn', process: 'Bắt đầu chuẩn bị', ship: 'Xuất kho', cancel: 'Hủy đơn',
};
const consequences: Record<BackendOrderOperation, string> = {
  confirm: 'Chuyển đơn sang đã xác nhận. Lượng hàng đang giữ không thay đổi.',
  process: 'Chuyển đơn sang đang chuẩn bị. Lượng hàng đang giữ không thay đổi.',
  ship: 'Xác nhận đã bàn giao hàng: giảm tồn thực tế và lượng hàng đang giữ của đơn. Không thể hủy đơn sau bước này.',
  cancel: 'Hủy đơn và giải phóng lượng hàng còn giữ cho đơn. Thao tác không nhập trả hàng đã xuất kho.',
};
function restore(key: string): PendingOperation | null {
  try {
    const data: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (!data || typeof data !== 'object') return null;
    const value = data as PendingOperation;
    if (!Object.prototype.hasOwnProperty.call(labels, value.operation) || typeof value.request?.idempotencyKey !== 'string'
      || (value.operation === 'cancel' && typeof value.request.reason !== 'string')) return null;
    return value;
  } catch { return null; }
}
export function BackendOrderActions({ order, onUpdated }: { order: BackendOrderDetail; onUpdated: (message: string) => void }) {
  const { session, activeRole } = useAuth();
  const key = 'nexus-pending-order-operation:' + session?.user.id + ':' + order.id;
  const [pending, setPending] = useState<PendingOperation | null>(() => restore(key));
  const [selected, setSelected] = useState<BackendOrderOperation | null>(pending?.operation ?? null);
  const [reason, setReason] = useState(pending?.request.reason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const panel = useRef<HTMLFormElement>(null);
  const manager = activeRole === 'admin' || activeRole === 'manager';
  const warehouse = manager || activeRole === 'warehouse';
  const allowed: BackendOrderOperation[] = [];
  if (manager && order.status === 'pending') allowed.push('confirm');
  if (warehouse && order.status === 'confirmed') allowed.push('process');
  if (warehouse && order.status === 'processing') allowed.push('ship');
  if (manager && ['pending', 'confirmed', 'processing'].includes(order.status)) allowed.push('cancel');
  const canRetry = pending && (manager || (warehouse && ['process', 'ship'].includes(pending.operation)));
  useEffect(() => { if (selected) panel.current?.querySelector<HTMLElement>('textarea, button[type="submit"]')?.focus(); }, [selected]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !session || !selected || (!pending && !allowed.includes(selected)) || (pending && !canRetry)) return;
    if (selected === 'cancel' && !reason.trim()) { setError('Vui lòng nhập lý do hủy đơn.'); panel.current?.querySelector('textarea')?.focus(); return; }
    const operation: PendingOperation = pending ?? { operation: selected,
      request: { idempotencyKey: 'web-' + selected + ':' + crypto.randomUUID(),
        ...(selected === 'cancel' ? { reason: reason.trim() } : {}) } };
    lock.current = true; setBusy(true); setError(null);
    let sent = false;
    try {
      sessionStorage.setItem(key, JSON.stringify(operation));
      setPending(operation);
      sent = true;
      const result = await advanceBackendOrder(order.id, operation.operation, operation.request, session.access_token);
      sessionStorage.removeItem(key); setPending(null); setSelected(null); setReason('');
      onUpdated(labels[operation.operation] + (result.replayed ? ': đã xác nhận kết quả yêu cầu trước.' : ' thành công.'));
    } catch (cause: unknown) {
      if (!sent) { setError('Không lưu được yêu cầu trên trình duyệt. Chưa gửi thao tác.'); return; }
      const rejected = cause instanceof OrderApiError && [400, 404, 409, 422].includes(cause.status);
      if (rejected) { sessionStorage.removeItem(key); setPending(null); }
      setError(rejected && cause instanceof Error ? cause.message
        : 'Chưa xác nhận được kết quả. Giữ nguyên yêu cầu và bấm kiểm tra lại để tránh thao tác hai lần.');
    } finally { lock.current = false; setBusy(false); }
  }
  if (!warehouse) return null;
  return <section className="space-y-3 border-t border-ink-200 pt-5" aria-label="Thao tác đơn hàng">
    <h3 className="font-semibold text-ink-900">Xử lý đơn</h3>
    {pending && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      Đang chờ xác nhận kết quả: {labels[pending.operation]}. Yêu cầu được giữ lại khi đóng hoặc tải lại trang.
    </p>}
    {!selected && <div className="flex flex-wrap gap-2">{allowed.map(operation =>
      <button key={operation} type="button" onClick={() => { setSelected(operation); setError(null); }}
        className={operation === 'cancel' ? 'btn-secondary text-red-700' : 'btn-primary'}>{labels[operation]}</button>)}
      {!allowed.length && <p className="text-sm text-ink-600">Không có thao tác chuyển trạng thái phù hợp với đơn và quyền hiện tại.</p>}
    </div>}
    {selected && <form ref={panel} onSubmit={event => { void submit(event); }} className="space-y-3 rounded-lg border border-ink-200 p-4">
      <p className="text-sm font-semibold">{labels[selected]}?</p>
      <p className="text-sm text-ink-700">{consequences[selected]}</p>
      {selected === 'cancel' && <label className="block text-sm font-medium">Lý do hủy đơn
        <textarea required maxLength={2000} rows={3} value={reason} disabled={busy || !!pending}
          onChange={event => setReason(event.target.value)}
          className="mt-1 w-full rounded-lg border border-ink-300 p-2 text-ink-900 focus:ring-2 focus:ring-teal-600" />
      </label>}
      {error && <div role="alert" className="text-sm text-red-700"><p>{error}</p>
        {!pending && <button type="button" onClick={() => onUpdated('Đã yêu cầu tải lại trạng thái đơn.')} className="mt-2 underline">Tải lại trạng thái</button>}
      </div>}
      {pending && !canRetry && <p role="alert" className="text-sm text-red-700">Quyền hiện tại không cho phép gửi lại thao tác này.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || (!!pending && !canRetry)}
          className={selected === 'cancel' ? 'rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50' : 'btn-primary disabled:opacity-50'}>
          {busy ? 'Đang xử lý…' : pending ? 'Kiểm tra lại thao tác' : 'Đồng ý ' + labels[selected].toLocaleLowerCase('vi')}
        </button>
        {!pending && <button type="button" disabled={busy} onClick={() => { setSelected(null); setError(null); }} className="btn-secondary">Quay lại</button>}
      </div>
    </form>}
  </section>;
}
