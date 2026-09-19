'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import VisitEvidenceSummary from '@/components/visits/visit-evidence-summary';
import StoreOrders from './store-orders';

type StoreActivityProps = { outletId: string; retailer: string; branchName: string; onStartVisit?: () => void };

const SKU_NAMES: Record<string, string> = {
  'SKU-001': 'Honey Habanero Hot Sauce',
  'SKU-002': 'Hot Honey',
  'SKU-003': 'Jalapeno Lime Hot Sauce',
  'SKU-004': 'Mango Pineapple Habanero Hot Sauce',
};

export default function StoreActivity({ outletId, retailer, branchName, onStartVisit }: StoreActivityProps) {
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
        const loadedVisits: Array<Record<string, any>> = visitSnap.docs
          .filter((d) => (d.data() as Record<string, any>).status === 'COMPLETED')
          .map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
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
  const customersSampled = samplingVisits.reduce((sum, visit) => sum + Number(visit.sampling?.customersSampled || 0), 0);
  const bottlesSampledSold = samplingVisits.reduce((sum, visit) => sum + Number(visit.sampling?.bottlesSold || 0), 0);
  const totalOrderValue = orders.reduce((sum, order) => sum + Number(order.totalValue || order.orderValue || 0), 0);
  const latestVisit = visits[0];

  const lowStockItems = stock.filter((item) => Number(item.quantity ?? Number(item.shelfStock || 0) + Number(item.backStock || 0)) <= 5);
  const expiryConcernItems = expiry.filter((item) => item.hasExpiryConcern);
  const attentionCount = lowStockItems.length + expiryConcernItems.length;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div><span style={styles.eyebrow}>Store activity</span><h3 style={styles.title}>{retailer} · {branchName}</h3></div>
        <span style={styles.count}>{visits.length} visits</span>
      </div>

      {attentionCount > 0 ? (
        <div style={styles.attentionPanel}>
          <div>
            <span style={styles.eyebrow}>Needs attention</span>
            <strong style={styles.attentionTitle}>{attentionCount} issue{attentionCount === 1 ? '' : 's'} to follow up</strong>
          </div>
          <div style={styles.attentionItems}>
            {lowStockItems.length > 0 && <span style={styles.stockAttention}>Low stock · {lowStockItems.length}</span>}
            {expiryConcernItems.length > 0 && <span style={styles.expiryAttention}>Expiry · {expiryConcernItems.length}</span>}
            {onStartVisit && <button type="button" onClick={onStartVisit} style={styles.followUpButton}>Start follow-up visit</button>}
          </div>
        </div>
      ) : (
        <div style={styles.clearPanel}>No current stock or expiry issues.</div>
      )}

      <div style={styles.metrics}>
        <Metric label="Visits" value={String(visits.length)} />
        <Metric label="Sampling" value={String(samplingVisits.length)} />
        <Metric label="Customers sampled" value={String(customersSampled)} />
        <Metric label="Bottles sold" value={String(bottlesSampledSold)} />
        <Metric label="Orders" value={String(orders.length)} />
        <Metric label="Order value" value={`KSh ${totalOrderValue.toLocaleString()}`} />
      </div>
      {latestVisit && <div style={styles.latest}>
        <span style={styles.eyebrow}>Latest visit</span>
        <strong>{formatDate(latestVisit.createdAt || latestVisit.startedAt)}</strong>
        <span>{latestVisit.visitType === 'SAMPLING_ONLY' ? 'Sampling' : 'Normal visit'} · {latestVisit.status || '—'} · {latestVisit.repName || 'Field rep'}</span>
      </div>}
      <div style={styles.section}>
        <span style={styles.eyebrow}>Order history</span>
        <StoreOrders orders={orders} />
      </div>
      <div style={styles.section}>
        <span style={styles.eyebrow}>Current stock</span>
        {stock.length === 0 ? <p style={styles.muted}>No stock records yet.</p> : <div style={styles.list}>{stock.map((item) => {
          const quantity = Number(item.quantity ?? Number(item.shelfStock || 0) + Number(item.backStock || 0));
          const low = quantity <= 5;
          return <div key={item.id} style={{ ...styles.row, ...(low ? styles.lowStockRow : {}) }}><span>{item.productName || SKU_NAMES[item.sku] || item.sku}</span><strong>{quantity} bottles{low ? ' · Low' : ''}</strong></div>;
        })}</div>}
      </div>
      <div style={styles.section}>
        <span style={styles.eyebrow}>Expiry issues</span>
        {expiry.length === 0 ? <p style={styles.muted}>No expiry records yet.</p> : <div style={styles.list}>{expiry.map((item) => <div key={item.id} style={{ ...styles.row, ...(item.hasExpiryConcern ? styles.expiryRow : {}) }}><span>{item.productName || SKU_NAMES[item.sku] || item.sku}</span><strong>{item.hasExpiryConcern ? String(item.quantity || 0) + ' · ' + (item.expiryDate || 'date not recorded') : 'No concern'}</strong></div>)}</div>}
      </div>
      <div style={styles.section}>
        <span style={styles.eyebrow}>Visit history</span>
        {visits.length === 0 ? <p style={styles.muted}>No visits recorded yet.</p> : <div style={styles.list}>{visits.slice(0, 10).map((visit) => <div key={visit.id} style={styles.visitCard}>
          <div style={styles.visitHead}><strong>{formatDate(visit.createdAt || visit.startedAt)}</strong><span style={visit.visitType === 'SAMPLING_ONLY' ? styles.sampling : styles.normal}>{visit.visitType === 'SAMPLING_ONLY' ? 'SAMPLING' : 'NORMAL'}</span></div>
          <span style={styles.muted}>{visit.repName || 'Field rep'} · {visit.status || '—'}{visit.durationMinutes != null ? ` · ${visit.durationMinutes} min` : ''}</span>
          {visit.notes && <p style={styles.text}>{visit.notes}</p>}
          {visit.sampling?.conducted && <div style={styles.detailBox}><div style={styles.detailTitle}>Sampling results</div><div style={styles.samplingMetrics}><span><strong>{Number(visit.sampling.customersSampled || 0)}</strong> customers sampled</span><span><strong>{Number(visit.sampling.bottlesSold || 0)}</strong> bottles sold</span></div>{visit.sampling.feedback && <span style={styles.feedback}>“{visit.sampling.feedback}”</span>}</div>}
          {visit.sampling?.conducted && visit.sampling.bottlesSoldBySku && Object.keys(visit.sampling.bottlesSoldBySku).length > 0 && <div style={styles.detailBox}><div style={styles.detailTitle}>Products sold</div>{Object.entries(visit.sampling.bottlesSoldBySku).filter(([, qty]) => Number(qty || 0) > 0).map(([sku, qty]) => <div key={sku} style={styles.skuRow}><span>{SKU_NAMES[sku] || sku}</span><strong>{Number(qty || 0)}</strong></div>)}</div>}
          <VisitEvidenceSummary visitId={visit.id} />
        </div>)}</div>}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}
function formatDate(value: any) { const date = value?.toDate?.(); return date ? `${String(date.getDate()).padStart(2, '0')}-${date.toLocaleString('en-GB', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}` : 'Date unavailable'; }

const styles: Record<string, React.CSSProperties> = {
  panel: { marginTop: 12, padding: 14, borderRadius: 12, background: '#f7f7f4', border: '1px solid #e5e3dd' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  eyebrow: { display: 'block', color: '#888', fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: .6 },
  title: { margin: '3px 0 0', fontSize: 13 },
  count: { background: '#fff', borderRadius: 999, padding: '5px 8px', fontSize: 9, fontWeight: 800 },
  attentionPanel: { marginTop: 10, padding: 10, background: '#fff7ed', border: '1px solid #f1d5ad', borderRadius: 9, display: 'grid', gap: 7 },
  attentionTitle: { display: 'block', marginTop: 3, fontSize: 11 },
  attentionItems: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  stockAttention: { background: '#fff1f2', color: '#991b1b', borderRadius: 999, padding: '4px 7px', fontSize: 8, fontWeight: 800 },
  expiryAttention: { background: '#ffedd5', color: '#9a3412', borderRadius: 999, padding: '4px 7px', fontSize: 8, fontWeight: 800 },
  followUpButton: { border: 0, background: '#9a3412', color: '#fff', borderRadius: 7, padding: '6px 8px', fontSize: 8, fontWeight: 800, cursor: 'pointer' },
  clearPanel: { marginTop: 10, padding: 9, background: '#f3f4f6', borderRadius: 9, color: '#666', fontSize: 9, fontWeight: 700 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginTop: 10 },
  metric: { background: '#fff', borderRadius: 8, padding: 8, display: 'grid', gap: 3, minWidth: 0 },
  latest: { display: 'grid', gap: 3, marginTop: 10, padding: 10, background: '#fff', borderRadius: 8, fontSize: 10 },
  section: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #e5e3dd' },
  list: { display: 'grid', gap: 6, marginTop: 6 },
  row: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 8px', background: '#fff', borderRadius: 7, fontSize: 10 },
  lowStockRow: { border: '1px solid #fecdd3' },
  expiryRow: { border: '1px solid #fed7aa' },
  visitCard: { padding: 9, background: '#fff', borderRadius: 8 },
  detailBox: { marginTop: 7, padding: 8, background: '#f7f7f4', borderRadius: 7, display: 'grid', gap: 5, fontSize: 9 },
  detailTitle: { fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: .5 },
  samplingMetrics: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  feedback: { color: '#666', lineHeight: 1.35 },
  skuRow: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderTop: '1px solid #e5e3dd' },
  visitHead: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', fontSize: 10 },
  normal: { padding: '3px 6px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontSize: 7, fontWeight: 900 },
  sampling: { padding: '3px 6px', borderRadius: 999, background: '#ede9fe', color: '#6d28d9', fontSize: 7, fontWeight: 900 },
  text: { margin: '6px 0 0', fontSize: 9, lineHeight: 1.4 },
  muted: { color: '#888', fontSize: 9, margin: '4px 0 0' },
};