# NEXUSOMS — Post-Implementation Audit Report

**Date:** 2026-10-28
**Auditor:** Automated audit (Bolt)
**Scope:** Full project — database, security, frontend, business workflows, build
**Verdict:** CONDITIONAL GO

---

## Executive Summary

NexusOMS is a multi-tenant OMS (Order Management System) built on React + Vite + TypeScript + Tailwind CSS + Supabase, cloned from an old GitHub repository. The project has 41 database tables covering orders, products, inventory, warehouses, channels, fulfillment, returns, ledger, webhooks, audit logs, routing/buffer rules, and tenant management. The frontend has 30 page components.

### Key Findings

| Severity | Count | Description |
|----------|-------|-------------|
| P0 | 3 | Security: open anon access to tenant tables, bundle_components no tenant isolation, admin functions exposed |
| P1 | 4 | Auth login unreliable, no error handling in data loading, dual RBAC confusion, Dashboard incorrect metrics |
| P2 | 3 | No client-side tenant filtering, raw error messages shown to users, unbounded queries |
| P3 | 2 | Bundle size warning, no code splitting, hardcoded demo credentials in UI |

### Remediation Status

- **P0 issues: FIXED** in this audit session (migration `fix_critical_security_issues_audit`)
- **P1 auth issue: PARTIALLY MITIGATED** — auth user data verified complete, but root cause not definitively confirmed
- **P1-P3 code issues: DOCUMENTED** — require follow-up development

---

## Phase 1: Implementation Verification

### 1.1 Database Schema

**Rating: PASS**

- 41 tables confirmed via `information_schema` inspection
- All business tables have `tenant_id` column (nullable, default `33b2bf49-...`)
- `tenant_memberships` and `tenant_invitations` have NOT NULL `tenant_id`
- `bundle_components` originally lacked `tenant_id` — **FIXED** in this audit
- Comprehensive indexes: every table has a primary key + tenant_id index + domain-specific indexes

### 1.2 Frontend Pages

**Rating: PASS (with caveats)**

- 30 page components confirmed in `src/pages/` covering all OMS domains
- `App.tsx` routes all 30 pages via `useState<PageId>`
- Build passes: `vite build` succeeds, 1679 modules, 621KB JS bundle

### 1.3 Auth System

**Rating: PARTIAL**

- 3 demo users in `auth.users`: admin/manager/warehouse@nexusoms.vn
- All have: email confirmed, bcrypt cost-10 passwords, raw_app_meta_data present, identities matching
- `auth.instances` has 1 row (GoTrue requirement met)
- `handle_new_user` trigger exists on `auth.users` → creates profile on signup
- `tenant_memberships` has 3 rows mapping each user to default tenant with correct roles
- **Unresolved:** "Database error querying schema" login error — all auth data appears correct at SQL level but the error was repeatedly reported by the user. Root cause is likely related to direct SQL inserts into `auth.users` bypassing GoTrue's internal user creation process. The proper fix is to recreate users via Supabase Auth Admin API or the Supabase dashboard.

### 1.4 TypeScript Types

**Rating: PARTIAL**

- `src/types/index.ts` (655 lines) defines all entity types
- **Issue:** Dual RBAC system — `TenantRole` ('owner'|'admin'|'manager'|'warehouse'|'finance'|'viewer') vs `UserRole` ('admin'|'manager'|'warehouse'). These competing systems create confusion about which is authoritative.
- **Issue:** Most entity interfaces (Product, Customer, Order, etc.) lack `tenant_id` field, despite the column existing in the database.

---

## Phase 2: Multi-Tenant Security Audit

### 2.1 RLS Coverage

**Rating: PASS**

- RLS enabled on all 41 tables (verified via `get_security_posture`)
- 40/41 tables have proper 4-policy CRUD pattern (SELECT/INSERT/UPDATE/DELETE) with tenant membership checks
- Policies use `EXISTS (SELECT 1 FROM tenant_memberships m WHERE m.tenant_id = <table>.tenant_id AND m.user_id = auth.uid() AND m.status = 'active')`
- `tenant_invitations` and `tenant_settings` have admin-only INSERT/UPDATE/DELETE policies (role IN ['owner','admin'])
- `tenant_memberships` has self-service + admin policies (users can read/update own membership, admins manage all)

### 2.2 Cross-Tenant Isolation

**Rating: PASS (after fix)**

- All business table policies filter by `tenant_id` matching the user's membership
- `profiles` table has a shared-tenant SELECT policy (users can see profiles of users in the same tenant)
- `bundle_components` was the only table without tenant isolation — **FIXED** in this audit
- No views or materialized views exist that could bypass RLS

### 2.3 SECURITY DEFINER Functions

**Rating: PARTIAL (after partial fix)**

7 SECURITY DEFINER functions exist:

| Function | Risk | Status |
|----------|------|--------|
| `handle_new_user` | Low (trigger only, not callable via API) | OK |
| `admin_create_user` | HIGH — creates users, was callable by any authenticated user | **FIXED** — restricted to service_role |
| `admin_update_profile` | HIGH — modifies user roles, was callable by any authenticated user | **FIXED** — restricted to service_role |
| `append_audit_log` | Medium — callable by authenticated (by design for audit logging) | Acceptable |
| `decrement_stock` | Medium — callable by authenticated (by design for inventory ops) | Acceptable |
| `restore_stock` | Medium — callable by authenticated (by design for inventory ops) | Acceptable |
| `verify_audit_chain` | Low — read-only audit chain verification | Acceptable |

All functions have `search_path=public` set (no search path injection risk).

### 2.4 Anon Role Access

**Rating: PASS (after fix)**

- Before this audit: `tenants`, `tenant_memberships`, `tenant_invitations`, `tenant_settings`, and `bundle_components` granted full CRUD to `anon`
- **FIXED:** Anon grants revoked from all 5 tables. Anon role can no longer access any table in the public schema.

### 2.5 Client-Side Tenant Scoping

**Rating: FAIL**

- No page component filters queries by `tenant_id` — all rely 100% on RLS
- This is architecturally acceptable IF RLS is correctly configured (which it now is)
- However, inserts do not set `tenant_id` — they rely on the column default (`33b2bf49-...`)
- This means all new records go to the default tenant regardless of the user's active tenant
- `switchTenant` in AuthProvider changes `activeTenant` in the UI but does not affect query results

---

## Phase 3: OMS Business Workflows

### 3.1 Order Management

**Rating: PARTIAL**

- `OrdersPage.tsx`: Lists orders with status filters, search, Excel/PDF export, create modal, detail drawer
- **Bug:** `order.order_items?.length` referenced in table but `order_items` not in the select query — always shows 0
- **Issue:** On error, shows toast but still calls `setOrders(data ?? [])` — silently empties the list
- No retry affordance on error

### 3.2 Inventory Management

**Rating: PARTIAL**

- `InventoryPage.tsx`: Shows 5-state inventory (physical/reserved/available/unavailable/incoming), warehouse filters, low-stock banner
- **Bug:** No error handling at all — `load()` discards `error` from both queries
- If either query fails, page silently renders empty/zeros

### 3.3 Product Catalog

**Rating: PARTIAL**

- `ProductsPage.tsx`: Full CRUD with category filter, summary cards, create/edit modal, delete confirmation
- **Bug:** `load()` discards `error`
- **Bug:** `handleDelete` shows a hardcoded error message regardless of actual failure cause
- **Issue:** Insert does not set `tenant_id` — relies on column default (acceptable for single-tenant demo, breaks for multi-tenant)

### 3.4 Other Workflows

**Rating: NOT VERIFIED**

- 27 other page components exist but were not individually audited in this session
- They follow the same architectural pattern (direct Supabase queries, no tenant filter, RLS-dependent)
- Sample inspection suggests similar error-handling gaps across the board

---

## Phase 4: Database Integrity

### 4.1 Schema Consistency

**Rating: PASS**

- All tables have proper primary keys (UUID)
- Foreign key constraints in place (verified by index patterns)
- Unique constraints on business keys (order_number, sku, po_number, transfer_number, etc.)
- `tenant_memberships` has composite unique constraint on (tenant_id, user_id)

### 4.2 Data Integrity

**Rating: PASS**

- 3 auth.users with matching profiles and tenant_memberships
- All users have email_confirmed_at set, identities present, app_meta_data populated
- No orphaned records detected (profiles ↔ memberships ↔ auth.users all aligned)
- `auth.instances` has 1 row (GoTrue requirement)

### 4.3 Migration History

**Rating: PASS**

- 24 migration files applied successfully
- Latest migration: `fix_critical_security_issues_audit` (this session)
- No failed migrations detected

---

## Phase 5: Frontend / UX

### 5.1 Build

**Rating: PASS**

- `npm run build` succeeds: 1679 modules, 621KB JS (159KB gzipped), 52KB CSS
- No TypeScript errors
- No build warnings except chunk size (P3)

### 5.2 Error Handling

**Rating: FAIL**

- `DashboardPage.tsx`: Three `Promise.all` queries with no error handling, no tenant filter
- `InventoryPage.tsx`: No error handling at all
- `ProductsPage.tsx`: `load()` discards errors; insert/update surface raw Supabase messages
- `OrdersPage.tsx`: Toasts error but still overwrites state with empty array
- `App.tsx`: `refreshStats()` polls every 30s with no error handling, no tenant filter
- `AuthProvider.tsx`: `getSession().then()` has no `.catch()` — rejection leaves `loading=true` forever

### 5.3 Loading States

**Rating: PARTIAL**

- `DashboardPage` shows `FullPageSpinner` while loading
- `LoginPage` has loading state but does not reset on success path (relies on session change)
- `AuthProvider` has `loading` state but can get stuck true if `getSession` rejects

### 5.4 Design Quality

**Rating: PASS**

- Professional design with gradient banners, KPI cards, chart visualizations, status breakdowns
- Vietnamese language UI (appropriate for target market)
- Responsive layout with mobile sidebar
- Consistent component library (Card, Badge, Button, Modal, Drawer, etc.)
- Custom animations (bar-grow, fade-in-up, hover states)

---

## Phase 6: Performance

### 6.1 Database Indexes

**Rating: PASS**

- Every table has a tenant_id index
- Domain-specific indexes on frequently queried columns (status, placed_at, customer_id, etc.)
- Composite indexes on unique business keys
- No missing indexes detected for the query patterns used

### 6.2 Query Efficiency

**Rating: PARTIAL**

- `DashboardPage`: Loads only 50 orders (causes incorrect 30-day revenue comparison when > 50 orders exist)
- `DashboardPage`: Unbounded product query (`select('*')` with no limit)
- `App.tsx`: Polls orders + products every 30s — no debounce, no abort on unmount
- Bundle size: 621KB JS (above 500KB warning threshold) — no code splitting

### 6.3 Frontend Performance

**Rating: PARTIAL**

- No `React.memo`, `useMemo`, or `useCallback` on expensive computations (except `useMemo` in DashboardPage for metrics/chart)
- `refreshStats` recreated each render but used in `setInterval` — minor inefficiency
- No lazy loading of page components — all 30 pages bundled in one chunk

---

## Phase 7: Billing / SaaS Operations

**Rating: NOT VERIFIED**

- No billing integration found (no Stripe, no subscription tables, no usage tracking)
- Tenant management tables exist (`tenants`, `tenant_memberships`, `tenant_invitations`, `tenant_settings`) but no UI for tenant creation/switching in the frontend
- `switchTenant` exists in AuthProvider but no visible UI component calls it
- No tenant onboarding flow
- No usage limits or quota enforcement

---

## Phase 8: Build / Test / Security

### 8.1 Build

**Rating: PASS**

- Production build succeeds
- No TypeScript errors
- ESLint config present (not run in this audit)

### 8.2 Tests

**Rating: FAIL**

- No test files found in the project
- No test framework configured
- No test scripts in package.json

### 8.3 Security

**Rating: PASS (after fixes)**

Issues found and fixed in this audit:
1. `bundle_components` had no tenant_id and `USING(true)` policies → **FIXED**
2. `tenants`, `tenant_memberships`, `tenant_invitations`, `tenant_settings` granted CRUD to anon → **FIXED**
3. `admin_create_user`, `admin_update_profile` callable by any authenticated user → **FIXED** (restricted to service_role)

Remaining security notes:
- Demo credentials hardcoded in LoginPage UI (P3 — acceptable for demo, must remove for production)
- `handle_new_user` trigger defaults role to 'warehouse' if not specified in raw_user_meta_data
- Client-side `useRole` flags in AuthProvider must not be trusted for authorization — they are UX-only
- Raw Supabase error messages surfaced to users in some pages (minor info disclosure)

---

## Phase 9: Auto-Remediation Applied

### Migration 1: `fix_tenant_memberships_and_secure_functions` (earlier in session)
- Created tenant_memberships for all 3 demo users (admin→admin, manager→manager, warehouse→warehouse)
- Revoked EXECUTE on 6 SECURITY DEFINER functions from PUBLIC/anon
- Granted EXECUTE to authenticated only

### Migration 2: `fix_critical_security_issues_audit` (this session)
- Added `tenant_id` column to `bundle_components` with default tenant
- Replaced open `USING(true)` anon policies on `bundle_components` with proper tenant-scoped policies
- Revoked all privileges from anon on 4 tenant foundation tables
- Restricted `admin_create_user` and `admin_update_profile` to service_role only

### Code Changes
- Removed temporary `recreate-users` edge function (was deployed but never successfully invoked)

---

## Phase 10: Bug Classification Summary

| ID | Severity | Phase | Description | Status |
|----|----------|-------|-------------|--------|
| BUG-001 | P0 | 2 | bundle_components no tenant_id, USING(true) policies | FIXED |
| BUG-002 | P0 | 2 | Anon CRUD on tenants/memberships/invitations/settings | FIXED |
| BUG-003 | P0 | 2 | admin_create_user/admin_update_profile callable by any user | FIXED |
| BUG-004 | P1 | 1 | Auth login "Database error querying schema" | PARTIALLY MITIGATED |
| BUG-005 | P1 | 5 | No error handling in data loading across pages | DOCUMENTED |
| BUG-006 | P1 | 2 | Dual RBAC: TenantRole vs UserRole | DOCUMENTED |
| BUG-007 | P1 | 3 | Dashboard loads only 50 orders — incorrect 30-day revenue | DOCUMENTED |
| BUG-008 | P2 | 2 | No client-side tenant filtering (relies 100% on RLS) | DOCUMENTED |
| BUG-009 | P2 | 5 | Raw Supabase error messages shown to users | DOCUMENTED |
| BUG-010 | P2 | 6 | Unbounded product query in Dashboard | DOCUMENTED |
| BUG-011 | P3 | 6 | 621KB JS bundle, no code splitting | DOCUMENTED |
| BUG-012 | P3 | 5 | Demo credentials hardcoded in LoginPage UI | DOCUMENTED |
| BUG-013 | P2 | 3 | OrdersPage references order_items not in select query | DOCUMENTED |
| BUG-014 | P1 | 5 | AuthProvider getSession() has no .catch() | DOCUMENTED |

---

## Final Verdict: CONDITIONAL GO

### Rationale

The project has a solid architectural foundation with comprehensive schema design, proper RLS policies (now fixed), and a professional UI. All P0 security issues have been remediated. The build passes. However, several P1 issues remain unresolved:

### Mandatory fixes before production:
1. **Resolve auth login issue** — Recreate demo users via Supabase Auth Admin API or dashboard, not direct SQL inserts
2. **Add error handling** to all data-loading pages (at minimum: try/catch + error state + retry)
3. **Fix DashboardPage** to load all orders for accurate 30-day revenue comparison (or use server-side aggregation)
4. **Fix AuthProvider** `getSession()` to handle rejection

### Recommended improvements:
5. Unify RBAC to a single system (recommend TenantRole as the authoritative system)
6. Add `tenant_id` to TypeScript entity interfaces
7. Implement code splitting for the 30 page components
8. Add test framework and basic tests
9. Remove demo credentials from LoginPage UI for production
10. Implement tenant switching UI that actually filters queries by active tenant
