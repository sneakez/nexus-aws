import { hasPermission } from '@/lib/permissions';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  FileText,
  Boxes,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { analyticsService } from '@/analytics/analyticsService';
import { omsStore as mockStore } from '@/stores/omsStore';
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  orderPaymentLabel,
} from '@/lib/utils';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/cn';
import { exportOrdersToExcel, exportOrdersToPDF } from '@/lib/export';
import { OrderFormModal } from '../components/OrderFormModal';
import { OrderDetailDrawer } from '../components/OrderDetailDrawer';
import { HierarchicalDataGrid, type DataGridColumnGroup } from '@/components/common/HierarchicalDataGrid';
import type { Order, OrderStatus } from '@/types';

interface OrdersPageProps {
  search?: string;
  onNavigate?: (pageId: string) => void;
}

const STATUS_FILTERS: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

const CHANNEL_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  shopee: { label: 'Shopee Mall', color: 'text-orange-700 border-orange-200', bg: 'bg-orange-50' },
  tiktok: { label: 'TikTok Shop', color: 'text-neutral-800 border-neutral-300', bg: 'bg-neutral-100' },
  lazada: { label: 'Lazada Mall', color: 'text-blue-700 border-blue-200', bg: 'bg-blue-50' },
  website: { label: 'Website D2C', color: 'text-emerald-700 border-emerald-200', bg: 'bg-emerald-50' }
};

export function OrdersPage({ search = '', onNavigate }: OrdersPageProps) {
  const toast = useToast();
  const { activeTenant, activeRole } = useAuth();
  const canViewEconomics = hasPermission(activeRole, 'finance:view') || hasPermission(activeRole, 'analytics:view');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showActionCenter, setShowActionCenter] = useState(false);

  // Subscribe to mock store to keep UI reactive
  const [, setStoreRevision] = useState(0);
  useEffect(() => {
    return mockStore.subscribe(() => {
      setStoreRevision(r => r + 1);
      loadOrders();
    });
  }, []);

  async function loadOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*), order_items(*)')
      .eq('tenant_id', activeTenant?.id)
      .order('placed_at', { ascending: false });
    if (error) {
      toast('Lỗi tải danh sách đơn hàng: ' + error.message, 'error');
    }
    setOrders(data ?? []);
    const linked = new URLSearchParams(location.search).get('order');
    if (linked) { const target = (data || []).find((o: Order) => o.id === linked); if (target) { setSelectedOrder(target); setShowDrawer(true); } }
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, [activeTenant?.id]);

  // Merge Order Unit Economics from Analytics Service
  const orderEconsMap = useMemo(() => {
    const list = analyticsService.getOrderEconomics(activeTenant?.id);
    const map = new Map<string, (typeof list)[0]>();
    list.forEach(e => map.set(e.orderId, e));
    return map;
  }, [orders, activeTenant?.id]);

  // Filtered orders
  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'cancelled') {
          if (o.status !== 'cancelled' && o.status !== 'refunded') return false;
        } else if (o.status !== statusFilter) {
          return false;
        }
      }
      if (channelFilter !== 'all' && (o.channel || 'shopee') !== channelFilter) return false;
      return true;
    });
  }, [orders, statusFilter, channelFilter]);

  // Level 1 KPI Counters
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;
    const inTransitOrders = orders.filter(o => o.status === 'shipped' || o.delivery_status === 'in_transit').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.delivery_status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length;
    const totalManagerialSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const podRecognizedRev = orders
      .filter(o => o.status === 'delivered' || o.delivery_status === 'delivered')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      inTransitOrders,
      deliveredOrders,
      cancelledOrders,
      totalManagerialSales,
      podRecognizedRev
    };
  }, [orders]);

  function openOrder(order: Order) {
    setSelectedOrder(order);
    setShowDrawer(true);
  }

  // Grouped Column Headers Architecture for HierarchicalDataGrid
  const columnGroups: DataGridColumnGroup<Order>[] = useMemo(() => [
    {
      id: 'grp_order',
      title: 'MÃ ĐƠN HÀNG',
      badge: 'CỐ ĐỊNH',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      columns: [
        {
          id: 'order_number',
          header: 'Mã Đơn',
          sticky: 'left',
          width: '165px',
          sortable: true,
          sortValue: o => o.order_number,
          accessor: o => {
            const ch = CHANNEL_BADGES[o.channel || 'shopee'] || CHANNEL_BADGES.shopee;
            return (
              <div className="space-y-1">
                <span className="font-mono font-bold text-sm text-ink-900 group-hover:text-brand-600 transition-colors block whitespace-nowrap">
                  #{o.order_number}
                </span>
                <span className={cn('badge text-xs px-2 py-0.5 font-bold border rounded whitespace-nowrap inline-flex items-center', ch.bg, ch.color)}>
                  {ch.label}
                </span>
              </div>
            );
          }
        }
      ]
    },
    {
      id: 'grp_info',
      title: 'THÔNG TIN KHÁCH HÀNG',
      badge: 'ĐỐI TÁC',
      badgeColor: 'bg-ink-100 text-ink-700 border-ink-300',
      columns: [
        {
          id: 'customer',
          header: 'Khách Hàng',
          width: '190px',
          sortable: true,
          sortValue: o => o.customer?.name || 'Khách vãng lai',
          accessor: o => (
            <div>
              <p className="font-bold text-sm text-ink-900 whitespace-nowrap truncate">{o.customer?.name || 'Khách vãng lai'}</p>
              <p className="text-xs text-ink-500 whitespace-nowrap truncate">{o.customer?.phone || o.customer?.email || 'Kênh TMĐT'}</p>
            </div>
          )
        },
        {
          id: 'placed_at',
          header: 'Ngày Đặt',
          width: '120px',
          sortable: true,
          sortValue: o => new Date(o.placed_at || o.created_at || '').getTime(),
          accessor: o => (
            <span className="text-xs sm:text-sm text-ink-600 block whitespace-nowrap">
              {formatDate(o.placed_at || o.created_at)}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_finance',
      title: 'TÀI CHÍNH ĐƠN HÀNG',
      badge: 'DOANH THU',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      columns: [
        {
          id: 'net_sales',
          header: 'Doanh Thu Thuần',
          align: 'right',
          width: '140px',
          sortable: true,
          sortValue: o => (orderEconsMap.get(o.id)?.netRevenue ?? o.total ?? 0),
          accessor: o => {
            const net = orderEconsMap.get(o.id)?.netRevenue ?? o.total ?? 0;
            return <span className="font-bold text-sm text-ink-900 whitespace-nowrap">{formatCurrency(net)}</span>;
          }
        },
        {
          id: 'discount',
          header: 'Voucher / Giảm',
          align: 'right',
          width: '120px',
          sortable: true,
          sortValue: o => o.discount || 0,
          accessor: o => (
            <span className={cn('text-xs sm:text-sm font-semibold whitespace-nowrap', o.discount ? 'text-rose-600' : 'text-ink-400')}>
              {o.discount ? `-${formatCurrency(o.discount)}` : '0 ₫'}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_economics',
      title: 'UNIT ECONOMICS (CM1 / CM2 / CM3)',
      badge: 'LỢI NHUẬN',
      badgeColor: 'bg-brand-50 text-brand-800 border-brand-200',
      defaultVisible: false,
      columns: [
        {
          id: 'cogs',
          header: 'Giá Vốn (COGS)',
          align: 'right',
          width: '125px',
          sortable: true,
          sortValue: o => orderEconsMap.get(o.id)?.cogs || 0,
          accessor: o => {
            const econ = orderEconsMap.get(o.id);
            return <span className="text-xs sm:text-sm font-medium text-ink-600 whitespace-nowrap">{formatCurrency(econ?.cogs || 0)}</span>;
          }
        },
        {
          id: 'cm2',
          header: 'Lãi CM2',
          align: 'right',
          width: '125px',
          sortable: true,
          sortValue: o => orderEconsMap.get(o.id)?.cm2 || 0,
          accessor: o => {
            const econ = orderEconsMap.get(o.id);
            const cm2 = econ?.cm2 || 0;
            return (
              <span className={cn('text-xs sm:text-sm font-bold whitespace-nowrap', cm2 >= 0 ? 'text-brand-900' : 'text-rose-600')}>
                {formatCurrency(cm2)}
              </span>
            );
          }
        },
        {
          id: 'cm3',
          header: 'Lãi CM3 Sau Ads',
          align: 'right',
          width: '140px',
          sortable: true,
          sortValue: o => orderEconsMap.get(o.id)?.cm3 || 0,
          accessor: o => {
            const econ = orderEconsMap.get(o.id);
            const cm3 = econ?.cm3 || 0;
            return (
              <span className={cn('badge text-xs font-bold px-2 py-0.5 whitespace-nowrap inline-flex items-center', cm3 >= 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300')}>
                {formatCurrency(cm3)}
              </span>
            );
          }
        }
      ]
    },
    {
      id: 'grp_operations',
      title: 'VẬN HÀNH & BẰNG CHỨNG POD',
      badge: 'TIẾN TRÌNH',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      columns: [
        {
          id: 'status',
          header: 'Trạng Thái Đơn',
          width: '135px',
          accessor: o => (
            <span className={cn('badge text-xs font-semibold px-2.5 py-1 whitespace-nowrap inline-flex items-center', ORDER_STATUS_COLORS[o.status])}>
              {ORDER_STATUS_LABELS[o.status] || o.status}
            </span>
          )
        },
        {
          id: 'delivery_status',
          header: 'Giao Hàng (POD)',
          width: '150px',
          accessor: o => {
            const isDelivered = o.status === 'delivered' || o.delivery_status === 'delivered';
            const isShipped = o.status === 'shipped' || o.delivery_status === 'in_transit';
            return (
              <div className="flex items-center gap-1">
                {isDelivered ? (
                  <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200 text-xs px-2.5 py-1 flex items-center gap-1.5 font-bold whitespace-nowrap">
                    <CheckCircle2 size={12} /> Đã Ký POD
                  </span>
                ) : isShipped ? (
                  <span className="badge bg-cyan-50 text-cyan-800 border-cyan-200 text-xs px-2.5 py-1 flex items-center gap-1.5 font-semibold whitespace-nowrap">
                    <Truck size={12} /> In-Transit
                  </span>
                ) : (
                  <span className="badge bg-ink-100 text-ink-700 border-ink-200 text-xs px-2.5 py-1 flex items-center gap-1.5 font-medium whitespace-nowrap">
                    <Clock size={12} /> Chờ Xuất Kho
                  </span>
                )}
              </div>
            );
          }
        },
        {
          id: 'payment_status',
          header: 'Thanh Toán',
          width: '135px',
          accessor: o => (
            <span className={cn('badge text-xs font-semibold px-2.5 py-1 whitespace-nowrap inline-flex items-center', PAYMENT_STATUS_COLORS[o.payment_status])}>
              {orderPaymentLabel(o)}
            </span>
          )
        }
      ]
    }
  ], [orderEconsMap]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Quản Trị Đơn Hàng Đa Kênh
            </h1>
            <span className="badge bg-brand-100 text-brand-800 border-brand-300 text-xs font-bold">
              Lưới dữ liệu & kiểm soát POD
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-1">
            Theo dõi toàn trình từ Đặt hàng, Khóa tồn giữ đơn, Pick/Pack, Bàn giao bưu tá đến Biên bản POD và Lợi nhuận CM3.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => exportOrdersToExcel(filtered)} className="btn-secondary text-sm py-2 px-3 font-semibold">
            <Download size={14} /> Excel
          </button>
          <button onClick={() => exportOrdersToPDF(filtered)} className="btn-secondary text-sm py-2 px-3 font-semibold">
            <FileText size={14} /> PDF
          </button>
          <button disabled={!hasPermission(activeRole, 'orders:create')} onClick={() => setShowForm(true)} className="btn-primary text-sm py-2 px-3.5 font-bold shadow-xs">
            + Tạo Đơn Hàng Mới
          </button>
        </div>
      </div>

      {/* LEVEL 1: OPERATIONAL PIPELINE STRIP (COMPACT SMART CONTROLS) */}
      <div className="rounded-xl border border-ink-200 bg-white shadow-xs overflow-hidden">
        {/* Main Operational Strip Container */}
        <div className="p-3 sm:p-4 space-y-3">
          {/* Row 1: Revenue Snapshot on Left, Action Guide Toggle on Right */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Group A: Revenue Snapshot */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
                <DollarSign size={20} />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink-500 uppercase tracking-wider">Doanh Thu Quản Trị</span>
                  <span className="badge text-xs font-bold px-2 py-0.5 bg-teal-50 text-teal-700 border-teal-200">FOB</span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg sm:text-xl font-black text-ink-900 tracking-tight">
                    {formatCurrency(kpis.totalManagerialSales)}
                  </span>
                  <span className="text-xs sm:text-sm text-ink-500">
                    (Có 511 POD: <strong className="text-emerald-700 font-bold">{formatCurrency(kpis.podRecognizedRev)}</strong>)
                  </span>
                </div>
              </div>
            </div>

            {/* Group C: Action Center Accordion Toggle */}
            <button
              type="button"
              onClick={() => setShowActionCenter(!showActionCenter)}
              className={cn(
                'btn btn-secondary text-xs sm:text-sm py-2 px-3.5 flex items-center gap-2 cursor-pointer transition-all border rounded-lg shadow-2xs',
                showActionCenter
                  ? 'bg-ink-100 text-ink-900 border-ink-300 font-bold'
                  : 'bg-white text-ink-700 border-ink-200 hover:bg-ink-50 font-semibold'
              )}
              title="Xem chi tiết hướng dẫn và thao tác quy trình 3 bước"
            >
              <Sparkles size={15} className="text-amber-500 shrink-0" />
              <span>Hướng dẫn tác vụ</span>
              <span className="badge bg-amber-100 text-amber-900 border-amber-300 text-xs px-2 py-0.5 font-bold">
                {kpis.pendingOrders + kpis.processingOrders + kpis.inTransitOrders} việc
              </span>
              {showActionCenter ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          {/* Row 2: Interactive Pipeline Stage Filter Chips (Horizontal Track) */}
          <div className="pt-2.5 border-t border-ink-100 flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {/* Pill: Tất cả */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer select-none shrink-0',
                statusFilter === 'all'
                  ? 'bg-ink-900 text-white border-ink-900 shadow-xs ring-2 ring-ink-900/20'
                  : 'bg-ink-50 text-ink-700 border-ink-200 hover:bg-ink-100 hover:text-ink-900'
              )}
            >
              <span>Tất cả</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold',
                statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-ink-200 text-ink-800'
              )}>
                {kpis.totalOrders}
              </span>
            </button>

            {/* Stage 1: Chờ Duyệt & Khóa Tồn */}
            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'pending' ? 'all' : 'pending')}
              className={cn(
                'px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer select-none shrink-0',
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30'
                  : 'bg-amber-50/90 text-amber-900 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
              )}
              title="Click để lọc đơn chờ duyệt và khóa tồn (Click lại để bỏ lọc)"
            >
              <span className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0",
                kpis.pendingOrders > 0 ? (statusFilter === 'pending' ? "bg-white" : "bg-amber-500 animate-pulse") : "bg-ink-300"
              )} />
              <span>Chờ duyệt & khóa tồn</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold',
                statusFilter === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-200 text-amber-900'
              )}>
                {kpis.pendingOrders}
              </span>
            </button>

            {/* Stage 2: Chờ đóng gói */}
            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'processing' ? 'all' : 'processing')}
              className={cn(
                'px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer select-none shrink-0',
                statusFilter === 'processing'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-600/30'
                  : 'bg-blue-50/90 text-blue-900 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
              )}
              title="Click để lọc đơn đang nhặt hàng wave picking và đóng gói (Click lại để bỏ lọc)"
            >
              <Boxes size={15} className={statusFilter === 'processing' ? 'text-white' : 'text-blue-600'} />
              <span>Chờ đóng gói</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold',
                statusFilter === 'processing' ? 'bg-white/25 text-white' : 'bg-blue-200 text-blue-900'
              )}>
                {kpis.processingOrders}
              </span>
            </button>

            {/* Stage 3: Đang giao In-Transit */}
            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'shipped' ? 'all' : 'shipped')}
              className={cn(
                'px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer select-none shrink-0',
                statusFilter === 'shipped'
                  ? 'bg-sky-600 text-white border-sky-700 shadow-xs ring-2 ring-sky-600/30'
                  : 'bg-sky-50/90 text-sky-900 border-sky-200 hover:bg-sky-100 hover:border-sky-300'
              )}
              title="Click để lọc đơn đã bàn giao bưu tá đang giao (Click lại để bỏ lọc)"
            >
              <Truck size={15} className={statusFilter === 'shipped' ? 'text-white' : 'text-sky-600'} />
              <span>Đang giao (In-Transit)</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold',
                statusFilter === 'shipped' ? 'bg-white/25 text-white' : 'bg-sky-200 text-sky-900'
              )}>
                {kpis.inTransitOrders}
              </span>
            </button>

            {/* Stage 4: Đã giao & Ký POD */}
            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'delivered' ? 'all' : 'delivered')}
              className={cn(
                'px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer select-none shrink-0',
                statusFilter === 'delivered'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-600/30'
                  : 'bg-emerald-50/90 text-emerald-900 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
              )}
              title="Click để lọc đơn đã giao ký nhận POD thành công (Click lại để bỏ lọc)"
            >
              <CheckCircle2 size={15} className={statusFilter === 'delivered' ? 'text-white' : 'text-emerald-600'} />
              <span>Đã ký POD</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold',
                statusFilter === 'delivered' ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900'
              )}>
                {kpis.deliveredOrders}
              </span>
            </button>

            {/* Stage 5: Đã hủy */}
            {kpis.cancelledOrders > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(prev => prev === 'cancelled' ? 'all' : 'cancelled')}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer select-none shrink-0',
                  statusFilter === 'cancelled'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-600/30'
                    : 'bg-rose-50/90 text-rose-900 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                )}
                title="Click để lọc đơn đã hủy (Click lại để bỏ lọc)"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span>Đã hủy</span>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-bold',
                  statusFilter === 'cancelled' ? 'bg-white/25 text-white' : 'bg-rose-200 text-rose-900'
                )}>
                  {kpis.cancelledOrders}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Action Center Details (Progressive Disclosure) */}
        {showActionCenter && (
          <div className="border-t border-ink-100 bg-ink-50/50 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between text-sm text-ink-600">
              <span className="font-semibold flex items-center gap-1.5 text-ink-800">
                <AlertTriangle size={15} className="text-amber-500" />
                Trung tâm điều phối tác vụ (Ưu tiên: Khóa tồn giữ đơn → Xuất kho đóng gói → Ký nhận POD)
              </span>
              <span className="hidden sm:inline text-xs text-ink-500">
                Nhấn nút tác vụ để mở nhanh chi tiết hoặc xử lý đơn hàng
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Action 1 */}
              <div className="rounded-xl border border-amber-200 bg-white p-3.5 sm:p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-900">
                      1. Chờ Khóa Tồn & Duyệt Đơn
                    </span>
                    <span className="badge bg-amber-100 text-amber-900 border-amber-300 text-xs px-2 py-0.5 font-bold">
                      {kpis.pendingOrders} đơn
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
                    Đơn hàng mới từ sàn TMĐT, cần chuyển tồn Khả dụng sang Đã giữ cho đơn trước khi nhặt hàng.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const pendingOrder = orders.find(o => o.status === 'pending');
                    if (pendingOrder) openOrder(pendingOrder);
                    else setStatusFilter('pending');
                  }}
                  className="btn btn-secondary text-xs sm:text-sm py-2 px-3 w-full flex items-center justify-center gap-1.5 font-bold text-amber-900 border-amber-300 hover:bg-amber-50 cursor-pointer"
                >
                  <span>{kpis.pendingOrders > 0 ? 'Xử lý đơn chờ duyệt ngay' : 'Xem danh sách đơn chờ'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Action 2 */}
              <div className="rounded-xl border border-blue-200 bg-white p-3.5 sm:p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-900">
                      2. Đang Chuẩn Bị & Đóng Gói
                    </span>
                    <span className="badge bg-blue-100 text-blue-900 border-blue-300 text-xs px-2 py-0.5 font-bold">
                      {orders.filter(o => o.status === 'processing').length} đơn
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
                    Đã khóa tồn, đang gom sóng nhặt hàng (Wave Picking) và in phiếu đóng gói theo SLA cam kết.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const procOrder = orders.find(o => o.status === 'processing');
                    if (procOrder) openOrder(procOrder);
                    else setStatusFilter('processing');
                  }}
                  className="btn btn-secondary text-xs sm:text-sm py-2 px-3 w-full flex items-center justify-center gap-1.5 font-bold text-blue-900 border-blue-300 hover:bg-blue-50 cursor-pointer"
                >
                  <span>Kiểm tra tiến độ đóng gói</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Action 3 */}
              <div className="rounded-xl border border-emerald-200 bg-white p-3.5 sm:p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-900">
                      3. Đang Vận Chuyển & Ký POD
                    </span>
                    <span className="badge bg-emerald-100 text-emerald-900 border-emerald-300 text-xs px-2 py-0.5 font-bold">
                      {kpis.inTransitOrders} đơn
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
                    Đã bàn giao bưu tá, theo dõi hành trình và thu thập biên bản POD để ghi nhận Doanh thu Có 511.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const shipOrder = orders.find(o => o.status === 'shipped');
                    if (shipOrder) openOrder(shipOrder);
                    else setStatusFilter('shipped');
                  }}
                  className="btn btn-secondary text-xs sm:text-sm py-2 px-3 w-full flex items-center justify-center gap-1.5 font-bold text-emerald-900 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                >
                  <span>Xem đơn chờ biên bản POD</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LEVEL 2 & 3: HIERARCHICAL REUSABLE DATA GRID */}
      <HierarchicalDataGrid
        data={filtered}
        groups={canViewEconomics ? columnGroups : columnGroups.filter(g => g.id !== 'grp_economics')}
        rowKey={o => o.id}
        storageKey="orders"
        selectable
        onRowClick={openOrder}
        externalSearchQuery={search}
        bulkActions={(selectedIds, clearSelection) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                selectedIds.forEach(id => {
                  const result = mockStore.releaseToWarehouse(id);
                  if (!result.success) toast(result.error || 'Đơn chưa đủ điều kiện', 'error');
                });
                clearSelection();
                toast(`Đã duyệt và khóa tồn thành công cho ${selectedIds.length} đơn hàng!`, 'success');
              }}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors text-xs sm:text-sm shadow-2xs"
            >
              <CheckCircle2 size={14} />
              <span>Duyệt Hàng Loạt</span>
            </button>
            <button
              onClick={() => {
                const targetOrders = orders.filter(o => selectedIds.includes(o.id));
                exportOrdersToExcel(targetOrders);
                toast(`Đã xuất Excel cho ${selectedIds.length} đơn hàng!`, 'success');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors text-xs sm:text-sm shadow-2xs"
            >
              <Download size={14} />
              <span>Xuất Excel</span>
            </button>
          </div>
        )}
        searchPlaceholder="Tìm kiếm mã đơn, khách hàng..."
        searchFilter={(o, q) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.customer?.name || '').toLowerCase().includes(q) ||
          (o.customer?.phone || '').includes(q)
        }
        filterControls={
          <div className="flex items-center gap-2">
            {/* Channel Filter Dropdown */}
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="text-sm py-2 px-3 bg-white border border-[#D9E3E8] rounded-lg font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E647F]/20 focus:border-[#1E647F] cursor-pointer transition-all shadow-2xs shrink-0"
              title="Lọc theo kênh bán hàng"
            >
              <option value="all">Tất cả kênh bán</option>
              <option value="shopee">Shopee Mall</option>
              <option value="tiktok">TikTok Shop</option>
              <option value="lazada">Lazada Mall</option>
              <option value="website">Website D2C</option>
            </select>
          </div>
        }
        renderMobileCard={(order, isExpanded, onToggleExpand) => {
          const ch = CHANNEL_BADGES[order.channel || 'shopee'] || CHANNEL_BADGES.shopee;
          const econ = orderEconsMap.get(order.id);

          return (
            <div className="p-3 rounded-xl border border-ink-200 bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <strong className="font-mono text-ink-900 text-xs">#{order.order_number}</strong>
                  <span className={cn('badge text-[9px] px-1 py-0 border', ch.bg, ch.color)}>
                    {ch.label}
                  </span>
                </div>
                <span className={cn('badge text-[10px]', ORDER_STATUS_COLORS[order.status])}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-ink-100">
                <div>
                  <span className="text-[10px] text-ink-400 block font-sans">Khách hàng:</span>
                  <span className="font-medium text-ink-900 truncate block">{order.customer?.name || 'Khách vãng lai'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block font-sans">Doanh thu thuần:</span>
                  <strong className="text-ink-900">{formatCurrency(order.total || 0)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block font-sans">Giao hàng (POD):</span>
                  <span className="text-[11px] font-semibold text-ink-700">
                    {order.status === 'delivered' ? '✓ Đã Ký POD' : order.status === 'shipped' ? '🚚 In-Transit' : 'Chờ Xuất'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block font-sans">Lợi nhuận CM3:</span>
                  <span className="font-bold text-emerald-700">
                    {canViewEconomics ? econ ? formatCurrency(econ.cm3) : 'N/A' : 'Không có quyền'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-ink-100">
                <button
                  onClick={() => openOrder(order)}
                  className="btn btn-secondary text-xs py-1 px-2 text-ink-700 flex items-center gap-1"
                >
                  <Eye size={12} /> Drawer
                </button>

                <button
                  onClick={onToggleExpand}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <span>{isExpanded ? 'Đóng chi tiết' : 'Mở P&L & Sản phẩm'}</span>
                  <ChevronRight size={13} className={cn('transition-transform', isExpanded && 'rotate-90')} />
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* Modal & Drawer */}
      {showForm && (
        <OrderFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            loadOrders();
          }}
        />
      )}

      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
          onOrderUpdated={loadOrders}
          onOrderDeleted={() => {
            loadOrders();
            setShowDrawer(false);
          }}
        />
      )}
    </div>
  );
}
