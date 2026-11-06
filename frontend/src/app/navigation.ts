import type { NavigationGroup, PageId, PageMeta } from './types';

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  { label: 'TỔNG QUAN', items: [{ id: 'dashboard', label: 'Tổng quan' }, { id: 'products', label: 'Sản phẩm' }, { id: 'inventory', label: 'Vận hành kho' }] },
  { label: 'VẬN HÀNH ĐƠN', items: [{ id: 'orders', label: 'Đơn hàng' }, { id: 'fulfillment', label: 'Xử lý đơn' }, { id: 'returns', label: 'Đổi trả hàng' }, { id: 'customers', label: 'Khách hàng' }] },
  { label: 'TÀI CHÍNH', items: [{ id: 'orderEconomics', label: 'Lợi nhuận đơn' }, { id: 'skuEconomics', label: 'Lợi nhuận SKU' }, { id: 'channelEconomics', label: 'Hiệu quả kênh' }, { id: 'pricingCalculator', label: 'Định giá bán' }] },
  { label: 'KẾT NỐI SÀN', items: [{ id: 'channelConnections', label: 'Kết nối sàn' }, { id: 'channelMapping', label: 'Ánh xạ SKU' }] },
];

export const PAGE_META: Record<PageId, PageMeta> = {
  dashboard: { title: 'Bảng điều hành kinh doanh', subtitle: 'Tình trạng các đơn gần nhất', searchPlaceholder: 'Tìm kiếm nhanh...' },
  products: { title: 'Danh mục sản phẩm', subtitle: 'SKU nội bộ, giá vốn và trạng thái sử dụng trong vận hành', searchPlaceholder: 'Tìm SKU hoặc tên sản phẩm...' },
  inventory: { title: 'Tồn kho', subtitle: 'Theo dõi tồn thực tế, số lượng đang giữ và số lượng có thể bán', searchPlaceholder: 'Tìm tên sản phẩm hoặc SKU...' },
  orders: { title: 'Quản trị đơn hàng', subtitle: 'Theo dõi tiến trình từ tạo đơn đến giao hàng', searchPlaceholder: 'Tìm mã đơn, khách hàng...' },
  fulfillment: { title: 'Xử lý đơn & Đóng gói', subtitle: 'Xác nhận, chuẩn bị và xuất kho', searchPlaceholder: 'Tìm wave...' },
  returns: { title: 'Đơn đổi trả', subtitle: 'Theo dõi các yêu cầu đổi trả đã phát sinh', searchPlaceholder: 'Tìm mã đơn, khách hàng...' },
  customers: { title: 'Khách hàng', subtitle: 'Xem thông tin và lịch sử mua hàng của khách', searchPlaceholder: 'Tìm tên khách, SĐT...' },
  orderEconomics: { title: 'Lợi nhuận đơn hàng', subtitle: 'Theo dõi doanh thu, chi phí và lợi nhuận theo từng đơn', searchPlaceholder: 'Tìm mã đơn...' },
  skuEconomics: { title: 'Lợi nhuận theo sản phẩm', subtitle: 'So sánh doanh thu, giá vốn và lợi nhuận của từng sản phẩm', searchPlaceholder: 'Tìm SKU...' },
  channelEconomics: { title: 'Hiệu quả kênh & Phí sàn', subtitle: 'So sánh doanh thu, phí và lợi nhuận theo từng kênh', searchPlaceholder: 'Tìm kênh...' },
  cashWorkingCapital: { title: 'Dòng tiền & Vốn lưu động', subtitle: 'Theo dõi dòng tiền và công nợ từ các kênh bán', searchPlaceholder: 'Tìm đợt đối soát...' },
  pricingCalculator: { title: 'Định giá bán', subtitle: 'Ước tính giá bán và mức giảm giá phù hợp', searchPlaceholder: 'Tìm sản phẩm...' },
  channelConnections: { title: 'Kênh bán & Kết nối', subtitle: 'Quản lý kết nối shop TikTok, Shopee và website', searchPlaceholder: 'Tìm kết nối...' },
  channelMapping: { title: 'Ánh xạ SKU kênh', subtitle: 'Ánh xạ SKU nội bộ sang SKU kênh thương mại điện tử', searchPlaceholder: 'Tìm ánh xạ...' },
  simulator: { title: 'Mô phỏng Flash Sale', subtitle: 'Mô phỏng từng bước đồng bộ đơn hàng từ sàn', searchPlaceholder: 'Tìm kịch bản...' },
};

export function isPageId(value: string | null | undefined): value is PageId {
  return Boolean(value && value in PAGE_META);
}
