export type PageId =
  | 'dashboard'
  | 'inventory'
  | 'orders'
  | 'fulfillment'
  | 'returns'
  | 'customers'
  | 'orderEconomics'
  | 'skuEconomics'
  | 'channelEconomics'
  | 'cashWorkingCapital'
  | 'pricingCalculator'
  | 'channelConnections'
  | 'channelMapping'
  | 'simulator';

export interface PageMeta {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
}

export interface NavigationItem {
  id: PageId;
  label: string;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}
