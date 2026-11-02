# 8. INVENTORY INTEGRITY & ATOMIC STOCK LOCK REPORT

## 1. 5-State Inventory Model
NexusOMS V5 models inventory using five precise physical and commercial states:
1. **Physical Stock (`physical_qty`):** Quantity physically located on warehouse shelves and bins.
2. **Reserved Stock (`reserved_qty`):** Quantity committed to active, unfulfilled customer orders.
3. **Available Stock (`available_qty`):** Saleable quantity pushed to e-commerce channels:
   $$\text{Available} = \text{Physical} - \text{Reserved}$$
4. **Unavailable Stock (`unavailable_qty`):** Defective, expired, quarantined, or damaged goods.
5. **Incoming Stock (`incoming_qty`):** Purchase orders in transit scheduled for receipt.

---

## 2. Race Condition Prevention via Atomic Locking

```mermaid
sequenceDiagram
    autonumber
    actor CustomerA as Buyer A (Shopee)
    actor CustomerB as Buyer B (TikTok)
    participant RPC as place_order_atomic (PostgreSQL)
    participant DB as Products Table (Row Lock)

    CustomerA->>RPC: Place Order (SKU-01, Qty: 1)
    CustomerB->>RPC: Place Order (SKU-01, Qty: 1)
    
    critical Row Locking
        RPC->>DB: SELECT stock FROM products WHERE id = 'SKU-01' FOR UPDATE
        Note over DB: Row locked for Transaction A.<br/>Transaction B waits in queue.
        RPC->>DB: Verify stock >= 1 (OK)
        RPC->>DB: Decrement stock, Increment reserved
        RPC-->>CustomerA: 201 Created (Order Confirmed)
    end

    critical Next Transaction Evaluates Updated Row
        Note over DB: Lock released to Transaction B
        RPC->>DB: SELECT stock FROM products WHERE id = 'SKU-01' FOR UPDATE
        RPC->>DB: Verify stock >= 1 (FAIL: Stock = 0)
        RPC-->>CustomerB: 400 Bad Request (Het hang ton kho)
    end
```

---

## 3. Inventory Verification Tooling
Integrated in V5 at **Tồn kho 5 trạng thái** via stored procedure `verify_inventory_consistency(p_tenant_id)`.
Scans for:
- Negative stock (`stock < 0` or `available_qty < 0`).
- Discrepancy between `physical_qty` and `reserved_qty + available_qty`.
- Inconsistencies between product master stock and sum of warehouse balances.
