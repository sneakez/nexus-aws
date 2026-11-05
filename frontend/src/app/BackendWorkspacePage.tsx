import { PageHeader } from '@/components/common/PageHeader';
import { HierarchicalDataGrid } from '@/components/common/HierarchicalDataGrid';
import { Modal } from '@/components/ui/Modal';
import { Plus, RefreshCw, Store } from 'lucide-react';
import { BackendPricingCalculator } from './BackendPricingCalculator';
import { formatOrderMoney } from '@/lib/orderFormatting';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { PageId } from '@/app/types';
import { PAGE_META } from '@/app/navigation';
import { OrderApiError, orderApiRequest } from '@/lib/backendOrders';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate } from '@/lib/utils';

type Row = Record<string, unknown> & { id: string };
type Column = readonly [key: string, label: string];
type View = { endpoint: string; columns: readonly Column[] };
const views: Partial<Record<PageId, View>> = {
  skuEconomics: { endpoint: '/finance-summary/sku', columns: [['label', 'SKU'], ['orderCount', 'Đơn'], ['quantity', 'Số lượng'], ['revenue', 'Tiền hàng'], ['costOfGoods', 'Giá vốn'], ['cm1', 'Sau giá vốn']] },
  channelEconomics: { endpoint: '/finance-summary/channels', columns: [['label', 'Tài khoản kênh'], ['orderCount', 'Đơn'], ['revenue', 'Giá trị đơn'], ['costOfGoods', 'Giá vốn'], ['operatingFees', 'Phí vận hành'], ['advertisingFees', 'Quảng cáo'], ['cm1', 'CM1'], ['cm2', 'CM2'], ['cm3', 'CM3']] },
  customers: { endpoint: '/customers', columns: [['name', 'Tên'], ['phone', 'Điện thoại'], ['email', 'Email']] },
  inventory: { endpoint: '/inventory', columns: [['warehouseCode', 'Kho'], ['productSku', 'SKU'], ['productName', 'Sản phẩm'], ['stock', 'Tồn'], ['reserved', 'Đã giữ'], ['pendingQc', 'Chờ kiểm'], ['incoming', 'Sắp về'], ['available', 'Khả dụng']] },

};
const transactionColumns: Column[] = [['createdAt', 'Thời điểm'], ['type', 'Loại'], ['quantityDelta', 'Thay đổi'], ['referenceType', 'Nguồn'], ['referenceId', 'Mã tham chiếu']];
const mappingColumns: Column[] = [['channelSku', 'SKU trên kênh'], ['productSku', 'SKU nội bộ'], ['productName', 'Sản phẩm']];

async function fetchRows(endpoint: string, token: string, signal?: AbortSignal): Promise<Row[]> {
  const value = await orderApiRequest('/api/v1' + endpoint, token, signal);
  if (!Array.isArray(value) || value.some(row => !row || typeof row.id !== 'string')) {
    throw new Error('Danh sách trả về không hợp lệ.');
  }
  return value;
}

const moneyKeys = new Set(['revenue', 'costOfGoods', 'operatingFees', 'advertisingFees', 'cm1', 'cm2', 'cm3']);
function cell(value: unknown, key: string): string {
  if (moneyKeys.has(key)) return typeof value === 'string' ? formatOrderMoney(value) : 'Chưa đủ dữ liệu';
  if (typeof value === 'string') return key === 'createdAt' ? formatDate(value) : value;
  return typeof value === 'number' ? value.toLocaleString('vi-VN', { maximumFractionDigits: 5 }) : '—';
}

function RowsTable({ rows, columns }: { rows: Row[]; columns: readonly Column[] }) {
  if (!rows.length) return <p className="card p-8 text-center text-sm text-ink-600">Chưa có dữ liệu phù hợp.</p>;
  return <HierarchicalDataGrid<Row> data={rows} rowKey={row => row.id}
    searchPlaceholder="Tìm trong danh sách"
    searchFilter={(row, query) => columns.some(([key]) => cell(row[key], key).toLocaleLowerCase('vi').includes(query))}
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

function ChannelCards({ rows }: { rows: Row[] }) {
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
      </li>;
    })}
  </ul>;
}

function useRows(endpoint: string | undefined, revision: number) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [state, setState] = useState<{ rows: Row[]; error?: string; loading: boolean }>({ rows: [], loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ rows: [], loading: !!endpoint });
    if (!endpoint || !token) return () => controller.abort();
    void fetchRows(endpoint, token, controller.signal).then(rows => {
      if (!controller.signal.aborted) setState({ rows, loading: false });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ rows: [], error: error instanceof Error ? error.message : 'Không tải được dữ liệu.', loading: false });
    });
    return () => controller.abort();
  }, [endpoint, token, revision]);
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
      await orderApiRequest('/api/v1/customers', session.access_token, undefined, { name, phone, email });
      form.reset();
      onCreated();
    } catch (cause) {
      setError(cause instanceof OrderApiError && cause.status < 500 ? cause.message : 'Chưa xác nhận được kết quả. Kiểm tra danh sách trước khi lưu lại để tránh tạo trùng.');
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

function StockForm({ onSaved }: { onSaved: () => void }) {
  const { session } = useAuth();
  const products = useRows('/products?status=active', 0);
  const warehouses = useRows('/warehouses?status=active', 0);
  type Change = { warehouseId: string; productId: string; quantity: number; idempotencyKey: string; operation: 'receipts' | 'adjustments' };
  const key = 'nexus-pending-stock:' + session?.user.id;
  const [pending, setPending] = useState<Change | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); }
    catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || inFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const operation = data.get('operation') === 'adjustments' ? 'adjustments' : 'receipts';
    const change = pending ?? {
      warehouseId: String(data.get('warehouseId') ?? ''),
      productId: String(data.get('productId') ?? ''),
      quantity: Number(data.get('quantity')),
      idempotencyKey: 'web-stock:' + crypto.randomUUID(),
      operation,
    };
    if (!change.quantity || (change.operation === 'receipts' && change.quantity < 0)) {
      setError('Nhập số lượng dương khi nhập kho, hoặc số khác 0 khi điều chỉnh.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      sessionStorage.setItem(key, JSON.stringify(change));
      setPending(change);
      const { operation: action, ...payload } = change;
      try {
        await orderApiRequest('/api/v1/inventory/' + action, session.access_token, undefined, payload);
      } catch (cause) {
        if (!(cause instanceof OrderApiError) || cause.status !== 409) throw cause;
        const params = new URLSearchParams({ warehouseId: change.warehouseId, productId: change.productId });
        const ledger = await fetchRows('/inventory/transactions?' + params, session.access_token);
        const type = action === 'receipts' ? 'inbound' : 'adjustment';
        if (!ledger.some(row => row.idempotencyKey === change.idempotencyKey && row.type === type && row.quantityDelta === change.quantity)) throw cause;
      }
      sessionStorage.removeItem(key);
      setPending(null);
      form.reset();
      setNotice('Đã ghi nhận thay đổi tồn kho.');
      onSaved();
    } catch (cause) {
      if (cause instanceof OrderApiError && [400, 404, 409, 422].includes(cause.status)) {
        sessionStorage.removeItem(key);
        setPending(null);
      }
      setError(cause instanceof Error ? cause.message : 'Chưa xác nhận được thay đổi tồn kho.');
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <details className="rounded-xl border border-ink-200 bg-white p-4" open={pending ? true : undefined}>
    <summary className="cursor-pointer font-semibold">Nhập kho hoặc điều chỉnh tồn</summary>
    <form className="mt-4 space-y-3" onSubmit={event => { void submit(event); }}>
      {(products.error || warehouses.error) && <p role="alert">{products.error ?? warehouses.error}</p>}
      <fieldset disabled={busy || !!pending} className="grid gap-3 sm:grid-cols-2">
        <label>Thao tác<select name="operation" className="block w-full rounded border p-2" defaultValue={pending?.operation ?? 'receipts'}>
          <option value="receipts">Nhập kho</option><option value="adjustments">Điều chỉnh tăng/giảm</option>
        </select></label>
        <label>Số lượng thay đổi<input name="quantity" type="number" step="0.001" required defaultValue={pending?.quantity} className="block w-full rounded border p-2" /></label>
        <label>Kho<select name="warehouseId" required defaultValue={pending?.warehouseId ?? ''} className="block w-full rounded border p-2">
          <option value="">Chọn kho</option>{warehouses.rows.map(row => <option key={row.id} value={row.id}>{cell(row.code, 'code')} · {cell(row.name, 'name')}</option>)}
        </select></label>
        <label>Sản phẩm<select name="productId" required defaultValue={pending?.productId ?? ''} className="block w-full rounded border p-2">
          <option value="">Chọn sản phẩm</option>{products.rows.map(row => <option key={row.id} value={row.id}>{cell(row.sku, 'sku')} · {cell(row.name, 'name')}</option>)}
        </select></label>
      </fieldset>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button type="submit" className="btn-primary" disabled={busy || (!pending && (!products.rows.length || !warehouses.rows.length))}>
        {busy ? 'Đang kiểm tra…' : pending ? 'Kiểm tra lại yêu cầu kho' : 'Ghi nhận thay đổi tồn'}
      </button>
    </form>
  </details>;
}

function ChannelForm({ connection, onSaved, onClose }: { connection?: string; onSaved: () => void; onClose: () => void }) {
  const { session } = useAuth();
  const products = useRows(connection ? '/products?status=active' : undefined, 0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const title = connection ? 'Thêm ánh xạ SKU' : 'Thêm tài khoản kênh';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || inFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const endpoint = connection ? '/' + encodeURIComponent(connection) + '/sku-mappings' : '';
    const body = connection
      ? { productId: data.get('productId'), channelSku: String(data.get('channelSku')).trim() }
      : { type: data.get('type'), accountName: String(data.get('accountName')).trim() };
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await orderApiRequest('/api/v1/channel-connections' + endpoint, session.access_token, undefined, body);
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
          <label>Kênh<select name="type" className="block w-full rounded border p-2">
            <option value="shopee">Shopee</option><option value="tiktok_shop">TikTok Shop</option>
            <option value="lazada">Lazada</option><option value="website_d2c">Website</option>
          </select></label>
          <label>Tên tài khoản<input required maxLength={120} name="accountName" className="block w-full rounded border p-2" /></label>
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

const unavailable: Partial<Record<PageId, string>> = {
  simulator: 'Chạy kịch bản webhook trên môi trường lab để tránh phát sinh đơn thử trong dữ liệu vận hành.',
};

export function BackendWorkspacePage({ page, search }: { page: PageId; search: string }) {
  const view = views[page];
  const isConnections = page === 'channelConnections';
  const isMapping = page === 'channelMapping';
  const [channelFormOpen, setChannelFormOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState('');
  const [transactions, setTransactions] = useState(false);
  const list = useRows(isConnections || isMapping ? '/channel-connections' : view?.endpoint, revision);
  const mapping = useRows(page === 'channelMapping' && selection ? '/channel-connections/' + encodeURIComponent(selection) + '/sku-mappings' : undefined, revision);
  const ledger = useRows(page === 'inventory' && transactions ? '/inventory/transactions' : undefined, revision);
  const query = search.trim().toLocaleLowerCase('vi');
  const rows = list.rows.filter(row => !query || Object.values(row).some(value =>
    typeof value === 'string' && value.toLocaleLowerCase('vi').includes(query)));
  return <section className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
    <PageHeader title={PAGE_META[page].title} subtitle={PAGE_META[page].subtitle} actions={<>
      {(view || isConnections || isMapping) && <button className="btn-secondary" type="button" onClick={() => setRevision(n => n + 1)}>
        <RefreshCw size={16} aria-hidden="true" /> Tải lại
      </button>}
      {(isConnections || isMapping) && <button className="btn-primary" type="button"
        disabled={isMapping && !selection} onClick={() => setChannelFormOpen(true)}>
        <Plus size={16} aria-hidden="true" /> {isMapping ? 'Thêm ánh xạ SKU' : 'Thêm tài khoản kênh'}
      </button>}
    </>} />
    {page === 'pricingCalculator' && <BackendPricingCalculator />}
    {page === 'skuEconomics' && <p className="text-sm text-ink-600">Tổng tiền hàng và giá vốn theo SKU của đơn chưa hủy. Phí cấp đơn không phân bổ xuống SKU.</p>}
    {page === 'channelEconomics' && <p className="text-sm text-ink-600">Tổng CM1–CM3 theo kênh của đơn chưa hủy. Kết quả có thể bao gồm đơn đang xử lý.</p>}
    {unavailable[page] && <p className="rounded-xl border border-ink-200 bg-white p-4 text-ink-700">{unavailable[page]}</p>}
    {page === 'customers' && <CustomerForm onCreated={() => setRevision(n => n + 1)} />}
    {page === 'inventory' && <StockForm onSaved={() => setRevision(n => n + 1)} />}
    {isConnections && <Result state={list}><ChannelCards rows={rows} /></Result>}
    {channelFormOpen && <ChannelForm connection={isMapping ? selection : undefined}
      onClose={() => setChannelFormOpen(false)} onSaved={() => setRevision(n => n + 1)} />}
    {view && <Result state={list}><RowsTable rows={rows} columns={view.columns} /></Result>}
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
          ]} />
      </Result> : <p className="card p-6 text-ink-600">{list.rows.length
        ? 'Chọn một tài khoản để xem SKU trên kênh tương ứng với sản phẩm nào trong kho.'
        : 'Thêm tài khoản ở trang Kết nối sàn để bắt đầu ánh xạ.'}</p>}
    </Result>}
  </section>;
}
