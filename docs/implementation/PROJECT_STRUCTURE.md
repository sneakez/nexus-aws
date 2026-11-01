# NexusOMS frontend structure

Project áp dụng kiến trúc domain-first theo mẫu `nexus-oms-web`, nhưng giữ React + Vite trong giai đoạn MVP để bảo toàn demo, mock engine và bộ kiểm thử hiện có.

## Runtime tree

```text
src/
├── app/
│   ├── AppRoot.tsx
│   ├── navigation.ts
│   ├── page-registry.tsx
│   ├── types.ts
│   ├── layout/AppShell.tsx
│   ├── providers/AppProviders.tsx
│   └── router/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── orders/
│   ├── inventory/
│   ├── catalog/
│   ├── channels/
│   ├── post-purchase/
│   ├── crm/
│   ├── finance/
│   └── simulator/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── common/
│   └── charts/
├── hooks/
├── services/
├── stores/
├── schemas/
├── providers/
├── analytics/
├── mock/
├── types/
├── utils/
└── pages/                 # compatibility exports only
```

## Module ownership

| Domain | Screen ownership |
| --- | --- |
| Dashboard | KPI, heatmap, P&L overview, channel health |
| Orders | Unified order hub and fulfillment workflow |
| Inventory | Five-state balances, safety stock and QC |
| Catalog | Internal SKU to channel SKU mapping |
| Channels | Shop connections and synchronization status |
| Post-purchase | RMA, warehouse receipt and QC |
| CRM | Unified customer profile, LTV and tier |
| Finance | Order/SKU/channel economics, cash and pricing |
| Simulator | Signed webhook and flash-sale contention demo |

## Dependency direction

```text
App → Features → Components / Hooks / Services / Stores
Stores → Mock engine today; API adapter later
Services → browser SDK or future HTTP client
Pages → compatibility exports pointing back to Features
```

`app` owns routing and composition. A feature must not register itself by editing the Sidebar; navigation and metadata live together in `app/navigation.ts`. Feature screens are lazy-loaded through `app/page-registry.tsx`.

## Why Vite remains for the MVP

The reference structure uses Next.js App Router. This repository already has a stable Vite runtime, browser-local mock database, 142 tests and UI automation. Changing the framework at the same time as changing module boundaries would mix two migrations and make failures harder to isolate.

The current structure mirrors the future Next.js route groups without claiming server components or API routes that do not exist. A later Next.js migration can map `features/*/pages` into `app/(dashboard)/*/page.tsx` while retaining feature logic, schemas and services.

## Migration rules

1. New screens go inside the owning `features/<domain>` folder.
2. Shared UI stays in `components`; business-specific components stay in their feature.
3. Components do not import `mock/store` directly in new code; use `stores/omsStore` or a feature service.
4. External payloads receive a schema in `schemas` before use.
5. HTTP/Supabase/AWS integration belongs in `services`, not in presentation components.
6. Remove a compatibility wrapper in `pages` only after no test or legacy screen imports it.
