import { Suspense, useEffect, useState } from 'react';
import { getAllowedPagesForRole } from '@/lib/permissions';
import { useAuth } from '@/providers/AuthProvider';
import { omsStore } from '@/stores/omsStore';
import { useOmsRevision } from '@/hooks/useOmsRevision';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { PAGE_META, isPageId } from '../navigation';
import { renderPage } from '../page-registry';
import type { PageId } from '../types';

function initialPage(): PageId {
  const params = new URLSearchParams(window.location.search);
  const queryPage = params.get('page');
  if (isPageId(queryPage)) return queryPage;
  const hashPage = window.location.hash.replace('#', '');
  return isPageId(hashPage) ? hashPage : 'dashboard';
}

export function AppShell() {
  const { activeRole } = useAuth();
  const [page, setPage] = useState<PageId>(initialPage);
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  useOmsRevision();

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    window.history.replaceState({}, '', url.toString());
  }, [page]);

  useEffect(() => {
    const allowedPages = getAllowedPagesForRole(activeRole);
    if (!allowedPages.includes(page) && allowedPages.includes('dashboard')) setPage('dashboard');
  }, [activeRole, page]);

  const navigate = (nextPage: PageId) => {
    setPage(nextPage);
    setSearch('');
  };
  const allowed = getAllowedPagesForRole(activeRole).includes(page);
  const meta = PAGE_META[page];
  const showTopbarSearch = ['fulfillment', 'customers', 'channelConnections', 'channelMapping'].includes(page);

  return (
    <div data-testid="workspace" data-role={activeRole} className="flex h-screen bg-app-gradient overflow-hidden font-sans">
      <Sidebar
        current={page}
        onNavigate={navigate}
        stats={{
          pendingOrders: omsStore.getOrders().filter(order => order.status === 'pending').length,
          lowStock: omsStore.getInventory5State().filter(item => item.available <= item.safety_stock).length,
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
                {renderPage({ page, search, navigate })}
              </Suspense>
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
