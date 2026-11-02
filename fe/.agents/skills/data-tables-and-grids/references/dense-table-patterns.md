# Dense Data Table & Grid Patterns

## 1. Table Visual Grammar
- Row dividers over heavy outer borders (`divide-y divide-[#E1E3E5]`).
- Table Header: Compact uppercase labels `text-[11px] font-bold text-[#6D7175] uppercase tracking-wider`, subtle background `bg-[#F1F2F3]/60`.
- Alignment: Left for text/names, center for statuses/badges, right for numbers/currency/dates.
- Rows: Padding `py-3 px-3.5`, quiet hover `hover:bg-[#F6F6F7]`, selected state `bg-teal-50/40 border-l-2 border-l-[#1E647F]`.

## 2. Numeric & Financial Alignment
- Digits must use `font-mono tabular-nums`.
- Negative numbers (discounts, refunds, losses): `text-rose-700 font-semibold` with explicit minus `-45.000 ₫`.
- Positive contribution margins: `text-emerald-700 font-bold`.
- Timestamps: `text-xs text-[#6D7175] font-mono`.

## 3. Horizontal Scroll & Overflow Containment
- Wrap in container with `rounded-xl border border-[#E1E3E5] bg-white overflow-hidden shadow-xs`.
- Table element inside `<div className="overflow-x-auto">` with `min-w-[800px]`.
- Sticky first column (Mã đơn, SKU) when table width exceeds 7 columns: `sticky left-0 z-10 bg-white group-hover:bg-[#F6F6F7]`.

## 4. Progressive Disclosure (Table vs Side Drawer)
- Table row holds only the 5–7 fields needed to take immediate action.
- Side drawer holds full JSON details, audit log, customer notes, and item-level cost waterfall.
