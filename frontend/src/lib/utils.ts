import type {
  OrderStatus,
  PaymentStatus,
  CustomerStatus,
  ProductStatus,
  Channel,
  TransferStatus,
  POStatus,
  WaveStatus,
  AccountType,
  ReturnStatus,
  ComplaintStatus,
  SerialStatus,
  InventoryTxnType,
  ApprovalStatus,
} from '@/types';

export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : (typeof value === 'string' && !isNaN(Number(value)) ? Number(value) : 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'vua xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phut truoc`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} gio truoc`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngay truoc`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} nam truoc`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã nhận',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  partially_paid: 'Thanh toán một phần',
  refunded: 'Đã hoàn tiền',
};

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'Hoạt động',
  inactive: 'Ngừng hoạt động',
  lead: 'Tiềm năng',
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Đang bán',
  discontinued: 'Ngừng bán',
  out_of_stock: 'Hết hàng',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-violet-100 text-violet-800 border-violet-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  refunded: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  unpaid: 'bg-rose-100 text-rose-800 border-rose-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  partially_paid: 'bg-amber-100 text-amber-800 border-amber-200',
  refunded: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const CUSTOMER_STATUS_COLORS: Record<CustomerStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  lead: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const PRODUCT_STATUS_COLORS: Record<ProductStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  discontinued: 'bg-slate-100 text-slate-700 border-slate-200',
  out_of_stock: 'bg-rose-100 text-rose-800 border-rose-200',
};

// ============ Enterprise v3.0 Labels & Colors ============

export const CHANNEL_LABELS: Record<Channel, string> = {
  website: 'Website',
  shopee: 'Shopee',
  tiktok: 'TikTok Shop',
  lazada: 'Lazada',
  other_digital: 'Kênh Số Khác',
};

export const CHANNEL_COLORS: Record<Channel, string> = {
  website: 'bg-blue-100 text-blue-800 border-blue-200',
  shopee: 'bg-orange-100 text-orange-800 border-orange-200',
  tiktok: 'bg-slate-100 text-slate-800 border-slate-300',
  lazada: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  other_digital: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  requested: 'Yêu cầu',
  in_transit: 'Đang vận chuyển',
  received: 'Đã nhận',
  cancelled: 'Đã hủy',
};

export const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
  requested: 'bg-amber-100 text-amber-800 border-amber-200',
  in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
  received: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Bản nháp',
  ordered: 'Đã đặt',
  partial: 'Nhận một phần',
  received: 'Đã nhận',
  cancelled: 'Đã hủy',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  ordered: 'bg-blue-100 text-blue-800 border-blue-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  received: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const WAVE_STATUS_LABELS: Record<WaveStatus, string> = {
  open: 'Chờ lấy hàng',
  picking: 'Đang nhặt hàng',
  packing: 'Đang đóng gói',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const WAVE_STATUS_COLORS: Record<WaveStatus, string> = {
  open: 'bg-slate-100 text-slate-700 border-slate-200',
  picking: 'bg-amber-100 text-amber-800 border-amber-200',
  packing: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Tài sản',
  liability: 'Nợ phải trả',
  equity: 'Vốn chủ sở hữu',
  revenue: 'Doanh thu',
  expense: 'Chi phí',
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  asset: 'bg-blue-100 text-blue-800 border-blue-200',
  liability: 'bg-amber-100 text-amber-800 border-amber-200',
  equity: 'bg-violet-100 text-violet-800 border-violet-200',
  revenue: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  expense: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: 'Yêu cầu mới',
  in_transit: 'Đang vận chuyển',
  inspecting: 'Đang kiểm định',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  received: 'Đã nhận hàng',
  quality_check: 'Kiểm tra CL',
  refunded: 'Đã hoàn tiền',
  closed: 'Đã đóng',
  qc_passed: 'Đạt kiểm định (QC)',
  qc_failed: 'Lỗi / Hỏng kiểm định',
};

export const RETURN_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  received: 'bg-violet-100 text-violet-800 border-violet-200',
  quality_check: 'bg-orange-100 text-orange-800 border-orange-200',
  refunded: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
  qc_passed: 'bg-teal-100 text-teal-800 border-teal-200',
  qc_failed: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  open: 'Mới mở',
  analyzed: 'Đã phân tích',
  responded: 'Đã phản hồi',
  closed: 'Đã đóng',
};

export const COMPLAINT_STATUS_COLORS: Record<ComplaintStatus, string> = {
  open: 'bg-amber-100 text-amber-800 border-amber-200',
  analyzed: 'bg-blue-100 text-blue-800 border-blue-200',
  responded: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const SERIAL_STATUS_LABELS: Record<SerialStatus, string> = {
  in_stock: 'Trong kho',
  reserved: 'Đang giữ',
  sold: 'Đã bán',
  returned: 'Đã trả',
  defective: 'Lỗi',
};

export const SERIAL_STATUS_COLORS: Record<SerialStatus, string> = {
  in_stock: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  reserved: 'bg-amber-100 text-amber-800 border-amber-200',
  sold: 'bg-blue-100 text-blue-800 border-blue-200',
  returned: 'bg-violet-100 text-violet-800 border-violet-200',
  defective: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const INVENTORY_TXN_TYPE_LABELS: Record<InventoryTxnType, string> = {
  inbound: 'Nhập kho',
  outbound: 'Xuất kho',
  transfer_out: 'Chuyển ra',
  transfer_in: 'Chuyển vào',
  adjustment: 'Điều chỉnh',
  reservation: 'Giữ hàng',
  release: 'Giải tỏa giữ',
  scrap: 'Hư hỏng',
  return_in: 'Nhập trả',
};

export const INVENTORY_TXN_TYPE_COLORS: Record<InventoryTxnType, string> = {
  inbound: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  outbound: 'bg-rose-100 text-rose-800 border-rose-200',
  transfer_out: 'bg-amber-100 text-amber-800 border-amber-200',
  transfer_in: 'bg-blue-100 text-blue-800 border-blue-200',
  adjustment: 'bg-violet-100 text-violet-800 border-violet-200',
  reservation: 'bg-orange-100 text-orange-800 border-orange-200',
  release: 'bg-teal-100 text-teal-800 border-teal-200',
  scrap: 'bg-slate-100 text-slate-700 border-slate-200',
  return_in: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ duyệt',
  maker_approved: 'Maker duyệt',
  checker_approved: 'Checker duyệt',
  rejected: 'Từ chối',
};

export const APPROVAL_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  maker_approved: 'bg-blue-100 text-blue-800 border-blue-200',
  checker_approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
};

export function maskPII(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL]')
    .replace(/\b\d{1,5}\s+\w+\s+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr)\b/gi, '[ADDRESS]');
}

export function truncateHash(hash: string, len = 12): string {
  if (!hash) return '—';
  return hash.length > len * 2 ? `${hash.slice(0, len)}...${hash.slice(-len)}` : hash;
}

/** Refund is distinct from an originally underpaid order; also supports old mock snapshots. */
export function orderPaymentLabel(order: { payment_status: PaymentStatus; refunded_amount?: number; total: number }): string {
  if ((order.refunded_amount || 0) > 0) return order.refunded_amount! >= order.total ? 'Đã hoàn tiền toàn bộ' : 'Đã hoàn tiền một phần';
  return PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status;
}
