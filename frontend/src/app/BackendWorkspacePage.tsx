import { PageHeader } from '@/components/common/PageHeader';
import { HierarchicalDataGrid } from '@/components/common/HierarchicalDataGrid';
import { Modal } from '@/components/ui/Modal';
import { Pencil, Plus, RefreshCw, Store } from 'lucide-react';
import { BackendPricingCalculator } from './BackendPricingCalculator';
import { formatOrderMoney } from '@/lib/orderFormatting';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { PageId } from '@/app/types';
import { PAGE_META } from '@/app/navigation';
import { ApiError } from '@/services/apiClient';
import { channelsService } from '@/services/channels.service';
import { workspaceService, type ApiRow } from '@/services/workspace.service';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate } from '@/lib/utils';

type Row = ApiRow;
type Column = readonly [key: string, label: string];
type View = { load: (token: string, signal?: AbortSignal) => Promise<Row[]>; columns: readonly Column[] };
const views: Partial<Record<PageId, View>> = {
  skuEconomics: { load: workspaceService.listSkuEconomics, columns: [['label', 'SKU'], ['orderCount', 'Đơn'], ['quantity', 'Số lượng'], ['revenue', 'Tiền hàng'], ['costOfGoods', 'Giá vốn'], ['cm1', 'Sau giá vốn']] },
  channelEconomics: { load: workspaceService.listChannelEconomics, columns: [['label', 'Tài khoản kênh'], ['orderCount', 'Đơn'], ['revenue', 'Giá trị đơn'], ['costOfGoods', 'Giá vốn'], ['operatingFees', 'Phí vận hành'], ['advertisingFees', 'Quảng cáo'], ['cm1', 'CM1'], ['cm2', 'CM2'], ['cm3', 'CM3']] },
  customers: { load: workspaceService.listCustomers, columns: [['name', 'Tên'], ['phone', 'Điện thoại'], ['email', 'Email']] },
  inventory: { load: workspaceService.listInventory, columns: [['warehouseCode', 'Kho'], ['productSku', 'SKU'], ['productName', 'Sản phẩm'], ['stock', 'Tồn thực tế'], ['reserved', 'Đang giữ'], ['pendingQc', 'Chờ kiểm'], ['incoming', 'Sắp về'], ['available', 'Khả dụng']] },

};
const transactionColumns: Column[] = [['createdAt', 'Thời điểm'], ['type', 'Loại'], ['quantityDelta', 'Thay đổi'], ['referenceType', 'Nguồn'], ['referenceId', 'Mã tham chiếu']];
const mappingColumns: Column[] = [['channelSku', 'SKU trên kênh'], ['productSku', 'SKU nội bộ'], ['productName', 'Sản phẩm']];

const moneyKeys = new Set(['revenue', 'costOfGoods', 'operatingFees', 'advertisingFees', 'cm1', 'cm2', 'cm3', 'costPrice']);
function cell(value: unknown, key: string): string {
  if (moneyKeys.has(key)) return typeof value === 'string' || typeof value === 'number' ? formatOrderMoney(value) : 'Chưa đủ dữ liệu';
  if (typeof value === 'string') return key === 'createdAt' ? formatDate(value) : value;
  return typeof value === 'number' ? value.toLocaleString('vi-VN', { maximumFractionDigits: 5 }) : '—';
}

function RowsTable({ rows, columns }: { rows: Row[]; columns: readonly Column[] }) {
  if (!rows.length) return <p className="card p-8 text-center text-sm text-ink-600">Chưa có dữ liệu phù hợp.</p>;
  return <HierarchicalDataGrid<Row> data={rows} rowKey={row => row.id}
    searchPlaceholder="Tìm trong danh sách"
    searchFilter={(row, query) => columns.some(([key]) => cell(row[key], key).toLocaleLowerCase('vi').includes(query))}
    renderMobileCard={row => <dl className="grid grid-cols-2 gap-x-4 gap-y-3" aria-label="Thông tin bản ghi">
      {columns.map(([key, label]) => <div key={key} className="min-w-0">
        <dt className="text-xs text-ink-600">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold tabular-nums text-ink-900">{cell(row[key], key)}</dd>
      </div>)}
    </dl>}
    groups={[{ id: 'record_info', title: 'Thông tin', columns: columns.map(([key, label]) => ({
      id: key, header: label, accessor: row => cell(row[key], key),
      align: moneyKeys.has(key) ? 'right' : 'left',
    })) }]} />;
}

const channelNames: Record<string, string> = {
  shopee: 'Shopee', tiktok_shop: 'TikTok Shop', lazada: 'Lazada', website_d2c: 'Website',
};

const channelStatuses: Record<string, { label: string; color: string }> = {
  connected: { label: 'Đang kết nối', color: 'bg-emerald-100 text-emerald-800' },
  disconnected: { label: 'Đã ngắt kết nối', color: 'bg-ink-100 text-ink-700' },
  error: { label: 'Lỗi kết nối', color: 'bg-rose-100 text-rose-800' },
};

function ChannelCards({ rows, onEdit, onRemove }: {
  rows: Row[];
  onEdit: (row: Row) => void;
  onRemove: (row: Row) => void;
}) {
  if (!rows.length) return <div className="card p-8 text-center text-ink-600">Chưa có tài khoản kênh phù hợp.</div>;
  return <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {rows.map(row => {
      const type = cell(row.type, 'type');
      const status = channelStatuses[cell(row.status, 'status')];
      return <li key={row.id} className="card min-w-0 space-y-4 p-5">
        <div className="flex items-start gap-3">
          <Store size={22} aria-hidden="true" className="shrink-0 text-brand-600" />
          <div className="min-w-0">
            <h2 className="break-words font-semibold text-ink-900">{cell(row.accountName, 'accountName')}</h2>
            <p className="text-sm text-ink-600">{channelNames[type] ?? type}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3 text-sm">
          <span className="text-ink-600">Trạng thái</span>
          <span className={'badge ' + (status?.color ?? 'bg-ink-100 text-ink-700')}>{status?.label ?? 'Chưa xác định'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => onEdit(row)}>Sửa tài khoản</button>
          <button type="button" className="btn-secondary text-red-700" onClick={() => onRemove(row)}>Xóa tài khoản</button>
        </div>
      </li>;
    })}
  </ul>;
}

function useRows(load: ((token: string, signal?: AbortSignal) => Promise<Row[]>) | undefined, revision: number) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [state, setState] = useState<{ rows: Row[]; error?: string; loading: boolean }>({ rows: [], loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ rows: [], loading: !!load });
    if (!load || !token) return () => controller.abort();
    void load(token, controller.signal).then(rows => {
      if (!controller.signal.aborted) setState({ rows, loading: false });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ rows: [], error: error instanceof Error ? error.message : 'Không tải được dữ liệu.', loading: false });
    });
    return () => controller.abort();
  }, [load, token, revision]);
  return state;
}

function Result({ state, children }: { state: ReturnType<typeof useRows>; children: ReactNode }) {
  if (state.loading) return <p role="status">Đang tải…</p>;
  if (state.error) return <p role="alert" className="text-red-700">{state.error}</p>;
  return children;
}

function CustomerForm({ onCreated }: { onCreated: () => void }) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !session) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    if (!name) { setError('Nhập tên khách hàng.'); return; }
    const phone = String(data.get('phone') ?? '').trim() || null;
    const email = String(data.get('email') ?? '').trim() || null;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await workspaceService.createCustomer({ name, phone, email }, session.access_token);
      form.reset();
      onCreated();
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status < 500 ? cause.message : 'Chưa xác nhận được kết quả. Kiểm tra danh sách trước khi lưu lại để tránh tạo trùng.');
      onCreated();
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <details className="rounded-xl border border-ink-200 bg-white p-4">
    <summary className="cursor-pointer font-semibold">Thêm khách hàng</summary>
    <form onSubmit={event => { void submit(event); }} className="mt-4 space-y-3">
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3">
        <label>Tên<input name="name" required maxLength={120} className="mt-1 block w-full rounded border p-2" /></label>
        <label>Điện thoại<input name="phone" type="tel" className="mt-1 block w-full rounded border p-2" /></label>
        <label>Email<input name="email" type="email" className="mt-1 block w-full rounded border p-2" /></label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} type="submit" className="btn-primary">{busy ? 'Đang lưu…' : 'Lưu khách hàng'}</button>
    </form>
  </details>;
}

type InventoryAction = 'receipt' | 'increase' | 'decrease';

function InventoryAdjustmentModal({ item, onClose, onSaved }: { item: Row; onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth();
  const [action, setAction] = useState<InventoryAction | null>(null);
  const [quantity, setQuantity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey] = useState(() => 'inventory-ui:' + crypto.randomUUID());
  const stock = Number(item.stock ?? 0); const reserved = Number(item.reserved ?? 0); const amount = Number(quantity);
  const delta = action === 'decrease' ? -amount : amount;
  const nextStock = stock + (Number.isFinite(delta) ? delta : 0);
  const invalidDecrease = action === 'decrease' && Number.isFinite(amount) && amount > 0 && nextStock < reserved;
  const labels: Record<InventoryAction, { title: string; detail: string }> = {
    receipt: { title: 'Nhập hàng', detail: 'Ghi nhận hàng mới đã thực sự vào kho.' },
    increase: { title: 'Điều chỉnh tăng', detail: 'Dùng khi kiểm kê thấy thực tế nhiều hơn hệ thống.' },
    decrease: { title: 'Điều chỉnh giảm', detail: 'Dùng khi kiểm kê thiếu hàng, hỏng hoặc mất hàng.' },
  };
  async function save() {
    if (!session || !action || !Number.isFinite(amount) || amount <= 0 || invalidDecrease) return;
    setBusy(true); setError('');
    const payload = { warehouseId: String(item.warehouseId), productId: String(item.productId), quantity: delta, idempotencyKey };
    try {
      if (action === 'receipt') await workspaceService.receiveInventory({ ...payload, quantity: amount }, session.access_token);
      else await workspaceService.adjustInventory(payload, session.access_token);
      onSaved(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật tồn kho.'); }
    finally { setBusy(false); }
  }
  return <Modal open title={action ? labels[action].title : 'Điều chỉnh tồn kho'} onClose={() => { if (!busy) onClose(); }}>
    {!action ? <div className="space-y-3"><p className="text-sm text-ink-600">{cell(item.warehouseCode, 'warehouseCode')} · <strong>{cell(item.productSku, 'productSku')} — {cell(item.productName, 'productName')}</strong></p><div className="grid gap-2"><button className="rounded-xl border border-ink-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50" onClick={() => setAction('receipt')}><b>Nhập hàng</b><span className="mt-1 block text-xs text-ink-600">Hàng mới đã vào kho.</span></button><button className="rounded-xl border border-ink-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50" onClick={() => setAction('increase')}><b>Điều chỉnh tăng</b><span className="mt-1 block text-xs text-ink-600">Kiểm kê thực tế nhiều hơn hệ thống.</span></button><button className="rounded-xl border border-ink-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50" onClick={() => setAction('decrease')}><b>Điều chỉnh giảm</b><span className="mt-1 block text-xs text-ink-600">Thiếu, hỏng hoặc mất hàng sau kiểm kê.</span></button></div></div> : <div className="space-y-4"><div className="rounded-lg bg-ink-50 p-3 text-sm"><p className="font-semibold">{cell(item.productName, 'productName')}</p><p className="mt-1 text-ink-600">Kho: {cell(item.warehouseCode, 'warehouseCode')} · Đang giữ: {reserved.toLocaleString('vi-VN')}</p></div><label className="block font-medium">Số lượng<input autoFocus value={quantity} onChange={event => setQuantity(event.target.value)} type="number" min="0.001" step="0.001" className="input mt-1 w-full" placeholder="Nhập số lượng" /></label><div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm"><p>Tồn thực tế: <b>{stock.toLocaleString('vi-VN')}</b> → <b>{Number.isFinite(amount) && amount > 0 ? nextStock.toLocaleString('vi-VN') : '—'}</b></p><p className="mt-1">Khả dụng: <b>{(stock - reserved).toLocaleString('vi-VN')}</b> → <b>{Number.isFinite(amount) && amount > 0 ? (nextStock - reserved).toLocaleString('vi-VN') : '—'}</b></p></div>{invalidDecrease && <p role="alert" className="text-sm text-red-700">Không thể giảm dưới {reserved.toLocaleString('vi-VN')} sản phẩm đang giữ cho đơn.</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-between gap-2"><button type="button" className="btn-secondary" disabled={busy} onClick={() => { setAction(null); setQuantity(''); setError(''); }}>Quay lại</button><button type="button" className="btn-primary" disabled={busy || !Number.isFinite(amount) || amount <= 0 || invalidDecrease} onClick={() => { void save(); }}>{busy ? 'Đang lưu…' : 'Xác nhận thay đổi'}</button></div></div>}
  </Modal>;
}

function InventoryTable({ rows, onAdjust }: { rows: Row[]; onAdjust: (item: Row) => void }) {
  const columns: Column[] = [['warehouseCode', 'Kho'], ['productSku', 'SKU'], ['productName', 'Sản phẩm'], ['stock', 'Tồn thực tế'], ['reserved', 'Đang giữ'], ['pendingQc', 'Chờ kiểm'], ['incoming', 'Sắp về'], ['available', 'Khả dụng']];
  return <HierarchicalDataGrid<Row> data={rows} rowKey={row => row.id} searchPlaceholder="Tìm trong danh sách" searchFilter={(row, query) => columns.some(([key]) => cell(row[key], key).toLocaleLowerCase('vi').includes(query))} groups={[{ id: 'inventory', title: 'Tồn kho', columns: [...columns.map(([key, header]) => ({ id: key, header, accessor: (row: Row) => cell(row[key], key), align: ['stock', 'reserved', 'pendingQc', 'incoming', 'available'].includes(key) ? 'right' : 'left' })), { id: 'action', header: 'Thao tác', accessor: (row: Row) => <button type="button" className="btn-secondary p-2" onClick={() => onAdjust(row)} aria-label={'Điều chỉnh tồn ' + cell(row.productName, 'productName')} title="Điều chỉnh tồn"><Pencil size={16} /></button> }] }]} />;
}

function ProductForm({ initial, onSaved, onClose }: { initial?: Row; onSaved: () => void; onClose: () => void }) {
  const { session } = useAuth();
  const brands = useRows(workspaceService.listBrands, 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const data = new FormData(event.currentTarget);
    const body = {
      brandId: String(data.get('brandId') ?? '') || null,
      sku: String(data.get('sku') ?? '').trim(),
      name: String(data.get('name') ?? '').trim(),
      costPrice: Number(data.get('costPrice')),
      ...(initial ? { isActive: true } : {}),
    };
    setBusy(true); setError('');
    try {
      await (initial ? workspaceService.updateProduct(initial.id, body, session.access_token) : workspaceService.createProduct(body, session.access_token));
      onSaved(); onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa lưu được sản phẩm.');
    } finally { setBusy(false); }
  }
  return <Modal open title={initial ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={() => { if (!busy) onClose(); }}>
    <form className="space-y-4" onSubmit={event => { void submit(event); }}>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <label>SKU nội bộ<input required name="sku" maxLength={100} defaultValue={initial ? cell(initial.sku, 'sku') : ''} className="block w-full rounded border p-2" /></label>
        <label>Tên sản phẩm<input required name="name" maxLength={200} defaultValue={initial ? cell(initial.name, 'name') : ''} className="block w-full rounded border p-2" /></label>
        <label>Brand<select name="brandId" defaultValue={initial?.brandId as string | undefined ?? ''} className="block w-full rounded border p-2"><option value="">Chưa gán brand</option>{brands.rows.map(row => <option key={row.id} value={row.id}>{cell(row.name, 'name')}</option>)}</select></label>
        <label>Giá vốn<input required name="costPrice" type="number" min="0" step="0.01" defaultValue={initial ? String(initial.costPrice ?? '') : ''} className="block w-full rounded border p-2" /></label>
      </fieldset>
      {(error || brands.error) && <p role="alert" className="text-red-700">{error || brands.error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>Hủy</button><button type="submit" className="btn-primary" disabled={busy || brands.loading}>{busy ? 'Đang lưu…' : 'Lưu sản phẩm'}</button></div>
    </form>
  </Modal>;
}

function ProductTable({ rows, canManage, onEdit, onDeactivate }: { rows: Row[]; canManage: boolean; onEdit: (product: Row) => void; onDeactivate: (product: Row) => void }) {
  if (!rows.length) return <p className="card p-8 text-center text-sm text-ink-600">Chưa có sản phẩm phù hợp.</p>;
  return <div className="card overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-ink-200 text-ink-600"><tr>{['SKU', 'Tên sản phẩm', 'Brand', 'Giá vốn', 'Tồn kho', 'Khả dụng'].map(header => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}{canManage && <th className="px-4 py-3 font-semibold">Thao tác</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b border-ink-100 last:border-0"><td className="px-4 py-3 font-mono">{cell(row.sku, 'sku')}</td><td className="px-4 py-3 font-medium">{cell(row.name, 'name')}</td><td className="px-4 py-3">{cell(row.brandName, 'brandName')}</td><td className="px-4 py-3 text-right tabular-nums">{cell(row.costPrice, 'costPrice')}</td><td className="px-4 py-3 text-right tabular-nums">{cell(row.stock, 'stock')}</td><td className="px-4 py-3 text-right tabular-nums">{cell(row.available, 'available')}</td>{canManage && <td className="px-4 py-3"><div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => onEdit(row)}>Sửa</button><button type="button" className="btn-secondary text-red-700" onClick={() => onDeactivate(row)}>Ngừng</button></div></td>}</tr>)}</tbody></table></div>;
}

function ChannelForm({ connection, initial, onSaved, onClose }: { connection?: string; initial?: Row; onSaved: () => void; onClose: () => void }) {
  const { session } = useAuth();
  const products = useRows(connection ? workspaceService.listProducts : undefined, 0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const title = connection ? 'Thêm ánh xạ SKU' : initial ? 'Sửa tài khoản kênh' : 'Thêm tài khoản kênh';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || inFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = connection
      ? { productId: data.get('productId'), channelSku: String(data.get('channelSku')).trim() }
      : { type: data.get('type'), accountName: String(data.get('accountName')).trim(), ...(initial ? { status: data.get('status') } : {}) };
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await (connection ? channelsService.createMapping(connection, body, session.access_token) : initial ? channelsService.update(initial.id, body, session.access_token) : channelsService.create(body, session.access_token));
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa xác nhận được kết quả.');
    } finally {
      inFlight.current = false;
      setBusy(false);
      onSaved();
    }
  }
  return <Modal open title={title} onClose={() => { if (!inFlight.current) onClose(); }}>
    <form className="space-y-4" onSubmit={event => { void submit(event); }}>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        {connection ? <>
          <label>Sản phẩm<select required name="productId" className="block w-full rounded border p-2">
            <option value="">Chọn sản phẩm</option>{products.rows.map(row => <option key={row.id} value={row.id}>{cell(row.sku, 'sku')} · {cell(row.name, 'name')}</option>)}
          </select></label>
          <label>SKU trên kênh<input required maxLength={100} name="channelSku" className="block w-full rounded border p-2" /></label>
        </> : <>
          <label>Kênh<select name="type" defaultValue={initial ? cell(initial.type, 'type') : 'shopee'} className="block w-full rounded border p-2">
            <option value="shopee">Shopee</option><option value="tiktok_shop">TikTok Shop</option>
            <option value="lazada">Lazada</option><option value="website_d2c">Website</option>
          </select></label>
          <label>Tên tài khoản<input required maxLength={120} name="accountName" defaultValue={initial ? cell(initial.accountName, 'accountName') : ''} className="block w-full rounded border p-2" /></label>
          {initial && <label>Trạng thái<select name="status" defaultValue={cell(initial.status, 'status')} className="block w-full rounded border p-2">
            <option value="connected">Đang kết nối</option><option value="disconnected">Đã ngắt kết nối</option><option value="error">Lỗi kết nối</option>
          </select></label>}
        </>}
      </fieldset>
      {(error || products.error) && <p role="alert" className="text-red-700">{error || products.error}</p>}
      {connection && products.loading && <p role="status">Đang tải sản phẩm…</p>}
      {connection && !products.loading && !products.error && !products.rows.length && <p>Chưa có sản phẩm đang hoạt động.</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button className="btn-secondary" type="button" disabled={busy} onClick={onClose}>Hủy</button>
        <button className="btn-primary" type="submit" disabled={busy || (!!connection && !products.rows.length)}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </form>
  </Modal>;
}

function RemoveChannelResource({ target, onClose, onRemoved }: {
  target: { label: string; remove: () => Promise<unknown> };
  onClose: () => void;
  onRemoved: () => void;
}) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function remove() {
    if (!session || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      try { await target.remove(); }
      catch (cause) { if (!(cause instanceof ApiError) || cause.status !== 404) throw cause; }
      onRemoved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa xác nhận được kết quả xóa. Tải lại danh sách để kiểm tra.');
    } finally { lock.current = false; setBusy(false); }
  }
  return <Modal open title="Xác nhận xóa" onClose={() => { if (!lock.current) onClose(); }}>
    <p className="break-words text-sm">Xóa {target.label}? Xóa tài khoản kênh sẽ xóa các ánh xạ SKU thuộc tài khoản đó.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" disabled={busy} className="btn-secondary" onClick={onClose}>Quay lại</button>
      <button type="button" disabled={busy} className="btn-primary" onClick={() => { void remove(); }}>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</button>
    </div>
  </Modal>;
}

const unavailable: Partial<Record<PageId, string>> = {
  simulator: 'Chạy kịch bản webhook trên môi trường lab để tránh phát sinh đơn thử trong dữ liệu vận hành.',
};

export function BackendWorkspacePage({ page, search }: { page: PageId; search: string }) {
  const { session, activeRole } = useAuth();
  const view = views[page];
  const isProducts = page === 'products';
  const canManageProducts = activeRole === 'admin' || activeRole === 'manager';
  const isConnections = page === 'channelConnections';
  const isMapping = page === 'channelMapping';
  const [channelFormOpen, setChannelFormOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Row | undefined>();
  const [editingProduct, setEditingProduct] = useState<Row | undefined>();
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productError, setProductError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<{ label: string; remove: () => Promise<unknown> } | null>(null);
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState('');
  const [transactions, setTransactions] = useState(false);
  const [adjustingInventory, setAdjustingInventory] = useState<Row | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const mappingLoader = useCallback((token: string, signal?: AbortSignal) => channelsService.listMappings(selection, token, signal), [selection]);
  const list = useRows(isProducts ? workspaceService.listProducts : isConnections || isMapping ? channelsService.list : view?.load, revision);
  const productInventory = useRows(isProducts ? workspaceService.listInventory : undefined, revision);
  const mapping = useRows(page === 'channelMapping' && selection ? mappingLoader : undefined, revision);
  const ledger = useRows(page === 'inventory' && transactions ? workspaceService.listInventoryTransactions : undefined, revision);
  const query = (localSearch || search).trim().toLocaleLowerCase('vi');
  const rows = list.rows.filter(row => !query || Object.values(row).some(value =>
    typeof value === 'string' && value.toLocaleLowerCase('vi').includes(query)));
  const productRows = rows.map(row => {
    const totals = productInventory.rows.filter(item => item.productId === row.id).reduce((sum, item) => ({ stock: sum.stock + Number(item.stock ?? 0), available: sum.available + Number(item.available ?? 0) }), { stock: 0, available: 0 });
    return { ...row, ...totals };
  });
  const productState = { rows: productRows, loading: list.loading || productInventory.loading, error: list.error ?? productInventory.error };
  async function deactivateProduct(product: Row) {
    if (!session || !window.confirm(`Ngừng hoạt động sản phẩm ${cell(product.name, 'name')}?`)) return;
    setProductError('');
    try {
      await workspaceService.deactivateProduct(product.id, session.access_token);
      setRevision(n => n + 1);
    } catch (cause) { setProductError(cause instanceof Error ? cause.message : 'Chưa cập nhật được trạng thái sản phẩm.'); }
  }
  return <section className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
    <PageHeader title={PAGE_META[page].title} subtitle={PAGE_META[page].subtitle} actions={<>
      {(view || isConnections || isMapping || isProducts) && <input aria-label={PAGE_META[page].searchPlaceholder} value={localSearch} onChange={event => setLocalSearch(event.target.value)} placeholder={PAGE_META[page].searchPlaceholder} className="input w-56 text-sm" />}
      {(view || isConnections || isMapping) && <button className="btn-secondary" type="button" onClick={() => setRevision(n => n + 1)}>
        <RefreshCw size={16} aria-hidden="true" /> Tải lại
      </button>}
      {(isConnections || isMapping) && <button className="btn-primary" type="button"
        disabled={isMapping && !selection} onClick={() => { setEditingChannel(undefined); setChannelFormOpen(true); }}>
        <Plus size={16} aria-hidden="true" /> {isMapping ? 'Thêm ánh xạ SKU' : 'Thêm tài khoản kênh'}
      </button>}
      {isProducts && canManageProducts && <button className="btn-primary" type="button" onClick={() => { setEditingProduct(undefined); setProductFormOpen(true); }}><Plus size={16} aria-hidden="true" /> Thêm sản phẩm</button>}
    </>} />
    {page === 'pricingCalculator' && <BackendPricingCalculator />}
    {page === 'skuEconomics' && <p className="text-sm text-ink-600">Tổng tiền hàng và giá vốn theo SKU của đơn chưa hủy. Phí cấp đơn không phân bổ xuống SKU.</p>}
    {page === 'channelEconomics' && <p className="text-sm text-ink-600">Tổng CM1–CM3 theo kênh của đơn chưa hủy. Kết quả có thể bao gồm đơn đang xử lý.</p>}
    {unavailable[page] && <p className="rounded-xl border border-ink-200 bg-white p-4 text-ink-700">{unavailable[page]}</p>}
    {page === 'customers' && <CustomerForm onCreated={() => setRevision(n => n + 1)} />}
    {isProducts && <Result state={productState}><ProductTable rows={productRows} canManage={canManageProducts} onEdit={product => { setEditingProduct(product); setProductFormOpen(true); }} onDeactivate={product => { void deactivateProduct(product); }} /></Result>}
    {productError && <p role="alert" className="text-red-700">{productError}</p>}
    {productFormOpen && <ProductForm initial={editingProduct} onClose={() => setProductFormOpen(false)} onSaved={() => setRevision(n => n + 1)} />}
    {isConnections && <Result state={list}><ChannelCards rows={rows}
      onEdit={row => { setEditingChannel(row); setChannelFormOpen(true); }}
      onRemove={row => setRemoveTarget({ label: 'tài khoản ' + cell(row.accountName, 'accountName'), remove: () => channelsService.remove(row.id, session?.access_token ?? '') })} /></Result>}
    {channelFormOpen && <ChannelForm initial={editingChannel} connection={isMapping ? selection : undefined}
      onClose={() => setChannelFormOpen(false)} onSaved={() => setRevision(n => n + 1)} />}
    {removeTarget && <RemoveChannelResource target={removeTarget} onClose={() => setRemoveTarget(null)}
      onRemoved={() => { setRemoveTarget(null); setRevision(n => n + 1); }} />}
    {page === 'inventory' && <Result state={list}><InventoryTable rows={rows} onAdjust={setAdjustingInventory} /></Result>}
    {adjustingInventory && <InventoryAdjustmentModal item={adjustingInventory} onClose={() => setAdjustingInventory(null)} onSaved={() => setRevision(n => n + 1)} />}
    {view && page !== 'inventory' && <Result state={list}><RowsTable rows={rows} columns={view.columns} /></Result>}
    {page === 'inventory' && <section className="space-y-3">
      <button className="btn-secondary" type="button" onClick={() => setTransactions(value => !value)}>
        {transactions ? 'Ẩn lịch sử kho' : 'Xem lịch sử kho'}
      </button>
      {transactions && <Result state={ledger}><RowsTable rows={ledger.rows} columns={transactionColumns} /></Result>}
    </section>}
    {isMapping && <Result state={list}>
      <div className="card p-4">
        <label className="block max-w-sm font-medium">Tài khoản kênh
          <select className="input mt-1 w-full" value={selection} onChange={event => setSelection(event.target.value)}>
            <option value="">Chọn tài khoản</option>
            {list.rows.map(row => <option key={row.id} value={row.id}>{cell(row.accountName, 'accountName')}</option>)}
          </select>
        </label>
      </div>
      {selection ? <Result state={mapping}>
        <HierarchicalDataGrid<Row> data={mapping.rows} rowKey={row => row.id}
          title="Danh sách ánh xạ" searchPlaceholder="Tìm theo SKU hoặc tên sản phẩm"
          searchFilter={(row, query) => mappingColumns.some(([key]) => cell(row[key], key).toLocaleLowerCase('vi').includes(query))}
          groups={[
            { id: 'channel_info', title: 'Trên kênh bán', columns: [{ id: 'channelSku', header: 'SKU trên kênh', accessor: row => <code>{cell(row.channelSku, 'channelSku')}</code> }] },
            { id: 'product_info', title: 'Trong kho', columns: mappingColumns.slice(1).map(([key, label]) => ({
              id: key, header: label, accessor: row => cell(row[key], key),
            })) },
            { id: 'mapping_actions', title: 'Thao tác', columns: [{
              id: 'remove', header: 'Xóa ánh xạ', accessor: row => <button type="button" className="btn-secondary text-red-700"
                onClick={() => setRemoveTarget({
                  label: 'ánh xạ ' + cell(row.channelSku, 'channelSku'),
                  remove: () => channelsService.removeMapping(selection, row.id, session?.access_token ?? ''),
                })}>Xóa ánh xạ</button>,
            }] },
          ]} />
      </Result> : <p className="card p-6 text-ink-600">{list.rows.length
        ? 'Chọn một tài khoản để xem SKU trên kênh tương ứng với sản phẩm nào trong kho.'
        : 'Thêm tài khoản ở trang Kết nối sàn để bắt đầu ánh xạ.'}</p>}
    </Result>}
  </section>;
}
