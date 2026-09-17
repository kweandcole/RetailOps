'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase/client';

type NavItem = {
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: '⌂' },
  { label: 'Visits', icon: '✓' },
  { label: 'Stores', icon: '▣' },
  { label: 'Sampling', icon: '◎' },
  { label: 'Stock', icon: '▤' },
  { label: 'Orders', icon: '▱' },
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
    setBusy(true);
    setError('');
    try {
      await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError('');
    try {
      await signOut(getFirebaseAuth());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out.');
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return <LoginScreen busy={busy} error={error} onSignIn={handleSignIn} />;
  }

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <Brand />
        <nav style={styles.sideNav} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavButton
              key={item.label}
              item={item}
              active={activeNav === item.label}
              onClick={() => setActiveNav(item.label)}
            />
          ))}
        </nav>
        <div style={styles.sidebarBottom}>
          <UserCard user={user} />
          <button onClick={handleSignOut} disabled={busy} style={styles.signOutButton}>
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.mobileBrand}>KWE & COLE</div>
            <h1 style={styles.pageTitle}>{activeNav}</h1>
            <p style={styles.pageSubtitle}>Retail field operations at a glance.</p>
          </div>
          <div style={styles.headerUser}>
            <span>{user.displayName || user.email || 'Signed-in user'}</span>
            <button onClick={handleSignOut} disabled={busy} style={styles.headerSignOut}>
              {busy ? '…' : 'Sign out'}
            </button>
          </div>
        </header>

        {activeNav === 'Dashboard' ? (
          <Dashboard />
        ) : (
          <PlaceholderSection title={activeNav} />
        )}
      </main>

      <nav style={styles.bottomNav} aria-label="Mobile navigation">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.label}
            onClick={() => setActiveNav(item.label)}
            style={{ ...styles.bottomNavButton, ...(activeNav === item.label ? styles.bottomNavButtonActive : {}) }}
          >
            <span style={styles.bottomIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function LoginScreen({
  busy,
  error,
  onSignIn,
}: {
  busy: boolean;
  error: string;
  onSignIn: () => void;
}) {
  return (
    <main style={styles.loginPage}>
      <section style={styles.loginCard}>
        <div style={styles.eyebrow}>KWE & COLE</div>
        <h1 style={styles.loginTitle}>RetailOps</h1>
        <p style={styles.loginText}>Retail field operations, visits, stock and store activity in one place.</p>
        <button onClick={onSignIn} disabled={busy} style={styles.googleButton}>
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
        {error && <div role="alert" style={styles.error}>{error}</div>}
      </section>
    </main>
  );
}

function Dashboard() {
  return (
    <div>
      <section style={styles.welcomeCard}>
        <div>
          <div style={styles.eyebrow}>FIELD OPERATIONS</div>
          <h2 style={styles.welcomeTitle}>Good to see you.</h2>
          <p style={styles.welcomeText}>Your RetailOps workspace is ready. Start by recording a store visit.</p>
        </div>
        <button style={styles.primaryButton} onClick={() => undefined}>+ New Visit</button>
      </section>

      <section style={styles.kpiGrid}>
        {activity.map((item) => (
          <article key={item.title} style={styles.kpiCard}>
            <div style={styles.kpiLabel}>{item.title}</div>
            <div style={styles.kpiValue}>{item.value}</div>
            <div style={styles.kpiDetail}>{item.detail}</div>
          </article>
        ))}
      </section>

      <section style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Today&apos;s activity</h2>
            <p style={styles.sectionSubtitle}>Visit and store activity will appear here.</p>
          </div>
          <span style={styles.statusPill}>Ready</span>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✓</div>
          <strong>No activity recorded yet</strong>
          <span>Once field reps begin visits, their activity will show here.</span>
        </div>
      </section>
    </div>
  );
}

function PlaceholderSection({ title }: { title: string }) {
  return (
    <section style={styles.sectionCard}>
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>+</div>
        <strong>{title} is next</strong>
        <span>This section is part of the RetailOps shell. We&apos;ll connect it to Firestore in the next development steps.</span>
      </div>
    </section>
  );
}

function Brand() {
  return (
    <div style={styles.brand}>
      <div style={styles.brandEyebrow}>KWE & COLE</div>
      <div style={styles.brandName}>RetailOps</div>
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...styles.navButton, ...(active ? styles.navButtonActive : {}) }}>
      <span style={styles.navIcon}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <div style={styles.userCard}>
      <div style={styles.avatar}>{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</div>
      <div style={{ minWidth: 0 }}>
        <div style={styles.userName}>{user.displayName || 'Signed-in user'}</div>
        <div style={styles.userEmail}>{user.email}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: { minHeight: '100vh', background: '#f7f7f5', color: '#171717', display: 'flex' },
  sidebar: { width: 240, background: '#fff', borderRight: '1px solid #e7e5e0', padding: 22, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'fixed', inset: '0 auto 0 0', zIndex: 10 },
  brand: { padding: '6px 10px 28px' },
  brandEyebrow: { fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 4 },
  brandName: { fontSize: 23, fontWeight: 800, letterSpacing: -0.8 },
  sideNav: { display: 'grid', gap: 5 },
  navButton: { appearance: 'none', border: 0, background: 'transparent', borderRadius: 10, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#5f5d58', cursor: 'pointer' },
  navButtonActive: { background: '#171717', color: '#fff' },
  navIcon: { width: 20, textAlign: 'center', fontSize: 16 },
  sidebarBottom: { marginTop: 'auto' },
  userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px', borderTop: '1px solid #eee' },
  avatar: { width: 34, height: 34, borderRadius: 10, background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 },
  userName: { fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userEmail: { fontSize: 10, color: '#777', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 },
  signOutButton: { width: '100%', border: '1px solid #ddd', background: '#fff', borderRadius: 9, padding: '9px 12px', fontWeight: 600, cursor: 'pointer' },
  main: { marginLeft: 240, width: 'calc(100% - 240px)', minHeight: '100vh', padding: '36px 42px 48px', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  mobileBrand: { display: 'none' },
  pageTitle: { fontSize: 30, margin: 0, letterSpacing: -1 },
  pageSubtitle: { color: '#777', margin: '6px 0 0', fontSize: 14 },
  headerUser: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#555' },
  headerSignOut: { border: '1px solid #ddd', background: '#fff', borderRadius: 9, padding: '8px 11px', cursor: 'pointer' },
  welcomeCard: { background: '#171717', color: '#fff', borderRadius: 18, padding: '28px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 18 },
  welcomeTitle: { fontSize: 25, margin: '6px 0', letterSpacing: -0.7 },
  welcomeText: { margin: 0, color: '#d2d2d2', fontSize: 14 },
  primaryButton: { border: 0, borderRadius: 10, background: '#fff', color: '#171717', padding: '12px 17px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 },
  kpiCard: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 15, padding: 19 },
  kpiLabel: { color: '#777', fontSize: 12, fontWeight: 700 },
  kpiValue: { fontSize: 30, fontWeight: 800, margin: '9px 0 4px', letterSpacing: -1 },
  kpiDetail: { color: '#999', fontSize: 11 },
  sectionCard: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 15, padding: 22 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  sectionTitle: { margin: 0, fontSize: 17 },
  sectionSubtitle: { margin: '5px 0 0', color: '#888', fontSize: 12 },
  statusPill: { borderRadius: 20, padding: '5px 9px', background: '#f0f0ed', fontSize: 10, fontWeight: 800 },
  emptyState: { minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#777', textAlign: 'center' },
  emptyIcon: { width: 38, height: 38, borderRadius: 12, background: '#f1f1ee', display: 'grid', placeItems: 'center', color: '#555', fontWeight: 800, marginBottom: 4 },
  loginPage: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f7f7f5', boxSizing: 'border-box' },
  loginCard: { width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 12px 40px rgba(0,0,0,.08)', boxSizing: 'border-box' },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: 1.7 },
  loginTitle: { fontSize: 32, margin: '8px 0 10px', letterSpacing: -1 },
  loginText: { color: '#666', lineHeight: 1.5, marginBottom: 28 },
  googleButton: { width: '100%', border: 0, borderRadius: 12, padding: '14px 16px', background: '#171717', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  error: { marginTop: 16, padding: 12, borderRadius: 10, background: '#fff3f3', color: '#a40000', fontSize: 13, lineHeight: 1.45 },
  bottomNav: { display: 'none' },
  bottomNavButton: { border: 0, background: 'transparent', color: '#777', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 9, padding: '7px 2px', fontWeight: 600 },
  bottomNavButtonActive: { color: '#171717', fontWeight: 800 },
  bottomIcon: { fontSize: 17, lineHeight: 1 },
};
