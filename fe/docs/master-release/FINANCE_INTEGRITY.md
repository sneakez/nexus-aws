# 9. FINANCIAL INTEGRITY & DOUBLE-ENTRY ACCOUNTING REPORT

## 1. Double-Entry Accounting Engine
NexusOMS V5 enforces strict double-entry bookkeeping principles for all inventory and sales operations.

### Standard Accounting Entries
1. **Revenue Recognition upon Delivery:**
   - **Nợ TK 131:** Phải thu sàn TMĐT (Shopee/TikTok/Lazada)
   - **Nợ TK 641:** Chi phí hoa hồng và phí thanh toán sàn
   - **Có TK 511:** Doanh thu bán lẻ
2. **Cost of Goods Handover:**
   - **Nợ TK 632:** Giá vốn hàng bán
   - **Có TK 156:** Hàng hóa kho vận
3. **Goods Inbound Receipt (PO):**
   - **Nợ TK 156:** Hàng hóa kho
   - **Có TK 331:** Phải trả nhà cung cấp

---

## 2. Strict Balance Enforcement
In `post_journal_entry_atomic`:
```sql
IF ABS(v_total_debit - v_total_credit) > 0.001 THEN
  RAISE EXCEPTION 'But toan khong can doi: Tong No (%) khac Tong Co (%)', 
    v_total_debit, v_total_credit 
  USING ERRCODE = '23514';
END IF;
```

---

## 3. Margin Circuit Breaker
The Margin Circuit Breaker detects negative net contribution margins resulting from stacked promotional vouchers or unexpectedly high carrier volumetric fees.
- **Threshold:** Gross Margin $% < 0%$
- **Action:** Triggers circuit breaker event, sets order to review hold, and dispatches an alert to finance managers.
