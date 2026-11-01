import { OperationsThresholds } from './OperationsThresholds';
import { ScopeSettings } from '@/pages/workQueue/ScopeSettings';
import { useEffect, useState, useMemo } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Users as UsersIcon,
  Warehouse as WarehouseIcon,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  UserPlus,
  CheckCircle2,
  XCircle,
  Lock,
  Eye,
  KeyRound,
  Layers,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { useRole, useAuth } from '@/providers/AuthProvider';
import type { Profile, UserRole, Warehouse } from '@/types';

interface SettingsPageProps {
  search?: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên (Admin)',
  manager: 'Quản lý (Manager)',
  warehouse: 'Thủ kho (Warehouse)',
  owner: 'Chủ sở hữu (Owner)',
  finance: 'Tài chính (Finance)',
  growth: 'Tăng trưởng (Growth)',
  viewer: 'Người xem (Viewer)',
};

const ROLE_COLORS: Record<UserRole, { badge: string; pill: string }> = {
  admin: {
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    pill: 'bg-rose-500',
  },
  manager: {
    badge: 'bg-blue-50 text-blue-800 border-blue-200',
    pill: 'bg-blue-500',
  },
  warehouse: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pill: 'bg-emerald-500',
  },
  owner: {
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    pill: 'bg-indigo-500',
  },
  finance: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    pill: 'bg-amber-500',
  },
  growth: {
    badge: 'bg-violet-50 text-violet-800 border-violet-200',
    pill: 'bg-violet-500',
  },
  viewer: {
    badge: 'bg-slate-50 text-slate-800 border-slate-200',
    pill: 'bg-slate-500',
  },
};

type ActiveTab = 'users' | 'matrix' | 'warehouses';

// Permission Matrix Definition for Enterprise OMS
interface PermissionRow {
  module: string;
  action: string;
  admin: boolean;
  manager: boolean;
  warehouse: boolean;
  description: string;
}

const PERMISSION_MATRIX: PermissionRow[] = [
  {
    module: 'Đơn Hàng (Orders)',
    action: 'Tạo & Duyệt đơn hàng',
    admin: false,
    manager: true,
    warehouse: false,
    description: 'Tạo đơn mới, chỉnh sửa thông tin giao nhận và xác nhận đơn',
  },
  {
    module: 'Đơn Hàng (Orders)',
    action: 'Đóng gói & Xuất kho (Fulfillment)',
    admin: false,
    manager: true,
    warehouse: true,
    description: 'In phiếu nhặt hàng (Pick/Pack), gán mã vận đơn và bàn giao shipper',
  },
  {
    module: 'Đổi Trả & RMA',
    action: 'Tiếp nhận & Kiểm định QC hàng hoàn',
    admin: false,
    manager: true,
    warehouse: true,
    description: 'Đánh giá hàng đạt (Restock) hoặc hư hỏng (Scrap) tại dock hoàn',
  },
  {
    module: 'Đổi Trả & RMA',
    action: 'Đối soát phí / ghi nhận refund nguồn',
    admin: false,
    manager: true,
    warehouse: false,
    description: 'Ghi nhận kết quả sàn mô phỏng, đối soát phí và khoản hoàn; không phải chi tiền thật',
  },
  {
    module: 'Kho Bãi (Inventory)',
    action: 'Biến động tồn & Chuyển kho liên tỉnh',
    admin: false,
    manager: true,
    warehouse: true,
    description: 'Nhập xuất tồn, điều chuyển In-transit và nghiệm thu hàng PO',
  },
  {
    module: 'Tài Chính & P&L',
    action: 'Xem báo cáo Dòng tiền & Lợi nhuận SKU',
    admin: false,
    manager: true,
    warehouse: false,
    description: 'Truy cập P&L ròng, đối soát tiền sàn và chi phí quảng cáo Ads',
  },
  {
    module: 'Hệ Thống & Bảo Mật',
    action: 'Quản lý Người dùng & Cấu hình Tenant',
    admin: true,
    manager: false,
    warehouse: false,
    description: 'Thêm xóa tài khoản, phân quyền vai trò và xóa dữ liệu cốt lõi',
  },
];

export function SettingsPage({ search = '' }: SettingsPageProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up font-sans">
      {/* 1. Header */}
      <PageHeader
        icon={ShieldCheck}
        title="Cài Đặt & Phân Quyền Hệ Thống"
        subtitle="Quản lý tài khoản người dùng, ma trận phân quyền chi tiết (RBAC) và danh mục kho bãi chi nhánh"
        badge={
          <span className="badge bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold">
            Enterprise RBAC &amp; Warehouse Setup
          </span>
        }
      />

      <OperationsThresholds/>
      <ScopeSettings onResult={r => toast(r.success ? 'Đã lưu phạm vi' : r.error || 'Không thể lưu', r.success ? 'success' : 'error')}/>
      {/* 2. Top Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer',
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          <UsersIcon size={15} />
          <span>Người Dùng &amp; Vai Trò</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer',
            activeTab === 'matrix'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          <Lock size={15} />
          <span>Ma Trận Phân Quyền (RBAC Matrix)</span>
        </button>

        <button
          onClick={() => setActiveTab('warehouses')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer',
            activeTab === 'warehouses'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )}
        >
          <WarehouseIcon size={15} />
          <span>Kho Bãi &amp; Chi Nhánh Lưu Trữ</span>
        </button>
      </div>

      {/* 3. Tab Contents */}
      {activeTab === 'users' && <UsersTab search={search} />}
      {activeTab === 'matrix' && <PermissionMatrixTab />}
      {activeTab === 'warehouses' && <WarehousesTab search={search} />}
    </div>
  );
}

// ==========================================
// TAB 1: NGƯỜI DÙNG & TÀI KHOẢN (USERS TAB)
// ==========================================
function UsersTab({ search }: { search: string }) {
  const toast = useToast();
  const { isAdmin } = useRole();
  const { activeTenant } = useAuth();
  const tenantId = activeTenant?.id;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast('Lỗi khi tải danh sách người dùng', 'error');
      setProfiles([]);
    } else {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      const q = (localSearch || search).trim().toLowerCase();
      if (!q) return true;
      return (
        p.email.toLowerCase().includes(q) ||
        p.full_name.toLowerCase().includes(q)
      );
    });
  }, [profiles, search, localSearch, roleFilter]);

  async function toggleActive(p: Profile) {
    const nextState = !p.is_active;
    const { error } = await supabase.rpc('admin_update_profile', {
      p_user_id: p.id,
      p_role: p.role,
      p_is_active: nextState,
      p_tenant_id: tenantId,
    });
    if (error) {
      toast('Cập nhật trạng thái thất bại: ' + error.message, 'error');
      return;
    }
    toast(
      `✓ Đã ${nextState ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản của ${p.full_name}`,
      'success'
    );
    load();
  }

  async function changeRole(p: Profile, newRole: UserRole) {
    if (newRole === p.role) return;
    const { error } = await supabase.rpc('admin_update_profile', {
      p_user_id: p.id,
      p_role: newRole,
      p_is_active: p.is_active,
      p_tenant_id: tenantId,
    });
    if (error) {
      toast('Đổi vai trò thất bại: ' + error.message, 'error');
      return;
    }
    toast(`✓ Đã cập nhật vai trò ${p.full_name} sang ${ROLE_LABELS[newRole]}`, 'success');
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const managerCount = profiles.filter((p) => p.role === 'manager').length;
  const warehouseCount = profiles.filter((p) => p.role === 'warehouse').length;

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards for Roles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          onClick={() => setRoleFilter(roleFilter === 'admin' ? 'all' : 'admin')}
          className={cn(
            'p-4 rounded-xl border bg-white shadow-2xs cursor-pointer transition-all hover:border-slate-300 flex items-center justify-between',
            roleFilter === 'admin' ? 'border-rose-400 ring-2 ring-rose-400/20' : 'border-slate-200'
          )}
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 block">Quản Trị Viên (Admin)</span>
            <span className="text-2xl font-bold text-slate-900">{adminCount}</span>
            <p className="text-[11px] text-slate-400">Toàn quyền kiểm soát hệ thống</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <Shield size={20} />
          </div>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'manager' ? 'all' : 'manager')}
          className={cn(
            'p-4 rounded-xl border bg-white shadow-2xs cursor-pointer transition-all hover:border-slate-300 flex items-center justify-between',
            roleFilter === 'manager' ? 'border-blue-400 ring-2 ring-blue-400/20' : 'border-slate-200'
          )}
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 block">Quản Lý Vận Hành (Manager)</span>
            <span className="text-2xl font-bold text-slate-900">{managerCount}</span>
            <p className="text-[11px] text-slate-400">Duyệt đơn, kiểm soát P&amp;L</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <SettingsIcon size={20} />
          </div>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'warehouse' ? 'all' : 'warehouse')}
          className={cn(
            'p-4 rounded-xl border bg-white shadow-2xs cursor-pointer transition-all hover:border-slate-300 flex items-center justify-between',
            roleFilter === 'warehouse' ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-slate-200'
          )}
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 block">Nhân Viên Kho (Warehouse)</span>
            <span className="text-2xl font-bold text-slate-900">{warehouseCount}</span>
            <p className="text-[11px] text-slate-400">Đóng gói, nhặt hàng &amp; nhận QC</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UsersIcon size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Filter size={13} className="text-slate-400" />
              Lọc theo vai trò:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
            >
              <option value="all">Tất cả vai trò ({profiles.length})</option>
              <option value="admin">Quản trị viên (Admin)</option>
              <option value="manager">Quản lý (Manager)</option>
              <option value="warehouse">Nhân viên kho (Warehouse)</option>
            </select>
          </div>

          {(roleFilter !== 'all' || localSearch) && (
            <button
              onClick={() => {
                setRoleFilter('all');
                setLocalSearch('');
              }}
              className="text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg border border-dashed border-slate-300 transition-colors flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-56">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full text-xs py-1.5 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus size={14} />
              <span>Thêm người dùng</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
          <EmptyState
            icon={UsersIcon}
            title={localSearch || roleFilter !== 'all' ? 'Không tìm thấy tài khoản phù hợp' : 'Chưa có tài khoản nào'}
            description="Hãy điều chỉnh bộ lọc hoặc tạo tài khoản nhân sự mới để bắt đầu phân quyền."
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[750px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3 px-4 text-left font-semibold">Nhân Sự</th>
                  <th className="py-3 px-4 text-left font-semibold">Email Đăng Nhập</th>
                  <th className="py-3 px-4 text-left font-semibold">Phân Quyền Vai Trò</th>
                  <th className="py-3 px-4 text-center font-semibold">Trạng Thái</th>
                  <th className="py-3 px-4 text-left font-semibold">Thời Gian Tạo</th>
                  <th className="py-3 px-4 text-right font-semibold">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filtered.map((p) => {
                  const roleStyle = ROLE_COLORS[p.role] || ROLE_COLORS.warehouse;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs shrink-0">
                            {p.full_name.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{p.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {p.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">{p.email}</td>

                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <select
                            value={p.role}
                            onChange={(e) => changeRole(p, e.target.value as UserRole)}
                            className={cn(
                              'text-xs font-semibold rounded-lg border px-2.5 py-1 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                              roleStyle.badge
                            )}
                          >
                            <option value="admin">Quản trị viên (Admin)</option>
                            <option value="manager">Quản lý (Manager)</option>
                            <option value="warehouse">Nhân viên kho (Warehouse)</option>
                          </select>
                        ) : (
                          <span className={cn('badge text-[11px] font-semibold border px-2 py-0.5 rounded-md', roleStyle.badge)}>
                            {ROLE_LABELS[p.role]}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            'badge text-[10px] font-bold border px-2 py-0.5 rounded-md inline-flex items-center gap-1',
                            p.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', p.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                          <span>{p.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {formatDateTime(p.created_at)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isAdmin && (
                          <button
                            onClick={() => toggleActive(p)}
                            className={cn(
                              'px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer',
                              p.is_active
                                ? 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                            )}
                          >
                            {p.is_active ? 'Khóa tài khoản' : 'Kích hoạt lại'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateForm && (
        <CreateUserModal
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSaved={() => {
            load();
            setShowCreateForm(false);
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// TAB 2: MA TRẬN PHÂN QUYỀN (PERMISSION MATRIX)
// ==========================================
function PermissionMatrixTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <KeyRound size={16} className="text-brand-600" />
              <span>Ma Trận Quyền Hạn Chi Tiết Theo Phân Hệ (Role-Based Access Matrix)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy định rõ ràng ranh giới nghiệp vụ giữa Admin, Quản lý vận hành và Nhân viên kho
            </p>
          </div>
          <span className="badge bg-indigo-50 text-indigo-800 border-indigo-200 text-xs font-semibold">
            Strict Enforcement
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[750px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50/70">
                <th className="py-3 px-4 text-left font-semibold">Phân Hệ (Module)</th>
                <th className="py-3 px-4 text-left font-semibold">Nghiệp Vụ Thao Tác</th>
                <th className="py-3 px-3 text-center font-semibold text-rose-800 bg-rose-50/40 w-28">
                  Admin
                </th>
                <th className="py-3 px-3 text-center font-semibold text-blue-800 bg-blue-50/40 w-28">
                  Manager
                </th>
                <th className="py-3 px-3 text-center font-semibold text-emerald-800 bg-emerald-50/40 w-28">
                  Warehouse
                </th>
                <th className="py-3 px-4 text-left font-semibold">Ghi Chú Ràng Buộc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {PERMISSION_MATRIX.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{row.module}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{row.action}</td>

                  {/* Admin Column */}
                  <td className="py-3 px-3 text-center bg-rose-50/20">
                    {row.admin ? (
                      <span className="inline-flex items-center text-emerald-600">
                        <CheckCircle2 size={16} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-slate-300">
                        <XCircle size={16} />
                      </span>
                    )}
                  </td>

                  {/* Manager Column */}
                  <td className="py-3 px-3 text-center bg-blue-50/20">
                    {row.manager ? (
                      <span className="inline-flex items-center text-emerald-600">
                        <CheckCircle2 size={16} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-slate-300">
                        <XCircle size={16} />
                      </span>
                    )}
                  </td>

                  {/* Warehouse Column */}
                  <td className="py-3 px-3 text-center bg-emerald-50/20">
                    {row.warehouse ? (
                      <span className="inline-flex items-center text-emerald-600">
                        <CheckCircle2 size={16} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-slate-300">
                        <XCircle size={16} />
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-500 leading-relaxed">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB 3: KHO BÃI & CHI NHÁNH (WAREHOUSES TAB)
// ==========================================
function WarehousesTab({ search }: { search: string }) {
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Warehouse | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('warehouses').select('*').order('priority');
    setWarehouses((data ?? []) as Warehouse[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = warehouses.filter(
    (w) =>
      !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.code.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase.from('warehouses').delete().eq('id', confirmDelete.id);
    if (error) {
      toast('Không thể xóa: Kho này hiện đang có tồn kho hoặc dữ liệu đơn hàng liên kết', 'error');
      return;
    }
    toast(`✓ Đã xóa kho ${confirmDelete.name} thành công`, 'success');
    setConfirmDelete(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-slate-500">
          Hiện có <strong>{warehouses.length} chi nhánh kho bãi</strong> đang cấu hình
        </p>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} /> <span>Thêm kho mới</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
          <EmptyState
            icon={WarehouseIcon}
            title={search ? 'Không tìm thấy kho phù hợp' : 'Chưa có kho hàng nào'}
            description="Hãy bấm '+ Thêm kho mới' để thiết lập trung tâm hoàn tất đơn hàng."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((wh) => (
            <div
              key={wh.id}
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <WarehouseIcon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{wh.name}</h3>
                      <span className="font-mono text-xs font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/60 inline-block mt-0.5">
                        {wh.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditing(wh);
                        setShowForm(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Chỉnh sửa thông tin kho"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(wh)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa kho"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {wh.address && (
                  <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5 leading-relaxed">
                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{wh.address}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                <span className="badge bg-slate-100 text-slate-600 border-slate-200 text-[11px] font-semibold">
                  Độ ưu tiên: P{wh.priority}
                </span>
                <span
                  className={cn(
                    'badge text-[10px] font-bold border px-2 py-0.5 rounded-md inline-flex items-center gap-1',
                    wh.is_active
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', wh.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                  <span>{wh.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <WarehouseFormModal
          open={showForm}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            load();
            setShowForm(false);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa kho bãi?"
        message={`Bạn có chắc chắn muốn xóa kho "${confirmDelete?.name}"? Hệ thống sẽ chặn xóa nếu kho này đang có hàng tồn hoặc dính líu đến đơn hàng.`}
        confirmLabel="Xác nhận xóa"
      />
    </div>
  );
}

// ==========================================
// MODAL: TẠO TÀI KHOẢN NGƯỜI DÙNG MỚI
// ==========================================
function CreateUserModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const tenantId = activeTenant?.id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'warehouse' as UserRole,
  });

  useEffect(() => {
    if (open) {
      setForm({ email: '', password: '', fullName: '', role: 'warehouse' });
    }
  }, [open]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.fullName) {
      toast('Vui lòng điền đầy đủ các trường bắt buộc', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_email: form.email.trim(),
        p_password: form.password,
        p_full_name: form.fullName.trim(),
        p_role: form.role,
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      toast(`✓ Đã tạo thành công tài khoản cho ${form.fullName}`, 'success');
      onSaved();
    } catch (err: any) {
      toast('Tạo người dùng thất bại: ' + (err.message || err), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm Người Dùng Mới Vào Hệ Thống"
      subtitle="Cấp tài khoản và chỉ định vai trò phân quyền hoạt động"
    >
      <form onSubmit={handleCreate} className="p-4 sm:p-5 space-y-4 text-xs font-sans">
        <div>
          <label className="font-semibold block text-slate-700 mb-1">Họ và tên nhân sự *</label>
          <input
            type="text"
            required
            placeholder="Ví dụ: Nguyễn Văn Hùng"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="font-semibold block text-slate-700 mb-1">Email đăng nhập *</label>
          <input
            type="email"
            required
            placeholder="hung.nguyen@dreamterus.vn"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="font-semibold block text-slate-700 mb-1">Mật khẩu khởi tạo *</label>
          <input
            type="password"
            required
            placeholder="Tối thiểu 6 ký tự..."
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="font-semibold block text-slate-700 mb-1">Phân quyền vai trò (Role) *</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
          >
            <option value="warehouse">Nhân viên kho (Warehouse) — Xử lý đơn, tồn kho &amp; QC</option>
            <option value="manager">Quản lý (Manager) — Duyệt đơn, giá bán &amp; xem P&amp;L</option>
            <option value="admin">Quản trị viên (Admin) — Toàn quyền kiểm soát hệ thống</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary text-xs px-3.5 py-2">
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
          >
            {saving ? <Spinner size={14} /> : <UserPlus size={14} />}
            <span>Tạo người dùng</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ==========================================
// MODAL: FORM THÊM / SỬA KHO HÀNG
// ==========================================
interface WarehouseFormProps {
  open: boolean;
  editing: Warehouse | null;
  onClose: () => void;
  onSaved: () => void;
}

function WarehouseFormModal({ open, editing, onClose, onSaved }: WarehouseFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    address: '',
    priority: 1,
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              code: editing.code,
              name: editing.name,
              address: editing.address ?? '',
              priority: editing.priority,
              is_active: editing.is_active,
            }
          : { code: '', name: '', address: '', priority: 1, is_active: true }
      );
    }
  }, [open, editing]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Vui lòng nhập tên kho', 'error');
      return;
    }
    if (!form.code.trim()) {
      toast('Vui lòng nhập mã kho', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      address: form.address.trim() || null,
      priority: Number(form.priority) || 1,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from('warehouses').update(payload).eq('id', editing.id);
      if (error) {
        toast('Cập nhật thất bại: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      toast('✓ Đã cập nhật thông tin kho thành công', 'success');
    } else {
      const { error } = await supabase.from('warehouses').insert(payload);
      if (error) {
        toast(error.code === '23505' ? 'Mã kho đã tồn tại' : 'Tạo kho thất bại: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      toast('✓ Đã khởi tạo kho mới thành công', 'success');
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Chỉnh Sửa Kho Hàng' : 'Thêm Chi Nhánh Kho Mới'}
      subtitle={editing ? 'Cập nhật địa chỉ và độ ưu tiên gán đơn' : 'Thiết lập kho bãi để điều phối tồn kho & đơn hàng'}
    >
      <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 text-xs font-sans">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="font-semibold block text-slate-700 mb-1">Mã kho (Code) *</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Ví dụ: WH-HN, WH-HCM"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="font-semibold block text-slate-700 mb-1">Tên kho *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Kho Tổng Miền Bắc (Hà Nội)"
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold block text-slate-700 mb-1">Địa chỉ chi tiết</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Số nhà, đường, quận huyện, tỉnh thành..."
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="font-semibold block text-slate-700 mb-1">Độ ưu tiên gán đơn (Priority)</label>
            <input
              type="number"
              min={1}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 1 })}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">1 là mức ưu tiên cao nhất</span>
          </div>

          <div>
            <label className="font-semibold block text-slate-700 mb-1">Trạng thái kho</label>
            <select
              value={form.is_active ? 'active' : 'inactive'}
              onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
            >
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm ngưng nhận đơn</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary text-xs px-3.5 py-2">
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
          >
            {saving ? <Spinner size={14} /> : <Plus size={14} />}
            <span>{editing ? 'Lưu thay đổi' : 'Tạo kho'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
