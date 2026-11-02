# 11. ENTERPRISE DESIGN SYSTEM SPECIFICATION

## 1. Design Principles
1. **Clarity & Information Density:** Operational screens prioritize scannability with compact tabular typography and high-contrast numerical figures.
2. **Speed & Keyboard Efficiency:** Common operational flows (picking, barcode scanning, order approvals) support quick single-action shortcuts.
3. **Resilience & Feedback:** Destructive actions require explicit confirmation dialogs; asynchronous mutations provide instant optimistic UI and clear toast notifications.

---

## 2. Component Token Standards

### 2.1 Buttons
- **Primary Action (`.btn-primary`):** Deep Ocean Teal (`#1E647F`) with active scale-down (`active:scale-[0.98]`).
- **Growth / Accent (`.btn-aqua`):** Jade Aqua (`#27B4A0`) with emerald hover state.
- **Secondary Action (`.btn-secondary`):** Clean white surface with silver mist border (`#D9E3E8`).
- **Danger Action (`.btn-danger`):** Crimson rose (`#E11D48`) for order cancellation and deletion.

### 2.2 Status Badges
- **Success / Delivered / Balanced:** Emerald badge (`bg-emerald-100 text-emerald-800 border-emerald-200`).
- **Warning / Pending / Low Stock:** Amber badge (`bg-amber-100 text-amber-800 border-amber-200`).
- **Critical / Out of Stock / Unbalanced:** Rose badge (`bg-rose-100 text-rose-800 border-rose-200`).
- **Info / Shipped / Active:** Cerulean / Water Teal badge.
