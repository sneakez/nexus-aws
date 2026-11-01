import type { MockDatabaseSnapshot } from './types';

function getRelativeDate(daysAgo: number, hour = 10, minute = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const INITIAL_MOCK_DATABASE: MockDatabaseSnapshot = {
  schemaVersion: 4,
  snapshotId: 'SNAPSHOT-V6.2-20261029-DIGITAL-AUDIT',
  stateRevision: 0,
  lastUpdated: new Date().toISOString(),
  activeTenantId: 'tenant_flagship',
  activeRole: 'owner',
  activeUserId: 'usr_owner_01',

  // ============ Tenants ============
  tenants: [
    {
      id: 'tenant_flagship',
      slug: 'nexus-flagship',
      name: 'Nexus Flagship Store (Chính thức)',
      status: 'active',
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'tenant_logistics_3pl',
      slug: 'nexus-logistics-3pl',
      name: 'Nexus Logistics Hub 3PL',
      status: 'active',
      created_at: '2026-02-15T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'tenant_retail_hanoi',
      slug: 'nexus-retail-hanoi',
      name: 'Nexus Retail Chi Nhánh Hà Nội',
      status: 'active',
      created_at: '2026-03-01T08:30:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Memberships ============
  memberships: [
    { id: 'mship_growth', tenant_id: 'tenant_flagship', user_id: 'usr_growth_01', role: 'growth', status: 'active', created_at: '2026-01-10T08:00:00Z', updated_at: '2026-10-30T00:00:00Z' },
    {
      id: 'mship_owner',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_owner_01',
      role: 'owner',
      status: 'active',
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_admin',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_admin_01',
      role: 'admin',
      status: 'active',
      created_at: '2026-01-12T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_manager',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_manager_01',
      role: 'manager',
      status: 'active',
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_warehouse',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_warehouse_01',
      role: 'warehouse',
      status: 'active',
      created_at: '2026-02-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_finance',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_finance_01',
      role: 'finance',
      status: 'active',
      created_at: '2026-02-05T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'mship_viewer',
      tenant_id: 'tenant_flagship',
      user_id: 'usr_viewer_01',
      role: 'viewer',
      status: 'active',
      created_at: '2026-03-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Profiles ============
  profiles: [
    { id: 'usr_growth_01', email: 'growth@nexusoms.io', full_name: 'Nhân viên Growth', role: 'manager', is_active: true, created_at: '2026-01-10T08:00:00Z', updated_at: '2026-10-30T00:00:00Z' },
    {
      id: 'usr_owner_01',
      email: 'owner@nexusoms.io',
      full_name: 'Nguyễn Thanh Bình (Chủ Sở Hữu)',
      role: 'admin',
      is_active: true,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_admin_01',
      email: 'admin@nexusoms.io',
      full_name: 'Trần Quản Trị (Admin Hệ Thống)',
      role: 'admin',
      is_active: true,
      created_at: '2026-01-12T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_manager_01',
      email: 'manager@nexusoms.io',
      full_name: 'Lê Vận Hành (Trưởng Phòng OMS)',
      role: 'manager',
      is_active: true,
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_warehouse_01',
      email: 'kho@nexusoms.io',
      full_name: 'Phạm Thủ Kho (Trưởng Kho)',
      role: 'warehouse',
      is_active: true,
      created_at: '2026-02-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_finance_01',
      email: 'ketoan@nexusoms.io',
      full_name: 'Vũ Kế Toán (Chuyên Viên Sổ Kép)',
      role: 'admin',
      is_active: true,
      created_at: '2026-02-05T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'usr_viewer_01',
      email: 'viewer@nexusoms.io',
      full_name: 'Hoàng Quan Sát (Kiểm Toán Viên)',
      role: 'manager',
      is_active: true,
      created_at: '2026-03-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Warehouses ============
  warehouses: [
    {
      id: 'wh_north_01',
      tenant_id: 'tenant_flagship',
      code: 'WH-NORTH',
      name: 'Kho Tổng Miền Bắc (Hà Nội)',
      address: 'Khu Công Nghiệp Đài Tư, Q. Long Biên, Hà Nội',
      latitude: 21.033,
      longitude: 105.892,
      priority: 1,
      is_active: true,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'wh_south_01',
      tenant_id: 'tenant_flagship',
      code: 'WH-SOUTH',
      name: 'Kho Tổng Miền Nam (Bình Dương)',
      address: 'KCN VSIP 1, Thuận An, Bình Dương',
      latitude: 10.932,
      longitude: 106.702,
      priority: 2,
      is_active: true,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'wh_danang_01',
      tenant_id: 'tenant_flagship',
      code: 'WH-DANANG',
      name: 'Kho Trung Chuyển Đà Nẵng',
      address: 'KCN Hòa Khánh, Q. Liên Chiểu, Đà Nẵng',
      latitude: 16.074,
      longitude: 108.152,
      priority: 3,
      is_active: true,
      created_at: '2026-02-01T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Products ============
  products: [
    {
      id: 'prod_air_pro',
      tenant_id: 'tenant_flagship',
      name: 'Tai nghe Bluetooth ANC Nexus Pro',
      sku: 'NX-AIR-PRO',
      category: 'Âm Thanh & Phụ Kiện',
      price: 1250000,
      cost: 680000,
      moving_avg_cost: 680000,
      cost_price: 680000,
      stock: 180,
      reorder_level: 30,
      safety_stock: 20,
      sku_type: 'physical',
      barcode: '8938501239014',
      status: 'active',
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_titan_1l',
      tenant_id: 'tenant_flagship',
      name: 'Bình Giữ Nhiệt Titan 1000ml Nexus Hydro',
      sku: 'NX-TITAN-1L',
      category: 'Gia Dụng & Đời Sống',
      price: 390000,
      cost: 195000,
      moving_avg_cost: 195000,
      cost_price: 195000,
      stock: 95,
      reorder_level: 25,
      safety_stock: 15,
      sku_type: 'physical',
      barcode: '8938501239021',
      status: 'active',
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_kb_wave',
      tenant_id: 'tenant_flagship',
      name: 'Bàn phím cơ không dây Silent Wave 75%',
      sku: 'NX-KB-WAVE',
      category: 'Gaming & Công Nghệ',
      price: 1890000,
      cost: 1050000,
      moving_avg_cost: 1050000,
      cost_price: 1050000,
      stock: 60,
      reorder_level: 20,
      safety_stock: 10,
      sku_type: 'physical',
      barcode: '8938501239038',
      status: 'active',
      created_at: '2026-01-18T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_mouse_pro',
      tenant_id: 'tenant_flagship',
      name: 'Chuột Không Dây Siêu Nhẹ Nexus Falcon 54g',
      sku: 'NX-MOUSE-PRO',
      category: 'Gaming & Công Nghệ',
      price: 850000,
      cost: 420000,
      moving_avg_cost: 420000,
      cost_price: 420000,
      stock: 120,
      reorder_level: 25,
      safety_stock: 15,
      sku_type: 'physical',
      barcode: '8938501239045',
      status: 'active',
      created_at: '2026-01-20T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_cable_100w',
      tenant_id: 'tenant_flagship',
      name: 'Cáp sạc nhanh Type-C Bọc Dù 100W E-Marker',
      sku: 'NX-CABLE-100W',
      category: 'Phụ Kiện Điện Thoại',
      price: 150000,
      cost: 55000,
      moving_avg_cost: 55000,
      cost_price: 55000,
      stock: 450,
      reorder_level: 80,
      safety_stock: 50,
      sku_type: 'physical',
      barcode: '8938501239052',
      status: 'active',
      created_at: '2026-01-22T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'prod_hub_8in1',
      tenant_id: 'tenant_flagship',
      name: 'Hub Chuyển Đổi USB-C Đa Năng 8 trong 1 4K@60Hz',
      sku: 'NX-HUB-8IN1',
      category: 'Gaming & Công Nghệ',
      price: 680000,
      cost: 340000,
      moving_avg_cost: 340000,
      cost_price: 340000,
      stock: 75,
      reorder_level: 20,
      safety_stock: 10,
      sku_type: 'physical',
      barcode: '8938501239069',
      status: 'active',
      created_at: '2026-01-25T08:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ 5-State Inventory ============
  inventory5State: [
    {
      sku: 'NX-AIR-PRO',
      product_id: 'prod_air_pro',
      name: 'Tai nghe Bluetooth ANC Nexus Pro',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 180,
      reserved: 45,
      sellable: 128,
      available: 128,
      unavailable: 7,
      pending_qc: 5,
      damaged: 2,
      in_transit: 15,
      incoming: 100,
      inbound: 100,
      safety_stock: 20,
      reorder_level: 30,
      sales_velocity: 8.5,
      runway_days: 15,
      status: 'Healthy'
    },
    {
      sku: 'NX-TITAN-1L',
      product_id: 'prod_titan_1l',
      name: 'Bình Giữ Nhiệt Titan 1000ml Nexus Hydro',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 95,
      reserved: 25,
      sellable: 65,
      available: 65,
      unavailable: 5,
      pending_qc: 3,
      damaged: 2,
      in_transit: 10,
      incoming: 50,
      inbound: 50,
      safety_stock: 15,
      reorder_level: 25,
      sales_velocity: 6.2,
      runway_days: 10,
      status: 'Healthy'
    },
    {
      sku: 'NX-KB-WAVE',
      product_id: 'prod_kb_wave',
      name: 'Bàn phím cơ không dây Silent Wave 75%',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 60,
      reserved: 18,
      sellable: 39,
      available: 39,
      unavailable: 3,
      pending_qc: 2,
      damaged: 1,
      in_transit: 8,
      incoming: 40,
      inbound: 40,
      safety_stock: 10,
      reorder_level: 20,
      sales_velocity: 4.8,
      runway_days: 8,
      status: 'Warning'
    },
    {
      sku: 'NX-MOUSE-PRO',
      product_id: 'prod_mouse_pro',
      name: 'Chuột Không Dây Siêu Nhẹ Nexus Falcon 54g',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 120,
      reserved: 30,
      sellable: 83,
      available: 83,
      unavailable: 7,
      pending_qc: 4,
      damaged: 3,
      in_transit: 12,
      incoming: 60,
      inbound: 60,
      safety_stock: 15,
      reorder_level: 25,
      sales_velocity: 7.1,
      runway_days: 12,
      status: 'Healthy'
    },
    {
      sku: 'NX-CABLE-100W',
      product_id: 'prod_cable_100w',
      name: 'Cáp sạc nhanh Type-C Bọc Dù 100W E-Marker',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 450,
      reserved: 120,
      sellable: 320,
      available: 320,
      unavailable: 10,
      pending_qc: 10,
      damaged: 0,
      in_transit: 30,
      incoming: 200,
      inbound: 200,
      safety_stock: 50,
      reorder_level: 80,
      sales_velocity: 24.0,
      runway_days: 13,
      status: 'Healthy'
    },
    {
      sku: 'NX-HUB-8IN1',
      product_id: 'prod_hub_8in1',
      name: 'Hub Chuyển Đổi USB-C Đa Năng 8 trong 1 4K@60Hz',
      warehouse_id: 'wh_north_01',
      warehouse_name: 'Kho Tổng Miền Bắc',
      physical: 75,
      reserved: 15,
      sellable: 56,
      available: 56,
      unavailable: 4,
      pending_qc: 2,
      damaged: 2,
      in_transit: 5,
      incoming: 30,
      inbound: 30,
      safety_stock: 10,
      reorder_level: 20,
      sales_velocity: 3.5,
      runway_days: 16,
      status: 'Healthy'
    }
  ],

  // ============ Customers ============
  customers: [
    {
      id: 'cust_01',
      tenant_id: 'tenant_flagship',
      name: 'Hoàng Minh Tâm',
      email: 'minhtam.hoang@gmail.com',
      phone: '0912345678',
      company: 'Công Ty TNHH Truyền Thông Tâm An',
      address: 'Số 45 Lê Duẩn, Hoàn Kiếm, Hà Nội',
      status: 'active',
      tier: 'gold',
      created_at: '2026-02-10T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'cust_02',
      tenant_id: 'tenant_flagship',
      name: 'Lê Thu Hà',
      email: 'thuha.le@outlook.com',
      phone: '0987654321',
      company: 'Cửa hàng Bán lẻ Phụ kiện Hà Nội',
      address: 'Số 12 Chùa Bộc, Đống Đa, Hà Nội',
      status: 'active',
      tier: 'silver',
      created_at: '2026-02-14T11:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'cust_03',
      tenant_id: 'tenant_flagship',
      name: 'Nguyễn Văn Bình',
      email: 'binh.nguyen@vietcorp.vn',
      phone: '0903456789',
      company: 'VietCorp Technology Group',
      address: 'Tòa nhà Bitexco, Q.1, TP. Hồ Chí Minh',
      status: 'active',
      tier: 'platinum',
      created_at: '2026-02-18T14:30:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'cust_04',
      tenant_id: 'tenant_flagship',
      name: 'Trần Mai Linh',
      email: 'mailinh.tran@studio8.vn',
      phone: '0933221100',
      company: 'Studio 8 Thiết Kế',
      address: 'Số 88 Nguyễn Thị Minh Khai, Q.3, TP. Hồ Chí Minh',
      status: 'active',
      tier: 'standard',
      created_at: '2026-03-01T10:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'cust_05',
      tenant_id: 'tenant_flagship',
      name: 'Đặng Quốc Anh',
      email: 'quocanh.dang@gearvn.pro',
      phone: '0977889900',
      company: 'Đại lý Gaming Gear Hà Đông',
      address: 'Số 15 Quang Trung, Hà Đông, Hà Nội',
      status: 'lead',
      tier: 'standard',
      created_at: '2026-03-15T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'cust_06',
      tenant_id: 'tenant_flagship',
      name: 'Vũ Thị Minh Hạnh',
      email: 'hanh.vu@gmail.com',
      phone: '0966554433',
      company: 'Shop Phụ Kiện Hạnh Phúc',
      address: 'Số 204 Cầu Giấy, Hà Nội',
      status: 'inactive',
      tier: 'silver',
      created_at: '2026-01-20T14:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],

  // ============ Suppliers ============
  suppliers: [
    {
      id: 'supp_foxconn',
      tenant_id: 'tenant_flagship',
      code: 'SUPP-FOXCONN',
      name: 'Foxconn Acoustic Technology VN',
      contact_person: 'Trương Quốc Bảo',
      email: 'bao.truong@foxconn-vn.com',
      phone: '0241-3892019',
      address: 'KCN Quế Võ, Bắc Ninh',
      payment_terms: 'Net 30',
      lead_time_days: 7,
      rating: 4.8,
      created_at: '2026-01-10T08:00:00Z'
    },
    {
      id: 'supp_titan',
      tenant_id: 'tenant_flagship',
      code: 'SUPP-TITAN',
      name: 'Titan Hardware Manufacturing Co.',
      contact_person: 'Vũ Đình Cường',
      email: 'sales@titan-hardware.vn',
      phone: '0274-3782910',
      address: 'KCN Sóng Thần, Dĩ An, Bình Dương',
      payment_terms: 'Net 45',
      lead_time_days: 5,
      rating: 4.9,
      created_at: '2026-01-15T08:00:00Z'
    },
    {
      id: 'supp_silent_wave',
      tenant_id: 'tenant_flagship',
      code: 'SUPP-KEYCHRON',
      name: 'KeyPrecision Tech Co., Ltd',
      contact_person: 'Lý Gia Hưng',
      email: 'hung.ly@keyprecision.io',
      phone: '0908819201',
      address: 'Khu Công Nghệ Cao Q.9, TP. Thủ Đức',
      payment_terms: 'COD',
      lead_time_days: 10,
      rating: 4.7,
      created_at: '2026-02-01T08:00:00Z'
    }
  ],

  // ============ Orders ============
  orders: [
    {
      id: 'ord_90214',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-90214',
      customer_id: 'cust_01',
      status: 'processing',
      subtotal: 1250000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 1250000,
      total_amount: 1250000,
      channel: 'shopee',
      channel_order_sn: '261028SHP90214',
      payment_status: 'paid',
      payment_method: 'bank_transfer',
      shipping_address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM',
      notes: 'Đơn Shopee Flash Sale — Giao hỏa tốc trước 17h',
      placed_at: getRelativeDate(0, 9, 15),
      created_at: getRelativeDate(0, 9, 15),
      updated_at: getRelativeDate(0, 9, 20),
      assigned_warehouse_id: 'wh_north_01',
      fulfillment_wave_id: 'wave_410'
    },
    {
      id: 'ord_44812',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-44812',
      customer_id: 'cust_02',
      status: 'pending',
      subtotal: 780000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 780000,
      total_amount: 780000,
      channel: 'tiktok',
      channel_order_sn: 'TTK-2026-44812',
      payment_status: 'unpaid',
      payment_method: 'cash',
      shipping_address: '12 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP.HCM',
      notes: 'Đơn TikTok Shop — Đang chờ gom sóng Wave #W-410',
      placed_at: getRelativeDate(0, 8, 30),
      created_at: getRelativeDate(0, 8, 30),
      updated_at: getRelativeDate(0, 8, 30),
      assigned_warehouse_id: 'wh_north_01',
      fulfillment_wave_id: 'wave_410'
    },
    {
      id: 'ord_10924',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-10924',
      customer_id: 'cust_03',
      status: 'shipped',
      subtotal: 1890000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 1890000,
      total_amount: 1890000,
      channel: 'lazada',
      channel_order_sn: 'LZD-VN-10924',
      payment_status: 'paid',
      payment_method: 'credit_card',
      shipping_address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
      notes: 'Đơn Lazada Mall — Đã bàn giao SPX Express',
      placed_at: getRelativeDate(1, 8, 45),
      shipped_at: getRelativeDate(1, 11, 0),
      created_at: getRelativeDate(1, 8, 45),
      updated_at: getRelativeDate(1, 11, 0),
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_88201',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-88201',
      customer_id: 'cust_04',
      status: 'delivered',
      subtotal: 2190000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 2190000,
      total_amount: 2190000,
      channel: 'website',
      channel_order_sn: 'WEB-88201',
      payment_status: 'paid',
      payment_method: 'bank_transfer',
      shipping_address: 'Khu công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội',
      notes: 'Đơn Website Direct — Khách đã nhận hàng và ký nhận',
      placed_at: getRelativeDate(1, 14, 20),
      shipped_at: getRelativeDate(1, 16, 0),
      delivered_at: getRelativeDate(0, 8, 10),
      created_at: getRelativeDate(1, 14, 20),
      updated_at: getRelativeDate(0, 8, 10),
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_77190',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-77190',
      customer_id: 'cust_01',
      status: 'cancelled',
      subtotal: 390000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 390000,
      total_amount: 390000,
      channel: 'shopee',
      channel_order_sn: '261027SHP77190',
      payment_status: 'refunded',
      payment_method: 'bank_transfer',
      shipping_address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, TP.HCM',
      notes: 'Khách đổi ý muốn lấy size lớn hơn — Tồn đã giải phóng tự động',
      placed_at: getRelativeDate(2, 16, 0),
      created_at: getRelativeDate(2, 16, 0),
      updated_at: getRelativeDate(2, 16, 30),
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_62103',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-62103',
      customer_id: 'cust_02',
      status: 'delivered',
      subtotal: 1530000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 1530000,
      total_amount: 1530000,
      channel: 'shopee',
      channel_order_sn: '261026SHP62103',
      payment_status: 'paid',
      payment_method: 'bank_transfer',
      shipping_address: 'Số 12 Chùa Bộc, Đống Đa, Hà Nội',
      notes: 'Giao giờ hành chính',
      placed_at: getRelativeDate(2, 10, 15),
      shipped_at: getRelativeDate(2, 14, 0),
      delivered_at: getRelativeDate(1, 9, 30),
      created_at: getRelativeDate(2, 10, 15),
      updated_at: getRelativeDate(1, 9, 30),
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_55410',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-55410',
      customer_id: 'cust_03',
      status: 'delivered',
      subtotal: 3140000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 3140000,
      total_amount: 3140000,
      channel: 'website',
      channel_order_sn: 'WEB-55410',
      payment_status: 'paid',
      payment_method: 'bank_transfer',
      shipping_address: 'Tòa nhà Bitexco, Q.1, TP. Hồ Chí Minh',
      notes: 'Đơn hàng doanh nghiệp — Giao kèm hóa đơn GTGT',
      placed_at: getRelativeDate(3, 9, 0),
      shipped_at: getRelativeDate(3, 11, 30),
      delivered_at: getRelativeDate(2, 15, 0),
      created_at: getRelativeDate(3, 9, 0),
      updated_at: getRelativeDate(2, 15, 0),
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_48902',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-48902',
      customer_id: 'cust_04',
      status: 'delivered',
      subtotal: 1930000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 1930000,
      total_amount: 1930000,
      channel: 'tiktok',
      channel_order_sn: 'TTK-2026-48902',
      payment_status: 'paid',
      payment_method: 'credit_card',
      shipping_address: 'Số 88 Nguyễn Thị Minh Khai, Q.3, TP. Hồ Chí Minh',
      notes: 'Đơn TikTok Livestream độc quyền',
      placed_at: getRelativeDate(4, 15, 30),
      shipped_at: getRelativeDate(4, 17, 0),
      delivered_at: getRelativeDate(3, 10, 0),
      created_at: getRelativeDate(4, 15, 30),
      updated_at: getRelativeDate(3, 10, 0),
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_39120',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-39120',
      customer_id: 'cust_01',
      status: 'delivered',
      subtotal: 2740000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 2740000,
      total_amount: 2740000,
      channel: 'lazada',
      channel_order_sn: 'LZD-VN-39120',
      payment_status: 'paid',
      payment_method: 'credit_card',
      shipping_address: 'Số 45 Lê Duẩn, Hoàn Kiếm, Hà Nội',
      notes: 'Đơn Lazada Siêu Sale',
      placed_at: getRelativeDate(5, 11, 20),
      shipped_at: getRelativeDate(5, 14, 0),
      delivered_at: getRelativeDate(4, 16, 20),
      created_at: getRelativeDate(5, 11, 20),
      updated_at: getRelativeDate(4, 16, 20),
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_28415',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-28415',
      customer_id: 'cust_02',
      status: 'delivered',
      subtotal: 1640000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 1640000,
      total_amount: 1640000,
      channel: 'shopee',
      channel_order_sn: '261022SHP28415',
      payment_status: 'paid',
      payment_method: 'bank_transfer',
      shipping_address: 'Số 12 Chùa Bộc, Đống Đa, Hà Nội',
      notes: 'Khách hàng thân thiết',
      placed_at: getRelativeDate(6, 13, 45),
      shipped_at: getRelativeDate(6, 16, 0),
      delivered_at: getRelativeDate(5, 11, 0),
      created_at: getRelativeDate(6, 13, 45),
      updated_at: getRelativeDate(5, 11, 0),
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_19042',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-19042',
      customer_id: 'cust_03',
      status: 'delivered',
      subtotal: 2570000,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 2570000,
      total_amount: 2570000,
      channel: 'website',
      channel_order_sn: 'WEB-19042',
      payment_status: 'paid',
      payment_method: 'bank_transfer',
      shipping_address: 'Tòa nhà Bitexco, Q.1, TP. Hồ Chí Minh',
      notes: 'Đơn hàng trực tuyến B2B',
      placed_at: getRelativeDate(10, 10, 0),
      shipped_at: getRelativeDate(10, 14, 0),
      delivered_at: getRelativeDate(9, 16, 0),
      created_at: getRelativeDate(10, 10, 0),
      updated_at: getRelativeDate(9, 16, 0),
      assigned_warehouse_id: 'wh_north_01'
    },
    {
      id: 'ord_12890',
      tenant_id: 'tenant_flagship',
      order_number: 'ORD-12890',
      customer_id: 'cust_04',
      status: 'delivered',
      subtotal: 3740000,
      tax: 0,
      shipping: 80000,
      discount: 0,
      total: 3820000,
      total_amount: 3820000,
      channel: 'shopee',
      channel_order_sn: '261010SHP12890',
      payment_status: 'paid',
      payment_method: 'bank_transfer',
      shipping_address: 'Số 88 Nguyễn Thị Minh Khai, Q.3, TP. Hồ Chí Minh',
      notes: 'Đơn combo thiết bị văn phòng',
      placed_at: getRelativeDate(18, 14, 0),
      shipped_at: getRelativeDate(18, 17, 0),
      delivered_at: getRelativeDate(17, 10, 0),
      created_at: getRelativeDate(18, 14, 0),
      updated_at: getRelativeDate(17, 10, 0),
      assigned_warehouse_id: 'wh_north_01'
    }
  ],

  // ============ Order Items ============
  orderItems: [
    {
      id: 'item_90214_1',
      order_id: 'ord_90214',
      product_id: 'prod_air_pro',
      product_name: 'Tai nghe Bluetooth ANC Nexus Pro',
      product_sku: 'NX-AIR-PRO',
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
      total_price: 1250000,
      unit_cost_mac_snapshot: 680000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(0, 9, 15)
    },
    {
      id: 'item_44812_1',
      order_id: 'ord_44812',
      product_id: 'prod_titan_1l',
      product_name: 'Bình Giữ Nhiệt Titan 1000ml Nexus Hydro',
      product_sku: 'NX-TITAN-1L',
      quantity: 2,
      unit_price: 390000,
      line_total: 780000,
      total_price: 780000,
      unit_cost_mac_snapshot: 195000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(0, 11, 30)
    },
    {
      id: 'item_10924_1',
      order_id: 'ord_10924',
      product_id: 'prod_kb_wave',
      product_name: 'Bàn phím cơ không dây Silent Wave 75%',
      product_sku: 'NX-KB-WAVE',
      quantity: 1,
      unit_price: 1890000,
      line_total: 1890000,
      total_price: 1890000,
      unit_cost_mac_snapshot: 1050000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(1, 8, 45)
    },
    {
      id: 'item_88201_1',
      order_id: 'ord_88201',
      product_id: 'prod_air_pro',
      product_name: 'Tai nghe Bluetooth ANC Nexus Pro',
      product_sku: 'NX-AIR-PRO',
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
      total_price: 1250000,
      unit_cost_mac_snapshot: 680000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(1, 14, 20)
    },
    {
      id: 'item_88201_2',
      order_id: 'ord_88201',
      product_id: 'prod_mouse_pro',
      product_name: 'Chuột Không Dây Siêu Nhẹ Nexus Falcon 54g',
      product_sku: 'NX-MOUSE-PRO',
      quantity: 1,
      unit_price: 850000,
      line_total: 850000,
      total_price: 850000,
      unit_cost_mac_snapshot: 420000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(1, 14, 20)
    },
    {
      id: 'item_88201_3',
      order_id: 'ord_88201',
      product_id: 'prod_cable_100w',
      product_name: 'Cáp sạc nhanh Type-C Bọc Dù 100W E-Marker',
      product_sku: 'NX-CABLE-100W',
      quantity: 1,
      unit_price: 90000,
      line_total: 90000,
      total_price: 90000,
      unit_cost_mac_snapshot: 55000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(1, 14, 20)
    },
    {
      id: 'item_77190_1',
      order_id: 'ord_77190',
      product_id: 'prod_titan_1l',
      product_name: 'Bình Giữ Nhiệt Titan 1000ml Nexus Hydro',
      product_sku: 'NX-TITAN-1L',
      quantity: 1,
      unit_price: 390000,
      line_total: 390000,
      total_price: 390000,
      unit_cost_mac_snapshot: 195000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(2, 16, 0)
    },
    {
      id: 'item_62103_1',
      order_id: 'ord_62103',
      product_id: 'prod_hub_8in1',
      product_name: 'Hub Chuyển Đổi USB-C Đa Năng 8 trong 1 4K@60Hz',
      product_sku: 'NX-HUB-8IN1',
      quantity: 1,
      unit_price: 680000,
      line_total: 680000,
      total_price: 680000,
      unit_cost_mac_snapshot: 340000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(2, 10, 15)
    },
    {
      id: 'item_62103_2',
      order_id: 'ord_62103',
      product_id: 'prod_mouse_pro',
      product_name: 'Chuột Không Dây Siêu Nhẹ Nexus Falcon 54g',
      product_sku: 'NX-MOUSE-PRO',
      quantity: 1,
      unit_price: 850000,
      line_total: 850000,
      total_price: 850000,
      unit_cost_mac_snapshot: 420000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(2, 10, 15)
    },
    {
      id: 'item_55410_1',
      order_id: 'ord_55410',
      product_id: 'prod_kb_wave',
      product_name: 'Bàn phím cơ không dây Silent Wave 75%',
      product_sku: 'NX-KB-WAVE',
      quantity: 1,
      unit_price: 1890000,
      line_total: 1890000,
      total_price: 1890000,
      unit_cost_mac_snapshot: 1050000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(3, 9, 0)
    },
    {
      id: 'item_55410_2',
      order_id: 'ord_55410',
      product_id: 'prod_air_pro',
      product_name: 'Tai nghe Bluetooth ANC Nexus Pro',
      product_sku: 'NX-AIR-PRO',
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
      total_price: 1250000,
      unit_cost_mac_snapshot: 680000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(3, 9, 0)
    },
    {
      id: 'item_48902_1',
      order_id: 'ord_48902',
      product_id: 'prod_air_pro',
      product_name: 'Tai nghe Bluetooth ANC Nexus Pro',
      product_sku: 'NX-AIR-PRO',
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
      total_price: 1250000,
      unit_cost_mac_snapshot: 680000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(4, 15, 30)
    },
    {
      id: 'item_48902_2',
      order_id: 'ord_48902',
      product_id: 'prod_hub_8in1',
      product_name: 'Hub Chuyển Đổi USB-C Đa Năng 8 trong 1 4K@60Hz',
      product_sku: 'NX-HUB-8IN1',
      quantity: 1,
      unit_price: 680000,
      line_total: 680000,
      total_price: 680000,
      unit_cost_mac_snapshot: 340000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(4, 15, 30)
    },
    {
      id: 'item_39120_1',
      order_id: 'ord_39120',
      product_id: 'prod_kb_wave',
      product_name: 'Bàn phím cơ không dây Silent Wave 75%',
      product_sku: 'NX-KB-WAVE',
      quantity: 1,
      unit_price: 1890000,
      line_total: 1890000,
      total_price: 1890000,
      unit_cost_mac_snapshot: 1050000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(5, 11, 20)
    },
    {
      id: 'item_39120_2',
      order_id: 'ord_39120',
      product_id: 'prod_mouse_pro',
      product_name: 'Chuột Không Dây Siêu Nhẹ Nexus Falcon 54g',
      product_sku: 'NX-MOUSE-PRO',
      quantity: 1,
      unit_price: 850000,
      line_total: 850000,
      total_price: 850000,
      unit_cost_mac_snapshot: 420000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(5, 11, 20)
    },
    {
      id: 'item_28415_1',
      order_id: 'ord_28415',
      product_id: 'prod_air_pro',
      product_name: 'Tai nghe Bluetooth ANC Nexus Pro',
      product_sku: 'NX-AIR-PRO',
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
      total_price: 1250000,
      unit_cost_mac_snapshot: 680000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(6, 13, 45)
    },
    {
      id: 'item_28415_2',
      order_id: 'ord_28415',
      product_id: 'prod_titan_1l',
      product_name: 'Bình Giữ Nhiệt Titan 1000ml Nexus Hydro',
      product_sku: 'NX-TITAN-1L',
      quantity: 1,
      unit_price: 390000,
      line_total: 390000,
      total_price: 390000,
      unit_cost_mac_snapshot: 195000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(6, 13, 45)
    },
    {
      id: 'item_19042_1',
      order_id: 'ord_19042',
      product_id: 'prod_kb_wave',
      product_name: 'Bàn phím cơ không dây Silent Wave 75%',
      product_sku: 'NX-KB-WAVE',
      quantity: 1,
      unit_price: 1890000,
      line_total: 1890000,
      total_price: 1890000,
      unit_cost_mac_snapshot: 1050000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(10, 10, 0)
    },
    {
      id: 'item_19042_2',
      order_id: 'ord_19042',
      product_id: 'prod_hub_8in1',
      product_name: 'Hub Chuyển Đổi USB-C Đa Năng 8 trong 1 4K@60Hz',
      product_sku: 'NX-HUB-8IN1',
      quantity: 1,
      unit_price: 680000,
      line_total: 680000,
      total_price: 680000,
      unit_cost_mac_snapshot: 340000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(10, 10, 0)
    },
    {
      id: 'item_12890_1',
      order_id: 'ord_12890',
      product_id: 'prod_air_pro',
      product_name: 'Tai nghe Bluetooth ANC Nexus Pro',
      product_sku: 'NX-AIR-PRO',
      quantity: 2,
      unit_price: 1250000,
      line_total: 2500000,
      total_price: 2500000,
      unit_cost_mac_snapshot: 680000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(18, 14, 0)
    },
    {
      id: 'item_12890_2',
      order_id: 'ord_12890',
      product_id: 'prod_mouse_pro',
      product_name: 'Chuột Không Dây Siêu Nhẹ Nexus Falcon 54g',
      product_sku: 'NX-MOUSE-PRO',
      quantity: 1,
      unit_price: 850000,
      line_total: 850000,
      total_price: 850000,
      unit_cost_mac_snapshot: 420000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(18, 14, 0)
    },
    {
      id: 'item_12890_3',
      order_id: 'ord_12890',
      product_id: 'prod_titan_1l',
      product_name: 'Bình Giữ Nhiệt Titan 1000ml Nexus Hydro',
      product_sku: 'NX-TITAN-1L',
      quantity: 1,
      unit_price: 390000,
      line_total: 390000,
      total_price: 390000,
      unit_cost_mac_snapshot: 195000,
      is_free_gift: false,
      parent_bundle_product_id: null,
      serial_numbers: null,
      created_at: getRelativeDate(18, 14, 0)
    }
  ],

  // ============ Picking Waves ============
  pickingWaves: [
    {
      id: 'wave_410',
      tenant_id: 'tenant_flagship',
      wave_number: 'WAVE-W410',
      warehouse_id: 'wh_north_01',
      status: 'picking',
      total_orders: 4,
      total_items: 8,
      picked_items: 7,
      assigned_to: 'usr_warehouse_01',
      created_at: '2026-10-29T09:00:00Z',
      completed_at: null
    },
    {
      id: 'wave_411',
      tenant_id: 'tenant_flagship',
      wave_number: 'WAVE-W411',
      warehouse_id: 'wh_north_01',
      status: 'packing',
      total_orders: 3,
      total_items: 6,
      picked_items: 6,
      assigned_to: 'usr_warehouse_02',
      created_at: '2026-10-29T08:30:00Z',
      completed_at: null
    },
    {
      id: 'wave_409',
      tenant_id: 'tenant_flagship',
      wave_number: 'WAVE-W409',
      warehouse_id: 'wh_south_01',
      status: 'completed',
      total_orders: 5,
      total_items: 10,
      picked_items: 10,
      assigned_to: 'usr_warehouse_01',
      created_at: '2026-10-28T07:15:00Z',
      completed_at: '2026-10-28T10:45:00Z'
    }
  ],

  // ============ Returns & RMA ============
  returns: [
    {
      id: 'ret_001',
      tenant_id: 'tenant_flagship',
      return_number: 'RMA-2026-009',
      order_id: 'ord_88201',
      customer_id: 'cust_04',
      rma_branch: 'refund',
      reason: 'Khách muốn đổi sang bản màu Trắng Bạc',
      status: 'qc_passed',
      return_type: 'customer_rma',
      refund_amount: 1250000,
      approval_status: 'pending',
      maker_checker_rule: 'Bắt buộc Checker duyệt (Đơn >= 1M)',
      created_at: '2026-10-28T11:00:00Z',
      updated_at: '2026-10-28T11:20:00Z'
    },
    {
      id: 'ret_002',
      tenant_id: 'tenant_flagship',
      return_number: 'RMA-2026-010',
      order_id: 'ord_44812',
      customer_id: 'cust_02',
      rma_branch: 'returnless_refund',
      is_refund_without_return: true,
      reason: 'Cáp sạc Type-C bị gãy chân cắm khi bóc hộp, giá trị nhỏ',
      status: 'approved',
      return_type: 'customer_rma',
      refund_amount: 150000,
      approval_status: 'maker_approved',
      maker_checker_rule: 'Maker duyệt trực tiếp (< 1M) — Miễn thu hồi hàng',
      created_at: '2026-10-29T08:15:00Z',
      updated_at: '2026-10-29T08:30:00Z'
    },
    {
      id: 'ret_003',
      tenant_id: 'tenant_flagship',
      return_number: 'RMA-2026-011',
      order_id: 'ord_62103',
      customer_id: 'cust_01',
      rma_branch: 'exchange',
      reason: 'Khách yêu cầu đổi size đệm tai nghe từ M sang L',
      status: 'qc_passed',
      return_type: 'customer_rma',
      refund_amount: 780000,
      approval_status: 'pending',
      qc_notes: 'Kiểm định ngoại quan hoàn hảo, nguyên seal phụ kiện, đã nhập lại kho Sellable',
      maker_checker_rule: 'Maker duyệt (< 1M) — Tạo đơn xuất hàng bù',
      created_at: '2026-10-29T09:00:00Z',
      updated_at: '2026-10-29T09:45:00Z'
    },
    {
      id: 'ret_004',
      tenant_id: 'tenant_flagship',
      return_number: 'RMA-2026-012',
      order_id: 'ord_55410',
      customer_id: 'cust_03',
      rma_branch: 'transit_damage',
      reason: 'Hộp carton bị móp rách nghiêm trọng, chuột Gaming nứt vỏ',
      status: 'qc_failed',
      return_type: 'customer_rma',
      refund_amount: 390000,
      approval_status: 'pending',
      qc_notes: 'Biên bản SPX Express xác nhận bể vỡ do va đập vận chuyển — Đã cách ly kho Phế phẩm (Damaged)',
      maker_checker_rule: 'Maker duyệt bồi hoàn cho khách (< 1M)',
      created_at: '2026-10-29T10:10:00Z',
      updated_at: '2026-10-29T10:30:00Z'
    },
    {
      id: 'ret_005',
      tenant_id: 'tenant_flagship',
      return_number: 'RMA-2026-013',
      order_id: 'ord_48902',
      customer_id: 'cust_03',
      rma_branch: 'refund',
      reason: 'Khách hàng không ưng ý về độ trễ âm thanh gaming, gửi trả nguyên hộp',
      status: 'approved',
      return_type: 'customer_rma',
      refund_amount: 1890000,
      approval_status: 'pending',
      maker_checker_rule: 'Bắt buộc Checker duyệt (Đơn >= 1M)',
      created_at: '2026-10-29T14:20:00Z',
      updated_at: '2026-10-29T14:30:00Z'
    }
  ],

  returnItems: [
    {
      id: 'reti_001',
      return_id: 'ret_001',
      product_id: 'prod_mouse_pro',
      quantity: 1,
      reason: 'Đổi màu',
      condition: 'sealed',
      disposition: 'restock',
      created_at: '2026-10-28T11:00:00Z'
    },
    {
      id: 'reti_002',
      return_id: 'ret_002',
      product_id: 'prod_cable_100w',
      quantity: 1,
      reason: 'Gãy chân cắm',
      condition: 'damaged',
      disposition: 'scrap',
      created_at: '2026-10-29T08:15:00Z'
    },
    {
      id: 'reti_003',
      return_id: 'ret_003',
      product_id: 'prod_air_pro',
      quantity: 1,
      reason: 'Đổi size đệm',
      condition: 'sealed',
      disposition: 'restock',
      created_at: '2026-10-29T09:00:00Z'
    },
    {
      id: 'reti_004',
      return_id: 'ret_004',
      product_id: 'prod_mouse_pro',
      quantity: 1,
      reason: 'Vỡ vỏ do vận chuyển',
      condition: 'damaged',
      disposition: 'scrap',
      created_at: '2026-10-29T10:10:00Z'
    },
    {
      id: 'reti_005',
      return_id: 'ret_005',
      product_id: 'prod_kb_wave',
      quantity: 1,
      reason: 'Không ưng ý',
      condition: 'opened',
      disposition: 'pending_qc',
      created_at: '2026-10-29T14:20:00Z'
    }
  ],

  // ============ Batches ============
  batches: [
    {
      id: 'batch_01',
      tenant_id: 'tenant_flagship',
      product_id: 'prod_air_pro',
      batch_number: 'LOT-2026-ANC-01',
      expiry_date: '2028-06-30',
      initial_quantity: 200,
      remaining_quantity: 180,
      status: 'active',
      created_at: '2026-01-15T08:00:00Z'
    }
  ],

  // ============ Serials & Warranty ============
  serials: [
    {
      id: 'ser_01',
      tenant_id: 'tenant_flagship',
      serial_number: 'NX-PRO-8921401',
      sku: 'NX-AIR-PRO',
      product_name: 'Tai nghe Bluetooth ANC Nexus Pro',
      status: 'sold',
      warehouse_id: 'wh_north_01',
      order_id: 'ord_90214',
      customer_name: 'Hoàng Minh Tâm',
      warranty_start: '2026-10-28',
      warranty_months: 12,
      warranty_end: '2027-10-28',
      rma_history: []
    },
    {
      id: 'ser_02',
      tenant_id: 'tenant_flagship',
      serial_number: 'NX-WAVE-1092401',
      sku: 'NX-KB-WAVE',
      product_name: 'Bàn phím cơ không dây Silent Wave 75%',
      status: 'in_stock',
      warehouse_id: 'wh_north_01',
      warranty_months: 24,
      rma_history: []
    }
  ],

  // ============ Stock Ledger ============
  stockLedger: [
    {
      id: 'sl_001',
      tenant_id: 'tenant_flagship',
      product_id: 'prod_air_pro',
      warehouse_id: 'wh_north_01',
      transaction_type: 'reservation',
      quantity: 1,
      reference_type: 'order',
      reference_id: 'ord_90214',
      notes: 'Khóa 1x NX-AIR-PRO cho đơn #ORD-90214 (Shopee)',
      balance_after: 135,
      created_at: '2026-10-28T09:15:00Z'
    },
    {
      id: 'sl_002',
      tenant_id: 'tenant_flagship',
      product_id: 'prod_titan_1l',
      warehouse_id: 'wh_north_01',
      transaction_type: 'release',
      quantity: 1,
      reference_type: 'order',
      reference_id: 'ord_77190',
      notes: 'Giải phóng giữ tồn do hủy đơn #ORD-77190',
      balance_after: 70,
      created_at: '2026-10-27T16:30:00Z'
    }
  ],

  // ============ Double-Entry Journal Entries ============
  journalEntries: [
    {
      id: 'je_89021',
      tenant_id: 'tenant_flagship',
      entry_number: 'JE-2026-89021',
      reference_type: 'order',
      reference_id: 'ord_90214',
      description: 'Hạch toán doanh thu bán Shopee #ORD-90214',
      posted_at: '2026-10-28T09:20:00Z',
      posted_by: 'usr_finance_01',
      status: 'posted',
      created_at: '2026-10-28T09:20:00Z'
    }
  ],

  journalLines: [
    {
      id: 'jl_01',
      entry_id: 'je_89021',
      account_id: 'acc_131_shopee',
      account_code: '131_SHOPEE',
      debit: 1150000,
      credit: 0,
      description: 'Phải thu sàn Shopee'
    },
    {
      id: 'jl_02',
      entry_id: 'je_89021',
      account_id: 'acc_641_fee',
      account_code: '641_FEE',
      debit: 100000,
      credit: 0,
      description: 'Chi phí hoa hồng & dịch vụ thanh toán Shopee'
    },
    {
      id: 'jl_03',
      entry_id: 'je_89021',
      account_id: 'acc_511_sales',
      account_code: '511_REVENUE',
      debit: 0,
      credit: 1250000,
      description: 'Doanh thu bán lẻ sản phẩm'
    }
  ],

  // ============ Reconciliations ============
  reconciliations: [
    {
      id: 'rec_shopee_oct_w4',
      tenant_id: 'tenant_flagship',
      settlement_id: 'SETTLE-SPX-2026-W43',
      channel: 'shopee',
      period_start: '2026-10-21',
      period_end: '2026-10-27',
      order_count: 148,
      gross_sales: 185000000,
      platform_fees: 14800000,
      commission: 9250000,
      shipping_subsidies: 1850000,
      net_payout: 162800000,
      system_calculated_payout: 162800000,
      discrepancy: 0,
      status: 'matched',
      settled_at: '2026-10-28T08:00:00Z'
    },
    {
      id: 'rec_tiktok_oct_w4',
      tenant_id: 'tenant_flagship',
      settlement_id: 'SETTLE-TT-2026-W43',
      channel: 'tiktok',
      period_start: '2026-10-21',
      period_end: '2026-10-27',
      order_count: 92,
      gross_sales: 71760000,
      platform_fees: 5740800,
      commission: 3588000,
      shipping_subsidies: 920000,
      net_payout: 63351200,
      system_calculated_payout: 63351200,
      discrepancy: 0,
      status: 'matched',
      settled_at: '2026-10-28T08:30:00Z'
    }
  ],

  // ============ Business Rules Config & Governance ============
  businessRules: [
    {
      id: 'rule_inv_invariant',
      category: 'inventory',
      name: 'Bất biến Tồn kho 5 trạng thái (Inventory Invariant)',
      code: 'INV-CANONICAL-INVARIANT',
      summary: 'Physical = Sellable + Reserved + Unavailable (Pending QC + Damaged). Pipeline (Incoming + In-transit) không tính gộp vào Physical.',
      currentStatus: 'assumption',
      proposedOptionId: 'opt_inv_strict',
      selectedOptionId: 'opt_inv_strict',
      approvedOptionId: null,
      version: 'v1.0',
      effectiveDate: '2026-10-29',
      tenantScope: 'global',
      changeReason: 'Khởi tạo đề xuất ban đầu chờ Chủ Doanh Nghiệp phê duyệt',
      options: [
        {
          id: 'opt_inv_strict',
          label: 'Mô hình chuẩn Nexus 5 Trạng Thái [ĐỀ XUẤT]',
          description: 'Physical thực tế trên kệ = Sellable + Reserved + (Pending QC + Damaged). Hàng Incoming từ PO và In-transit chuyển kho nằm ở Pipeline riêng biệt, không tính trùng.',
          isAssumption: true,
          financialImpact: 'Ngăn chặn hoàn toàn bán âm và sai lệch kiểm kê kho.'
        },
        {
          id: 'opt_inv_loose',
          label: 'Gộp In-transit vào Physical on-hand',
          description: 'Tính hàng đang vận chuyển vào tổng Physical. Rủi ro: sai lệch vị trí bin khi nhân viên kho đi nhặt hàng thực tế.',
          isAssumption: true,
          financialImpact: 'Dễ gây nhầm lẫn tài sản hiện hữu tại kho với hàng đang lưu thông.'
        }
      ],
      complianceNotes: '[ASSUMPTION: CHỜ DUYỆT] Cần chủ dự án xác nhận công thức toán học trước khi đóng gói logic backend.',
      history: [
        {
          id: 'hist_inv_01',
          timestamp: '2026-10-29T08:00:00Z',
          actor: 'System Architect',
          fromStatus: 'none',
          toStatus: 'assumption',
          fromOptionId: '',
          toOptionId: 'opt_inv_strict',
          reason: 'Thiết lập mô hình bất biến 5 trạng thái theo chuẩn WMS',
          version: 'v1.0'
        }
      ],
      updatedAt: '2026-10-29T08:00:00Z'
    },
    {
      id: 'rule_rev_recognition',
      category: 'revenue',
      name: 'Thời điểm Ghi nhận Doanh thu (Revenue Recognition Point)',
      code: 'ACC-REVENUE-RECOGNITION-TIMING',
      summary: 'Xác định thời điểm chính thức ghi nhận Doanh thu Có 511 (FOB Điểm đến, FOB Điểm gửi, Hết hạn đổi trả 7 ngày, hoặc Tiền về).',
      currentStatus: 'assumption',
      proposedOptionId: 'opt_rev_pod',
      selectedOptionId: 'opt_rev_pod',
      approvedOptionId: null,
      version: 'v1.0',
      effectiveDate: '2026-10-29',
      tenantScope: 'global',
      changeReason: 'Đang chạy mô phỏng đối chiếu giữa 4 chính sách tài chính',
      options: [
        {
          id: 'opt_rev_pod',
          label: 'Chính sách 1: FOB Destination (Giao thành công có POD) [ĐỀ XUẤT]',
          description: 'Doanh thu Có 511 chỉ ghi nhận khi khách đã nhận hàng có xác thực POD. Tiền thu trước ghi Nợ 112 / Có 131. Hàng gửi bán ghi Có 156 / Nợ 157.',
          isAssumption: true,
          financialImpact: 'Doanh thu chuẩn xác, không bị biến động ảo nếu giao thất bại.'
        },
        {
          id: 'opt_rev_dispatch',
          label: 'Chính sách 2: FOB Shipping Point (Bàn giao bưu tá xuất kho)',
          description: 'Ghi nhận Có 511 ngay khi kho xuất giao bưu tá. Nếu khách từ chối nhận (RTS), phải hạch toán bút toán hàng bán bị trả lại Nợ 521.',
          isAssumption: true,
          financialImpact: 'Ghi nhận doanh thu sớm hơn 2-4 ngày nhưng chịu rủi ro hoàn đơn RTS cao.'
        },
        {
          id: 'opt_rev_7d_window',
          label: 'Chính sách 3: Post-Clearance Window (Hết 7 ngày đổi trả)',
          description: 'Ghi nhận Có 511 sau khi đơn hàng giao thành công đủ 7 ngày mà không phát sinh khiếu nại/đổi trả.',
          isAssumption: true,
          financialImpact: 'Doanh thu cực kỳ an toàn nhưng độ trễ báo cáo tài chính lên đến 7-10 ngày.'
        },
        {
          id: 'opt_rev_cash_basis',
          label: 'Chính sách 4: Cash Basis / Prepayment (Ghi nhận khi khách thanh toán)',
          description: 'Ghi nhận Có 511 ngay thời điểm tiền chuyển khoản thành công từ cổng thanh toán.',
          isAssumption: true,
          financialImpact: 'Phù hợp doanh nghiệp dịch vụ, không phù hợp bán buôn/bán lẻ vật chất.'
        }
      ],
      complianceNotes: '[ASSUMPTION: CHỜ DUYỆT] Chủ dự án cần lựa chọn 1 trong 4 phương án cho từng kênh bán.',
      history: [
        {
          id: 'hist_rev_01',
          timestamp: '2026-10-29T08:00:00Z',
          actor: 'Finance Lead',
          fromStatus: 'none',
          toStatus: 'assumption',
          fromOptionId: '',
          toOptionId: 'opt_rev_pod',
          reason: 'Đề xuất chính sách FOB Destination chuẩn mực kế toán VAS/IFRS',
          version: 'v1.0'
        }
      ],
      updatedAt: '2026-10-29T08:00:00Z'
    },
    {
      id: 'rule_warehouse_pod_gate',
      category: 'delivery_pod',
      name: 'Kiểm soát Bằng chứng Giao hàng POD (POD Enforced Gate)',
      code: 'OPS-POD-VERIFICATION-MANDATORY',
      summary: 'Cơ chế xác thực giao hàng thành công: Chặn thao tác thủ công, phân biệt Demo nhập tay vs Webhook đối tác vận chuyển.',
      currentStatus: 'assumption',
      proposedOptionId: 'opt_pod_enforced',
      selectedOptionId: 'opt_pod_enforced',
      approvedOptionId: null,
      version: 'v1.0',
      effectiveDate: '2026-10-29',
      tenantScope: 'global',
      changeReason: 'Chặn gian lận giao nhận nội bộ',
      options: [
        {
          id: 'opt_pod_enforced',
          label: 'Bắt buộc xác thực POD phân loại nguồn gốc [ĐỀ XUẤT]',
          description: 'Hệ thống chặn nút đánh dấu Đã nhận của Kho. Phân biệt rõ: POD Demo người dùng nhập tay vs Bằng chứng Webhook xác thực từ ViettelPost/GHN/Shopee Xpress.',
          isAssumption: true,
          financialImpact: 'Loại bỏ tình trạng hạch toán khống doanh thu khi chưa có chữ ký người nhận.'
        },
        {
          id: 'opt_pod_manual',
          label: 'Cho phép nhân viên kho tự bấm xác nhận giao hàng',
          description: 'Bất kỳ nhân viên nào cũng có thể bấm hoàn tất đơn mà không cần mã vận đơn hay chữ ký.',
          isAssumption: true,
          financialImpact: 'Rủi ro thất thoát hàng hóa và sai lệch công nợ COD.'
        }
      ],
      complianceNotes: '[ASSUMPTION: CHỜ DUYỆT] Cần chủ dự án phê duyệt cơ chế phân loại nguồn POD.',
      history: [
        {
          id: 'hist_pod_01',
          timestamp: '2026-10-29T08:00:00Z',
          actor: 'Logistics Director',
          fromStatus: 'none',
          toStatus: 'assumption',
          fromOptionId: '',
          toOptionId: 'opt_pod_enforced',
          reason: 'Yêu cầu kiểm soát chặt chẽ quy trình POD',
          version: 'v1.0'
        }
      ],
      updatedAt: '2026-10-29T08:00:00Z'
    },
    {
      id: 'rule_rma_approval_threshold',
      category: 'rma',
      name: 'Hạn mức Phê duyệt Maker/Checker Đổi trả (RMA Approval Matrix)',
      code: 'RMA-APPROVAL-THRESHOLD-CONFIG',
      summary: 'Thiết lập hạn mức phân quyền Maker/Checker cho 6 nhánh đổi trả: Hoàn tiền, Đổi mới, Bảo hành, Vỡ hỏng, Returnless.',
      currentStatus: 'assumption',
      proposedOptionId: 'opt_rma_thresh_1m',
      selectedOptionId: 'opt_rma_thresh_1m',
      approvedOptionId: null,
      version: 'v1.0',
      effectiveDate: '2026-10-29',
      tenantScope: 'global',
      changeReason: 'Thiết lập ngưỡng kiểm soát tài chính đổi trả',
      options: [
        {
          id: 'opt_rma_thresh_1m',
          label: 'Hạn mức 1.000.000 ₫ (Maker duyệt < 1M; Checker duyệt >= 1M) [ĐỀ XUẤT]',
          description: 'Đơn hoàn dưới 1.000.000đ do Maker (Kho/CSKH) duyệt giải quyết nhanh; từ 1.000.000đ trở lên bắt buộc Checker (Owner/Admin) kiểm tra.',
          isAssumption: true,
          financialImpact: 'Cân bằng giữa tốc độ xử lý khiếu nại khách hàng và an toàn quỹ tiền.'
        },
        {
          id: 'opt_rma_thresh_500k',
          label: 'Hạn mức chặt chẽ 500.000 ₫ (Checker duyệt từ 500k)',
          description: 'Áp dụng cho giai đoạn đầu kiểm soát dòng tiền, hạn chế tối đa chi tiền hoàn.',
          isAssumption: true,
          financialImpact: 'Giảm 40% rủi ro chi hoàn sai lệch nhưng có thể làm chậm khâu CSKH.'
        },
        {
          id: 'opt_rma_thresh_always',
          label: 'Luôn luôn bắt buộc Checker duyệt 100% mọi khoản hoàn tiền',
          description: 'Mọi yêu cầu hoàn tiền bất kể số tiền đều phải có chữ ký của Chủ Doanh Nghiệp.',
          isAssumption: true,
          financialImpact: 'Kiểm soát 100% dòng tiền chi ra.'
        },
        {
          id: 'opt_rma_thresh_no_checker',
          label: 'Không cần Checker — Phân quyền hoàn toàn cho Maker',
          description: 'Nhân viên CSKH/Kho tự quyết định toàn bộ việc hoàn tiền và đổi hàng.',
          isAssumption: true,
          financialImpact: 'Tốc độ tức thì nhưng rủi ro thất thoát ngân sách hoàn tiền.'
        }
      ],
      complianceNotes: '[ASSUMPTION: CHỜ DUYỆT] Ngưỡng 1.000.000đ chỉ là giả định đề xuất, cần Chủ Doanh Nghiệp trực tiếp xác nhận.',
      history: [
        {
          id: 'hist_rma_01',
          timestamp: '2026-10-29T08:00:00Z',
          actor: 'Risk & Compliance Lead',
          fromStatus: 'none',
          toStatus: 'assumption',
          fromOptionId: '',
          toOptionId: 'opt_rma_thresh_1m',
          reason: 'Đề xuất ma trận kiểm duyệt Maker/Checker theo phân cấp rủi ro',
          version: 'v1.0'
        }
      ],
      updatedAt: '2026-10-29T08:00:00Z'
    },
    {
      id: 'rule_accounting_cogs_timing',
      category: 'accounting',
      name: 'Thời điểm Hạch toán Giá vốn Hàng bán COGS (Inventory to COGS)',
      code: 'ACC-COGS-RECOGNITION-TIMING',
      summary: 'Xác định thời điểm chuyển giá trị tồn kho 156 sang Giá vốn hàng bán 632 theo giá bình quân gia quyền MAC.',
      currentStatus: 'assumption',
      proposedOptionId: 'opt_cogs_dispatch',
      selectedOptionId: 'opt_cogs_dispatch',
      approvedOptionId: null,
      version: 'v1.0',
      effectiveDate: '2026-10-29',
      tenantScope: 'global',
      changeReason: 'Làm rõ hạch toán kho và giá vốn',
      options: [
        {
          id: 'opt_cogs_dispatch',
          label: 'Hạch toán Nợ 632 / Có 156 ngay khi Xuất kho Dispatch [ĐỀ XUẤT]',
          description: 'Tại thời điểm xuất hàng bàn giao vận chuyển, hàng ra khỏi kho vật lý và ghi nhận giá vốn ngay.',
          isAssumption: true,
          financialImpact: 'Kho phản ánh đúng lượng hàng thực còn lại.'
        },
        {
          id: 'opt_cogs_pod_matching',
          label: 'Đồng bộ với POD (Gửi bán Nợ 157 / Có 156; khi POD mới ghi Nợ 632 / Có 157)',
          description: 'Tuân thủ chặt chẽ nguyên tắc phù hợp (Matching Principle): Doanh thu và Giá vốn phát sinh cùng lúc khi POD xác thực.',
          isAssumption: true,
          financialImpact: 'Báo cáo lãi gộp từng kỳ khớp 100% về mặt thời gian.'
        }
      ],
      complianceNotes: '[ASSUMPTION: CHỜ DUYỆT] Cần chốt giữa ghi nhận đơn giản tại Dispatch hay ghi nhận qua TK 157 Hàng gửi bán.',
      history: [
        {
          id: 'hist_cogs_01',
          timestamp: '2026-10-29T08:00:00Z',
          actor: 'Chief Accountant',
          fromStatus: 'none',
          toStatus: 'assumption',
          fromOptionId: '',
          toOptionId: 'opt_cogs_dispatch',
          reason: 'Đề xuất hạch toán MAC khi Dispatch',
          version: 'v1.0'
        }
      ],
      updatedAt: '2026-10-29T08:00:00Z'
    },
    {
      id: 'rule_channel_fee_recognition',
      category: 'accounting',
      name: 'Hạch toán Phí sàn TMĐT & Phí vận chuyển (Marketplace Fees)',
      code: 'ACC-MARKETPLACE-FEE-TIMING',
      summary: 'Thời điểm ghi nhận chi phí hoa hồng sàn Shopee, TikTok Shop, Lazada (Nợ 641 / Có 338).',
      currentStatus: 'assumption',
      proposedOptionId: 'opt_fee_settlement',
      selectedOptionId: 'opt_fee_settlement',
      approvedOptionId: null,
      version: 'v1.0',
      effectiveDate: '2026-10-29',
      tenantScope: 'global',
      changeReason: 'Quy tắc đối soát công nợ sàn',
      options: [
        {
          id: 'opt_fee_settlement',
          label: 'Ghi nhận theo Báo cáo Quyết toán Kỳ đối soát (Settlement Statement) [ĐỀ XUẤT]',
          description: 'Hàng ngày ước tính tạm tính; khi sàn trả bảng đối soát kỳ (7 ngày) thì hạch toán chính xác số thực trừ.',
          isAssumption: true,
          financialImpact: 'Khớp 100% với sao kê ngân hàng và bảng thanh toán của sàn TMĐT.'
        },
        {
          id: 'opt_fee_per_order',
          label: 'Tự động tính và trừ phí sàn ngay trên từng đơn hàng',
          description: 'Áp dụng biểu phí cố định (ví dụ 8.5% Shopee) ghi nhận ngay vào chi phí bán hàng khi tạo đơn.',
          isAssumption: true,
          financialImpact: 'Dễ bị lệch nếu sàn phát sinh phạt cân nặng hoặc trợ giá voucher tài trợ chung.'
        }
      ],
      complianceNotes: '[ASSUMPTION: CHỜ DUYỆT] Cần thống nhất quy trình đối soát phí sàn định kỳ.',
      history: [
        {
          id: 'hist_fee_01',
          timestamp: '2026-10-29T08:00:00Z',
          actor: 'Reconciliation Specialist',
          fromStatus: 'none',
          toStatus: 'assumption',
          fromOptionId: '',
          toOptionId: 'opt_fee_settlement',
          reason: 'Đề xuất hạch toán phí sàn theo kỳ đối soát thực tế',
          version: 'v1.0'
        }
      ],
      updatedAt: '2026-10-29T08:00:00Z'
    }
  ],

  // ============ Purchase Orders & Items ============
  purchaseOrders: [
    {
      id: 'po_01',
      po_number: 'PO-2026-001',
      supplier_name: 'Phúc Khang Electronics Tech',
      supplier_id: 'sup_01',
      warehouse_id: 'wh_north_01',
      status: 'ordered',
      total_amount: 156000000,
      expected_delivery_date: getRelativeDate(-2),
      notes: 'Nhập lô hàng linh kiện tai nghe và phụ kiện chính hãng đợt 1',
      created_at: getRelativeDate(5),
      updated_at: getRelativeDate(1)
    },
    {
      id: 'po_02',
      po_number: 'PO-2026-002',
      supplier_name: 'An Phát Global Supply Chain',
      supplier_id: 'sup_02',
      warehouse_id: 'wh_south_01',
      status: 'partial',
      total_amount: 84000000,
      expected_delivery_date: getRelativeDate(-5),
      notes: 'Đã nhận đợt 1 (50 cái), chờ nhà cung cấp giao tiếp đợt 2',
      created_at: getRelativeDate(10),
      updated_at: getRelativeDate(2)
    }
  ],
  purchaseOrderItems: [
    {
      id: 'poi_01',
      po_id: 'po_01',
      product_id: 'prod_air_pro',
      quantity: 100,
      received_qty: 0,
      unit_cost: 650000,
      created_at: getRelativeDate(5)
    },
    {
      id: 'poi_02',
      po_id: 'po_01',
      product_id: 'prod_keyboard_rgb',
      quantity: 50,
      received_qty: 0,
      unit_cost: 950000,
      created_at: getRelativeDate(5)
    },
    {
      id: 'poi_03',
      po_id: 'po_02',
      product_id: 'prod_mouse_pro',
      quantity: 100,
      received_qty: 50,
      unit_cost: 420000,
      created_at: getRelativeDate(10)
    },
    {
      id: 'poi_04',
      po_id: 'po_02',
      product_id: 'prod_cable_fast',
      quantity: 100,
      received_qty: 100,
      unit_cost: 150000,
      created_at: getRelativeDate(10)
    }
  ],
  transfers: [
    {
      id: 'tr_01',
      transfer_number: 'TR-2026-001',
      from_warehouse_id: 'wh_north_01',
      to_warehouse_id: 'wh_south_01',
      status: 'in_transit',
      tracking_number: 'VNPOST-TR-88912',
      notes: 'Điều phối cân bằng tồn kho tai nghe Pro giữa kho Bắc và kho Nam',
      created_at: getRelativeDate(2),
      updated_at: getRelativeDate(1),
      transfer_items: [
        { id: 'tri_01', transfer_id: 'tr_01', product_id: 'prod_01', quantity: 30 }
      ]
    }
  ],
  channelConnections: [
    {
      id: 'conn_shopee',
      channel: 'shopee',
      shop_name: 'Nexus Official Flagship Store',
      shop_id: 'shp_vn_90214',
      status: 'connected',
      last_sync_at: getRelativeDate(0, 10, 0),
      api_key_masked: 'shp_live_••••••••9021',
      created_at: '2026-01-15T08:00:00Z',
      updated_at: getRelativeDate(0, 10, 0)
    },
    {
      id: 'conn_tiktok',
      channel: 'tiktok',
      shop_name: 'Nexus Audio Vietnam (TikTok Shop)',
      shop_id: 'tts_vn_44812',
      status: 'connected',
      last_sync_at: getRelativeDate(0, 9, 45),
      api_key_masked: 'tts_live_••••••••4481',
      created_at: '2026-02-01T08:00:00Z',
      updated_at: getRelativeDate(0, 9, 45)
    },
    {
      id: 'conn_lazada',
      channel: 'lazada',
      shop_name: 'Nexus Audio LazMall',
      shop_id: 'laz_vn_33109',
      status: 'connected',
      last_sync_at: getRelativeDate(0, 9, 30),
      api_key_masked: 'laz_live_••••••••3310',
      created_at: '2026-02-10T08:00:00Z',
      updated_at: getRelativeDate(0, 9, 30)
    },
    {
      id: 'conn_website',
      channel: 'website',
      shop_name: 'Nexus Online Store (D2C)',
      shop_id: 'web_vn_d2c',
      status: 'connected',
      last_sync_at: getRelativeDate(0, 10, 15),
      api_key_masked: 'd2c_key_••••••••1100',
      created_at: '2026-01-01T08:00:00Z',
      updated_at: getRelativeDate(0, 10, 15)
    }
  ],
  channelSkuMappings: [
    {
      id: 'csm_01',
      channel: 'shopee',
      channel_sku_id: 'SHP-SKU-AIR-01',
      channel_product_id: 'SHP-PROD-9901',
      channel_product_name: 'Tai nghe Bluetooth Nexus Air Pro - Shopee Mall',
      product_id: 'prod_air_pro',
      sync_price: true,
      sync_inventory: true,
      created_at: '2026-01-15T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'csm_02',
      channel: 'tiktok',
      channel_sku_id: 'TTS-SKU-AIR-01',
      channel_product_id: 'TTS-PROD-8802',
      channel_product_name: 'Tai nghe Không Dây Nexus Air Pro (Chống Ồn ANC) - TikTok Shop',
      product_id: 'prod_air_pro',
      sync_price: true,
      sync_inventory: true,
      created_at: '2026-02-01T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'csm_03',
      channel: 'lazada',
      channel_sku_id: 'LAZ-SKU-AIR-01',
      channel_product_id: 'LAZ-PROD-7703',
      channel_product_name: 'Nexus Air Pro True Wireless ANC - LazMall',
      product_id: 'prod_air_pro',
      sync_price: true,
      sync_inventory: true,
      created_at: '2026-02-10T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'csm_04',
      channel: 'shopee',
      channel_sku_id: 'SHP-SKU-KB-03',
      channel_product_id: 'SHP-PROD-9902',
      channel_product_name: 'Bàn phím cơ Nexus Wave RGB - Shopee',
      product_id: 'prod_kb_wave',
      sync_price: true,
      sync_inventory: true,
      created_at: '2026-01-15T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'csm_05',
      channel: 'tiktok',
      channel_sku_id: 'TTS-SKU-KB-03',
      channel_product_id: 'TTS-PROD-8803',
      channel_product_name: 'Bàn phím cơ Nexus Wave RGB - TikTok Shop',
      product_id: 'prod_kb_wave',
      sync_price: true,
      sync_inventory: true,
      created_at: '2026-02-01T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    },
    {
      id: 'csm_06',
      channel: 'website',
      channel_sku_id: 'WEB-SKU-HUB-06',
      channel_product_id: 'WEB-PROD-1003',
      channel_product_name: 'Nexus Hub USB-C 8-in-1',
      product_id: 'prod_hub_8in1',
      sync_price: true,
      sync_inventory: true,
      created_at: '2026-01-01T09:00:00Z',
      updated_at: '2026-10-28T10:00:00Z'
    }
  ],
  orderAutomationRules: [
    {
      id: 'rule_01',
      rule_name: 'Tự động kiểm tra đơn giá trị cao (>= 2 triệu)',
      priority: 1,
      trigger_event: 'order_created',
      is_active: true,
      conditions_json: { field: 'order_total', operator: 'gte', value: 2000000 },
      actions_json: { type: 'set_status', value: 'processing', note: 'Đã gắn cờ đơn giá trị cao cần kiểm tra' },
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-20T08:00:00Z'
    },
    {
      id: 'rule_02',
      rule_name: 'Tặng túi phụ kiện cho khách hàng Platinum',
      priority: 2,
      trigger_event: 'order_created',
      is_active: true,
      conditions_json: { field: 'customer_tier', operator: 'eq', value: 'platinum' },
      actions_json: { type: 'add_free_gift', value: 'NX-GIFT-BAG', note: 'Tặng kèm túi bảo quản cho VIP' },
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-20T08:00:00Z'
    },
    {
      id: 'rule_03',
      rule_name: 'Cảnh báo SLA đơn hàng cận giờ xuất kho (<= 4h)',
      priority: 3,
      trigger_event: 'order_created',
      is_active: true,
      conditions_json: { field: 'sla_hours_remaining', operator: 'lte', value: 4 },
      actions_json: { type: 'set_status', value: 'processing', note: 'Ưu tiên xuất kho hỏa tốc' },
      created_at: '2026-02-01T08:00:00Z',
      updated_at: '2026-10-20T08:00:00Z'
    }
  ],
  bufferRules: [
    {
      id: 'buf_01',
      warehouse_id: 'wh_north_01',
      product_id: 'prod_01',
      safety_stock: 15,
      reorder_point: 30,
      push_ratio_percent: 60,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-25T08:00:00Z'
    },
    {
      id: 'buf_02',
      warehouse_id: 'wh_south_01',
      product_id: 'prod_01',
      safety_stock: 10,
      reorder_point: 25,
      push_ratio_percent: 40,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-25T08:00:00Z'
    },
    {
      id: 'buf_03',
      warehouse_id: 'wh_north_01',
      product_id: 'prod_02',
      safety_stock: 8,
      reorder_point: 15,
      push_ratio_percent: 70,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-25T08:00:00Z'
    },
    {
      id: 'buf_04',
      warehouse_id: 'wh_south_01',
      product_id: 'prod_02',
      safety_stock: 5,
      reorder_point: 12,
      push_ratio_percent: 30,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-25T08:00:00Z'
    }
  ],
  routingRules: [
    {
      id: 'route_01',
      name: 'Đơn Shopee & TikTok miền Bắc -> Kho Bắc Ninh',
      priority: 1,
      channel: 'shopee',
      preferred_warehouse_id: 'wh_north_01',
      strategy: 'priority',
      is_active: true,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-20T08:00:00Z'
    },
    {
      id: 'route_02',
      name: 'Đơn TikTok Shop miền Nam -> Kho Tân Bình',
      priority: 2,
      channel: 'tiktok',
      preferred_warehouse_id: 'wh_south_01',
      strategy: 'nearest',
      is_active: true,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-20T08:00:00Z'
    },
    {
      id: 'route_03',
      name: 'Tối ưu kho còn nhiều hàng khả dụng nhất (Most Stock)',
      priority: 3,
      channel: null,
      preferred_warehouse_id: null,
      strategy: 'most_stock',
      is_active: true,
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-20T08:00:00Z'
    }
  ],
  customerComplaints: [
    {
      id: 'comp_01',
      order_id: 'ord_90214',
      customer_id: 'cust_01',
      raw_content: 'Hộp sản phẩm hơi móp góc khi nhận, nhưng tai nghe bên trong nghe rất êm.',
      redacted_content: 'Hộp sản phẩm hơi móp góc khi nhận, nhưng tai nghe bên trong nghe rất êm.',
      sentiment: 'neutral',
      urgency_score: 4,
      issue_category: 'Đóng gói & Vận chuyển',
      suggested_reply: 'Dạ Nexus rất tiếc vì hộp bị móp trong quá trình vận chuyển. Shop xin gửi tặng bạn voucher 50k cho lần mua sau ạ!',
      analyzed_at: getRelativeDate(1),
      status: 'responded',
      created_at: getRelativeDate(2),
      updated_at: getRelativeDate(1)
    },
    {
      id: 'comp_02',
      order_id: 'ord_44812',
      customer_id: 'cust_02',
      raw_content: 'Đã 3 ngày chưa thấy bưu tá giao hàng, tôi cần hàng gấp trước thứ 7.',
      redacted_content: 'Đã 3 ngày chưa thấy bưu tá giao hàng, tôi cần hàng gấp trước thứ 7.',
      sentiment: 'negative',
      urgency_score: 8,
      issue_category: 'Chậm trễ giao hàng',
      suggested_reply: 'Dạ Nexus đã liên hệ hối bưu tá tuyến giao ưu tiên cho bạn trong chiều nay ạ.',
      analyzed_at: getRelativeDate(0, 8, 30),
      status: 'open',
      created_at: getRelativeDate(0, 8, 0),
      updated_at: getRelativeDate(0, 8, 30)
    },
    {
      id: 'comp_03',
      order_id: 'ord_33109',
      customer_id: 'cust_03',
      raw_content: 'Chất âm rất xuất sắc, pin trâu đúng như mô tả. Sẽ ủng hộ shop dài dài!',
      redacted_content: 'Chất âm rất xuất sắc, pin trâu đúng như mô tả. Sẽ ủng hộ shop dài dài!',
      sentiment: 'positive',
      urgency_score: 1,
      issue_category: 'Khen ngợi sản phẩm',
      suggested_reply: 'Cảm ơn bạn đã tin chọn Nexus! Chúc bạn có những phút giây trải nghiệm âm nhạc tuyệt vời!',
      analyzed_at: getRelativeDate(3),
      status: 'closed',
      created_at: getRelativeDate(4),
      updated_at: getRelativeDate(3)
    }
  ],
  outboundWebhooks: [
    {
      id: 'wh_erp_01',
      name: 'Đồng bộ đơn hàng ERP MISA',
      target_url: 'https://api.erp-misa-mock.internal/v1/orders/webhook',
      event_types: ['order.created', 'order.delivered', 'return.completed'],
      secret: 'mock_webhook_secret_not_for_production_1',
      is_active: true,
      max_retries: 3,
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-10-20T08:00:00Z'
    },
    {
      id: 'wh_crm_02',
      name: 'Cập nhật điểm thành viên CRM HubSpot',
      target_url: 'https://api.crm-mock.internal/v2/customer/loyalty',
      event_types: ['order.delivered'],
      secret: 'mock_webhook_secret_not_for_production_2',
      is_active: true,
      max_retries: 3,
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-10-20T08:00:00Z'
    }
  ],
  webhookDeliveryLogs: [
    {
      id: 'wlog_01',
      webhook_id: 'wh_erp_01',
      event_type: 'order.created',
      payload: { order_number: 'ORD-90214', total: 1250000, status: 'processing' },
      status_code: 200,
      response_body: '{"success": true, "code": "OK"}',
      attempt_number: 1,
      delivered_at: getRelativeDate(0, 9, 16)
    },
    {
      id: 'wlog_02',
      webhook_id: 'wh_crm_02',
      event_type: 'order.delivered',
      payload: { customer_id: 'cust_01', points_added: 125 },
      status_code: 200,
      response_body: '{"loyalty_updated": true}',
      attempt_number: 1,
      delivered_at: getRelativeDate(1, 14, 20)
    }
  ],
  orderFeeBreakdowns: [
    {
      id: 'fee_001',
      order_id: 'ord_90214',
      commission_fee: 45000,
      transaction_fee: 25000,
      voucher_co_fund_fee: 10000,
      estimated_shipping_fee: 30000,
      actual_shipping_fee: 30000,
      weight_penalty_fee: 0,
      net_payout: 890000,
      is_reconciled: false,
      discrepancy_note: null,
      created_at: getRelativeDate(2),
      updated_at: getRelativeDate(2),
    },
    {
      id: 'fee_002',
      order_id: 'ord_44812',
      commission_fee: 65000,
      transaction_fee: 30000,
      voucher_co_fund_fee: 15000,
      estimated_shipping_fee: 35000,
      actual_shipping_fee: 45000,
      weight_penalty_fee: 10000,
      net_payout: 1050000,
      is_reconciled: false,
      discrepancy_note: 'Chênh lệch phí vận chuyển vượt cân nặng 250g',
      created_at: getRelativeDate(1),
      updated_at: getRelativeDate(1),
    }
  ],
  syncLogs: [
    {
      id: 'sync_01',
      channel: 'shopee',
      shop_name: 'Nexus Official Flagship Store',
      sync_type: 'inventory_push',
      status: 'success',
      message: 'Đã đẩy tồn kho 6 SKU lên gian hàng Shopee thành công',
      retry_count: 0,
      synced_at: getRelativeDate(0, 10, 0)
    },
    {
      id: 'sync_02',
      channel: 'tiktok',
      shop_name: 'Nexus Audio Vietnam (TikTok Shop)',
      sync_type: 'order_pull',
      status: 'success',
      message: 'Đã kéo 14 đơn hàng mới từ TikTok Shop',
      retry_count: 0,
      synced_at: getRelativeDate(0, 9, 45)
    },
    {
      id: 'sync_03',
      channel: 'lazada',
      shop_name: 'Nexus Audio LazMall',
      sync_type: 'tracking_sync',
      status: 'success',
      message: 'Đã cập nhật mã vận đơn cho 8 kiện hàng',
      retry_count: 0,
      synced_at: getRelativeDate(0, 9, 30)
    }
  ],
  // ============ RMA Dynamic Configuration ============
  rmaConfig: {
    approvalThreshold: 1000000,
    thresholdStatus: 'assumption',
    makerRoles: ['warehouse', 'manager'],
    checkerRoles: ['owner', 'admin'],
    enabledBranches: ['refund', 'exchange', 'warranty', 'partial_return', 'transit_damage', 'returnless_refund'],
    preventDoubleRefund: true,
    preventDoubleRestock: true,
    preventExceedingOrderQty: true
  },

  // ============ Revenue Policy Selection ============
  revenuePolicy: 'FOB_DESTINATION',

  // ============ Audit Logs ============
  auditLogs: [
    {
      id: 'audit_01',
      action: 'ORDER_ATOMIC_RESERVATION',
      entity: 'orders',
      entity_id: 'ord_90214',
      actor: 'system_atomic_rpc',
      details: { sku: 'NX-AIR-PRO', quantity: 1, available_before: 136, available_after: 135 },
      created_at: '2026-10-28T09:15:00Z'
    },
    {
      id: 'audit_02',
      action: 'DOUBLE_ENTRY_BALANCED_POST',
      entity: 'journal_entries',
      entity_id: 'je_89021',
      actor: 'usr_finance_01',
      details: { debit_sum: 1250000, credit_sum: 1250000, balanced: true },
      created_at: '2026-10-28T09:20:00Z'
    }
  ]
};

// Seed relationships must resolve to real shops; never infer tenant from a role.
for (const order of INITIAL_MOCK_DATABASE.orders) {
  order.shop_id ||= INITIAL_MOCK_DATABASE.channelConnections?.find(c => c.channel === order.channel)?.shop_id;
}

for (const key of ['channelConnections', 'channelSkuMappings', 'syncLogs', 'customerComplaints', 'outboundWebhooks', 'webhookDeliveryLogs', 'bufferRules', 'routingRules', 'orderAutomationRules', 'pickingWaves', 'purchaseOrders', 'purchaseOrderItems'] as const) {
  for (const row of INITIAL_MOCK_DATABASE[key] || []) Object.assign(row, { tenant_id: 'tenant_flagship' });
}

for (const order of INITIAL_MOCK_DATABASE.orders) {
  if (order.status === 'processing') order.fulfillment_status ||= 'allocated';
}
