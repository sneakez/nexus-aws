import type { Channel, Order, OrderItem, Product } from '@/types';
import type { SkuInventory5State } from '@/mock/types';

// ============ Data Dimension Enums ============
export type TimeDimension = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
export type ComparisonDimension = 'previous_period' | 'same_period_last_year' | 'target' | 'none';
export type DataAttributionType = 'DEMO-OBSERVED' | 'ESTIMATED' | 'ASSUMPTION' | 'SIMULATED' | 'INSUFFICIENT DATA' | 'ACTUAL';
export type DataConfidenceStatus = 'VERIFIED' | 'PARTIALLY_RECONCILED' | 'ESTIMATED' | 'INCOMPLETE' | 'STALE' | 'CONFLICTED';

// ============ Unit Economics Core ============
export interface OrderUnitEconomics {
  compensation?: number;
  adsCredit?: number;
  orderId: string;
  orderNumber: string;
  channel: Channel;
  placedAt: string;
  orderStatus: string;
  grossSales: number;           // Total list price of items
  discounts: number;            // Total voucher & discount
  returnsRefunds: number;       // Refund amount
  netRevenue: number;           // Gross Sales - Discounts - Returns
  cogs: number;                 // Cost of Goods Sold
  cm1: number;                  // Net Revenue - COGS
  cm1Margin: number;            // (CM1 / Net Revenue) * 100
  marketplaceFees: number;      // Commission & channel platform fees
  paymentFees: number;          // Payment gateway fee
  fulfillmentCosts: number;     // Pick, pack, materials, warehouse handling
  shippingSubsidies: number;    // Subsidized shipping absorbed by seller
  returnCosts: number;          // Reverse logistics & repackaging
  cm2: number;                  // CM1 - variable fees & fulfillment
  cm2Margin: number;            // (CM2 / Net Revenue) * 100
  attributedMarketingCosts: number; // Blended Ads / campaign spend
  cm3: number;                  // CM2 - Marketing costs
  cm3Margin: number;            // (CM3 / Net Revenue) * 100
  fixedOverheadEstimate: number;// Fixed G&A / SaaS / Rent estimate
  netProfitEstimate: number;    // CM3 - Fixed Overhead
  attributionType: DataAttributionType;
  confidenceStatus?: DataConfidenceStatus;
  cogsSource?: string;
}

export interface SkuUnitEconomics {
  productId: string;
  sku: string;
  name: string;
  category: string;
  channel: Channel | 'all';
  asp: number;                  // Average Selling Price
  cogs: number;                 // Unit Cost
  avgFees: number;              // Channel fee per unit
  avgFulfillment: number;       // Unit fulfillment cost
  cmPerUnit: number;            // ASP - COGS - Fees - Fulfillment
  cmPercent: number;            // (cmPerUnit / ASP) * 100
  unitsSold: number;
  totalRevenue: number;
  totalContribution: number;    // unitsSold * cmPerUnit
  physicalStock: number;
  stockValue: number;           // physicalStock * cogs
  stockRoi: number;             // (Total Contribution 30D / Stock Value) * 100
  sellThroughRate: number;      // % of available stock sold
  daysOfInventory: number;      // DIO = (Stock Value / 30D COGS) * 30
  breakEvenPrice: number;       // Minimum price where CM2 = 0
  suggestedPrice: number;       // Target margin price
  maxDiscountAmount: number;    // Maximum discount before CM2 becomes negative
  contributionRank: 'STAR' | 'CASH_COW' | 'QUESTION_MARK' | 'DOG';
  abcCategory: 'A' | 'B' | 'C';
  xyzCategory: 'X' | 'Y' | 'Z';
  contributionMarginPerUnit?: number;
  cm2?: number;
  barcode?: string;
  revenue?: number;
  rank?: string;
}

export interface ChannelUnitEconomics {
  channel: Channel;
  channelName: string;
  orderCount: number;
  grossSales: number;
  netRevenue: number;
  cogs: number;
  marketplaceFees: number;
  paymentFees: number;
  fulfillmentCosts: number;
  shippingSubsidies: number;
  returnCosts: number;
  totalVariableCosts: number;
  takeRate: number;             // (Marketplace Fees / Gross Sales) * 100
  marketingSpend: number;
  blendedRoas: number;          // Net Revenue / Marketing Spend
  cm1: number;
  cm1Margin: number;
  cm2: number;
  cm2Margin: number;
  cm3: number;
  cm3Margin: number;
  returnRate: number;           // Returned Orders / Total Orders * 100
  avgOrderValue: number;        // AOV
}

// ============ Pricing Simulator Inputs & Outputs ============
export interface PricingSimulationInput {
  configuredTaxPercent?: number;
  taxIncludedInFees?: boolean;
  basePrice: number;
  cogs: number;
  marketplaceFeePercent: number;
  paymentFeePercent: number;
  packagingFulfillmentCost: number;
  allocatedMarketingPercent: number;
  targetCm2Percent: number;
  voucherDiscountAmount: number;
}

export interface PricingSimulationResult {
  valid?: boolean;
  invalidReason?: string;
  breakEvenPrice: number;       // Price where CM2 = 0
  breakEvenWithAds: number;     // Price where CM3 = 0
  recommendedPrice: number;     // Price to achieve target CM2%
  maxAllowedDiscount: number;   // Max voucher before CM2 turns negative
  waterfallBreakdown: Array<{
    name: string;
    amount: number;
    percentageOfRevenue: number;
    type: 'positive' | 'negative' | 'subtotal';
  }>;
  simulatedCm1: number;
  simulatedCm1Margin: number;
  simulatedCm2: number;
  simulatedCm2Margin: number;
  simulatedCm3: number;
  simulatedCm3Margin: number;
}

// ============ Marketing Analytics ============
export interface MarketingCampaignPerformance {
  campaignId: string;
  name: string;
  channel: Channel;
  platform: 'Facebook/Meta' | 'TikTok Ads' | 'Shopee In-App' | 'Lazada Ads' | 'Unknown' | 'KOC Booking' | 'Google Ads';
  adSpend: number;
  adsCredit?: number;
  netSpend?: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions: number;
  cpa: number;                  // adSpend / conversions
  attributedRevenue: number;
  roas: number;                 // attributedRevenue / adSpend
  cogs: number;
  cmAfterAds: number;           // Attributed Revenue - COGS - Fees - Ad Spend
  status: 'PROFITABLE' | 'OPTIMIZING' | 'LOSS_MAKING' | 'INSUFFICIENT_DATA';
  attributionType: DataAttributionType;
}

// ============ Customer Analytics ============
export interface CustomerCohortMonth {
  cohortMonth: string;          // e.g. "2026-05"
  initialCustomers: number;
  retentionByMonth: Array<{
    monthIndex: number;         // M0, M1, M2, M3...
    activeCount: number;
    retentionRate: number;      // %
    revenueGenerated: number;
  }>;
}

export interface RfmCustomerSegment {
  segmentName: 'Champions' | 'Loyal Customers' | 'Potential Loyalists' | 'At Risk' | 'Hibernating' | 'Lost';
  customerCount: number;
  percentOfTotal: number;
  avgMonetary: number;
  avgFrequency: number;
  avgRecencyDays: number;
  recommendedAction: string;
}

// ============ Operations Analytics ============
export interface OperationsPerformanceMetrics {
  avgCycleTimeHours: number;    // Place order to carrier pickup
  avgPickingTimeMinutes: number;
  avgPackingTimeMinutes: number;
  slaComplianceRate: number | null;    // % shipped within SLA window
  firstAttemptDeliveryRate: number;
  failedDeliveryRate: number;
  returnRate: number;
  damagedStockRate: number;
  warehousePerformance: Array<{
    warehouseId: string;
    warehouseName: string;
    ordersProcessed: number;
    slaComplianceRate: number | null;
    avgCycleTimeHours: number;
    errorRate: number;
  }>;
}

// ============ Cash & Working Capital ============
export interface WorkingCapitalOverview {
  availableCash: number;
  inventoryCapital: number;     // Physical stock * COGS
  pendingMarketplaceSettlements: number; // Receivables awaiting payout
  supplierPayables: number;     // Accounts payable to suppliers
  workingCapitalGap: number;    // (Receivables + Inventory) - Payables
  daysInventoryOutstanding: number | null; // Missing observation => unavailable
  daysSalesOutstanding: number | null;
  daysPayablesOutstanding: number | null;
  cashConversionCycleDays: number | null;
  settlementBatches: Array<{
    channel: Channel;
    cycleDate: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'RECONCILED';
  }>;
}

// ============ Decision Intelligence ============
export interface DecisionInsight {
  id: string;
  category: 'unit_economics' | 'inventory_risk' | 'channel_performance' | 'marketing_leak' | 'working_capital';
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'STABLE';
  title: string;
  // 4-Layer Decision Intelligence
  descriptive: string;          // Điều gì đã xảy ra?
  diagnostic: string;           // Vì sao? (Attribution & Math)
  predictive: string;            // Điều gì có thể xảy ra nếu không đổi?
  prescriptive: string;          // Cần làm gì tiếp theo? (Actionable steps)
  calculationFormula: string;
  financialImpactEstimate: number; // Estimated VND saved or gained
  confidenceScore?: number;       // Legacy score (deprecated)
  dataAttribution: DataAttributionType;
  attributionNote?: string;
  relatedEntityLink?: {
    page: string;
    label: string;
  };
}

// ============ Executive Dashboard Aggregations ============
export interface ExecutiveDashboardData {
  timePeriod: TimeDimension;
  comparison: ComparisonDimension;
  kpis: {
    netRevenue: { 
      value: number; 
      recognizedRevenuePOD?: number;
      pendingPodRevenue?: number;
      previous: number; 
      delta: number; 
      deltaPercent: number; 
      trend: 'up' | 'down' | 'flat' 
    };
    orderVolume: { value: number; previous: number; delta: number; deltaPercent: number; trend: 'up' | 'down' | 'flat' };
    aov: { value: number; previous: number; delta: number; deltaPercent: number; trend: 'up' | 'down' | 'flat' };
    grossProfit: { value: number; previous: number; delta: number; deltaPercent: number; trend: 'up' | 'down' | 'flat' };
    cm1: { value: number; margin: number; previous: number; delta: number; deltaPercent: number };
    cm2: { value: number; margin: number; previous: number; delta: number; deltaPercent: number };
    cm3: { value: number; margin: number; previous: number; delta: number; deltaPercent: number };
    inventoryValue: { value: number; previous: number; delta: number; deltaPercent: number };
    cashConversionCycleDays: { value: number | null; previous: number | null; delta: number | null };
    returnRate: { value: number; previous: number; delta: number };
    outstandingSettlements: { value: number; previous: number; delta: number };
  };
  revenueTrend: Array<{
    date: string;
    label: string;
    grossRevenue: number;
    netRevenue: number;
    cogs: number;
    cm2: number;
    cm3: number;
    previousPeriodRevenue?: number;
  }>;
  waterfallPnL: Array<{
    name: string;
    amount: number;
    type: 'positive' | 'negative' | 'subtotal';
    percentageOfRevenue: number;
  }>;
  channelComparison: ChannelUnitEconomics[];
  skuPareto: SkuUnitEconomics[];
  decisionInsights: DecisionInsight[];
}
