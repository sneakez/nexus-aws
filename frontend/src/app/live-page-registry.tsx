import { lazy, type ReactNode } from 'react';
import type { PageId } from './types';
const LiveWorkspace = lazy(() => import('./BackendWorkspacePage').then(module => ({ default: module.BackendWorkspacePage })));
const LiveOrders = lazy(() => import('@/features/orders/pages/BackendOrdersScreen').then(module => ({ default: module.BackendOrdersPage })));
interface PageRendererProps {
  page: PageId;
  search: string;
  navigate: (page: PageId) => void;
  dateRange: { from: string; to: string };
}
export function LivePage({ page, search, dateRange }: PageRendererProps): ReactNode {
  switch (page) {
    case 'orders':
    case 'dashboard':
    case 'fulfillment':
    case 'returns':
    case 'orderEconomics':
      return <LiveOrders key={page} search={search} view={page} dateRange={dateRange} />;
    case 'simulator':
      // The simulator is opened from the global floating launcher.
      return null;
    case 'cashWorkingCapital':
      return null;
    default:
      return <LiveWorkspace key={page} page={page} search={search} />;
  }
}
