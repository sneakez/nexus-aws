import { lazy, type ReactNode } from 'react';
import type { PageId } from './types';
const LiveWorkspace = lazy(() => import('./BackendWorkspacePage').then(module => ({ default: module.BackendWorkspacePage })));
const LiveOrders = lazy(() => import('@/features/orders/pages/BackendOrdersScreen').then(module => ({ default: module.BackendOrdersPage })));
interface PageRendererProps {
  page: PageId;
  search: string;
  navigate: (page: PageId) => void;
}
export function LivePage({ page, search }: PageRendererProps): ReactNode {
  switch (page) {
    case 'orders':
    case 'dashboard':
    case 'fulfillment':
    case 'returns':
    case 'orderEconomics':
      return <LiveOrders key={page} search={search} view={page} />;
    case 'cashWorkingCapital':
    case 'simulator':
      return null;
    default:
      return <LiveWorkspace key={page} page={page} search={search} />;
  }
}
