
import { Suspense, useEffect, useState } from 'react';
import { getAllowedPagesForRole } from '@/lib/permissions';
import { useAuth } from '@/providers/AuthProvider';


import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/LiveTopbar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { WebhookSimulationLauncher } from '../WebhookSimulatorPage';
import { PAGE_META, isPageId } from '../navigation';
import { LivePage } from '../live-page-registry';
import type { PageId } from '../types';

function initialPage(): PageId {
  const params = new URLSearchParams(window.location.search);
  const queryPage = params.get('page');
  if (isPageId(queryPage)) return queryPage;
  const hashPage = window.location.hash.replace('#', '');
  return isPageId(hashPage) ? hashPage : 'dashboard';
}
function initialDateRange() {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date(today); fromDate.setDate(today.getDate() - 29);
  const from = fromDate.toISOString().slice(0, 10);
  try { return JSON.parse(localStorage.getItem('nexus-global-date-range') ?? 'null') ?? { from, to }; } catch { return { from, to }; }
}

export function AppShell() {
  const { activeRole } = useAuth();
  const [page, setPage] = useState<PageId>(initialPage);
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dateRange, setDateRange] = useState(initialDateRange);


  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    window.history.replaceState({}, '', url.toString());
  }, [page]);
  useEffect(() => { localStorage.setItem('nexus-global-date-range', JSON.stringify(dateRange)); }, [dateRange]);

  useEffect(() => {
    const allowedPages = getAllowedPagesForRole(activeRole, true);
    if (!allowedPages.includes(page) && allowedPages.includes('dashboard')) setPage('dashboard');
  }, [activeRole, page]);

  const navigate = (nextPage: PageId) => {
    setPage(nextPage);
    setSearch('');
  };
  const allowed = getAllowedPagesForRole(activeRole, true).includes(page);
  const meta = PAGE_META[page];
  const showTopbarSearch = false;

  return (
    <div data-testid="workspace" data-role={activeRole} className="flex h-screen bg-app-gradient overflow-hidden font-sans">
      <Sidebar
        current={page}
        onNavigate={navigate}
        stats={{
          pendingOrders: 0,
          lowStock: 0,
        }}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          searchPlaceholder={meta.searchPlaceholder}
          search={search}
          onSearch={setSearch}
          onMobileMenu={() => setMobileOpen(open => !open)}
          onNavigate={next => isPageId(next) && navigate(next)}
          showSearch={showTopbarSearch}
          dateFrom={dateRange.from}
          dateTo={dateRange.to}
          onDateRangeChange={(from, to) => { if (from && to && from <= to) setDateRange({ from, to }); }}
        />
        <main data-page={page} className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent">
          <ErrorBoundary>
            {!allowed ? (
              <div className="p-8" role="alert">
                <h1 className="text-xl font-semibold">Không có quyền truy cập trang này</h1>
                <p>Chọn trang thuộc phạm vi tài khoản.</p>
                <button className="border rounded p-2 mt-3" onClick={() => navigate('dashboard')}>Về tổng quan</button>
              </div>
            ) : (
              <Suspense fallback={<FullPageSpinner label="Đang tải dữ liệu..." />}>
                <LivePage page={page} search={search} navigate={navigate} dateRange={dateRange} />
              </Suspense>
            )}
          </ErrorBoundary>
        </main>
      </div>
      <WebhookSimulationLauncher />
    </div>
  );
}
