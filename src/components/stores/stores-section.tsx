'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import StoreActivity from './store-activity';

type StoreStatus = 'Visited' | 'Pending';
type Store = {
  outletId: string;
  retailer: string;
  branchName: string;
  location: string;
  status: StoreStatus;
  priority: 'High' | 'Medium' | 'Low';
  monthlyTarget?: number;
  assignedMerchandiser?: string;
  active?: boolean;
  stockAlerts?: number;
  expiryAlerts?: number;
};

function formatDate(value: any) {
  const date = value?.toDate?.();
  if (!(date instanceof Date)) return 'Date unavailable';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
}

export default function StoresSection({ onStartVisit }: { onStartVisit: (store: Store) => void }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | StoreStatus>('All');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [visitedStores, setVisitedStores] = useState<Set<string>>(new Set());
  const [latestVisits, setLatestVisits] = useState<Record<string, Record<string, any>>>({});

  async function loadStores() {
    setLoading(true); setError('');
    try {
      const db = getFirebaseDb();
      const [snapshot, visitSnapshot, stockSnapshot, expirySnapshot] = await Promise.all([
        getDocs(collection(db, 'outlets')),
        getDocs(collection(db, 'visits')),
        getDocs(collection(db, 'stock')),
        getDocs(collection(db, 'expiry')),
      ]);

      const stockByOutlet: Record<string, { alerts: number }> = {};
      stockSnapshot.docs.forEach((item) => {
        const row = item.data() as Record<string, any>;
        const outletId = String(row.outletId || '');
        if (!outletId) return;
        const quantity = Number(row.quantity ?? Number(row.shelfStock || 0) + Number(row.backStock || 0));
        if (quantity <= 5) stockByOutlet[outletId] = { alerts: (stockByOutlet[outletId]?.alerts || 0) + 1 };
      });

      const expiryByOutlet: Record<string, number> = {};
      expirySnapshot.docs.forEach((item) => {
        const row = item.data() as Record<string, any>;
        if (!row.outletId || !row.hasExpiryConcern) return;
        const outletId = String(row.outletId);
        expiryByOutlet[outletId] = (expiryByOutlet[outletId] || 0) + 1;
      });

      const data = snapshot.docs.map((item) => ({ outletId: item.id, ...(item.data() as Omit<Store, 'outletId'>) }));
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const visited = new Set<string>();
      const latest: Record<string, Record<string, any>> = {};

      visitSnapshot.docs.forEach((item) => {
        const visit = item.data() as Record<string, any>;
        const timestamp = visit.createdAt?.toDate?.() || visit.startedAt?.toDate?.();
        if (!visit.outletId || !(timestamp instanceof Date) || visit.status !== 'COMPLETED') return;
        const outletId = String(visit.outletId);
        visited.add(outletId);
        const existing = latest[outletId];
        const existingTime = existing?.createdAt?.toDate?.() || existing?.startedAt?.toDate?.();
        if (!existing || timestamp.getTime() > (existingTime instanceof Date ? existingTime.getTime() : 0)) {
          latest[outletId] = { id: item.id, ...visit };
        }
      });

      setVisitedStores(visited);
      setLatestVisits(latest);
      setStores(data.map((store) => ({
        ...store,
        stockAlerts: stockByOutlet[store.outletId]?.alerts || 0,
        expiryAlerts: expiryByOutlet[store.outletId] || 0,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load stores from Firestore.');
    } finally { setLoading(false); }
  }

  async function syncFromSheets() {
    setSyncing(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/legacy/outlets');
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to read the legacy Outlet Master.');
      const outlets = result.outlets as Store[];
      await Promise.all(outlets.map((outlet) => {
        const store = {
          ...outlet,
          outletName: outlet.branchName,
          branch: outlet.branchName,
        };
        return setDoc(doc(getFirebaseDb(), 'outlets', outlet.outletId), store, { merge: true });
      }));
      setMessage(`${outlets.length} outlets imported from the legacy Outlet Master.`);
      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Outlet import failed.');
    } finally { setSyncing(false); }
  }

  useEffect(() => { void loadStores(); }, []);

  const filteredStores = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return stores.filter((store) => {
      const isVisited = visitedStores.has(store.outletId);
      const matchesFilter = filter === 'All' || (filter === 'Visited' ? isVisited : !isVisited);
      const matchesQuery = !normalized || `${store.branchName} ${store.retailer} ${store.location}`.toLowerCase().includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, stores, visitedStores]);

  const attentionCount = (store: Store) => Number(store.stockAlerts || 0) + Number(store.expiryAlerts || 0);

  return (
    <section>
      <div style={styles.toolbar}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stores..." aria-label="Search stores" style={styles.search} />
        <div style={styles.filters}>{(['All', 'Visited', 'Pending'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} style={{ ...styles.filter, ...(filter === item ? styles.filterActive : {}) }}>{item}</button>)}</div>
      </div>

      <div style={styles.actionBar}>
        <div><strong style={styles.actionTitle}>Store master</strong><div style={styles.actionText}>Firestore is now the app&apos;s store data source.</div></div>
        <button onClick={syncFromSheets} disabled={syncing} style={styles.syncButton}>{syncing ? 'Importing…' : 'Import from Sheets'}</button>
      </div>

      {message && <div style={styles.message}>{message}</div>}
      {error && <div role="alert" style={styles.error}>{error}</div>}

      <div style={styles.mapPlaceholder}>
        <div style={styles.mapGrid} />
        <div style={styles.mapLabel}>Store map</div>
        {filteredStores.slice(0, 8).map((store, index) => <span key={store.outletId} title={store.branchName} style={{ ...styles.pin, left: `${12 + (index % 7) * 12}%`, top: `${32 + (index % 3) * 18}%` }}>{index + 1}</span>)}
      </div>

      <div style={styles.summary}>{loading ? 'Loading stores…' : `${filteredStores.length} stores shown`}</div>

      <div style={styles.list}>
        {!loading && filteredStores.map((store) => {
          const latest = latestVisits[store.outletId];
          const isVisited = visitedStores.has(store.outletId);
          const hasStockAlert = Number(store.stockAlerts || 0) > 0;
          const hasExpiry = Number(store.expiryAlerts || 0) > 0;
          const visitType = latest?.visitType === 'SAMPLING_ONLY' ? 'Sampling' : 'Normal';

          return (
            <article key={store.outletId} style={{ ...styles.card, ...(attentionCount(store) > 0 ? styles.cardAttention : {}) }}>
              <div style={styles.cardTop}>
                <div style={styles.identity}>
                  <div style={styles.retailer}>{store.retailer}</div>
                  <h2 style={styles.branch}>{store.branchName}</h2>
                  <div style={styles.location}>{store.location}</div>
                </div>
                <span style={{ ...styles.status, ...(isVisited ? styles.statusVisited : styles.statusPending) }}{isVisited ? 'Visited' : 'Pending'}</span>
              </div>

              <div style={styles.attentionRow}>
                {hasStockAlert && <span style={styles.alertBadge}>Low stock · {store.stockAlerts}</span>}
                {hasExpiry && <span style={styles.expiryBadge}>Expiry present</span>}
                {!hasStockAlert && !hasExpiry && <span style={styles.clearBadge}>No immediate alerts</span>}
              </div>

              {latest && (
                <div style={styles.lastVisit}>
                  <span style={styles.lastVisitLabel}>Last visit</span>
                  <span style={styles.lastVisitDate}>{formatDate(latest.createdAt || latest.startedAt)}</span>
                  <span style={styles.visitType}>{visitType}</span>
                </div>
              )}

              <div style={styles.cardBottom}>
                <div style={styles.cardMeta}>
                  {store.priority && <span style={styles.priority}>Priority · {store.priority}</span>}
                </div>
                <div style={styles.cardActions}>
                  <button onClick={() => setSelectedStoreId(selectedStoreId === store.outletId ? null : store.outletId)} style={styles.activityButton}>{selectedStoreId === store.outletId ? 'Hide activity' : 'View activity →'}</button>
                  <button onClick={() => onStartVisit(store)} style={styles.visitButton}>Start visit</button>
                </div>
              </div>

              {selectedStoreId === store.outletId && <StoreActivity outletId={store.outletId} retailer={store.retailer} branchName={store.branchName} />}
            </article>
          );
        })}

        {!loading && filteredStores.length === 0 && <div style={styles.empty}>{stores.length === 0 ? 'No stores have been imported yet. Use “Import from Sheets” to bring in the existing Outlet Master.' : 'No stores match your search.'}</div>}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: 'grid', gap: 12, marginBottom: 14 },
  search: { width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', background: '#fff', borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none' },
  filters: { display: 'flex', gap: 7, overflowX: 'auto' },
  filter: { border: '1px solid #ddd', background: '#fff', color: '#666', borderRadius: 20, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  filterActive: { background: '#171717', color: '#fff', borderColor: '#171717' },
  actionBar: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 12, padding: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 },
  actionTitle: { fontSize: 12 },
  actionText: { color: '#888', fontSize: 10, marginTop: 3 },
  syncButton: { border: 0, background: '#171717', color: '#fff', borderRadius: 8, padding: '9px 11px', fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' },
  message: { background: '#eef7ee', color: '#315d31', borderRadius: 9, padding: 10, fontSize: 11, marginBottom: 10 },
  error: { background: '#fff3f3', color: '#a40000', borderRadius: 9, padding: 10, fontSize: 11, marginBottom: 10 },
  mapPlaceholder: { height: 180, borderRadius: 15, border: '1px solid #deded9', background: '#ecece8', position: 'relative', overflow: 'hidden', marginBottom: 12 },
  mapGrid: { position: 'absolute', inset: 0, opacity: 0.35, backgroundImage: 'linear-gradient(25deg, transparent 47%, #c8c8c2 48%, #c8c8c2 50%, transparent 51%), linear-gradient(155deg, transparent 47%, #c8c8c2 48%, #c8c8c2 50%, transparent 51%)', backgroundSize: '80px 80px' },
  mapLabel: { position: 'absolute', top: 12, left: 12, background: '#fff', borderRadius: 8, padding: '6px 9px', fontSize: 10, fontWeight: 800 },
  pin: { position: 'absolute', width: 25, height: 25, borderRadius: '50%', background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, transform: 'translate(-50%, -50%)', boxShadow: '0 3px 8px rgba(0,0,0,.18)' },
  summary: { color: '#888', fontSize: 11, marginBottom: 9 },
  list: { display: 'grid', gap: 9 },
  card: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 14, padding: 15 },
  cardAttention: { borderColor: '#e6c9a4' },
  identity: { minWidth: 0 },
  attentionRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 },
  alertBadge: { background: '#fff1f2', color: '#991b1b', borderRadius: 999, padding: '5px 8px', fontSize: 9, fontWeight: 800 },
  expiryBadge: { background: '#fff7ed', color: '#9a3412', borderRadius: 999, padding: '5px 8px', fontSize: 9, fontWeight: 800 },
  clearBadge: { background: '#f3f4f6', color: '#6b7280', borderRadius: 999, padding: '5px 8px', fontSize: 9, fontWeight: 700 },
  lastVisit: { display: 'flex', alignItems: 'center', gap: 7, marginTop: 13, paddingTop: 11, borderTop: '1px solid #f0efec', flexWrap: 'wrap' },
  lastVisitLabel: { color: '#888', fontSize: 9, fontWeight: 700 },
  lastVisitDate: { color: '#333', fontSize: 10, fontWeight: 800 },
  visitType: { color: '#777', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  retailer: { color: '#888', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 },
  branch: { margin: '4px 0 3px', fontSize: 17, letterSpacing: -0.3, lineHeight: 1.15 },
  location: { color: '#777', fontSize: 11 },
  status: { height: 'fit-content', borderRadius: 20, padding: '6px 9px', fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap' },
  statusVisited: { background: '#ecece8', color: '#333' },
  statusPending: { background: '#f7f2e9', color: '#725a30' },
  cardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 13, paddingTop: 12, borderTop: '1px solid #f0efec' },
  cardMeta: { minWidth: 0 },
  priority: { color: '#999', fontSize: 9 },
  cardActions: { display: 'flex', gap: 7, marginLeft: 'auto' },
  activityButton: { border: '1px solid #d8d6d1', background: '#fff', color: '#333', borderRadius: 8, padding: '8px 10px', fontSize: 9, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' },
  visitButton: { border: 0, background: '#171717', color: '#fff', borderRadius: 8, padding: '8px 11px', fontSize: 9, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' },
  empty: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 14, padding: 30, textAlign: 'center', color: '#888', fontSize: 12 },
};
