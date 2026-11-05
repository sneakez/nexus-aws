import { useOrderDialogFocus } from './useOrderDialogFocus';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/providers/AuthProvider';
import { createBackendOrder, getOrderCatalog, OrderApiError,
  type BackendCreateOrder, type BackendOrderDetail, type OrderCatalogOption } from '@/lib/backendOrders';

type DraftLine = { rowId: string; productId: string; quantity: string; unitPrice: string };
const inputClass = 'mt-1 w-full rounded-lg border border-ink-300 bg-white p-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:bg-ink-50';
const newLine = (): DraftLine => ({ rowId: crypto.randomUUID(), productId: '', quantity: '1', unitPrice: '' });
function restore(key: string): BackendCreateOrder | null {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as BackendCreateOrder;
    if (typeof value.idempotencyKey !== 'string' || typeof value.orderNumber !== 'string'
      || typeof value.warehouseId !== 'string' || (value.customerId != null && typeof value.customerId !== 'string') || !Number.isFinite(value.tax) || !Number.isFinite(value.shippingFee)
      || !Array.isArray(value.items) || value.items.length === 0
      || !value.items.every(item => item && typeof item.productId === 'string'
        && Number.isFinite(item.quantity) && Number.isFinite(item.unitPrice))) return null;
    return value;
  } catch { return null; }
}

export function BackendOrderCreateModal({ onClose, onCreated }: {
  onClose: () => void; onCreated: (order: BackendOrderDetail) => void;
}) {
  const { session } = useAuth();
  const token = session?.access_token;
  const storageKey = 'nexus-pending-create-order:' + session?.user.id;
  const [restored] = useState(() => restore(storageKey));
  const [pending, setPending] = useState<BackendCreateOrder | null>(restored);
  const [orderNumber, setOrderNumber] = useState(restored?.orderNumber ?? 'WEB-' + crypto.randomUUID().slice(0, 8).toUpperCase());
  const [warehouseId, setWarehouseId] = useState(restored?.warehouseId ?? '');
  const [customerId, setCustomerId] = useState(restored?.customerId ?? '');
  const [customers, setCustomers] = useState<OrderCatalogOption[]>([]);
  const [tax, setTax] = useState(String(restored?.tax ?? 0));
  const [shippingFee, setShippingFee] = useState(String(restored?.shippingFee ?? 0));
  const [lines, setLines] = useState<DraftLine[]>(() => restored
    ? restored.items.map(item => ({ rowId: crypto.randomUUID(), productId: item.productId,
      quantity: String(item.quantity), unitPrice: String(item.unitPrice) })) : [newLine()]);
  const [products, setProducts] = useState<OrderCatalogOption[]>([]);
  const [warehouses, setWarehouses] = useState<OrderCatalogOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoading(true);
    setCatalogError(null);
    if (!token) { setCatalogLoading(false); setCatalogError('Vui lòng đăng nhập lại.'); return () => controller.abort(); }
    void getOrderCatalog(token, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setProducts(data.products); setWarehouses(data.warehouses); setCustomers(data.customers); } })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setCatalogError(cause instanceof Error ? cause.message : 'Không tải được danh mục.');
      })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [token, revision]);
  useOrderDialogFocus(formRef);

  function updateLine(rowId: string, field: 'productId' | 'quantity' | 'unitPrice', value: string) {
    setLines(current => current.map(line => line.rowId === rowId ? { ...line, [field]: value } : line));
  }
  function close() { if (!submitting.current) onClose(); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !token) return;
    setError(null);
    if (!pending && !orderNumber.trim()) { setError('Vui lòng nhập mã đơn.'); formRef.current?.querySelector<HTMLInputElement>('input')?.focus(); return; }
    if (!pending && new Set(lines.map(line => line.productId)).size !== lines.length) {
      setError('Mỗi sản phẩm chỉ được chọn một lần. Hãy gộp số lượng vào một dòng.');
      formRef.current?.querySelector('select')?.focus();
      return;
    }
    const payload: BackendCreateOrder = pending ?? {
      idempotencyKey: 'web-order:' + crypto.randomUUID(), orderNumber: orderNumber.trim(),
      customerId: customerId || null, warehouseId, tax: Number(tax), shippingFee: Number(shippingFee),
      items: lines.map(line => ({ productId: line.productId, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) })),
    };
    submitting.current = true;
    setBusy(true);
    let requestStarted = false;
    try {
      // Save before sending so reload/retry can replay the exact same request.
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      setPending(payload);
      requestStarted = true;
      const created = await createBackendOrder(payload, token);
      sessionStorage.removeItem(storageKey);
      setPending(null);
      onCreated(created);
    } catch (cause: unknown) {
      if (!requestStarted) { setError('Không lưu được yêu cầu trên trình duyệt. Chưa gửi tạo đơn; hãy kiểm tra quyền lưu trữ rồi thử lại.'); return; }
      const rejected = cause instanceof OrderApiError && [400, 404, 409, 422].includes(cause.status);
      if (rejected) {
        sessionStorage.removeItem(storageKey);
        setPending(null);
      }
      setError(rejected && cause instanceof Error ? cause.message
        : 'Chưa xác nhận được kết quả tạo đơn. Bấm “Kiểm tra lại yêu cầu” để gửi lại an toàn; không tạo đơn khác.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const disabled = busy || pending !== null;
  const missingCatalog = !products.length || !warehouses.length;

  return <Modal open onClose={close} title="Tạo đơn hàng" subtitle="Đơn được tạo ở trạng thái chờ xác nhận và giữ hàng tại kho đã chọn." size="lg"
    footer={<>
      <button type="button" disabled={busy} onClick={close} className="btn-secondary">{pending ? 'Đóng, giữ yêu cầu để kiểm tra sau' : 'Hủy'}</button>
      <button type="submit" form="backend-create-order" disabled={busy || !token || (!pending && (catalogLoading || !!catalogError || missingCatalog))}
        className="btn-primary disabled:opacity-50">{busy ? 'Đang gửi…' : pending ? 'Kiểm tra lại yêu cầu' : 'Tạo đơn và giữ hàng'}</button>
    </>}>
    <form id="backend-create-order" ref={formRef} onSubmit={event => { void submit(event); }} className="space-y-5">
      {pending && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Có yêu cầu đang chờ xác nhận kết quả. Thông tin được giữ nguyên để tránh tạo trùng đơn.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {catalogLoading ? <p role="status">Đang tải kho và sản phẩm…</p> : catalogError
        ? <div role="alert" className="text-sm text-red-700">{catalogError} <button type="button" className="underline" onClick={() => setRevision(n => n + 1)}>Tải lại danh mục</button></div>
        : missingCatalog && <p className="text-sm text-amber-900">Cần có ít nhất một kho và một sản phẩm đang hoạt động trước khi tạo đơn.</p>}
      <fieldset disabled={disabled || catalogLoading || !!catalogError} className="space-y-5 disabled:opacity-70">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Mã đơn
            <input name="orderNumber" required maxLength={120} value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm font-medium">Kho giữ hàng
            <select name="warehouseId" required value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className={inputClass}>
              <option value="">Chọn kho</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">Khách hàng
          <select name="customerId" value={customerId} onChange={event => setCustomerId(event.target.value)} className={inputClass}>
            <option value="">Khách vãng lai</option>
            {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </select>
        </label>
        <div className="space-y-4">
          {lines.map((line, index) => <fieldset key={line.rowId} className="rounded-lg border border-ink-200 p-3">
            <legend className="px-1 text-sm font-semibold">Sản phẩm {index + 1}</legend>
            <label className="block text-sm">Sản phẩm
              <select required aria-label={'Sản phẩm ' + (index + 1)} value={line.productId} onChange={e => updateLine(line.rowId, 'productId', e.target.value)} className={inputClass}>
                <option value="">Chọn sản phẩm</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">Số lượng<input required type="number" min="0.001" max="99999999999.999" step="0.001"
                aria-label={'Số lượng ' + (index + 1)} value={line.quantity} onChange={e => updateLine(line.rowId, 'quantity', e.target.value)} className={inputClass} /></label>
              <label className="text-sm">Đơn giá<input required type="number" min="0" max="999999999999.99" step="0.01"
                aria-label={'Đơn giá ' + (index + 1)} value={line.unitPrice} onChange={e => updateLine(line.rowId, 'unitPrice', e.target.value)} className={inputClass} /></label>
            </div>
            {lines.length > 1 && <button type="button" onClick={() => setLines(current => current.filter(item => item.rowId !== line.rowId))}
              className="mt-3 inline-flex items-center gap-1 text-sm text-red-700"><Trash2 size={14} aria-hidden="true" /> Xóa dòng {index + 1}</button>}
          </fieldset>)}
          <button type="button" disabled={lines.length >= 100} onClick={() => setLines(current => [...current, newLine()])}
            className="btn-secondary inline-flex items-center gap-1"><Plus size={14} aria-hidden="true" />Thêm sản phẩm</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">Thuế<input name="tax" required type="number" min="0" max="999999999999.99" step="0.01" value={tax} onChange={e => setTax(e.target.value)} className={inputClass} /></label>
          <label className="text-sm">Phí giao hàng<input name="shippingFee" required type="number" min="0" max="999999999999.99" step="0.01" value={shippingFee} onChange={e => setShippingFee(e.target.value)} className={inputClass} /></label>
        </div>
      </fieldset>
      <p className="text-xs text-ink-600">Tổng tiền và khả năng giữ hàng được kiểm tra khi tạo đơn. Nếu không đủ tồn, đơn sẽ không được tạo.</p>
    </form>
  </Modal>;
}
