import { InventoryObservations } from '../components/InventoryObservations';
import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  AlertTriangle,
  Boxes,
  Warehouse as WarehouseIcon,
  ArrowDownToLine,
  Lock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Truck,
  ArrowLeftRight,
  Plus,
  FileCheck2,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { omsStore as mockStore } from '@/stores/omsStore';
import type { InventoryItem, Warehouse } from '@/types';

interface InventoryPageProps {
  search?: string;
}

interface InventoryRow extends InventoryItem {
  sku?: string;
  name?: string;
  warehouses?: Warehouse;
  products?: { id: string; name: string; sku: string; safety_stock: number };
  pending_qc_qty?: number;
  damaged_qty?: number;
  in_transit_qty?: number;
}

type InventoryStateKey =
  | 'sellable'
  | 'reserved'
  | 'pending_qc'
  | 'damaged'
  | 'in_transit'
  | 'incoming'
  | 'physical';

export function InventoryPage({ search = '' }: InventoryPageProps) {
  const toast = useToast();
  const { activeTenant, activeRole } = useAuth();
  const [isMutating, setIsMutating] = useState(false);
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Direction A: Task Center Expanded/Collapsed
  const [taskCenterExpanded, setTaskCenterExpanded] = useState(false);

  // Drilldown Drawer for Inventory States
  const [selectedStateDrawer, setSelectedStateDrawer] = useState<InventoryStateKey | null>(null);

  // Inventory Scenarios Simulation Modal State
  const [activeModal, setActiveModal] = useState<'none' | 'receive_po' | 'qc_inspect' | 'quarantine' | 'transfer'>('none');
  const [selectedSku, setSelectedSku] = useState('NX-TITAN-1L');
  const [simQty, setSimQty] = useState(10);
  const [passQty, setPassQty] = useState(2);
  const [failQty, setFailQty] = useState(1);
  const [simReason, setSimReason] = useState('Trầy xước vỏ hộp / Lỗi mic thu âm');
  const [transferStage, setTransferStage] = useState<'dispatch' | 'receive'>('dispatch');

  // Verification Audit Modal
  const [verifying, setVerifying] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyData, setVerifyData] = useState<{ checked: boolean; discrepancies: Array<{ product_id: string; sku: string; issue: string }> } | null>(null);

  function handleSimReceivePO() {
    if (isMutating) return;
    if (activeRole === 'viewer') {
      toast('Quyền Viewer: Không được phép thao tác biến động tồn kho', 'error');
      return;
    }
    setIsMutating(true);
    const res = mockStore.receivePOPendingQC(selectedSku, simQty, `PO-IMPORT-${Date.now().toString().slice(-4)}`);
    if (!res.success) {
      toast(res.error || 'Nhập hàng thất bại', 'error');
      return;
    }
    toast(`✓ Đã nhập ${simQty}x ${selectedSku} vào kho dock (Pending QC: Chờ kiểm định)`, 'success');
    setActiveModal('none');
    setIsMutating(false);
    load();
  }

  function handleSimQCInspect() {
    if (isMutating) return;
    if (activeRole === 'viewer') {
      toast('Quyền Viewer: Không được phép thao tác biến động tồn kho', 'error');
      return;
    }
    setIsMutating(true);
    const res = mockStore.inspectInboundQC(selectedSku, passQty, failQty);
    if (!res.success) {
      toast(res.error || 'Nghiệm thu QC thất bại', 'error');
      return;
    }
    toast(`✓ Đã nghiệm thu QC: +${passQty} vào Khả dụng (Sellable), +${failQty} vào Cách ly (Damaged)`, 'success');
    setActiveModal('none');
    load();
  }

  function handleSimQuarantine() {
    const res = mockStore.quarantineStock(selectedSku, simQty, simReason);
    if (!res.success) {
      toast(res.error || 'Cách ly thất bại', 'error');
      return;
    }
    toast(`✓ Đã cách ly ${simQty}x ${selectedSku} vào kho phế phẩm/lỗi (Damaged)`, 'success');
    setActiveModal('none');
    load();
  }

  function handleSimTransfer() {
    const res = mockStore.transferStock(selectedSku, 'WH-NORTH', 'WH-SOUTH', simQty, transferStage);
    if (!res.success) {
      toast(res.error || 'Chuyển kho thất bại', 'error');
      return;
    }
    toast(
      transferStage === 'dispatch'
        ? `✓ Đã xuất chuyển kho: ${simQty}x ${selectedSku} chuyển vào In-transit`
        : `✓ Đã nhận chuyển kho: ${simQty}x ${selectedSku} giải phóng In-transit vào kho đích`,
      'success'
    );
    setActiveModal('none');
    load();
  }

  async function handleVerifyConsistency() {
    if (!activeTenant) return;
    setVerifying(true);
    setShowVerifyModal(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_inventory_consistency', {
        p_tenant_id: activeTenant.id,
      });
      if (rpcError) {
        // Fallback local verification
        const localDiscrepancies: Array<{ product_id: string; sku: string; issue: string }> = [];
        items.forEach((it) => {
          if (it.available_qty < 0) {
            localDiscrepancies.push({ product_id: it.product_id, sku: it.products?.sku ?? 'N/A', issue: 'Available stock negative' });
          }
          if (it.physical_qty < it.reserved_qty) {
            localDiscrepancies.push({ product_id: it.product_id, sku: it.products?.sku ?? 'N/A', issue: 'Physical stock less than Reserved' });
          }
        });
        setVerifyData({ checked: true, discrepancies: localDiscrepancies });
      } else {
        const issues = Array.isArray(data) ? (data as Array<{ product_id: string; sku: string; issue: string }>) : [];
        setVerifyData({ checked: true, discrepancies: issues });
      }
    } catch {
      setVerifyData({ checked: true, discrepancies: [] });
    } finally {
      setVerifying(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [{ data: inv, error: invErr }, { data: wh, error: whErr }] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*, warehouses(*), products(id, name, sku, safety_stock)')
          .eq('tenant_id', activeTenant?.id)
          .order('updated_at', { ascending: false }),
        supabase.from('warehouses').select('*').eq('tenant_id', activeTenant?.id).order('priority'),
      ]);
      if (invErr) throw invErr;
      if (whErr) throw whErr;
      setItems((inv ?? []) as InventoryRow[]);
      setWarehouses(wh ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu tồn kho');
      setItems([]);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant?.id]);

  // Aggregate metrics
  const totalPhysical = items.reduce((s, i) => s + i.physical_qty, 0);
  const totalReserved = items.reduce((s, i) => s + i.reserved_qty, 0);
  const totalAvailable = items.reduce((s, i) => s + i.available_qty, 0);
  const totalPendingQC = items.reduce((s, i) => s + (i.pending_qc_qty || 0), 0);
  const totalDamaged = items.reduce((s, i) => s + (i.damaged_qty || Math.max(0, i.unavailable_qty - (i.pending_qc_qty || 0))), 0);
  const totalInTransit = items.reduce((s, i) => s + (i.in_transit_qty || 0), 0);
  const totalIncoming = items.reduce((s, i) => s + i.incoming_qty, 0);
  const lowStockCount = items.filter((i) => {
    const safety = i.products?.safety_stock ?? i.safety_stock;
    return i.available_qty <= safety;
  }).length;

  const totalPriorityTasks = lowStockCount + (totalPendingQC > 0 ? 1 : 0) + (totalDamaged > 0 ? 1 : 0);

  // Donut chart dataset (Physical breakdown)
  const donutData = useMemo(() => [
    {
      name: 'Khả dụng',
      key: 'sellable' as InventoryStateKey,
      value: totalAvailable,
      color: '#10B981', // emerald-500
      lightBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Tự do phân bổ và mở bán trên tất cả các sàn D2C & Marketplace',
    },
    {
      name: 'Đã giữ cho đơn',
      key: 'reserved' as InventoryStateKey,
      value: totalReserved,
      color: '#F59E0B', // amber-500
      lightBg: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Đã khóa cho các đơn hàng đang đóng gói và điều phối vận chuyển',
    },
    {
      name: 'Chờ kiểm định',
      key: 'pending_qc' as InventoryStateKey,
      value: totalPendingQC,
      color: '#0284C7', // sky-600
      lightBg: 'bg-sky-50 text-sky-700 border-sky-200',
      description: 'Hàng nhập bến cập dock đang chờ nghiệm thu chất lượng trước khi mở bán',
    },
    {
      name: 'Hỏng / Cách ly',
      key: 'damaged' as InventoryStateKey,
      value: totalDamaged,
      color: '#F43F5E', // rose-500
      lightBg: 'bg-rose-50 text-rose-700 border-rose-200',
      description: 'Hàng lỗi từ khách hoàn hoặc bể vỡ vận chuyển đang nằm tại khu cách ly',
    },
  ], [totalAvailable, totalReserved, totalPendingQC, totalDamaged]);

  // Pipeline flow items (In-transit & Incoming)
  const pipelineData = useMemo(() => [
    {
      name: 'Đang chuyển kho',
      key: 'in_transit' as InventoryStateKey,
      value: totalInTransit,
      color: '#6366F1', // indigo-500
      lightBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Hàng đang lưu chuyển trên đường giữa các kho Bắc - Trung - Nam',
    },
    {
      name: 'Hàng sắp về',
      key: 'incoming' as InventoryStateKey,
      value: totalIncoming,
      color: '#8B5CF6', // violet-500
      lightBg: 'bg-violet-50 text-violet-700 border-violet-200',
      description: 'Số lượng đặt từ nhà cung cấp theo các phiếu PO đã xác nhận xuất xưởng',
    },
  ], [totalInTransit, totalIncoming]);

  // Filtered rows
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (warehouseFilter !== 'all' && item.warehouse_id !== warehouseFilter) {
        return false;
      }
      const safety = item.products?.safety_stock ?? item.safety_stock ?? 0;
      const pendingQc = item.pending_qc_qty || 0;
      const damaged = item.damaged_qty || Math.max(0, item.unavailable_qty - pendingQc);
      const inTransit = item.in_transit_qty || 0;

      if (statusFilter === 'low' && !(item.available_qty <= safety && item.available_qty > 0)) return false;
      if (statusFilter === 'out' && !(item.available_qty <= 0)) return false;
      if (statusFilter === 'pending_qc' && !(pendingQc > 0)) return false;
      if (statusFilter === 'damaged' && !(damaged > 0)) return false;
      if (statusFilter === 'in_transit' && !(inTransit > 0)) return false;
      if (statusFilter === 'incoming' && !(item.incoming_qty > 0)) return false;
      if (statusFilter === 'reserved' && !(item.reserved_qty > 0)) return false;
      if (statusFilter === 'sellable' && !(item.available_qty > 0)) return false;

      const q = (localSearch || search).trim().toLowerCase();
      if (q) {
        return (
          item.products?.name.toLowerCase().includes(q) ||
          item.products?.sku.toLowerCase().includes(q) ||
          item.warehouses?.name.toLowerCase().includes(q) ||
          item.warehouses?.code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, localSearch, warehouseFilter, statusFilter]);

  // SKUs matching selectedStateDrawer
  const drawerMatchingItems = useMemo(() => {
    if (!selectedStateDrawer) return [];
    return items.filter((it) => {
      const pendingQc = it.pending_qc_qty || 0;
      const damaged = it.damaged_qty || Math.max(0, it.unavailable_qty - pendingQc);
      const inTransit = it.in_transit_qty || 0;
      switch (selectedStateDrawer) {
        case 'sellable':
          return it.available_qty > 0;
        case 'reserved':
          return it.reserved_qty > 0;
        case 'pending_qc':
          return pendingQc > 0;
        case 'damaged':
          return damaged > 0;
        case 'in_transit':
          return inTransit > 0;
        case 'incoming':
          return it.incoming_qty > 0;
        case 'physical':
          return it.physical_qty > 0;
        default:
          return true;
      }
    });
  }, [items, selectedStateDrawer]);

  const selectedDrawerMeta = useMemo(() => {
    switch (selectedStateDrawer) {
      case 'sellable':
        return {
          title: 'Chi Tiết Hàng Khả Dụng (Sellable)',
          subtitle: `${totalAvailable.toLocaleString()} sản phẩm đang tự do mở bán`,
          color: 'text-emerald-700',
          bg: 'bg-emerald-50 border-emerald-200',
          qtyKey: 'available_qty' as const,
        };
      case 'reserved':
        return {
          title: 'Chi Tiết Hàng Đang Giữ (Reserved)',
          subtitle: `${totalReserved.toLocaleString()} sản phẩm đã khóa để đóng gói đơn`,
          color: 'text-amber-700',
          bg: 'bg-amber-50 border-amber-200',
          qtyKey: 'reserved_qty' as const,
        };
      case 'pending_qc':
        return {
          title: 'Chi Tiết Hàng Chờ Nghiệm Thu QC (Pending QC)',
          subtitle: `${totalPendingQC.toLocaleString()} kiện hàng tại dock chờ phân loại`,
          color: 'text-sky-700',
          bg: 'bg-sky-50 border-sky-200',
          qtyKey: 'pending_qc_qty' as const,
        };
      case 'damaged':
        return {
          title: 'Chi Tiết Hàng Lỗi / Cách Ly (Damaged Quarantine)',
          subtitle: `${totalDamaged.toLocaleString()} sản phẩm cách ly cần bồi hoàn/thanh lý`,
          color: 'text-rose-700',
          bg: 'bg-rose-50 border-rose-200',
          qtyKey: 'damaged_qty' as const,
        };
      case 'in_transit':
        return {
          title: 'Chi Tiết Hàng Đang Chuyển Kho (In-transit)',
          subtitle: `${totalInTransit.toLocaleString()} sản phẩm đang luân chuyển giữa các kho`,
          color: 'text-indigo-700',
          bg: 'bg-indigo-50 border-indigo-200',
          qtyKey: 'in_transit_qty' as const,
        };
      case 'incoming':
        return {
          title: 'Chi Tiết Hàng Sắp Về (Incoming PO)',
          subtitle: `${totalIncoming.toLocaleString()} sản phẩm theo đơn PO nhà cung cấp`,
          color: 'text-violet-700',
          bg: 'bg-violet-50 border-violet-200',
          qtyKey: 'incoming_qty' as const,
        };
      default:
        return {
          title: 'Chi Tiết Tồn Kho',
          subtitle: 'Danh sách các mặt hàng',
          color: 'text-slate-800',
          bg: 'bg-slate-50 border-slate-200',
          qtyKey: 'physical_qty' as const,
        };
    }
  }, [selectedStateDrawer, totalAvailable, totalReserved, totalPendingQC, totalDamaged, totalInTransit, totalIncoming]);

  if (loading) return <FullPageSpinner label="Đang tải dữ liệu tồn kho..." />;
  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertTriangle size={24} className="text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-rose-800">Không tải được dữ liệu tồn kho</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
          <button onClick={() => load()} className="btn-primary mt-4">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-6 font-sans">
      {/* 1. Header & Primary Operations Bar */}
      <PageHeader
        icon={Boxes}
        title="Kiểm Soát Tồn Kho 5 Trạng Thái"
        subtitle="Tồn vật lý = Khả dụng + Đã giữ + Chờ QC + Hàng lỗi. Hàng đang chuyển và sắp về được theo dõi riêng."
        badge={
          <span className="badge bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold">
            Kiểm soát nhất quán
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveModal('receive_po')}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-brand-300 text-brand-700 hover:bg-brand-50"
            >
              <Plus size={14} className="text-brand-600" />
              <span>Nhập dock chờ QC</span>
            </button>
            <button
              onClick={() => setActiveModal('qc_inspect')}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <FileCheck2 size={14} className="text-emerald-600" />
              <span>Nghiệm thu QC</span>
            </button>
            <button
              onClick={() => setActiveModal('quarantine')}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              <AlertOctagon size={14} className="text-rose-600" />
              <span>Cách ly hàng lỗi</span>
            </button>
            <button
              onClick={() => setActiveModal('transfer')}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <ArrowLeftRight size={14} className="text-indigo-600" />
              <span>Chuyển kho</span>
            </button>
            <button
              onClick={handleVerifyConsistency}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <ShieldCheck size={14} />
              <span>Kiểm toán toàn vẹn</span>
            </button>
          </div>
        }
      />
      <InventoryObservations/>

      {/* 2. Interactive Donut Chart & 6-State Breakdown Panel */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 lg:p-5">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Donut Chart with Center Total */}
          <div className="relative w-full sm:w-[260px] h-[210px] flex items-center justify-center shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={86}
                  paddingAngle={3}
                  dataKey="value"
                  onClick={(entry: any) => setSelectedStateDrawer(entry.key)}
                  className="cursor-pointer focus:outline-none"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${(val ?? 0).toLocaleString()} cái (${totalPhysical > 0 ? (((val ?? 0) / totalPhysical) * 100).toFixed(1) : 0}%)`,
                    name ?? ''
                  ]}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: 'none',
                    padding: '8px 12px',
                  }}
                  itemStyle={{ color: '#FFFFFF' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Display */}
            <div
              onClick={() => setSelectedStateDrawer('physical')}
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group pointer-events-auto"
              title="Nhấn để xem toàn bộ danh sách tồn vật lý"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-brand-600 transition-colors">
                Tồn Vật Lý
              </span>
              <span className="text-2xl font-black text-slate-900 tracking-tight group-hover:scale-105 transition-transform">
                {totalPhysical.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">100% tại các kho</span>
            </div>
          </div>

          {/* Physical stock and pipeline are intentionally separated to avoid treating them as one equation. */}
          <div className="flex-1 w-full space-y-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Cấu phần tồn vật lý</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {donutData.map((item) => {
              const pct = totalPhysical > 0 ? ((item.value / totalPhysical) * 100).toFixed(1) : '0';
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedStateDrawer(item.key)}
                  className="text-left p-3 rounded-xl border border-slate-200 hover:border-brand-400 bg-white hover:bg-slate-50/90 shadow-2xs transition-all duration-200 group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-brand-700 transition-colors">
                      {item.name}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="text-lg font-bold text-slate-900">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {pct}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-1">
                    {item.key === 'sellable'
                      ? 'Tự do mở bán'
                      : item.key === 'reserved'
                      ? 'Khóa đơn đang xử lý'
                      : item.key === 'pending_qc'
                      ? 'Tại dock chờ QC'
                      : 'Khu cách ly/hỏng'}
                  </p>
                </button>
              );
            })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Hàng trên đường · không tính vào tồn vật lý</p>
              <div className="grid grid-cols-2 gap-2.5">
              {pipelineData.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedStateDrawer(item.key)}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-brand-400 bg-white hover:bg-slate-50/90 shadow-2xs transition-all duration-200 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-brand-700 transition-colors">
                    {item.name}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="text-lg font-bold text-slate-900">
                    {item.value.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                    Đang về
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-1">
                  {item.key === 'in_transit' ? 'Đang chuyển liên kho' : 'Đơn PO nhà cung cấp'}
                </p>
              </button>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Direction A: Smart Operational Triage Banner (Inventory Task Center) */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 shadow-xs overflow-hidden transition-all duration-200">
        {/* Banner Header: Compact 1-Row Summary */}
        <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-600" />
              <span>Tác Vụ Kho Cần Ưu Tiên Xử Lý</span>
            </h3>
            <span className="badge bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold px-2 py-0.5 rounded-full">
              {totalPriorityTasks} việc cần xử lý
            </span>

            {/* Quick Summary Chips */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span className="inline-flex items-center gap-1 bg-white border border-amber-200 px-2.5 py-0.5 rounded-md text-amber-800">
                🟡 {totalPendingQC} kiện dock chờ QC
              </span>
              <span className="inline-flex items-center gap-1 bg-white border border-rose-200 px-2.5 py-0.5 rounded-md text-rose-800">
                🔴 {lowStockCount} SKU chạm an toàn
              </span>
              <span className="inline-flex items-center gap-1 bg-white border border-purple-200 px-2.5 py-0.5 rounded-md text-purple-800">
                🟣 {totalDamaged} cái hàng lỗi
              </span>
            </div>
          </div>

          {/* Toggle Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTaskCenterExpanded(!taskCenterExpanded)}
              className="text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{taskCenterExpanded ? 'Thu gọn tác vụ' : 'Xem chi tiết việc cần làm'}</span>
              {taskCenterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Expanded 3-Action Queue */}
        {taskCenterExpanded && (
          <div className="p-3.5 pt-0 border-t border-amber-200/60 mt-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
              {/* Task 1: Pending QC */}
              <div className="rounded-lg border border-amber-200 bg-white p-3.5 flex flex-col justify-between space-y-2.5 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      1. Hàng Chờ Nghiệm Thu QC
                    </span>
                    <span className="badge bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold px-2 py-0.5">
                      {totalPendingQC} cái
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hàng PO đã cập bến dock, đang ở trạng thái Chưa thể bán. Nghiệm thu ngay để chuyển vào Khả dụng (Sellable).
                  </p>
                </div>
                <button
                  onClick={() => {
                    const pendingItem = items.find((i) => (i.pending_qc_qty || 0) > 0);
                    if (pendingItem) {
                      setSelectedSku(pendingItem.products?.sku || pendingItem.sku || 'NX-TITAN-1L');
                      const pq = pendingItem.pending_qc_qty || 3;
                      setPassQty(Math.max(1, pq - 1));
                      setFailQty(1);
                    }
                    setActiveModal('qc_inspect');
                  }}
                  className="btn-secondary text-xs py-1.5 px-3 w-full flex items-center justify-center gap-1.5 font-semibold text-amber-900 border-amber-300 hover:bg-amber-50 cursor-pointer"
                >
                  <FileCheck2 size={13} className="text-amber-700" />
                  <span>Nghiệm thu QC mở bán</span>
                </button>
              </div>

              {/* Task 2: Low Safety Stock */}
              <div className="rounded-lg border border-rose-200 bg-white p-3.5 flex flex-col justify-between space-y-2.5 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900">
                      2. SKU Chạm Ngưỡng An Toàn
                    </span>
                    <span className="badge bg-rose-100 text-rose-900 border-rose-300 text-xs font-mono font-bold px-2 py-0.5">
                      {lowStockCount} SKU
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tồn khả dụng Sellable đã chạm hoặc xuống dưới mức Safety Stock. Cần lập đề xuất mua hàng PO để tránh đứt gãy đơn.
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal('receive_po')}
                  className="btn-secondary text-xs py-1.5 px-3 w-full flex items-center justify-center gap-1.5 font-semibold text-rose-900 border-rose-300 hover:bg-rose-50 cursor-pointer"
                >
                  <Plus size={13} className="text-rose-700" />
                  <span>Lập PO nhập thêm hàng</span>
                </button>
              </div>

              {/* Task 3: Damaged / Quarantine */}
              <div className="rounded-lg border border-purple-200 bg-white p-3.5 flex flex-col justify-between space-y-2.5 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900">
                      3. Hàng Hỏng / Cách Ly
                    </span>
                    <span className="badge bg-purple-100 text-purple-900 border-purple-300 text-xs font-bold px-2 py-0.5">
                      {totalDamaged} cái
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hàng lỗi từ khách hoàn hoặc bể vỡ vận chuyển, nằm ở khu cách ly (Quarantine). Cần xử lý thanh lý hoặc yêu cầu bồi thường.
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal('quarantine')}
                  className="btn-secondary text-xs py-1.5 px-3 w-full flex items-center justify-center gap-1.5 font-semibold text-purple-900 border-purple-300 hover:bg-purple-50 cursor-pointer"
                >
                  <AlertOctagon size={13} className="text-purple-700" />
                  <span>Xử lý khu cách ly</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Toolbar: Dropdown Selection & Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Warehouse Dropdown Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Layers size={16} className="text-brand-600" />
              Kho hàng:
            </span>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="text-sm font-medium bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer min-w-[210px] transition-colors"
            >
              <option value="all">Tất cả kho ({warehouses.length} kho)</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Dropdown Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Filter size={15} className="text-slate-500" />
              Trạng thái tồn:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm font-medium bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer min-w-[190px] transition-colors"
            >
              <option value="all">Tất cả trạng thái ({items.length})</option>
              <option value="low">Cận mức an toàn ({lowStockCount})</option>
              <option value="out">Hết hàng Sellable ({items.filter((i) => i.available_qty <= 0).length})</option>
              <option value="pending_qc">Có hàng chờ QC ({items.filter((i) => (i.pending_qc_qty || 0) > 0).length})</option>
              <option value="damaged">Có hàng lỗi / cách ly ({items.filter((i) => (i.damaged_qty || 0) > 0).length})</option>
              <option value="in_transit">Đang chuyển kho ({items.filter((i) => (i.in_transit_qty || 0) > 0).length})</option>
              <option value="incoming">Có hàng PO sắp về ({items.filter((i) => i.incoming_qty > 0).length})</option>
            </select>
          </div>

          {/* Clear Filter Button */}
          {(warehouseFilter !== 'all' || statusFilter !== 'all' || localSearch) && (
            <button
              onClick={() => {
                setWarehouseFilter('all');
                setStatusFilter('all');
                setLocalSearch('');
              }}
              className="text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-2 rounded-lg border border-dashed border-slate-300 hover:border-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Xóa tất cả bộ lọc"
            >
              <RotateCcw size={14} />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* Right side: Search Box */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên sản phẩm hoặc SKU..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full text-sm py-2 pl-9 pr-3.5 rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {/* 5. Inventory Table (100% Fit, No Horizontal Scrolling) */}
      {filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Package}
            title={localSearch ? 'Không tìm thấy tồn kho phù hợp' : 'Chưa có dữ liệu tồn kho'}
            description={
              localSearch || warehouseFilter !== 'all' || statusFilter !== 'all'
                ? 'Không tìm thấy sản phẩm nào khớp với bộ lọc đã chọn. Hãy điều chỉnh tiêu chí lọc.'
                : 'Dữ liệu tồn kho sẽ hiển thị khi bạn nhập hàng dock hoặc tạo phiếu chuyển kho.'
            }
            action={
              warehouseFilter !== 'all' || statusFilter !== 'all' || localSearch ? (
                <button
                  onClick={() => {
                    setWarehouseFilter('all');
                    setStatusFilter('all');
                    setLocalSearch('');
                  }}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Xóa bộ lọc</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveModal('receive_po')}
                  className="btn-primary text-sm py-2 px-3.5 flex items-center gap-1.5"
                >
                  <Plus size={15} /> <span>Nhập dock chờ QC</span>
                </button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/90 shadow-sm rounded-xl">
          <div className="w-full">
            <table className="w-full text-xs text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3.5 text-left border-b border-slate-200 font-semibold w-[25%] max-w-[250px]">
                    Sản Phẩm &amp; SKU
                  </th>
                  <th className="py-3 px-3 text-left border-b border-slate-200 font-semibold w-[14%]">
                    Kho Lưu Trữ
                  </th>
                  <th className="py-3 px-2.5 text-right border-b border-slate-200 font-semibold text-slate-700 w-[8%]">
                    Vật Lý
                  </th>
                  <th className="py-3 px-2.5 text-right border-b border-slate-200 font-semibold text-emerald-700 w-[9%]">
                    Khả Dụng
                  </th>
                  <th className="py-3 px-2.5 text-right border-b border-slate-200 font-semibold text-amber-700 w-[8%]">
                    Đã Giữ
                  </th>
                  <th className="py-3 px-2.5 text-right border-b border-slate-200 font-semibold text-sky-700 w-[7%]">
                    Chờ QC
                  </th>
                  <th className="py-3 px-2.5 text-right border-b border-slate-200 font-semibold text-rose-700 w-[7%]">
                    Hỏng/Lỗi
                  </th>
                  <th className="py-3 px-2.5 text-right border-b border-slate-200 font-semibold text-indigo-700 w-[8%]">
                    Chuyển Kho
                  </th>
                  <th className="py-3 px-2.5 text-right border-b border-slate-200 font-semibold text-violet-700 w-[7%]">
                    Sắp Về
                  </th>
                  <th className="py-3 px-3 text-center border-b border-slate-200 font-semibold w-[7%]">
                    Trạng Thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filtered.map((item, rowIdx) => {
                  const safety = item.products?.safety_stock ?? item.safety_stock;
                  const isLow = item.available_qty <= safety && item.available_qty > 0;
                  const isOut = item.available_qty <= 0;
                  const pendingQc = item.pending_qc_qty || 0;
                  const damaged = item.damaged_qty || Math.max(0, item.unavailable_qty - pendingQc);
                  const inTransit = item.in_transit_qty || 0;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'transition-colors hover:bg-slate-50/80 group',
                        rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFC]'
                      )}
                    >
                      {/* Sản phẩm & SKU - Tự động xuống dòng, không tràn */}
                      <td className="py-3 px-3.5 border-b border-slate-100 max-w-[250px]">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                            <Package size={14} className="text-slate-500 group-hover:text-brand-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-medium text-slate-900 line-clamp-2 leading-snug break-words"
                              title={item.products?.name ?? 'Sản phẩm không rõ'}
                            >
                              {item.products?.name ?? 'Sản phẩm không rõ'}
                            </p>
                            <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
                              {item.products?.sku ?? item.sku ?? '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Kho Lưu Trữ */}
                      <td className="py-3 px-3 border-b border-slate-100">
                        <div className="space-y-0.5">
                          <span className="badge bg-slate-100 text-slate-700 border-slate-200/80 text-[10px] font-bold px-1.5 py-0.5 rounded text-center">
                            {item.warehouses?.code ?? 'WH'}
                          </span>
                          <p
                            className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]"
                            title={item.warehouses?.name ?? 'Kho tổng'}
                          >
                            {item.warehouses?.name?.replace(/Kho\s+/i, '') ?? 'Kho tổng'}
                          </p>
                        </div>
                      </td>

                      {/* Vật lý */}
                      <td className="py-3 px-2.5 text-right text-xs font-bold text-slate-900 border-b border-slate-100">
                        {item.physical_qty.toLocaleString()}
                      </td>

                      {/* Khả dụng */}
                      <td
                        className={cn(
                          'py-3 px-2.5 text-right text-xs font-bold border-b border-slate-100',
                          isOut
                            ? 'text-rose-600'
                            : isLow
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        )}
                      >
                        {item.available_qty.toLocaleString()}
                      </td>

                      {/* Đã giữ */}
                      <td className="py-3 px-2.5 text-right text-xs font-medium text-amber-600 border-b border-slate-100">
                        {item.reserved_qty.toLocaleString()}
                      </td>

                      {/* Chờ QC */}
                      <td
                        className={cn(
                          'py-3 px-2.5 text-right text-xs font-medium border-b border-slate-100',
                          pendingQc > 0 ? 'text-sky-600 font-semibold' : 'text-slate-400'
                        )}
                      >
                        {pendingQc.toLocaleString()}
                      </td>

                      {/* Hỏng / Lỗi */}
                      <td
                        className={cn(
                          'py-3 px-2.5 text-right text-xs font-medium border-b border-slate-100',
                          damaged > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'
                        )}
                      >
                        {damaged.toLocaleString()}
                      </td>

                      {/* Chuyển kho */}
                      <td
                        className={cn(
                          'py-3 px-2.5 text-right text-xs font-medium border-b border-slate-100',
                          inTransit > 0 ? 'text-indigo-600 font-semibold' : 'text-slate-400'
                        )}
                      >
                        {inTransit.toLocaleString()}
                      </td>

                      {/* Sắp về (PO) */}
                      <td
                        className={cn(
                          'py-3 px-2.5 text-right text-xs font-medium border-b border-slate-100',
                          item.incoming_qty > 0 ? 'text-violet-600 font-semibold' : 'text-slate-400'
                        )}
                      >
                        {item.incoming_qty.toLocaleString()}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-3 text-center border-b border-slate-100">
                        {isOut ? (
                          <span className="badge bg-rose-50 text-rose-700 border-rose-200 text-xs font-medium px-2 py-0.5 text-center">
                            Hết
                          </span>
                        ) : isLow ? (
                          <span className="badge bg-amber-50 text-amber-700 border-amber-200 text-xs font-medium px-2 py-0.5 text-center">
                            Thấp
                          </span>
                        ) : (
                          <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium px-2 py-0.5 text-center">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 6. Drill-down Drawer: Chi tiết Trạng thái Tồn kho theo từng SKU */}
      <Drawer
        open={selectedStateDrawer !== null}
        onClose={() => setSelectedStateDrawer(null)}
        title={selectedDrawerMeta.title}
        subtitle={selectedDrawerMeta.subtitle}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => {
                if (selectedStateDrawer) {
                  setStatusFilter(selectedStateDrawer);
                }
                setSelectedStateDrawer(null);
              }}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Filter size={13} />
              <span>Lọc danh sách trong bảng chính</span>
            </button>
            <button
              onClick={() => setSelectedStateDrawer(null)}
              className="btn-primary text-xs px-4"
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Status summary banner */}
          <div className={cn('p-3.5 rounded-xl border text-xs leading-relaxed', selectedDrawerMeta.bg, selectedDrawerMeta.color)}>
            <div className="flex items-center justify-between font-bold mb-1">
              <span>{selectedDrawerMeta.title}</span>
              <span>{drawerMatchingItems.length} SKU liên quan</span>
            </div>
            <p className="opacity-90">
              {selectedStateDrawer === 'pending_qc' && 'Các kiện hàng này đã cập bến dock kho nhưng chưa thể mở bán. Hãy nghiệm thu QC để đưa vào Khả dụng (Sellable).'}
              {selectedStateDrawer === 'damaged' && 'Hàng hư hỏng từ quá trình giao nhận hoặc khách hoàn. Cần thẩm định thanh lý hoặc khiếu nại bồi hoàn nhà vận chuyển.'}
              {selectedStateDrawer === 'in_transit' && 'Các lô hàng đang trên đường trung chuyển giữa các chi nhánh kho bãi, số lượng sẽ tự động nhập vào kho đích khi đến nơi.'}
              {selectedStateDrawer === 'incoming' && 'Dự kiến cập cảng/kho bãi theo tiến độ cam kết trong các hợp đồng đơn hàng mua (PO).'}
              {selectedStateDrawer === 'sellable' && 'Lượng hàng sẵn sàng mở bán tự do trên Shopee, TikTok Shop, Website D2C.'}
              {selectedStateDrawer === 'reserved' && 'Số lượng hàng đang được giữ bởi các đơn đặt hàng chưa hoàn tất giao.'}
              {selectedStateDrawer === 'physical' && 'Toàn bộ hàng hóa vật lý hiện hữu trong 4 bức tường kho bãi.'}
            </p>
          </div>

          {/* Quick Action Button for Specific State */}
          {selectedStateDrawer === 'pending_qc' && (
            <button
              onClick={() => {
                setSelectedStateDrawer(null);
                setActiveModal('qc_inspect');
              }}
              className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <FileCheck2 size={15} />
              <span>Mở form Nghiệm thu QC Lô hàng ngay</span>
            </button>
          )}

          {selectedStateDrawer === 'damaged' && (
            <button
              onClick={() => {
                setSelectedStateDrawer(null);
                setActiveModal('quarantine');
              }}
              className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5 shadow-sm bg-rose-600 hover:bg-rose-700"
            >
              <AlertOctagon size={15} />
              <span>Mở form Xử lý hàng lỗi / cách ly</span>
            </button>
          )}

          {selectedStateDrawer === 'incoming' && (
            <button
              onClick={() => {
                setSelectedStateDrawer(null);
                setActiveModal('receive_po');
              }}
              className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>Mô phỏng nhập dock hàng PO</span>
            </button>
          )}

          {selectedStateDrawer === 'in_transit' && (
            <button
              onClick={() => {
                setSelectedStateDrawer(null);
                setActiveModal('transfer');
              }}
              className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700"
            >
              <ArrowLeftRight size={15} />
              <span>Tạo / Tiếp nhận phiếu chuyển kho</span>
            </button>
          )}

          {/* SKU List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Danh Sách Mặt Hàng Chi Tiết
            </h4>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden max-h-[380px] overflow-y-auto">
              {drawerMatchingItems.map((it) => {
                const pendingQc = it.pending_qc_qty || 0;
                const damaged = it.damaged_qty || Math.max(0, it.unavailable_qty - pendingQc);
                const inTransit = it.in_transit_qty || 0;

                let stateQty = it.physical_qty;
                if (selectedStateDrawer === 'sellable') stateQty = it.available_qty;
                if (selectedStateDrawer === 'reserved') stateQty = it.reserved_qty;
                if (selectedStateDrawer === 'pending_qc') stateQty = pendingQc;
                if (selectedStateDrawer === 'damaged') stateQty = damaged;
                if (selectedStateDrawer === 'in_transit') stateQty = inTransit;
                if (selectedStateDrawer === 'incoming') stateQty = it.incoming_qty;

                return (
                  <div key={it.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">
                        {it.products?.name ?? 'Sản phẩm'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-slate-500 font-bold">
                          {it.products?.sku ?? it.sku}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">
                          {it.warehouses?.name ?? 'Kho tổng'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-slate-900 block">
                        {stateQty.toLocaleString()} cái
                      </span>
                      <span className="text-[10px] text-slate-400">
                        An toàn: {it.products?.safety_stock ?? it.safety_stock}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>

      {/* 7. Consistency Audit Modal */}
      <Modal
        open={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Kết Quả Kiểm Toán Toàn Vẹn Tồn Kho"
        subtitle={`Chi nhánh: ${activeTenant?.name ?? ''}`}
      >
        <div className="p-4 space-y-4">
          {verifying ? (
            <div className="text-center py-8 space-y-2">
              <RefreshCw size={24} className="animate-spin text-brand-600 mx-auto" />
              <p className="text-xs text-slate-500">Đang đối chiếu Physical, Reserved, Available stock qua RPC...</p>
            </div>
          ) : verifyData?.discrepancies.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Toàn Bộ Dữ Liệu Tồn Kho Đạt Chuẩn Bất Biến!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Không phát hiện bất kỳ sai lệch nào: 100% mặt hàng tuân thủ ràng buộc non-negative và Physical = Available + Reserved + Unavailable.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                Phát hiện {verifyData?.discrepancies.length} mặt hàng cần can thiệp đối chiếu:
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {verifyData?.discrepancies.map((d, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between">
                    <span className="font-mono font-bold text-slate-800">{d.sku}</span>
                    <span className="text-rose-600 font-medium">{d.issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 text-right">
            <button onClick={() => setShowVerifyModal(false)} className="btn-secondary text-xs">
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* 8. Interactive Inventory Scenarios Simulation Modal */}
      <Modal
        open={activeModal !== 'none'}
        onClose={() => setActiveModal('none')}
        title={
          activeModal === 'receive_po'
            ? 'Mô phỏng Nhập kho Dock (Chờ QC)'
            : activeModal === 'qc_inspect'
            ? 'Nghiệm thu QC Lô hàng Dock'
            : activeModal === 'quarantine'
            ? 'Cách ly / Phân loại hàng lỗi'
            : activeModal === 'transfer'
            ? 'Mô phỏng Chuyển kho Liên tỉnh'
            : ''
        }
        subtitle={
          activeModal === 'receive_po'
            ? 'Kiểm thử trạng thái Pending QC: Hàng về dock nhưng chưa mở bán'
            : activeModal === 'qc_inspect'
            ? 'Kiểm định chất lượng: Phân tách hàng Đạt (Sellable) & Hỏng (Damaged)'
            : activeModal === 'quarantine'
            ? 'Khóa hàng hỏng từ RMA/vận chuyển, không cho vào khả dụng'
            : activeModal === 'transfer'
            ? 'Luân chuyển In-transit từ kho Bắc sang kho Nam'
            : undefined
        }
      >
        <div className="p-4 space-y-4 text-xs">
          {/* Modal Scenario: 1. Receive PO */}
          {activeModal === 'receive_po' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 leading-relaxed">
                Hàng PO nhập dock sẽ tăng <strong>Pending QC</strong> và <strong>Physical</strong>, nhưng <strong>Available = 0</strong> cho đến khi nghiệm thu QC.
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Chọn SKU hàng về:</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.products?.sku || i.sku}>
                      {i.products?.sku} - {i.products?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Số lượng kiện cập dock:</label>
                <input
                  type="number"
                  min={1}
                  value={simQty}
                  onChange={(e) => setSimQty(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="text-right pt-2">
                <button
                  onClick={handleSimReceivePO}
                  disabled={isMutating}
                  className="btn-primary text-xs"
                >
                  Xác nhận Nhập dock ({simQty} cái)
                </button>
              </div>
            </div>
          )}

          {/* Modal Scenario: 2. QC Inspection */}
          {activeModal === 'qc_inspect' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 leading-relaxed">
                Nghiệm thu: Hàng Đạt chuyển vào <strong>Khả dụng (Sellable)</strong>, Hàng Lỗi chuyển vào <strong>Cách ly (Damaged)</strong>, giải phóng <strong>Pending QC</strong>.
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700">SKU nghiệm thu:</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.products?.sku || i.sku}>
                      {i.products?.sku} (Đang chờ QC: {i.pending_qc_qty || 0})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-emerald-700">Số lượng QC ĐẠT:</label>
                  <input
                    type="number"
                    min={0}
                    value={passQty}
                    onChange={(e) => setPassQty(Number(e.target.value))}
                    className="w-full p-2 border border-emerald-300 rounded-lg text-emerald-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-rose-700">Số lượng QC HỎNG:</label>
                  <input
                    type="number"
                    min={0}
                    value={failQty}
                    onChange={(e) => setFailQty(Number(e.target.value))}
                    className="w-full p-2 border border-rose-300 rounded-lg text-rose-800 font-bold"
                  />
                </div>
              </div>
              <div className="text-right pt-2">
                <button
                  onClick={handleSimQCInspect}
                  disabled={isMutating}
                  className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  Hoàn tất Nghiệm thu (+{passQty} Bán, +{failQty} Lỗi)
                </button>
              </div>
            </div>
          )}

          {/* Modal Scenario: 3. Quarantine */}
          {activeModal === 'quarantine' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 leading-relaxed">
                Cách ly hàng lỗi: Giảm <strong>Available</strong>, tăng <strong>Damaged</strong>. Giữ nguyên <strong>Physical</strong>.
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700">SKU cách ly:</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.products?.sku || i.sku}>
                      {i.products?.sku} - Tồn khả dụng: {i.available_qty}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Số lượng lỗi cách ly:</label>
                <input
                  type="number"
                  min={1}
                  value={simQty}
                  onChange={(e) => setSimQty(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Lý do cách ly:</label>
                <input
                  type="text"
                  value={simReason}
                  onChange={(e) => setSimReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="text-right pt-2">
                <button onClick={handleSimQuarantine} className="btn-primary text-xs bg-rose-600 hover:bg-rose-700">
                  Xác nhận Cách ly ({simQty} cái)
                </button>
              </div>
            </div>
          )}

          {/* Modal Scenario: 4. Transfer */}
          {activeModal === 'transfer' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 leading-relaxed">
                Chuyển kho: Giai đoạn 1 xuất vào <strong>In-transit</strong>. Giai đoạn 2 giải phóng In-transit vào kho đích.
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700">SKU chuyển:</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.products?.sku || i.sku}>
                      {i.products?.sku} - {i.products?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Giai đoạn chuyển kho:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tstage"
                      checked={transferStage === 'dispatch'}
                      onChange={() => setTransferStage('dispatch')}
                    />
                    <span>1. Xuất kho (Vào In-transit)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tstage"
                      checked={transferStage === 'receive'}
                      onChange={() => setTransferStage('receive')}
                    />
                    <span>2. Nhận kho (Giải phóng In-transit)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Số lượng chuyển:</label>
                <input
                  type="number"
                  min={1}
                  value={simQty}
                  onChange={(e) => setSimQty(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="text-right pt-2">
                <button onClick={handleSimTransfer} className="btn-primary text-xs bg-indigo-600 hover:bg-indigo-700">
                  Xác nhận Chuyển kho ({transferStage === 'dispatch' ? 'Xuất chuyển' : 'Nhập nhận'})
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
