# 16. UI/UX ERGONOMIC REVIEW & OPERATIONAL USABILITY REPORT

## 1. Evaluation Methodology
Evaluation conducted against industrial warehouse and e-commerce operation standards:
1. **Desktop / Warehouse Station Usability (1920x1080 / 1440x900):** Visual density, barcode scan responsiveness, contrast under warehouse lighting.
2. **Mobile / Tablet Floor Usability (768px / 375px):** Responsive navigation drawers, touch targets ($> 44\times 44\text{px}$), horizontal table scroll protection.
3. **Accessibility (WCAG 2.1 AA/AAA):** Text contrast against background surfaces, aria attributes, focus outlines.

---

## 2. Review Findings & Implemented Improvements

| Interface Area | Finding | UX Refinement in V5 |
| :--- | :--- | :--- |
| **Topbar & Search** | Global search placeholder was generic | Contextual placeholder per page (e.g. "Tìm theo mã đơn hoặc SĐT...") |
| **Sidebar Navigation**| Warehouse staff saw inaccessible financial links | Filtered out `ledger`, `settings`, `marginControl` for warehouse role |
| **Order Cards** | Multi-item orders required manual modal opens | Expandable accordion rows showing items, quantities, and cost inline |
| **Stock Table** | Single generic stock count | 5 explicit columns for Physical, Reserved, Available, Unavailable, Incoming |
| **Empty States** | Blank white spaces on empty search results | Dedicated illustrated `EmptyState` with actionable reset filters |
| **Action Confirmation**| Sensitive deletes had simple alert dialogs | Non-blocking accessible modal with destructive visual hierarchy |
