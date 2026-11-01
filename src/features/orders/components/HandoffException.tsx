import { useState } from 'react';
import { omsStore as mockStore } from '@/stores/omsStore';
import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';
export function HandoffException({orderId}:{orderId:string}) {
  const {activeRole}=useAuth(),toast=useToast();
  const state=mockStore.getSnapshot(),record=state.handoffAssignments?.[`monitor:${orderId}`];
  const [note,setNote]=useState(record?.note || ''),[due,setDue]=useState(record?.due_at?.slice(0,16)||new Date(Date.now()+mockStore.getOperationsConfig().exception_hours*3600000).toISOString().slice(0,16));
  const manage=hasPermission(activeRole,'orders:manage'),can=manage||activeRole==='warehouse';
  if(!can&&!record)return null;
  return <details className="border rounded-lg p-3 text-xs space-y-2"><summary className="cursor-pointer font-semibold">Ngoại lệ / người phụ trách / hạn xử lý</summary>
    {record&&<p>{record.status} · hạn UTC {record.due_at} · phát hiện {record.discovered_by} · xử lý {record.resolved_by||'chưa có'} · xác nhận {record.confirmed_by||'chưa có'} · phụ trách {record.assignee_id||'Nhóm Manager'}</p>}
    {can&&<><label className="block">Bằng chứng ngoại lệ<input aria-label="Bằng chứng ngoại lệ" className="input w-full" value={note} onChange={e=>setNote(e.target.value)}/></label><label className="block">Hạn xử lý (UTC)<input aria-label="Hạn ngoại lệ UTC" type="datetime-local" className="input" value={due} onChange={e=>setDue(e.target.value)}/></label>
    {manage&&<label className="block">Người xử lý<select className="input" aria-label="Người xử lý ngoại lệ" value={record?.assignee_id||''} onChange={e=>{const r=mockStore.assignHandoff(`monitor:${orderId}`,orderId,e.target.value||null);toast(r.success?'Đã phân công trong phạm vi':r.error||'Không lưu được',r.success?'success':'error');}}><option value="">Nhóm Manager</option>{state.memberships.filter(m=>m.role==='manager'&&m.status==='active'&&m.tenant_id===state.activeTenantId).map(m=><option key={m.id} value={m.user_id}>{m.user_id}</option>)}</select></label>}
    <div className="flex flex-wrap gap-2">{(['open',...(manage?['processing','resolved','confirmed']:[])] as const).map(status=><button key={status} className="btn-secondary" onClick={()=>{const r=mockStore.recordHandoffException(orderId,{note,dueAt:`${due}:00Z`,status:status as 'open'|'processing'|'resolved'|'confirmed'});toast(r.success?'Đã lưu điểm bàn giao':r.error||'Không lưu được',r.success?'success':'error');}}>{({open:'Ghi phát hiện',processing:'Tiếp nhận xử lý',resolved:'Ghi kết quả xử lý',confirmed:'Xác nhận kết quả'} as Record<string,string>)[status]}</button>)}</div></>}
    {record?.history.map((h,i)=><p key={i}>{h.at} · {h.actor_id} · {h.action||'phân công'} · {h.note||h.assignee_id}</p>)}
  </details>;
}
