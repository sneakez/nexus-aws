# 5. TARGET OPERATIONAL WORKFLOWS — ROLE-BASED SOP

## 1. Warehouse Operations Team (WMS SOP)

### 1.1 Inbound Goods Receipt (PO Receiving)
1. Navigate to **Đơn mua hàng (Purchase Orders)**.
2. Select active PO in status `ordered` or `partial`.
3. Open **Nhận hàng vào kho (Goods Receipt)**.
4. Verify received quantities against physical packing slip.
5. Confirm receipt: System automatically updates physical inventory in the designated warehouse and logs transaction type `po_receive`.

### 1.2 Wave Picking & Scan-to-Pack
1. Navigate to **Wave Picking & SLA**.
2. Generate wave batch for pending orders filtered by carrier or delivery zone.
3. Pick goods across warehouse bins following optimized route.
4. Station packer scans product barcode: System validates barcode against wave items.
5. Print shipping label and hand over to carrier before SLA deadline.

---

## 2. Customer Care & Operations Team (OMS SOP)

### 2.1 Managing Order Changes & Customer Cancellation
1. Navigate to **Đơn hàng (Orders)**.
2. Locate order by order number or customer phone.
3. If order is in `pending` or `processing`, click **Hủy đơn (Cancel)**.
4. Input mandatory cancellation reason.
5. System invokes `cancel_order_atomic`: locks order, reverts stock reservation, updates status to `cancelled`, and records status audit log.

### 2.2 Processing Customer RMA / Return
1. Navigate to **Đổi trả / RMA (Returns)**.
2. Select original order and choose return type (`customer_rma` or `failed_delivery_rts`).
3. Upon physical arrival, inspect item condition:
   - **Intact / Saleable:** Execute restock to return items to `available` stock.
   - **Damaged / Defective:** Divert to `unavailable` quarantine inventory for supplier return.
4. Finalize refund amount and issue customer settlement.

---

## 3. Financial & Accounting Team (Ledger SOP)

### 3.1 Reviewing Balanced Double-Entry Journals
1. Navigate to **Sổ kép (General Ledger)**.
2. Inspect daily automatic journal postings:
   - Sales: Nợ TK 131 (Phải thu sàn) / Có TK 511 (Doanh thu)
   - Cost of Goods: Nợ TK 632 (Giá vốn) / Có TK 156 (Tồn kho)
   - Fee Deduction: Nợ TK 641 (Chi phí sàn) / Có TK 131
3. Review **Đối soát phí (Fee Reconciliation)** to compare marketplace settlement payouts against calculated commission rates.
4. Monitor **Margin Circuit Breaker** for negative gross profit alerts.
