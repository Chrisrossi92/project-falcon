// src/pages/Orders.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { Card } from "@/components/ui/Card.jsx";
import { fetchOrdersWithFilters } from "@/lib/api/orders";
import OrdersTablePagination from "@/components/orders/OrdersTablePagination";
import OrderDrawerContent from "@/components/orders/OrderDrawerContent"; // reuse inside inline row

const PAGE_SIZE = 50;
const ORDER_STATUSES = ["New","In Progress","In Review","Ready to Send","Delivered","Completed","On Hold","Cancelled"];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtMoney = (n) => (n == null ? "—" : Number(n).toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0}));

function useDebounce(v, delay=300){const [x,setX]=useState(v);useEffect(()=>{const t=setTimeout(()=>setX(v),delay);return()=>clearTimeout(t)},[v,delay]);return x}

/* =============== Compact + symmetric Filter Bar =============== */
function FilterBar({ filters, onChange, clients, appraisers }) {
  const [local, setLocal] = useState(filters);
  useEffect(()=>setLocal(filters),[filters]);

  const apply = () => onChange({ ...local, page: 0 });
  const clear = () => onChange({
    search:"", statusIn:[], clientId:null, appraiserId:null, from:"", to:"",
    activeOnly:true, page:0, pageSize:PAGE_SIZE, orderBy:"date_ordered", ascending:false, lazy:filters.lazy,
  });

  return (
    <Card className="p-4">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-4">
          <label className="block text-xs text-muted-foreground mb-1">Search</label>
          <input
            className="w-full border rounded px-2 py-1"
            placeholder="Order # / Title / Address"
            value={local.search}
            onChange={(e)=>setLocal(v=>({...v,search:e.target.value}))}
          />
        </div>

        <div className="col-span-6 lg:col-span-3">
          <label className="block text-xs text-muted-foreground mb-1">Client</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={local.clientId ?? ""}
            onChange={(e)=>setLocal(v=>({...v, clientId: e.target.value?Number(e.target.value):null}))}
          >
            <option value="">All</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="col-span-6 lg:col-span-3">
          <label className="block text-xs text-muted-foreground mb-1">Appraiser</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={local.appraiserId ?? ""}
            onChange={(e)=>setLocal(v=>({...v, appraiserId: e.target.value?Number(e.target.value):null}))}
          >
            <option value="">All</option>
            {appraisers.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>

        <div className="col-span-3 lg:col-span-1">
          <label className="block text-xs text-muted-foreground mb-1">From</label>
          <input type="date" className="w-full border rounded px-2 py-1" value={local.from ?? ""} onChange={e=>setLocal(v=>({...v,from:e.target.value}))}/>
        </div>
        <div className="col-span-3 lg:col-span-1">
          <label className="block text-xs text-muted-foreground mb-1">To</label>
          <input type="date" className="w-full border rounded px-2 py-1" value={local.to ?? ""} onChange={e=>setLocal(v=>({...v,to:e.target.value}))}/>
        </div>

        <div className="col-span-12">
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <div className="flex flex-wrap gap-2 border rounded px-2 py-2">
            {ORDER_STATUSES.map(s=>{
              const checked=local.statusIn.includes(s);
              return (
                <button key={s} type="button"
                  onClick={()=>setLocal(v=>{
                    const next=checked? v.statusIn.filter(x=>x!==s):[...v.statusIn,s];
                    return {...v,statusIn:next};
                  })}
                  className={`px-2 py-1 rounded border text-xs ${checked?"bg-black text-white border-black":"bg-white"}`}>
                  {s}
                </button>
              );
            })}
            <div className="ml-auto flex gap-2">
              <button className="px-2 py-1 text-xs border rounded" onClick={()=>setLocal(v=>({...v,statusIn:[]}))}>Clear</button>
              <button className="px-2 py-1 text-xs border rounded" onClick={()=>setLocal(v=>({...v,statusIn:ORDER_STATUSES}))}>All</button>
            </div>
          </div>
        </div>

        <div className="col-span-12 flex items-center gap-6 mt-1">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!local.activeOnly} onChange={e=>setLocal(v=>({...v,activeOnly:e.target.checked}))}/>
            Active only (exclude Completed)
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!local.lazy} onChange={e=>onChange({...local, lazy:e.target.checked, page:0})}/>
            Infinite scroll (lazy load)
          </label>

          <div className="ml-auto flex gap-2">
            <button className="border rounded px-3 py-1 text-sm" onClick={clear}>Clear</button>
            <button className="border rounded px-3 py-1 bg-black text-white text-sm" onClick={apply}>Apply</button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ========================== Page ========================== */
export default function OrdersPage(){
  const [clients,setClients]=useState([]);
  const [appraisers,setAppraisers]=useState([]);
  const [filters,setFilters]=useState({
    search:"", statusIn:[], clientId:null, appraiserId:null, from:"", to:"",
    activeOnly:true, page:0, pageSize:PAGE_SIZE, orderBy:"date_ordered", ascending:false, lazy:false,
  });
  const debouncedSearch=useDebounce(filters.search,300);

  const [rows,setRows]=useState([]);
  const [count,setCount]=useState(0);
  const [loading,setLoading]=useState(true);
  const [expandedId,setExpandedId]=useState(null); // inline expansion

  const sentinelRef=useRef(null);
  const totalPages=useMemo(()=>Math.max(1,Math.ceil((count||0)/(filters.pageSize||PAGE_SIZE))),[count,filters.pageSize]);

  useEffect(()=>{(async()=>{
    const [{data:cl},{data:aps}]=await Promise.all([
      supabase.from("clients").select("id,name").order("name",{ascending:true}),
      supabase.from("users").select("id,full_name").order("full_name",{ascending:true}),
    ]);
    setClients(cl??[]); setAppraisers(aps??[]);
  })()},[]);

  useEffect(()=>{(async()=>{
    setLoading(true);
    const {rows:data,count:c}=await fetchOrdersWithFilters({...filters, search:debouncedSearch});
    setCount(c||0);
    if(filters.lazy && filters.page>0){
      setRows(prev=>[...(prev||[]), ...(data||[])]);
    }else{
      setRows(data||[]);
    }
    setLoading(false);
  })()},[
    debouncedSearch, filters.statusIn.join("|"), filters.clientId, filters.appraiserId,
    filters.from, filters.to, filters.activeOnly, filters.page, filters.pageSize,
    filters.orderBy, filters.ascending, filters.lazy
  ]);

  useEffect(()=>{
    if(!filters.lazy) return;
    if(filters.page+1>=totalPages) return;
    const el=sentinelRef.current; if(!el) return;
    const obs=new IntersectionObserver((ents)=>ents.forEach(e=>e.isIntersecting && setFilters(f=>({...f,page:f.page+1}))));
    obs.observe(el); return ()=>obs.disconnect();
  },[filters.lazy,filters.page,totalPages]);

  const onApplyFilters=(f)=>setFilters(prev=>({...prev,...f}));
  const goToPage=(p)=>setFilters(f=>({...f,page:Math.max(0,Math.min(p-1,totalPages-1))}));

  const toggleExpand=(id)=>setExpandedId(x=>x===id?null:id);

  return (
    <div className="p-4 space-y-4">
      <FilterBar filters={filters} onChange={onApplyFilters} clients={clients} appraisers={appraisers} />

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b bg-slate-50">
            <tr>
              <th className="text-left py-2 pr-2 w-[110px]">Order #</th>
              <th className="text-left py-2 pr-2">Client / Address / Type</th>
              <th className="text-left py-2 pr-2 w-[170px]">Appraiser</th>
              <th className="text-left py-2 pr-2 w-[150px]">Status</th>
              <th className="text-right py-2 pr-2 w-[100px]">Due</th>
              <th className="text-right py-2 pl-2 w-[100px]">Fee</th>
              <th className="text-right py-2 pl-2 w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(Math.min(PAGE_SIZE,12))].map((_,i)=>(
                  <tr key={i} className="border-b">
                    <td className="py-2"><div className="h-3 bg-muted rounded w-16"/></td>
                    <td className="py-2"><div className="h-3 bg-muted rounded w-64 mb-1"/><div className="h-3 bg-muted rounded w-40"/></td>
                    <td className="py-2"><div className="h-3 bg-muted rounded w-24"/></td>
                    <td className="py-2"><div className="h-3 bg-muted rounded w-20"/></td>
                    <td className="py-2 text-right"><div className="h-3 bg-muted rounded w-12 ml-auto"/></td>
                    <td className="py-2 text-right"><div className="h-3 bg-muted rounded w-16 ml-auto"/></td>
                    <td></td>
                  </tr>
                ))
              : rows.map((o)=>(
                  <React.Fragment key={o.id}>
                    <tr className="border-b hover:bg-slate-50">
                      <td className="py-2 pr-2 w-[110px]">
                        <button className="text-blue-600 hover:underline" onClick={()=>toggleExpand(o.id)}>
                          {o.order_no ?? "—"}
                        </button>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="font-medium">{o.client_name ?? "—"}</div>
                        <div className="text-muted-foreground">{o.display_subtitle ?? "—"}</div>
                      </td>
                      <td className="py-2 pr-2 w-[170px]">
                        <div className="text-sm">{o.appraiser_name ?? "—"}</div>
                      </td>
                      <td className="py-2 pr-2 w-[150px]">{o.status ?? "—"}</td>
                      <td className="py-2 pr-2 text-right w-[100px]">{fmtDate(o.due_date)}</td>
                      <td className="py-2 pl-2 text-right w-[100px]">{fmtMoney(o.fee_amount)}</td>
                      <td className="py-2 pl-2 text-right w-[40px]">
                        <button className="text-blue-600 hover:underline" onClick={()=>toggleExpand(o.id)}>Open</button>
                      </td>
                    </tr>

                    {expandedId===o.id && (
                      <tr className="border-b bg-white">
                        <td colSpan={7} className="p-0">
                          <div className="p-4">
                            <OrderDrawerContent data={o} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
            }
          </tbody>
        </table>

        {/* Bottom footer = results + pagination (no gap above) */}
        {!filters.lazy && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
            <div className="text-sm text-muted-foreground">
              {count.toLocaleString()} result{count===1?"":"s"}
            </div>
            <OrdersTablePagination currentPage={filters.page+1} totalPages={totalPages} goToPage={(p)=>goToPage(p)} />
          </div>
        )}
        {/* Lazy sentinel */}
        {filters.lazy && filters.page + 1 < totalPages && <div ref={sentinelRef} className="h-8 w-full" />}
      </Card>
    </div>
  );
}
































