import { isMockMode } from '@/lib/config';
import React, { useState, useMemo } from 'react';
import {
  SquaresFour,
  Pulse,
  ShoppingBag,
  Truck,
  ArrowUUpLeft,
  Users,
  Warehouse,
  ArrowsLeftRight,
  Receipt,
  Percent,
  ChartBar,
  Wallet,
  Calculator,
  PlugsConnected,
  SignOut,
  CaretLeft,
  CaretRight,
  type Icon as PhosphorIcon
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/AuthProvider';
import { getAllowedPagesForRole } from '@/lib/permissions';
import type { TenantRole } from '@/types';
import { NAVIGATION_GROUPS } from '@/app/navigation';
import type { PageId } from '@/app/types';

const PAGE_ICONS: Record<PageId, PhosphorIcon> = {
  dashboard: SquaresFour,
  inventory: Warehouse,
  orders: ShoppingBag,
  fulfillment: Truck,
  returns: ArrowUUpLeft,
  customers: Users,
  orderEconomics: Receipt,
  skuEconomics: Percent,
  channelEconomics: ChartBar,
  cashWorkingCapital: Wallet,
  pricingCalculator: Calculator,
  channelConnections: PlugsConnected,
  channelMapping: ArrowsLeftRight,
  simulator: Pulse,
};

export type { PageId } from '@/app/types';

interface SidebarProps {
  current: PageId;
  onNavigate: (pageId: PageId) => void;
  stats: { pendingOrders: number; lowStock: number };
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const ROLE_LABELS: Record<TenantRole, string> = {
  owner: '👑 Chủ Doanh Nghiệp',
  admin: 'Chủ doanh nghiệp (Admin)',
  manager: '📊 Trưởng Phòng OMS',
  warehouse: '📦 Nhân Viên Kho',
  finance: '💰 Kế Toán Tài Chính',
  growth: '🚀 Tăng Trưởng & Ads',
  viewer: '👁️ Người Xem (Chỉ Đọc)',
};

export function Sidebar({ current, onNavigate, stats, mobileOpen, onMobileClose }: SidebarProps) {
  const { profile, signOut, activeRole } = useAuth();
  const currentRole: TenantRole = activeRole ?? 'owner';

  // Persistent sidebar collapse state (True: icon-only mini sidebar, False: full expanded sidebar)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nexus_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nexus_sidebar_collapsed', String(next));
      } catch {
        // Keep the current layout when browser storage is unavailable.
      }
      // Fire window resize so all responsive charts immediately adapt to the expanded canvas
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 310);
      return next;
    });
  };

  const allowedPages = useMemo(
    () => new Set(getAllowedPagesForRole(isMockMode() ? currentRole : activeRole, !isMockMode())),
    [currentRole, activeRole]
  );

  const filteredGroups = useMemo(() => {
    return NAVIGATION_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => allowedPages.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [allowedPages]);



  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'shrink-0 bg-sidebar-gradient text-slate-100 flex flex-col h-screen overflow-y-auto overflow-x-hidden fixed lg:sticky top-0 z-50 transition-all duration-300 font-sans border-r border-white/5 shadow-2xl',
          isCollapsed ? 'w-[68px]' : 'w-56',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="relative px-3 py-3.5 border-b border-white/5 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] border border-white/10 flex items-center justify-center shadow-md shrink-0">
                  <Warehouse size={18} weight="duotone" className="text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-[15px] font-black text-white tracking-tight truncate block">NexusOMS</span>
                  <p className="text-[10.5px] text-[#38BDF8] font-semibold flex items-center gap-1 truncate">
                    FCAJ MVP Prototype
                  </p>
                </div>
              </div>

              {/* Collapse Button (Chevron Left - Matching Image 1) */}
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Thu gọn menu"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
            </div>
          ) : (
            /* Collapsed Header: Centered Expand Button (Chevron Right - Matching Image 2) */
            <div className="flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={toggleCollapse}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-xs cursor-pointer"
                title="Mở rộng menu"
              >
                <CaretRight size={17} weight="bold" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="relative flex-1 px-2 py-3 space-y-2.5">
          {filteredGroups.map((group, groupIdx) => (
            <div key={group.label}>
              {/* Group Label / Separator */}
              {!isCollapsed ? (
                <p className="px-2 text-[11px] font-bold text-slate-400/90 uppercase tracking-wider mb-1 font-mono">
                  {group.label}
                </p>
              ) : (
                groupIdx > 0 && <div className="my-2 border-t border-white/10 mx-1.5" />
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = current === item.id;
                  const Icon = PAGE_ICONS[item.id];
                  const badge =
                    item.id === 'orders'
                       ? stats.pendingOrders > 0
                        ? `${stats.pendingOrders}`
                        : undefined
                      : item.id === 'inventory'
                      ? stats.lowStock > 0
                        ? `${stats.lowStock}`
                        : undefined
                      : undefined;

                  // 1. Expanded Menu Item View
                  if (!isCollapsed) {
                    return (
                      <button
                        data-nav={item.id} key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          onMobileClose();
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13.5px] transition-all duration-150 cursor-pointer group',
                          active
                            ? 'bg-gradient-to-r from-[#0284C7] to-[#0369A1] text-white shadow-md shadow-sky-950/40 font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-white/[0.08] font-medium'
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            size={19}
                            weight={active ? 'bold' : 'regular'}
                            className={cn(
                              'shrink-0 transition-colors',
                              active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {badge && (
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-full font-bold font-mono shrink-0',
                              active
                                ? 'bg-white/20 text-white'
                                : item.id === 'orders'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : item.id === 'inventory'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-[#1E647F]/30 text-teal-300 border border-[#1E647F]/40'
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  }

                  // 2. Collapsed Mini Menu Item View (Centered Icon with Hover Tooltip)
                  return (
                    <div data-nav={item.id} key={item.id} className="relative group flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(item.id);
                          onMobileClose();
                        }}
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer relative',
                          active
                            ? 'bg-gradient-to-r from-[#0284C7] to-[#0369A1] text-white shadow-md shadow-sky-950/40'
                            : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                        )}
                        title={item.label}
                      >
                        <Icon
                          size={20}
                          weight={active ? 'bold' : 'regular'}
                          className={cn(
                            'shrink-0 transition-colors',
                            active ? 'text-white' : 'text-slate-300 group-hover:text-white'
                          )}
                        />

                        {badge && (
                          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#102A41]">
                            {badge}
                          </span>
                        )}
                      </button>

                      {/* Floating Tooltip to the right on hover */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-[#0C2438] text-white text-xs font-semibold whitespace-nowrap shadow-2xl border border-white/15 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        {item.label}
                        {badge && <span className="ml-1.5 text-sky-300 font-bold">({badge})</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2.5 border-t border-white/5 shrink-0">
          {!isCollapsed ? (
            /* Expanded Footer: User Avatar + Name + Role + Logout Button */
            <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div
                className="flex items-center gap-2 min-w-0 text-left flex-1 group"
                title={ROLE_LABELS[currentRole]}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0284C7]/60 to-[#0369A1] border border-[#0284C7]/60 flex items-center justify-center font-bold text-sky-200 text-xs shrink-0 group-hover:border-sky-400 transition-colors">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">
                    {profile?.full_name || 'Phan Phúc Thịnh'}
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-[#38BDF8] truncate font-medium">
                      {ROLE_LABELS[currentRole]}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                title="Đăng xuất"
              >
                <SignOut size={16} />
              </button>
            </div>
          ) : (
            /* Collapsed Footer: Centered Avatar Icon + Logout Icon */
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0284C7]/60 to-[#0369A1] border border-[#0284C7]/60 flex items-center justify-center font-bold text-sky-200 text-xs hover:border-sky-400 transition-colors"
                title={ROLE_LABELS[currentRole]}
              >
                {profile?.full_name?.charAt(0) || 'U'}
              </div>

              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <SignOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
