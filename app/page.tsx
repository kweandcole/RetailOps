'use client';

import { useEffect, useState } from 'react';

type Outlet = { outletId:string; retailer:string; branchName:string; priority:string };
type SKU = { sku:string; productName:string };
type Dashboard = { stats:Record<string,number>; outlets:Outlet[]; skus:SKU[]; byOutlet:Array<{branchName:string;retailer:string;visits7d:number;sampling30d:number;outOfStock:number}>; recentSampling:Array<{date:string;branchName?:string;heroSku:string;peopleTasted:number;purchases:number;conversion:number;feedback:string}> };

const pct=(n:number)=>`${(n*100).toFixed(1)}%`;

export default function Home() {
  const [data,setData]=useState<Dashboard|null>(null);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const [form,setForm]=useState({outletId:'',merchandiser:'',heroSku:'',peopleApproached:'',peopleTasted:'',purchases:'',preferredSku:'',feedback:'',objections:''});

  const load=()=>fetch('/api/dashboard').then(r=>r.json()).then(d=>{if(!d.ok) throw new Error(d.error); setData(d); setError('');}).catch(e=>setError(e.message));
  useEffect(()=>{load()},[]);

  async function submit(e:React.FormEvent){
    e.preventDefault(); setSaving(true); setMessage('');
    try { const res=await fetch('/api/sampling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,channel:data?.outlets.find(o=>o.outletId===form.outletId)?.retailer,peopleApproached:Number(form.peopleApproached||0),peopleTasted:Number(form.peopleTasted||0),purchases:Number(form.purchases||0),objections:form.objections.split(',').map(x=>x.trim()).filter(Boolean)})}); const d=await res.json(); if(!d.ok) throw new Error(d.error); setMessage(`Saved visit ${d.visitId}`); setForm({...form,peopleApproached:'',peopleTasted:'',purchases:'',feedback:'',objections:''}); load(); } catch(e){setMessage(e instanceof Error?e.message:'Save failed')} finally{setSaving(false)}
  }

  const s=data?.stats;
  return <main className="shell">
    <header className="topbar"><div><div className="eyebrow">KWE & COLE</div><h1>RetailOps</h1><p>Field execution, sampling and store performance.</p></div><div className="status"><span className={data?'dot live':'dot'} />{data?'Connected':'Connecting'}</div></header>
    {error && <div className="alert">{error}<button onClick={load}>Retry</button></div>}
    <section className="cards">{[
      ['Active outlets',s?.activeOutlets??0],['Visits · 7 days',s?.visits7d??0],['Sampling · 30 days',s?.sampling30d??0],['Taste rate',s?pct(s.tasteRate):'—'],['Conversion',s?pct(s.conversion):'—'],['Open reorders',s?.openReorders??0],['Out of stock',s?.outOfStocks??0]
    ].map(([label,value])=><div className="card" key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</section>

    <section className="grid">
      <div className="panel"><div className="panelhead"><div><h2>Log a sampling visit</h2><p>Designed for quick mobile entry in-store.</p></div></div>
        <form onSubmit={submit} className="form">
          <label>Store<select required value={form.outletId} onChange={e=>setForm({...form,outletId:e.target.value})}><option value="">Select store</option>{data?.outlets.map(o=><option key={o.outletId} value={o.outletId}>{o.retailer} · {o.branchName}</option>)}</select></label>
          <label>Merchandiser<input required value={form.merchandiser} onChange={e=>setForm({...form,merchandiser:e.target.value})} placeholder="Name"/></label>
          <label>Hero SKU<select required value={form.heroSku} onChange={e=>setForm({...form,heroSku:e.target.value})}><option value="">Select SKU</option>{data?.skus.map(s=><option key={s.sku} value={s.sku}>{s.productName}</option>)}</select></label>
          <div className="three"><label>Approached<input type="number" min="0" value={form.peopleApproached} onChange={e=>setForm({...form,peopleApproached:e.target.value})}/></label><label>Tasted<input type="number" min="0" value={form.peopleTasted} onChange={e=>setForm({...form,peopleTasted:e.target.value})}/></label><label>Purchased<input type="number" min="0" value={form.purchases} onChange={e=>setForm({...form,purchases:e.target.value})}/></label></div>
          <label>Preferred SKU<input value={form.preferredSku} onChange={e=>setForm({...form,preferredSku:e.target.value})} placeholder="What customers preferred"/></label>
          <label>Objections<input value={form.objections} onChange={e=>setForm({...form,objections:e.target.value})} placeholder="e.g. too spicy, price, unfamiliar"/></label>
          <label>Customer feedback<textarea value={form.feedback} onChange={e=>setForm({...form,feedback:e.target.value})} rows={3} placeholder="What did customers say?"/></label>
          <button className="primary" disabled={saving}>{saving?'Saving…':'Save sampling visit'}</button>{message&&<div className="message">{message}</div>}
        </form>
      </div>
      <div className="panel"><div className="panelhead"><div><h2>Store pulse</h2><p>Recent activity needing attention.</p></div></div><div className="table">{data?.byOutlet.map(o=><div className="row" key={o.branchName}><div><strong>{o.branchName}</strong><small>{o.retailer}</small></div><span>{o.visits7d} visits</span><span>{o.sampling30d} samples</span><span className={o.outOfStock?'bad':''}>{o.outOfStock} OOS</span></div>)}{!data?.byOutlet.length&&<div className="empty">No recent activity yet.</div>}</div></div>
    </section>
  </main>;
}
