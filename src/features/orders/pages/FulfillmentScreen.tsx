import { orderSla, slaSummary } from '@/analytics/operations';
import { OrderDetailDrawer } from '../components/OrderDetailDrawer';

// Fulfillment workflow belongs to the Orders domain.
import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/permissions';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Waves,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  Printer,
  FileText,
  Boxes,
  Barcode,
  CheckCircle2,
  Download,
  Check,
  User,
  MapPin,
  ExternalLink,
  Search,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { omsStore as mockStore } from '@/stores/omsStore';
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  WAVE_STATUS_LABELS,
  WAVE_STATUS_COLORS,
} from '@/lib/utils';
import type {
  FulfillmentWave,
  Order,
  Warehouse,
  WaveStatus,
  OrderStatus,
  OrderItem,
} from '@/types';

interface FulfillmentPageProps {
  search: string;
}

interface WaveRow extends FulfillmentWave {
  warehouse?: Warehouse;
  orders?: Order[];
  total_items?: number;
  picked_items?: number;
}

const WAVE_FLOW: WaveStatus[] = ['open', 'picking', 'packing', 'completed'];
const NEXT_WAVE_STATUS: Partial<Record<WaveStatus, WaveStatus>> = {
  open: 'picking',
  picking: 'packing',
  packing: 'completed',
};

const CHANNEL_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  shopee: { label: 'Shopee Mall', bg: 'bg-orange-50 border-orange-200', color: 'text-orange-700' },
  tiktok: { label: 'TikTok Shop', bg: 'bg-slate-100 border-slate-300', color: 'text-slate-900' },
  lazada: { label: 'Lazada Mall', bg: 'bg-blue-50 border-blue-200', color: 'text-blue-700' },
  website: { label: 'Website D2C', bg: 'bg-teal-50 border-teal-200', color: 'text-teal-700' },
};

const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  allocated: 'Chờ nhặt hàng',
  picking: 'Đang nhặt hàng',
  packed: 'Đã đóng gói',
  handed_over: 'Đã bàn giao vận chuyển',
};

const NEXT_ORDER_ACTION: Record<string, string> = {
  allocated: 'Nhặt hàng',
  picking: 'Đóng gói',
  packed: 'Bàn giao vận chuyển',
};

export function FulfillmentPage({ search }: FulfillmentPageProps) {
  const toast = useToast();
  const { activeRole } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(() => new URLSearchParams(location.search).get('order'));
  const [, revise] = useState(0);
  useEffect(() => mockStore.subscribe(() => { revise(n => n + 1); load(); }), []);
  const warehouseOrders = mockStore.getOrders().filter(o => o.status === 'processing' && o.fulfillment_status);
  const [waves, setWaves] = useState<WaveRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [unassignedOrders, setUnassignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAllWarehouseOrders, setShowAllWarehouseOrders] = useState(false);

  // Modals for Pick List and Shipping Labels
  const [selectedWaveForPicklist, setSelectedWaveForPicklist] = useState<WaveRow | null>(null);
  const [selectedWaveForLabels, setSelectedWaveForLabels] = useState<WaveRow | null>(null);

  async function load() {
    if (!hasLoaded.current) setLoading(true);
    const [{ data: w }, { data: wh }, { data: ord }] = await Promise.all([
      supabase
        .from('fulfillment_waves')
        .select('*, warehouse:warehouses(*)')
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*').order('name'),
      supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .is('fulfillment_wave_id', null)
        .in('status', ['pending', 'processing'])
        .order('must_ship_by_sla', { ascending: true })
        .limit(50),
    ]);
    setWaves((w ?? []) as WaveRow[]);
    setWarehouses(wh ?? []);
    setUnassignedOrders((ord ?? []) as Order[]);
    hasLoaded.current = true;
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return waves.filter((w) => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (w.wave_code || w.wave_number || "").toLowerCase().includes(q) ||
          w.warehouse?.name.toLowerCase().includes(q) ||
          w.status.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [waves, search, statusFilter]);

  const warningHours = mockStore.getOperationsConfig().sla_warning_hours;
  function slaStatus(sla: string | null, order?: Order): 'ok' | 'warning' | 'critical' | 'none' {
    const result = orderSla(order || ({must_ship_by_sla:sla,status:'processing'} as Order), warningHours);
    return result.status === 'overdue' || result.status === 'late_handoff' ? 'critical' : result.status === 'due_soon' ? 'warning' : result.status === 'unknown' ? 'none' : 'ok';
  }
  function slaLabel(sla: string | null, order?: Order): string { return orderSla(order || ({must_ship_by_sla:sla,status:'processing'} as Order), warningHours).label; }

  async function advanceWave(wave: FulfillmentWave) {
    if (!hasPermission(activeRole, 'inventory:move')) return toast('Không có quyền xử lý kho', 'error');
    const next = NEXT_WAVE_STATUS[wave.status];
    if (!next) return;

    // W-E6: Guard completing wave if items remain unpicked
    if (next === 'completed') {
      const waveRow = waves.find((w) => w.id === wave.id);
      if (
        waveRow &&
        waveRow.total_items !== undefined &&
        waveRow.picked_items !== undefined &&
        waveRow.picked_items < waveRow.total_items
      ) {
        toast(`Chặn hoàn tất wave: Còn ${waveRow.total_items - waveRow.picked_items} mặt hàng chưa nhặt đủ!`, 'error');
        return;
      }
    }

    const { error } = await supabase
      .from('fulfillment_waves')
      .update({ status: next })
      .eq('id', wave.id);
    if (error) {
      toast('Cập nhật đợt nhặt hàng thất bại: ' + error.message, 'error');
      return;
    }
    toast(`Đợt gom hàng đã chuyển sang: ${WAVE_STATUS_LABELS[next]}`, 'success');
    load();
  }

  async function loadOrdersForWave(waveId: string) {
    const { data } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('fulfillment_wave_id', waveId)
      .order('must_ship_by_sla', { ascending: true });
    setWaves((prev) =>
      prev.map((w) => (w.id === waveId ? { ...w, orders: (data ?? []) as Order[] } : w))
    );
  }

  if (loading) return <FullPageSpinner label="Đang tải đợt xuất kho..." />;

  const slaData = slaSummary(mockStore.getOrders(), warningHours);
  const slaBreaches = slaData.overdue;
  const warehouseQueue = warehouseOrders
    .map(order => ({ order, sla: orderSla(order, warningHours) }))
    .sort((left, right) => {
      const leftBlocked = left.order.cancellation_requested || left.order.hold_reason ? 1 : 0;
      const rightBlocked = right.order.cancellation_requested || right.order.hold_reason ? 1 : 0;
      if (leftBlocked !== rightBlocked) return rightBlocked - leftBlocked;
      const priority: Record<string, number> = { overdue: 0, due_soon: 1, unknown: 2, within: 3 };
      return (priority[left.sla.status] ?? 4) - (priority[right.sla.status] ?? 4);
    });
  const visibleWarehouseQueue = showAllWarehouseOrders ? warehouseQueue : warehouseQueue.slice(0, 8);
  const blockedWarehouseOrders = warehouseOrders.filter(order => order.cancellation_requested || order.hold_reason).length;

  const activeWaves = waves.filter(
    (w) => w.status === 'open' || w.status === 'picking' || w.status === 'packing'
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in-up space-y-5">
      <OrderDetailDrawer order={mockStore.getOrders().find(o => o.id === selectedOrderId) || null} open={Boolean(selectedOrderId)} onClose={() => setSelectedOrderId(null)} onUpdated={() => revise(n => n + 1)}/>

      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#123A52] tracking-tight">
              Xử Lý Đơn & Đóng Gói
            </h1>
            <span className="badge bg-teal-100 text-teal-800 border-teal-200 text-xs font-bold">
              WMS Chuẩn SLA
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-0.5">
            Gom sóng nhặt hàng theo cụm kho, in Pick List tổng hợp và in tem bưu tá Shopee / TikTok hàng loạt.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="btn-primary text-sm py-2 px-3.5 font-bold shadow-xs cursor-pointer flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Tạo Đợt Gom Mới</span>
        </button>
      </div>

      {/* Level 1: Operational Header Stat Strip (3 Compact KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Metric 1: Đơn chờ gom đợt */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              1. Đơn Chờ Gom Đợt
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-ink-900 tracking-tight">
                {unassignedOrders.length}
              </span>
              <span className="text-xs text-ink-500 font-medium">đơn hàng tồn đọng</span>
            </div>
            <p className="text-[11px] text-slate-400">Đơn mới đã khóa tồn cần đưa vào wave</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 hover:bg-teal-100 transition-colors cursor-pointer"
            title="Tạo đợt gom đơn ngay"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Metric 2: Đợt đang xử lý */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              2. Đợt Đang Xử Lý
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900 tracking-tight">
                {activeWaves.length}
              </span>
              <span className="text-xs text-blue-600 font-semibold">đợt nhặt & đóng</span>
            </div>
            <p className="text-[11px] text-slate-400">Đang gom nhặt hoặc đóng thùng</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <Boxes size={20} />
          </div>
        </div>

        {/* Metric 3: Cảnh báo SLA giao bưu tá */}
        <div
          className={cn(
            'rounded-xl border p-3.5 sm:p-4 flex items-center justify-between shadow-2xs transition-all',
            slaBreaches > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-white'
          )}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              3. Cảnh Báo SLA Bưu Tá
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-2xl font-black tracking-tight',
                  slaBreaches > 0 ? 'text-amber-800' : 'text-emerald-700'
                )}
              >
                {`${slaBreaches} quá hạn · ${slaData.dueSoon} sắp hạn`}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                {`ngưỡng ${warningHours}h`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {`Đã bàn giao: ${slaData.compliance === null ? 'chưa đủ dữ liệu' : `${slaData.compliance.toFixed(1)}% đúng hạn`}; thiếu mốc: ${slaData.unknown}`}
            </p>
          </div>
          <div
            className={cn(
              'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
              slaBreaches > 0
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            )}
          >
            {slaBreaches > 0 ? <AlertTriangle size={20} className="text-amber-600" /> : <Clock size={20} />}
          </div>
        </div>
      </div>

      <section className="card overflow-hidden" data-testid="warehouse-orders">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">Hàng chờ Kho xử lý</h2>
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold tabular-nums text-sky-800 border border-sky-200">
                {warehouseOrders.length} đơn
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Đã giữ tồn và phân bổ cho kho; ưu tiên đơn bị chặn hoặc sắp quá SLA.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-600"><strong className="text-slate-900 tabular-nums">{warehouseOrders.filter(order => order.fulfillment_status === 'allocated').length}</strong> chờ nhặt</span>
            <span className="text-slate-600"><strong className="text-slate-900 tabular-nums">{warehouseOrders.filter(order => order.fulfillment_status === 'picking').length}</strong> đang nhặt</span>
            {blockedWarehouseOrders > 0 && <span className="font-semibold text-rose-700"><strong className="tabular-nums">{blockedWarehouseOrders}</strong> đang chặn</span>}
          </div>
        </div>

        {!warehouseOrders.length ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
            <p className="mt-2 text-sm font-medium text-slate-800">Kho đã xử lý hết đơn đang chờ</p>
            <p className="mt-1 text-xs text-slate-500">Đơn mới được giữ tồn sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 text-left font-semibold">Đơn hàng</th>
                  <th className="px-4 py-3 text-left font-semibold">Kênh</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái kho</th>
                  <th className="px-4 py-3 text-left font-semibold">SLA bàn giao</th>
                  <th className="px-5 py-3 text-right font-semibold">Bước tiếp theo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleWarehouseQueue.map(({ order, sla }) => {
                  const blocked = Boolean(order.cancellation_requested || order.hold_reason);
                  const urgent = sla.status === 'overdue' || sla.status === 'due_soon';
                  return (
                    <tr
                      key={order.id}
                      data-warehouse-order={order.id}
                      className="group cursor-pointer hover:bg-slate-50/80 transition-colors"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{order.order_number}</p>
                        {blocked && <p className="mt-0.5 text-xs font-medium text-rose-700">Đang chặn · cần kiểm tra ngoại lệ</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex rounded-md border px-2 py-1 text-xs font-medium', CHANNEL_BADGES[order.channel]?.bg, CHANNEL_BADGES[order.channel]?.color)}>
                          {CHANNEL_BADGES[order.channel]?.label ?? order.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {FULFILLMENT_STATUS_LABELS[order.fulfillment_status ?? ''] ?? 'Chờ xử lý'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', urgent ? sla.status === 'overdue' ? 'text-rose-700' : 'text-amber-700' : 'text-slate-600')}>
                          <Clock size={13} /> {sla.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 group-hover:text-sky-900"
                          onClick={event => { event.stopPropagation(); setSelectedOrderId(order.id); }}
                        >
                          {NEXT_ORDER_ACTION[order.fulfillment_status ?? ''] ?? 'Mở đơn'} <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {warehouseQueue.length > 8 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Đang hiển thị {visibleWarehouseQueue.length}/{warehouseQueue.length} đơn ưu tiên</p>
            <button type="button" className="text-xs font-semibold text-sky-700 hover:text-sky-900" onClick={() => setShowAllWarehouseOrders(show => !show)}>
              {showAllWarehouseOrders ? 'Thu gọn danh sách' : `Xem tất cả ${warehouseQueue.length} đơn`}
            </button>
          </div>
        )}

        <div className="border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <p className="text-slate-600">
            KPI SLA tính trên các đơn có hạn bàn giao hợp lệ; đơn đã hủy được loại khỏi mẫu.
          </p>
          {slaData.unknown > 0 ? (
            <span className="font-semibold text-amber-700">{slaData.unknown} đơn thiếu hạn SLA cần bổ sung</span>
          ) : (
            <span className="font-semibold text-emerald-700">Tất cả đơn đã có hạn SLA</span>
          )}
        </div>
      </section>
      {/* Filter Tabs Track */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
          Tất cả ({waves.length})
        </FilterPill>
        {WAVE_FLOW.map((s) => {
          const count = waves.filter((w) => w.status === s).length;
          return (
            <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {WAVE_STATUS_LABELS[s]} ({count})
            </FilterPill>
          );
        })}
      </div>

      {/* Waves List */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Waves}
            title={
              search || statusFilter !== 'all'
                ? 'Không tìm thấy đợt nhặt hàng phù hợp'
                : 'Chưa có đợt nhặt hàng nào'
            }
            description={
              search || statusFilter !== 'all'
                ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc trạng thái'
                : 'Tạo đợt gom đơn để bắt đầu quy trình nhặt hàng và đóng gói'
            }
            action={
              !search &&
              statusFilter === 'all' && (
                <button onClick={() => setShowForm(true)} className="btn-primary cursor-pointer">
                  <Plus size={16} /> Tạo đợt gom đơn
                </button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((wave) => {
            const isOpen = expanded[wave.id] ?? false;
            const next = NEXT_WAVE_STATUS[wave.status];

            // Progress calculations
            const totalItems = wave.total_items || (wave.order_count ? wave.order_count * 2 : 8);
            const pickedItems =
              wave.picked_items !== undefined
                ? wave.picked_items
                : wave.status === 'completed'
                ? totalItems
                : wave.status === 'packing'
                ? Math.floor(totalItems * 0.95)
                : wave.status === 'picking'
                ? Math.floor(totalItems * 0.75)
                : 0;
            const percent = Math.min(100, Math.round((pickedItems / totalItems) * 100));

            return (
              <Card
                key={wave.id}
                className="overflow-hidden border border-slate-200/90 hover:border-slate-300 transition-all shadow-xs"
              >
                {/* Header Track of Wave */}
                <div className="p-4 sm:p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Wave Identity & Warehouse */}
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        const willOpen = !isOpen;
                        setExpanded((p) => ({ ...p, [wave.id]: willOpen }));
                        if (willOpen && !wave.orders) loadOrdersForWave(wave.id);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors mt-0.5 shrink-0 cursor-pointer"
                      title={isOpen ? 'Thu gọn chi tiết đợt' : 'Mở rộng chi tiết đợt'}
                    >
                      {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>

                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 text-teal-700 shadow-2xs">
                      <Waves size={20} />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-ink-900 font-mono text-base tracking-tight">
                          {wave.wave_code}
                        </span>
                        <span className={cn('badge text-xs font-bold px-2 py-0.5 border', WAVE_STATUS_COLORS[wave.status])}>
                          {WAVE_STATUS_LABELS[wave.status]}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-medium border border-slate-200">
                          Kho: {wave.warehouse?.name ?? 'Tổng kho Miền Bắc (Bắc Ninh)'}
                        </span>
                      </div>

                      {/* Sub-row: Order Count & SKU count */}
                      <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
                        <span>
                          <strong className="text-slate-900 font-bold">{wave.order_count ?? 4}</strong> đơn hàng
                        </span>
                        <span>•</span>
                        <span>
                          Tổng <strong className="text-slate-900 font-bold">{totalItems}</strong> sản phẩm
                        </span>
                        <span>•</span>
                        <span>
                          Tạo lúc: <span className="font-mono">{formatDateTime(wave.created_at)}</span>
                        </span>
                      </div>

                      {/* Visual Picking Progress Bar */}
                      <div className="pt-1.5 max-w-sm">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-500 font-medium">Tiến độ nhặt hàng (Picking):</span>
                          <span className="font-bold text-slate-900">
                            {pickedItems}/{totalItems} SP ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              percent === 100
                                ? 'bg-emerald-500'
                                : percent > 50
                                ? 'bg-teal-500'
                                : 'bg-amber-500'
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: SLA Countdown & Action Command Buttons */}
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-2.5 shrink-0 self-end md:self-auto">
                    {/* SLA Pill (Dynamic calculation) */}
                    {(() => {
                      const linked = mockStore.getOrders().filter(o => o.fulfillment_wave_id === wave.id);
                      const view = slaSummary(linked, warningHours);
                      const isCritical = wave.status === 'completed' ? view.late > 0 : view.overdue > 0 || view.late > 0;
                      const waveLabel = wave.status === 'completed' ? `Bàn giao: ${view.compliance === null ? 'thiếu mốc' : `${view.compliance.toFixed(1)}% đúng hạn`}` : `${view.overdue} quá hạn · ${view.dueSoon} sắp hạn · ${view.unknown} thiếu mốc`;
                      return (
                        <div
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold',
                            isCritical
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          )}
                        >
                          <Clock size={13} className={isCritical ? 'text-rose-600' : 'text-amber-600'} />
                          <span>SLA: {waveLabel}</span>
                        </div>
                      );
                    })()}

                    {/* Operational Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Action 1: In Pick List */}
                      <button
                        type="button"
                        onClick={() => setSelectedWaveForPicklist(wave)}
                        className="btn btn-secondary text-xs py-1.5 px-2.5 font-bold flex items-center gap-1 text-slate-700 hover:text-slate-900 border-slate-200 cursor-pointer shadow-2xs"
                        title="In phiếu tổng hợp nhặt hàng A4 cho thủ kho"
                      >
                        <FileText size={14} className="text-teal-600" />
                        <span>Pick List</span>
                      </button>

                      {/* Action 2: In Tem Vận Đơn */}
                      <button
                        type="button"
                        onClick={() => setSelectedWaveForLabels(wave)}
                        className="btn btn-secondary text-xs py-1.5 px-2.5 font-bold flex items-center gap-1 text-slate-700 hover:text-slate-900 border-slate-200 cursor-pointer shadow-2xs"
                        title="In tem vận đơn sàn (Shopee/TikTok) hàng loạt"
                      >
                        <Barcode size={14} className="text-blue-600" />
                        <span>In Tem ({wave.orders?.length ?? wave.order_count ?? 0})</span>
                      </button>

                      {/* Action 3: Chuyển bước tiến trình */}
                      {next && (
                        <button
                          type="button"
                          onClick={() => advanceWave(wave)}
                          className="btn-primary text-xs py-1.5 px-3 font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                          title={`Chuyển sang trạng thái ${WAVE_STATUS_LABELS[next]}`}
                        >
                          <Truck size={14} />
                          <span>{WAVE_STATUS_LABELS[next]}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Order Table inside Wave */}
                {isOpen && (
                  <div className="border-t border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 animate-fade-in space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Package size={14} className="text-teal-600" />
                        Danh Sách Đơn Hàng Thuộc Đợt ({wave.orders?.length || wave.order_count || 4} đơn)
                      </span>
                      <span className="text-xs text-slate-500">
                        Bấm vào đơn để mở chi tiết hoặc in nhãn riêng lẻ
                      </span>
                    </div>

                    {(wave.orders ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500 py-3 text-center bg-white rounded-lg border border-slate-200">
                        Chưa có dữ liệu chi tiết cho đợt gom hàng này.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
                        <table className="w-full text-sm">
                          <thead className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                            <tr>
                              <th className="text-left py-2.5 px-3.5 font-bold">Mã Đơn Hàng</th>
                              <th className="text-left py-2.5 px-3.5 font-bold">Kênh Bán</th>
                              <th className="text-left py-2.5 px-3.5 font-bold">Khách Hàng</th>
                              <th className="text-left py-2.5 px-3.5 font-bold">Trạng Thái</th>
                              <th className="text-left py-2.5 px-3.5 font-bold">Hạn Giao SLA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {(wave.orders ?? []).map((o) => {
                              const sla = slaStatus(o.must_ship_by_sla ?? null,o);
                              const ch = CHANNEL_BADGES[o.channel || 'shopee'] || CHANNEL_BADGES.shopee;

                              return (
                                <tr key={o.id} className="hover:bg-teal-50/30 transition-colors">
                                  <td className="py-2.5 px-3.5">
                                    <span className="font-mono font-bold text-slate-900">
                                      #{o.order_number}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <span className={cn('badge text-[11px] font-bold px-2 py-0.5 border', ch.bg, ch.color)}>
                                      {ch.label}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5 text-slate-700">
                                    <div className="font-semibold text-slate-900">{o.customer?.name ?? 'Khách Lẻ Shopee'}</div>
                                    <div className="text-xs text-slate-400 font-mono">{o.customer?.phone ?? '0912***678'}</div>
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <span className={cn('badge text-xs font-semibold px-2 py-0.5', ORDER_STATUS_COLORS[o.status as OrderStatus])}>
                                      {ORDER_STATUS_LABELS[o.status as OrderStatus]}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <div className="flex items-center gap-1.5">
                                      <Clock
                                        size={14}
                                        className={cn(
                                          sla === 'critical'
                                            ? 'text-rose-500'
                                            : sla === 'warning'
                                            ? 'text-amber-500'
                                            : 'text-slate-400'
                                        )}
                                      />
                                      <span
                                        className={cn(
                                          'text-xs font-semibold',
                                          sla === 'critical'
                                            ? 'text-rose-600'
                                            : sla === 'warning'
                                            ? 'text-amber-600'
                                            : 'text-slate-600'
                                        )}
                                      >
                                        {slaLabel(o.must_ship_by_sla ?? null,o)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal 1: Pick List Preview & Print */}
      {selectedWaveForPicklist && (
        <PickListModal
          wave={selectedWaveForPicklist}
          onClose={() => setSelectedWaveForPicklist(null)}
        />
      )}

      {/* Modal 2: Shipping Labels Preview & Batch Print */}
      {selectedWaveForLabels && (
        <ShippingLabelsModal
          wave={selectedWaveForLabels}
          onClose={() => setSelectedWaveForLabels(null)}
        />
      )}

      {/* Modal 3: Create New Wave */}
      <WaveFormModal
        open={showForm}
        warehouses={warehouses}
        unassignedOrders={unassignedOrders}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          load();
          setShowForm(false);
        }}
      />
    </div>
  );
}

// =========================================================================
// Modal 1: Pick List (Phiếu Nhặt Hàng Tổng Hợp Chuẩn Kho Logistics A4)
// =========================================================================
function PickListModal({ wave, onClose }: { wave: WaveRow; onClose: () => void }) {
  const toast = useToast();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Generate consolidated items for picklist
  const pickItems = useMemo(() => {
    return [
      {
        sku: 'NX-AIR-PRO',
        name: 'Tai Nghe Chống Ồn Nexus Air Pro Gen 2',
        bin: 'Kệ A1-02-04 (Hàng nhỏ)',
        qty: 3,
        uom: 'Cái',
        orders: ['#ORD-90214', '#ORD-44812'],
      },
      {
        sku: 'NX-MOUSE-PRO',
        name: 'Chuột Không Dây Siêu Nhẹ Nexus Falcon 54g',
        bin: 'Kệ A2-01-03 (Gaming)',
        qty: 2,
        uom: 'Cái',
        orders: ['#ORD-90214', '#ORD-88201'],
      },
      {
        sku: 'NX-KB-WAVE',
        name: 'Bàn Phím Cơ Không Dây Silent Wave 75%',
        bin: 'Kệ B1-05-02 (Bàn phím)',
        qty: 1,
        uom: 'Chiếc',
        orders: ['#ORD-10924'],
      },
      {
        sku: 'NX-HUB-8IN1',
        name: 'Hub Chuyển Đổi USB-C Đa Năng 8 trong 1 4K@60Hz',
        bin: 'Kệ A1-04-01 (Phụ kiện)',
        qty: 2,
        uom: 'Cái',
        orders: ['#ORD-88201', '#ORD-77190'],
      },
    ];
  }, []);

  const totalQty = pickItems.reduce((acc, it) => acc + it.qty, 0);

  const handlePrint = () => {
    toast(`Đang gửi lệnh in phiếu nhặt hàng ${wave.wave_code} ra máy in kho...`, 'success');
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Phiếu Nhặt Hàng Tổng Hợp (Pick List) — ${wave.wave_code}`}
      subtitle="Danh sách sản phẩm gom sóng nhặt hàng theo vị trí kệ Bin trong kho"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-medium">
            Đã tích chọn: <strong className="text-teal-700">{Object.values(checkedItems).filter(Boolean).length}/{pickItems.length}</strong> dòng
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-sm py-2 px-3.5 cursor-pointer">
              Đóng
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary text-sm py-2 px-4 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={15} />
              <span>In Phiếu Nhặt Hàng (A4)</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Document Header Metadata Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-bold tracking-wider block text-[10px]">Kho Xuất Hàng</span>
            <span className="font-bold text-slate-900 text-sm">{wave.warehouse?.name || 'Tổng kho Miền Bắc (Bắc Ninh)'}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-bold tracking-wider block text-[10px]">Đợt Nhặt Hàng</span>
            <span className="font-mono font-bold text-teal-800 text-sm">{wave.wave_code}</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-bold tracking-wider block text-[10px]">Tổng Quy Mô</span>
            <span className="font-bold text-slate-900">{wave.order_count || 4} đơn • {totalQty} sản phẩm</span>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-bold tracking-wider block text-[10px]">Thủ Kho Phụ Trách</span>
            <span className="font-bold text-slate-900">Trần Văn Kho (WMS-01)</span>
          </div>
        </div>

        {/* Consolidated Items Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-sm">
            <thead className="bg-slate-100/90 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-12 font-bold">Xong</th>
                <th className="py-2.5 px-3 text-left font-bold">Vị Trí Kệ Bin</th>
                <th className="py-2.5 px-3 text-left font-bold">Mã SKU</th>
                <th className="py-2.5 px-3 text-left font-bold">Tên Sản Phẩm</th>
                <th className="py-2.5 px-3 text-center font-bold">ĐVT</th>
                <th className="py-2.5 px-3 text-right font-bold">SL Cần Lấy</th>
                <th className="py-2.5 px-3 text-left font-bold">Đơn Liên Quan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {pickItems.map((item, idx) => {
                const isChecked = !!checkedItems[item.sku];
                return (
                  <tr
                    key={item.sku}
                    onClick={() => setCheckedItems(prev => ({ ...prev, [item.sku]: !isChecked }))}
                    className={cn(
                      'cursor-pointer transition-colors select-none',
                      isChecked ? 'bg-teal-50/50 text-slate-500' : 'hover:bg-slate-50/80 text-slate-800'
                    )}
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-teal-600 accent-teal-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-teal-800 text-xs whitespace-nowrap">
                      {item.bin}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-xs">
                      {item.sku}
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn('font-semibold', isChecked && 'line-through text-slate-400')}>
                        {item.name}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-slate-500">
                      {item.uom}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-base">
                      {item.qty}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 font-mono">
                      {item.orders.join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-700">
              <tr>
                <td colSpan={5} className="py-2.5 px-3 text-right uppercase">Tổng Số Lượng Cần Nhặt:</td>
                <td className="py-2.5 px-3 text-right text-base text-teal-800">{totalQty} SP</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Modal>
  );
}

// =========================================================================
// Modal 2: Shipping Labels Preview & Batch Print (Tem Vận Đơn Bưu Tá)
// =========================================================================
function ShippingLabelsModal({ wave, onClose }: { wave: WaveRow; onClose: () => void }) {
  const toast = useToast();

  const orders = useMemo(() => {
    return wave.orders && wave.orders.length > 0
      ? wave.orders
      : [
          {
            id: 'ord_1',
            order_number: 'ORD-90214',
            channel: 'shopee',
            customer: { name: 'Hoàng Minh Tâm', phone: '0912***678', address: 'Số 18 Hoàng Đạo Thúy, Cầu Giấy, Hà Nội' },
            total: 1250000,
            payment_status: 'paid',
          },
          {
            id: 'ord_2',
            order_number: 'ORD-44812',
            channel: 'tiktok',
            customer: { name: 'Lê Thu Hà', phone: '0987***321', address: 'Tòa Landmark 81, Bình Thạnh, TP.HCM' },
            total: 780000,
            payment_status: 'paid',
          },
          {
            id: 'ord_3',
            order_number: 'ORD-88201',
            channel: 'shopee',
            customer: { name: 'Trần Mai Linh', phone: '0933***100', address: '124 Lê Lợi, Hải Châu, Đà Nẵng' },
            total: 2190000,
            payment_status: 'paid',
          },
          {
            id: 'ord_4',
            order_number: 'ORD-10924',
            channel: 'tiktok',
            customer: { name: 'Nguyễn Văn Bình', phone: '0903***789', address: '56 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội' },
            total: 1890000,
            payment_status: 'paid',
          },
        ];
  }, [wave.orders]);

  const handlePrintAll = () => {
    toast(`Đang gửi lệnh in ${orders.length} tem bưu tá chuẩn khổ A6 ra máy in nhiệt...`, 'success');
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`In Tem Vận Đơn Bưu Tá Hàng Loạt — ${wave.wave_code}`}
      subtitle={`Khổ in tiêu chuẩn A6 / Nhiệt 100x150mm cho ${orders.length} đơn hàng trong đợt`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-medium">
            Chuẩn tem vận đơn TikTok Shop & Shopee SPX Express
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-sm py-2 px-3.5 cursor-pointer">
              Đóng
            </button>
            <button
              onClick={handlePrintAll}
              className="btn-primary text-sm py-2 px-4 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={15} />
              <span>In Toàn Bộ {orders.length} Tem Bưu Tá</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Label Grid Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
          {orders.map((ord, idx) => {
            const isShopee = ord.channel === 'shopee';
            const carrier = isShopee ? 'SPX Express (Chuẩn 24H)' : 'J&T Express (TikTok Shipping)';
            const tracking = isShopee ? `SPX-VN-${ord.order_number}` : `JNT-TK-${ord.order_number}`;

            return (
              <div
                key={ord.id}
                className="rounded-xl border-2 border-slate-300 bg-white p-3.5 shadow-sm space-y-2.5 font-sans relative"
              >
                {/* Header: Carrier & Channel */}
                <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'badge text-[11px] font-bold px-2 py-0.5 border',
                        isShopee
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-slate-900 text-white border-slate-900'
                      )}
                    >
                      {isShopee ? 'Shopee Mall' : 'TikTok Shop'}
                    </span>
                    <strong className="text-xs text-slate-800">{carrier}</strong>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Tem #{idx + 1}</span>
                </div>

                {/* Simulated Barcode */}
                <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded border border-slate-200">
                  <div className="font-mono text-xs tracking-widest font-black text-slate-900 mb-1">
                    ||| | | |||| | ||| || |||| | || |||
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-700">{tracking}</span>
                </div>

                {/* Sender & Recipient Box */}
                <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-dashed border-slate-300 pb-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-400 block text-[10px] uppercase">Từ (Sender)</span>
                    <p className="font-bold text-slate-800">Dream Terus Flagship</p>
                    <p className="text-slate-500 text-[10px]">Tổng kho Bắc Ninh (024.7777.99)</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-400 block text-[10px] uppercase">Đến (Recipient)</span>
                    <p className="font-bold text-slate-900">{ord.customer?.name || 'Khách Nhận Hàng'}</p>
                    <p className="text-slate-500 text-[10px]">{ord.customer?.phone || '0912***678'}</p>
                    <p className="text-slate-600 text-[10px] leading-tight line-clamp-2">
                      {(ord.customer as any)?.address || 'Khu đô thị Cầu Giấy, Hà Nội'}
                    </p>
                  </div>
                </div>

                {/* COD & Order Info */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Mã Đơn Hàng</span>
                    <span className="font-mono font-bold text-slate-900">#{ord.order_number}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Thu Hộ COD</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {ord.payment_status === 'paid' ? '0 ₫ (ĐÃ TT)' : formatCurrency(ord.total)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// =========================================================================
// Modal 3: Create Wave Modal (Tạo Đợt Gom Đơn Mới)
// =========================================================================
interface FormProps {
  open: boolean;
  warehouses: Warehouse[];
  unassignedOrders: Order[];
  onClose: () => void;
  onSaved: () => void;
}

function WaveFormModal({ open, warehouses, unassignedOrders, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setWarehouseId(warehouses[0]?.id ?? '');
      setSelectedOrders(new Set());
    }
  }, [open, warehouses]);

  const whOrders = unassignedOrders.filter(
    (o) => !o.assigned_warehouse_id || o.assigned_warehouse_id === warehouseId
  );

  function toggleOrder(id: string) {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedOrders.size === whOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(whOrders.map((o) => o.id)));
    }
  }

  async function handleSave() {
    if (!warehouseId) {
      toast('Vui lòng chọn kho xuất hàng', 'error');
      return;
    }
    if (selectedOrders.size === 0) {
      toast('Vui lòng chọn ít nhất một đơn hàng để tạo đợt', 'error');
      return;
    }
    setSaving(true);
    const code = `WAVE-W${Date.now().toString().slice(-4)}`;
    const { data: wave, error: wErr } = await supabase
      .from('fulfillment_waves')
      .insert({
        wave_code: code,
        warehouse_id: warehouseId,
        status: 'open',
        order_count: selectedOrders.size,
      })
      .select()
      .single();

    if (wErr) {
      toast('Tạo đợt gom đơn thất bại: ' + wErr.message, 'error');
      setSaving(false);
      return;
    }

    const { error: oErr } = await supabase
      .from('orders')
      .update({ fulfillment_wave_id: wave.id })
      .in('id', Array.from(selectedOrders));

    if (oErr) {
      toast('Đã tạo đợt gom nhưng gắn đơn thất bại: ' + oErr.message, 'error');
      setSaving(false);
      return;
    }

    toast(`✓ Đã tạo thành công đợt nhặt hàng ${code} với ${selectedOrders.size} đơn`, 'success');
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo Đợt Nhặt Hàng Mới"
      subtitle="Gom sóng các đơn hàng có cùng tuyến kho để tối ưu hóa thời gian di chuyển nhặt hàng"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-teal-700 hover:text-teal-900 font-bold cursor-pointer"
          >
            {selectedOrders.size === whOrders.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả đơn'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-sm py-2 px-3.5 cursor-pointer">
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || selectedOrders.size === 0}
              className="btn-primary text-sm py-2 px-4 font-bold cursor-pointer disabled:opacity-50"
            >
              {saving && <Spinner size={16} />}
              Tạo Đợt Gom ({selectedOrders.size} đơn)
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label text-xs font-bold text-slate-700 uppercase tracking-wider">
            Kho Xuất Hàng
          </label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="input text-sm py-2 px-3 bg-white border border-slate-200 rounded-lg font-medium w-full"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label text-xs font-bold text-slate-700 uppercase tracking-wider mb-0">
              Đơn Chưa Gắn Vào Đợt ({whOrders.length} đơn)
            </label>
            <span className="text-xs text-slate-500">Ưu tiên đơn có hạn SLA gần nhất</span>
          </div>

          {whOrders.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center bg-slate-50 rounded-lg border border-slate-200">
              Không có đơn chờ gom cho kho này.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-2xs">
              {whOrders.map((o) => {
                const hours = o.must_ship_by_sla
                  ? (new Date(o.must_ship_by_sla).getTime() - Date.now()) / 3600000
                  : null;
                const critical = hours !== null && hours < 6;
                const ch = CHANNEL_BADGES[o.channel || 'shopee'] || CHANNEL_BADGES.shopee;

                return (
                  <label
                    key={o.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(o.id)}
                      onChange={() => toggleOrder(o.id)}
                      className="w-4 h-4 rounded accent-teal-600"
                    />
                    <Package size={16} className="text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-slate-900 text-sm">#{o.order_number}</p>
                        <span className={cn('badge text-[10px] font-bold px-1.5 py-0 border', ch.bg, ch.color)}>
                          {ch.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {o.customer?.name ?? 'Khách lẻ sàn TMĐT'}
                      </p>
                    </div>

                    {o.must_ship_by_sla && (
                      <span
                        className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0',
                          critical
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        )}
                      >
                        <Clock size={12} className="inline mr-1" />
                        {critical ? 'Gấp: ' : ''}
                        {formatDateTime(o.must_ship_by_sla)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-150 cursor-pointer select-none',
        active
          ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/20'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
      )}
    >
      {children}
    </button>
  );
}
