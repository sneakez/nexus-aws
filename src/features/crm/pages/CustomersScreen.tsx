import { useEffect, useMemo, useState } from 'react';

// Unified customer profile feature screen.
import {
  Users,
  Mail,
  Phone,
  Building2,
  MapPin,
  Pencil,
  Trash2,
  Eye,
  Plus,
  Crown,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Calendar,
  UserCheck,
  UserX,
  UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  initials,
  CUSTOMER_STATUS_COLORS,
  CUSTOMER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  CHANNEL_COLORS,
  CHANNEL_LABELS,
} from '@/lib/utils';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/providers/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { Customer, CustomerInput, CustomerStatus, CustomerTier, Order, Channel } from '@/types';

interface CustomersPageProps {
  search: string;
}

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'lead', label: 'Khách hàng tiềm năng' },
  { value: 'inactive', label: 'Ngừng hoạt động' },
];

const TIER_OPTIONS: { value: CustomerTier; label: string; icon: string }[] = [
  { value: 'standard', label: 'Tiêu chuẩn', icon: '🌱' },
  { value: 'silver', label: 'Bạc', icon: '🥈' },
  { value: 'gold', label: 'Vàng', icon: '🥇' },
  { value: 'platinum', label: 'Bạch Kim (VIP)', icon: '👑' },
];

type FilterTab = 'all' | 'active' | 'vip' | 'lead' | 'inactive';

interface CustomerMetrics {
  ltv: number;
  orderCount: number;
  latestOrder: Order | null;
  segment: 'vip' | 'loyal' | 'new';
}

export function CustomersPage({ search }: CustomersPageProps) {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [customersRes, ordersRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', activeTenant?.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .eq('tenant_id', activeTenant?.id)
          .order('placed_at', { ascending: false }),
      ]);

      setCustomers(customersRes.data ?? []);
      setOrders(ordersRes.data ?? []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu khách hàng:', err);
      toast('Không thể tải dữ liệu khách hàng', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant?.id]);

  // Map of customer ID -> computed metrics
  // VIP threshold: LTV >= 6,000,000 VND (top spenders)
  // Loyal threshold: LTV >= 2,000,000 VND or orderCount >= 2
  const customerMetricsMap = useMemo(() => {
    const map = new Map<string, CustomerMetrics>();

    customers.forEach((c) => {
      const customerOrders = orders.filter((o) => o.customer_id === c.id);
      const ltv = customerOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const orderCount = customerOrders.length;
      const latestOrder = customerOrders.length > 0 ? customerOrders[0] : null;

      let segment: 'vip' | 'loyal' | 'new' = 'new';
      if (ltv >= 6000000 || c.tier === 'platinum') {
        segment = 'vip';
      } else if (ltv >= 2000000 || orderCount >= 2 || c.tier === 'gold' || c.tier === 'silver') {
        segment = 'loyal';
      }

      map.set(c.id, {
        ltv,
        orderCount,
        latestOrder,
        segment,
      });
    });

    return map;
  }, [customers, orders]);

  // Top KPI calculations
  const kpiStats = useMemo(() => {
    const totalCustomers = customers.length;
    let vipCount = 0;
    let repeatCount = 0;
    let totalLTV = 0;

    customers.forEach((c) => {
      const metrics = customerMetricsMap.get(c.id);
      if (metrics) {
        totalLTV += metrics.ltv;
        if (metrics.segment === 'vip') vipCount++;
        if (metrics.orderCount >= 2) repeatCount++;
      }
    });

    const avgLTV = totalCustomers > 0 ? Math.round(totalLTV / totalCustomers) : 0;
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCount / totalCustomers) * 100) : 0;

    return {
      totalCustomers,
      vipCount,
      avgLTV,
      repeatRate,
      repeatCount,
    };
  }, [customers, customerMetricsMap]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: customers.length,
      active: customers.filter((c) => c.status === 'active').length,
      vip: customers.filter((c) => customerMetricsMap.get(c.id)?.segment === 'vip').length,
      lead: customers.filter((c) => c.status === 'lead').length,
      inactive: customers.filter((c) => c.status === 'inactive').length,
    };
  }, [customers, customerMetricsMap]);

  // Filtered customers
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      // Tab filter
      if (activeTab === 'active' && c.status !== 'active') return false;
      if (activeTab === 'lead' && c.status !== 'lead') return false;
      if (activeTab === 'inactive' && c.status !== 'inactive') return false;
      if (activeTab === 'vip') {
        const metrics = customerMetricsMap.get(c.id);
        if (metrics?.segment !== 'vip') return false;
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        const matchCompany = c.company?.toLowerCase().includes(q);
        const matchAddress = c.address?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchCompany && !matchAddress) {
          return false;
        }
      }

      return true;
    });
  }, [customers, activeTab, search, customerMetricsMap]);

  function openCustomerDrawer(customer: Customer) {
    setViewing(customer);
    setShowDrawer(true);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', confirmDelete.id);
    if (error) {
      toast('Xóa khách hàng thất bại: ' + error.message, 'error');
      return;
    }
    toast(`Đã xóa khách hàng ${confirmDelete.name}`, 'success');
    setConfirmDelete(null);
    loadData();
  }

  // Active viewing customer orders
  const viewingOrders = useMemo(() => {
    if (!viewing) return [];
    return orders.filter((o) => o.customer_id === viewing.id);
  }, [viewing, orders]);

  const viewingMetrics = useMemo(() => {
    if (!viewing) return null;
    return customerMetricsMap.get(viewing.id) ?? null;
  }, [viewing, customerMetricsMap]);

  if (loading) return <FullPageSpinner label="Đang tải dữ liệu khách hàng..." />;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-ink-100">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
            <Users className="text-brand-600" size={26} />
            Quản Lý Khách Hàng (CRM)
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Chân dung khách hàng, vòng đời giá trị (LTV), phân tầng chăm sóc &amp; lịch sử mua sắm đa kênh.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn-primary flex items-center gap-2 shadow-sm shrink-0"
          >
            <Plus size={16} />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* Top Operational Metric Strip - 4 Clean Unified White KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng khách hàng */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Khách Hàng</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{kpiStats.totalCustomers}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {tabCounts.active} đang hoạt động
            </p>
          </div>
        </div>

        {/* KPI 2: Khách VIP (Clean styling without overpowering yellow tint) */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
            <Crown size={20} className="text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Khách Hàng VIP</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{kpiStats.vipCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Chi tiêu &ge; 6.000.000 ₫
            </p>
          </div>
        </div>

        {/* KPI 3: LTV Trung bình */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LTV Trung Bình</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(kpiStats.avgLTV)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Giá trị tích lũy / khách</p>
          </div>
        </div>

        {/* KPI 4: Tỷ lệ mua lại */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
            <ShoppingBag size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tỷ Lệ Mua Lại</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{kpiStats.repeatRate}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpiStats.repeatCount} khách &ge; 2 đơn hàng</p>
          </div>
        </div>
      </div>

      {/* Quick Filter Tabs - Harmonious Neutral Active State */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-ink-100">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0',
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <span>Tất cả khách hàng</span>
          <span
            className={cn(
              'px-1.5 py-0.5 text-[11px] rounded-full font-semibold',
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {tabCounts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            'px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0',
            activeTab === 'active'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <UserCheck size={14} className={activeTab === 'active' ? 'text-emerald-400' : 'text-slate-400'} />
          <span>Đang hoạt động</span>
          <span
            className={cn(
              'px-1.5 py-0.5 text-[11px] rounded-full font-semibold',
              activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {tabCounts.active}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vip')}
          className={cn(
            'px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0',
            activeTab === 'vip'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <Crown size={14} className={activeTab === 'vip' ? 'text-amber-400' : 'text-slate-400'} />
          <span>Khách hàng VIP (&ge; 6M)</span>
          <span
            className={cn(
              'px-1.5 py-0.5 text-[11px] rounded-full font-semibold',
              activeTab === 'vip' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {tabCounts.vip}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('lead')}
          className={cn(
            'px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0',
            activeTab === 'lead'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <UserPlus size={14} className={activeTab === 'lead' ? 'text-blue-400' : 'text-slate-400'} />
          <span>Tiềm năng</span>
          <span
            className={cn(
              'px-1.5 py-0.5 text-[11px] rounded-full font-semibold',
              activeTab === 'lead' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {tabCounts.lead}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inactive')}
          className={cn(
            'px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0',
            activeTab === 'inactive'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <UserX size={14} className={activeTab === 'inactive' ? 'text-rose-400' : 'text-slate-400'} />
          <span>Ngừng hoạt động</span>
          <span
            className={cn(
              'px-1.5 py-0.5 text-[11px] rounded-full font-semibold',
              activeTab === 'inactive' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {tabCounts.inactive}
          </span>
        </button>
      </div>

      {/* Customer Grid */}
      {filtered.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Users}
            title={search ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng trong mục này'}
            description={
              search
                ? `Không có kết quả nào khớp với từ khóa "${search}". Vui lòng thử từ khóa khác.`
                : 'Thêm khách hàng mới để bắt đầu quản trị quan hệ khách hàng và tạo đơn hàng.'
            }
            action={
              !search ? (
                <button
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>Thêm khách hàng mới</span>
                </button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((customer) => {
            const metrics = customerMetricsMap.get(customer.id) ?? {
              ltv: 0,
              orderCount: 0,
              latestOrder: null,
              segment: 'new',
            };

            const isVip = metrics.segment === 'vip';
            const isLoyal = metrics.segment === 'loyal';

            return (
              <Card
                key={customer.id}
                className="p-5 hover:shadow-md transition-all duration-200 group flex flex-col justify-between border border-slate-200/90 bg-white rounded-xl"
              >
                <div>
                  {/* Top: Avatar, Name, Segment & Status Badges */}
                  <div className="flex items-start gap-3">
                    {/* Minimalist Executive Avatar (No loud yellow background or star badge) */}
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0 shadow-xs',
                        isVip
                          ? 'bg-slate-900 text-amber-300 border border-slate-800'
                          : isLoyal
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      )}
                    >
                      {initials(customer.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3
                          className="font-semibold text-slate-900 truncate text-base hover:text-brand-600 transition-colors cursor-pointer"
                          onClick={() => openCustomerDrawer(customer)}
                        >
                          {customer.name}
                        </h3>
                      </div>

                      {customer.company ? (
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <Building2 size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{customer.company}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">Khách hàng cá nhân</p>
                      )}
                    </div>

                    {/* Refined Segment Tier & Status Chip */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {isVip ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-900 text-amber-300 border border-slate-800 shadow-xs">
                          <Crown size={12} className="text-amber-400" />
                          VIP
                        </span>
                      ) : isLoyal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          <Sparkles size={11} className="text-slate-500" />
                          Thân thiết
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-normal rounded-md bg-slate-50 text-slate-500 border border-slate-200">
                          Khách mới
                        </span>
                      )}

                      <span className={cn('badge text-[10px] px-1.5 py-0.2', CUSTOMER_STATUS_COLORS[customer.status])}>
                        {CUSTOMER_STATUS_LABELS[customer.status]}
                      </span>
                    </div>
                  </div>

                  {/* Clean Financial & Order Metric Strip */}
                  <div className="mt-4 p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Tổng LTV</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                        {formatCurrency(metrics.ltv)}
                      </p>
                    </div>
                    <div className="border-x border-slate-200/60 px-1">
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Số đơn</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {metrics.orderCount} đơn
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Gần nhất</p>
                      <p className="text-xs font-medium text-slate-600 mt-0.5 truncate">
                        {metrics.latestOrder ? formatDate(metrics.latestOrder.placed_at) : 'Chưa có'}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                    {customer.phone && (
                      <p className="flex items-center gap-2 truncate">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span>{customer.phone}</span>
                      </p>
                    )}
                    {customer.email && (
                      <p className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </p>
                    )}
                    {(customer.address || customer.city) && (
                      <p className="flex items-center gap-2 truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {[customer.address, customer.city].filter(Boolean).join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer: Joined Date + Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar size={12} />
                    Tham gia: {formatDate(customer.created_at)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openCustomerDrawer(customer)}
                      className="px-2 py-1 rounded-md text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors flex items-center gap-1"
                      title="Xem hồ sơ chi tiết"
                    >
                      <Eye size={14} />
                      <span>Chi tiết</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditing(customer);
                        setShowForm(true);
                      }}
                      className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Chỉnh sửa thông tin"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(customer)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa khách hàng"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Add / Edit Customer */}
      <CustomerFormModal
        open={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          loadData();
          setShowForm(false);
        }}
      />

      {/* Drawer: Detailed Customer Profile & Orders */}
      {viewing && showDrawer && (
        <Drawer
          open={showDrawer}
          onClose={() => setShowDrawer(false)}
          title={viewing.name}
          subtitle={
            viewing.company
              ? `${viewing.company} • Mã KH: #${viewing.id.slice(-6).toUpperCase()}`
              : `Mã KH: #${viewing.id.slice(-6).toUpperCase()}`
          }
        >
          <div className="space-y-6">
            {/* Customer Avatar & Header Card */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-xs shrink-0',
                  viewingMetrics?.segment === 'vip'
                    ? 'bg-slate-900 text-amber-300 border border-slate-800'
                    : viewingMetrics?.segment === 'loyal'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                )}
              >
                {initials(viewing.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-lg truncate">{viewing.name}</h3>
                  {viewingMetrics?.segment === 'vip' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-900 text-amber-300 border border-slate-800 shadow-xs">
                      <Crown size={12} className="text-amber-400" />
                      Khách hàng VIP
                    </span>
                  ) : viewingMetrics?.segment === 'loyal' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      <Sparkles size={11} className="text-slate-500" />
                      Thân thiết
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                      Khách hàng mới
                    </span>
                  )}
                  <span className={cn('badge text-xs', CUSTOMER_STATUS_COLORS[viewing.status])}>
                    {CUSTOMER_STATUS_LABELS[viewing.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  Ngày đăng ký: {formatDate(viewing.created_at)}
                </p>
              </div>
            </div>

            {/* Quick Financial Metrics Inside Drawer */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-center shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Tổng Chi Tiêu (LTV)</p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {formatCurrency(viewingMetrics?.ltv ?? 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-center shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Đơn Đã Mua</p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {viewingOrders.length} đơn hàng
                </p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-center shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Giá Trị Đơn TB (AOV)</p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {formatCurrency(
                    viewingOrders.length > 0 ? (viewingMetrics?.ltv ?? 0) / viewingOrders.length : 0
                  )}
                </p>
              </div>
            </div>

            {/* Contact Details Card */}
            <Card className="p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Thông Tin Liên Hệ &amp; Nhận Hàng
              </p>
              {viewing.phone && (
                <DetailRow icon={Phone} label="Số điện thoại" value={viewing.phone} />
              )}
              {viewing.email && (
                <DetailRow icon={Mail} label="Địa chỉ email" value={viewing.email} />
              )}
              {viewing.company && (
                <DetailRow icon={Building2} label="Công ty / Tổ chức" value={viewing.company} />
              )}
              {(viewing.address || viewing.city || viewing.state) && (
                <DetailRow
                  icon={MapPin}
                  label="Địa chỉ giao hàng"
                  value={[
                    viewing.address,
                    [viewing.city, viewing.state, viewing.postal_code].filter(Boolean).join(', '),
                    viewing.country,
                  ]
                    .filter(Boolean)
                    .join('\n')}
                />
              )}
              {viewing.notes && (
                <div className="pt-2.5 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-1">Ghi chú nội bộ CRM</p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-2 rounded-md">
                    {viewing.notes}
                  </p>
                </div>
              )}
            </Card>

            {/* Order History */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-slate-500" />
                  Lịch Sử Đơn Hàng ({viewingOrders.length})
                </p>
                {viewingOrders.length > 0 && (
                  <span className="text-xs font-semibold text-slate-900">
                    Tổng: {formatCurrency(viewingMetrics?.ltv ?? 0)}
                  </span>
                )}
              </div>

              {viewingOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Khách hàng chưa phát sinh đơn hàng nào trên hệ thống.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {viewingOrders.map((order) => {
                    const channelKey = (order.channel || 'shopee') as Channel;
                    return (
                      <div
                        key={order.id}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              #{order.order_number}
                            </span>
                            <span
                              className={cn(
                                'px-1.5 py-0.5 text-[10px] font-medium rounded border',
                                CHANNEL_COLORS[channelKey] || 'bg-slate-100 text-slate-700 border-slate-200'
                              )}
                            >
                              {CHANNEL_LABELS[channelKey] || order.channel}
                            </span>
                            <span
                              className={cn(
                                'badge text-[10px] py-0',
                                ORDER_STATUS_COLORS[order.status]
                              )}
                            >
                              {ORDER_STATUS_LABELS[order.status] || order.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDateTime(order.placed_at)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-slate-900">
                            {formatCurrency(Number(order.total))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </Drawer>
      )}

      {/* Modal: Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa khách hàng?"
        message={`Hệ thống sẽ xóa vĩnh viễn hồ sơ của "${confirmDelete?.name}". Thông tin lịch sử mua hàng và chăm sóc CRM liên quan có thể bị ảnh hưởng. Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa vĩnh viễn"
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
        <p className="text-xs text-slate-800 whitespace-pre-wrap mt-0.5">{value}</p>
      </div>
    </div>
  );
}

interface CustomerFormModalProps {
  open: boolean;
  editing: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

function CustomerFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: CustomerFormModalProps) {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomerInput>({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Việt Nam',
    status: 'active',
    tier: 'standard',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          email: editing.email ?? '',
          phone: editing.phone ?? '',
          company: editing.company ?? '',
          address: editing.address ?? '',
          city: editing.city ?? '',
          state: editing.state ?? '',
          postal_code: editing.postal_code ?? '',
          country: editing.country || 'Việt Nam',
          status: editing.status,
          tier: editing.tier || 'standard',
          notes: editing.notes ?? '',
        });
      } else {
        setForm({
          name: '',
          email: '',
          phone: '',
          company: '',
          address: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'Việt Nam',
          status: 'active',
          tier: 'standard',
          notes: '',
        });
      }
    }
  }, [open, editing]);

  async function handleSave() {
    if (!form.name.trim()) {
      toast('Vui lòng nhập họ và tên khách hàng', 'error');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast('Địa chỉ email không đúng định dạng', 'error');
      return;
    }
    if (form.phone && !/^[0-9+\s-()]{7,15}$/.test(form.phone)) {
      toast('Số điện thoại không đúng định dạng (7-15 chữ số)', 'error');
      return;
    }
    setSaving(true);
    const payload: CustomerInput & { tenant_id?: string } = {
      tenant_id: activeTenant?.id,
      ...form,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      company: form.company?.trim() || null,
      address: form.address?.trim() || null,
      city: form.city?.trim() || null,
      state: form.state?.trim() || null,
      postal_code: form.postal_code?.trim() || null,
      notes: form.notes?.trim() || null,
    };

    try {
      if (editing) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editing.id);
        if (error) {
          toast('Cập nhật khách hàng thất bại: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        toast(`Đã cập nhật thông tin khách hàng ${form.name}`, 'success');
      } else {
        const { error } = await supabase.from('customers').insert(payload);
        if (error) {
          toast('Tạo khách hàng thất bại: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        toast(`Đã thêm khách hàng ${form.name} thành công`, 'success');
      }
      setSaving(false);
      onSaved();
    } catch (e: any) {
      toast('Đã xảy ra lỗi: ' + (e?.message || 'Không xác định'), 'error');
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Chỉnh Sửa Thông Tin Khách Hàng' : 'Thêm Khách Hàng Mới'}
      subtitle={
        editing
          ? 'Cập nhật thông tin hồ sơ, liên hệ và phân tầng khách hàng'
          : 'Nhập thông tin hồ sơ khách hàng mới vào hệ thống CRM'
      }
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Hủy bỏ
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
            {saving && <Spinner size={15} />}
            <span>{editing ? 'Lưu thay đổi' : 'Thêm khách hàng'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Row 1: Name & Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Họ và tên *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ví dụ: Hoàng Minh Tâm"
              className="input"
            />
          </div>
          <div>
            <label className="label">Công ty / Cơ quan</label>
            <input
              value={form.company ?? ''}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Ví dụ: Công ty TNHH Truyền Thông"
              className="input"
            />
          </div>
        </div>

        {/* Row 2: Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Địa chỉ email</label>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="example@domain.com"
              className="input"
            />
          </div>
          <div>
            <label className="label">Số điện thoại</label>
            <input
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0912 345 678"
              className="input"
            />
          </div>
        </div>

        {/* Row 3: Address */}
        <div>
          <label className="label">Địa chỉ đường / số nhà</label>
          <input
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Số 45 Lê Duẩn, Hoàn Kiếm"
            className="input"
          />
        </div>

        {/* Row 4: City / State / Postal / Country */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Quận / Huyện</label>
            <input
              value={form.city ?? ''}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Hoàn Kiếm"
              className="input"
            />
          </div>
          <div>
            <label className="label">Tỉnh / TP</label>
            <input
              value={form.state ?? ''}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="Hà Nội"
              className="input"
            />
          </div>
          <div>
            <label className="label">Mã bưu chính</label>
            <input
              value={form.postal_code ?? ''}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              placeholder="100000"
              className="input"
            />
          </div>
          <div>
            <label className="label">Quốc gia</label>
            <input
              value={form.country ?? ''}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Việt Nam"
              className="input"
            />
          </div>
        </div>

        {/* Row 5: Status & Tier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Trạng thái hoạt động</label>
            <div className="flex flex-col gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all',
                    form.status === opt.value
                      ? 'border-brand-500 bg-brand-50/50 text-brand-900 font-medium'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <input
                    type="radio"
                    name="customer_status"
                    checked={form.status === opt.value}
                    onChange={() => setForm({ ...form, status: opt.value })}
                    className="accent-brand-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Hạng thành viên (Tier)</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TIER_OPTIONS.map((tier) => (
                <label
                  key={tier.value}
                  className={cn(
                    'flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer transition-all',
                    form.tier === tier.value
                      ? 'border-slate-900 bg-slate-900 text-amber-300 font-medium shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <input
                    type="radio"
                    name="customer_tier"
                    checked={form.tier === tier.value}
                    onChange={() => setForm({ ...form, tier: tier.value })}
                    className="accent-slate-900"
                  />
                  <span>{tier.icon}</span>
                  <span className="truncate">{tier.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Row 6: Internal CRM Notes */}
        <div>
          <label className="label">Ghi chú nội bộ CRM</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Ghi chú sở thích, thói quen mua sắm hoặc yêu cầu đặc biệt của khách hàng..."
            className="input"
          />
        </div>
      </div>
    </Modal>
  );
}
