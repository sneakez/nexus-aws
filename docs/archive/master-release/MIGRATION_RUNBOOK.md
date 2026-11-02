# 19. DATABASE MIGRATION & DEPLOYMENT RUNBOOK

## 1. Migration Overview
This runbook guides DevOps engineers and Database Administrators through applying NexusOMS database migrations on Staging and Production environments.

### Strict Safety Guidelines
- **DO NOT** execute destructive migrations on live production without prior point-in-time snapshot backup.
- **DO NOT** drop tables or remove columns containing live business data.
- **DO NOT** expose Supabase service_role secret keys in frontend or public environments.

---

## 2. Migration Execution Order

### Step 1: Pre-Migration Snapshot
```bash
# Create Supabase backup snapshot
supabase db dump -f backup_pre_v4_$(date +%Y%m%d%H%M%S).sql
```

### Step 2: Apply Migration V4 (P0 Foundation)
```bash
# File: supabase/migrations/20261028080000_v4_p0_multitenant_transactions_and_security.sql
# Applies:
# 1. Drops static default UUID on tenant_id
# 2. Adds unique index orders_tenant_idempotency_idx
# 3. Creates place_order_atomic, cancel_order_atomic, delete_order_atomic, post_journal_entry_atomic
# 4. Revokes UPDATE/DELETE on audit_logs
supabase db push
```

### Step 3: Apply Migration V4.1 (Hardening)
```bash
# File: supabase/migrations/20261028090000_v4_1_security_rbac_inventory_hardening.sql
# Applies:
# 1. Trigger prevent_last_owner_demotion
# 2. Tightened cancel_order_atomic RBAC (withdrawn from warehouse)
# 3. Products stock non-negative check constraint
# 4. Stored procedure verify_inventory_consistency
supabase db push
```

### Step 4: Verification Queries
```sql
-- Verify search path on atomic functions
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname IN ('place_order_atomic', 'cancel_order_atomic', 'post_journal_entry_atomic');

-- Verify audit_logs permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'audit_logs';
```

### Step 5: Rollback Procedures
If a stored procedure fails during migration, transactions abort cleanly. To rollback schema adjustments, apply reverse scripts located in `supabase/migrations/revert/`.
