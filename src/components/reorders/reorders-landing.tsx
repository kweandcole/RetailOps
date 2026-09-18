'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';

type ReorderRow = {
  id: string;
  outletId: string;
  outletName: string;
  sku: string;
  productName: string;
  quantity: number;
};

const TARGET_STOCK = 12;

export default function ReordersLanding() {
  const [rows, setRows] = useState<ReorderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(getFirebaseDb(), 'stock'));
      const loaded = snapshot.docs.map((item) => {
        const data = item.data() as Record<string, any>;
        return {
          id: item.id,
          outletId: String(data.outletId || ''),
          outletName: data.outletName || 'Unnamed store',
          sku: data.sku || '',
          productName: data.productName || data.sku || 'Unknown product',
          quantity: Number(data.quantity || 0),
        };
      }).filter((row) => row.quantity <= 5);
      loaded.sort((a, b) => a.outletName.localeCompare(b.outletName) || a.productName.localeCompare(b.productName));
      setRows(loaded);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = rows.filter((row) =>
    `${row.outletName} ${row.productName}`.toLowerCase().includes(search.toLowerCase())
  );
  const oos = rows.filter((row) => row.quantity === 0).length;
  const low = rows.filter((row) => row.quantity > 0).length;

  return <section style={styles.sectionCard}>
    <div style={styles.header}>
      <div>
        <h2 style={styles.title}>Reorder queue</h2>
        <p style={styles.subtitle}>Stores with 5 bottles or fewer based on the latest stock count.</p>
      </div>
      <button onClick={() => void load()} style={styles.button}>{loading ? 'Loading…' : 'Refresh'}</button>
    </div>

    <div style={styles.metrics}>
      <div style={styles.metric}><span>Out of stock</span><strong>{oos}</strong></div>
      <div style={styles.metric}><span>Low stock</span><strong>{low}</strong></div>
      <div style={styles.metric}><span>Items to review</span><strong>{rows.length}</strong></div>
    </div>

    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search store or product" style={styles.search} />

    {filtered.length === 0
      ? <div style={styles.empty}>{loading ? 'Loading reorder recommendations…' : 'No reorder items currently flagged.'}</div>
      : <div style={styles.list}>{filtered.map((row) => {
          const suggested = Math.max(TARGET_STOCK - row.quantity, 0);
          return <article key={row.id} style={styles.row}>
            <div style={styles.rowMain}>
              <strong>{row.outletName}</strong>
              <span>{row.productName}</span>
            </div>
            <div style={styles.rowRight}>
              <span style={row.quantity === 0 ? styles.oos : styles.low}>{row.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}</span>
              <span>Current: <strong>{row.quantity}</strong></span>
              <span>Suggested: <strong>{suggested}</strong></span>
            </div>
          </article>;
        })}</div>}
  </section>;
}

const styles: Record<string, React.CSSProperties> = {
  sectionCard: { padding: 16, borderRadius: 11, background: '#fff', border: '1px solid #e5e3dd' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  title: { margin: 0, fontSize: 20 },
  subtitle: { margin: '4px 0 0', color: '#777', fontSize: 11 },
  button: { border: '1px solid #ddd', background: '#fff', borderRadius: 7, padding: '8px 11px', fontWeight: 700 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 },
  metric: { padding: 10, background: '#f7f7f4', borderRadius: 8, display: 'grid', gap: 3, fontSize: 10 },
  search: { width: '100%', boxSizing: 'border-box', padding: 10, border: '1px solid #ddd', borderRadius: 8, marginBottom: 10 },
  list: { display: 'grid', gap: 7 },
  row: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: 10, border: '1px solid #e8e6e0', borderRadius: 8 },
  rowMain: { display: 'grid', gap: 3, minWidth: 0 },
  rowRight: { display: 'grid', gap: 3, textAlign: 'right', fontSize: 10, whiteSpace: 'nowrap' },
  low: { fontSize: 8, fontWeight: 900, letterSpacing: .4 },
  oos: { fontSize: 8, fontWeight: 900, letterSpacing: .4 },
  empty: { padding: 28, textAlign: 'center', color: '#777', fontSize: 11 },
};
