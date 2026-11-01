import { formatCurrency, formatDate, formatDateTime } from './utils';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from './utils';
import type { Order, Product } from '@/types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}

const BOM = '\uFEFF';

export function exportOrdersToExcel(orders: Order[]): void {
  const headers = [
    'Ma don',
    'Khach hang',
    'Cong ty',
    'Ngay dat',
    'Trang thai',
    'Thanh toan',
    'Phuong thuc',
    'Tam tinh',
    'VAT',
    'Van chuyen',
    'Giam gia',
    'Tong cong',
  ];

  const rows = orders.map((o) => [
    o.order_number,
    o.customer?.name ?? 'Khach le',
    o.customer?.company ?? '',
    formatDate(o.placed_at),
    ORDER_STATUS_LABELS[o.status],
    PAYMENT_STATUS_LABELS[o.payment_status],
    o.payment_method ?? '',
    String(o.subtotal),
    String(o.tax),
    String(o.shipping),
    String(o.discount),
    String(o.total),
  ]);

  const csv = BOM + [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `don_hang_${timestamp()}.csv`);
}

export function exportProductsToExcel(products: Product[]): void {
  const headers = [
    'SKU',
    'Ten san pham',
    'Danh muc',
    'Gia ban (VND)',
    'Gia von (VND)',
    'Ton kho',
    'Muc dat lai',
    'Trang thai',
    'Mo ta',
  ];

  const rows = products.map((p) => [
    p.sku,
    p.name,
    p.category ?? '',
    String(p.price),
    String(p.cost),
    String(p.stock),
    String(p.reorder_level),
    p.status === 'active' ? 'Dang ban' : p.status === 'discontinued' ? 'Ngung ban' : 'Het hang',
    p.description ?? '',
  ]);

  const csv = BOM + [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `san_pham_${timestamp()}.csv`);
}

export function exportOrdersToPDF(orders: Order[]): void {
  const win = window.open('', '_blank');
  if (!win) return;

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Danh sach don hang</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .sub { font-size: 13px; color: #666; margin-bottom: 24px; }
  .summary { display: flex; gap: 32px; margin-bottom: 24px; }
  .summary div { font-size: 13px; }
  .summary strong { font-size: 18px; display: block; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f4f4f5; text-align: left; padding: 8px 10px; border-bottom: 2px solid #ddd; font-weight: 600; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .right { text-align: right; }
  .footer { margin-top: 24px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>Danh sach don hang</h1>
  <p class="sub">Ngon Ngu: Tieng Viet | Tien te: VND | Ngay xuat: ${formatDateTime(new Date().toISOString())}</p>
  <div class="summary">
    <div>Tong so don<strong>${orders.length}</strong></div>
    <div>Tong doanh thu<strong>${formatCurrency(totalRevenue)}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Ma don</th>
        <th>Khach hang</th>
        <th>Ngay dat</th>
        <th>Trang thai</th>
        <th>Thanh toan</th>
        <th class="right">Tong cong</th>
      </tr>
    </thead>
    <tbody>
      ${orders.map((o) => `
        <tr>
          <td>${o.order_number}</td>
          <td>${o.customer?.name ?? 'Khach le'}</td>
          <td>${formatDate(o.placed_at)}</td>
          <td>${ORDER_STATUS_LABELS[o.status]}</td>
          <td>${PAYMENT_STATUS_LABELS[o.payment_status]}</td>
          <td class="right">${formatCurrency(Number(o.total))}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <p class="footer">NexusOMS Enterprise v3.0 - Bao cao tu dong</p>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

export function exportProductsToPDF(products: Product[]): void {
  const win = window.open('', '_blank');
  if (!win) return;

  const totalValue = products.reduce((s, p) => s + Number(p.cost) * p.stock, 0);
  const totalStock = products.reduce((s, p) => s + p.stock, 0);

  const statusLabel = (s: string) =>
    s === 'active' ? 'Dang ban' : s === 'discontinued' ? 'Ngung ban' : 'Het hang';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Danh sach san pham</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .sub { font-size: 13px; color: #666; margin-bottom: 24px; }
  .summary { display: flex; gap: 32px; margin-bottom: 24px; }
  .summary div { font-size: 13px; }
  .summary strong { font-size: 18px; display: block; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f4f4f5; text-align: left; padding: 8px 10px; border-bottom: 2px solid #ddd; font-weight: 600; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .right { text-align: right; }
  .footer { margin-top: 24px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>Danh sach san pham</h1>
  <p class="sub">Ngon Ngu: Tieng Viet | Tien te: VND | Ngay xuat: ${formatDateTime(new Date().toISOString())}</p>
  <div class="summary">
    <div>Tong san pham<strong>${products.length}</strong></div>
    <div>Tong ton kho<strong>${totalStock.toLocaleString('vi-VN')}</strong></div>
    <div>Gia tri ton kho<strong>${formatCurrency(totalValue)}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Ten san pham</th>
        <th>Danh muc</th>
        <th class="right">Gia ban</th>
        <th class="right">Ton kho</th>
        <th>Trang thai</th>
      </tr>
    </thead>
    <tbody>
      ${products.map((p) => `
        <tr>
          <td>${p.sku}</td>
          <td>${p.name}</td>
          <td>${p.category ?? '—'}</td>
          <td class="right">${formatCurrency(Number(p.price))}</td>
          <td class="right">${p.stock}</td>
          <td>${statusLabel(p.status)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <p class="footer">NexusOMS Enterprise v3.0 - Bao cao tu dong</p>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}


export function exportMarketingCampaignsToExcel(campaigns: import('@/analytics/types').MarketingCampaignPerformance[]): void {
  const headers = [
    'Ma nhom shop (chua attribution campaign)',
    'Ten nhom shop',
    'Nen tang',
    'Kenh',
    'Gross Ads (VND)',
    'Ads credit (VND)',
    'Net Ads (VND)',
    'Luot hien thi',
    'Luot click',
    'CPC (VND)',
    'So don hang',
    'CPA (VND)',
    'Doanh thu net giu lai - chua attribution (VND)',
    'Net revenue / Net Ads',
    'Gia von COGS (VND)',
    'Loi nhuan sau Ads CM3 (VND)',
    'Danh gia',
    'Loai gan thuoc',
  ];

  const rows = campaigns.map((c) => [
    c.campaignId,
    c.name,
    c.platform,
    c.channel,
    String(c.adSpend),
    String(c.adsCredit || 0),
    String(c.netSpend ?? c.adSpend),
    String(c.impressions),
    String(c.clicks),
    String(c.cpc),
    String(c.conversions),
    String(Math.round(c.cpa)),
    String(c.attributedRevenue),
    (c.netSpend ?? c.adSpend) > 0 ? String(c.roas) : 'Chua du du lieu',
    String(c.cogs),
    String(c.cmAfterAds),
    c.status,
    c.attributionType,
  ]);

  const csv = BOM + [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `bao_cao_ads_roas_${timestamp()}.csv`);
}
