import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/permissions';
import { POReceiptModal } from './POReceiptModal';
import { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Calendar,
  Building2,
  Warehouse as WarehouseIcon,
  Clock,
  CheckCircle2,
  DollarSign,
  PackageCheck,
  Truck,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mockStore } from '@/mock/store';
import { cn } from '@/lib/cn';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from '@/lib/utils';
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  Warehouse,
  Product,
  POStatus,
} from '@/types';

interface PurchaseOrdersPageProps {
  search: string;
}

interface POWithItems extends PurchaseOrder {
  warehouse?: Warehouse;
  purchase_order_items?: (PurchaseOrderItem & { product?: Product })[];
}

const STATUS_OPTIONS: { value: POStatus; label: string }[] = [
  { value: 'draft', label: 'Bản nháp' },
  { value: 'ordered', label: 'Đã đặt hàng' },
  { value: 'partial', label: 'Nhận một phần' },
  { value: 'received', label: 'Đã nhận đủ' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export function PurchaseOrdersPage({ search }: PurchaseOrdersPageProps) {
  const { activeRole } = useAuth();
  const canCreate = hasPermission(activeRole, 'purchasing:create');
  const [orders, setOrders] = useState<POWithItems[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const [{ data: po }, { data: wh }, { data: prod }] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('*, warehouse:warehouses(*), purchase_order_items(*, product:products(*))')
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
    ]);
    setOrders((po ?? []) as POWithItems[]);
    setWarehouses(wh ?? []);
    setProducts(prod ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((po) => {
      if (statusFilter !== 'all' && po.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          po.po_number.toLowerCase().includes(q) ||
          po.supplier_name.toLowerCase().includes(q) ||
          po.warehouse?.name.toLowerCase().includes(q) ||
          po.status.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  const toast = useToast();

  async function handleConfirmOrder(poId: string) {
    const { error } = await supabase.from('purchase_orders').update({ status: 'ordered' }).eq('id', poId);
    if (error) {
      toast('Không thể xác nhận PO: ' + error.message, 'error');
      return;
    }
    toast('Đã xác nhận PO mô phỏng; chưa gửi NCC thật', 'success');
    load();
  }

  async function handleReceivePO(poId: string) { setReceivingId(poId); }

  if (loading) return <FullPageSpinner label="Đang tải danh sách đơn mua hàng (PO)..." />;

  const totalValue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingCount = orders.filter((o) => o.status === 'ordered' || o.status === 'partial').length;
  const receivedCount = orders.filter((o) => o.status === 'received').length;
  const draftCount = orders.filter((o) => o.status === 'draft').length;
  const completionRate = orders.length > 0 ? Math.round((receivedCount / orders.length) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-ink-100">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="text-brand-600" size={26} />
            Đơn Mua Hàng &amp; Nhập Kho (PO)
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Kiểm soát kế hoạch nhập hàng từ nhà cung cấp, nghiệm thu từng đợt &amp; quản trị dòng vốn hàng tồn.
          </p>
        </div>
        <button
          disabled={!canCreate}
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus size={16} />
          <span>Tạo đơn PO mới</span>
        </button>
      </div>

      {/* Top 4 Clean White KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng đơn PO */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Đơn PO</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{orders.length}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{draftCount} bản nháp lưu tạm</p>
          </div>
        </div>

        {/* KPI 2: Chờ nhận hàng */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang Chờ Nhập Kho</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{pendingCount}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Đang trên đường hoặc nhận 1 phần</p>
          </div>
        </div>

        {/* KPI 3: Giá trị cam kết PO */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá Trị Cam Kết PO</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Công nợ nhà cung cấp</p>
          </div>
        </div>

        {/* KPI 4: Tỷ lệ hoàn thành */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã Nhập Kho Đủ</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{receivedCount}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{completionRate}% đơn hoàn tất</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-ink-100">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0',
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <span>Tất cả</span>
          <span
            className={cn(
              'px-1.5 py-0.5 text-[11px] rounded-full font-semibold',
              statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {orders.length}
          </span>
        </button>

        {STATUS_OPTIONS.map((opt) => {
          const count = orders.filter((o) => o.status === opt.value).length;
          const isActive = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                'px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <span>{opt.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[11px] rounded-full font-semibold',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* PO List */}
      {filtered.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={ShoppingCart}
            title={
              search || statusFilter !== 'all'
                ? 'Không tìm thấy đơn mua hàng phù hợp'
                : 'Chưa có đơn mua hàng nào'
            }
            description={
              search || statusFilter !== 'all'
                ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc chuyển sang bộ lọc trạng thái khác.'
                : 'Tạo đơn mua hàng (PO) đầu tiên để nhập hàng từ nhà cung cấp vào kho.'
            }
            action={
              !search && statusFilter === 'all' ? (
                <button disabled={!canCreate}
          onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={16} />
                  <span>Tạo đơn PO mới</span>
                </button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((po) => {
            const isOpen = expanded[po.id] ?? false;
            const items = po.purchase_order_items ?? [];
            const totalOrderedQty = items.reduce((s, it) => s + it.quantity, 0);
            const totalReceivedQty = items.reduce((s, it) => s + (it.received_qty || 0), 0);
            const progressPct =
              totalOrderedQty > 0 ? Math.round((totalReceivedQty / totalOrderedQty) * 100) : 0;

            return (
              <Card
                key={po.id}
                className="overflow-hidden border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white rounded-xl"
              >
                <div
                  role="button" tabIndex={0} aria-expanded={isOpen}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(p => ({ ...p, [po.id]: !isOpen })); } }}
                  onClick={() => setExpanded((p) => ({ ...p, [po.id]: !isOpen }))}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/60 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="text-slate-400 shrink-0">
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <ShoppingCart size={18} className="text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 font-mono text-base">
                          {po.po_number}
                        </span>
                        <span className={cn('badge text-[11px]', PO_STATUS_COLORS[po.status])}>
                          {PO_STATUS_LABELS[po.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Building2 size={13} className="text-slate-400" />
                          {po.supplier_name}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <WarehouseIcon size={13} className="text-slate-400" />
                          {po.warehouse?.name ?? 'Kho chính'}
                        </span>
                        <span>•</span>
                        <span>
                          {items.length} mặt hàng ({totalOrderedQty} sp)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <p className="font-bold text-slate-900 text-base">
                      {formatCurrency(Number(po.total_amount))}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      {po.expected_arrival_date ? (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          ETA: {formatDate(po.expected_arrival_date)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Chưa có ngày ETA</span>
                      )}
                      <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        Đã nhận {progressPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/40 animate-fade-in space-y-4">
                    {/* Progress Bar of Receiving */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>Tiến độ nhận hàng vào kho:</span>
                          <span className="">
                            {totalReceivedQty} / {totalOrderedQty} sản phẩm ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${progressPct}%` }}
                            className={cn(
                              'h-full transition-all duration-300',
                              progressPct >= 100
                                ? 'bg-emerald-600'
                                : progressPct > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-300'
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600">Hàng nhận và tiền trả độc lập. Nợ ghi theo giá trị thực nhận từng đợt, chưa chi khi tạo/xác nhận PO. {hasPermission(activeRole,'finance:view') && <a className="text-sky-700 underline" href="?page=cashWorkingCapital">Mở công nợ / chứng từ thanh toán</a>}</p>
                    {/* Table of items */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="text-left py-2.5 px-4 font-semibold">Sản phẩm &amp; SKU</th>
                            <th className="text-right py-2.5 px-3 font-semibold">Số lượng đặt</th>
                            <th className="text-right py-2.5 px-3 font-semibold">Đã nhập kho</th>
                            <th className="text-right py-2.5 px-3 font-semibold">Còn thiếu</th>
                            <th className="text-right py-2.5 px-3 font-semibold">Đơn giá nhập</th>
                            <th className="text-right py-2.5 px-4 font-semibold">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item) => {
                            const remaining = Math.max(0, item.quantity - (item.received_qty || 0));
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-4">
                                  <p className="font-medium text-slate-900">{item.product?.name ?? '—'}</p>
                                  <code className="text-[11px] text-slate-400 font-mono">
                                    {item.product?.sku}
                                  </code>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                                  {item.quantity}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold">
                                  <span
                                    className={cn(
                                      item.received_qty >= item.quantity
                                        ? 'text-emerald-700'
                                        : item.received_qty > 0
                                        ? 'text-amber-700'
                                        : 'text-slate-400'
                                    )}
                                  >
                                    {item.received_qty || 0}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className={remaining > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>
                                    {remaining}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-600">
                                  {formatCurrency(Number(item.unit_cost))}
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                                  {formatCurrency(Number(item.unit_cost) * item.quantity)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {po.notes && (
                      <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Ghi chú PO: </span>
                        {po.notes}
                      </div>
                    )}

                    {/* Operational Action Toolbar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 flex-wrap gap-2">
                      <div className="text-xs text-slate-500 font-medium">
                        Mã đơn: <span className="font-mono font-bold text-slate-700">{po.po_number}</span> • Kho tiếp nhận: <span className="font-semibold text-slate-800">{po.warehouse?.name || 'Kho W1'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {po.status === 'draft' && (
                          <button
                            type="button"
                            disabled={!canCreate}
                            onClick={() => handleConfirmOrder(po.id)}
                            className="btn-primary text-xs py-2 px-3.5 bg-blue-600 hover:bg-blue-700 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <PackageCheck size={14} />
                            <span>Duyệt & Đặt Hàng (Order PO)</span>
                          </button>
                        )}
                        {(po.status === 'ordered' || po.status === 'partial') && (
                          <button
                            type="button"
                            onClick={() => handleReceivePO(po.id)}
                            className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <PackageCheck size={14} />
                            <span>📥 Nhận Hàng Vào Kho (Receive Stock)</span>
                          </button>
                        )}
                        {po.status === 'received' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-lg">
                            <CheckCircle2 size={14} />
                            Đã nhận đủ toàn bộ mặt hàng vào kho
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {receivingId && <POReceiptModal poId={receivingId} onClose={() => setReceivingId(null)} onSaved={() => { setReceivingId(null); toast('Đã lưu đợt nhận, tồn và giá vốn đã cập nhật', 'success'); load(); }}/>}
      {/* Modal: Create PO */}
      <POFormModal
        open={showForm}
        warehouses={warehouses}
        products={products}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          load();
          setShowForm(false);
        }}
      />
    </div>
  );
}

interface FormProps {
  open: boolean;
  warehouses: Warehouse[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

function POFormModal({ open, warehouses, products, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [leadTime, setLeadTime] = useState(7);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([]);

  useEffect(() => {
    if (open) {
      setWarehouseId(warehouses[0]?.id ?? '');
      setSupplier('');
      setLeadTime(7);
      setNotes('');
      const today = new Date();
      today.setDate(today.getDate() + 7);
      setExpectedDate(today.toISOString().slice(0, 10));
      setLines([{ product_id: products[0]?.id ?? '', quantity: 1, unit_cost: 0 }]);
    }
  }, [open]);

  function addLine() {
    const prod = products[lines.length] ?? products[0];
    setLines([
      ...lines,
      { product_id: prod?.id ?? '', quantity: 1, unit_cost: Number(prod?.moving_avg_cost ?? prod?.cost ?? 0) },
    ]);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(
    idx: number,
    patch: Partial<{ product_id: string; quantity: number; unit_cost: number }>
  ) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);

  async function handleSave() {
    if (!warehouseId) {
      toast('Vui lòng chọn kho tiếp nhận', 'error');
      return;
    }
    if (!supplier.trim()) {
      toast('Vui lòng nhập tên nhà cung cấp', 'error');
      return;
    }
    const validLines = lines.filter((l) => l.product_id && l.quantity > 0 && l.unit_cost >= 0);
    if (validLines.length === 0 || validLines.length !== lines.length) {
      toast('Vui lòng thêm ít nhất một mặt hàng hợp lệ', 'error');
      return;
    }
    setSaving(true);
    const number = `PO-${Date.now().toString().slice(-8)}`;
    const result = mockStore.createPurchaseOrder({ po_number: number, warehouse_id: warehouseId, supplier_name: supplier.trim(), lead_time_days: Number(leadTime) || 7, expected_arrival_date: expectedDate || null, notes: notes.trim() || null }, validLines);
    if (!result.success) { toast(result.error || 'Không tạo được PO', 'error'); setSaving(false); return; }

    toast(`Đã tạo đơn mua hàng ${number} thành công`, 'success');
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo Đơn Mua Hàng Mới (PO)"
      subtitle="Lập kế hoạch mua hàng từ nhà cung cấp và chỉ định kho tiếp nhận"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Hủy bỏ
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
            {saving && <Spinner size={16} />}
            <span>Tạo đơn PO · {formatCurrency(total)}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nhà cung cấp *</label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              aria-label="Nhà cung cấp PO" placeholder="Ví dụ: Foxconn VN, Synnex FPT..."
              className="input"
            />
          </div>
          <div>
            <label className="label">Kho tiếp nhận hàng *</label>
            <select
              aria-label="Kho nhận PO" value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="input"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Thời gian giao hàng (Lead Time - ngày)</label>
            <input
              type="number"
              min="1"
              value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value))}
              className="input font-mono"
            />
          </div>
          <div>
            <label className="label">Ngày hàng về dự kiến (ETA)</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="input font-mono"
            />
          </div>
        </div>

        {/* Product items lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Danh sách mặt hàng nhập ({lines.length})</label>
            <button
              type="button"
              onClick={addLine}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <Plus size={14} /> Thêm dòng
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto p-1">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <select
                  value={line.product_id}
                  onChange={(e) => {
                    const sel = products.find((p) => p.id === e.target.value);
                    updateLine(idx, {
                      product_id: e.target.value,
                      unit_cost: Number(sel?.moving_avg_cost ?? sel?.cost ?? 0),
                    });
                  }}
                  className="input flex-1 text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                  className="input w-20 text-xs text-right"
                  aria-label={`SL PO ${idx}`} placeholder="SL"
                />

                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={line.unit_cost}
                  onChange={(e) => updateLine(idx, { unit_cost: Number(e.target.value) })}
                  className="input w-32 text-xs text-right"
                  aria-label={`Đơn giá PO ${idx}`} placeholder="Đơn giá"
                />

                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                  disabled={lines.length === 1}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Ghi chú đơn PO</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Điều khoản thanh toán, tiêu chuẩn đóng gói..."
            className="input"
          />
        </div>
      </div>
    </Modal>
  );
}
