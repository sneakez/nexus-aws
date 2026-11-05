import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { OrderApiError } from '@/lib/backendOrders';
import { createBackendFee, getBackendFees, getBackendContribution, feeLabels,
  type BackendFeeRequest, type BackendFee, type BackendContribution } from '@/lib/backendOrderAfterSales';
import { formatOrderMoney } from '@/lib/orderFormatting';

function restore(key: string): BackendFeeRequest | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as BackendFeeRequest | null;
    return value && typeof value.id === 'string' && typeof value.feeType === 'string'
      && Object.prototype.hasOwnProperty.call(feeLabels, value.feeType) && Number.isFinite(value.amount) ? value : null;
  } catch { return null; }
}
export function BackendOrderFinance({ orderId }: { orderId: string }) {
  const { session, activeRole } = useAuth();
  const token = session?.access_token;
  const manager = activeRole === 'admin' || activeRole === 'manager';
  const storageKey = 'nexus-pending-fee:' + session?.user.id + ':' + orderId;
  const [pending, setPending] = useState<BackendFeeRequest | null>(() => restore(storageKey));
  const [feeType, setFeeType] = useState(pending?.feeType ?? 'commission');
  const [amount, setAmount] = useState(pending ? String(pending.amount) : '');
  const [formOpen, setFormOpen] = useState(!!pending);
  const [fees, setFees] = useState<BackendFee[] | null>(null);
  const [report, setReport] = useState<BackendContribution | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(null); setFees(null); setReport(null);
    if (!manager || !token) return () => controller.abort();
    void Promise.all([getBackendFees(orderId, token, controller.signal), getBackendContribution(orderId, token, controller.signal)])
      .then(([nextFees, nextReport]) => { if (!controller.signal.aborted) { setFees(nextFees); setReport(nextReport); } })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Không tải được phí và báo cáo.');
      });
    return () => controller.abort();
  }, [orderId, token, manager, revision]);
  if (!manager) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !token || !manager) return;
    const request = pending ?? { id: crypto.randomUUID(), feeType, amount: Number(amount) };
    lock.current = true; setBusy(true); setError(null); setNotice(null);
    let saved = false;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(request)); setPending(request); saved = true;
      // Fee POST conflicts on an existing ID. Resolve uncertain writes by reading first.
      const lookup = async () => (await getBackendFees(orderId, token)).find(fee => fee.id === request.id);
      const confirm = (existing: BackendFee) => {
        if (existing.feeType !== request.feeType || existing.amount !== request.amount)
          throw new OrderApiError('Mã phí đã tồn tại với nội dung khác. Kiểm tra lại khoản phí.', 409);
      };
      const existing = await lookup();
      if (existing) confirm(existing);
      else {
        try { await createBackendFee(orderId, request, token); }
        catch (cause: unknown) {
          if (!(cause instanceof OrderApiError) || cause.status !== 409) throw cause;
          const concurrent = await lookup();
          if (!concurrent) throw cause;
          confirm(concurrent);
        }
      }
      sessionStorage.removeItem(storageKey); setPending(null); setAmount(''); setFormOpen(false);
      setNotice('Đã xác nhận khoản phí được ghi nhận.'); setRevision(value => value + 1);
    } catch (cause: unknown) {
      if (!saved) { setError('Không lưu được yêu cầu trên trình duyệt. Chưa gửi khoản phí.'); return; }
      const rejected = cause instanceof OrderApiError && [400, 404, 409, 422].includes(cause.status);
      if (rejected) { sessionStorage.removeItem(storageKey); setPending(null); }
      setError(rejected && cause instanceof Error ? cause.message
        : 'Chưa rõ kết quả ghi phí. Kiểm tra lại khoản phí để tra cứu cùng mã, tránh ghi trùng.');
    } finally { lock.current = false; setBusy(false); }
  }
  const amountText = (value: string | null) => value === null ? 'Chưa đủ giá vốn' : formatOrderMoney(value);
  return <section className="space-y-4 border-t border-ink-200 pt-5" aria-label="Phí và lợi nhuận">
    <h3 className="font-semibold text-ink-900">Phí và lợi nhuận ước tính</h3>
    <p className="text-xs text-ink-600">Ước tính theo giá trị đơn, chưa điều chỉnh theo hủy đơn hoặc hoàn tiền.</p>
    {loadError ? <div role="alert" className="text-sm text-red-700">{loadError} <button type="button" className="underline" onClick={() => setRevision(n => n + 1)}>Tải lại tài chính</button></div>
      : !report || !fees ? <p role="status" className="text-sm text-ink-600">Đang tải phí và lợi nhuận…</p>
      : <>
        <dl className="space-y-3 text-sm">
          {([['Giá trị đơn (không gồm thuế)', report.revenue], ['Giá vốn', report.costOfGoods],
            ['Phí vận hành', report.operatingFees], ['Phí quảng cáo', report.advertisingFees],
            ['CM1 · sau giá vốn', report.cm1], ['CM2 · sau phí vận hành', report.cm2], ['CM3 · sau quảng cáo', report.cm3]] as [string, string | null][])
            .map(([label, value]) => <div key={label} className="flex justify-between gap-4">
              <dt className="text-ink-700">{label}</dt><dd className="text-right font-semibold tabular-nums">{amountText(value)}</dd>
            </div>)}
        </dl>
        {!report.hasCompleteCost && <p className="text-sm text-amber-900">Chưa có đủ giá vốn để tính CM1–CM3.</p>}
        <h4 className="pt-2 text-sm font-semibold">Chi tiết phí ({fees.length})</h4>
        {!fees.length ? <p className="text-sm text-ink-600">Chưa có khoản phí. Thêm khoản phí bên dưới để cập nhật CM2 và CM3.</p> : <ul className="divide-y divide-ink-100">
          {fees.map(fee => <li key={fee.id} className="flex justify-between gap-3 py-2 text-sm">
            <span>{feeLabels[fee.feeType] ?? fee.feeType}</span><span className="font-medium tabular-nums">{formatOrderMoney(fee.amount)}</span>
          </li>)}
        </ul>}
      </>}
    {notice && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
    {!formOpen && <button type="button" onClick={() => { setFormOpen(true); setError(null); }} className="btn-secondary">Thêm khoản phí</button>}
    {formOpen && <form onSubmit={event => { void submit(event); }} className="space-y-3 rounded-lg border border-ink-200 p-4">
      {pending && <p role="status" className="text-sm text-amber-900">Khoản phí đang chờ xác nhận. Thông tin được giữ nguyên để tra cứu trước khi gửi lại.</p>}
      <fieldset disabled={busy || !!pending} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Loại phí
          <select aria-label="Loại phí" value={feeType} onChange={e => setFeeType(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-300 bg-white p-2 text-ink-900">
            {Object.entries(feeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Số tiền phí
          <input aria-label="Số tiền phí" required type="number" min="0" max="999999999999.99" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-300 p-2 text-ink-900" />
        </label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Đang xử lý…' : pending ? 'Kiểm tra lại khoản phí' : 'Ghi nhận phí'}</button>
        <button type="button" disabled={busy} className="btn-secondary" onClick={() => setFormOpen(false)}>Đóng phí</button>
      </div>
    </form>}
  </section>;
}
