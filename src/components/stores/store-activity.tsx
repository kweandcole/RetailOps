'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import VisitEvidenceSummary from '@/components/visits/visit-evidence-summary';

type StoreActivityProps = { outletId: string; retailer: string; branchName: string };

export default function StoreActivity({ outletId, retailer, branchName }: StoreActivityProps) {
  const [visits, setVisits] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [expiry, setExpiry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.allSettled([
      getDocs(query(collection(getFirebaseDb(), 'visits'), where('outletId', '==', outletId))),
      getDocs(query(collection(getFirebaseDb(), 'orders'), where('outletId', '==', outletId))),
      getDocs(query(collection(getFirebaseDb(), 'stock'), where('outletId', '==', outletId))),
      getDocs(query(collection(getFirebaseDb(), 'expiry'), where('outletId', '==', outletId))),
    ]).then((results) => {
      if (!mounted) return;

      const [visitResult, orderResult, stockResult, expiryResult] = results;
      const visitSnap = visitResult.status === 'fulfilled' ? visitResult.value : null;
      const orderSnap = orderResult.status === 'fulfilled' ? orderResult.value : null;
      const stockSnap = stockResult.status === 'fulfilled' ? stockResult.value : null;
      const expirySnap = expiryResult.status === 'fulfilled' ? expiryResult.value : null;

      if (visitSnap) {
        const loadedVisits: Array<Record<string, any>> = visitSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
        loadedVisits.sort((a, b) => (b.createdAt?.toDate?.()?.getTime?.() || b.startedAt?.toDate?.()?.getTime?.() || 0) - (a.createdAt?.toDate?.()?.getTime?.() || a.startedAt?.toDate?.()?.getTime?.() || 0));
        setVisits(loadedVisits);
      }
      if (orderSnap) setOrders(orderSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) })));
      if (stockSnap) setStock(stockSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) })));
      if (expirySnap) setExpiry(expirySnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) })));
    }).catch(() => {
      if (mounted) setLoading(false);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [outletId]);

  if (loading) return <div style={styles.panel}><strong>Store activity</strong><p style={styles.muted}>Loading activity…</p></div>;

  const samplingVisits = visits.filter((v) => v.visitType === 'SAMPLING_ONLY' || v.sampling?.conducted);
  const totalOrderValue = orders.reduce((sum, order) => sum + Number(order.totalValue || order.orderValue || 0), 0);
  const latestVisit = visits[0];

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div><span style={styles.eyebrow}>Store activity</span><h3 style={styles.title}>{retailer} · {branchName}</h3></div>
        <span style={styles.count}>{visits.length} visits</span>
      </div>
      <div style={styles.metrics}>
        <Metric label="Visits" value={String(visits.length)} />
        <Metric label="Sampling" value={String(samplingVisits.length)} />
        <Metric label="Orders" value={String(orders.length)} />
        <Metric label="Order value" value={`KSh ${totalOrderValue.toLocaleString()}`} />
      </div>
      {latestVisit && <div style={styles.latest}>
        <span style={styles.eyebrow}>Latest visit</span>
        <strong>{formatDate(latestVisit.createdAt || latestVisit.startedAt)}</strong>
        <span>{latestVisit.visitType === 'SAMPLING_ONLY' ? 'Sampling' : 'Normal visit'} · {latestVisit.status || '—'} · {latestVisit.repName || 'Field rep'}</span>
      </div>}
      <div style={styles.section}>
        <span style={styles.eyebrow}>Current stock</span>
        {stock.length === 0 ? <p style={styles.muted}>No stock records yet.</p> : <div style={styles.list}>{stock.map((item) => <div key={item.id} style={styles.row}><span>{item.productName || item.sku}</span><strong>{Number(item.shelfStock || 0) + Number(item.backStock || 0)} bottles</strong></div>)}</div>}
      </div>
      <div style={styles.section}>
        <span style={styles.eyebrow}>Expiry issues</span>
        {expiry.length === 0 ? <p style={styles.muted}>No expiry records yet.</p> : <div style={styles.list}>{expiry.map((item) => <div key={item.id} style={styles.row}><span>{item.productName || item.sku}</span><strong>{item.hasExpiryConcern ? String(item.quantity || 0) + ' · ' + (item.expiryDate || 'date not recorded') : 'No concern'}</strong></div>)}</div>}
      </div>
      <div style={styles.section}>
        <span style={styles.eyebrow}>Visit history</span>
        {visits.length === 0 ? <p style={styles.muted}>No visits recorded yet.</p> : <div style={styles.list}>{visits.slice(0, 10).map((visit) => <div key={visit.id} style={styles.visitCard}>
          <div style={styles.visitHead}><strong>{formatDate(visit.createdAt || visit.startedAt)}</strong><span style={visit.visitType === 'SAMPLING_ONLY' ? styles.sampling : styles.normal}>{visit.visitType === 'SAMPLING_ONLY' ? 'SAMPLING' : 'NORMAL'}</span></div>
          <span style={styles.muted}>{visit.repName || 'Field rep'} · {visit.status || '—'}{visit.durationMinutes != null ? ` · ${visit.durationMinutes} min` : ''}</span>
          {visit.notes && <p style={styles.text}>{visit.notes}</p>}
          {visit.sampling?.conducted && <div style={styles.detailBox}><strong>Sampling</strong><span>{Number(visit.sampling.customersSampled || 0)} sampled · {Number(visit.sampling.bottlesSold || 0)} sold</span>{visit.sampling.feedback && <span>{visit.sampling.feedback}</span>}</div>}
          {visit.sampling?.conducted && visit.sampling.bottlesSoldBySku && <div style={styles.detailBox}><strong>Sampling SKU sales</strong>{Object.entries(visit.sampling.bottlesSoldBySku).map(([sku, qty]) => <span key={sku}>{sku}: {Number(qty || 0)} bottles</span>)}</div>}
          <VisitEvidenceSummary visitId={visit.id} />
        </div>)}</div>}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}
function formatDate(value: any) { const date = value?.toDate?.(); return date ? date.toLocaleString() : 'Date unavailable'; }

const styles: Record<string, React.CSSProperties> = {
  panel: { marginTop: 12, padding: 14, borderRadius: 12, background: '#f7f7f4', border: '1px solid #e5e3dd' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  eyebrow: { display: 'block', color: '#888', fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: .6 },
  title: { margin: '3px 0 0', fontSize: 13 },
  count: { background: '#fff', borderRadius: 999, padding: '5px 8px', fontSize: 9, fontWeight: 800 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginTop: 10 },
  metric: { background: '#fff', borderRadius: 8, padding: 8, display: 'grid', gap: 3, minWidth: 0 },
  latest: { display: 'grid', gap: 3, marginTop: 10, padding: 10, background: '#fff', borderRadius: 8, fontSize: 10 },
  section: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #e5e3dd' },
  list: { display: 'grid', gap: 6, marginTop: 6 },
  row: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 8px', background: '#fff', borderRadius: 7, fontSize: 10 },
  visitCard: { padding: 9, background: '#fff', borderRadius: 8 },
  detailBox: { marginTop: 7, padding: 7, background: '#f7f7f4', borderRadius: 7, display: 'grid', gap: 3, fontSize: 9 },
  visitHead: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', fontSize: 10 },
  normal: { padding: '3px 6px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontSize: 7, fontWeight: 900 },
  sampling: { padding: '3px 6px', borderRadius: 999, background: '#ede9fe', color: '#6d28d9', fontSize: 7, fontWeight: 900 },
  text: { margin: '6px 0 0', fontSize: 9, lineHeight: 1.4 },
  muted: { color: '#888', fontSize: 9, margin: '4px 0 0' },
};