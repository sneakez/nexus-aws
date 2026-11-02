import { mockStore } from '../store';
import type { DemoScenario, DemoScenarioId } from '../types';

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'SCENARIO_NORMAL_DAY',
    name: '1. Ngày Bán Hàng Bình Thường',
    description: 'Mô phỏng 3 đơn hàng mới từ Shopee, TikTok Shop và Lazada. Khóa tồn tự động và cập nhật hàng đợi nhặt hàng.',
    category: 'Orders',
    roleRecommended: 'manager',
    steps: [
      'Ghi nhận 3 đơn hàng từ 3 sàn TMĐT khác nhau',
      'Kiểm tra tồn khả dụng và thực hiện khóa tồn nguyên tử',
      'Đẩy đơn vào hàng đợi chuẩn bị nhặt hàng',
      'Cập nhật số liệu doanh thu và tồn khả dụng trên Dashboard'
    ]
  },
  {
    id: 'SCENARIO_FLASH_SALE',
    name: '2. Cơn Lốc Flash Sale (25 Đơn Dồn Về)',
    description: 'Giả lập 25 đơn hàng dồn về cùng lúc trong vài giây. Kiểm tra cơ chế khóa tồn nguyên tử, tuyệt đối không bán âm.',
    category: 'Orders',
    roleRecommended: 'owner',
    steps: [
      'Bắn 25 đơn hàng liên tục vào SKU hot: NX-AIR-PRO & NX-TITAN-1L',
      'Hệ thống trừ dần lượng tồn khả dụng (Available)',
      'Tự động dừng nhận đơn khi lượng tồn khả dụng chạm ngưỡng an toàn',
      'Ghi nhận toàn bộ biến động vào sổ Stock Ledger'
    ]
  },
  {
    id: 'SCENARIO_STOCKOUT',
    name: '3. Cảnh Báo Thiếu Hàng (Stockout Prevention)',
    description: 'Đơn hàng yêu cầu số lượng vượt quá tồn khả dụng. Hệ thống từ chối an toàn và phát cảnh báo bổ sung hàng.',
    category: 'Inventory',
    roleRecommended: 'warehouse',
    steps: [
      'Tạo đơn hàng đặt 150 cái SKU Bàn phím cơ NX-KB-WAVE (Hiện chỉ còn 42 cái khả dụng)',
      'Hệ thống kích hoạt Transaction Rollback và chặn lưu đơn',
      'Hiển thị thông báo giải thích cụ thể số lượng thiếu',
      'Không làm ảnh hưởng hay sai lệch số lượng tồn hiện tại'
    ]
  },
  {
    id: 'SCENARIO_CANCELLATION',
    name: '4. Hủy Đơn & Giải Phóng Giữ Tồn Tức Thời',
    description: 'Hủy đơn hàng trước khi xuất kho. Số lượng hàng đã khóa được hoàn trả ngay lập tức vào tồn khả dụng.',
    category: 'Orders',
    roleRecommended: 'manager',
    steps: [
      'Chọn đơn hàng #ORD-44812 đang ở trạng thái Chờ xử lý',
      'Thực hiện hủy đơn với lý do: Khách đổi địa chỉ',
      'Giải phóng lượng tồn đã khóa (Reserved giảm, Available tăng lại)',
      'Tồn vật lý trên kệ giữ nguyên, ghi sổ Stock Ledger sự kiện RELEASE'
    ]
  },
  {
    id: 'SCENARIO_MISMATCH_PICK',
    name: '5. Quét Sai Mã Vạch Đóng Gói (Scan Error)',
    description: 'Mô phỏng nhân viên đóng gói quét nhầm mã vạch sản phẩm. Hệ thống phát chuông cảnh báo và chặn in tem giao.',
    category: 'Fulfillment',
    roleRecommended: 'warehouse',
    steps: [
      'Mở màn hình đóng gói đơn hàng #ORD-90214 (yêu cầu NX-AIR-PRO)',
      'Nhân viên quét nhầm mã vạch của Cáp sạc NX-CABLE-100W',
      'Hệ thống từ chối xác nhận và rung cảnh báo mã sai',
      'Bắt buộc quét lại đúng mã vạch trước khi cho phép in phiếu giao'
    ]
  },
  {
    id: 'SCENARIO_FAILED_DELIVERY',
    name: '6. Giao Hàng Thất Bại & Chuyển Hoàn (RTS)',
    description: 'Đơn vị vận chuyển hoàn trả bưu kiện do không liên lạc được với người nhận. Tự động khởi tạo phiếu hoàn kho.',
    category: 'Fulfillment',
    roleRecommended: 'warehouse',
    steps: [
      'Đơn hàng #ORD-10924 được đánh dấu Giao không thành công sau 3 lần gọi',
      'Chuyển trạng thái sang Giao thất bại / Hoàn hàng (RTS)',
      'Khởi tạo phiếu kiểm nhận hoàn kho'
    ]
  },
  {
    id: 'SCENARIO_PARTIAL_RETURN',
    name: '7. Trả Hàng Một Phần & Nhập Lại Tồn',
    description: 'Khách hàng trả lại 1 sản phẩm còn nguyên seal. Kiểm tra chất lượng (QC) đạt và nhập lại tồn khả dụng.',
    category: 'Returns',
    roleRecommended: 'manager',
    steps: [
      'Tiếp nhận yêu cầu RMA từ đơn #ORD-88201',
      'Thực hiện kiểm tra ngoại quan: Hàng mới 100%, nguyên hộp',
      'Phê duyệt nhập lại kho khả dụng (Available +1)',
      'Tạo bút toán hoàn tiền tương ứng cho khách'
    ]
  },
  {
    id: 'SCENARIO_DAMAGED_QC',
    name: '8. Hàng Lỗi / Hỏng Phải Cách Ly (Quarantine)',
    description: 'Sản phẩm trả về bị móp méo, trầy xước. Hệ thống đưa vào kho Hàng Hỏng (Damaged), không cho mở bán lại.',
    category: 'Returns',
    roleRecommended: 'warehouse',
    steps: [
      'Kiểm định chất lượng sản phẩm hoàn về phát hiện vỡ màng loa',
      'Đánh dấu kết quả QC: Không đạt chuẩn bán lại',
      'Cộng số lượng vào chỉ số Damaged / Scrap',
      'Không cộng vào tồn khả dụng Available, gửi thông báo khiếu nại sàn'
    ]
  },
  {
    id: 'SCENARIO_WARRANTY_RMA',
    name: '9. Tra Cứu Serial & Xử Lý Bảo Hành',
    description: 'Khách hàng mang sản phẩm đến bảo hành. Tra cứu lịch sử theo Serial Number và ghi nhận tiến trình sửa chữa.',
    category: 'Returns',
    roleRecommended: 'manager',
    steps: [
      'Tra cứu số Serial: NX-PRO-8921401',
      'Hệ thống hiển thị ngày kích hoạt bảo hành, thời hạn còn 10 tháng',
      'Ghi nhận lỗi mất kết nối Bluetooth và tạo phiếu tiếp nhận RMA'
    ]
  },
  {
    id: 'SCENARIO_SUPPLIER_SHORTAGE',
    name: '10. Nhà Cung Cấp Giao Thiếu Hàng (PO Shortage)',
    description: 'Đơn mua hàng đặt 100 sản phẩm nhưng nhà cung ứng chỉ giao 80. Hệ thống tách đơn và ghi nhận công nợ đúng thực tế.',
    category: 'Inventory',
    roleRecommended: 'warehouse',
    steps: [
      'Mở phiếu nhập hàng đơn PO-2026-081 (Đặt 100 cái NX-AIR-PRO)',
      'Thủ kho đếm thực nhận: 80 cái tại cửa nhập kho',
      'Hệ thống cập nhật Physical +80 và giữ lại 20 cái ở trạng thái Backlog'
    ]
  },
  {
    id: 'SCENARIO_FEE_MISMATCH',
    name: '11. Phát Hiện Lệch Phí Đối Soát Sàn TMĐT',
    description: 'Đối soát báo cáo thanh toán của Shopee phát hiện sàn trừ vượt 3.400.000 ₫ so với biểu phí thỏa thuận.',
    category: 'Finance',
    roleRecommended: 'finance',
    steps: [
      'Nạp tệp đối soát kỳ quyết toán Tuần 43 của sàn Shopee',
      'Hệ thống tự động so sánh phí trừ thực tế vs công thức chiết khấu',
      'Bật cảnh báo lệch phí: Phát hiện thu thừa 3.400.000 ₫',
      'Tạo báo cáo chi tiết để xuất gửi khiếu nại cho nhân sự hỗ trợ sàn'
    ]
  },
  {
    id: 'SCENARIO_UNAUTHORIZED_ACTION',
    name: '12. Kiểm Tra Chặn Quyền Nhân Viên (RBAC)',
    description: 'Thử nghiệm thao tác sửa sổ cái kế toán khi đang ở vai trò Thủ Kho hoặc Người Xem. Hệ thống chặn và hiển thị lý do.',
    category: 'RBAC',
    roleRecommended: 'viewer',
    steps: [
      'Chuyển vai trò sang: Người xem (Viewer) hoặc Thủ kho',
      'Cố gắng bấm nút Xóa đơn hàng hoặc Tạo bút toán ghi sổ',
      'Hệ thống vô hiệu hóa nút bấm và thông báo: Quyền bị giới hạn'
    ]
  }
];

export async function executeScenario(scenarioId: DemoScenarioId): Promise<{ success: boolean; message: string; details?: unknown }> {
  await mockStore.delay(100);

  switch (scenarioId) {
    case 'SCENARIO_NORMAL_DAY': {
      // Create 3 realistic orders
      mockStore.placeOrderAtomic(
        {
          tenant_id: mockStore.getActiveTenant().id,
          order_number: `ORD-NORM-${Math.floor(1000 + Math.random() * 9000)}`,
          customer_id: 'cust_01',
          status: 'pending',
          payment_status: 'paid',
          total_amount: 1250000,
          notes: 'Kịch bản: Đơn hàng Shopee sáng ngày thường',
          placed_at: new Date().toISOString()
        },
        [{ product_id: 'prod_air_pro', sku: 'NX-AIR-PRO', quantity: 1, unit_price: 1250000 }]
      );

      mockStore.placeOrderAtomic(
        {
          tenant_id: mockStore.getActiveTenant().id,
          order_number: `ORD-NORM-${Math.floor(1000 + Math.random() * 9000)}`,
          customer_id: 'cust_02',
          status: 'processing',
          payment_status: 'paid',
          total_amount: 390000,
          notes: 'Kịch bản: Đơn hàng TikTok Shop buổi trưa',
          placed_at: new Date().toISOString()
        },
        [{ product_id: 'prod_titan_1l', sku: 'NX-TITAN-1L', quantity: 1, unit_price: 390000 }]
      );

      return {
        success: true,
        message: '✓ Đã tạo thành công 2 đơn hàng ngày thường từ Shopee và TikTok. Tồn kho khả dụng đã tự động trừ tương ứng và khóa an toàn!'
      };
    }

    case 'SCENARIO_FLASH_SALE': {
      let ordersPlaced = 0;
      for (let i = 0; i < 5; i++) {
        const res = mockStore.placeOrderAtomic(
          {
            tenant_id: mockStore.getActiveTenant().id,
            order_number: `FLASH-${Math.floor(10000 + Math.random() * 90000)}`,
            customer_id: 'cust_03',
            status: 'processing',
            payment_status: 'paid',
            total_amount: 1250000,
            notes: `Flash Sale đợt #${i + 1}`,
            placed_at: new Date().toISOString()
          },
          [{ product_id: 'prod_air_pro', sku: 'NX-AIR-PRO', quantity: 2, unit_price: 1250000 }]
        );
        if (res.success) ordersPlaced++;
      }
      return {
        success: true,
        message: `⚡ Flash sale hoàn tất: ${ordersPlaced} đợt đơn hàng dồn về cùng lúc đã được khóa tồn nguyên tử thành công. Zero bán âm!`
      };
    }

    case 'SCENARIO_STOCKOUT': {
      const res = mockStore.placeOrderAtomic(
        {
          tenant_id: mockStore.getActiveTenant().id,
          order_number: `ORD-FAIL-OUT`,
          customer_id: 'cust_01',
          status: 'pending',
          payment_status: 'unpaid',
          total_amount: 189000000,
          notes: 'Đơn gom vượt số lượng tồn khả dụng',
          placed_at: new Date().toISOString()
        },
        [{ product_id: 'prod_kb_wave', sku: 'NX-KB-WAVE', quantity: 150, unit_price: 1890000 }]
      );
      return {
        success: !res.success,
        message: res.error || 'Cơ chế chống bán âm đã kích hoạt thành công!'
      };
    }

    case 'SCENARIO_CANCELLATION': {
      const orders = mockStore.getOrders();
      const cancelable = orders.find(o => o.status === 'pending' || o.status === 'processing');
      if (cancelable) {
        mockStore.cancelOrderAtomic(cancelable.id, 'Khách hàng đổi ý muốn đổi sang mẫu khác');
        return {
          success: true,
          message: `✓ Đã hủy an toàn đơn hàng #${cancelable.order_number}. Lượng tồn khóa đã được giải phóng 100% về tồn khả dụng!`
        };
      }
      return {
        success: true,
        message: 'Không tìm thấy đơn hàng đang chờ xử lý để hủy. Hãy bấm tạo đơn trước.'
      };
    }

    case 'SCENARIO_MISMATCH_PICK': {
      return {
        success: true,
        message: '⚠️ Cảnh báo quét sai: Mã vạch sản phẩm quét (8938501239999) không khớp với đơn hàng (8938501239014). Chặn in tem thành công!'
      };
    }

    case 'SCENARIO_FAILED_DELIVERY': {
      const orders = mockStore.getOrders();
      const shipped = orders.find(o => o.status === 'shipped');
      if (shipped) {
        mockStore.cancelOrderAtomic(shipped.id, 'Giao hàng thất bại 3 lần - Đơn vị vận chuyển hoàn hàng RTS');
        return {
          success: true,
          message: `✓ Đơn #${shipped.order_number} đã được ghi nhận Giao thất bại và khởi tạo phiếu hoàn kho tự động.`
        };
      }
      return {
        success: true,
        message: 'Đã giả lập đơn chuyển hoàn. Phiếu RMA kiểm nhận được tạo.'
      };
    }

    case 'SCENARIO_PARTIAL_RETURN': {
      const returns = mockStore.getReturns();
      if (returns.length > 0) {
        mockStore.inspectReturnQC(returns[0].id, true);
        return {
          success: true,
          message: '✓ Kiểm tra chất lượng (QC) đạt chuẩn 100%. Đã nhập lại sản phẩm vào Tồn khả dụng (Available) và tạo bút toán hoàn tiền.'
        };
      }
      return {
        success: true,
        message: '✓ Đã tạo yêu cầu trả hàng và kiểm tra QC đạt chuẩn.'
      };
    }

    case 'SCENARIO_DAMAGED_QC': {
      const returns = mockStore.getReturns();
      if (returns.length > 0) {
        mockStore.inspectReturnQC(returns[0].id, false);
        return {
          success: true,
          message: '🚨 QC Không Đạt Chuẩn: Sản phẩm bị trầy xước nặng. Đã chuyển sang kho Hàng Hỏng (Damaged) và không cho mở bán lại.'
        };
      }
      return {
        success: true,
        message: '🚨 Đã cách ly sản phẩm lỗi vào danh mục Damaged thành công.'
      };
    }

    case 'SCENARIO_WARRANTY_RMA': {
      return {
        success: true,
        message: '✓ Serial NX-PRO-8921401: Kích hoạt ngày 28/10/2026. Còn 12 tháng bảo hành chính hãng. Đã lập phiếu tiếp nhận sửa chữa.'
      };
    }

    case 'SCENARIO_SUPPLIER_SHORTAGE': {
      return {
        success: true,
        message: '⚠️ Đơn PO-2026-081 nhận thiếu: Nhà cung ứng giao 80/100 cái. Tồn vật lý đã cộng +80 cái, tạo cảnh báo nợ 20 cái còn lại.'
      };
    }

    case 'SCENARIO_FEE_MISMATCH': {
      return {
        success: true,
        message: '🚨 Cảnh Báo Lệch Phí Sàn Shopee: Thu vượt 3.400.000 ₫ so với biểu phí hợp đồng. Đã lưu bằng chứng đối soát để gửi khiếu nại.'
      };
    }

    case 'SCENARIO_UNAUTHORIZED_ACTION': {
      return {
        success: true,
        message: '🔒 Quyền truy cập bị từ chối: Thao tác này chỉ dành cho vai trò Kế toán hoặc Chủ doanh nghiệp (Owner/Admin).'
      };
    }

    default:
      return { success: false, message: 'Kịch bản chưa được định nghĩa.' };
  }
}
