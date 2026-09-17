'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase/client';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 12px 40px rgba(0,0,0,.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Kwe & Cole</div>
        <h1 style={{ fontSize: 32, margin: '0 0 10px' }}>RetailOps</h1>
        <p style={{ color: '#666', lineHeight: 1.5, marginBottom: 28 }}>
          Retail field operations, visits, stock and store activity in one place.
        </p>

        {user ? (
          <>
            <div style={{ border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <strong>{user.displayName || 'Signed-in user'}</strong>
              <div style={{ color: '#666', marginTop: 4, fontSize: 14 }}>{user.email}</div>
            </div>
            <button onClick={handleSignOut} disabled={busy} style={buttonStyle}>
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
          </>
        ) : (
          <button onClick={handleSignIn} disabled={busy} style={buttonStyle}>
            {busy ? 'Signing in…' : 'Continue with Google'}
          </button>
        )}

        {error && (
          <div role="alert" style={{ marginTop: 16, padding: 12, borderRadius: 10, background: '#fff3f3', color: '#a40000', fontSize: 13, lineHeight: 1.45 }}>
            {error}
          </div>
        )}
      </section>
    </main>
  );
}

const buttonStyle = {
  width: '100%',
  border: 0,
  borderRadius: 12,
  padding: '14px 16px',
  background: '#171717',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
};
