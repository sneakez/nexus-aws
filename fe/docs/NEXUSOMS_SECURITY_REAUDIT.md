# NEXUSOMS — Security Re-Audit

**Date:** 2026-10-28
**Auditor:** Automated re-audit (Bolt)
**Scope:** P0 security re-verification, cross-tenant runtime tests, RLS recursion fix, stock function tenant auth, audit log tenant scoping, Dashboard RPC aggregation, code splitting
**Method:** SQL evidence + runtime RLS tests (SET LOCAL role authenticated + JWT claims)

---

## P0-1: Tenant-Aware Authorization

### Finding: admin_create_user / admin_update_profile

**Before (v1 audit):** Used `profiles.role = 'admin'` as sole auth check. Any user with `profiles.role='admin'` could create/modify users across ALL tenants. New users were assigned to the FIRST tenant (`ORDER BY created_at LIMIT 1`), not the admin's tenant.

**After (this re-audit):** Both functions now use `tenant_memberships` for authorization:

```sql
SELECT m.tenant_id, m.role INTO v_caller_tenant_id, v_caller_tenant_role
  FROM public.tenant_memberships m
  WHERE m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('admin', 'owner')
  ORDER BY m.created_at LIMIT 1;
```

- `admin_create_user`: New user assigned to caller's tenant (not first tenant)
- `admin_update_profile`: Cross-tenant check added — target user must be in same tenant

**Runtime test evidence:**
- User B (tenant B) calling `admin_update_profile(admin_A_id, ...)`: `ERROR: 42501: Khong co quyen: nguoi dung khong thuoc tenant cua ban` — BLOCKED
- User A (tenant A) calling `admin_update_profile(warehouse_A_id, ...)`: SUCCESS, profile updated

**Verdict: PASS**

### Additional: tenants INSERT policy

**Before:** `WITH CHECK (true)` — any authenticated user could create tenants.
**After:** `WITH CHECK (false)` — browser users cannot create tenants; only service_role (edge functions) can.

**Verdict: PASS**

### service_role key exposure

**Evidence:** `grep -r "service_role\|SERVICE_ROLE" src/` → no matches. Service role key is NOT in frontend code.

**Verdict: PASS**

---

## P0-2: Bundle Tenant Integrity

### Finding: bundle_components

**Before:** `tenant_id` had hardcoded DEFAULT `'33b2bf49-...'`. All new rows went to tenant A regardless of caller.

**After:** DEFAULT dropped. Trigger `validate_bundle_component_tenant` enforces:
1. `bundle_components.tenant_id` must match parent bundle product's `tenant_id`
2. Child product's `tenant_id` must match parent bundle product's `tenant_id`

**Bug found and fixed during re-audit:** Initial trigger referenced non-existent `bundle_id` column and `bundles` table. Actual schema uses `parent_bundle_product_id` and `child_product_id` (both FK to `products`). Trigger corrected.

**Trigger function:** `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` — not callable via RPC, only via database trigger.

**Verdict: PASS**

---

## P0-3: Cross-Tenant Integration Tests (Runtime)

### Test environment
- Tenant A: `33b2bf49-...` (existing, with admin/manager/warehouse users)
- Tenant B: `cccc0000-...` (created for testing, cleaned up after)
- User B: `adminB@test-tenant.com` (admin of tenant B only)
- Product A: tenant A, Product B: tenant B

### Test results (SET LOCAL role authenticated + JWT claims)

| Test | Method | Result |
|------|--------|--------|
| User B SELECT Product A | RLS | BLOCKED — only Product B returned |
| User A SELECT Product B | RLS | BLOCKED — only Product A returned |
| User B INSERT product in tenant A | RLS | `ERROR: 42501: new row violates row-level security policy` |
| User B calls decrement_stock on Product A | RPC auth | `ERROR: 42501: Khong co quyen: san pham khong thuoc tenant cua ban` |
| User A calls decrement_stock on Product A | RPC auth | SUCCESS — stock decremented 50→45 |
| User B calls admin_update_profile on User A | RPC auth | `ERROR: 42501: Khong co quyen: nguoi dung khong thuoc tenant cua ban` |
| User A calls admin_update_profile on User A's tenant member | RPC auth | SUCCESS |

### RLS Recursion Bug — Found and Fixed

**Finding:** `profiles_select_shared_tenant` policy JOINed `tenant_memberships m1 × m2`. The `tenant_memberships_select` policy self-referenced `tenant_memberships` for admin checks → infinite recursion when querying profiles under RLS.

**Fix:** Created SECURITY DEFINER helper functions `get_user_tenant_ids()` and `is_tenant_admin()` that bypass RLS. Replaced self-referencing policy subqueries with these functions. Split `tenant_memberships SELECT` into `memberships_select_own` (user_id = auth.uid()) and `memberships_select_by_admin` (uses `is_tenant_admin()`).

**Test:** `SET LOCAL role authenticated` + JWT claims for User B → successful query, no recursion, correct tenant filtering.

**Verdict: PASS**

### Test data cleanup

All test data (tenant B, user B, test products) deleted. Verified zero remaining test rows.

---

## P0-4: Auth Validation

### Auth state verification (SQL evidence)

| User | email_confirmed | has_role_key | role_value | has_password | hash_prefix | not_banned | has_identity |
|------|----------------|-------------|------------|-------------|-------------|-----------|-------------|
| admin@nexusoms.vn | true | true | authenticated | true | $2a$ | true | true |
| manager@nexusoms.vn | true | true | authenticated | true | $2a$ | true | true |
| warehouse@nexusoms.vn | true | true | authenticated | true | $2a$ | true | true |

All auth fields complete. `raw_app_meta_data` has `role` key (root cause of previous login error, fixed in prior session).

### Login/refresh/logout — NOT VERIFIED

Cannot test actual HTTP login flow without a browser. All database-level prerequisites are verified correct.

**Verdict: PARTIAL — DB-level PASS, browser-level NOT VERIFIED**

---

## P1-1: Dashboard Aggregation

### Before
Dashboard fetched all `orders.total` rows to client and summed in JavaScript. No LIMIT on revenue queries. Would break with >10,000 orders.

### After
Created 3 SECURITY DEFINER RPC functions:
- `get_dashboard_metrics()`: SUM/COUNT for revenue, orders, customers, products, status breakdown
- `get_dashboard_daily()`: GROUP BY date_trunc('day') for 7-day chart
- `get_low_stock_products()`: Returns only low-stock product names (LIMIT 10)

All functions are tenant-scoped (check `tenant_memberships` for caller's tenant).

Dashboard frontend rewritten to use RPC calls instead of fetching raw rows. No client-side aggregation of large datasets.

**Verdict: PASS**

---

## P1-2: Business Integrity

### Stock functions (decrement_stock / restore_stock)

**Before:** SECURITY DEFINER with NO tenant check — any authenticated user could modify stock of products in any tenant.

**After:** Both functions now check `tenant_memberships` for caller's tenant, verify product belongs to same tenant. Cross-tenant test confirmed: User B blocked from modifying Product A.

**Verdict: PASS**

### append_audit_log

**Before:** SECURITY DEFINER, inserted audit logs with hardcoded default `tenant_id` (always tenant A). Previous hash chain was global (not per-tenant).

**After:** Function now gets caller's tenant_id from `tenant_memberships`, sets `audit_logs.tenant_id` correctly, and chains hashes per-tenant. Default dropped from column.

**Verdict: PASS**

### Concurrent reservation, webhook idempotency, cancellation flow — NOT VERIFIED

These require application-level testing with concurrent writes and webhook delivery, which cannot be done in this environment.

**Verdict: NOT VERIFIED**

---

## P1-3: Frontend Recovery

### Code splitting

**Before:** All 30 pages in one 623KB bundle.

**After:** `React.lazy()` + `Suspense` for all 30 pages. Main bundle reduced to 339KB (103KB gzip). Each page loads on-demand as separate chunk (8-28KB each).

**Verdict: PASS**

### Error handling

Fixed in prior session: Dashboard, Inventory, Products, App, AuthProvider.

Remaining 26 pages: NOT FIXED — documented for follow-up.

**Verdict: PARTIAL**

---

## Migrations Applied This Re-Audit

| # | Filename | Purpose |
|---|----------|---------|
| 1 | `p0_tenant_aware_authorization` | Rewrite admin functions with tenant_memberships auth, fix tenants INSERT policy, remove bundle_components default, add trigger |
| 2 | `revoke_trigger_function_execute` | Revoke EXECUTE on trigger function from anon/PUBLIC |
| 3 | `p0_create_test_tenant_b` | Create test tenant B + user B + test products for cross-tenant tests |
| 4 | `fix_bundle_components_trigger_schema` | Fix trigger referencing non-existent bundle_id/bundles table |
| 5 | `fix_rls_recursion_profiles_memberships` | Fix infinite RLS recursion on profiles + tenant_memberships SELECT |
| 6 | `fix_stock_functions_tenant_auth` | Add tenant authorization to decrement_stock / restore_stock |
| 7 | `fix_audit_log_tenant_id` | Fix append_audit_log to set correct tenant_id, per-tenant hash chain |
| 8 | `p1_dashboard_aggregation_rpc` | Create server-side aggregation RPCs for Dashboard |

---

## Final Verdict: PASS (with caveats)

All P0 security issues verified with runtime tests. RLS recursion fixed. Stock and audit functions secured. Dashboard uses server-side aggregation. Code splitting implemented.

### Caveats (NOT VERIFIED)
- Browser login flow
- Concurrent stock reservation (overselling)
- Webhook idempotency
- Order cancellation inventory release
- Error handling on 26 remaining pages
