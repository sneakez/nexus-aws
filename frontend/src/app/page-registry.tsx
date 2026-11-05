import { isMockMode } from '@/lib/config';
import { lazy, type ReactNode } from 'react';
import type { PageId } from './types';

const DashboardScreen = lazy(() => import('@/features/dashboard').then(module => ({ default: module.DashboardScreen })));
const InventoryScreen = lazy(() => import('@/features/inventory').then(module => ({ default: module.InventoryScreen })));
const OrdersScreen = lazy(() => import('@/features/orders').then(module => ({ default: module.OrdersScreen })));
const FulfillmentScreen = lazy(() => import('@/features/orders').then(module => ({ default: module.FulfillmentScreen })));
const ReturnsScreen = lazy(() => import('@/features/post-purchase').then(module => ({ default: module.ReturnsScreen })));
const CustomersScreen = lazy(() => import('@/features/crm').then(module => ({ default: module.CustomersScreen })));
const OrderEconomicsScreen = lazy(() => import('@/features/finance').then(module => ({ default: module.OrderEconomicsScreen })));
const SkuEconomicsScreen = lazy(() => import('@/features/finance').then(module => ({ default: module.SkuEconomicsScreen })));
const ChannelEconomicsScreen = lazy(() => import('@/features/finance').then(module => ({ default: module.ChannelEconomicsScreen })));
const CashWorkingCapitalScreen = lazy(() => import('@/features/finance').then(module => ({ default: module.CashWorkingCapitalScreen })));
const PricingScreen = lazy(() => import('@/features/finance').then(module => ({ default: module.PricingScreen })));
const ChannelConnectionsScreen = lazy(() => import('@/features/channels').then(module => ({ default: module.ChannelConnectionsScreen })));
const ChannelMappingScreen = lazy(() => import('@/features/catalog').then(module => ({ default: module.ChannelMappingScreen })));
const SimulatorScreen = lazy(() => import('@/features/simulator').then(module => ({ default: module.SimulatorScreen })));

const LiveWorkspace = lazy(() => import('./BackendWorkspacePage').then(module => ({ default: module.BackendWorkspacePage })));
const LiveOrders = lazy(() => import('@/features/orders/pages/BackendOrdersScreen').then(module => ({ default: module.BackendOrdersPage })));
interface PageRendererProps {
  page: PageId;
  search: string;
  navigate: (page: PageId) => void;
}

export function renderPage({ page, search, navigate }: PageRendererProps): ReactNode {
  if (!isMockMode()) {
    switch (page) {
      case 'dashboard':
      case 'fulfillment':
      case 'returns':
      case 'orderEconomics':
        return <LiveOrders key={page} search={search} view={page} />;
      case 'orders':
        break;
      case 'cashWorkingCapital':
        return null;
      default:
        return <LiveWorkspace key={page} page={page} search={search} />;
    }
  }
  switch (page) {
    case 'dashboard': return <DashboardScreen onNavigate={next => navigate(next as PageId)} />;
    case 'inventory': return <InventoryScreen search={search} />;
    case 'orders': return <OrdersScreen search={search} onNavigate={next => navigate(next as PageId)} />;
    case 'fulfillment': return <FulfillmentScreen search={search} />;
    case 'returns': return <ReturnsScreen search={search} onNavigate={next => navigate(next as PageId)} />;
    case 'customers': return <CustomersScreen search={search} />;
    case 'orderEconomics': return <OrderEconomicsScreen onNavigate={next => navigate(next as PageId)} />;
    case 'skuEconomics': return <SkuEconomicsScreen onNavigate={next => navigate(next as PageId)} />;
    case 'channelEconomics': return <ChannelEconomicsScreen onNavigate={next => navigate(next as PageId)} />;
    case 'cashWorkingCapital': return <CashWorkingCapitalScreen />;
    case 'pricingCalculator': return <PricingScreen />;
    case 'channelConnections': return <ChannelConnectionsScreen search={search} />;
    case 'channelMapping': return <ChannelMappingScreen search={search} />;
    case 'simulator': return <SimulatorScreen />;
  }
}
