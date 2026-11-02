# HƯỚNG DẪN CHUYỂN ĐỔI TỪ MOCK PROTOTYPE SANG BACKEND THẬT
**Tài liệu kỹ thuật:** NexusOMS Enterprise  
**Phiên bản hiện tại:** V5 Prototype-First Architecture  
**Cơ chế chuyển đổi:** 1-Flag Switch (`VITE_DATA_MODE`)

---

## 1. NGUYÊN TẮC THIẾT KẾ: ZERO-THROWAWAY CODE

Giai đoạn phát triển Prototype-First của NexusOMS được xây dựng trên mô hình phân tách tầng nghiêm ngặt (Clean Layered Architecture):

```
┌────────────────────────────────────────────────────────┐
│               Giao diện Người dùng (UI)               │
│  (Components, Pages, Modals, Drawers, Filters, Tables) │
└──────────────────────────┬─────────────────────────────┘
                           │ (Giao tiếp qua Service / Query Layer)
                           ▼
┌────────────────────────────────────────────────────────┐
│           Cơ Chế Phân Phối Dữ Liệu (Router)           │
│        (src/lib/config.ts - VITE_DATA_MODE)            │
└──────────────┬───────────────────────────┬─────────────┘
               │ (VITE_DATA_MODE=mock)     │ (VITE_DATA_MODE=supabase)
               ▼                           ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│   Centralized Mock Engine    │ │   Supabase / PostgreSQL      │
│  • LocalStorage In-Browser   │ │  • Real ACID Transactions    │
│  • Reactive Event Bus        │ │  • Row Level Security (RLS)  │
│  • Cross-Module State Sync   │ │  • Stored RPCs Security Def  │
│  • 12 Demo Scenarios         │ │  • Production Database       │
└──────────────────────────────┘ └──────────────────────────────┘
```

**Lợi ích cốt lõi:**  
Toàn bộ mã nguồn giao diện (100% React components, form validations, bảng phân quyền RBAC, drawer chi tiết, bộ lọc đa tiêu chí) được **bảo toàn nguyên vẹn**, không phải viết lại khi kết nối cơ sở dữ liệu thật.

---

## 2. QUY TRÌNH 3 BƯỚC ĐỂ BẬT BACKEND THẬT

### Bước 1: Thay Đổi Biến Môi Trường (`.env`)
Chuyển đổi cờ `VITE_DATA_MODE` từ `mock` sang `supabase`:

```env
# Mặc định trong giai đoạn Prototype:
# VITE_DATA_MODE=mock

# Khi chuyển sang môi trường Staging / Production:
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Bước 2: Cơ Chế Tự Động Trong Code ([`src/lib/supabase.ts`](file:///d:/Noxus-V3/src/lib/supabase.ts))
Hệ thống tự động nhận diện giá trị cờ:
```typescript
import { createClient } from '@supabase/supabase-js';
import { isMockMode } from './config';
import { mockSupabaseClient } from '@/mock/mockSupabaseAdapter';

const realSupabase = createClient(supabaseUrl, supabaseAnonKey, { ... });

// Khi VITE_DATA_MODE=supabase, toàn bộ truy vấn tự động trỏ về Supabase thật:
export const supabase = isMockMode() ? mockSupabaseClient : realSupabase;
```

### Bước 3: Đồng Bộ PostgreSQL RPC Stored Functions
Các hàm RPC đã được thiết kế sẵn trong thư mục `supabase/migrations/` trùng khớp 1:1 với signature của Mock Engine:
- `place_order_atomic(p_tenant_id, p_customer_id, p_items, ...)`
- `cancel_order_atomic(p_order_id, p_reason)`
- `process_return_restock_atomic(p_return_id, p_is_good)`
- `post_journal_entry_atomic(p_entry, p_lines)`
- `next_order_number()`

---

## 3. BẢNG ĐỐI CHIẾU MOCK VS PRODUCTION BACKEND

| Nghiệp vụ | Khi Chạy Mock Prototype (`mock`) | Khi Chạy Backend Thật (`supabase`) |
| :--- | :--- | :--- |
| **Lưu trữ dữ liệu** | `localStorage` trình duyệt (`nexus_mock_db_v2`). | Bảng PostgreSQL có phân vùng và Foreign Key. |
| **Xác thực (Auth)** | Session mô phỏng tức thời, 1-click chuyển đổi vai trò. | Supabase GoTrue Auth, JWT, refresh token an toàn. |
| **Khóa tồn nguyên tử** | Tính toán trên Javascript Memory & LocalStorage. | PostgreSQL Transaction (`SELECT FOR UPDATE`). |
| **Phân quyền (RBAC)** | Prototype RBAC ẩn/hiện nút và lọc menu sidebar. | PostgreSQL Row Level Security (RLS) cưỡng chế cấp database. |
| **Sổ kép kế toán** | Kiểm tra `debit === credit` trước khi lưu mảng JSON. | Trigger hoặc RPC kiểm tra cân đối tổng Nợ = Có. |
| **Thử nghiệm kịch bản**| Bảng điều khiển Demo Control Panel (12 scenarios). | Môi trường Staging và Test Runner tự động. |

---

## 4. DANH MỤC KIỂM TRA TRƯỚC KHI BẬT BACKEND (READINESS CHECKLIST)

- [ ] Phê duyệt xong toàn bộ quy trình nghiệp vụ trên Prototype.
- [ ] Chốt danh sách trường dữ liệu và trạng thái đơn hàng.
- [ ] Khởi tạo môi trường Supabase Staging với các migrations đã chuẩn bị.
- [ ] Cấu hình Webhook Secret từ Shopee, TikTok Shop và Lazada.
- [ ] Đổi `VITE_DATA_MODE=supabase` và chạy kiểm thử tích hợp thực tế.
