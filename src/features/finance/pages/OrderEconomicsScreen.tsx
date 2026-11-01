import { EconomicsPeriod, type EconomicsPeriodValue } from '@/components/charts/EconomicsPeriod';

// Order contribution-margin feature screen.
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Layers,
  DollarSign,
  Percent,
  Download,
  ExternalLink,
  Boxes,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PackageCheck,
  Tag
} from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { omsStore as mockStore } from '@/stores/omsStore';
import type { OrderUnitEconomics } from '@/analytics/types';
import { KPICard } from '@/components/charts/KPICard';
import { SnapshotMetadataBanner } from '@/components/common/SnapshotMetadataBanner';
import { HierarchicalDataGrid, type DataGridColumnGroup } from '@/components/common/HierarchicalDataGrid';
import { Drawer } from '@/components/ui/Drawer';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface OrderEconomicsPageProps {
  onNavigate?: (pageId: string) => void;
}

const CHANNEL_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  shopee: { label: 'Shopee Mall', color: 'text-orange-700 border-orange-200', bg: 'bg-orange-50' },
  tiktok: { label: 'TikTok Shop', color: 'text-neutral-800 border-neutral-300', bg: 'bg-neutral-100' },
  lazada: { label: 'Lazada Mall', color: 'text-blue-700 border-blue-200', bg: 'bg-blue-50' },
  website: { label: 'Website D2C', color: 'text-emerald-700 border-emerald-200', bg: 'bg-emerald-50' }
};

export function OrderEconomicsPage({ onNavigate }: OrderEconomicsPageProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [drawerOrder, setDrawerOrder] = useState<OrderUnitEconomics | null>(null);

  const [period,setPeriod]=useState<EconomicsPeriodValue>('all');
  const allOrders = analyticsService.getOrderEconomics(undefined, period === 'all' ? undefined : period);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      if (selectedChannel !== 'all' && o.channel !== selectedChannel) return false;
      return true;
    });
  }, [allOrders, selectedChannel]);

  const totalGross = filteredOrders.reduce((sum, o) => sum + o.grossSales, 0);
  const totalNet = filteredOrders.reduce((sum, o) => sum + o.netRevenue, 0);
  const totalCm1 = filteredOrders.reduce((sum, o) => sum + o.cm1, 0);
  const totalCm2 = filteredOrders.reduce((sum, o) => sum + o.cm2, 0);
  const totalCm3 = filteredOrders.reduce((sum, o) => sum + o.cm3, 0);

  // Grouped Column Headers Architecture
  const columnGroups: DataGridColumnGroup<OrderUnitEconomics>[] = useMemo(() => [
    {
      id: 'grp_order_info',
      title: 'ĐƠN HÀNG & KÊNH SỐ',
      badge: 'IDENTIFIER',
      columns: [
        {
          id: 'order_number',
          header: 'Mã Đơn / Kênh',
          sticky: 'left',
          width: '180px',
          sortable: true,
          sortValue: o => o.orderNumber,
          accessor: o => {
            const ch = CHANNEL_BADGES[o.channel] || CHANNEL_BADGES.shopee;
            const isEst = o.confidenceStatus !== 'VERIFIED';
            return (
              <div className="space-y-1">
                <span className="font-bold text-ink-900 block">
                  #{o.orderNumber}
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={cn('badge text-[9px] px-1.5 py-0 font-bold border', ch.bg, ch.color)}>
                    {ch.label}
                  </span>
                  {isEst ? (
                    <span className="badge text-[9px] px-1 py-0 font-semibold bg-amber-50 text-amber-800 border-amber-200">
                      Chưa đủ / ước tính
                    </span>
                  ) : (
                    <span className="badge text-[9px] px-1 py-0 font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                      Đã đối soát mock
                    </span>
                  )}
                </div>
              </div>
            );
          }
        },
        {
          id: 'placed_at',
          header: 'Thời Gian',
          width: '110px',
          sortable: true,
          sortValue: o => new Date(o.placedAt).getTime(),
          accessor: o => (
            <span className="text-[11px] text-ink-500">
              {formatDate(o.placedAt)}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_revenue',
      title: 'DOANH THU & GIẢM TRỪ',
      badge: 'TOP-LINE',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      columns: [
        {
          id: 'net_revenue',
          header: 'Doanh Thu Thuần',
          align: 'right',
          width: '125px',
          sortable: true,
          sortValue: o => o.netRevenue,
          accessor: o => <strong className="font-semibold text-ink-900">{formatCurrency(o.netRevenue)}</strong>
        },
        {
          id: 'discounts',
          header: 'Voucher / Trợ Giá',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.discounts,
          accessor: o => (
            <span className={cn('text-xs font-medium', o.discounts > 0 ? 'text-rose-600' : 'text-ink-400')}>
              {o.discounts > 0 ? `-${formatCurrency(o.discounts)}` : '0 ₫'}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_variable_costs',
      title: 'CHI PHÍ BIẾN ĐỔI (COGS & PHÍ SÀN)',
      badge: 'EXPENSES',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      defaultVisible: false,
      columns: [
        {
          id: 'cogs',
          header: 'Giá Vốn (COGS)',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.cogs,
          accessor: o => <span className="text-xs font-medium text-ink-600">{formatCurrency(o.cogs)}</span>
        },
        {
          id: 'mkt_fees',
          header: 'Phí Sàn & WMS',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.marketplaceFees + o.fulfillmentCosts,
          accessor: o => (
            <span className="text-[11px] font-medium text-ink-600">
              {formatCurrency(o.marketplaceFees + o.fulfillmentCosts)}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_margins',
      title: '3-TIER CONTRIBUTION MARGIN',
      badge: 'PROFITABILITY',
      badgeColor: 'bg-brand-50 text-brand-800 border-brand-200',
      columns: [
        {
          id: 'cm1',
          header: 'Lãi Gộp CM1',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.cm1,
          accessor: o => (
            <div className="text-right">
              <span className="font-bold text-brand-900 block">{formatCurrency(o.cm1)}</span>
              <span className="text-[10px] text-ink-400">
                {o.netRevenue > 0 ? `${((o.cm1 / o.netRevenue) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          )
        },
        {
          id: 'cm2',
          header: 'Đóng Góp CM2',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.cm2,
          accessor: o => (
            <div className="text-right">
              <span className={cn('font-bold block', o.cm2 >= 0 ? 'text-blue-900' : 'text-rose-600')}>
                {formatCurrency(o.cm2)}
              </span>
              <span className="text-[10px] text-ink-400">
                {o.netRevenue > 0 ? `${((o.cm2 / o.netRevenue) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          )
        },
        {
          id: 'cm3',
          header: 'CM3 Sau Ads',
          align: 'right',
          width: '120px',
          sortable: true,
          sortValue: o => o.cm3,
          accessor: o => (
            <div className="text-right">
              <span className={cn('badge text-[11px] font-semibold', o.cm3 >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200')}>
                {formatCurrency(o.cm3)}
              </span>
              <span className="block text-[10px] text-ink-500 font-medium mt-0.5">
                {o.netRevenue > 0 ? `${((o.cm3 / o.netRevenue) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          )
        }
      ]
    },
    {
      id: 'grp_actions',
      title: 'HÀNH ĐỘNG',
      columns: [
        {
          id: 'actions',
          header: 'Thao Tác',
          align: 'right',
          width: '170px',
          accessor: o => (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerOrder(o);
                }}
                className="text-xs py-1 px-2.5 inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                title="Mở bảng trượt bóc tách 10 tầng P&L chi tiết"
              >
                <ReceiptText size={12} />
                <span>Xem chi tiết</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNavigate) onNavigate('orders');
                }}
                className="btn btn-secondary text-xs py-1 px-2 text-ink-600 hover:text-ink-900 flex items-center gap-1 cursor-pointer"
                title="Mở đơn trong OMS"
              >
                <span>OMS</span>
                <ArrowRight size={11} />
              </button>
            </div>
          )
        }
      ]
    }
  ], [onNavigate]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Lợi Nhuận Theo Đơn Hàng
            </h1>
            <span className="badge bg-brand-100 text-brand-800 border-brand-300 text-xs font-bold">
              Biên lợi nhuận 3 tầng
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Bóc tách chi phí giá vốn (COGS), phí sàn, đóng gói và quảng cáo để xác định chính xác lãi gộp CM1, CM2 và CM3.
          </p>
        </div>
      </div>

      <EconomicsPeriod value={period} onChange={setPeriod}/>

      {/* Snapshot Metadata Gate */}
      <SnapshotMetadataBanner
        currentModule="Kinh Tế Từng Đơn Hàng"
        orderCount={filteredOrders.length}
        dateFilter={selectedChannel === 'all' ? 'Toàn Bộ 12 Đơn Hàng (Đa Kênh)' : `Kênh: ${selectedChannel}`}
      />

      {/* LEVEL 1: Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard
          title="Tổng Doanh Thu Gộp"
          value={`${totalGross.toLocaleString()} ₫`}
          subtitle={`${filteredOrders.length} đơn hàng lọc`}
        />
        <KPICard
          title="Doanh Thu Thuần"
          value={`${totalNet.toLocaleString()} ₫`}
          subtitle="Sau voucher & giảm trừ"
          highlight
        />
        <KPICard
          title="Lãi Gộp CM1 (Sau COGS)"
          value={`${totalCm1.toLocaleString()} ₫`}
          subtitle={`Biên CM1: ${totalNet > 0 ? ((totalCm1 / totalNet) * 100).toFixed(1) : 0}%`}
        />
        <KPICard
          title="Lợi Nhuận Đóng Góp CM2"
          value={`${totalCm2.toLocaleString()} ₫`}
          subtitle={`Biên CM2: ${totalNet > 0 ? ((totalCm2 / totalNet) * 100).toFixed(1) : 0}%`}
          highlight
        />
        <KPICard
          title="Lợi Nhuận Ròng CM3 (Sau Ads)"
          value={`${totalCm3.toLocaleString()} ₫`}
          subtitle={`Biên CM3: ${totalNet > 0 ? ((totalCm3 / totalNet) * 100).toFixed(1) : 0}%`}
          badge={totalCm3 >= 0 ? 'LÃI RÒNG DƯƠNG' : 'LỖ RÒNG'}
        />
      </div>

      {/* LEVEL 2 & 3: Hierarchical Data Grid without Inline Jump */}
      <HierarchicalDataGrid
        data={filteredOrders}
        groups={columnGroups}
        rowKey={o => o.orderId}
        storageKey="order_economics"
        selectable
        onRowClick={(order) => setDrawerOrder(order)}
        bulkActions={(selectedIds, clearSelection) => {
          const selectedRecords = filteredOrders.filter(o => selectedIds.includes(o.orderId));
          const totalSelectedNet = selectedRecords.reduce((s, r) => s + r.netRevenue, 0);
          const totalSelectedCm3 = selectedRecords.reduce((s, r) => s + r.cm3, 0);
          return (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 hidden md:inline">
                Net: {formatCurrency(totalSelectedNet)} | CM3: {formatCurrency(totalSelectedCm3)}
              </span>
              <button
                onClick={() => {
                  const csvRows = [
                    ['Mã đơn', 'Kênh', 'Doanh thu gộp', 'Giảm giá', 'Doanh thu thuần', 'COGS', 'CM1', 'Phí sàn', 'Đóng gói', 'CM2', 'Ads', 'CM3'],
                    ...selectedRecords.map(r => [
                      r.orderNumber, r.channel, r.grossSales, r.discounts, r.netRevenue, r.cogs, r.cm1, r.marketplaceFees, r.fulfillmentCosts, r.cm2, r.attributedMarketingCosts, r.cm3
                    ])
                  ];
                  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(e => e.join(',')).join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `Order_Economics_Selected_${Date.now()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  clearSelection();
                }}
                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors text-xs"
              >
                <Download size={13} />
                <span>Xuất P&L Chọn</span>
              </button>
            </div>
          );
        }}
        searchPlaceholder="Tìm kiếm mã đơn..."
        searchFilter={(o, q) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.orderId.toLowerCase().includes(q)
        }
        filterControls={
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="input text-xs py-1.5 px-2.5 bg-white border border-ink-200"
          >
            <option value="all">Tất cả kênh số ({allOrders.length})</option>
            <option value="shopee">Shopee Mall</option>
            <option value="tiktok">TikTok Shop</option>
            <option value="lazada">Lazada Flagship</option>
            <option value="website">Website D2C</option>
          </select>
        }
        renderMobileCard={(order) => {
          const ch = CHANNEL_BADGES[order.channel] || CHANNEL_BADGES.shopee;

          return (
            <div
              onClick={() => setDrawerOrder(order)}
              className="p-3.5 rounded-xl border border-ink-200 bg-white space-y-2.5 shadow-2xs hover:border-brand-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-ink-900">#{order.orderNumber}</span>
                <span className={cn('badge text-[9px] px-1.5 py-0 border font-semibold', ch.bg, ch.color)}>
                  {ch.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-ink-400 block">Doanh thu thuần:</span>
                  <strong className="text-ink-900">{formatCurrency(order.netRevenue)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Giá vốn COGS:</span>
                  <span className="text-ink-600">{formatCurrency(order.cogs)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Lãi CM2:</span>
                  <span className="font-bold text-blue-900">{formatCurrency(order.cm2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Lãi CM3 Sau Ads:</span>
                  <span className={cn('badge text-[10px] font-bold', order.cm3 >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                    {formatCurrency(order.cm3)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-ink-100 flex items-center justify-between">
                <span className="text-[11px] text-brand-600 font-semibold flex items-center gap-1">
                  <ReceiptText size={12} />
                  <span>Xem Bóc Tách P&L Chi Tiết &rarr;</span>
                </span>
              </div>
            </div>
          );
        }}
      />

      {/* Slide-over Drilldown Drawer (Enterprise Standard Inspection) */}
      <OrderPnLDrawer
        order={drawerOrder}
        orderList={filteredOrders}
        onClose={() => setDrawerOrder(null)}
        onSelectOrder={(nextOrder) => setDrawerOrder(nextOrder)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

// =========================================================================
// SLIDE-OVER DRILLDOWN DRAWER: BÓC TÁCH CHI TIẾT P&L 10 BƯỚC & DÒNG SẢN PHẨM
// =========================================================================
interface OrderPnLDrawerProps {
  order: OrderUnitEconomics | null;
  orderList: OrderUnitEconomics[];
  onClose: () => void;
  onSelectOrder: (order: OrderUnitEconomics) => void;
  onNavigate?: (pageId: string) => void;
}

function OrderPnLDrawer({
  order,
  orderList,
  onClose,
  onSelectOrder,
  onNavigate,
}: OrderPnLDrawerProps) {
  const currentIndex = useMemo(() => {
    if (!order) return -1;
    return orderList.findIndex(o => o.orderId === order.orderId);
  }, [order, orderList]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < orderList.length - 1;

  // Arrow key continuous audit navigation
  useEffect(() => {
    if (!order) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        onSelectOrder(orderList[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && hasNext) {
        onSelectOrder(orderList[currentIndex + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, currentIndex, hasPrev, hasNext, orderList, onSelectOrder]);

  if (!order) return null;

  const ch = CHANNEL_BADGES[order.channel] || CHANNEL_BADGES.shopee;
  const rawOrder = mockStore.getOrderWithCustomer(order.orderId);
  const items = rawOrder?.items || [];
  const isEstimated = order.confidenceStatus === 'ESTIMATED';

  // Percentages calculated safely against netRevenue
  const calcNetPct = (val: number) => {
    if (!order.netRevenue) return '0%';
    return `${Math.abs((val / order.netRevenue) * 100).toFixed(1)}%`;
  };

  return (
    <Drawer
      open={Boolean(order)}
      onClose={onClose}
      title={`Bóc Tách Kinh Tế Đơn Hàng #${order.orderNumber}`}
      subtitle={`Kênh: ${ch.label} • Đặt lúc ${formatDate(order.placedAt)}`}
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => hasPrev && onSelectOrder(orderList[currentIndex - 1])}
              disabled={!hasPrev}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Đơn trước đó (Phím mũi tên trái ←)"
            >
              <ChevronLeft size={14} />
              <span>Đơn trước</span>
            </button>
            <span className="text-xs text-ink-500 font-medium px-1">
              {currentIndex + 1} / {orderList.length}
            </span>
            <button
              onClick={() => hasNext && onSelectOrder(orderList[currentIndex + 1])}
              disabled={!hasNext}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Đơn kế tiếp (Phím mũi tên phải →)"
            >
              <span>Đơn sau</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={onClose}
            className="btn btn-primary text-xs py-1.5 px-4 cursor-pointer shadow-xs"
          >
            Đóng bảng
          </button>
        </div>
      }
    >
      <div className="space-y-6 text-xs font-sans">
        {/* 1. Header Badges & OMS Action */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('badge text-[11px] px-2 py-0.5 font-bold border rounded-md', ch.bg, ch.color)}>
              {ch.label}
            </span>
            {isEstimated ? (
              <span className="badge text-[10px] px-2 py-0.5 font-semibold bg-amber-50 text-amber-800 border-amber-200 rounded-md flex items-center gap-1">
                <AlertCircle size={11} />
                <span>Chưa đủ / ước tính đối soát</span>
              </span>
            ) : (
              <span className="badge text-[10px] px-2 py-0.5 font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 rounded-md flex items-center gap-1">
                <CheckCircle2 size={11} />
                <span>Đã đối soát xác thực</span>
              </span>
            )}
            <span className="text-[11px] text-ink-400">
              ID: {order.orderId.slice(0, 10)}...
            </span>
          </div>

          {onNavigate && (
            <button
              onClick={() => {
                onClose();
                onNavigate('orders');
              }}
              className="btn btn-secondary text-xs py-1 px-2.5 text-brand-700 hover:text-brand-800 flex items-center gap-1 font-semibold"
              title="Xem đơn hàng này trong phân hệ OMS"
            >
              <span>Xem Đơn Hàng Trong OMS</span>
              <ExternalLink size={12} />
            </button>
          )}
        </div>

        {/* 2. 3-Tier Contribution Margin Quick Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Doanh Thu Thuần (Net)</span>
            <span className="text-lg font-bold text-slate-900 block">
              {formatCurrency(order.netRevenue)}
            </span>
            <span className="text-[10px] text-slate-400">Sau trừ Voucher & Giảm giá</span>
          </div>

          <div className="p-3.5 rounded-xl border border-brand-200 bg-brand-50/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-brand-800 block">Lãi Gộp CM1</span>
              <span className="text-[10px] font-bold text-brand-700">
                {order.netRevenue > 0 ? `${((order.cm1 / order.netRevenue) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <span className="text-lg font-bold text-brand-950 block">
              {formatCurrency(order.cm1)}
            </span>
            <span className="text-[10px] text-brand-700/80">Khấu trừ giá vốn MAC</span>
          </div>

          <div className={cn(
            'p-3.5 rounded-xl border shadow-2xs space-y-1',
            order.cm3 >= 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 block">Lãi Sau Ads CM3</span>
              <span className={cn(
                'badge text-[9px] font-bold px-1.5 py-0 border rounded',
                order.cm3 >= 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
              )}>
                {order.cm3 >= 0 ? 'LÃI RÒNG' : 'LỖ RÒNG'}
              </span>
            </div>
            <span className={cn(
              'text-lg font-bold block',
              order.cm3 >= 0 ? 'text-emerald-900' : 'text-rose-700'
            )}>
              {formatCurrency(order.cm3)}
            </span>
            <span className="text-[10px] text-slate-500">
              Biên CM3: {order.netRevenue > 0 ? `${((order.cm3 / order.netRevenue) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* 3. 10-Tier Waterfall Breakdown Flow */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Layers size={14} className="text-brand-600" />
              <span>Bóc Tách 10 Tầng Chi Phí Đơn Hàng (Unit Economics Waterfall)</span>
            </h3>
            <span className="text-[10px] text-slate-400">Đơn vị: VNĐ</span>
          </div>

          <div className="space-y-2">
            {/* Step 1: Gross Sales */}
            <div className="flex items-center justify-between py-1 text-slate-800">
              <span className="font-sans text-xs">1. Doanh thu gộp niêm yết (Gross Sales):</span>
              <span className="font-bold">{formatCurrency(order.grossSales)}</span>
            </div>

            {/* Step 2: Discounts */}
            <div className="flex items-center justify-between py-1 text-rose-600 bg-rose-50/40 px-2 rounded">
              <span className="font-sans text-xs">2. Giảm giá, Voucher sàn & Trợ giá shop:</span>
              <div className="text-right">
                <span className="font-bold">-{formatCurrency(order.discounts)}</span>
                {order.grossSales > 0 && order.discounts > 0 && (
                  <span className="text-[10px] text-rose-500 ml-1.5 font-sans">
                    ({((order.discounts / order.grossSales) * 100).toFixed(1)}% Gross)
                  </span>
                )}
              </div>
            </div>

            {/* Step 3: Net Revenue [Subtotal Milestone] */}
            <div className="flex items-center justify-between py-1.5 px-2 bg-slate-100/90 rounded border border-slate-200 text-slate-900 font-bold">
              <span className="font-sans text-xs flex items-center gap-1">
                <span>3. Doanh thu thuần nhận về (Net Revenue):</span>
              </span>
              <span className="text-sm">{formatCurrency(order.netRevenue)}</span>
            </div>

            {/* Step 4: COGS */}
            <div className="flex items-center justify-between py-1 text-slate-600 px-2">
              <span className="font-sans text-xs">4. Giá vốn hàng bán (COGS theo MAC):</span>
              <div className="text-right">
                <span className="font-bold text-rose-700">-{formatCurrency(order.cogs)}</span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-sans">({calcNetPct(order.cogs)})</span>
              </div>
            </div>

            {/* Step 5: CM1 [Milestone 1] */}
            <div className="flex items-center justify-between py-1.5 px-2 bg-brand-50/70 rounded border border-brand-200 text-brand-900 font-bold">
              <span className="font-sans text-xs">5. Lợi nhuận gộp sau COGS (Lãi CM1):</span>
              <div className="text-right">
                <span className="text-sm">{formatCurrency(order.cm1)}</span>
                <span className="text-[10px] text-brand-700 ml-1.5 font-sans">
                  ({order.netRevenue > 0 ? ((order.cm1 / order.netRevenue) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>

            {/* Step 6: Marketplace Fees */}
            <div className="flex items-center justify-between py-1 text-slate-600 px-2">
              <span className="font-sans text-xs">6. Phí hoa hồng sàn & Phí cố định TMĐT:</span>
              <div className="text-right">
                <span className="font-bold text-rose-700">-{formatCurrency(order.marketplaceFees)}</span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-sans">({calcNetPct(order.marketplaceFees)})</span>
              </div>
            </div>

            {/* Step 7: Fulfillment Costs */}
            <div className="flex items-center justify-between py-1 text-slate-600 px-2">
              <span className="font-sans text-xs">7. Chi phí đóng gói & Vật tư kho (WMS):</span>
              <div className="text-right">
                <span className="font-bold text-rose-700">-{formatCurrency(order.fulfillmentCosts)}</span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-sans">({calcNetPct(order.fulfillmentCosts)})</span>
              </div>
            </div>

            {!!order.compensation && <div className="flex justify-between px-2 text-teal-800 text-xs"><span>Bồi thường riêng, không phải doanh thu:</span><strong>+{formatCurrency(order.compensation)}</strong></div>}
            {/* Step 8: CM2 [Milestone 2] */}
            <div className="flex items-center justify-between py-1.5 px-2 bg-blue-50/70 rounded border border-blue-200 text-blue-900 font-bold">
              <span className="font-sans text-xs">8. Lợi nhuận đóng góp biến đổi (Lãi CM2):</span>
              <div className="text-right">
                <span className="text-sm">{formatCurrency(order.cm2)}</span>
                <span className="text-[10px] text-blue-700 ml-1.5 font-sans">
                  ({order.netRevenue > 0 ? ((order.cm2 / order.netRevenue) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>

            {/* Step 9: Attributed Marketing / Ads */}
            <div className="flex items-center justify-between py-1 text-slate-600 px-2">
              <span className="font-sans text-xs">9. Chi phí Quảng cáo & Marketing phân bổ:</span>
              <div className="text-right">
                <span className="font-bold text-rose-700">-{formatCurrency(order.attributedMarketingCosts)}</span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-sans">({calcNetPct(order.attributedMarketingCosts)})</span>
              </div>
            </div>

            {/* Step 10: CM3 [Final Milestone] */}
            <div className={cn(
              'flex items-center justify-between py-2 px-3 rounded-lg border font-extrabold',
              order.cm3 >= 0
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                : 'bg-rose-100 text-rose-950 border-rose-300'
            )}>
              <span className="font-sans text-xs">10. Lợi nhuận ròng cuối cùng sau Ads (Lãi CM3):</span>
              <div className="text-right">
                <span className="text-base">{formatCurrency(order.cm3)}</span>
                <span className="text-[11px] ml-2 font-sans font-semibold">
                  (Biên: {order.netRevenue > 0 ? ((order.cm3 / order.netRevenue) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. SKU Items Breakdown Table */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Boxes size={14} className="text-brand-600" />
              <span>Danh Mục Sản Phẩm Trong Đơn ({items.length} SKU)</span>
            </h3>
            <span className="text-[10px] text-slate-400">Đối chiếu giá bán & giá vốn từng SKU</span>
          </div>

          {items.length === 0 ? (
            <p className="text-center py-4 text-slate-400 text-xs">
              Chưa có dữ liệu dòng sản phẩm chi tiết cho đơn này.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[500px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase bg-slate-50">
                    <th className="py-2 px-2.5 text-left font-semibold">Mã SKU</th>
                    <th className="py-2 px-2 text-center font-semibold">SL</th>
                    <th className="py-2 px-2.5 text-right font-semibold">Giá Bán</th>
                    <th className="py-2 px-2.5 text-right font-semibold">Giá Vốn MAC</th>
                    <th className="py-2 px-2.5 text-right font-semibold">Lãi Gộp CM1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {items.map((it: any, i: number) => {
                    const unitCost = it.unit_cost_mac_snapshot || 200000;
                    const unitPrice = it.unit_price || 0;
                    const qty = it.quantity || 1;
                    const margin = (unitPrice - unitCost) * qty;
                    const marginPct = unitPrice > 0 ? ((unitPrice - unitCost) / unitPrice) * 100 : 0;

                    return (
                      <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-2.5 font-sans">
                          <button
                            onClick={() => {
                              onClose();
                              if (onNavigate) onNavigate('skuEconomics');
                            }}
                            className="badge bg-brand-50 text-brand-700 hover:bg-brand-100 border-brand-200 text-[10px] font-mono cursor-pointer inline-flex items-center gap-1"
                            title="Xem chi tiết lãi SKU Economics"
                          >
                            <span>{it.sku || 'SKU'}</span>
                            <ExternalLink size={9} />
                          </button>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-900">{qty}</td>
                        <td className="py-2.5 px-2.5 text-right">{formatCurrency(unitPrice)}</td>
                        <td className="py-2.5 px-2.5 text-right text-slate-500">{formatCurrency(unitCost)}</td>
                        <td className="py-2.5 px-2.5 text-right">
                          <span className={cn('font-bold', margin >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                            {formatCurrency(margin)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-sans">
                            ({marginPct.toFixed(0)}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
