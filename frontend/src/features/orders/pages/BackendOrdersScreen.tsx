import { HierarchicalDataGrid, type DataGridColumnGroup } from '@/components/common/HierarchicalDataGrid';
import { BackendOrderCreateModal } from '../components/BackendOrderCreateModal';
import { BackendOrderDetailDrawer } from '../components/BackendOrderDetailDrawer';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { ordersService, type BackendOrderSummary } from '@/services/orders.service';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate } from '@/lib/utils';
import { formatOrderMoney as formatCurrency } from '@/lib/orderFormatting';
import { afterSalesService, returnStatusLabels, type BackendReturnSummary } from '@/services/afterSales.service';
import { financeService } from '@/services/finance.service';
import { OrderOverviewCharts, ProfitTimelineChart } from '../components/OrderCharts';
import { ApiError } from '@/services/apiClient';

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


type OrdersView = 'orders' | 'dashboard' | 'fulfillment' | 'returns' | 'orderEconomics';
const summaryStatuses: Partial<Record<OrdersView, string[]>> = {
  dashboard: ['pending', 'processing', 'shipped'],
  fulfillment: ['pending', 'confirmed', 'processing'],
};

const statusFilters: Partial<Record<OrdersView, string[]>> = {
  fulfillment: ['pending', 'confirmed', 'processing'],
};

const viewTitles: Record<OrdersView, string> = {
  orders: 'Quản Trị Đơn Hàng Đa Kênh', dashboard: 'Tổng quan đơn hàng', fulfillment: 'Xử lý đơn',
  returns: 'Đơn đổi trả', orderEconomics: 'Lợi nhuận từng đơn',
};

function ReturnStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { requested: 'bg-amber-100 text-amber-900', approved: 'bg-indigo-100 text-indigo-900', received: 'bg-cyan-100 text-cyan-900', rejected: 'bg-rose-100 text-rose-900', refunded: 'bg-emerald-100 text-emerald-900', closed: 'bg-slate-100 text-slate-800' };
  return <span className={'badge whitespace-nowrap px-2 py-1 text-xs font-semibold ' + (colors[status] ?? 'bg-ink-100')}>{returnStatusLabels[status] ?? status}</span>;
}

function BackendReturnsPage({ search = '', dateRange }: { search?: string; dateRange?: { from: string; to: string } }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('all');
  const [localSearch, setLocalSearch] = useState('');
  const returns = useQuery({
    queryKey: ['returns', session?.user.id, dateRange?.from ?? '', dateRange?.to ?? ''],
    enabled: Boolean(token),
    queryFn: ({ signal }) => afterSalesService.listReturns(token!, signal, dateRange),
  });
  const lookup = (localSearch || search).trim().toLocaleLowerCase('vi');
  const rows = (returns.data ?? []).filter(row => (status === 'all' || row.status === status) && (!lookup || [row.orderNumber, row.customerName ?? '', row.channelName ?? '', row.reason ?? ''].some(value => value.toLocaleLowerCase('vi').includes(lookup))));
  const statuses = ['requested', 'approved', 'received', 'rejected', 'refunded', 'closed'];
  const groups: DataGridColumnGroup<BackendReturnSummary>[] = [{ id: 'returns', title: 'Đổi trả', columns: [
    { id: 'orderNumber', header: 'Mã đơn', accessor: row => <span className="font-mono font-semibold">{row.orderNumber}</span>, sortable: true, sortValue: row => row.orderNumber },
    { id: 'channel', header: 'Kênh', accessor: row => row.channelName ?? 'Đơn trực tiếp' },
    { id: 'customer', header: 'Khách hàng', accessor: row => row.customerName ?? 'Khách vãng lai' },
    { id: 'reason', header: 'Lý do', accessor: row => row.reason ?? 'Chưa nêu lý do' },
    { id: 'status', header: 'Trạng thái đổi trả', accessor: row => <ReturnStatusBadge status={row.status} /> },
    { id: 'createdAt', header: 'Ngày yêu cầu', accessor: row => formatDate(row.createdAt), sortable: true, sortValue: row => row.createdAt },
  ] }];
  return <section className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8" aria-labelledby="returns-heading">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 id="returns-heading" className="text-2xl font-bold text-ink-900">Đơn đổi trả</h1><p className="mt-1 text-sm text-ink-600">Theo dõi các yêu cầu đổi trả đã phát sinh.</p></div><button type="button" className="btn-secondary inline-flex items-center gap-2" disabled={returns.isFetching} onClick={() => { void queryClient.invalidateQueries({ queryKey: ['returns', session?.user.id] }); }}><RefreshCw size={16} className={returns.isFetching ? 'animate-spin' : ''} />{returns.isFetching ? 'Đang tải…' : 'Tải lại'}</button></header>
    <div className="rounded-xl border border-ink-200 bg-white p-3 shadow-xs"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Trạng thái đổi trả</p><div className="flex flex-wrap gap-2">{[['all', 'Tất cả'], ...statuses.map(value => [value, returnStatusLabels[value] ?? value])].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} className={(status === value ? 'btn-primary' : 'btn-secondary') + ' inline-flex items-center gap-2 text-xs'} onClick={() => setStatus(value)}>{label}<span className="rounded-full bg-ink-100 px-2 text-ink-800">{value === 'all' ? (returns.data ?? []).length : (returns.data ?? []).filter(row => row.status === value).length}</span></button>)}</div></div>
    {returns.isLoading ? <p role="status" className="py-12 text-center text-ink-600">Đang tải đơn đổi trả…</p> : returns.error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{returns.error instanceof Error ? returns.error.message : 'Không tải được đơn đổi trả.'}</div> : <HierarchicalDataGrid data={rows} groups={groups} rowKey={row => row.id} storageKey="live-returns" externalSearchQuery={localSearch || search} onSearchQueryChange={setLocalSearch} searchPlaceholder="Tìm mã đơn, khách hàng, lý do…" searchFilter={(row, value) => [row.orderNumber, row.customerName ?? '', row.channelName ?? '', row.reason ?? ''].some(item => item.toLocaleLowerCase('vi').includes(value))} renderMobileCard={row => <div className="space-y-2 rounded-xl border border-ink-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><span className="font-mono font-semibold">{row.orderNumber}</span><ReturnStatusBadge status={row.status} /></div><p className="text-sm text-ink-600">{row.channelName ?? 'Đơn trực tiếp'}{row.customerName ? ' · ' + row.customerName : ''}</p><p className="text-sm">{row.reason ?? 'Chưa nêu lý do'}</p></div>} />}
  </section>;
}

export function BackendOrdersPage(props: { search?: string; view?: OrdersView; dateRange?: { from: string; to: string } }) {
  return props.view === 'returns' ? <BackendReturnsPage search={props.search} dateRange={props.dateRange} /> : <BackendOrdersMain {...props} />;
}

function BackendOrdersMain({ search = '', view = 'orders', dateRange }: { search?: string; view?: OrdersView; dateRange?: { from: string; to: string } }) {
  const { session, activeRole } = useAuth();
  const token = session?.access_token;
  const queryClient = useQueryClient();
  const [localSearch, setLocalSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [economicsOrderId, setEconomicsOrderId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(true);

  const orderQuery = useQuery({
    queryKey: ['orders', session?.user.id, dateRange?.from ?? '', dateRange?.to ?? ''],
    enabled: Boolean(token),
    queryFn: ({ signal }) => ordersService.list(token!, signal, dateRange),
  });
  const orders = orderQuery.data ?? [];
  const loading = orderQuery.isLoading;
  const error = orderQuery.error instanceof Error ? orderQuery.error.message : !token ? 'Phiên đăng nhập không khả dụng. Vui lòng đăng nhập lại.' : null;
  const refreshOrders = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['orders', session?.user.id] }),
    queryClient.invalidateQueries({ queryKey: ['workspace', session?.user.id] }),
    queryClient.invalidateQueries({ queryKey: ['returns', session?.user.id] }),
  ]);
  const profitTimeline = useQuery({
    queryKey: ['finance-timeline', session?.user.id, dateRange?.from ?? '', dateRange?.to ?? ''],
    enabled: Boolean(token && view === 'orderEconomics' && showCharts),
    queryFn: ({ signal }) => financeService.timeline(token!, dateRange ?? { from: '', to: '' }, signal),
  });

  const scoped = orders.filter(order => {
    if (view === 'fulfillment') return ['pending', 'confirmed', 'processing'].includes(order.status);
    if (view === 'returns') return ['shipped', 'delivered', 'returned'].includes(order.status);
    return true;
  });
  const visible = scoped.filter(order => status === 'all' || order.status === status);
  const openOrderDetail = (orderId: string) => {
    if (view === 'orderEconomics') setEconomicsOrderId(orderId);
    else setSelectedId(orderId);
  };

  return (
    <section className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8" aria-labelledby="orders-heading">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 id="orders-heading" className="text-2xl font-bold text-ink-900">{viewTitles[view]}</h1>
          <p className="mt-1 text-sm text-ink-600">Theo dõi tối đa 100 đơn gần nhất. {view === 'orderEconomics' && 'Mở chi tiết để xem doanh thu, chi phí và lợi nhuận.'}</p>
        </div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={loading} onClick={() => { void refreshOrders(); }}
          className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
          {loading ? 'Đang tải…' : 'Tải lại'}
        </button>
        {view === 'orders' && (activeRole === 'admin' || activeRole === 'manager') && <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary inline-flex items-center gap-2"><Plus size={16} aria-hidden="true" />Tạo đơn nội bộ</button>}
        </div>
      </header>
      {summaryStatuses[view] && !loading && !error && <dl className="grid gap-3 sm:grid-cols-3">
        {summaryStatuses[view].map(value => <div key={value} className="card p-4">
          <dt className="text-sm text-ink-600">{statuses[value]}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{scoped.filter(order => order.status === value).length}</dd>
        </div>)}
      </dl>}
      {view === 'dashboard' && !loading && !error && <><OrderOverviewCharts orders={orders} /><Overview orders={orders} open={setSelectedId} /></>}
      {(view === 'orders' || view === 'orderEconomics') && !loading && !error && <details className="rounded-xl border border-ink-200 bg-white p-4 shadow-xs" open={showCharts} onToggle={event => setShowCharts(event.currentTarget.open)}>
        <summary className="cursor-pointer font-semibold text-ink-900">Biểu đồ tổng quan</summary>
        <div className="mt-4">{view === 'orders'
          ? <OrderOverviewCharts orders={orders} />
          : profitTimeline.isLoading ? <p role="status" className="py-12 text-center text-ink-600">Đang tải biểu đồ lợi nhuận…</p>
            : profitTimeline.error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{profitTimeline.error instanceof ApiError && profitTimeline.error.status === 404 ? 'Backend chưa nạp chức năng biểu đồ lợi nhuận. Dừng và chạy lại API rồi tải lại trang.' : 'Không tải được biểu đồ lợi nhuận.'}</p>
              : <ProfitTimelineChart rows={profitTimeline.data ?? []} />}</div>
      </details>}
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
            <button type="button" onClick={() => { void refreshOrders(); }} className="mt-3 font-semibold underline">Thử lại</button>
          </div>
          : visible.length === 0 ? <div className="rounded-xl border border-ink-200 bg-white p-12 text-center">
            <ShoppingCart size={28} aria-hidden="true" className="mx-auto mb-3 text-ink-500" />
            <p className="font-medium text-ink-900">{orders.length ? 'Không có đơn phù hợp bộ lọc.' : 'Chưa có đơn hàng.'}</p>
            {orders.length > 0 && <button type="button" className="mt-3 text-sm font-semibold text-teal-700"
              onClick={() => { setLocalSearch(''); setStatus('all'); }}>Xóa bộ lọc</button>}
          </div>
          : <HierarchicalDataGrid
              data={visible}
              groups={orderGroups(openOrderDetail)}
              rowKey={order => order.id}
              storageKey={'live-' + view}
              onRowClick={order => openOrderDetail(order.id)}
              externalSearchQuery={localSearch || search}
              onSearchQueryChange={setLocalSearch}
              searchPlaceholder="Tìm theo mã đơn…"
              searchFilter={(order, query) => order.orderNumber.toLocaleLowerCase('vi').includes(query)}
              renderMobileCard={order => (
                <div className="space-y-2 rounded-xl border border-ink-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" className="font-mono text-sm font-semibold hover:underline" onClick={() => openOrderDetail(order.id)}>{order.orderNumber}</button>
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
        setCreateOpen(false); setStatus('all'); setLocalSearch(''); void refreshOrders();
        setNotice('Đã tạo đơn ' + order.orderNumber + ' và giữ hàng thành công.'); setSelectedId(order.id);
      }} />}
      {selectedId && <BackendOrderDetailDrawer key={selectedId} orderId={selectedId} onClose={() => setSelectedId(null)} onChanged={() => { void refreshOrders(); }} />}
      {economicsOrderId && <BackendOrderDetailDrawer key={economicsOrderId} orderId={economicsOrderId} presentation="modal" showFinance onClose={() => setEconomicsOrderId(null)} onChanged={() => { void refreshOrders(); }} />}
    </section>
  );
}
