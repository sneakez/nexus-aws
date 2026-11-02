import { ReturnActions } from '../components/ReturnActions';
import { hasPermission } from '@/lib/permissions';
import React, { useEffect, useState, useMemo } from 'react';
import {
  PackageCheck,
  Plus,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  RefreshCw,
  Wrench,
  AlertTriangle,
  FileCheck2,
  Sparkles,
  Truck,
  Clock,
  Search,
  Eye,
  Layers,
  Boxes,
  FileText,
  ChevronRight,
  Info,
  Check,
  ExternalLink,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { WorkflowStepVisualizer } from '@/components/common/WorkflowStepVisualizer';
import { supabase } from '@/lib/supabase';
import { omsStore as mockStore } from '@/stores/omsStore';
import { useAuth } from '@/providers/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import {
  formatCurrency,
  formatDate,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
} from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import type { ReturnRequest, Order, RmaBranch } from '@/types';

const RMA_BRANCH_LABELS: Record<RmaBranch, { label: string; color: string; desc: string }> = {
  refund: {
    label: 'Hoàn tiền tiêu chuẩn',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'Thu hồi hàng về kho → QC → Maker/Checker → Chi hoàn tiền',
  },
  exchange: {
    label: 'Đổi hàng mới',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'Thu hồi hàng cũ → QC Đạt → Xuất đơn hàng mới thay thế',
  },
  warranty: {
    label: 'Bảo hành / Sửa chữa',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'Tiếp nhận thiết bị → Kiểm tra kỹ thuật → Sửa chữa → Trả khách',
  },
  partial_return: {
    label: 'Trả một phần',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'Thu hồi một phần số lượng dòng hàng → QC → Hoàn tiền tương ứng',
  },
  transit_damage: {
    label: 'Vỡ do vận chuyển (Scrap)',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Biên bản bưu tá xác nhận hư hại → Chuyển thẳng kho phế phẩm → Bồi hoàn',
  },
  returnless_refund: {
    label: 'Hoàn tiền không trả hàng',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'Bỏ qua nhận kho & QC → Maker/Checker duyệt chi tiền ngay',
  },
};

const CHANNEL_BADGES: Record<string, { label: string }> = {
  shopee: { label: 'Shopee Mall' },
  tiktok: { label: 'TikTok Shop' },
  lazada: { label: 'Lazada Mall' },
  website: { label: 'Website D2C' },
};

interface ReturnsPageProps {
  search?: string;
  onNavigate?: (pageId: string) => void;
}

export function ReturnsPage({ search = '', onNavigate }: ReturnsPageProps) {
  const toast = useToast();
  const { activeRole } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedRmaId, setSelectedRmaId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [processingRmaId, setProcessingRmaId] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState(search);
  const canManage = hasPermission(activeRole, 'orders:manage');
  useEffect(() => { const id = new URLSearchParams(location.search).get('return'); if (id) { setSelectedRmaId(id); setDrawerOpen(true); } }, []);
  const rmaConfig = mockStore.getRmaConfig();
  const threshold = rmaConfig.approvalThreshold;

  // Subscribe to mock store to keep UI reactive
  useEffect(() => {
    return mockStore.subscribe(() => {
      load();
    });
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('return_requests')
      .select('*, order:orders(*)')
      .order('created_at', { ascending: false });
    setReturns((data as ReturnRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('placed_at', { ascending: false })
      .limit(100);
    setOrders(((data as Order[]) ?? []).filter(o => ['shipped', 'delivered'].includes(o.status)));
  }

  const query = (localSearch || search).trim().toLowerCase();

  const filtered = useMemo(() => {
    return returns.filter((r) => {
      if (branchFilter !== 'all' && (r.rma_branch || 'refund') !== branchFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && r.status !== 'pending') return false;
        if (statusFilter === 'approved' && r.status !== 'approved') return false;
        if (statusFilter === 'qc_pending' && r.status !== 'received' && r.status !== 'quality_check') return false;
        if (statusFilter === 'qc_passed' && r.status !== 'qc_passed') return false;
        if (statusFilter === 'qc_failed' && r.status !== 'qc_failed') return false;
        if (statusFilter === 'refunded' && r.status !== 'refunded') return false;
      }
      if (query) {
        return (
          r.return_number.toLowerCase().includes(query) ||
          r.order?.order_number?.toLowerCase().includes(query) ||
          (r.order?.customer?.name || '').toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [returns, branchFilter, statusFilter, query]);

  // Selected return for Drawer
  const activeReturn = useMemo(() => {
    if (!selectedRmaId) return filtered[0] || returns[0] || null;
    return returns.find(r => r.id === selectedRmaId) || filtered[0] || null;
  }, [returns, filtered, selectedRmaId]);

  // Operational Metrics
  const metrics = useMemo(() => {
    const total = returns.length || 1;
    const pendingAction = returns.filter(r => r.status !== 'refunded' && r.status !== 'closed' && r.status !== 'rejected').length;
    const pendingApprovalList = returns.filter(r => r.approval_status === 'pending' || r.approval_status === 'maker_approved');
    const pendingApprovalCount = pendingApprovalList.length;
    const pendingApprovalAmount = pendingApprovalList.reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);
    const pendingQc = returns.filter(r => r.status === 'pending' || r.status === 'approved' || r.status === 'received' || r.status === 'quality_check').length;
    const exchangeReady = returns.filter(r => r.rma_branch === 'exchange' && ((r.status as string) === 'qc_passed' || (r.status as string) === 'approved')).length;
    const totalRefundedAmount = returns.filter(r => r.status === 'refunded').reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);

    // Distribution
    const refund = returns.filter(r => (r.rma_branch || 'refund') === 'refund').length;
    const returnless = returns.filter(r => r.rma_branch === 'returnless_refund').length;
    const exchange = returns.filter(r => r.rma_branch === 'exchange').length;
    const damage = returns.filter(r => r.rma_branch === 'transit_damage').length;
    const warranty = returns.filter(r => r.rma_branch === 'warranty').length;

    return {
      pendingAction,
      pendingApprovalCount,
      pendingApprovalAmount,
      pendingQc,
      exchangeReady,
      totalRefundedAmount,
      distribution: [
        { key: 'refund', label: 'Hoàn tiền tiêu chuẩn', count: refund, pct: Math.round((refund / total) * 100), color: 'bg-blue-500', barColor: '#3B82F6' },
        { key: 'returnless_refund', label: 'Returnless Refund', count: returnless, pct: Math.round((returnless / total) * 100), color: 'bg-cyan-500', barColor: '#06B6D4' },
        { key: 'exchange', label: 'Đổi hàng mới', count: exchange, pct: Math.round((exchange / total) * 100), color: 'bg-emerald-500', barColor: '#10B981' },
        { key: 'transit_damage', label: 'Vỡ do vận chuyển', count: damage, pct: Math.round((damage / total) * 100), color: 'bg-rose-500', barColor: '#F43F5E' },
        { key: 'warranty', label: 'Bảo hành / Sửa chữa', count: warranty, pct: Math.round((warranty / total) * 100), color: 'bg-violet-500', barColor: '#8B5CF6' },
      ].filter(d => d.count > 0)
    };
  }, [returns]);

  const openDrawerFor = (r: ReturnRequest, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRmaId(r.id);
    setDrawerOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up font-sans">
      {/* 1. Header & Primary CTA */}
      <PageHeader
        icon={PackageCheck}
        title="Đổi Trả & Hoàn Tiền"
        subtitle="Nhận/QC và refund nguồn độc lập. Đổi hàng, bảo hành, Maker/Checker chi tay chưa hỗ trợ hoàn chỉnh; không giả thành công."
        badge={
          <span className="badge bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold">
            Hậu mãi &amp; kiểm định kho
          </span>
        }
        actions={
          <button
            disabled={!canManage}
            onClick={() => { loadOrders(); setShowModal(true); }}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} />
            <span>Tạo Yêu Cầu RMA Đa Nhánh</span>
          </button>
        }
      />

      {/* 2. Top Operational Metric Strip (4 Clean White KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Hồ Sơ Cần Xử Lý"
          value={
            <>
              {metrics.pendingAction}{' '}
              <span className="text-xs font-normal text-slate-400">/ {returns.length}</span>
            </>
          }
          subtext="Hồ sơ đổi trả đang hoạt động"
          iconColor="text-blue-600"
          iconBg="bg-blue-50 border-blue-100"
          onClick={() => setBranchFilter('all')}
        />
        <StatCard
          icon={ShieldCheck}
          label="Chờ Ký Duyệt Chi"
          value={
            <>
              {metrics.pendingApprovalCount}{' '}
              <span className="text-xs font-normal text-slate-500">
                ({formatCurrency(metrics.pendingApprovalAmount)})
              </span>
            </>
          }
          subtext="Maker / Checker cần phê duyệt"
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border-amber-100"
          onClick={() => {
            const pending = returns.find(r => r.approval_status === 'pending');
            if (pending) openDrawerFor(pending);
          }}
        />
        <StatCard
          icon={FileCheck2}
          label="Chờ Nhận & QC Kho"
          value={metrics.pendingQc}
          subtext="Kiện hàng tại dock chờ phân loại"
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50 border-indigo-100"
          onClick={() => {
            const qc = returns.find(r => r.status === 'received' || r.status === 'pending');
            if (qc) openDrawerFor(qc);
          }}
        />
        <StatCard
          icon={Truck}
          label="Chờ Xuất Hàng Đổi"
          value={metrics.exchangeReady}
          subtext="QC đạt, sẵn sàng xuất bù"
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 border-emerald-100"
          onClick={() => setBranchFilter('exchange')}
        />
      </div>

      {/* 3. Toolbar: Dropdown Selection & Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Branch Dropdown Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Layers size={16} className="text-brand-600" />
              Phân nhánh:
            </span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="text-sm font-medium bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer min-w-[210px] transition-colors"
            >
              <option value="all">Tất cả phân nhánh ({returns.length})</option>
              <option value="refund">
                1. Hoàn tiền tiêu chuẩn ({returns.filter((r) => (r.rma_branch || 'refund') === 'refund').length})
              </option>
              <option value="returnless_refund">
                2. Returnless Refund ({returns.filter((r) => r.rma_branch === 'returnless_refund').length})
              </option>
              <option value="exchange">
                3. Đổi hàng mới ({returns.filter((r) => r.rma_branch === 'exchange').length})
              </option>
              <option value="warranty">
                4. Bảo hành / Sửa chữa ({returns.filter((r) => r.rma_branch === 'warranty').length})
              </option>
              <option value="transit_damage">
                5. Vỡ do vận chuyển (Scrap) ({returns.filter((r) => r.rma_branch === 'transit_damage').length})
              </option>
            </select>
          </div>

          {/* Status Dropdown Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Filter size={15} className="text-slate-500" />
              Trạng thái:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm font-medium bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer min-w-[170px] transition-colors"
            >
              <option value="all">Tất cả trạng thái ({returns.length})</option>
              <option value="pending">
                Chờ tiếp nhận ({returns.filter((r) => r.status === 'pending').length})
              </option>
              <option value="approved">
                Đã tiếp nhận ({returns.filter((r) => r.status === 'approved').length})
              </option>
              <option value="qc_pending">
                Chờ QC kho ({returns.filter((r) => r.status === 'received' || r.status === 'quality_check').length})
              </option>
              <option value="qc_passed">
                QC Đạt ({returns.filter((r) => r.status === 'qc_passed').length})
              </option>
              <option value="qc_failed">
                QC Hỏng ({returns.filter((r) => r.status === 'qc_failed').length})
              </option>
              <option value="refunded">
                Đã hoàn tất ({returns.filter((r) => r.status === 'refunded').length})
              </option>
            </select>
          </div>

          {/* Clear filter button */}
          {(branchFilter !== 'all' || statusFilter !== 'all' || localSearch) && (
            <button
              onClick={() => {
                setBranchFilter('all');
                setStatusFilter('all');
                setLocalSearch('');
              }}
              className="text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-2 rounded-lg border border-dashed border-slate-300 hover:border-rose-300 transition-colors flex items-center gap-1.5"
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
            placeholder="Tìm mã RMA, mã đơn, khách..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full text-sm py-2 pl-9 pr-3.5 rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {/* 4. Interactive Operational Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={PackageCheck}
            title={
              localSearch
                ? 'Không tìm thấy yêu cầu RMA phù hợp'
                : branchFilter !== 'all' || statusFilter !== 'all'
                ? 'Không có hồ sơ nào khớp với bộ lọc'
                : 'Chưa có yêu cầu đổi trả'
            }
            description={
              localSearch || branchFilter !== 'all' || statusFilter !== 'all'
                ? 'Không tìm thấy hồ sơ đổi trả phù hợp với tiêu chí lọc đã chọn. Hãy xóa bộ lọc hoặc chọn tiêu chí khác.'
                : 'Nhấp "+ Tạo yêu cầu RMA đa nhánh" để khởi tạo quy trình tiếp nhận và kiểm định mới.'
            }
            action={
              branchFilter !== 'all' || statusFilter !== 'all' || localSearch ? (
                <button
                  onClick={() => {
                    setBranchFilter('all');
                    setStatusFilter('all');
                    setLocalSearch('');
                  }}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Xóa bộ lọc</span>
                </button>
              ) : (
                <button onClick={() => { loadOrders(); setShowModal(true); }} className="btn-primary text-sm py-2 px-3.5 flex items-center gap-1.5">
                  <Plus size={15} /> <span>Tạo yêu cầu RMA</span>
                </button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/90 shadow-sm rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 text-left border-b border-slate-200 font-semibold whitespace-nowrap">Mã RMA &amp; Thời Gian</th>
                  <th className="py-3.5 px-4 text-left border-b border-slate-200 font-semibold whitespace-nowrap">Đơn Hàng &amp; Khách Hàng</th>
                  <th className="py-3.5 px-4 text-left border-b border-slate-200 font-semibold whitespace-nowrap">Phân Nhánh RMA</th>
                  <th className="py-3.5 px-4 text-left border-b border-slate-200 font-semibold whitespace-nowrap">Kho &amp; Kiểm Định QC</th>
                  <th className="py-3.5 px-4 text-left border-b border-slate-200 font-semibold whitespace-nowrap">Phê Duyệt</th>
                  <th className="py-3.5 px-4 text-right border-b border-slate-200 font-semibold whitespace-nowrap">Giá Trị Hoàn Trả</th>
                  <th className="py-3.5 px-4 text-right border-b border-slate-200 font-semibold whitespace-nowrap w-[180px] min-w-[180px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filtered.map((r, rowIdx) => {
                  const branchKey = (r.rma_branch || 'refund') as RmaBranch;
                  const branchInfo = RMA_BRANCH_LABELS[branchKey] || RMA_BRANCH_LABELS.refund;
                  const isReturnless = branchKey === 'returnless_refund';
                  const isExchange = branchKey === 'exchange';
                  const isWarranty = branchKey === 'warranty';
                  const isTransitDamage = branchKey === 'transit_damage';
                  const amount = Number(r.refund_amount || 0);
                  const requiresChecker = amount >= threshold;
                  const ch = r.order?.channel ? (CHANNEL_BADGES[r.order.channel] || CHANNEL_BADGES.shopee) : CHANNEL_BADGES.shopee;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => openDrawerFor(r)}
                      className={cn(
                        'transition-colors hover:bg-slate-50/80 cursor-pointer group',
                        selectedRmaId === r.id ? 'bg-slate-50 font-medium' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFC]'
                      )}
                    >
                      {/* Mã RMA */}
                      <td className="py-3.5 px-4 border-b border-slate-100">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-sm text-slate-900 group-hover:text-brand-600 transition-colors block">
                            #{r.return_number}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {formatDate(r.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Đơn hàng & Khách hàng */}
                      <td className="py-3.5 px-4 border-b border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-slate-700">
                              #{r.order?.order_number ?? 'ORD-REF'}
                            </span>
                            <span className="badge text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 text-center">
                              {ch.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[160px]">
                            {r.order?.customer?.name || 'Khách vãng lai'}
                          </p>
                        </div>
                      </td>

                      {/* Phân nhánh RMA */}
                      <td className="py-3.5 px-4 border-b border-slate-100">
                        <span className={cn('badge text-xs px-2.5 py-1 font-medium border rounded-md whitespace-nowrap text-center', branchInfo.color)}>
                          {branchInfo.label}
                        </span>
                      </td>

                      {/* Kho & QC */}
                      <td className="py-3.5 px-4 border-b border-slate-100">
                        {isReturnless ? (
                          <span className="text-xs text-slate-500 font-medium">
                            ⚡ Bỏ qua kho &amp; QC
                          </span>
                        ) : isTransitDamage ? (
                          <span className="badge bg-rose-50 text-rose-700 border-rose-200 text-xs font-medium">
                            ⚠️ Hàng vỡ (Scrap)
                          </span>
                        ) : r.status === 'qc_passed' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            QC Đạt
                          </span>
                        ) : r.status === 'qc_failed' ? (
                          <span className="badge bg-rose-50 text-rose-700 border-rose-200 text-xs font-medium">
                            QC Hỏng
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">
                            {RETURN_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        )}
                      </td>

                      {/* Phê duyệt */}
                      <td className="py-3.5 px-4 border-b border-slate-100">
                        <div className="space-y-0.5">
                          {r.approval_status === 'pending' ? (
                            <span className="badge bg-amber-50 text-amber-700 border border-amber-200/80 text-xs font-medium">
                              Chờ duyệt
                            </span>
                          ) : (
                            <span className="badge bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                              {APPROVAL_STATUS_LABELS[r.approval_status]}
                            </span>
                          )}
                          <p className="text-[10px] text-slate-400">
                            {requiresChecker ? 'Cần Checker (≥ 1M)' : 'Maker duyệt (< 1M)'}
                          </p>
                        </div>
                      </td>

                      {/* Giá trị hoàn trả */}
                      <td className="py-3.5 px-4 text-right font-bold text-sm text-slate-900 border-b border-slate-100">
                        {isExchange ? (
                          <span className="text-slate-400 font-sans text-xs font-normal">0 ₫ (Xuất bù)</span>
                        ) : (
                          formatCurrency(amount)
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right border-b border-slate-100 whitespace-nowrap w-[180px] min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="btn-secondary text-xs" data-return={r.id} onClick={(e) => openDrawerFor(r, e)}>Mở hồ sơ</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. RMA Detail Drawer (Slide-over) */}
      {drawerOpen && activeReturn && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={`Chi Tiết Hồ Sơ #${activeReturn.return_number}`}
          subtitle={`Phân nhánh: ${RMA_BRANCH_LABELS[(activeReturn.rma_branch || 'refund') as RmaBranch]?.label || 'Hoàn tiền tiêu chuẩn'}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">
                Trạng thái: <strong>{RETURN_STATUS_LABELS[activeReturn.status] || activeReturn.status}</strong>
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="btn btn-secondary text-xs py-1.5 px-3"
              >
                Đóng hồ sơ
              </button>
            </div>
          }
        >
          <div className="space-y-5 p-1 font-sans">
            {/* Visual Workflow Stepper inside Drawer */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Tiến Trình Xử Lý Phiếu RMA
              </span>
              <WorkflowStepVisualizer
                workflowType="rma_lifecycle"
                currentStatus={activeReturn.status}
                rmaBranch={activeReturn.rma_branch || 'refund'}
                title={`Quy trình: ${RMA_BRANCH_LABELS[(activeReturn.rma_branch || 'refund') as RmaBranch]?.label}`}
              />
            </div>

            <ReturnActions key={activeReturn.id} returnId={activeReturn.id}/>
            {/* Thông tin đơn hàng & Khách hàng */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Đơn Hàng Gốc & Khách Hàng
                </span>
                <span className="font-bold text-sm text-[#123A52]">
                  #{activeReturn.order?.order_number ?? 'N/A'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Kênh bán hàng:</span>
                  <span className="font-semibold text-slate-800">
                    {CHANNEL_BADGES[activeReturn.order?.channel || 'shopee']?.label || 'Shopee Mall'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Khách hàng:</span>
                  <span className="font-semibold text-slate-800">
                    {activeReturn.order?.customer?.name || 'Khách vãng lai'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Số điện thoại:</span>
                  <span className="text-slate-700">
                    {activeReturn.order?.customer?.phone || '0903456789'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Số tiền yêu cầu hoàn:</span>
                  <strong className="text-emerald-700 text-sm">
                    {formatCurrency(activeReturn.refund_amount || 0)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Lý do & Bằng chứng đổi trả */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Lý Do & Bằng Chứng Khiếu Nại
              </span>
              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                "{activeReturn.reason || 'Khách muốn đổi sang sản phẩm khác'}"
              </p>

              <div className="pt-1">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Ảnh kiểm tra / video unbox của khách:</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-20 rounded-lg border border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-slate-400 text-[10px] space-y-1">
                    <FileText size={18} className="text-slate-500" />
                    <span>img_proof_1.jpg</span>
                  </div>
                  <div className="w-20 h-20 rounded-lg border border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-slate-400 text-[10px] space-y-1">
                    <FileText size={18} className="text-slate-500" />
                    <span>unbox_test.mp4</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Báo cáo kiểm định QC Kho */}
            {!activeReturn.is_refund_without_return && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Biên Bản Kiểm Định QC Kho
                  </span>
                  <span className={cn('badge text-[10px] font-bold', RETURN_STATUS_COLORS[activeReturn.status])}>
                    {RETURN_STATUS_LABELS[activeReturn.status]}
                  </span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <p><strong>Kho tiếp nhận:</strong> {activeReturn.warehouse_id || 'Chưa gán kho'}</p>
                  <p><strong>Ghi chú kỹ thuật:</strong> {activeReturn.qc_notes || 'Chưa có ghi chú kiểm định.'}</p>
                  <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-900 text-xs flex items-start gap-2">
                    <Info size={14} className="text-teal-600 shrink-0 mt-0.5" />
                    <span>
                      {activeReturn.status === 'qc_passed'
                        ? 'Sản phẩm đạt chuẩn 100%, hệ thống đã tự động nhập lại tồn Khả dụng.'
                        : activeReturn.status === 'qc_failed'
                          ? 'Sản phẩm lỗi/hư hỏng, hệ thống đã điều chuyển sang khu Cách ly.'
                          : 'Đang chờ thủ kho bóc kiện và tiến hành kiểm định QC.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quy tắc Phê duyệt Maker / Checker */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Maker / Checker · chưa hỗ trợ chi tiền tay trong prototype
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-400 block font-sans text-[11px]">Cấp Maker (Đề xuất):</span>
                  <span className="font-bold text-slate-800">
                    {activeReturn.approval_status !== 'pending' ? '✓ Đã Duyệt' : 'Chờ đề xuất'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-400 block font-sans text-[11px]">Checker dự kiến · chưa triển khai:</span>
                  <span className="font-bold text-slate-800">
                    {activeReturn.approval_status === 'checker_approved' ? '✓ Đã Ký Duyệt' : activeReturn.refund_amount >= threshold ? 'Bắt buộc Checker' : 'Miễn Checker (< 1M)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bút toán kế toán kép (Double-Entry Journal) */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-emerald-600" />
                  Minh họa định khoản · không phải chứng từ tiền đã chi
                </span>
                <span className="font-mono text-[11px] text-emerald-700">MINH HỌA · không kết luận pháp lý</span>
              </div>
              <div className="text-xs space-y-1 bg-white p-2.5 rounded-lg border border-emerald-200 text-slate-800">
                <div className="flex justify-between">
                  <span>Nợ TK 521 (Giảm trừ doanh thu hàng bán bị trả lại):</span>
                  <strong>{formatCurrency(activeReturn.refund_amount || 0)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Có TK 112 (Tiền gửi ngân hàng chi trả cho khách):</span>
                  <strong>{formatCurrency(activeReturn.refund_amount || 0)}</strong>
                </div>
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* 6. New RMA Modal */}
      {showModal && (
        <NewReturnModal
          open={showModal}
          onClose={() => setShowModal(false)}
          orders={orders}
          onSaved={() => { load(); setShowModal(false); }}
        />
      )}
    </div>
  );
}

function NewReturnModal({ open, onClose, orders, onSaved }: {
  open: boolean; onClose: () => void; orders: Order[]; onSaved: () => void;
}) {
  const toast = useToast();
  const [orderId, setOrderId] = useState('');
  const [rmaBranch, setRmaBranch] = useState<RmaBranch>('refund');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const returnLines = mockStore.getSnapshot().orderItems.filter(i => i.order_id === orderId);

  async function handleSave() {
    if (!Object.values(quantities).some(q => Number(q) > 0)) { toast('Chọn số lượng dòng trả', 'error'); return; }
    if (!orderId) { toast('Vui lòng chọn đơn hàng cần đổi trả', 'error'); return; }
    
    // Strict business validation
    const validation = mockStore.validateRmaRequest({
      orderId,
      refundAmount
    });

    if (!validation.valid) {
      validation.errors.forEach(err => toast(err, 'error'));
      return;
    }

    setSaving(true);
    const res = mockStore.createMultiBranchRma({
      orderId,
      rmaBranch,
      reason: reason || `Yêu cầu RMA nhánh ${rmaBranch}`,
      refundAmount,
      items: returnLines.map(i => ({ productId: i.product_id, qty: Number(quantities[i.product_id] || 0) })).filter(i => i.qty > 0),
      notes: `Tạo RMA qua giao diện đa nhánh — ${validation.ruleExplanation}`,
    });

    setSaving(false);
    if (!res.success) {
      toast(res.error || 'Tạo RMA thất bại', 'error');
      return;
    }
    toast(`✓ Đã tạo yêu cầu RMA thành công: ${res.rmaNumber} (${validation.ruleExplanation})`, 'success');
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo Yêu Cầu Đổi Trả"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Hủy bỏ</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Spinner size={16} /> : null} Tạo yêu cầu RMA
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Đơn hàng liên quan *</label>
          <select
            aria-label="Đơn gốc RMA"
            value={orderId}
            onChange={(e) => {
              const id = e.target.value;
              setOrderId(id); setQuantities({});
              const ord = orders.find(o => o.id === id);
              if (ord) setRefundAmount(Number(ord.total || ord.total_amount || 0));
            }}
            className="input font-medium"
          >
            <option value="">Chọn đơn hàng...</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} — {formatCurrency(Number(o.total || o.total_amount || 0))} ({o.status})
              </option>
            ))}
          </select>
        </div>

        {returnLines.map(i => <label key={i.id} className="label">{i.product_sku} · đã mua {i.quantity}<input aria-label={`Lượng trả ${i.product_id}`} type="number" min="0" max={i.quantity} className="input" value={quantities[i.product_id] || ''} onChange={e => setQuantities({ ...quantities, [i.product_id]: e.target.value })}/></label>)}
        <div>
          <label className="label">Phân loại 6 Nhánh RMA nghiệp vụ *</label>
          <select
            aria-label="Nhánh RMA"
            value={rmaBranch}
            onChange={(e) => {
              const b = e.target.value as RmaBranch;
              setRmaBranch(b);
              if (b === 'exchange') {
                setRefundAmount(0); // Exchange doesn't refund cash, replaces SKU
              } else {
                const ord = orders.find(o => o.id === orderId);
                if (ord) setRefundAmount(Number(ord.total || 0));
              }
            }}
            className="input font-semibold"
          >
            <option value="refund">1. Hoàn tiền tiêu chuẩn (Full Refund: Thu hồi → QC → Chi tiền)</option>
            <option value="exchange">2. Đổi hàng mới · hồ sơ mô phỏng, chưa hỗ trợ xuất bù</option>
            <option value="warranty">3. Bảo hành · hồ sơ mô phỏng, chưa hỗ trợ sửa/trả</option>
            <option value="partial_return">4. Trả một phần (Partial Return: Hoàn một phần giá trị đơn)</option>
            <option value="transit_damage">5. Vỡ do vận chuyển (Transit Damage Scrap: Chuyển thẳng kho hỏng)</option>
            <option value="returnless_refund">6. Hoàn tiền không trả hàng (Returnless Refund: Bỏ qua QC)</option>
          </select>
          <p className="text-xs text-brand-600 mt-1 font-medium">
            💡 {RMA_BRANCH_LABELS[rmaBranch]?.desc}
          </p>
        </div>

        <div>
          <label className="label">
            Số tiền hoàn (VND) {rmaBranch === 'exchange' ? '(0 đ - Xuất bù hàng)' : ''}
          </label>
          <input
            type="number"
            step="1000"
            aria-label="Tiền đề nghị hoàn"
            value={refundAmount}
            onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
            className="input font-semibold"
          />
          <p className="text-[11px] text-ink-400 mt-1">
            Quy tắc phê duyệt: Dưới 1.000.000 ₫ Maker duyệt; Từ 1.000.000 ₫ bắt buộc Checker (Kế toán trưởng) duyệt.
          </p>
        </div>

        <div>
          <label className="label">Lý do đổi trả & Ghi chú nghiệp vụ</label>
          <textarea
            aria-label="Lý do trả hàng"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="input text-sm"
            placeholder="Mô tả lý do khiếu nại, tình trạng ngoại quan hoặc thỏa thuận với khách hàng..."
          />
        </div>
      </div>
    </Modal>
  );
}
