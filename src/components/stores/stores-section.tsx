'use client';

import { useMemo, useState } from 'react';

type StoreStatus = 'Visited' | 'Pending';
type Store = {
  outletId: string;
  retailer: string;
  branchName: string;
  location: string;
  status: StoreStatus;
  priority: 'High' | 'Medium' | 'Low';
};

const stores: Store[] = [
  { outletId: 'OUT-001', retailer: 'Chandarana', branchName: 'Yaya Centre', location: 'Nairobi', status: 'Visited', priority: 'High' },
  { outletId: 'OUT-002', retailer: 'Chandarana', branchName: 'ABC Place', location: 'Westlands, Nairobi', status: 'Pending', priority: 'High' },
  { outletId: 'OUT-003', retailer: 'Chandarana', branchName: 'Lavington', location: 'Lavington, Nairobi', status: 'Pending', priority: 'Medium' },
  { outletId: 'OUT-004', retailer: 'Chandarana', branchName: 'Crystal', location: 'Nairobi', status: 'Visited', priority: 'Medium' },
  { outletId: 'OUT-005', retailer: 'Chandarana', branchName: 'Signature', location: 'Nairobi', status: 'Pending', priority: 'Medium' },
  { outletId: 'OUT-006', retailer: 'Chandarana', branchName: 'Diamond Plaza', location: 'Parklands, Nairobi', status: 'Pending', priority: 'Low' },
];

export default function StoresSection() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | StoreStatus>('All');

  const filteredStores = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return stores.filter((store) => {
      const matchesFilter = filter === 'All' || store.status === filter;
      const matchesQuery = !normalized || `${store.branchName} ${store.retailer} ${store.location}`.toLowerCase().includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  return (
    <section>
      <div style={styles.toolbar}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search stores..."
          aria-label="Search stores"
          style={styles.search}
        />
        <div style={styles.filters}>
          {(['All', 'Visited', 'Pending'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{ ...styles.filter, ...(filter === item ? styles.filterActive : {}) }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.mapPlaceholder}>
        <div style={styles.mapGrid} />
        <div style={styles.mapLabel}>Store map</div>
        {filteredStores.slice(0, 6).map((store, index) => (
          <span
            key={store.outletId}
            title={store.branchName}
            style={{ ...styles.pin, left: `${18 + index * 13}%`, top: `${32 + (index % 3) * 18}%` }}
          >
            {index + 1}
          </span>
        ))}
      </div>

      <div style={styles.summary}>{filteredStores.length} stores shown</div>

      <div style={styles.list}>
        {filteredStores.map((store) => (
          <article key={store.outletId} style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <div style={styles.retailer}>{store.retailer}</div>
                <h2 style={styles.branch}>{store.branchName}</h2>
                <div style={styles.location}>{store.location}</div>
              </div>
              <span style={{ ...styles.status, ...(store.status === 'Visited' ? styles.statusVisited : styles.statusPending) }}>
                {store.status}
              </span>
            </div>
            <div style={styles.cardBottom}>
              <span style={styles.priority}>Priority: {store.priority}</span>
              <button style={styles.visitButton}>Start visit</button>
            </div>
          </article>
        ))}
        {filteredStores.length === 0 && (
          <div style={styles.empty}>No stores match your search.</div>
        )}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: 'grid', gap: 12, marginBottom: 16 },
  search: { width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', background: '#fff', borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none' },
  filters: { display: 'flex', gap: 7, overflowX: 'auto' },
  filter: { border: '1px solid #ddd', background: '#fff', color: '#666', borderRadius: 20, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  filterActive: { background: '#171717', color: '#fff', borderColor: '#171717' },
  mapPlaceholder: { height: 180, borderRadius: 15, border: '1px solid #deded9', background: '#ecece8', position: 'relative', overflow: 'hidden', marginBottom: 12 },
  mapGrid: { position: 'absolute', inset: 0, opacity: 0.35, backgroundImage: 'linear-gradient(25deg, transparent 47%, #c8c8c2 48%, #c8c8c2 50%, transparent 51%), linear-gradient(155deg, transparent 47%, #c8c8c2 48%, #c8c8c2 50%, transparent 51%)', backgroundSize: '80px 80px' },
  mapLabel: { position: 'absolute', top: 12, left: 12, background: '#fff', borderRadius: 8, padding: '6px 9px', fontSize: 10, fontWeight: 800 },
  pin: { position: 'absolute', width: 25, height: 25, borderRadius: '50%', background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, transform: 'translate(-50%, -50%)', boxShadow: '0 3px 8px rgba(0,0,0,.18)' },
  summary: { color: '#888', fontSize: 11, marginBottom: 9 },
  list: { display: 'grid', gap: 9 },
  card: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 14, padding: 15 },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  retailer: { color: '#888', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 },
  branch: { margin: '4px 0 3px', fontSize: 16, letterSpacing: -0.3 },
  location: { color: '#777', fontSize: 11 },
  status: { height: 'fit-content', borderRadius: 20, padding: '5px 8px', fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap' },
  statusVisited: { background: '#ecece8', color: '#333' },
  statusPending: { background: '#f7f2e9', color: '#725a30' },
  cardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 11, borderTop: '1px solid #f0efec' },
  priority: { color: '#888', fontSize: 10 },
  visitButton: { border: 0, background: '#171717', color: '#fff', borderRadius: 8, padding: '8px 11px', fontSize: 10, fontWeight: 800, cursor: 'pointer' },
  empty: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 14, padding: 30, textAlign: 'center', color: '#888', fontSize: 12 },
};
