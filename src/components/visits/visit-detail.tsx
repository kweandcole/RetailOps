'use client';

import { useState } from 'react';


import VisitEvidenceSummary from './visit-evidence-summary';

type Visit = Record<string, any>;

const checks = [
  ['Display present', 'displayPresent'],
  ['Products well displayed', 'productsWellDisplayed'],
  ['Price visible', 'priceVisible'],
  ['Staff engaged', 'staffEngaged'],
  ['Competitor activity', 'competitorActivity'],
] as const;

export default function VisitDetail({ visit }: { visit: Visit }) {
  const [full, setFull] = useState<Visit>(visit);

  const checklist = full.checklist || {};
  const reasons = full.checklistReasons || {};
  const sampling = full.sampling || {};
  const started = full.startedAt?.toDate?.();
  const stopped = full.stoppedAt?.toDate?.();
  const stock = Array.isArray(full.stockEntries) ? full.stockEntries : [];
  const expiry = Array.isArray(full.expiry) ? full.expiry : [];
  const orderItems = Array.isArray(full.orderItems) ? full.orderItems : [];

  return <div style={styles.panel}>
    <div style={styles.grid}>
      <Info label="Visit ID" value={full.id} />
      <Info label="Status" value={full.status || 'STARTED'} />
      <Info label="Started" value={started ? started.toLocaleString() : '—'} />
      <Info label="Completed" value={stopped ? stopped.toLocaleString() : '—'} />
      <Info label="Duration" value={full.durationMinutes != null ? `${full.durationMinutes} min` : '—'} />
      <Info label="GPS" value={full.gps?.lat != null ? `${Number(full.gps.lat).toFixed(5)}, ${Number(full.gps.lng).toFixed(5)}` : 'Not captured'} />
    </div>

    {full.notes && <Block label="Visit notes"><p style={styles.text}>{full.notes}</p></Block>}

    <Block label="Visit checklist">
      <div style={styles.list}>
        {checks.map(([label, key]) => <div key={key} style={styles.row}>
          <span>{label}</span>
          <strong>{checklist[key] === true ? 'Yes' : checklist[key] === false ? 'No' : '—'}</strong>
          {checklist[key] === false && reasons[key] ? <small>{reasons[key]}</small> : null}
        </div>)}
      </div>
    </Block>

    {stock.length > 0 && <Block label="Stock recorded">
      <div style={styles.list}>{stock.map((item: any) => <div key={item.sku} style={styles.row}><span>{item.productName || item.sku}</span><strong>{item.shelfStock ?? 0} shelf · {item.backStock ?? 0} back</strong></div>)}</div>
    </Block>}

    {expiry.length > 0 && <Block label="Expiry">
      <div style={styles.list}>{expiry.map((item: any) => <div key={item.sku} style={styles.row}><span>{item.productName || item.sku}</span><strong>{item.hasExpiryConcern ? `${item.quantity || 0} · ${item.expiryDate || ''}` : 'No concern'}</strong></div>)}</div>
    </Block>}

    {sampling.conducted != null && <Block label="Sampling">
      <p style={styles.text}>{sampling.conducted ? `${sampling.customersSampled || 0} customers sampled · ${sampling.bottlesSold || 0} bottles sold` : 'Sampling not conducted'}</p>
      {sampling.reason && <small>{sampling.reason}</small>}
      {sampling.feedback && <p style={styles.text}>{sampling.feedback}</p>}
    </Block>}

    {orderItems.length > 0 && <Block label="Order">
      <div style={styles.list}>{orderItems.map((item: any) => <div key={item.sku} style={styles.row}><span>{item.productName}</span><strong>{item.quantity} × KSh {Number(item.unitPrice || 0).toLocaleString()}</strong></div>)}</div>
      <p style={styles.total}>Total: KSh {Number(full.orderValue || orderItems.reduce((s: number, i: any) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0)).toLocaleString()}</p>
      {full.orderNotes && <small>{full.orderNotes}</small>}
    </Block>}

    <Block label="Photo evidence"><VisitEvidenceSummary visitId={full.id} /></Block>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div style={styles.info}><span style={styles.label}>{label}</span><strong>{value}</strong></div>;
}
function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={styles.block}><span style={styles.label}>{label}</span>{children}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  panel: { marginTop: 12, padding: 14, borderRadius: 11, background: '#f7f7f4', border: '1px solid #e5e3dd' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 },
  info: { padding: '8px 9px', background: '#fff', borderRadius: 7, minWidth: 0 },
  label: { display: 'block', color: '#888', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 },
  block: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #e5e3dd' },
  list: { display: 'grid', gap: 5, marginTop: 6 },
  row: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, padding: '7px 8px', background: '#fff', borderRadius: 7, fontSize: 11 },
  text: { margin: '6px 0 0', fontSize: 11, lineHeight: 1.45 },
  total: { margin: '8px 0 0', fontWeight: 800, fontSize: 11 },
};
