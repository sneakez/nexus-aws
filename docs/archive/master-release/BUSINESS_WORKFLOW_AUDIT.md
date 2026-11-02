# 3. BUSINESS WORKFLOW AUDIT REPORT

## 1. Scope of Audit
This audit examines the end-to-end commercial workflows of NexusOMS V5 across seven critical operational tracks:
1. Omnichannel Order Synchronization & Deduplication
2. Real-Time Inventory Reservation & Allocation
3. Warehouse Wave Picking & Scan-to-Pack Fulfillment
4. Inter-Warehouse Transfers & In-Transit Tracking
5. Procurement & Goods Receipt Verification
6. Customer Returns (RMA) & Restock Inspection
7. Financial Settlement & Marketplace Fee Reconciliation

---

## 2. Detailed Workflow Findings

### 2.1 Order Ingestion & Deduplication
- **Challenge:** Webhook retries from marketplace platforms (Shopee, TikTok Shop) frequently resend identical payloads upon network timeouts.
- **Audit Finding:** Previously, orders lacked an idempotency guarantee at the database level.
- **V5 Resolution:** Introduced `orders.idempotency_key` with unique index `orders_tenant_idempotency_idx` conditioned on `WHERE idempotency_key IS NOT NULL`. Duplicate webhook payloads now return the existing order record instantly with status `200 OK` without executing secondary stock reservations.

### 2.2 Inventory Reservation vs. Available Stock
- **Challenge:** Selling inventory displayed on multiple channels without physical over-commitment.
- **Audit Finding:** The 5-state stock model was previously computed on the fly by frontend components.
- **V5 Resolution:** Schema enforces physical consistency:
  $$\text{Available Stock} = \text{Physical Stock} - \text{Reserved Stock}$$
  During order creation, `place_order_atomic` locks the target SKU rows using `FOR UPDATE` and increments `reserved_qty` while decrementing `available_qty`. Available stock is strictly guarded by `CHECK (stock >= 0)`.

### 2.3 Order Cancellation & Double-Restock Prevention
- **Challenge:** Orders cancelled twice via multiple browser tabs or concurrent API calls would increment physical stock multiple times.
- **Audit Finding:** V3 allowed multiple cancellations of the same order record.
- **V5 Resolution:** `cancel_order_atomic` checks `orders.stock_restored = true`. If true, the procedure exits immediately with `already_cancelled = true`, safeguarding inventory counts against accidental duplication.

---

## 3. Operational Integrity Matrix

| Business Workflow | Vulnerability in Baseline | Hardening Applied in V5 | Verification Method |
| :--- | :--- | :--- | :--- |
| **Order Placement** | Concurrency race condition | `SELECT ... FOR UPDATE` in PostgreSQL | Concurrent Vitest Simulation |
| **Webhook Retry** | Duplicate orders created | Unique index on `(tenant_id, idempotency_key)` | Duplicate payload injection test |
| **Cancellation** | Double stock restoration | `orders.stock_restored` boolean guard | Double-cancel Vitest assertion |
| **Double-Entry** | Unbalanced journal entries | Server-side Debit == Credit check ($< 0.001$) | Unbalanced payload test |
| **Audit Records** | Logs editable by admin | REVOKE UPDATE/DELETE on `audit_logs` | Database permission tests |
