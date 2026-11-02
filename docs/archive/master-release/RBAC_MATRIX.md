# 6. ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

## 1. Role Definitions
NexusOMS V5 implements five distinct enterprise roles scoped to individual tenants:
- **Owner:** Organization founder / Executive with absolute governance, billing, and membership management rights.
- **Admin:** System administrator with operational, configuration, and user management authority.
- **Manager:** Operational manager overseeing sales, procurement, fulfillment, and financial audits.
- **Warehouse:** Floor operator focused on picking, packing, inventory counting, and warehouse transfers.
- **Viewer:** Read-only auditor or customer support representative.

---

## 2. Granular Module Permission Matrix

| Module / Screen | Owner | Admin | Manager | Warehouse | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | Read/Write | Read/Write | Read/Write | Read Only | Read Only |
| **Orders (OMS)** | Full Control | Full Control | Full Control | View / Pack | View Only |
| **Order Cancellation** | Allowed | Allowed | Allowed | **DENIED** | **DENIED** |
| **Order Deletion** | **Allowed** | Allowed | **DENIED** | **DENIED** | **DENIED** |
| **Inventory 5-State** | Full Control | Full Control | Full Control | Full Control | View Only |
| **Integrity Audit Tool** | Execute | Execute | Execute | Execute | View Only |
| **Products & BOM** | Full Control | Full Control | Full Control | View Only | View Only |
| **Warehouses & Bins** | Full Control | Full Control | Full Control | Manage Bins | View Only |
| **Stock Transfers** | Full Control | Full Control | Full Control | Pick & Ship | View Only |
| **Purchase Orders** | Full Control | Full Control | Full Control | Receive Goods | View Only |
| **Wave Fulfillment** | Full Control | Full Control | Full Control | Full Control | View Only |
| **Returns & RMA** | Full Control | Full Control | Full Control | Inspect/Restock| View Only |
| **Double-Entry Ledger**| Full Control | Full Control | Full Control | **HIDDEN** | **HIDDEN** |
| **Fee Reconciliation** | Full Control | Full Control | Full Control | **HIDDEN** | **HIDDEN** |
| **Margin Circuit Breaker**| Full Control | Full Control | Full Control | **HIDDEN** | **HIDDEN** |
| **Audit Trail** | Full Control | Full Control | View Only | **HIDDEN** | **HIDDEN** |
| **Settings & RBAC** | Full Control | Full Control | **DENIED** | **HIDDEN** | **HIDDEN** |

---

## 3. Server-Side RPC Security Enforcement

```sql
-- Example role guard in cancel_order_atomic
SELECT m.role INTO v_role
  FROM public.tenant_memberships m
  WHERE m.user_id = auth.uid()
    AND m.tenant_id = p_tenant_id
    AND m.status = 'active'
    AND m.role IN ('manager', 'admin', 'owner')
  LIMIT 1;

IF v_role IS NULL THEN
  RAISE EXCEPTION 'Khong co quyen: chi Manager, Admin hoac Owner moi duoc phep huy don' 
  USING ERRCODE = '42501';
END IF;
```
