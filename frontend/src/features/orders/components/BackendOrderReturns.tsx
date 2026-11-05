import { useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { OrderApiError, type BackendOrderDetail } from '@/lib/backendOrders';
import { createBackendReturn, getBackendReturn, returnStatusLabels, type BackendReturnRequest, type BackendReturnCase } from '@/lib/backendOrderAfterSales';

function restore(key: string): BackendReturnRequest | null {
  try {
    const data = JSON.parse(sessionStorage.getItem(key) ?? 'null') as BackendReturnRequest | null;
    return data && typeof data.id === 'string' && typeof data.orderId === 'string' && typeof data.reason === 'string'
      && Array.isArray(data.items) && data.items.length > 0
      && data.items.every(line => line && typeof line.orderItemId === 'string' && Number.isFinite(line.quantity))
      ? data : null;
  } catch { return null; }
}
export function BackendOrderReturns({ order }: { order: BackendOrderDetail }) {
  const { session, activeRole } = useAuth();
  const storageKey = 'nexus-pending-return:' + session?.user.id + ':' + order.id;
  const [pending, setPending] = useState<BackendReturnRequest | null>(() => restore(storageKey));
  const [open, setOpen] = useState(!!pending);
  const [reason, setReason] = useState(pending?.reason ?? '');
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.items.map(item => [item.id, String(pending?.items.find(line => line.orderItemId === item.id)?.quantity ?? 0)])));
  const [lookup, setLookup] = useState('');
  const [result, setResult] = useState<BackendReturnCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const lock = useRef(false);
  const lookupLock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const manager = activeRole === 'admin' || activeRole === 'manager';
  const canCreate = manager && ['shipped', 'delivered', 'returned'].includes(order.status);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !session || (!pending && !canCreate) || !manager) return;
    setError(null);
    const items = order.items.filter(item => Number(quantities[item.id]) > 0)
      .map(item => ({ orderItemId: item.id, quantity: Number(quantities[item.id]) }));
    if (!pending && (!reason.trim() || !items.length)) {
      setError('Nhập lý do và số lượng trả lớn hơn 0 cho ít nhất một sản phẩm.');
      formRef.current?.querySelector('textarea')?.focus(); return;
    }
    const request = pending ?? { id: crypto.randomUUID(), orderId: order.id, reason: reason.trim(), items };
    let sent = false;
    lock.current = true; setBusy(true);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(request)); setPending(request);
      sent = true;
      const created = await createBackendReturn(request, session.access_token);
      sessionStorage.removeItem(storageKey); setPending(null); setResult(created); setLookup(created.id);
      setOpen(false); setReason(''); setQuantities(Object.fromEntries(order.items.map(item => [item.id, '0'])));
    } catch (cause: unknown) {
      if (!sent) { setError('Không lưu được yêu cầu. Chưa gửi trả hàng.'); return; }
      const rejected = cause instanceof OrderApiError && [400, 404, 409, 422].includes(cause.status);
      if (rejected) { sessionStorage.removeItem(storageKey); setPending(null); }
      setError(rejected && cause instanceof Error ? cause.message : 'Chưa xác nhận được kết quả trả hàng. Giữ nguyên yêu cầu và kiểm tra lại để tránh tạo trùng.');
    } finally { lock.current = false; setBusy(false); }
  }
  async function find(event: FormEvent) {
    event.preventDefault();
    if (!session || lookupLock.current) return;
    lookupLock.current = true; setLookingUp(true); setLookupError(null); setResult(null);
    try {
      const value = await getBackendReturn(lookup.trim(), session.access_token);
      if (value.orderId !== order.id) throw new Error('Yêu cầu trả hàng không thuộc đơn đang xem.');
      setResult(value);
    } catch (cause: unknown) { setLookupError(cause instanceof Error ? cause.message : 'Không tra được yêu cầu.'); }
    finally { lookupLock.current = false; setLookingUp(false); }
  }
  return <section className="space-y-3 border-t border-ink-200 pt-5" aria-label="Trả hàng">
    <h3 className="font-semibold text-ink-900">Trả hàng</h3>
    <p className="text-sm text-ink-600">Yêu cầu trả hàng chưa cộng lại tồn và chưa hoàn tiền. Số lượng còn được trả sẽ được kiểm tra khi gửi.</p>
    {(canCreate || (manager && pending)) && !open && <button type="button" className="btn-secondary" onClick={() => { setOpen(true); setError(null); }}>Tạo yêu cầu trả hàng</button>}
    {open && manager && (canCreate || pending) && <form ref={formRef} onSubmit={event => { void submit(event); }} className="space-y-3 rounded-lg border border-ink-200 p-4">
      {pending && <p role="status" className="text-sm text-amber-900">Có yêu cầu chưa rõ kết quả. Thông tin được giữ nguyên để gửi lại an toàn.</p>}
      <fieldset disabled={busy || !!pending} className="space-y-3">
        <label className="block text-sm font-medium">Lý do trả hàng
          <textarea aria-label="Lý do trả hàng" required rows={3} maxLength={2000} value={reason} onChange={e => { setReason(e.target.value); setError(null); }}
            className="mt-1 w-full rounded-lg border border-ink-300 p-2 text-ink-900" />
        </label>
        {order.items.map(item => <label key={item.id} className="block text-sm">
          {item.productName} · Đã đặt {item.quantity.toLocaleString('vi-VN')}
          <input aria-label={'Số lượng trả ' + item.productName} type="number" required min="0" max={item.quantity} step="0.001"
            value={quantities[item.id] ?? '0'} onChange={e => { setQuantities(current => ({ ...current, [item.id]: e.target.value })); setError(null); }}
            className="mt-1 w-full rounded-lg border border-ink-300 p-2 text-ink-900" />
        </label>)}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Đang gửi…' : pending ? 'Kiểm tra lại trả hàng' : 'Gửi yêu cầu trả hàng'}</button>
        <button type="button" disabled={busy} className="btn-secondary" onClick={() => setOpen(false)}>Đóng biểu mẫu</button>
      </div>
    </form>}
    {!canCreate && !pending && manager && <p className="text-sm text-ink-600">Chỉ tạo yêu cầu trả hàng cho đơn đã xuất kho, đã giao hoặc đã trả hàng.</p>}
    <form onSubmit={event => { void find(event); }} className="space-y-2">
      <label className="block text-sm font-medium">Mã yêu cầu trả hàng
        <input aria-label="Mã yêu cầu trả hàng" required value={lookup} onChange={e => setLookup(e.target.value)} maxLength={36}
          pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
          placeholder="Nhập mã UUID của yêu cầu" className="mt-1 w-full rounded-lg border border-ink-300 p-2 font-mono text-sm text-ink-900" />
      </label>
      <button type="submit" disabled={lookingUp} className="btn-secondary">{lookingUp ? 'Đang tra cứu…' : 'Tra cứu trả hàng'}</button>
    </form>
    {lookupError && <p role="alert" className="text-sm text-red-700">{lookupError}</p>}
    {result && <div className="space-y-2 rounded-lg bg-ink-50 p-3 text-sm" aria-label="Kết quả trả hàng">
      <p className="break-all font-mono">{result.id}</p>
      <p className="font-semibold">{returnStatusLabels[result.status] ?? result.status}</p>
      <p className="whitespace-pre-wrap break-words">{result.reason}</p>
      <ul>{result.items.map(item => <li key={item.orderItemId}>
        {order.items.find(line => line.id === item.orderItemId)?.productName ?? item.orderItemId}: {item.quantity.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
      </li>)}</ul>
    </div>}
  </section>;
}
