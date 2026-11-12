import { useOrderDialogFocus } from './useOrderDialogFocus';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/services/apiClient';
import { ordersService,
  type BackendCreateOrder, type BackendOrderDetail, type OrderCatalogOption, type OrderInventoryOption } from '@/services/orders.service';

type DraftLine = { rowId: string; productId: string; quantity: string; unitPrice: string };
type CustomerMode = 'guest' | 'existing' | 'new';
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
      || (value.newCustomer != null && (typeof value.newCustomer !== 'object' || typeof value.newCustomer.name !== 'string'))
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
  const [customerMode, setCustomerMode] = useState<CustomerMode>(() => restored?.newCustomer ? 'new' : restored?.customerId ? 'existing' : 'guest');
  const [newCustomerName, setNewCustomerName] = useState(restored?.newCustomer?.name ?? '');
  const [newCustomerPhone, setNewCustomerPhone] = useState(restored?.newCustomer?.phone ?? '');
  const [newCustomerEmail, setNewCustomerEmail] = useState(restored?.newCustomer?.email ?? '');
  const [customers, setCustomers] = useState<OrderCatalogOption[]>([]);
  const [tax, setTax] = useState(String(restored?.tax ?? 0));
  const [shippingFee, setShippingFee] = useState(String(restored?.shippingFee ?? 0));
  const [lines, setLines] = useState<DraftLine[]>(() => restored
    ? restored.items.map(item => ({ rowId: crypto.randomUUID(), productId: item.productId,
      quantity: String(item.quantity), unitPrice: String(item.unitPrice) })) : [newLine()]);
  const [products, setProducts] = useState<OrderInventoryOption[]>([]);
  const [warehouses, setWarehouses] = useState<OrderCatalogOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
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
    void ordersService.catalog(token, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setWarehouses(data.warehouses); setCustomers(data.customers); } })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setCatalogError(cause instanceof Error ? cause.message : 'Không tải được danh mục.');
      })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [token, revision]);
  useEffect(() => {
    const controller = new AbortController();
    setProducts([]);
    setInventoryError(null);
    if (!token || !warehouseId) { setInventoryLoading(false); return () => controller.abort(); }
    setInventoryLoading(true);
    void ordersService.inventory(warehouseId, token, controller.signal)
      .then(data => { if (!controller.signal.aborted) setProducts(data); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setInventoryError(cause instanceof Error ? cause.message : 'Không tải được tồn kho.');
      })
      .finally(() => { if (!controller.signal.aborted) setInventoryLoading(false); });
    return () => controller.abort();
  }, [token, warehouseId, revision]);
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
    if (!pending && !warehouseId) { setError('Vui lòng chọn kho giữ hàng.'); return; }
    if (!pending && customerMode === 'existing' && !customerId) { setError('Vui lòng chọn khách hàng.'); return; }
    if (!pending && customerMode === 'new' && !newCustomerName.trim()) { setError('Vui lòng nhập tên khách hàng.'); return; }
    if (!pending && lines.some(line => !line.productId)) { setError('Vui lòng chọn sản phẩm cho mỗi dòng.'); return; }
    if (!pending && new Set(lines.map(line => line.productId)).size !== lines.length) {
      setError('Mỗi sản phẩm chỉ được chọn một lần. Hãy gộp số lượng vào một dòng.');
      return;
    }
    if (!pending) {
      for (const line of lines) {
        const product = products.find(item => item.id === line.productId);
        const quantity = Number(line.quantity);
        if (!product) { setError('Sản phẩm đã chọn không có tồn tại kho này. Vui lòng chọn lại.'); return; }
        if (!Number.isFinite(quantity) || quantity <= 0) { setError(`Số lượng của ${product.name} phải lớn hơn 0.`); return; }
        if (quantity > product.available) {
          setError(`${product.code} · ${product.name} chỉ còn ${product.available.toLocaleString('vi-VN')} sản phẩm khả dụng tại kho đã chọn.`);
          return;
        }
      }
    }
    const payload: BackendCreateOrder = pending ?? {
      idempotencyKey: 'web-order:' + crypto.randomUUID(), orderNumber: orderNumber.trim(),
      customerId: customerMode === 'existing' ? customerId || null : null,
      newCustomer: customerMode === 'new' ? { name: newCustomerName.trim(), phone: newCustomerPhone.trim() || null, email: newCustomerEmail.trim() || null } : null,
      warehouseId, tax: Number(tax), shippingFee: Number(shippingFee),
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
      const created = await ordersService.create(payload, token);
      sessionStorage.removeItem(storageKey);
      setPending(null);
      onCreated(created);
    } catch (cause: unknown) {
      if (!requestStarted) { setError('Không lưu được yêu cầu trên trình duyệt. Chưa gửi tạo đơn; hãy kiểm tra quyền lưu trữ rồi thử lại.'); return; }
      const rejected = cause instanceof ApiError && [400, 404, 409, 422].includes(cause.status);
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
  const missingCatalog = !warehouses.length;

  return <Modal open onClose={close} title="Tạo đơn hàng" subtitle="Đơn được tạo ở trạng thái chờ xác nhận và giữ hàng tại kho đã chọn." size="lg"
    footer={<>
      <button type="button" disabled={busy} onClick={close} className="btn-secondary">{pending ? 'Đóng, giữ yêu cầu để kiểm tra sau' : 'Hủy'}</button>
      <button type="submit" form="backend-create-order" disabled={busy || !token || (!pending && (catalogLoading || inventoryLoading || !!catalogError || !!inventoryError || missingCatalog))}
        className="btn-primary disabled:opacity-50">{busy ? 'Đang gửi…' : pending ? 'Kiểm tra lại yêu cầu' : 'Tạo đơn và giữ hàng'}</button>
    </>}>
    <form id="backend-create-order" ref={formRef} onSubmit={event => { void submit(event); }} className="space-y-5">
      {pending && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Có yêu cầu đang chờ xác nhận kết quả. Thông tin được giữ nguyên để tránh tạo trùng đơn.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {catalogLoading ? <p role="status">Đang tải kho và khách hàng…</p> : catalogError
        ? <div role="alert" className="text-sm text-red-700">{catalogError} <button type="button" className="underline" onClick={() => setRevision(n => n + 1)}>Tải lại danh mục</button></div>
        : missingCatalog && <p className="text-sm text-amber-900">Cần có ít nhất một kho đang hoạt động trước khi tạo đơn.</p>}
      <fieldset disabled={disabled || catalogLoading || !!catalogError} className="space-y-5 disabled:opacity-70">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Mã đơn
            <input name="orderNumber" required maxLength={120} value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm font-medium">Kho giữ hàng
            <SearchableSelect value={warehouseId} onChange={value => { setWarehouseId(value); setLines([newLine()]); setError(null); }} options={warehouses.map(warehouse => ({ value: warehouse.id, label: warehouse.code + ' · ' + warehouse.name }))} placeholder="Chọn kho" ariaLabel="Chọn kho giữ hàng" searchPlaceholder="Tìm mã hoặc tên kho..." />
          </label>
        </div>
        <fieldset className="rounded-lg border border-ink-200 p-3"><legend className="px-1 text-sm font-semibold">Khách hàng</legend>
          <div className="flex flex-wrap gap-3 text-sm"><label className="inline-flex items-center gap-2"><input type="radio" name="customerMode" value="guest" checked={customerMode === 'guest'} onChange={() => setCustomerMode('guest')} />Khách vãng lai</label><label className="inline-flex items-center gap-2"><input type="radio" name="customerMode" value="existing" checked={customerMode === 'existing'} onChange={() => setCustomerMode('existing')} />Chọn khách có sẵn</label><label className="inline-flex items-center gap-2"><input type="radio" name="customerMode" value="new" checked={customerMode === 'new'} onChange={() => setCustomerMode('new')} />Thêm khách mới</label></div>
          {customerMode === 'existing' && <label className="mt-3 block text-sm">Khách hàng<SearchableSelect value={customerId} onChange={setCustomerId} options={customers.map(customer => ({ value: customer.id, label: customer.name }))} placeholder="Chọn khách hàng" ariaLabel="Chọn khách hàng" searchPlaceholder="Tìm tên khách hàng..." /></label>}
          {customerMode === 'new' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm sm:col-span-2">Tên khách hàng<input required maxLength={120} value={newCustomerName} onChange={event => setNewCustomerName(event.target.value)} className={inputClass} /></label><label className="text-sm">Số điện thoại<input maxLength={30} value={newCustomerPhone} onChange={event => setNewCustomerPhone(event.target.value)} className={inputClass} /></label><label className="text-sm">Email<input type="email" maxLength={254} value={newCustomerEmail} onChange={event => setNewCustomerEmail(event.target.value)} className={inputClass} /></label></div>}
        </fieldset>
        <div className="space-y-4">
          {!warehouseId && <p className="rounded-lg bg-ink-50 p-3 text-sm text-ink-600">Chọn kho trước để xem các sản phẩm có thể bán.</p>}
          {warehouseId && inventoryLoading && <p role="status" className="text-sm text-ink-600">Đang tải tồn kho…</p>}
          {warehouseId && inventoryError && <p role="alert" className="text-sm text-red-700">{inventoryError} <button type="button" className="underline" onClick={() => setRevision(n => n + 1)}>Tải lại tồn kho</button></p>}
          {warehouseId && !inventoryLoading && !inventoryError && !products.some(product => product.available > 0) && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Kho này chưa có sản phẩm khả dụng để tạo đơn.</p>}
          {lines.map((line, index) => <fieldset key={line.rowId} className="rounded-lg border border-ink-200 p-3">
            <legend className="px-1 text-sm font-semibold">Sản phẩm {index + 1}</legend>
            <label className="block text-sm">Sản phẩm
              <SearchableSelect value={line.productId} onChange={value => updateLine(line.rowId, 'productId', value)} disabled={!warehouseId || inventoryLoading || !!inventoryError} options={products.filter(product => product.available > 0).map(product => ({ value: product.id, label: product.code + ' · ' + product.name + ' · Khả dụng: ' + product.available.toLocaleString('vi-VN'), disabled: lines.some(other => other.rowId !== line.rowId && other.productId === product.id) }))} placeholder={warehouseId ? 'Chọn sản phẩm' : 'Chọn kho trước'} ariaLabel={'Chọn sản phẩm ' + (index + 1)} searchPlaceholder="Tìm SKU hoặc tên sản phẩm..." />
            </label>
            {line.productId && <p className="mt-2 text-xs text-ink-600">Khả dụng tại kho: <strong>{products.find(product => product.id === line.productId)?.available.toLocaleString('vi-VN') ?? '—'}</strong></p>}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">Số lượng<input required type="number" min="0.001" max={products.find(product => product.id === line.productId)?.available ?? 99999999999.999} step="0.001"
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
