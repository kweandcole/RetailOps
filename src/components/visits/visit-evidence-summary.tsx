'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';

type Evidence = {
  id: string;
  photoType?: string;
  fileName?: string;
  driveUrl?: string | null;
  thumbnailUrl?: string | null;
};

export default function VisitEvidenceSummary({ visitId }: { visitId: string }) {
  const [files, setFiles] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void getDocs(collection(getFirebaseDb(), 'visits', visitId, 'evidence'))
      .then((snapshot) => {
        if (!mounted) return;
        setFiles(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Evidence, 'id'>) })));
      })
      .catch(() => {
        if (mounted) setFiles([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [visitId]);

  if (loading) return <div style={styles.loading}>Loading evidence…</div>;
  if (files.length === 0) return <div style={styles.none}>No photos</div>;

  return (
    <div style={styles.wrap}>
      <div style={styles.label}>Evidence · {files.length} photo{files.length === 1 ? '' : 's'}</div>
      <div style={styles.grid}>
        {files.slice(0, 4).map((file) => (
          <a key={file.id} href={file.driveUrl || '#'} target="_blank" rel="noreferrer" style={styles.photo}>
            {file.thumbnailUrl
              ? <img src={file.thumbnailUrl} alt={file.photoType || 'Visit evidence'} style={styles.image} />
              : <span style={styles.placeholder}>📷</span>}
            <span style={styles.type}>{file.photoType || 'Evidence'}</span>
          </a>
        ))}
      </div>
      {files.length > 4 && <div style={styles.more}>+{files.length - 4} more</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 9 },
  label: { fontSize: 9, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginTop: 6, maxWidth: 250 },
  photo: { height: 52, borderRadius: 6, overflow: 'hidden', position: 'relative', background: '#ecebe7', textDecoration: 'none', display: 'grid', placeItems: 'center' },
  image: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  placeholder: { fontSize: 16, opacity: 0.55 },
  type: { position: 'absolute', left: 3, bottom: 3, maxWidth: 'calc(100% - 6px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '2px 4px', borderRadius: 3, background: '#171717', color: '#fff', fontSize: 6, fontWeight: 800 },
  more: { marginTop: 5, fontSize: 8, color: '#888' },
  loading: { marginTop: 7, fontSize: 8, color: '#999' },
  none: { marginTop: 7, fontSize: 8, color: '#aaa' },
};
