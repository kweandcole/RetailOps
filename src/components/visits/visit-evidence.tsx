'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { getFirebaseDb } from '@/lib/firebase/client';

type ActiveVisit = {
  id: string;
  outletId?: string;
  outletName?: string;
  visitType?: string;
};

type EvidenceFile = {
  id: string;
  fileName: string;
  photoType: string;
  driveUrl?: string | null;
  thumbnailUrl?: string | null;
  uploadedAt?: any;
};

const PHOTO_TYPES = ['Shelf / Stock', 'Display', 'Price / POS', 'Sampling', 'Competitor', 'Other'];

export default function VisitEvidence({ user }: { user: User }) {
  const [visit, setVisit] = useState<ActiveVisit | null>(null);
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [photoType, setPhotoType] = useState('Shelf / Stock');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const q = query(collection(getFirebaseDb(), 'visits'), where('repUid', '==', user.uid), where('status', '==', 'STARTED'));
    return onSnapshot(q, (snapshot) => {
      const doc = snapshot.docs[0];
      setVisit(doc ? { id: doc.id, ...(doc.data() as Omit<ActiveVisit, 'id'>) } : null);
    }, () => setVisit(null));
  }, [user.uid]);

  useEffect(() => {
    if (!visit) { setFiles([]); return; }
    const q = query(collection(getFirebaseDb(), 'visits', visit.id, 'evidence'));
    return onSnapshot(q, (snapshot) => {
      setFiles(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<EvidenceFile, 'id'>) }))
        .sort((a, b) => (b.uploadedAt?.toMillis?.() ?? 0) - (a.uploadedAt?.toMillis?.() ?? 0)));
    }, () => setFiles([]));
  }, [visit?.id]);

  async function handlePhoto(file: File) {
    if (!visit) return;
    if (!file.type.startsWith('image/')) { setMessage('Please choose an image file.'); return; }
    if (file.size > 8 * 1024 * 1024) { setMessage('Photo is too large. Maximum size is 8 MB.'); return; }

    setBusy(true);
    setMessage('Uploading photo…');
    try {
      const base64 = await fileToBase64(file);
      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visitId: visit.id, outletName: visit.outletName, photoType, fileName: file.name, mimeType: file.type, base64 }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to upload photo');

      await addDoc(collection(getFirebaseDb(), 'visits', visit.id, 'evidence'), {
        fileId: result.file.id,
        fileName: result.file.name,
        driveUrl: result.file.webViewLink || null,
        thumbnailUrl: result.file.thumbnailLink || null,
        photoType: result.file.photoType,
        uploadedAt: serverTimestamp(),
        uploadedBy: user.uid,
      });
      setMessage('Photo uploaded successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload photo.');
    } finally { setBusy(false); }
  }

  if (!visit) return null;

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>VISIT EVIDENCE</div>
          <h3 style={styles.title}>Store photos</h3>
          <p style={styles.subtitle}>{visit.outletName || 'Active store visit'} · Photos stay private in the central Drive folder.</p>
        </div>
        <span style={styles.badge}>{files.length} photo{files.length === 1 ? '' : 's'}</span>
      </div>

      <div style={styles.controls}>
        <select value={photoType} onChange={(e) => setPhotoType(e.target.value)} disabled={busy} style={styles.select} aria-label="Photo type">
          {PHOTO_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <label style={{ ...styles.button, opacity: busy ? 0.55 : 1 }}>
          {busy ? 'Uploading…' : 'Take photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) void handlePhoto(file); e.currentTarget.value = ''; }}
            style={{ display: 'none' }} />
        </label>
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {files.length > 0 && (
        <div style={styles.grid}>
          {files.map((file) => (
            <a key={file.id} href={file.driveUrl || '#'} target="_blank" rel="noreferrer" style={styles.photoCard}>
              <div style={styles.thumbnail}>
                <span style={styles.camera}>📷</span>
                <span style={styles.typeBadge}>{file.photoType}</span>
              </div>
              <div style={styles.photoFooter}>
                <span style={styles.fileName}>{file.fileName}</span>
                <span style={styles.open}>Open ↗</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const value = String(reader.result || ''); resolve(value.includes(',') ? value.split(',')[1] : value); };
    reader.onerror = () => reject(new Error('Unable to read photo'));
    reader.readAsDataURL(file);
  });
}

const styles: Record<string, React.CSSProperties> = {
  card: { marginTop: 14, padding: 16, border: '1px solid #e7e5e0', borderRadius: 14, background: '#fff' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  eyebrow: { fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: '#777' },
  title: { margin: '5px 0 3px', fontSize: 16 },
  subtitle: { margin: 0, color: '#888', fontSize: 11, lineHeight: 1.4 },
  badge: { borderRadius: 20, padding: '5px 8px', background: '#f0f0ed', fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap' },
  controls: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 8, marginTop: 14 },
  select: { minHeight: 42, border: '1px solid #d9d7d1', borderRadius: 10, padding: '8px 10px', background: '#fafaf8', fontSize: 12 },
  button: { minHeight: 42, borderRadius: 10, background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, cursor: 'pointer' },
  message: { marginTop: 10, padding: 10, borderRadius: 9, background: '#f4f4f1', color: '#555', fontSize: 11 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9, marginTop: 14 },
  photoCard: { border: '1px solid #e8e6e1', borderRadius: 10, overflow: 'hidden', color: '#171717', textDecoration: 'none', background: '#fafaf8' },
  thumbnail: { height: 115, display: 'grid', placeItems: 'center', position: 'relative', background: '#ecebe7', overflow: 'hidden' },
  thumbnailImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  camera: { fontSize: 25, opacity: 0.55 },
  typeBadge: { position: 'absolute', left: 7, bottom: 7, padding: '4px 6px', borderRadius: 6, background: '#171717', color: '#fff', fontSize: 8, fontWeight: 800 },
  photoFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, padding: '8px 9px' },
  fileName: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 9, color: '#666' },
  open: { fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap' },
};
