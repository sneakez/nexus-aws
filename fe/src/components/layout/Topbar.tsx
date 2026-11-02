import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, ChevronDown, Building2, Check, Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/AuthProvider';

interface TopbarProps {
  title: string;
  subtitle: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  onMobileMenu?: () => void;
  onNavigate?: (pageId: string) => void;
  showSearch?: boolean;
}

interface NotificationItem {
  id: string;
  type: 'sla' | 'stock' | 'settlement';
  title: string;
  description: string;
  time: string;
  read: boolean;
  targetPage?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    type: 'sla',
    title: '2 đơn hàng sắp chạm hạn SLA đóng gói',
    description: 'Đơn #ORD-2026-1002 và #ORD-2026-1004 cần xuất kho trước 18:00.',
    time: '15 phút trước',
    read: false,
    targetPage: 'orders',
  },
  {
    id: 'n2',
    type: 'stock',
    title: 'Cảnh báo tồn kho an toàn (Safety Stock)',
    description: 'SKU NX-TITAN-1L còn 2 cái khả dụng (ngưỡng an toàn: 15 cái).',
    time: '45 phút trước',
    read: false,
    targetPage: 'inventory',
  },
  {
    id: 'n3',
    type: 'settlement',
    title: 'Đối soát sàn TikTok Shop đã hoàn tất',
    description: 'Đợt đối soát ngày 28/10: 18.450.000 ₫ đã được ghi nhận vào dòng tiền.',
    time: '2 giờ trước',
    read: true,
    targetPage: 'cashWorkingCapital',
  },
];

export function Topbar({
  title,
  search,
  onSearch,
  searchPlaceholder = 'Tìm kiếm đơn hàng, SKU, khách hàng...',
  onMobileMenu,
  onNavigate,
  showSearch = true,
}: TopbarProps) {
  const { activeTenant, memberships, switchTenant } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const switcherRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#D9E3E8] shadow-2xs">
      <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-3">
        {/* Left Section: Mobile Menu & Subtle Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onMobileMenu && (
            <button
              onClick={onMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all shrink-0 cursor-pointer"
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Breadcrumb Hierarchy (replaces redundant giant page header in Topbar) */}
          <nav className="flex items-center gap-1.5 text-xs truncate min-w-0" aria-label="Breadcrumb">
            <span className="font-semibold text-slate-400 hover:text-slate-600 transition-colors hidden sm:inline">
              NexusOMS
            </span>
            <ChevronRight size={13} className="text-slate-300 hidden sm:inline shrink-0" />
            <span className="text-xs font-bold text-[#123A52] tracking-tight truncate">
              {title}
            </span>
          </nav>
        </div>

        {/* Center / Right Section */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Global Search with Clear Context */}
          {showSearch && <div className="relative hidden md:block group">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1E647F] transition-colors"
            />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-48 lg:w-64 rounded-lg border border-[#D9E3E8] bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-[#123A52] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E647F]/20 focus:border-[#1E647F] focus:bg-white transition-all duration-150"
            />
          </div>}

          {/* Workspace Switcher */}
          {memberships.length > 0 && (
            <div className="relative" ref={switcherRef}>
              <button
                onClick={() => setShowSwitcher(!showSwitcher)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#D9E3E8] bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-2xs text-[#123A52]"
                title="Chuyển đổi không gian làm việc"
              >
                <Building2 size={14} className="text-[#1E647F]" />
                <span className="text-xs font-semibold hidden sm:inline truncate max-w-32">
                  {activeTenant?.name ?? 'Không gian làm việc'}
                </span>
                <ChevronDown size={12} className={cn('text-slate-400 transition-transform', showSwitcher && 'rotate-180')} />
              </button>

              {showSwitcher && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-[#D9E3E8] shadow-lg overflow-hidden animate-scale-in z-50">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Không Gian Làm Việc</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                    {memberships.map((m) => (
                      <button
                        key={m.tenant_id}
                        onClick={() => {
                          switchTenant(m.tenant_id);
                          setShowSwitcher(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer',
                          activeTenant?.id === m.tenant_id && 'bg-teal-50/60'
                        )}
                      >
                        <Building2 size={15} className="text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#123A52] truncate">
                            {m.tenant?.name ?? '—'}
                          </p>
                          <p className="text-[10px] text-slate-400 capitalize">{m.role}</p>
                        </div>
                        {activeTenant?.id === m.tenant_id && (
                          <Check size={14} className="text-[#1E647F] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actionable Notifications Popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                'relative w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all shrink-0 cursor-pointer flex items-center justify-center',
                showNotifications && 'bg-slate-100 text-slate-900'
              )}
              aria-label="Thông báo hệ thống"
              title="Thông báo hệ thống"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white shadow-xs pointer-events-none">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-[#D9E3E8] shadow-xl overflow-hidden z-50 animate-scale-in">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#123A52]">Thông báo vận hành</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                        {unreadCount} mới
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-[#1E647F] hover:underline cursor-pointer"
                    >
                      Đã đọc tất cả
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Không có thông báo mới
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.targetPage && onNavigate) {
                            onNavigate(n.targetPage);
                            setShowNotifications(false);
                          }
                        }}
                        className={cn(
                          'p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 text-left',
                          !n.read && 'bg-teal-50/30'
                        )}
                      >
                        <div className="shrink-0 mt-0.5">
                          {n.type === 'sla' && (
                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                              <Clock size={14} />
                            </div>
                          )}
                          {n.type === 'stock' && (
                            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                              <AlertTriangle size={14} />
                            </div>
                          )}
                          {n.type === 'settlement' && (
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs font-semibold text-[#123A52] leading-snug', !n.read && 'font-bold')}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {n.description}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                            {n.time}
                          </span>
                        </div>

                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[#1E647F] shrink-0 mt-2" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-[#D9E3E8] bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-[#123A52] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E647F]/20"
          />
        </div>
      </div>
    </header>
  );
}
