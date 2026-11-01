import type { NavigationGroup, PageId, PageMeta } from './types';

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  { label: 'TỔNG QUAN', items: [{ id: 'dashboard', label: 'Tổng quan' }, { id: 'inventory', label: 'Vận hành kho' }] },
  { label: 'VẬN HÀNH ĐƠN', items: [{ id: 'orders', label: 'Đơn hàng' }, { id: 'fulfillment', label: 'Xử lý đơn' }, { id: 'returns', label: 'Đổi trả hàng' }, { id: 'customers', label: 'Khách hàng' }] },
  { label: 'TÀI CHÍNH & P&L', items: [{ id: 'orderEconomics', label: 'Lợi nhuận đơn' }, { id: 'skuEconomics', label: 'Lợi nhuận SKU' }, { id: 'channelEconomics', label: 'Hiệu quả kênh' }, { id: 'cashWorkingCapital', label: 'Dòng tiền' }, { id: 'pricingCalculator', label: 'Định giá bán' }] },
  { label: 'KẾT NỐI SÀN', items: [{ id: 'channelConnections', label: 'Kết nối sàn' }, { id: 'channelMapping', label: 'Ánh xạ SKU' }, { id: 'simulator', label: 'Mô phỏng Flash Sale' }] },
];

export const PAGE_META: Record<PageId, PageMeta> = {
  dashboard: { title: 'Bảng điều hành kinh doanh', subtitle: 'Tổng quan doanh thu quản trị, dòng đóng góp lợi nhuận (CM1, CM2, CM3)', searchPlaceholder: 'Tìm kiếm nhanh...' },
  inventory: { title: 'Tồn kho 5 trạng thái', subtitle: 'Vật lý = Khả dụng + Đang giữ + Không khả dụng · Hàng sắp về', searchPlaceholder: 'Tìm tên sản phẩm hoặc SKU...' },
  orders: { title: 'Quản trị đơn hàng', subtitle: 'Theo dõi tiến trình từ đặt hàng, giữ kho, đóng gói đến đối soát POD', searchPlaceholder: 'Tìm mã đơn, khách hàng...' },
  fulfillment: { title: 'Xử lý đơn & Đóng gói', subtitle: 'Điều phối xuất kho, nhặt hàng theo wave và cam kết SLA', searchPlaceholder: 'Tìm wave...' },
  returns: { title: 'Đổi trả & Xử lý RMA', subtitle: 'Quy trình đổi trả hàng, hoàn tiền và nhập lại kho', searchPlaceholder: 'Tìm mã RMA, mã đơn...' },
  customers: { title: 'Khách hàng (CRM)', subtitle: 'Hồ sơ khách hàng, phân tầng giá trị và lịch sử mua hàng', searchPlaceholder: 'Tìm tên khách, SĐT...' },
  orderEconomics: { title: 'Kinh tế đơn hàng (P&L)', subtitle: 'Bóc tách chi phí & biên đóng góp từng đơn hàng (CM1, CM2, CM3)', searchPlaceholder: 'Tìm mã đơn...' },
  skuEconomics: { title: 'Biên lợi nhuận SKU', subtitle: 'Lợi nhuận đóng góp, giá hòa vốn và ma trận danh mục SKU', searchPlaceholder: 'Tìm SKU...' },
  channelEconomics: { title: 'Hiệu quả kênh & Phí sàn', subtitle: 'So sánh doanh thu thuần, take-rate phí sàn và lợi nhuận từng kênh', searchPlaceholder: 'Tìm kênh...' },
  cashWorkingCapital: { title: 'Dòng tiền & Vốn lưu động', subtitle: 'Quản trị thanh khoản, chu kỳ chuyển đổi tiền mặt (CCC) & công nợ sàn', searchPlaceholder: 'Tìm đợt đối soát...' },
  pricingCalculator: { title: 'Định giá & Hòa vốn', subtitle: 'Máy tính định giá hòa vốn, giá mục tiêu và trần voucher giảm giá', searchPlaceholder: 'Tìm sản phẩm...' },
  channelConnections: { title: 'Kênh bán & Kết nối', subtitle: 'Quản lý kết nối shop TikTok, Shopee và website', searchPlaceholder: 'Tìm kết nối...' },
  channelMapping: { title: 'Ánh xạ SKU kênh', subtitle: 'Ánh xạ SKU nội bộ sang SKU kênh thương mại điện tử', searchPlaceholder: 'Tìm ánh xạ...' },
  simulator: { title: 'Webhook & Flash Sale Simulator', subtitle: 'Bắn 100 webhook có HMAC-SHA256 và kiểm tra chống bán âm', searchPlaceholder: 'Tìm kịch bản...' },
};

export function isPageId(value: string | null | undefined): value is PageId {
  return Boolean(value && value in PAGE_META);
}
