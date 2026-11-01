import { useState } from 'react';
import { mockStore } from '@/mock/store';
import { useToast } from '@/components/ui/Toast';
import type { OperationsConfig } from '@/mock/finance';
export function OperationsThresholds() {
  const [config,setConfig]=useState(mockStore.getOperationsConfig()), toast=useToast();
  const fields: Array<[keyof OperationsConfig,string]>=[['slow_days','Ngày chưa bán để cảnh báo'],['concentration_percent','Tỷ trọng doanh thu net kênh (%)'],['sla_warning_hours','Sắp hạn SLA trong (giờ)'],['history_days','Kỳ lịch sử quan sát (ngày)'],['exception_hours','Hạn xử lý ngoại lệ mặc định (giờ)']];
  return <details className="card p-4 text-sm space-y-3"><summary className="font-semibold cursor-pointer">Ngưỡng vận hành mô phỏng</summary><p className="text-xs text-slate-500">Ngưỡng do người dùng chọn; không phải chuẩn sàn hoặc quy định bắt buộc. Thiếu lịch sử không được coi là hàng chậm bán.</p><div className="grid grid-cols-2 gap-3">{fields.map(([key,label])=><label key={key}>{label}<input aria-label={label} className="input w-full" type="number" min="1" value={config[key]} onChange={e=>setConfig({...config,[key]:Number(e.target.value)})}/></label>)}</div><button className="btn-secondary" onClick={()=>{const r=mockStore.saveOperationsConfig(config);toast(r.success?'Đã lưu ngưỡng mô phỏng':r.error||'Không lưu được',r.success?'success':'error');}}>Lưu ngưỡng vận hành</button></details>;
}
