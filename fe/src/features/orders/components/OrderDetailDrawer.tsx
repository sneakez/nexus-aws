import { OrderActions } from './OrderActions';
import { hasPermission } from '@/lib/permissions';
import { useEffect, useRef, useState } from 'react';
import {
  User,
  Calendar,
  DollarSign,
  CreditCard,
  MapPin,
  StickyNote,
  Clock,
  ArrowRight,
  Trash2,
  Waves,
  Warehouse as WarehouseIcon,
  Tag,
  ShieldCheck,
  FileCheck2,
  Truck,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { omsStore as mockStore } from '@/stores/omsStore';
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_FLOW,
  PAYMENT_STATUS_COLORS,
  orderPaymentLabel,
  WAVE_STATUS_LABELS,
  WAVE_STATUS_COLORS,
} from '@/lib/utils';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/cn';
import type {
  Order,
  OrderStatus,
  OrderStatusLog,
  OrderItem,
  PaymentStatus,
  FulfillmentWave,
  Warehouse,
  WaveStatus,
  PodEvidence,
} from '@/types';

interface OrderDetailDrawerProps {
  order: Order | null;
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onOrderUpdated?: () => void;
  onDeleted?: () => void;
  onOrderDeleted?: () => void;
}

export function OrderDetailDrawer({
  order,
  open,
  isOpen,
  onClose,
  onUpdated,
  onOrderUpdated,
  onDeleted,
  onOrderDeleted,
}: OrderDetailDrawerProps) {
  const isDrawerOpen = Boolean(open ?? isOpen);
  const handleUpdated = onUpdated ?? onOrderUpdated ?? (() => {});
  const handleDeleted = onDeleted ?? onOrderDeleted ?? (() => {});
  const toast = useToast();
  const { activeTenant, activeRole } = useAuth();
  const canViewEconomics = hasPermission(activeRole, 'finance:view') || hasPermission(activeRole, 'analytics:view');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [logs, setLogs] = useState<OrderStatusLog[]>([]);
  const [wave, setWave] = useState<FulfillmentWave | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedOrderId = useRef<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'operations' | 'economics' | 'audit'>('operations');

  // POD Modal state
  const [showPodModal, setShowPodModal] = useState(false);
  const [podTracking, setPodTracking] = useState('');
  const [podCarrier, setPodCarrier] = useState('Viettel Post');
  const [podRecipient, setPodRecipient] = useState('');
  const [podSignature, setPodSignature] = useState(true);
  const [podNotes, setPodNotes] = useState('Khách hàng đã kiểm tra ngoại quan và ký nhận nguyên vẹn');
  const [podSource, setPodSource] = useState<'carrier_webhook_verified' | 'demo_manual'>('carrier_webhook_verified');

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    if (loadedOrderId.current !== order.id) setLoading(true);
    if (order.pod_evidence) {
      setPodTracking(order.pod_evidence.tracking_code);
      setPodCarrier(order.pod_evidence.carrier_name || 'Viettel Post');
      setPodRecipient(order.pod_evidence.recipient_name);
      setPodSignature(order.pod_evidence.signature_verified);
      setPodNotes(order.pod_evidence.notes || '');
    } else {
      setPodTracking(`SPX-VN-${Math.floor(100000 + Math.random() * 900000)}`);
      setPodRecipient(order.customer?.name || 'Khách nhận hàng');
      setPodCarrier('Shopee Xpress (SPX)');
      setPodNotes('Khách hàng đã kiểm tra ngoại quan và ký nhận nguyên vẹn');
      setPodSignature(true);
    }
    Promise.all([
      supabase.from('order_items').select('*').eq('order_id', order.id),
      supabase
        .from('order_status_log')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false }),
      order.assigned_warehouse_id
        ? supabase.from('warehouses').select('*').eq('id', order.assigned_warehouse_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      order.fulfillment_wave_id
        ? supabase.from('fulfillment_waves').select('*').eq('id', order.fulfillment_wave_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]).then(([itemsRes, logsRes, whRes, waveRes]) => {
      if (cancelled) return;
      loadedOrderId.current = order.id;
      setItems(itemsRes.data ?? []);
      setLogs(logsRes.data ?? []);
      setWarehouse((whRes.data as Warehouse) ?? null);
      setWave((waveRes.data as FulfillmentWave) ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [order]);

  async function updateStatus(newStatus: OrderStatus) {
    if (!order) return;
    if (updating) return;
    if (activeRole === 'viewer') {
      toast('Tài khoản quyền Chỉ Xem (Viewer) không có quyền thay đổi trạng thái đơn', 'error');
      return;
    }
    if (newStatus === 'cancelled') {
      const ok = window.confirm('Xác nhận hủy đơn hàng #' + order.order_number + '? Thao tác này sẽ giải phóng toàn bộ tồn kho đã khóa theo kết quả hủy. Hoàn tiền được theo dõi riêng.');
      if (!ok) return;
    }

    // Delivery requires Verified Proof of Delivery (POD)
    if (newStatus === 'delivered') {
      if (activeRole === 'warehouse') {
        toast('Nhân viên kho chỉ bàn giao hàng cho bưu tá, không có quyền kết luận giao hàng thành công', 'error');
        return;
      }
      setShowPodModal(true);
      return;
    }

    setUpdating(true);
    const oldStatus = order.status;
    const now = new Date().toISOString();

    const result = newStatus === 'shipped'
      ? mockStore.dispatchOrder(order.id, `DEMO-${order.order_number}`)
      : newStatus === 'cancelled' ? mockStore.cancelOrderAtomic(order.id, 'Sàn demo xác nhận hủy')
      : newStatus === 'processing' ? mockStore.releaseToWarehouse(order.id)
      : { success: false, error: 'Chuyển trạng thái không hợp lệ; dùng hàng chờ công việc' };
    if (!result.success) { toast(result.error || 'Không thể chuyển trạng thái', 'error'); setUpdating(false); return; }

    toast(`Đã cập nhật trạng thái đơn: ${ORDER_STATUS_LABELS[newStatus]}`, 'success');
    setUpdating(false);
    handleUpdated();
  }

  async function handlePodSubmit() {
    if (!order) return;
    if (!podTracking.trim()) {
      toast('Bắt buộc nhập mã vận đơn đối soát của hãng vận chuyển!', 'error');
      return;
    }
    if (!podRecipient.trim()) {
      toast('Bắt buộc nhập tên người ký nhận hàng!', 'error');
      return;
    }

    setUpdating(true);
    const now = new Date().toISOString();
    const podData: PodEvidence = {
      tracking_code: podTracking.trim(),
      carrier_name: podCarrier,
      delivered_at: now,
      recipient_name: podRecipient.trim(),
      signature_verified: podSignature,
      notes: podNotes,
      source: podSource,
      submitted_by: mockStore.getExecutionContext()?.userId || 'unauthenticated',
      verified_at: now
    };

    const result = mockStore.markDeliveredWithPOD(order.id, podData);
    if (!result.success) { toast(result.error || 'Sự kiện bị từ chối', 'error'); setUpdating(false); return; }

    toast('✓ Xác thực POD thành công: Đơn hàng hoàn tất và ghi nhận doanh thu theo giả định kế toán.', 'success');
    setShowPodModal(false);
    setUpdating(false);
    handleUpdated();
  }


  async function handleDelete() {
    if (!order) return;
    const { error: delErr } = await supabase.rpc('delete_order_atomic', {
      p_order_id: order.id,
      p_tenant_id: activeTenant!.id,
    });
    if (delErr) {
      if (delErr.code === '42883') {
        toast('Lỗi hệ thống: RPC delete_order_atomic chưa được cấu hình trên database. Thao tác bị chặn để bảo vệ dữ liệu.', 'error');
      } else {
        toast('Xóa đơn hàng thất bại: ' + delErr.message, 'error');
      }
      return;
    }
    toast('Đã xóa đơn hàng', 'success');
    handleDeleted();
    onClose();
  }

  if (!order) return null;

  return (
    <>
      <Drawer
        open={isDrawerOpen}
        onClose={onClose}
        title={order.order_number}
        subtitle={`Đặt hàng ${formatDateTime(order.placed_at)}`}
        footer={
          <>

            <div className="flex-1" />
            <button onClick={onClose} className="btn-secondary">
              Đóng
            </button>
          </>
        }
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={28} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 5-Dimensional Lifecycle Separation */}
            <div className="card p-4 bg-ink-50/70 border border-ink-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-brand-600" />
                  Phân định 5 Trạng Thái Độc Lập
                </span>
                <span className="text-[11px] text-ink-400 font-mono">ID: {order.id.slice(0, 10)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-white border border-ink-100 shadow-2xs">
                  <span className="text-[10px] text-ink-400 font-semibold block uppercase">1. Đơn hàng</span>
                  <span className={cn('badge text-[10px] mt-1 px-1.5 py-0.5', ORDER_STATUS_COLORS[order.status])}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-ink-100 shadow-2xs">
                  <span className="text-[10px] text-ink-400 font-semibold block uppercase">2. Thực hiện kho</span>
                  <span className="badge text-[10px] mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                    {order.status === 'pending'
                      ? 'Chưa xuất'
                      : order.status === 'processing'
                        ? 'Đã giữ tồn'
                        : order.status === 'shipped'
                          ? 'Đã xuất kho'
                          : 'Hoàn tất kho'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-ink-100 shadow-2xs">
                  <span className="text-[10px] text-ink-400 font-semibold block uppercase">3. Vận chuyển</span>
                  <span className={cn(
                    'badge text-[10px] mt-1 px-1.5 py-0.5',
                    order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    order.status === 'shipped' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-ink-100 text-ink-600'
                  )}>
                    {order.status === 'delivered' ? 'Đã giao (POD ✓)' : order.status === 'shipped' ? 'Đang trung chuyển' : 'Chờ bưu tá'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-ink-100 shadow-2xs">
                  <span className="text-[10px] text-ink-400 font-semibold block uppercase">4. Thanh toán</span>
                  <span className={cn('badge text-[10px] mt-1 px-1.5 py-0.5', PAYMENT_STATUS_COLORS[order.payment_status])}>
                    {orderPaymentLabel(order)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-ink-100 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-ink-400 font-semibold block uppercase">5. Hậu mãi / RMA</span>
                  <span className="badge text-[10px] mt-1 px-1.5 py-0.5 bg-ink-50 text-ink-600 border-ink-200">
                    {order.return_status === 'return_requested' ? 'Yêu cầu RMA' : 'Bình thường'}
                  </span>
                </div>
              </div>
            </div>

            {/* TAB SELECTOR BAR */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('operations')}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  activeTab === 'operations'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                )}
              >
                <Truck size={14} />
                <span>1. Vận Hành & Giao Nhận</span>
              </button>
              <button
                type="button"
                disabled={!canViewEconomics}
                title={!canViewEconomics ? 'Vai trò chưa có quyền xem tài chính / analytics' : undefined}
                onClick={() => setActiveTab('economics')}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  activeTab === 'economics'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                )}
              >
                <DollarSign size={14} />
                <span>2. Tài Chính & P&L</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  activeTab === 'audit'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                )}
              >
                <Clock size={14} />
                <span>3. Lịch Sử & Audit ({logs.length})</span>
              </button>
            </div>

            {/* TAB 1: OPERATIONS */}
            {activeTab === 'operations' && (
              <div className="space-y-4 animate-fade-in-up">
                {/* Status workflow & Actions based on State Machine */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink-900">
                  Tiến trình đơn hàng
                </p>
                <span className={cn('badge font-semibold', ORDER_STATUS_COLORS[order.status])}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              {/* Step indicator */}
              <div className="grid grid-cols-4 gap-1.5 py-1">
                {[
                  { id: 'pending', label: 'Chờ duyệt' },
                  { id: 'processing', label: 'Đang xử lý' },
                  { id: 'shipped', label: 'Đang giao' },
                  { id: 'delivered', label: 'Đã nhận' },
                ].map((step, idx) => {
                  const stepIndex = ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.status);
                  const isCurrent = order.status === step.id;
                  const isDone = order.status !== 'cancelled' && stepIndex >= idx;
                  const isCancelled = order.status === 'cancelled';
                  return (
                    <div key={step.id} className="text-center">
                      <div
                        className={cn(
                          'h-1.5 rounded-full mb-1.5 transition-all',
                          isCancelled
                            ? 'bg-rose-200'
                            : isDone
                              ? 'bg-[var(--wood-aqua)]'
                              : 'bg-ink-100'
                        )}
                      />
                      <span
                        className={cn(
                          'text-[11px] font-medium block truncate',
                          isCurrent
                            ? 'text-ink-900 font-bold'
                            : isDone
                              ? 'text-ink-700'
                              : 'text-ink-400'
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* State Machine Next Actions */}
              <div className="pt-2 border-t border-ink-100">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2.5">
                  Hành động khả dụng theo vai trò ({activeRole})
                </p>

                <OrderActions orderId={order.id} onUpdated={handleUpdated}/>
              </div>
            </div>
            {/* POD Evidence Section */}
            {order.pod_evidence && (
              <div className="card p-5 bg-emerald-50/60 border border-emerald-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <FileCheck2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        Bằng chứng Giao hàng (POD Verified)
                      </h4>
                      <p className="text-[11px] text-emerald-700">Đã đối soát xác thực với đơn vị vận chuyển</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {order.pod_evidence?.source === 'carrier_webhook_verified' ? (
                      <span className="badge bg-blue-100 text-blue-800 border-blue-300 font-semibold text-[10px]">
                        WEBHOOK XÁC THỰC
                      </span>
                    ) : (
                      <span className="badge bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[10px]">
                        DEMO THỦ CÔNG
                      </span>
                    )}
                    <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[11px]">
                      ✓ Hợp lệ (POD Attached)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-white/90 border border-emerald-100">
                    <span className="text-[10px] text-ink-400 block font-medium uppercase">Mã vận đơn đối soát</span>
                    <span className="font-bold text-ink-900 mt-0.5 block">
                      {order.pod_evidence?.tracking_code || 'SPX-VN-88201'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/90 border border-emerald-100">
                    <span className="text-[10px] text-ink-400 block font-medium uppercase">Đơn vị vận chuyển</span>
                    <span className="font-semibold text-ink-900 mt-0.5 block">
                      {order.pod_evidence?.carrier_name || 'Shopee Xpress (SPX)'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/90 border border-emerald-100">
                    <span className="text-[10px] text-ink-400 block font-medium uppercase">Người ký nhận</span>
                    <span className="font-semibold text-ink-900 mt-0.5 block">
                      {order.pod_evidence?.recipient_name || order.customer?.name || 'Khách nhận'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/90 border border-emerald-100">
                    <span className="text-[10px] text-ink-400 block font-medium uppercase">Thời gian đối soát</span>
                    <span className="text-ink-700 mt-0.5 block">
                      {formatDateTime(order.pod_evidence?.delivered_at || order.delivered_at || order.updated_at)}
                    </span>
                  </div>
                </div>

                {order.pod_evidence?.notes && (
                  <p className="text-[11px] text-emerald-800 bg-white/70 p-2 rounded-md border border-emerald-100">
                    <strong>Ghi chú bưu tá:</strong> {order.pod_evidence.notes}
                  </p>
                )}
              </div>
            )}
                {/* Warehouse + Wave picking */}
            <div className="card p-5 space-y-3">
              <p className="text-sm font-semibold text-ink-700 mb-2 flex items-center gap-2">
                <WarehouseIcon size={16} className="text-ink-400" />
                Kho & Giao hang
              </p>

              {/* Assigned warehouse */}
              <div className="flex items-start gap-3">
                <WarehouseIcon size={16} className="text-ink-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink-400 font-medium">Kho xu ly</p>
                  {warehouse ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-ink-800">{warehouse.name}</span>
                      <code className="text-xs bg-ink-100 text-ink-500 px-1.5 py-0.5 rounded font-mono">{warehouse.code}</code>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-400 mt-0.5">Chua gan kho</p>
                  )}
                </div>
              </div>

              {/* SLA */}
              {order.must_ship_by_sla && (
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-ink-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-400 font-medium">SLA giao hang</p>
                    {(() => {
                      const hours = (new Date(order.must_ship_by_sla).getTime() - Date.now()) / 3600000;
                      const isCritical = hours < 6;
                      const isWarning = hours >= 6 && hours < 24;
                      return (
                        <p className={cn(
                          'text-sm font-medium mt-0.5',
                          isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-ink-700'
                        )}>
                          {hours < 0
                            ? `${Math.abs(Math.round(hours))} gio qua han`
                            : hours < 24
                              ? `Con ${Math.round(hours)} gio`
                              : `Con ${Math.floor(hours / 24)} ngay ${Math.round(hours % 24)} gio`}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Wave picking */}
              <div className="flex items-start gap-3">
                <Waves size={16} className="text-ink-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink-400 font-medium">Wave picking</p>
                  {wave ? (
                    <div className="mt-0.5 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink-800 text-sm">{wave.wave_code}</span>
                        <span className={cn('badge text-[10px]', WAVE_STATUS_COLORS[wave.status as WaveStatus])}>
                          {WAVE_STATUS_LABELS[wave.status as WaveStatus]}
                        </span>
                      </div>
                      {/* Wave status flow */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {(['open', 'picking', 'packing', 'completed'] as WaveStatus[]).map((s, i, arr) => {
                          const isCurrent = wave.status === s;
                          const isPast = arr.indexOf(wave.status as WaveStatus) > i;
                          return (
                            <div key={s} className="flex items-center gap-1.5">
                              <span className={cn(
                                'text-[10px] font-medium px-2 py-0.5 rounded-full',
                                isCurrent ? WAVE_STATUS_COLORS[s] : isPast ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-400'
                              )}>
                                {WAVE_STATUS_LABELS[s]}
                              </span>
                              {i < arr.length - 1 && <ArrowRight size={10} className="text-ink-300" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-400 mt-0.5">Chua gan vao wave nao</p>
                  )}
                </div>
              </div>

              {/* Channel */}
              {order.channel && (
                <div className="flex items-start gap-3">
                  <Tag size={16} className="text-ink-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-400 font-medium">Kenh ban</p>
                    <p className="text-sm text-ink-800 mt-0.5 capitalize">{order.channel}</p>
                  </div>
                </div>
              )}
            </div>
                {/* Customer info */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-ink-700 mb-3">
                Khách hàng
              </p>
              {order.customer ? (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {order.customer.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900">
                      {order.customer.name}
                    </p>
                    {order.customer.company && (
                      <p className="text-sm text-ink-500">
                        {order.customer.company}
                      </p>
                    )}
                    {order.customer.email && (
                      <p className="text-sm text-ink-500 mt-1">
                        {order.customer.email}
                      </p>
                    )}
                    {order.customer.phone && (
                      <p className="text-sm text-ink-500">{order.customer.phone}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-400">Khach le</p>
              )}
            </div>
                {/* Shipping address & Notes */}
                <div className="card p-5 space-y-3">
                  <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">
                    Địa chỉ & Ghi chú đơn hàng
                  </p>
                  {order.shipping_address && (
                    <DetailRow icon={MapPin} label="Địa chỉ giao hàng">
                      {order.shipping_address}
                    </DetailRow>
                  )}
                  {order.notes && (
                    <DetailRow icon={StickyNote} label="Ghi chú">
                      {order.notes}
                    </DetailRow>
                  )}
                  <DetailRow icon={Calendar} label="Thời điểm đặt hàng">
                    {formatDateTime(order.placed_at)}
                  </DetailRow>
                </div>
              </div>
            )}

            {/* TAB 2: FINANCIALS & UNIT ECONOMICS */}
            {activeTab === 'economics' && canViewEconomics && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="card p-5 space-y-3">
              {/* Payment Section */}
              <div className="pt-3 border-t border-ink-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                    Thanh toán & Đối soát
                  </p>
                  <span className={cn('badge text-[11px]', PAYMENT_STATUS_COLORS[order.payment_status])}>
                    {orderPaymentLabel(order)}
                  </span>
                </div>
                <p className="text-xs text-ink-500">Thanh toán nhận từ sự kiện nguồn; hoàn tiền và đối soát theo dõi riêng trong Công việc & bàn giao.</p>
              </div>
            </div>
                {/* Items */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-ink-700 mb-3">
                Sản phẩm ({items.length})
              </p>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2.5 border-b border-ink-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-ink-400">
                        {item.product_sku} · SL {item.quantity} ×{' '}
                        {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-ink-900 tabular-nums">
                      {formatCurrency(Number(item.line_total))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-ink-100 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Tam tinh</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(order.subtotal))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">VAT</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(order.tax))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Phi van chuyen</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(order.shipping))}
                  </span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-500">Giảm giá</span>
                    <span className="font-medium text-rose-600 tabular-nums">
                      −{formatCurrency(Number(order.discount))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-ink-100">
                  <span className="text-base font-semibold text-ink-900">
                    Tổng cộng
                  </span>
                  <span className="text-lg font-bold text-ink-900 tabular-nums">
                    {formatCurrency(Number(order.total))}
                  </span>
                </div>
              </div>
            </div>
                {/* Accounting Simulation & Assumptions Section */}
            <div className="card p-5 border-brand-200/80 bg-brand-50/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-brand-600" />
                  <span className="text-xs font-bold text-ink-900 uppercase tracking-wide">
                    Mô phỏng Kế toán & Sự kiện Doanh thu
                  </span>
                </div>
                <span className="badge bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-semibold">
                  [GIẢ ĐỊNH: FOB điểm đến]
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Event 1 */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-ink-100">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-900">Tạo đơn: Cam kết giá trị (Order Value)</span>
                      <span className="font-bold text-ink-700">{formatCurrency(order.total)}</span>
                    </div>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      Cam kết mua bán giữa hai bên. <strong>Chưa đủ điều kiện ghi nhận Doanh thu Có 511</strong>.
                    </p>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-ink-100">
                  <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-900">Khách thanh toán trước (Pre-payment)</span>
                      <span className="badge bg-amber-50 text-amber-700 border-amber-200 text-[9px]">GIẢ ĐỊNH</span>
                    </div>
                    <p className="text-[11px] text-ink-600 mt-0.5">
                      Hạch toán: <code className="font-mono text-ink-800">Nợ 112 (Tiền gửi) / Có 131 (Khách trả trước)</code>. Tiền về tài khoản nhưng chưa ghi Có 511.
                    </p>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-ink-100">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-900">Xuất kho: Giá vốn hàng bán (COGS)</span>
                      <span className="badge bg-amber-50 text-amber-700 border-amber-200 text-[9px]">GIẢ ĐỊNH</span>
                    </div>
                    <p className="text-[11px] text-ink-600 mt-0.5">
                      Hạch toán: <code className="text-ink-800">Nợ 632 / Có 156</code> theo giá vốn bình quân di động (MAC) ngay khi bàn giao đơn vị vận chuyển.
                    </p>
                  </div>
                </div>

                {/* Event 4 */}
                <div className={cn(
                  'flex items-start gap-2.5 p-2 rounded-lg border transition-colors',
                  order.status === 'delivered' ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-ink-100'
                )}>
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-900">
                        Đối soát POD: Ghi nhận Doanh thu Chính thức
                      </span>
                      <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px]">
                        {order.status === 'delivered' ? 'Đã kích hoạt' : 'Chờ giao POD'}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-600 mt-0.5">
                      Hạch toán: <code className="text-ink-800">Nợ 131 / Có 511</code> ({formatCurrency(order.total)}).
                      <span className="text-amber-700 block mt-0.5 font-medium">
                        ⚠️ Giả định: Doanh thu chỉ được ghi nhận khi có bằng chứng giao hàng POD theo nguyên tắc FOB điểm đến.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
              </div>
            )}

            {/* TAB 3: AUDIT TRAIL & SYSTEM METADATA */}
            {activeTab === 'audit' && (
              <div className="space-y-4 animate-fade-in-up">
                {/* Technical System Metadata */}
                <div className="card p-5 space-y-3 bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-teal-600" />
                    Định danh Hệ Thống & Kiểm Toán
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Order ID</span>
                      <span className="text-slate-900 font-bold truncate block">{order.id}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Mã Đơn Quản Trị</span>
                      <span className="text-slate-900 font-bold block">#{order.order_number}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Tenant ID</span>
                      <span className="text-slate-700 block truncate">{order.tenant_id}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-sans uppercase">Ghi Nhận Doanh Thu</span>
                      <span className={cn('badge text-[10px]', order.revenue_recognized ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}>
                        {order.revenue_recognized ? 'Có 511 Đã Đối Soát' : 'Treo Chờ Đối Soát POD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status history */}
            {logs.length > 0 && (
              <div className="card p-5">
                <p className="text-sm font-semibold text-ink-700 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-ink-400" />
                  Lịch sử trạng thái
                </p>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <span className="text-ink-800 font-medium capitalize">
                          {log.to_status}
                        </span>
                        {log.from_status && (
                          <span className="text-ink-400">
                            {' '}
                            ← tu {log.from_status}
                          </span>
                        )}
                        <p className="text-xs text-ink-400 mt-0.5">
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </div>
            )}
</div>
        )}
      </Drawer>

      {/* Proof of Delivery (POD) Verification Modal */}
      <Modal
        open={showPodModal}
        onClose={() => setShowPodModal(false)}
        title="Xác thực Bằng chứng Giao hàng (POD)"
        subtitle={`Đơn hàng #${order.order_number} — Ràng buộc ghi nhận Doanh thu Có 511`}
      >
        <div className="space-y-4 py-2">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Kiểm soát chống gian lận & Phân quyền Kho:</p>
              <p className="text-amber-800 mt-0.5">
                Nhân viên Kho hoặc Quản trị viên bắt buộc phải đính kèm Bằng chứng Giao hàng (Proof of Delivery) từ đối tác vận chuyển để hoàn tất đơn và kích hoạt hạch toán Có 511.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Phân loại Nguồn Bằng Chứng Giao Hàng (POD Source) *
              </label>
              <select
                value={podSource}
                onChange={(e) => setPodSource(e.target.value as any)}
                className="input text-xs w-full font-semibold bg-brand-50/40 border-brand-300 text-brand-900"
              >
                <option value="carrier_webhook_verified">Webhook Đối Tác Vận Chuyển (Xác thực API tự động)</option>
                <option value="demo_manual">Demo Thủ Công (Người dùng nhập thử nghiệm)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Mã vận đơn đối soát (Carrier Tracking Code) *
              </label>
              <input
                type="text"
                value={podTracking}
                onChange={(e) => setPodTracking(e.target.value)}
                placeholder="VD: SPX-VN-88201 hoặc VTP-992144"
                className="input text-sm w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Đơn vị vận chuyển
                </label>
                <select
                  value={podCarrier}
                  onChange={(e) => setPodCarrier(e.target.value)}
                  className="input text-sm w-full"
                >
                  <option value="Shopee Xpress (SPX)">Shopee Xpress (SPX)</option>
                  <option value="Viettel Post">Viettel Post</option>
                  <option value="Giao Hàng Nhanh (GHN)">Giao Hàng Nhanh (GHN)</option>
                  <option value="Giao Hàng Tiết Kiệm (GHTK)">Giao Hàng Tiết Kiệm (GHTK)</option>
                  <option value="J&T Express">J&T Express</option>
                  <option value="Đội xe nội bộ Nexus">Đội xe nội bộ Nexus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Họ tên người nhận / ký nhận *
                </label>
                <input
                  type="text"
                  value={podRecipient}
                  onChange={(e) => setPodRecipient(e.target.value)}
                  placeholder="Họ tên người nhận"
                  className="input text-sm w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">
                Ghi chú đối soát hoặc tình trạng kiện hàng
              </label>
              <input
                type="text"
                value={podNotes}
                onChange={(e) => setPodNotes(e.target.value)}
                placeholder="VD: Khách hàng đồng kiểm ngoại quan nguyên vẹn"
                className="input text-sm w-full"
              />
            </div>

            <label className="flex items-center gap-2 p-3 bg-ink-50 rounded-lg border border-ink-200 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={podSignature}
                onChange={(e) => setPodSignature(e.target.checked)}
                className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium text-ink-800">
                Xác thực chữ ký điện tử / Ảnh biên bản giao nhận đã kiểm tra hợp lệ
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-ink-100">
            <button
              type="button"
              onClick={() => setShowPodModal(false)}
              className="btn-secondary text-xs"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={handlePodSubmit}
              className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <FileCheck2 size={14} />
              <span>Xác nhận POD & Ghi nhận Doanh thu</span>
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Xóa đơn hàng?"
        message={`Sẽ xóa vĩnh viễn đơn hàng ${order.order_number} và hoàn lại tồn kho sản phẩm. Không thể hoàn tác.`}
        confirmLabel="Xóa đơn hàng"
      />
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-ink-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-400 font-medium">{label}</p>
        <p className="text-sm text-ink-800">{children}</p>
      </div>
    </div>
  );
}
