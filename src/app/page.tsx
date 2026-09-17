'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, getGoogleProvider } from '@/lib/firebase/client';
import StoresSection from '@/components/stores/stores-section';

type NavItem = { label: string; icon: string };
type Outlet = { outletId: string; outletName?: string; retailer?: string; city?: string; branch?: string };
type VisitDraft = { outletId: string; outletName: string; notes: string };
const navItems: NavItem[] = [
  { label: 'Dashboard', icon: '⌂' }, { label: 'Visits', icon: '✓' }, { label: 'Stores', icon: '▣' },
  { label: 'Sampling', icon: '◎' }, { label: 'Stock', icon: '▤' }, { label: 'Orders', icon: '▱' },
];
const activity = [
  { title: 'Visits today', value: '0', detail: 'No visits recorded yet' },
  { title: 'Stores visited', value: '0', detail: 'Start your first visit' },
  { title: 'Sampling', value: '0', detail: 'Customers sampled today' },
  { title: 'Stock alerts', value: '0', detail: 'No alerts recorded' },
];

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [visitOpen, setVisitOpen] = useState(false);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [visit, setVisit] = useState<VisitDraft>({ outletId: '', outletName: '', notes: '' });
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracyMeters: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState('Not captured');
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitMessage, setVisitMessage] = useState('');

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      return onAuthStateChanged(auth, setUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firebase configuration is missing.');
      return undefined;
    }
  }, []);

  async function handleSignIn() {
    setBusy(true); setError('');
    try { await signInWithPopup(getFirebaseAuth(), getGoogleProvider()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in with Google.'); }
    finally { setBusy(false); }
  }

  async function handleSignOut() {
    setBusy(true); setError('');
    try { await signOut(getFirebaseAuth()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign out.'); }
    finally { setBusy(false); }
  }

  async function openNewVisit() {
    setVisitOpen(true); setActiveNav('Visits'); setVisitMessage(''); setGps(null); setGpsStatus('Not captured');
    if (outlets.length === 0) {
      try {
        const snapshot = await getDocs(collection(getFirebaseDb(), 'outlets'));
        const loaded = snapshot.docs.map((doc) => ({ ...(doc.data() as Outlet), outletId: doc.id })).sort((a, b) => (a.outletName || '').localeCompare(b.outletName || ''));
        setOutlets(loaded);
      } catch (err) {
        setVisitMessage(err instanceof Error ? err.message : 'Unable to load stores.');
      }
    }
  }

  function captureGps() {
    if (!navigator.geolocation) { setGpsStatus('GPS is not supported on this device'); return; }
    setGpsStatus('Capturing…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({ lat: position.coords.latitude, lng: position.coords.longitude, accuracyMeters: Math.round(position.coords.accuracy) });
        setGpsStatus(`Captured ±${Math.round(position.coords.accuracy)}m`);
      },
      (err) => setGpsStatus(err.code === 1 ? 'Location permission denied' : 'Unable to capture location'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  async function saveVisit() {
    if (!visit.outletId) { setVisitMessage('Please select a store.'); return; }
    setSavingVisit(true); setVisitMessage('');
    try {
      await addDoc(collection(getFirebaseDb(), 'visits'), {
        outletId: visit.outletId,
        outletName: visit.outletName,
        repUid: user?.uid || '',
        repName: user?.displayName || user?.email || 'Field rep',
        status: 'STARTED',
        notes: visit.notes,
        gps: gps ? { lat: gps.lat, lng: gps.lng, accuracyMeters: gps.accuracyMeters, capturedAt: serverTimestamp() } : null,
        startedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setVisitMessage('Visit saved successfully.');
      setVisit({ outletId: '', outletName: '', notes: '' });
      setGps(null); setGpsStatus('Not captured');
    } catch (err) {
      setVisitMessage(err instanceof Error ? err.message : 'Unable to save visit.');
    } finally { setSavingVisit(false); }
  }

  if (!user) return <LoginScreen busy={busy} error={error} onSignIn={handleSignIn} />;

  return <div style={styles.app}>
    <style jsx global>{`
      @media (max-width: 760px) {
        .retailops-sidebar { display: none !important; }
        .retailops-main { margin-left: 0 !important; width: 100% !important; padding: 18px 16px 86px !important; }
        .retailops-header { margin-bottom: 20px !important; }
        .retailops-mobile-brand { display: block !important; font-size: 10px; font-weight: 800; letter-spacing: 1.7px; margin-bottom: 4px; }
        .retailops-header-user { display: none !important; }
        .retailops-bottom-nav { display: grid !important; grid-template-columns: repeat(5, 1fr); position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; background: rgba(255,255,255,.98); border-top: 1px solid #e7e5e0; padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); box-sizing: border-box; box-shadow: 0 -4px 18px rgba(0,0,0,.06); }
        .retailops-bottom-button { min-width: 0; }
        .retailops-welcome { flex-direction: column !important; align-items: flex-start !important; }
        .retailops-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 420px) { .retailops-kpis { grid-template-columns: 1fr !important; } }
    `}</style>
    <aside className="retailops-sidebar" style={styles.sidebar}>
      <Brand />
      <nav style={styles.sideNav} aria-label="Main navigation">{navItems.map((item) => <NavButton key={item.label} item={item} active={activeNav === item.label} onClick={() => { setActiveNav(item.label); if (item.label !== 'Visits') setVisitOpen(false); }} />)}</nav>
      <div style={styles.sidebarBottom}><UserCard user={user} /><button onClick={handleSignOut} disabled={busy} style={styles.signOutButton}>{busy ? 'Signing out…' : 'Sign out'}</button></div>
    </aside>
    <main className="retailops-main" style={styles.main}>
      <header className="retailops-header" style={styles.header}>
        <div><div className="retailops-mobile-brand" style={styles.mobileBrand}>KWE & COLE</div><h1 style={styles.pageTitle}>{activeNav}</h1><p style={styles.pageSubtitle}>Retail field operations at a glance.</p></div>
        <div className="retailops-header-user" style={styles.headerUser}><span>{user.displayName || user.email || 'Signed-in user'}</span><button onClick={handleSignOut} disabled={busy} style={styles.headerSignOut}>{busy ? '…' : 'Sign out'}</button></div>
      </header>
      {activeNav === 'Dashboard' && <Dashboard onNewVisit={openNewVisit} />}
      {activeNav === 'Stores' && <StoresSection />}
      {activeNav === 'Visits' && (visitOpen ? <VisitEntry outlets={outlets} visit={visit} setVisit={setVisit} gpsStatus={gpsStatus} onCaptureGps={captureGps} onSave={saveVisit} saving={savingVisit} message={visitMessage} onClose={() => setVisitOpen(false)} /> : <VisitsLanding onNewVisit={openNewVisit} />)}
      {activeNav !== 'Dashboard' && activeNav !== 'Stores' && activeNav !== 'Visits' && <PlaceholderSection title={activeNav} />}
    </main>
    <nav className="retailops-bottom-nav" style={styles.bottomNav} aria-label="Mobile navigation">{navItems.slice(0, 5).map((item) => <button className="retailops-bottom-button" key={item.label} onClick={() => { setActiveNav(item.label); if (item.label !== 'Visits') setVisitOpen(false); }} style={{ ...styles.bottomNavButton, ...(activeNav === item.label ? styles.bottomNavButtonActive : {}) }}><span style={styles.bottomIcon}>{item.icon}</span><span>{item.label}</span></button>)}</nav>
  </div>;
}

function LoginScreen({ busy, error, onSignIn }: { busy: boolean; error: string; onSignIn: () => void }) { return <main style={styles.loginPage}><section style={styles.loginCard}><div style={styles.eyebrow}>KWE & COLE</div><h1 style={styles.loginTitle}>RetailOps</h1><p style={styles.loginText}>Retail field operations, visits, stock and store activity in one place.</p><button onClick={onSignIn} disabled={busy} style={styles.googleButton}>{busy ? 'Signing in…' : 'Continue with Google'}</button>{error && <div role="alert" style={styles.error}>{error}</div>}</section></main>; }
function Dashboard({ onNewVisit }: { onNewVisit: () => void }) { return <div><section className="retailops-welcome" style={styles.welcomeCard}><div><div style={styles.eyebrow}>FIELD OPERATIONS</div><h2 style={styles.welcomeTitle}>Good to see you.</h2><p style={styles.welcomeText}>Your RetailOps workspace is ready. Start by recording a store visit.</p></div><button onClick={onNewVisit} style={styles.primaryButton}>+ New Visit</button></section><section className="retailops-kpis" style={styles.kpiGrid}>{activity.map((item) => <article key={item.title} style={styles.kpiCard}><div style={styles.kpiLabel}>{item.title}</div><div style={styles.kpiValue}>{item.value}</div><div style={styles.kpiDetail}>{item.detail}</div></article>)}</section><section style={styles.sectionCard}><div style={styles.sectionHeader}><div><h2 style={styles.sectionTitle}>Today&apos;s activity</h2><p style={styles.sectionSubtitle}>Visit and store activity will appear here.</p></div><span style={styles.statusPill}>Ready</span></div><div style={styles.emptyState}><div style={styles.emptyIcon}>✓</div><strong>No activity recorded yet</strong><span>Once field reps begin visits, their activity will show here.</span></div></section></div>; }
function VisitsLanding({ onNewVisit }: { onNewVisit: () => void }) { return <section style={styles.sectionCard}><div style={styles.sectionHeader}><div><h2 style={styles.sectionTitle}>Store visits</h2><p style={styles.sectionSubtitle}>Start a field visit and capture the store, rep and GPS.</p></div><button onClick={onNewVisit} style={styles.darkButton}>+ New Visit</button></div><div style={styles.emptyState}><div style={styles.emptyIcon}>✓</div><strong>No visits recorded yet</strong><span>Your completed and active visits will appear here.</span></div></section>; }
function VisitEntry({ outlets, visit, setVisit, gpsStatus, onCaptureGps, onSave, saving, message, onClose }: { outlets: Outlet[]; visit: VisitDraft; setVisit: React.Dispatch<React.SetStateAction<VisitDraft>>; gpsStatus: string; onCaptureGps: () => void; onSave: () => void; saving: boolean; message: string; onClose: () => void }) {
  return <section style={styles.sectionCard}>
    <div style={styles.sectionHeader}><div><div style={styles.eyebrow}>VISIT ENTRY</div><h2 style={styles.sectionTitle}>Start a store visit</h2><p style={styles.sectionSubtitle}>Record the visit first; stock, sampling and feedback can be added next.</p></div><button onClick={onClose} style={styles.secondaryButton}>Back</button></div>
    <div style={styles.formGrid}>
      <label style={styles.field}><span style={styles.fieldLabel}>Store</span><select value={visit.outletId} onChange={(e) => { const selected = outlets.find((o) => o.outletId === e.target.value); setVisit({ ...visit, outletId: e.target.value, outletName: selected?.outletName || selected?.branch || e.target.value }); }} style={styles.input}><option value="">Select a store</option>{outlets.map((outlet) => <option key={outlet.outletId} value={outlet.outletId}>{outlet.outletName || outlet.branch || outlet.outletId}{outlet.retailer ? ` — ${outlet.retailer}` : ''}</option>)}</select></label>
      <div style={styles.infoBox}><span style={styles.fieldLabel}>Field rep</span><strong>Signed-in user</strong><span style={styles.muted}>{visit.outletName ? 'Ready to start visit' : 'Select a store first'}</span></div>
      <div style={styles.infoBox}><span style={styles.fieldLabel}>GPS location</span><strong>{gpsStatus}</strong><button type="button" onClick={onCaptureGps} style={styles.smallButton}>Capture GPS</button></div>
      <label style={{ ...styles.field, gridColumn: '1 / -1' }}><span style={styles.fieldLabel}>Notes</span><textarea value={visit.notes} onChange={(e) => setVisit({ ...visit, notes: e.target.value })} placeholder="Optional visit notes" rows={4} style={styles.textarea} /></label>
    </div>
    {message && <div style={styles.message}>{message}</div>}
    <div style={styles.formActions}><button onClick={onClose} style={styles.secondaryButton}>Cancel</button><button onClick={onSave} disabled={saving} style={styles.darkButton}>{saving ? 'Saving…' : 'Start & Save Visit'}</button></div>
  </section>;
}
function PlaceholderSection({ title }: { title: string }) { return <section style={styles.sectionCard}><div style={styles.emptyState}><div style={styles.emptyIcon}>+</div><strong>{title} is next</strong><span>This section is part of the RetailOps shell. We&apos;ll connect it to Firestore in the next development steps.</span></div></section>; }
function Brand() { return <div style={styles.brand}><div style={styles.brandEyebrow}>KWE & COLE</div><div style={styles.brandName}>RetailOps</div></div>; }
function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) { return <button onClick={onClick} style={{ ...styles.navButton, ...(active ? styles.navButtonActive : {}) }}><span style={styles.navIcon}>{item.icon}</span><span>{item.label}</span></button>; }
function UserCard({ user }: { user: User }) { return <div style={styles.userCard}><div style={styles.avatar}>{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</div><div style={{ minWidth: 0 }}><div style={styles.userName}>{user.displayName || 'Signed-in user'}</div><div style={styles.userEmail}>{user.email}</div></div></div>; }
const styles: Record<string, React.CSSProperties> = {
  app: { minHeight: '100vh', background: '#f7f7f5', color: '#171717', display: 'flex' }, sidebar: { width: 240, background: '#fff', borderRight: '1px solid #e7e5e0', padding: 22, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'fixed', inset: '0 auto 0 0', zIndex: 10 }, brand: { padding: '6px 10px 28px' }, brandEyebrow: { fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 4 }, brandName: { fontSize: 23, fontWeight: 800, letterSpacing: -0.8 }, sideNav: { display: 'grid', gap: 5 }, navButton: { appearance: 'none', border: 0, background: 'transparent', borderRadius: 10, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#5f5d58', cursor: 'pointer' }, navButtonActive: { background: '#171717', color: '#fff' }, navIcon: { width: 20, textAlign: 'center', fontSize: 16 }, sidebarBottom: { marginTop: 'auto' }, userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px', borderTop: '1px solid #eee' }, avatar: { width: 34, height: 34, borderRadius: 10, background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }, userName: { fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, userEmail: { fontSize: 10, color: '#777', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }, signOutButton: { width: '100%', border: '1px solid #ddd', background: '#fff', borderRadius: 9, padding: '9px 12px', fontWeight: 600, cursor: 'pointer' }, main: { marginLeft: 240, width: 'calc(100% - 240px)', minHeight: '100vh', padding: '36px 42px 48px', boxSizing: 'border-box' }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }, mobileBrand: { display: 'none' }, pageTitle: { fontSize: 30, margin: 0, letterSpacing: -1 }, pageSubtitle: { color: '#777', margin: '6px 0 0', fontSize: 14 }, headerUser: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#555' }, headerSignOut: { border: '1px solid #ddd', background: '#fff', borderRadius: 9, padding: '8px 11px', cursor: 'pointer' }, welcomeCard: { background: '#171717', color: '#fff', borderRadius: 18, padding: '28px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 18 }, welcomeTitle: { fontSize: 25, margin: '6px 0', letterSpacing: -0.7 }, welcomeText: { margin: 0, color: '#d2d2d2', fontSize: 14 }, primaryButton: { border: 0, borderRadius: 10, background: '#fff', color: '#171717', padding: '12px 17px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }, darkButton: { border: 0, borderRadius: 10, background: '#171717', color: '#fff', padding: '12px 17px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }, secondaryButton: { border: '1px solid #ddd', borderRadius: 10, background: '#fff', color: '#333', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }, smallButton: { border: '1px solid #ddd', borderRadius: 9, background: '#fff', color: '#333', padding: '8px 10px', fontWeight: 700, cursor: 'pointer', marginTop: 8, alignSelf: 'flex-start' }, kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }, kpiCard: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 15, padding: 19 }, kpiLabel: { color: '#777', fontSize: 12, fontWeight: 700 }, kpiValue: { fontSize: 30, fontWeight: 800, margin: '9px 0 4px', letterSpacing: -1 }, kpiDetail: { color: '#999', fontSize: 11 }, sectionCard: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 15, padding: 22 }, sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }, sectionTitle: { margin: 0, fontSize: 19 }, sectionSubtitle: { margin: '5px 0 0', color: '#888', fontSize: 12 }, statusPill: { borderRadius: 20, padding: '5px 9px', background: '#f0f0ed', fontSize: 10, fontWeight: 800 }, emptyState: { minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#777', textAlign: 'center' }, emptyIcon: { width: 38, height: 38, borderRadius: 12, background: '#f1f1ee', display: 'grid', placeItems: 'center', color: '#555', fontWeight: 800 }, loginPage: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f7f7f5', boxSizing: 'border-box' }, loginCard: { width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 12px 40px rgba(0,0,0,.08)', boxSizing: 'border-box' }, eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: 1.7 }, loginTitle: { fontSize: 32, margin: '8px 0 10px', letterSpacing: -1 }, loginText: { color: '#666', lineHeight: 1.5, marginBottom: 28 }, googleButton: { width: '100%', border: 0, borderRadius: 12, padding: '14px 16px', background: '#171717', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }, error: { marginTop: 16, padding: 12, borderRadius: 10, background: '#fff3f3', color: '#a40000', fontSize: 13, lineHeight: 1.45 }, bottomNav: { display: 'none' }, bottomNavButton: { border: 0, background: 'transparent', color: '#777', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 9, padding: '7px 2px', fontWeight: 600 }, bottomNavButtonActive: { color: '#171717', fontWeight: 800 }, bottomIcon: { fontSize: 17, lineHeight: 1 }, formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }, field: { display: 'flex', flexDirection: 'column', gap: 7 }, fieldLabel: { fontSize: 11, color: '#777', fontWeight: 800, textTransform: 'uppercase', letterSpacing: .7 }, input: { width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 10, padding: '12px 13px', background: '#fff', fontSize: 14 }, textarea: { width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 10, padding: '12px 13px', background: '#fff', fontSize: 14, resize: 'vertical' }, infoBox: { border: '1px solid #e7e5e0', borderRadius: 11, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 78, boxSizing: 'border-box' }, muted: { color: '#999', fontSize: 11 }, formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }, message: { marginTop: 16, padding: 12, borderRadius: 10, background: '#f4f4f1', color: '#333', fontSize: 13 }
};