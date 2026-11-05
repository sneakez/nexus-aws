import { HierarchicalDataGrid, type DataGridColumnGroup } from '@/components/common/HierarchicalDataGrid';
import { BackendOrderCreateModal } from '../components/BackendOrderCreateModal';
import { BackendOrderDetailDrawer } from '../components/BackendOrderDetailDrawer';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BackendOrderFinance } from '../components/BackendOrderFinance';
import { getBackendReturn, returnStatusLabels, type BackendReturnCase } from '@/lib/backendOrderAfterSales';
import { Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { getBackendOrders, type BackendOrderSummary } from '@/lib/backendOrders';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate } from '@/lib/utils';
import { formatOrderMoney as formatCurrency } from '@/lib/orderFormatting';

const statuses: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận',
  processing: 'Đang chuẩn bị', shipped: 'Đã xuất kho',
  delivered: 'Đã giao', cancelled: 'Đã hủy', returned: 'Đã trả hàng',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900', confirmed: 'bg-indigo-100 text-indigo-900',
  processing: 'bg-blue-100 text-blue-900', shipped: 'bg-cyan-100 text-cyan-900',
  delivered: 'bg-emerald-100 text-emerald-900', cancelled: 'bg-red-100 text-red-900',
  returned: 'bg-slate-100 text-slate-800',
};

function StatusBadge({ status }: { status: string }) {
  return <span className={'badge whitespace-nowrap px-2 py-1 text-xs font-semibold ' + (statusColors[status] ?? 'bg-ink-100')}>
    {statuses[status] ?? status}
  </span>;
}

function orderGroups(open: (id: string) => void): DataGridColumnGroup<BackendOrderSummary>[] {
  return [
  { id: 'grp_order', title: 'Mã đơn hàng', columns: [
    { id: 'orderNumber', header: 'Mã đơn', accessor: order => <button type="button" className="font-mono font-semibold hover:underline" onClick={event => { event.stopPropagation(); open(order.id); }}>{order.orderNumber}</button>, sortable: true, sortValue: order => order.orderNumber },
    { id: 'createdAt', header: 'Ngày tạo', accessor: order => formatDate(order.createdAt), sortable: true, sortValue: order => order.createdAt },
  ] },
  { id: 'grp_operations', title: 'Vận hành', columns: [
    { id: 'status', header: 'Trạng thái', accessor: order => <StatusBadge status={order.status} /> },
  ] },
  { id: 'grp_economics', title: 'Giá trị đơn', columns: [
    { id: 'total', header: 'Tổng tiền', align: 'right', accessor: order => <strong className="tabular-nums">{formatCurrency(order.total)}</strong> },
  ] },
];
}

function Overview({ orders, open }: { orders: BackendOrderSummary[]; open: (id: string) => void }) {
  const stages = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  const maximum = Math.max(1, ...stages.map(status => orders.filter(order => order.status === status).length));
  return <div className="grid gap-4 lg:grid-cols-2">
    <section className="card space-y-4 p-5" aria-label="Phân bố trạng thái đơn">
      <h2 className="font-semibold text-ink-900">Tiến độ vận hành</h2>
      {stages.map(status => {
        const count = orders.filter(order => order.status === status).length;
        return <div key={status} className="space-y-1">
          <div className="flex justify-between text-sm"><span>{statuses[status]}</span><strong>{count}</strong></div>
          <div className="h-2 overflow-hidden rounded bg-ink-100"><div className="h-full bg-teal-600" style={{ width: (count / maximum * 100) + '%' }} /></div>
        </div>;
      })}
    </section>
    <section className="card space-y-3 p-5" aria-label="Đơn cần xử lý">
      <h2 className="font-semibold text-ink-900">Đơn cần xử lý</h2>
      {orders.filter(order => ['pending', 'confirmed', 'processing'].includes(order.status)).slice(0, 5).map(order =>
        <button key={order.id} type="button" onClick={() => open(order.id)}
          className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-ink-100 py-3 text-left hover:bg-ink-50">
          <span className="break-all font-mono text-sm font-semibold">{order.orderNumber}</span><StatusBadge status={order.status} />
        </button>)}
      {!orders.some(order => ['pending', 'confirmed', 'processing'].includes(order.status)) &&
        <p className="text-sm text-ink-600">Đã xử lý hết các đơn trong danh sách hiện tại.</p>}
    </section>
  </div>;
}

function ReturnLookup({ open }: { open: (id: string) => void }) {
  const { session } = useAuth();
  const [id, setId] = useState('');
  const [result, setResult] = useState<BackendReturnCase | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setResult(null);
    try { setResult(await getBackendReturn(id.trim(), session.access_token)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tra cứu được yêu cầu.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="card space-y-3 p-5">
    <h2 className="font-semibold text-ink-900">Tra cứu yêu cầu trả hàng</h2>
    <form onSubmit={event => { void submit(event); }} className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-sm font-medium">Mã yêu cầu
        <input required aria-label="Tra cứu mã yêu cầu" value={id} onChange={event => setId(event.target.value)}
          pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" maxLength={36}
          className="input mt-1 w-full" />
      </label>
      <button type="submit" disabled={busy} className="btn-secondary">{busy ? 'Đang tra cứu…' : 'Tra cứu'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {result && <div className="space-y-2 rounded-lg bg-ink-50 p-4 text-sm">
      <p className="font-semibold">{returnStatusLabels[result.status] ?? result.status}</p>
      <p className="whitespace-pre-wrap break-words">{result.reason}</p>
      <p>{result.items.length} dòng sản phẩm</p>
      <button type="button" className="btn-secondary" onClick={() => open(result.orderId)}>Mở đơn liên quan</button>
    </div>}
  </section>;
}

type OrdersView = 'orders' | 'dashboard' | 'fulfillment' | 'returns' | 'orderEconomics';
const summaryStatuses: Partial<Record<OrdersView, string[]>> = {
  dashboard: ['pending', 'processing', 'shipped'],
  fulfillment: ['pending', 'confirmed', 'processing'],
};

const statusFilters: Partial<Record<OrdersView, string[]>> = {
  fulfillment: ['pending', 'confirmed', 'processing'],
  returns: ['shipped', 'delivered', 'returned'],
};

const viewTitles: Record<OrdersView, string> = {
  orders: 'Quản Trị Đơn Hàng Đa Kênh', dashboard: 'Tổng quan đơn hàng', fulfillment: 'Xử lý đơn',
  returns: 'Đơn đủ điều kiện trả hàng', orderEconomics: 'Lợi nhuận từng đơn',
};
export function BackendOrdersPage({ search = '', view = 'orders' }: { search?: string; view?: OrdersView }) {
  const { session, activeRole } = useAuth();
  const token = session?.access_token;
  const [orders, setOrders] = useState<BackendOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [localSearch, setLocalSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [financeId, setFinanceId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setOrders([]);
    if (!token) {
      setError('Phiên đăng nhập không khả dụng. Vui lòng đăng nhập lại.');
      setLoading(false);
      return () => controller.abort();
    }
    void getBackendOrders(token, controller.signal)
      .then(data => { if (!controller.signal.aborted) setOrders(data); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Không tải được đơn hàng.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, revision]);

  const scoped = orders.filter(order => {
    if (view === 'fulfillment') return ['pending', 'confirmed', 'processing'].includes(order.status);
    if (view === 'returns') return ['shipped', 'delivered', 'returned'].includes(order.status);
    return true;
  });
  const visible = scoped.filter(order => status === 'all' || order.status === status);

  return (
    <section className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8" aria-labelledby="orders-heading">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 id="orders-heading" className="text-2xl font-bold text-ink-900">{viewTitles[view]}</h1>
          <p className="mt-1 text-sm text-ink-600">Theo dõi tối đa 100 đơn gần nhất. {view === 'orderEconomics' && 'Mở chi tiết để xem CM1–CM3.'}</p>
        </div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={loading} onClick={() => setRevision(n => n + 1)}
          className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
          {loading ? 'Đang tải…' : 'Tải lại'}
        </button>
        {view === 'orders' && (activeRole === 'admin' || activeRole === 'manager') && <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary inline-flex items-center gap-2"><Plus size={16} aria-hidden="true" />Tạo đơn hàng</button>}
        </div>
      </header>
      {summaryStatuses[view] && !loading && !error && <dl className="grid gap-3 sm:grid-cols-3">
        {summaryStatuses[view].map(value => <div key={value} className="card p-4">
          <dt className="text-sm text-ink-600">{statuses[value]}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{scoped.filter(order => order.status === value).length}</dd>
        </div>)}
      </dl>}
      {view === 'dashboard' && !loading && !error && <Overview orders={orders} open={setSelectedId} />}
      {view === 'returns' && <ReturnLookup open={setSelectedId} />}
      {view === 'orderEconomics' && !loading && !error && <section className="card space-y-4 p-5">
        <label className="block max-w-xl text-sm font-medium">Chọn đơn để phân tích lợi nhuận
          <select className="input mt-1 w-full" value={financeId} onChange={event => setFinanceId(event.target.value)}>
            <option value="">Chọn đơn hàng</option>
            {orders.map(order => <option key={order.id} value={order.id}>{order.orderNumber} · {statuses[order.status] ?? order.status}</option>)}
          </select>
        </label>
        {financeId && <BackendOrderFinance key={financeId} orderId={financeId} />}
      </section>}
      {notice && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}

      <div className="rounded-xl border border-ink-200 bg-white p-3 shadow-xs">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Tiến độ xử lý đơn</p>
        <div className="flex flex-wrap gap-2" aria-label="Lọc theo tiến độ">
          {[['all', 'Tất cả'], ...Object.entries(statuses).filter(([value]) => statusFilters[view]?.includes(value) ?? true)].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={status === value}
              className={(status === value ? 'btn-primary' : 'btn-secondary') + ' inline-flex items-center gap-2 text-xs'}
              onClick={() => setStatus(value)}>
              {label} <span className="rounded-full bg-ink-100 px-2 text-ink-800">{value === 'all' ? scoped.length : scoped.filter(order => order.status === value).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div aria-busy={loading}>
        {loading ? <p role="status" className="py-12 text-center text-ink-600">Đang tải đơn hàng…</p>
          : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
            <p>{error}</p>
            <button type="button" onClick={() => setRevision(n => n + 1)} className="mt-3 font-semibold underline">Thử lại</button>
          </div>
          : visible.length === 0 ? <div className="rounded-xl border border-ink-200 bg-white p-12 text-center">
            <ShoppingCart size={28} aria-hidden="true" className="mx-auto mb-3 text-ink-500" />
            <p className="font-medium text-ink-900">{orders.length ? 'Không có đơn phù hợp bộ lọc.' : 'Chưa có đơn hàng.'}</p>
            {orders.length > 0 && <button type="button" className="mt-3 text-sm font-semibold text-teal-700"
              onClick={() => { setLocalSearch(''); setStatus('all'); }}>Xóa bộ lọc</button>}
          </div>
          : <HierarchicalDataGrid
              data={visible}
              groups={orderGroups(setSelectedId)}
              rowKey={order => order.id}
              storageKey={'live-' + view}
              onRowClick={order => setSelectedId(order.id)}
              externalSearchQuery={localSearch || search}
              onSearchQueryChange={setLocalSearch}
              searchPlaceholder="Tìm theo mã đơn…"
              searchFilter={(order, query) => order.orderNumber.toLocaleLowerCase('vi').includes(query)}
              renderMobileCard={order => (
                <div className="space-y-2 rounded-xl border border-ink-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" className="font-mono text-sm font-semibold hover:underline" onClick={() => setSelectedId(order.id)}>{order.orderNumber}</button>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink-600">{formatDate(order.createdAt)}</span>
                    <strong>{formatCurrency(order.total)}</strong>
                  </div>

                </div>
              )}
            />}
      </div>
      {createOpen && <BackendOrderCreateModal onClose={() => setCreateOpen(false)} onCreated={order => {
        setCreateOpen(false); setStatus('all'); setLocalSearch(''); setRevision(n => n + 1);
        setNotice('Đã tạo đơn ' + order.orderNumber + ' và giữ hàng thành công.'); setSelectedId(order.id);
      }} />}
      {selectedId && <BackendOrderDetailDrawer key={selectedId} orderId={selectedId} onClose={() => setSelectedId(null)} onChanged={() => setRevision(n => n + 1)} />}
    </section>
  );
}
