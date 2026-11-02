# 2. NEXUSOMS V5 SYSTEM ARCHITECTURE SPECIFICATION

## 1. High-Level System Architecture

NexusOMS V5 operates as a modern cloud-native, distributed multi-tenant Order Management and Warehouse Management platform.

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (React 18 + Vite + TypeScript)"]
        PublicWeb["Public Marketing Website & Sandbox"]
        AuthLifecycle["Auth & Onboarding Lifecycle"]
        OMSApp["Authenticated Workspace (/app)"]
    end

    subgraph RouterEngine ["Lightweight Client Router & State Engine"]
        Router["Client Path Dispatcher (window.history)"]
        AuthContext["AuthProvider & Active Tenant Context"]
        PermRegistry["Action-Level Permission Registry"]
    end

    subgraph ApiGateway ["Supabase API & Realtime Gateway"]
        PostgREST["PostgREST RESTful Endpoint"]
        RealtimeWS["Supabase Realtime Engine (WebSockets)"]
        SupabaseAuth["GoTrue Authentication Engine"]
    end

    subgraph DatabaseLayer ["PostgreSQL 15 Enterprise Database"]
        RLS["Row-Level Security (Tenant Scoping)"]
        AtomicRPC["Atomic RPC Transactions (SECURITY DEFINER)"]
        AuditLedger["Append-Only Audit & Stock Ledger (SHA-256)"]
        DoubleEntry["Double-Entry Balanced Journal Engine"]
    end

    ClientLayer --> RouterEngine
    RouterEngine --> ApiGateway
    ApiGateway --> DatabaseLayer
```

---

## 2. Core Architectural Principles

### 2.1 Database-Level Multi-Tenancy (Row-Level Security)
Every business table contains a `tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT cascades`.
RLS policies guarantee that all queries, inserts, updates, and deletes are scoped strictly to the calling user's active tenant memberships:

```sql
CREATE POLICY tenant_isolation_policy ON public.orders
FOR ALL TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_memberships 
  WHERE user_id = auth.uid() AND status = 'active'
))
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.tenant_memberships 
  WHERE user_id = auth.uid() AND status = 'active'
));
```

### 2.2 Atomic Server-Side Transactions
All state mutations affecting physical goods or financial journals bypass client REST mutations and execute via `SECURITY DEFINER` stored procedures:
- `place_order_atomic(p_tenant_id, p_customer_id, p_channel, p_items, p_idempotency_key, ...)`
- `cancel_order_atomic(p_tenant_id, p_order_id, p_reason)`
- `delete_order_atomic(p_tenant_id, p_order_id)`
- `process_return_restock_atomic(p_tenant_id, p_return_id, p_restock_items)`
- `post_journal_entry_atomic(p_tenant_id, p_entry_number, p_event_source, p_lines, ...)`
- `verify_inventory_consistency(p_tenant_id)`

---

## 3. Data Tier Schema Overview

```mermaid
erDiagram
    TENANTS ||--o{ TENANT_MEMBERSHIPS : has
    TENANTS ||--o{ ORDERS : owns
    TENANTS ||--o{ PRODUCTS : catalogs
    TENANTS ||--o{ WAREHOUSES : operates
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ ORDER_STATUS_LOG : records
    PRODUCTS ||--o{ INVENTORY_ITEMS : tracked_at
    WAREHOUSES ||--o{ INVENTORY_ITEMS : stores
    ORDERS ||--o{ JOURNAL_ENTRIES : triggers
    JOURNAL_ENTRIES ||--o{ JOURNAL_LINES : balances
```

---

## 4. State Machine & Lifecycle Transitions

### 4.1 Order State Machine
`pending` → `processing` (Stock Reserved) → `picking` → `packing` → `shipped` (Physical Decremented) → `delivered` → `completed` (Journal Posted).
Alternative terminal paths: `cancelled` (Stock Restored via Atomic RPC) or `returned` (RMA Inspection).

### 4.2 Financial Accounting State Machine
All accounting events trigger a balanced entry in `journal_entries` and `journal_lines`. The constraint requires:
$$\sum \text{Debit} = \sum \text{Credit}$$
Deviation $> 0.001$ raises SQLSTATE `23514` (check violation).
