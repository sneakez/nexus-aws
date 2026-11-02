import { operationalInsights } from '@/analytics/operations';
import { omsStore as mockStore } from '@/stores/omsStore';
export function InventoryObservations() {
  const observations=operationalInsights(mockStore.getSnapshot(),mockStore.getOrders(),mockStore.getInventory5State());
  return <details className="text-xs border rounded-lg p-3"><summary className="cursor-pointer font-semibold">Cảnh báo theo lịch sử bán và tồn kho</summary>
    <p>Ngưỡng chưa bán {observations.config.slow_days} ngày; kỳ quan sát {observations.config.history_days} ngày. Chưa đủ lịch sử không kết luận chậm bán. Đổi ngưỡng ở Cấu hình.</p>
    {observations.products.map(p=><p className="mt-2" key={p.productId}><a className="text-sky-700 underline" href="?page=skuEconomics">{p.sku}</a> · tồn khả dụng {p.available} · {p.sufficient?(p.slow?'Chưa có đơn giao trong ngưỡng':'Có đơn giao trong ngưỡng'):`Chưa đủ lịch sử (${p.historyDays} ngày)`} · {p.units} sản phẩm giao trong cửa sổ</p>)}
    <p className="mt-2">Nguồn: đơn đã giao và tồn kho trong dữ liệu demo; không phải dự báo nhu cầu.</p>
  </details>;
}
