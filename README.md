# NexusOMS

Hệ thống vận hành thương mại đa kênh (Order Management System). Monorepo gồm giao diện, backend API và schema cơ sở dữ liệu.

## Cấu trúc repository

```
frontend/   React + Vite + TypeScript. Prototype giao diện, chạy bằng mock engine
backend/    .NET 10 Web API, kiến trúc modular (xem backend/README.md)
supabase/   Cấu hình, migration và seed cho Supabase (Auth + PostgreSQL)
docs/       Tài liệu dùng chung (xem docs/README.md)
.github/    CI workflow, CODEOWNERS, PR template, Dependabot
```

Mỗi thư mục là một đơn vị độc lập, có README, lệnh build và CI riêng.

## Bắt đầu nhanh

| Phần | Lệnh | Chi tiết |
|---|---|---|
| Frontend | `cd frontend && npm ci && npm run dev` | [frontend/README.md](frontend/README.md) |
| Backend | `cd backend && dotnet run --project src/NexusOMS.Api` | [backend/README.md](backend/README.md) |

Frontend mặc định chạy mock, không cần backend hay AWS credentials.

## Quy ước làm việc

- Nhánh chính `main` được bảo vệ. Mọi thay đổi đi qua Pull Request và CI phải xanh.
- Commit theo Conventional Commits: `feat:`, `fix:`, `docs:`, `ci:`, `refactor:`, `test:`, `chore:`.
- Không commit secret, `.env`, `node_modules`, `bin/`, `obj/`. Chỉ commit `.env.example`.
- CI chạy theo từng phần: sửa `frontend/**` chạy Frontend CI, sửa `backend/**` chạy Backend CI.

## Kiến trúc đích

Backend .NET trên AWS (App Runner, SQS/DLQ, RDS PostgreSQL, S3, EventBridge, SSM, CloudWatch). Hiện mới là prototype: các thành phần AWS chưa triển khai. Chi tiết lộ trình ở `docs/architecture/`.
