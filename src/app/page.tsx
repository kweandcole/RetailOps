'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, getDocs, addDoc, updateDoc, doc, setDoc, writeBatch, serverTimestamp, query, where } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, getGoogleProvider } from '@/lib/firebase/client';
import StoresSection from '@/components/stores/stores-section';

type NavItem = { label: string; icon: string };
type Outlet = { outletId: string; outletName?: string; retailer?: string; city?: string; branch?: string };
type VisitDraft = { outletId: string; outletName: string; notes: string };
type ChecklistKey = 'displayPresent' | 'productsWellDisplayed' | 'priceVisible' | 'staffEngaged' | 'competitorActivity';
type VisitChecklist = Record<ChecklistKey, boolean | null>;
type VisitReasons = Record<ChecklistKey, string>;
type StockEntry = { sku: string; productName: string; shelfStock: string; backStock: string; };
type ExpiryEntry = { sku: string; productName: string; hasExpiryConcern: boolean | null; quantity: string; expiryDate: string; };
type SamplingDraft = {
  conducted: boolean | null;
  customersSampled: string;
  bottlesSoldBySku: Record<string, string>;
  feedback: string;
  reason: string;
};
type VisitMode = 'STANDARD' | 'SAMPLING_ONLY';
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
  const [visitMode, setVisitMode] = useState<VisitMode>('STANDARD');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [visit, setVisit] = useState<VisitDraft>({ outletId: '', outletName: '', notes: '' });
  const [visitStep, setVisitStep] = useState(1);
  const [checklist, setChecklist] = useState<VisitChecklist>({
    displayPresent: null, productsWellDisplayed: null, priceVisible: null, staffEngaged: null, competitorActivity: null,
  });
  const [checklistReasons, setChecklistReasons] = useState<VisitReasons>({
    displayPresent: '', productsWellDisplayed: '', priceVisible: '', staffEngaged: '', competitorActivity: '',
  });
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracyMeters: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState('Not captured');
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitMessage, setVisitMessage] = useState('');
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [activeVisitStartedAt, setActiveVisitStartedAt] = useState<Date | null>(null);
  const [activeVisitElapsedSeconds, setActiveVisitElapsedSeconds] = useState(0);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([
    { sku: 'SKU-001', productName: 'Honey Habanero Hot Sauce', shelfStock: '', backStock: '' },
    { sku: 'SKU-002', productName: 'Hot Honey', shelfStock: '', backStock: '' },
    { sku: 'SKU-003', productName: 'Jalapeno Lime Hot Sauce', shelfStock: '', backStock: '' },
    { sku: 'SKU-004', productName: 'Mango Pineapple Habanero Hot Sauce', shelfStock: '', backStock: '' },
  ]);

  const [expiryEntries, setExpiryEntries] = useState<ExpiryEntry[]>([
    { sku: 'SKU-001', productName: 'Honey Habanero Hot Sauce', hasExpiryConcern: null, quantity: '', expiryDate: '' },
    { sku: 'SKU-002', productName: 'Hot Honey', hasExpiryConcern: null, quantity: '', expiryDate: '' },
    { sku: 'SKU-003', productName: 'Jalapeno Lime Hot Sauce', hasExpiryConcern: null, quantity: '', expiryDate: '' },
    { sku: 'SKU-004', productName: 'Mango Pineapple Habanero Hot Sauce', hasExpiryConcern: null, quantity: '', expiryDate: '' },
  ]);

  const [sampling, setSampling] = useState<SamplingDraft>({
    conducted: null,
    customersSampled: '',
    bottlesSoldBySku: { 'SKU-001': '', 'SKU-002': '', 'SKU-003': '', 'SKU-004': '' },
    feedback: '',
    reason: '',
  });
  const [samplingClosingSales, setSamplingClosingSales] = useState<Record<string, string>>({
    'SKU-001': '', 'SKU-002': '', 'SKU-003': '', 'SKU-004': '',
  });
  const [samplingClosingCustomers, setSamplingClosingCustomers] = useState('');
  const [samplingOrderPlaced, setSamplingOrderPlaced] = useState<boolean | null>(null);
  const [samplingOrderNotes, setSamplingOrderNotes] = useState('');  useEffect(() => {
    if (!activeVisitStartedAt) {
      setActiveVisitElapsedSeconds(0);
      return;
    }
    const tick = () => setActiveVisitElapsedSeconds(Math.max(0, Math.floor((Date.now() - activeVisitStartedAt.getTime()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeVisitStartedAt]);

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
    setVisitMode('STANDARD');
    setVisitOpen(true); setActiveNav('Visits'); setVisitMessage(''); setGps(null); setGpsStatus('Not captured'); setVisitStep(1);
    setChecklist({ displayPresent: null, productsWellDisplayed: null, priceVisible: null, staffEngaged: null, competitorActivity: null });
    setChecklistReasons({ displayPresent: '', productsWellDisplayed: '', priceVisible: '', staffEngaged: '', competitorActivity: '' });
    setStockEntries([
      { sku: 'SKU-001', productName: 'Honey Habanero Hot Sauce', shelfStock: '', backStock: '' },
      { sku: 'SKU-002', productName: 'Hot Honey', shelfStock: '', backStock: '' },
      { sku: 'SKU-003', productName: 'Jalapeno Lime Hot Sauce', shelfStock: '', backStock: '' },
      { sku: 'SKU-004', productName: 'Mango Pineapple Habanero Hot Sauce', shelfStock: '', backStock: '' },
    ]);
    setSampling({
      conducted: null,
      customersSampled: '',
      bottlesSoldBySku: { 'SKU-001': '', 'SKU-002': '', 'SKU-003': '', 'SKU-004': '' },
      feedback: '',
      reason: '',
    });
    if (outlets.length === 0) {
      try {
        const snapshot = await getDocs(collection(getFirebaseDb(), 'outlets'));
        const loaded = snapshot.docs.map((doc) => ({ ...(doc.data() as Outlet), outletId: doc.id })).sort((a, b) => (a.retailer || '').localeCompare(b.retailer || '') || (a.branch || a.outletName || '').localeCompare(b.branch || b.outletName || ''));
        setOutlets(loaded);
      } catch (err) {
        setVisitMessage(err instanceof Error ? err.message : 'Unable to load stores.');
      }
    }
  }

  async function openSamplingVisit() {
    setVisitMode('SAMPLING_ONLY');
    setVisitOpen(true);
    setActiveNav('Visits');
    setVisitMessage('');
    setGps(null);
    setGpsStatus('Not captured');
    setVisitStep(1);
    setVisit({ outletId: '', outletName: '', notes: '' });
    setStockEntries([
      { sku: 'SKU-001', productName: 'Honey Habanero Hot Sauce', shelfStock: '', backStock: '' },
      { sku: 'SKU-002', productName: 'Hot Honey', shelfStock: '', backStock: '' },
      { sku: 'SKU-003', productName: 'Jalapeno Lime Hot Sauce', shelfStock: '', backStock: '' },
      { sku: 'SKU-004', productName: 'Mango Pineapple Habanero Hot Sauce', shelfStock: '', backStock: '' },
    ]);
    setSamplingClosingSales({ 'SKU-001': '', 'SKU-002': '', 'SKU-003': '', 'SKU-004': '' });
    setSamplingClosingCustomers('');
    setSamplingOrderPlaced(null);
    setSamplingOrderNotes('');
    if (outlets.length === 0) {
      try {
        const snapshot = await getDocs(collection(getFirebaseDb(), 'outlets'));
        const loaded = snapshot.docs.map((doc) => ({ ...(doc.data() as Outlet), outletId: doc.id })).sort((a, b) => (a.retailer || '').localeCompare(b.retailer || '') || (a.branch || a.outletName || '').localeCompare(b.branch || b.outletName || ''));
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

  async function startSamplingVisit() {
    if (!visit.outletId) { setVisitMessage('Please select a store.'); return; }
    const hasInvalid = stockEntries.some((entry) =>
      (entry.shelfStock !== '' && (!Number.isInteger(Number(entry.shelfStock)) || Number(entry.shelfStock) < 0)) ||
      (entry.backStock !== '' && (!Number.isInteger(Number(entry.backStock)) || Number(entry.backStock) < 0))
    );
    if (hasInvalid) { setVisitMessage('Opening stock quantities must be whole numbers of 0 or more.'); return; }
    setSavingVisit(true); setVisitMessage('');
    try {
      const openingStock = stockEntries.map((entry) => ({
        sku: entry.sku,
        productName: entry.productName,
        shelfStock: entry.shelfStock === '' ? 0 : Number(entry.shelfStock),
        backStock: entry.backStock === '' ? 0 : Number(entry.backStock),
        totalStock: (entry.shelfStock === '' ? 0 : Number(entry.shelfStock)) + (entry.backStock === '' ? 0 : Number(entry.backStock)),
      }));
      const visitRef = await addDoc(collection(getFirebaseDb(), 'visits'), {
        visitType: 'SAMPLING_ONLY',
        outletId: visit.outletId,
        outletName: visit.outletName,
        repUid: user?.uid || '',
        repName: user?.displayName || user?.email || 'Field rep',
        status: 'STARTED',
        notes: visit.notes,
        gps: gps ? { lat: gps.lat, lng: gps.lng, accuracyMeters: gps.accuracyMeters, capturedAt: serverTimestamp() } : null,
        openingStock,
        sampling: { conducted: true, customersSampled: 0, bottlesSold: 0, bottlesSoldBySku: {}, feedback: '', reason: '' },
        startedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setActiveVisitId(visitRef.id);
      const startedAt = new Date();
      setActiveVisitStartedAt(startedAt);
      setActiveVisitElapsedSeconds(0);
      setVisitStep(2);
      setVisitMessage('Sampling visit started. Complete the sampling activity, then record the bottles sold before completing the visit.');
    } catch (err) {
      setVisitMessage(err instanceof Error ? err.message : 'Unable to start sampling visit.');
    } finally { setSavingVisit(false); }
  }

  async function startVisit() {
    if (!visit.outletId) { setVisitMessage('Please select a store.'); return; }
    setSavingVisit(true); setVisitMessage('');
    try {
      const visitRef = await addDoc(collection(getFirebaseDb(), 'visits'), {
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
      setActiveVisitId(visitRef.id);
      const startedAt = new Date();
      setActiveVisitStartedAt(startedAt);
      setActiveVisitElapsedSeconds(0);
      setVisitStep(2);
      setVisitMessage('Visit started. Complete the checklist and the other visit tasks before stopping the visit.');
    } catch (err) {
      setVisitMessage(err instanceof Error ? err.message : 'Unable to start visit.');
    } finally { setSavingVisit(false); }
  }

  async function saveChecklist() {
    if (!activeVisitId) { setVisitMessage('Start the visit before saving the checklist.'); return; }
    const items: ChecklistKey[] = ['displayPresent', 'productsWellDisplayed', 'priceVisible', 'staffEngaged', 'competitorActivity'];
    if (items.some((key) => checklist[key] === null)) {
      setVisitMessage('Please answer all checklist questions before continuing.');
      return;
    }
    const missingReason = items.find((key) => checklist[key] === false && !checklistReasons[key].trim());
    if (missingReason) {
      setVisitMessage('Please enter a reason for every answer marked No.');
      return;
    }
    setSavingVisit(true); setVisitMessage('');
    try {
      await updateDoc(doc(getFirebaseDb(), 'visits', activeVisitId), {
        checklist,
        checklistReasons,
        notes: visit.notes,
        updatedAt: serverTimestamp(),
      });
      setVisitStep(3);
      setVisitMessage('Checklist saved. The visit is still active.');
    } catch (err) {
      setVisitMessage(err instanceof Error ? err.message : 'Unable to save checklist.');
    } finally { setSavingVisit(false); }
  }

  async function saveStock() {
    if (!activeVisitId) { setVisitMessage('Start the visit before saving stock.'); return; }
    const hasInvalid = stockEntries.some((entry) => entry.shelfStock !== '' && (!Number.isInteger(Number(entry.shelfStock)) || Number(entry.shelfStock) < 0) || entry.backStock !== '' && (!Number.isInteger(Number(entry.backStock)) || Number(entry.backStock) < 0));
    if (hasInvalid) { setVisitMessage('Stock quantities must be whole numbers of 0 or more.'); return; }
    setSavingVisit(true); setVisitMessage('');
    try {
      const stock = stockEntries.map((entry) => ({
        sku: entry.sku,
        productName: entry.productName,
        shelfStock: entry.shelfStock === '' ? 0 : Number(entry.shelfStock),
        backStock: entry.backStock === '' ? 0 : Number(entry.backStock),
        totalStock: (entry.shelfStock === '' ? 0 : Number(entry.shelfStock)) + (entry.backStock === '' ? 0 : Number(entry.backStock)),
        outOfStock: (entry.shelfStock === '' ? 0 : Number(entry.shelfStock)) + (entry.backStock === '' ? 0 : Number(entry.backStock)) === 0,
      }));
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      batch.update(doc(db, 'visits', activeVisitId), {
        stock,
        updatedAt: serverTimestamp(),
      });
      for (const item of stock) {
        batch.set(doc(db, 'stock', `${visit.outletId}_${item.sku}`), {
          outletId: visit.outletId,
          outletName: visit.outletName,
          sku: item.sku,
          productName: item.productName,
          quantity: item.totalStock,
          source: 'VISIT_STOCK_COUNT',
          visitId: activeVisitId,
          repUid: user?.uid || '',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();
      setVisitStep(4);
      setVisitMessage('Stock saved. The visit is still active.');
    } catch (err) {
      setVisitMessage(err instanceof Error ? err.message : 'Unable to save stock.');
    } finally { setSavingVisit(false); }
  }

  async function saveExpiry() {
    if (!activeVisitId) { setVisitMessage('Start the visit before saving expiry information.'); return; }
    const invalid = expiryEntries.some((entry) =>
      entry.hasExpiryConcern === true &&
      (!entry.quantity || !Number.isInteger(Number(entry.quantity)) || Number(entry.quantity) < 0 || !entry.expiryDate)
    );
    if (invalid) {
      setVisitMessage('For each expiry concern, enter the affected quantity and expiry date.');
      return;
    }
    setSavingVisit(true); setVisitMessage('');
    try {
      const expiry = expiryEntries
        .filter((entry) => entry.hasExpiryConcern !== null)
        .map((entry) => ({
          sku: entry.sku,
          productName: entry.productName,
          hasExpiryConcern: entry.hasExpiryConcern,
          quantity: entry.hasExpiryConcern ? Number(entry.quantity) : 0,
          expiryDate: entry.hasExpiryConcern ? entry.expiryDate : null,
        }));
      await updateDoc(doc(getFirebaseDb(), 'visits', activeVisitId), {
        expiry,
        updatedAt: serverTimestamp(),
      });
      setVisitStep(5);
      setVisitMessage('Expiry information saved. The visit is still active.');
    } catch (err) {
      setVisitMessage(err instanceof Error ? err.message : 'Unable to save expiry information.');
    } finally { setSavingVisit(false); }
  }

  async function saveSampling() {
    if (!activeVisitId) { setVisitMessage('Start the visit before saving sampling information.'); return; }
    if (sampling.conducted === null) { setVisitMessage('Please indicate whether sampling was conducted.'); return; }
    if (sampling.conducted === false && !sampling.reason.trim()) { setVisitMessage('Please enter a reason when sampling was not conducted.'); return; }
    if (samplingOrderPlaced === null) { setVisitMessage('Please indicate whether an order was placed.'); return; }
    const numericFields = [sampling.customersSampled, ...Object.values(sampling.bottlesSoldBySku)];
    if (sampling.conducted && (
      sampling.customersSampled === '' ||
      !Number.isInteger(Number(sampling.customersSampled)) ||
      Number(sampling.customersSampled) < 0 ||
      Object.values(sampling.bottlesSoldBySku).some((value) => value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0))
    )) {
      setVisitMessage('Customers sampled and bottles sold must be whole numbers of 0 or more.');
      return;
    }
    const bottlesSoldBySku = Object.fromEntries(
      Object.entries(sampling.bottlesSoldBySku).map(([sku, value]) => [sku, value === '' ? 0 : Number(value)])
    );
    const totalBottlesSold = Object.values(bottlesSoldBySku).reduce((sum, quantity) => sum + quantity, 0);
    setSavingVisit(true); setVisitMessage('');
    try {
      await updateDoc(doc(getFirebaseDb(), 'visits', activeVisitId), {
        sampling: {
          conducted: sampling.conducted,
          customersSampled: sampling.conducted ? Number(sampling.customersSampled) : 0,
          bottlesSold: sampling.conducted ? totalBottlesSold : 0,
          bottlesSoldBySku: sampling.conducted ? bottlesSoldBySku : {},
          feedback: sampling.feedback.trim(),
          reason: sampling.conducted ? '' : sampling.reason.trim(),
        },
        orderPlaced: samplingOrderPlaced,
        orderNotes: samplingOrderNotes.trim(),
        updatedAt: serverTimestamp(),
      });
      setVisitStep(6);
      setVisitMessage('Sampling information saved. The visit is still active.');
    } catch (err) {
      setVisitMessage(err instanceof Error ? err.message : 'Unable to save sampling information.');
    } finally { setSavingVisit(false); }
  }

  async function resumeSamplingSession(session: { id: string; data: Record<string, any> }) {
    const data = session.data;
    const openingStock = Array.isArray(data.openingStock) ? data.openingStock : [];
    const startedAt = data.startedAt?.toDate?.();

    setActiveVisitId(session.id);
    setActiveVisitStartedAt(startedAt instanceof Date ? startedAt : new Date());
    setActiveNav('Visits');
    setVisitMode('SAMPLING_ONLY');
    setVisitOpen(true);
    setVisitStep(3);
    setVisit({
      outletId: data.outletId || '',
      outletName: data.outletName || '',
      notes: data.notes || '',
    });
    setGps(data.gps?.lat && data.gps?.lng ? {
      lat: data.gps.lat,
      lng: data.gps.lng,
      accuracyMeters: data.gps.accuracyMeters || 0,
    } : null);
    setStockEntries(openingStock.map((entry: any) => ({
      sku: entry.sku,
      productName: entry.productName,
      shelfStock: String(entry.shelfStock ?? 0),
      backStock: String(entry.backStock ?? 0),
    })));
    setSamplingClosingSales({ 'SKU-001': '', 'SKU-002': '', 'SKU-003': '', 'SKU-004': '' });
    setSamplingClosingCustomers('');
    setSamplingOrderPlaced(data.orderPlaced ?? null);
    setSamplingOrderNotes(data.orderNotes || '');
    setActiveVisitElapsedSeconds(startedAt instanceof Date ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) : 0);
    setVisitMessage('Sampling session selected. Enter the closing stock and complete the session.');
  }

  async function completeSamplingVisit() {
    if (!activeVisitId) { setVisitMessage('No sampling session is currently selected.'); return; }

    const invalidClosing = Object.values(samplingClosingSales).some((value) =>
      value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0)
    );
    if (invalidClosing || samplingClosingCustomers === '' ||
      !Number.isInteger(Number(samplingClosingCustomers)) || Number(samplingClosingCustomers) < 0) {
      setVisitMessage('Closing stock and customers sampled must be whole numbers of 0 or more.');
      return;
    }
    if (samplingOrderPlaced === null) {
      setVisitMessage('Please indicate whether an order was placed.');
      return;
    }

    const closingBySku = Object.fromEntries(
      Object.entries(samplingClosingSales).map(([sku, value]) => [sku, value === '' ? 0 : Number(value)])
    );
    const opening = stockEntries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.sku] = (entry.shelfStock === '' ? 0 : Number(entry.shelfStock)) +
        (entry.backStock === '' ? 0 : Number(entry.backStock));
      return acc;
    }, {});
    const hasInvalidClosing = Object.entries(closingBySku).some(([sku, closing]) => closing > (opening[sku] || 0));
    if (hasInvalidClosing) {
      setVisitMessage('Closing stock cannot be greater than the opening stock.');
      return;
    }

    if (!window.confirm('Complete this sampling session and save the closing stock?')) return;
    setSavingVisit(true); setVisitMessage('');
    try {
      const closingStock = stockEntries.map((entry) => {
        const openingQty = (entry.shelfStock === '' ? 0 : Number(entry.shelfStock)) +
          (entry.backStock === '' ? 0 : Number(entry.backStock));
        const remainingStock = closingBySku[entry.sku] || 0;
        const soldQty = openingQty - remainingStock;
        return { sku: entry.sku, productName: entry.productName, openingStock: openingQty, bottlesSold: soldQty, remainingStock };
      });
      const now = Date.now();
      const startedMs = activeVisitStartedAt?.getTime();
      const durationMinutes = startedMs ? Math.max(0, Math.round((now - startedMs) / 60000)) : null;
      const db = getFirebaseDb();
      const batch = writeBatch(db);

      for (const item of closingStock) {
        batch.set(doc(db, 'stock', `${visit.outletId}_${item.sku}`), {
          outletId: visit.outletId,
          outletName: visit.outletName,
          sku: item.sku,
          productName: item.productName,
          quantity: item.remainingStock,
          source: 'SAMPLING',
          visitId: activeVisitId,
          repUid: user?.uid || '',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      batch.update(doc(db, 'visits', activeVisitId), {
        sampling: {
          conducted: true,
          customersSampled: Number(samplingClosingCustomers),
          bottlesSold: closingStock.reduce((sum, item) => sum + item.bottlesSold, 0),
          bottlesSoldBySku: Object.fromEntries(closingStock.map((item) => [item.sku, item.bottlesSold])),
          feedback: sampling.feedback.trim(),
          reason: '',
        },
        samplingClosingStock: closingStock,
        orderPlaced: samplingOrderPlaced,
        orderNotes: samplingOrderNotes.trim(),
        status: 'COMPLETED',
        stoppedAt: serverTimestamp(),
        durationMinutes,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      setVisitMessage('Sampling session completed and saved. Closing stock has been updated automatically.');
      setActiveVisitId(null); setActiveVisitStartedAt(null); setActiveVisitElapsedSeconds(0);
      setVisitOpen(false); setVisitStep(1);
      setSamplingClosingSales({ 'SKU-001': '', 'SKU-002': '', 'SKU-003': '', 'SKU-004': '' });
      setSamplingClosingCustomers('');
      setSamplingOrderPlaced(null);
      setSamplingOrderNotes('');
    } catch (err) {
      setVisitMessage(err instanceof Error ? err.message : 'Unable to complete sampling session.');
    } finally { setSavingVisit(false); }
  }

  async function stopVisit() {
    if (!activeVisitId) {
      setVisitMessage('No active visit is currently running.');
      return;
    }
    if (!window.confirm('Stop and complete this visit now?')) return;
    setSavingVisit(true); setVisitMessage('');
    try {
      const now = Date.now();
      const startedMs = activeVisitStartedAt?.getTime();
      const durationMinutes = startedMs ? Math.max(0, Math.round((now - startedMs) / 60000)) : null;
      await updateDoc(doc(getFirebaseDb(), 'visits', activeVisitId), {
        status: 'COMPLETED',
        stoppedAt: serverTimestamp(),
        durationMinutes,
        updatedAt: serverTimestamp(),
      });
      setVisitMessage('Visit stopped and saved.');
      setActiveVisitId(null);
      setActiveVisitStartedAt(null);
      setActiveVisitElapsedSeconds(0);
      setVisitOpen(false);
      setVisitMode('STANDARD');
      setVisitStep(1);
      setVisit({ outletId: '', outletName: '', notes: '' });
      setChecklist({ displayPresent: null, productsWellDisplayed: null, priceVisible: null, staffEngaged: null, competitorActivity: null });
      setChecklistReasons({ displayPresent: '', productsWellDisplayed: '', priceVisible: '', staffEngaged: '', competitorActivity: '' });
      setStockEntries([
        { sku: 'SKU-001', productName: 'Honey Habanero Hot Sauce', shelfStock: '', backStock: '' },
        { sku: 'SKU-002', productName: 'Hot Honey', shelfStock: '', backStock: '' },
        { sku: 'SKU-003', productName: 'Jalapeno Lime Hot Sauce', shelfStock: '', backStock: '' },
        { sku: 'SKU-004', productName: 'Mango Pineapple Habanero Hot Sauce', shelfStock: '', backStock: '' },
      ]);
      setSampling({
        conducted: null,
        customersSampled: '',
        bottlesSoldBySku: { 'SKU-001': '', 'SKU-002': '', 'SKU-003': '', 'SKU-004': '' },
        feedback: '',
        reason: '',
      });
    setExpiryEntries([
      { sku: 'SKU-001', productName: 'Honey Habanero Hot Sauce', hasExpiryConcern: null, quantity: '', expiryDate: '' },
      { sku: 'SKU-002', productName: 'Hot Honey', hasExpiryConcern: null, quantity: '', expiryDate: '' },
      { sku: 'SKU-003', productName: 'Jalapeno Lime Hot Sauce', hasExpiryConcern: null, quantity: '', expiryDate: '' },
      { sku: 'SKU-004', productName: 'Mango Pineapple Habanero Hot Sauce', hasExpiryConcern: null, quantity: '', expiryDate: '' },
    ]);
      setGps(null); setGpsStatus('Not captured');
    } catch (err) {
      setVisitMessage(err instanceof Error ? err.message : 'Unable to stop visit.');
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
      <nav style={styles.sideNav} aria-label="Main navigation">{navItems.map((item) => <NavButton key={item.label} item={item} active={activeNav === item.label} onClick={() => { setActiveNav(item.label); if (item.label !== 'Visits' && item.label !== 'Sampling') setVisitOpen(false); }} />)}</nav>
      <div style={styles.sidebarBottom}><UserCard user={user} /><button onClick={handleSignOut} disabled={busy} style={styles.signOutButton}>{busy ? 'Signing out…' : 'Sign out'}</button></div>
    </aside>
    <main className="retailops-main" style={styles.main}>
      <header className="retailops-header" style={styles.header}>
        <div><div className="retailops-mobile-brand" style={styles.mobileBrand}>KWE & COLE</div><h1 style={styles.pageTitle}>{activeNav}</h1><p style={styles.pageSubtitle}>Retail field operations at a glance.</p></div>
        <div className="retailops-header-user" style={styles.headerUser}><span>{user.displayName || user.email || 'Signed-in user'}</span><button onClick={handleSignOut} disabled={busy} style={styles.headerSignOut}>{busy ? '…' : 'Sign out'}</button></div>
      </header>
      {activeNav === 'Dashboard' && <Dashboard onNewVisit={openNewVisit} />}
      {activeNav === 'Stores' && <StoresSection />}
      {activeNav === 'Stock' && <StockLanding />}
      {activeNav === 'Sampling' && <SamplingLanding onNewSamplingVisit={openSamplingVisit} onResume={resumeSamplingSession} userUid={user.uid} />}
      {activeNav === 'Visits' && (visitOpen ? <VisitEntry visitMode={visitMode} outlets={outlets} visit={visit} setVisit={setVisit} visitStep={visitStep} setVisitStep={setVisitStep} checklist={checklist} setChecklist={setChecklist} checklistReasons={checklistReasons} setChecklistReasons={setChecklistReasons} stockEntries={stockEntries} setStockEntries={setStockEntries} expiryEntries={expiryEntries} setExpiryEntries={setExpiryEntries} sampling={sampling} setSampling={setSampling} setVisitMessage={setVisitMessage} gpsStatus={gpsStatus} onCaptureGps={captureGps} onStart={startVisit} onStartSampling={startSamplingVisit} onCompleteSampling={completeSamplingVisit} samplingClosingSales={samplingClosingSales} setSamplingClosingSales={setSamplingClosingSales} samplingClosingCustomers={samplingClosingCustomers} setSamplingClosingCustomers={setSamplingClosingCustomers} samplingOrderPlaced={samplingOrderPlaced} setSamplingOrderPlaced={setSamplingOrderPlaced} samplingOrderNotes={samplingOrderNotes} setSamplingOrderNotes={setSamplingOrderNotes} activeVisitElapsedSeconds={activeVisitElapsedSeconds} activeVisitStartedAt={activeVisitStartedAt} onSaveChecklist={saveChecklist} onSaveStock={saveStock} onSaveExpiry={saveExpiry} onSaveSampling={saveSampling} onStop={stopVisit} saving={savingVisit} message={visitMessage} onClose={() => setVisitOpen(false)} /> : <VisitsLanding onNewVisit={openNewVisit} onNewSamplingVisit={openSamplingVisit} />)}
      {activeNav !== 'Dashboard' && activeNav !== 'Stores' && activeNav !== 'Visits' && activeNav !== 'Sampling' && <PlaceholderSection title={activeNav} />}
    </main>
    <nav className="retailops-bottom-nav" style={styles.bottomNav} aria-label="Mobile navigation">{navItems.slice(0, 5).map((item) => <button className="retailops-bottom-button" key={item.label} onClick={() => { setActiveNav(item.label); if (item.label !== 'Visits') setVisitOpen(false); }} style={{ ...styles.bottomNavButton, ...(activeNav === item.label ? styles.bottomNavButtonActive : {}) }}><span style={styles.bottomIcon}>{item.icon}</span><span>{item.label}</span></button>)}</nav>
  </div>;
}

function LoginScreen({ busy, error, onSignIn }: { busy: boolean; error: string; onSignIn: () => void }) { return <main style={styles.loginPage}><section style={styles.loginCard}><div style={styles.eyebrow}>KWE & COLE</div><h1 style={styles.loginTitle}>RetailOps</h1><p style={styles.loginText}>Retail field operations, visits, stock and store activity in one place.</p><button onClick={onSignIn} disabled={busy} style={styles.googleButton}>{busy ? 'Signing in…' : 'Continue with Google'}</button>{error && <div role="alert" style={styles.error}>{error}</div>}</section></main>; }
function Dashboard({ onNewVisit }: { onNewVisit: () => void }) { return <div><section className="retailops-welcome" style={styles.welcomeCard}><div><div style={styles.eyebrow}>FIELD OPERATIONS</div><h2 style={styles.welcomeTitle}>Good to see you.</h2><p style={styles.welcomeText}>Your RetailOps workspace is ready. Start by recording a store visit.</p></div><button onClick={onNewVisit} style={styles.primaryButton}>+ New Visit</button></section><section className="retailops-kpis" style={styles.kpiGrid}>{activity.map((item) => <article key={item.title} style={styles.kpiCard}><div style={styles.kpiLabel}>{item.title}</div><div style={styles.kpiValue}>{item.value}</div><div style={styles.kpiDetail}>{item.detail}</div></article>)}</section><section style={styles.sectionCard}><div style={styles.sectionHeader}><div><h2 style={styles.sectionTitle}>Today&apos;s activity</h2><p style={styles.sectionSubtitle}>Visit and store activity will appear here.</p></div><span style={styles.statusPill}>Ready</span></div><div style={styles.emptyState}><div style={styles.emptyIcon}>✓</div><strong>No activity recorded yet</strong><span>Once field reps begin visits, their activity will show here.</span></div></section></div>; }
function SamplingLanding({ onNewSamplingVisit, onResume, userUid }: {
  onNewSamplingVisit: () => void;
  onResume: (session: { id: string; data: Record<string, any> }) => void;
  userUid: string;
}) {
  const [sessions, setSessions] = useState<Array<{ id: string; data: Record<string, any> }>>([]);
  const [loading, setLoading] = useState(true);

  async function loadSessions() {
    setLoading(true);
    try {
      const snapshot = await getDocs(query(
        collection(getFirebaseDb(), 'visits'),
        where('repUid', '==', userUid)
      ));
      const loaded = snapshot.docs
        .map((visitDoc) => ({ id: visitDoc.id, data: visitDoc.data() }))
        .filter((session) => session.data.visitType === 'SAMPLING_ONLY')
        .sort((a, b) => (b.data.startedAt?.toMillis?.() ?? 0) - (a.data.startedAt?.toMillis?.() ?? 0));
      setSessions(loaded.slice(0, 30));
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadSessions(); }, []);

  const active = sessions.filter((session) => session.data.status === 'STARTED');
  const completed = sessions.filter((session) => session.data.status === 'COMPLETED').slice(0, 10);

  return <section style={styles.sectionCard}>
    <div style={styles.sectionHeader}>
      <div><h2 style={styles.sectionTitle}>Sampling sessions</h2><p style={styles.sectionSubtitle}>Start a sampling session when you arrive. Close the specific session at the end of your shift.</p></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => void loadSessions()} style={styles.secondaryButton}>{loading ? 'Loading…' : 'Refresh'}</button>
        <button onClick={onNewSamplingVisit} style={styles.darkButton}>◎ Start Sampling</button>
      </div>
    </div>

    <div style={{ marginBottom: 18 }}>
      <strong style={styles.checklistProgress}>Open sampling sessions</strong>
      {active.length === 0
        ? <div style={styles.emptyState}><span>No open sampling sessions.</span></div>
        : <div style={styles.visitList}>{active.map((session) => {
            const started = session.data.startedAt?.toDate?.();
            return <article key={session.id} style={styles.visitRow}>
              <div style={{ minWidth: 0 }}>
                <strong style={styles.visitStore}>{session.data.outletName || 'Unnamed store'}</strong>
                <div style={styles.visitMeta}>{started ? `Started ${started.toLocaleString()}` : 'Start time pending'} · Session ID {session.id.slice(0, 8)}</div>
              </div>
              <button onClick={() => onResume(session)} style={styles.darkButton}>Close session</button>
            </article>;
          })}</div>}
    </div>

    <div>
      <strong style={styles.checklistProgress}>Recent completed sessions</strong>
      {completed.length === 0
        ? <div style={styles.emptyState}><span>No completed sampling sessions yet.</span></div>
        : <div style={styles.visitList}>{completed.map((session) => {
            const started = session.data.startedAt?.toDate?.();
            const stopped = session.data.stoppedAt?.toDate?.();
            return <article key={session.id} style={styles.visitRow}>
              <div style={{ minWidth: 0 }}>
                <strong style={styles.visitStore}>{session.data.outletName || 'Unnamed store'}</strong>
                <div style={styles.visitMeta}>{started ? started.toLocaleString() : '—'} → {stopped ? stopped.toLocaleString() : '—'} · {session.data.durationMinutes ?? 0} min</div>
              </div>
              <span style={styles.statusPill}>COMPLETED</span>
            </article>;
          })}</div>}
    </div>
  </section>;
}

function VisitsLanding({ onNewVisit, onNewSamplingVisit }: { onNewVisit: () => void; onNewSamplingVisit: () => void }) {
  const [visits, setVisits] = useState<Array<{ id: string; outletName: string; repName: string; status: string; createdAt?: { toDate?: () => Date } }>>([]);
  const [loading, setLoading] = useState(true);

  async function loadVisits() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(getFirebaseDb(), 'visits'));
      const loaded = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<(typeof visits)[number], 'id'>) }));
      loaded.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      setVisits(loaded.slice(0, 25));
    } catch {
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadVisits(); }, []);

  return <section style={styles.sectionCard}>
    <div style={styles.sectionHeader}>
      <div><h2 style={styles.sectionTitle}>Store visits</h2><p style={styles.sectionSubtitle}>Recent field visits and visit status.</p></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => void loadVisits()} style={styles.secondaryButton}>{loading ? 'Loading…' : 'Refresh'}</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onNewVisit} style={styles.darkButton}>+ New Visit</button>
          <button onClick={onNewSamplingVisit} style={styles.secondaryButton}>◎ Sampling Visit</button>
        </div>
      </div>
    </div>
    {loading && visits.length === 0 ? <div style={styles.emptyState}><strong>Loading visits…</strong></div> :
      visits.length === 0 ? <div style={styles.emptyState}><div style={styles.emptyIcon}>✓</div><strong>No visits recorded yet</strong><span>Start a new visit to create the first record.</span></div> :
      <div style={styles.visitList}>{visits.map((item) => {
        const date = item.createdAt?.toDate?.();
        return <article key={item.id} style={styles.visitRow}>
          <div style={{ minWidth: 0 }}>
            <strong style={styles.visitStore}>{item.outletName || 'Unnamed store'}</strong>
            <div style={styles.visitMeta}>{item.repName || 'Field rep'}{date ? ` · ${date.toLocaleString()}` : ''}</div>
          </div>
          <span style={styles.statusPill}>{item.status || 'STARTED'}</span>
        </article>;
      })}</div>}
  </section>;
}
function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function StockLanding() {
  const [rows, setRows] = useState<Array<{ id: string; outletId: string; outletName: string; sku: string; productName: string; quantity: number; updatedAt?: { toDate?: () => Date } }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OOS' | 'LOW'>('ALL');

  async function loadStock() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(getFirebaseDb(), 'stock'));
      const loaded = snapshot.docs.map((item) => {
        const data = item.data() as Partial<(typeof rows)[number]>;
        return {
          id: item.id,
          outletId: data.outletId || '',
          outletName: data.outletName || 'Unnamed store',
          sku: data.sku || '',
          productName: data.productName || data.sku || 'Unknown product',
          quantity: Number(data.quantity || 0),
          updatedAt: data.updatedAt,
        };
      });
      loaded.sort((a, b) => a.outletName.localeCompare(b.outletName) || a.productName.localeCompare(b.productName));
      setRows(loaded);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadStock(); }, []);

  const filtered = rows.filter((row) => {
    const haystack = `${row.outletName} ${row.productName} ${row.sku}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || (filter === 'OOS' ? row.quantity === 0 : row.quantity > 0 && row.quantity <= 5);
    return matchesSearch && matchesFilter;
  });

  const oosCount = rows.filter((row) => row.quantity === 0).length;
  const lowCount = rows.filter((row) => row.quantity > 0 && row.quantity <= 5).length;

  return <section style={styles.sectionCard}>
    <div style={styles.sectionHeader}>
      <div>
        <h2 style={styles.sectionTitle}>Stock overview</h2>
        <p style={styles.sectionSubtitle}>Latest recorded stock by store and SKU. Low stock means 5 bottles or fewer.</p>
      </div>
      <button onClick={() => void loadStock()} style={styles.secondaryButton}>{loading ? 'Loading…' : 'Refresh'}</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
      <div style={styles.kpiCard}><div style={styles.kpiLabel}>Stock records</div><div style={styles.kpiValue}>{rows.length}</div></div>
      <div style={styles.kpiCard}><div style={styles.kpiLabel}>Out of stock</div><div style={styles.kpiValue}>{oosCount}</div></div>
      <div style={styles.kpiCard}><div style={styles.kpiLabel}>Low stock</div><div style={styles.kpiValue}>{lowCount}</div></div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 14 }}>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search store or sauce…" style={styles.input} />
      <div style={{ display: 'flex', gap: 7 }}>
        {(['ALL', 'OOS', 'LOW'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} style={filter === item ? styles.darkButton : styles.secondaryButton}>{item === 'ALL' ? 'All' : item === 'OOS' ? 'Out of stock' : 'Low stock'}</button>)}
      </div>
    </div>
    {loading && rows.length === 0 ? <div style={styles.emptyState}><strong>Loading stock…</strong></div> :
      filtered.length === 0 ? <div style={styles.emptyState}><strong>No stock records found</strong><span>Stock will appear here after a stock count or completed sampling session.</span></div> :
      <div style={styles.visitList}>{filtered.map((row) => {
        const updated = row.updatedAt?.toDate?.();
        const status = row.quantity === 0 ? 'OUT' : row.quantity <= 5 ? 'LOW' : 'OK';
        return <article key={row.id} style={styles.visitRow}>
          <div style={{ minWidth: 0 }}>
            <strong style={styles.visitStore}>{row.outletName}</strong>
            <div style={styles.visitMeta}>{row.productName} · {row.sku}{updated ? ` · Updated ${updated.toLocaleString()}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ fontSize: 18 }}>{row.quantity}</strong>
            <div style={styles.statusPill}>{status}</div>
          </div>
        </article>;
      })}</div>}
  </section>;
}

function VisitEntry({
  visitMode,
  outlets,
  visit,
  setVisit,
  visitStep,
  setVisitStep,
  checklist,
  setChecklist,
  checklistReasons,
  setChecklistReasons,
  stockEntries,
  setStockEntries,
  expiryEntries,
  setExpiryEntries,
  sampling,
  setSampling,
  setVisitMessage,
  gpsStatus,
  onCaptureGps,
  onStart,
  onStartSampling,
  onCompleteSampling,
  samplingClosingSales,
  setSamplingClosingSales,
  samplingClosingCustomers,
  setSamplingClosingCustomers,
  samplingOrderPlaced,
  setSamplingOrderPlaced,
  samplingOrderNotes,
  setSamplingOrderNotes,
  activeVisitElapsedSeconds,
  activeVisitStartedAt,
  onSaveChecklist,
  onSaveStock,
  onSaveExpiry,
  onSaveSampling,
  onStop,
  saving,
  message,
  onClose,
}: {
  visitMode: VisitMode;
  outlets: Outlet[];
  visit: VisitDraft;
  setVisit: React.Dispatch<React.SetStateAction<VisitDraft>>;
  visitStep: number;
  setVisitStep: React.Dispatch<React.SetStateAction<number>>;
  checklist: VisitChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<VisitChecklist>>;
  checklistReasons: VisitReasons;
  setChecklistReasons: React.Dispatch<React.SetStateAction<VisitReasons>>;
  stockEntries: StockEntry[];
  setStockEntries: React.Dispatch<React.SetStateAction<StockEntry[]>>;
  expiryEntries: ExpiryEntry[];
  setExpiryEntries: React.Dispatch<React.SetStateAction<ExpiryEntry[]>>;
  sampling: SamplingDraft;
  setSampling: React.Dispatch<React.SetStateAction<SamplingDraft>>;
  setVisitMessage: React.Dispatch<React.SetStateAction<string>>;
  gpsStatus: string;
  onCaptureGps: () => void;
  onStart: () => void;
  onStartSampling: () => void;
  onCompleteSampling: () => void;
  samplingClosingSales: Record<string, string>;
  setSamplingClosingSales: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  samplingClosingCustomers: string;
  setSamplingClosingCustomers: React.Dispatch<React.SetStateAction<string>>;
  samplingOrderPlaced: boolean | null;
  setSamplingOrderPlaced: React.Dispatch<React.SetStateAction<boolean | null>>;
  samplingOrderNotes: string;
  setSamplingOrderNotes: React.Dispatch<React.SetStateAction<string>>;
  activeVisitElapsedSeconds: number;
  activeVisitStartedAt: Date | null;
  onSaveChecklist: () => void;
  onSaveStock: () => void;
  onSaveExpiry: () => void;
  onSaveSampling: () => void;
  onStop: () => void;
  saving: boolean;
  message: string;
  onClose: () => void;
}) {
  const checklistItems: Array<{ key: ChecklistKey; label: string; help: string }> = [
    { key: 'displayPresent', label: 'Kwe & Cole display is present', help: 'Product is visible in the expected display or shelf location.' },
    { key: 'productsWellDisplayed', label: 'Products are well displayed', help: 'Bottles are upright, clean and easy for shoppers to see.' },
    { key: 'priceVisible', label: 'Price is visible', help: 'The shelf or display has a visible selling price.' },
    { key: 'staffEngaged', label: 'Store staff were engaged', help: 'A store team member was available for the visit.' },
    { key: 'competitorActivity', label: 'Competitor activity observed', help: 'Record Yes if a relevant competitor promotion or display was observed.' },
  ];

  const setAnswer = (key: ChecklistKey, value: boolean) => {
    setChecklist((current) => ({ ...current, [key]: value }));
    if (value === true) {
      setChecklistReasons((current) => ({ ...current, [key]: '' }));
    }
  };

  return <section style={styles.sectionCard}>
    <div style={styles.sectionHeader}>
      <div>
        <div style={styles.eyebrow}>{visitMode === 'SAMPLING_ONLY' ? 'SAMPLING VISIT' : 'STORE VISIT'} · STEP {visitStep} OF {visitMode === 'SAMPLING_ONLY' ? 3 : 6}</div>
        <h2 style={styles.sectionTitle}>
          {visitMode === 'SAMPLING_ONLY' ? (visitStep === 1 ? 'Start sampling visit' : visitStep === 2 ? 'Sampling in progress' : 'Record sampling sales') : (visitStep === 1 ? 'Start a store visit' : visitStep === 2 ? 'Visit checklist' : visitStep === 3 ? 'Stock count' : visitStep === 4 ? 'Expiry check' : visitStep === 5 ? 'Sampling' : 'Visit in progress')}
        </h2>
        <p style={styles.sectionSubtitle}>
          {visitMode === 'SAMPLING_ONLY' ? (visitStep === 1 ? 'Select the store, capture GPS and record the stock you take for the sampling activity.' : visitStep === 2 ? 'The sampling session is active. The timer records time spent in the store.' : 'Enter the bottles sold for each SKU. Remaining stock is calculated automatically.') : (visitStep === 1 ? 'Confirm the store and capture the visit location.' : visitStep === 2 ? 'Record what you observed during the store visit.' : visitStep === 3 ? 'Count the Kwe & Cole products available in the store.' : visitStep === 4 ? 'Record any stock that is close to expiry.' : visitStep === 5 ? 'Record the results of any sampling or store activation.' : 'The visit remains active while you complete the remaining tasks.')}
        </p>
      </div>
      {(visitMode === 'SAMPLING_ONLY' ? visitStep !== 2 : visitStep !== 5) && <button onClick={onClose} style={styles.secondaryButton}>Cancel</button>}
    </div>

    {visitMode === 'SAMPLING_ONLY' && visitStep === 1 && <>
      <div style={styles.formGrid}>
        <label style={styles.field}>
          <span style={styles.fieldLabel}>Store</span>
          <select value={visit.outletId} onChange={(e) => {
            const selected = outlets.find((o) => o.outletId === e.target.value);
            setVisit({ ...visit, outletId: e.target.value, outletName: selected?.retailer ? `${selected.retailer} - ${selected.branch || selected.outletName || e.target.value}` : (selected?.branch || selected?.outletName || e.target.value) });
          }} style={styles.input}>
            <option value="">Select a store</option>
            {outlets.map((outlet) => <option key={outlet.outletId} value={outlet.outletId}>{outlet.retailer ? `${outlet.retailer} - ${outlet.branch || outlet.outletName || outlet.outletId}` : (outlet.branch || outlet.outletName || outlet.outletId)}</option>)}
          </select>
        </label>
        <div style={styles.infoBox}>
          <span style={styles.fieldLabel}>GPS location</span><strong>{gpsStatus}</strong><button type="button" onClick={onCaptureGps} style={styles.smallButton}>Capture GPS</button>
        </div>
        <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <span style={styles.fieldLabel}>Sampling notes</span>
          <textarea value={visit.notes} onChange={(e) => setVisit({ ...visit, notes: e.target.value })} placeholder="Optional sampling notes" rows={3} style={styles.textarea} />
        </label>
      </div>
      <div style={styles.samplingStockBlock}>
        <div><strong style={styles.checklistProgress}>Opening stock taken to sampling</strong><span style={styles.checklistProgressText}>Enter the number of bottles available at the start of the sampling activity.</span></div>
        {stockEntries.map((entry) => <div key={entry.sku} style={styles.samplingOpeningRow}>
          <span style={styles.samplingProductName}>{entry.productName}</span>
          <input aria-label={`${entry.productName} shelf stock`} type="number" min="0" step="1" inputMode="numeric" value={entry.shelfStock} onChange={(e) => setStockEntries((current) => current.map((item) => item.sku === entry.sku ? { ...item, shelfStock: e.target.value } : item))} placeholder="0" style={styles.samplingQuantity} />
          <span style={styles.samplingStockLabel}>bottles</span>
        </div>)}
      </div>
      {message && <div style={styles.message}>{message}</div>}
      <div style={styles.formActions}>
        <button onClick={onClose} style={styles.secondaryButton}>Cancel</button>
        <button onClick={onStartSampling} disabled={!visit.outletId || saving} style={styles.darkButton}>{saving ? 'Starting…' : 'Start Sampling →'}</button>
      </div>
    </>}

    {visitMode === 'SAMPLING_ONLY' && visitStep === 2 && <>
      <div style={styles.activeVisitCard}>
        <div style={styles.activeVisitBadge}>● SAMPLING ACTIVE</div>
        <h3 style={styles.activeVisitTitle}>{visit.outletName || 'Selected store'}</h3>
        <div style={styles.visitTimer}><span style={styles.visitTimerLabel}>TIME IN STORE</span><strong style={styles.visitTimerValue}>{formatDuration(activeVisitElapsedSeconds)}</strong><span style={styles.visitTimerMeta}>Sampling session in progress</span></div>
        <p style={styles.activeVisitText}>Keep the sampling session open while the team is in the store. When the session ends, continue to record the bottles sold.</p>
        <div style={styles.formActions}><button onClick={() => setVisitStep(3)} disabled={saving} style={styles.darkButton}>Sampling Finished →</button></div>
      </div>
    </>}

    {visitMode === 'SAMPLING_ONLY' && visitStep === 3 && <>
      <label style={styles.field}>
        <span style={styles.fieldLabel}>Customers sampled</span>
        <input type="number" min="0" step="1" inputMode="numeric" value={samplingClosingCustomers} onChange={(e) => setSamplingClosingCustomers(e.target.value)} placeholder="0" style={styles.input} />
        <span style={styles.checklistProgressText}>Enter the total number of shoppers who sampled the products during this activation.</span>
      </label>

      <div style={styles.samplingStockBlock}>
        <div><strong style={styles.checklistProgress}>Record closing stock</strong><span style={styles.checklistProgressText}>Enter the stock remaining at the end of the sampling session. Bottles sold are calculated from opening stock minus closing stock.</span></div>
        {stockEntries.map((entry) => {
          const openingQty = (entry.shelfStock === '' ? 0 : Number(entry.shelfStock)) + (entry.backStock === '' ? 0 : Number(entry.backStock));
          const remaining = samplingClosingSales[entry.sku] === '' ? 0 : Number(samplingClosingSales[entry.sku]);
          const soldQty = Math.max(0, openingQty - remaining);
          return <div key={entry.sku} style={styles.samplingClosingRow}>
            <div style={{ minWidth: 0, flex: 1 }}><strong style={styles.samplingProductName}>{entry.productName}</strong><span style={styles.samplingStockLabel}>Opening {openingQty} · Sold {soldQty}</span></div>
            <input aria-label={`${entry.productName} closing stock`} type="number" min="0" step="1" inputMode="numeric" value={samplingClosingSales[entry.sku] || ''} onChange={(e) => setSamplingClosingSales((current) => ({ ...current, [entry.sku]: e.target.value }))} placeholder="0" style={styles.samplingQuantity} />
          </div>;
        })}
      </div>
            <div style={{ ...styles.samplingCard, marginTop: 14 }}>
        <div style={styles.samplingQuestion}>
          <div><strong style={styles.checklistLabel}>Was an order placed?</strong><span style={styles.stockSku}>Record whether the store placed an order during this sampling session.</span></div>
          <div style={styles.answerGroup}>
            <button type="button" aria-pressed={samplingOrderPlaced === true} onClick={() => setSamplingOrderPlaced(true)} style={{ ...styles.answerButton, ...(samplingOrderPlaced === true ? styles.answerButtonYesActive : {}) }}>✓ Yes</button>
            <button type="button" aria-pressed={samplingOrderPlaced === false} onClick={() => { setSamplingOrderPlaced(false); setSamplingOrderNotes(''); }} style={{ ...styles.answerButton, ...(samplingOrderPlaced === false ? styles.answerButtonNoActive : {}) }}>× No</button>
          </div>
        </div>
        {samplingOrderPlaced === true && <label style={styles.reasonField}><span style={styles.reasonLabel}>Order details / reference</span><textarea value={samplingOrderNotes} onChange={(e) => setSamplingOrderNotes(e.target.value)} placeholder="Enter order number, quantities or any useful details" rows={2} style={styles.reasonTextarea} /></label>}
      </div>
<label style={styles.reasonField}><span style={styles.reasonLabel}>Customer feedback</span><textarea value={sampling.feedback} onChange={(e) => setSampling((current) => ({ ...current, feedback: e.target.value }))} placeholder="What did shoppers say?" rows={3} style={styles.reasonTextarea} /></label>
      {message && <div style={styles.message}>{message}</div>}
      <div style={styles.formActions}>
        <button onClick={() => setVisitStep(2)} style={styles.secondaryButton}>← Back</button>
        <button onClick={onCompleteSampling} disabled={saving} style={styles.darkButton}>{saving ? 'Saving…' : 'Complete Sampling Visit'}</button>
      </div>
    </>}

    {visitMode === 'STANDARD' && visitStep === 1 && <>
      <div style={styles.formGrid}>
        <label style={styles.field}>
          <span style={styles.fieldLabel}>Store</span>
          <select
            value={visit.outletId}
            onChange={(e) => {
              const selected = outlets.find((o) => o.outletId === e.target.value);
              setVisit({
                ...visit,
                outletId: e.target.value,
                outletName: selected?.retailer
                  ? `${selected.retailer} - ${selected.branch || selected.outletName || e.target.value}`
                  : (selected?.branch || selected?.outletName || e.target.value),
              });
            }}
            style={styles.input}
          >
            <option value="">Select a store</option>
            {outlets.map((outlet) => <option key={outlet.outletId} value={outlet.outletId}>{outlet.retailer ? `${outlet.retailer} - ${outlet.branch || outlet.outletName || outlet.outletId}` : (outlet.branch || outlet.outletName || outlet.outletId)}</option>)}
          </select>
        </label>

        <div style={styles.infoBox}>
          <span style={styles.fieldLabel}>Field rep</span>
          <strong>Signed-in user</strong>
          <span style={styles.muted}>{visit.outletName ? 'Ready to start visit' : 'Select a store first'}</span>
        </div>

        <div style={styles.infoBox}>
          <span style={styles.fieldLabel}>GPS location</span>
          <strong>{gpsStatus}</strong>
          <button type="button" onClick={onCaptureGps} style={styles.smallButton}>Capture GPS</button>
        </div>

        <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <span style={styles.fieldLabel}>Notes</span>
          <textarea value={visit.notes} onChange={(e) => setVisit({ ...visit, notes: e.target.value })} placeholder="Optional visit notes" rows={4} style={styles.textarea} />
        </label>
      </div>
      {message && <div style={styles.message}>{message}</div>}
      <div style={styles.formActions}>
        <button onClick={onClose} style={styles.secondaryButton}>Cancel</button>
        <button onClick={onStart} disabled={!visit.outletId || saving} style={styles.darkButton}>{saving ? 'Starting…' : 'Start Visit →'}</button>
      </div>
    </>}

    {visitMode === 'STANDARD' && visitStep === 2 && <>
      <div style={styles.checklistGrid}>
        <div style={styles.checklistIntro}>
          <div>
            <strong style={styles.checklistProgress}>5 quick checks</strong>
            <span style={styles.checklistProgressText}>Tap one answer for each observation. A reason is required when you select No.</span>
          </div>
          <span style={styles.checklistCount}>{checklistItems.filter((item) => checklist[item.key] !== null).length}/5</span>
        </div>
        {checklistItems.map((item, index) => (
          <article key={item.key} style={{ ...styles.checklistItem, ...(checklist[item.key] !== null ? styles.checklistItemAnswered : {}) }}>
            <div style={styles.checklistNumber}>{index + 1}</div>
            <div style={styles.checklistContent}>
              <strong style={styles.checklistLabel}>{item.label}</strong>
              <p style={styles.checklistHelp}>{item.help}</p>
              <div style={styles.answerGroup}>
                <button type="button" aria-pressed={checklist[item.key] === true} onClick={() => setAnswer(item.key, true)} style={{ ...styles.answerButton, ...(checklist[item.key] === true ? styles.answerButtonYesActive : {}) }}>
                  <span style={styles.answerIcon}>✓</span> Yes
                </button>
                <button type="button" aria-pressed={checklist[item.key] === false} onClick={() => setAnswer(item.key, false)} style={{ ...styles.answerButton, ...(checklist[item.key] === false ? styles.answerButtonNoActive : {}) }}>
                  <span style={styles.answerIcon}>×</span> No
                </button>
              </div>
              {checklist[item.key] === false && (
                <label style={styles.reasonField}>
                  <span style={styles.reasonLabel}>Why was this marked No?</span>
                  <textarea
                    value={checklistReasons[item.key]}
                    onChange={(e) => setChecklistReasons((current) => ({ ...current, [item.key]: e.target.value }))}
                    placeholder="Enter the reason or issue observed"
                    rows={2}
                    style={styles.reasonTextarea}
                  />
                </label>
              )}
            </div>
          </article>
        ))}
      </div>
      {message && <div style={styles.message}>{message}</div>}
      <div style={styles.formActions}>
        <button onClick={() => { setVisitStep(1); setVisitMessage(''); }} style={styles.secondaryButton}>← Back</button>
        <button onClick={onSaveChecklist} disabled={saving} style={styles.darkButton}>{saving ? 'Saving…' : 'Save Checklist & Continue →'}</button>
      </div>
    </>}

    {visitMode === 'STANDARD' && visitStep === 3 && <>
      <div style={styles.stockIntro}>
        <div>
          <strong style={styles.checklistProgress}>4 SKUs to count</strong>
          <span style={styles.checklistProgressText}>Enter shelf and back-stock quantities. Use 0 when none are available.</span>
        </div>
      </div>
      <div style={styles.stockGrid}>
        {stockEntries.map((entry, index) => {
          const total = (entry.shelfStock === '' ? 0 : Number(entry.shelfStock)) + (entry.backStock === '' ? 0 : Number(entry.backStock));
          const isOos = total === 0 && entry.shelfStock !== '' && entry.backStock !== '';
          return <article key={entry.sku} style={styles.stockCard}>
            <div style={styles.stockHeader}>
              <div style={styles.checklistNumber}>{index + 1}</div>
              <div style={{ flex: 1 }}>
                <strong style={styles.checklistLabel}>{entry.productName}</strong>
                <span style={styles.stockSku}>{entry.sku}</span>
              </div>
              {isOos && <span style={styles.oosBadge}>OUT OF STOCK</span>}
            </div>
            <div style={styles.stockInputs}>
              <label style={styles.stockField}>
                <span style={styles.fieldLabel}>Shelf stock</span>
                <input type="number" min="0" step="1" inputMode="numeric" value={entry.shelfStock} onChange={(e) => setStockEntries((current) => current.map((x) => x.sku === entry.sku ? { ...x, shelfStock: e.target.value } : x))} placeholder="0" style={styles.stockInput} />
              </label>
              <label style={styles.stockField}>
                <span style={styles.fieldLabel}>Back stock</span>
                <input type="number" min="0" step="1" inputMode="numeric" value={entry.backStock} onChange={(e) => setStockEntries((current) => current.map((x) => x.sku === entry.sku ? { ...x, backStock: e.target.value } : x))} placeholder="0" style={styles.stockInput} />
              </label>
              <div style={styles.stockTotal}>
                <span>Total</span><strong>{total}</strong>
              </div>
            </div>
          </article>;
        })}
      </div>
      {message && <div style={styles.message}>{message}</div>}
      <div style={styles.formActions}>
        <button onClick={() => { setVisitStep(2); setVisitMessage(''); }} style={styles.secondaryButton}>← Back</button>
        <button onClick={onSaveStock} disabled={saving} style={styles.darkButton}>{saving ? 'Saving…' : 'Save Stock & Continue →'}</button>
      </div>
    </>}
    
    {visitMode === 'STANDARD' && visitStep === 4 && <>
      <div style={styles.stockIntro}>
        <div>
          <strong style={styles.checklistProgress}>Expiry check by SKU</strong>
          <span style={styles.checklistProgressText}>Mark Yes only when stock has an expiry concern. If Yes, record the affected quantity and expiry date.</span>
        </div>
      </div>
      <div style={styles.stockGrid}>
        {expiryEntries.map((entry, index) => (
          <article key={entry.sku} style={styles.stockCard}>
            <div style={styles.stockHeader}>
              <div style={styles.checklistNumber}>{index + 1}</div>
              <div style={{ flex: 1 }}>
                <strong style={styles.checklistLabel}>{entry.productName}</strong>
                <span style={styles.stockSku}>{entry.sku}</span>
              </div>
              {entry.hasExpiryConcern === true && <span style={styles.oosBadge}>EXPIRY CONCERN</span>}
            </div>
            <div style={styles.answerGroup}>
              <button type="button" aria-pressed={entry.hasExpiryConcern === true} onClick={() => setExpiryEntries((current) => current.map((x) => x.sku === entry.sku ? { ...x, hasExpiryConcern: true } : x))} style={{ ...styles.answerButton, ...(entry.hasExpiryConcern === true ? styles.answerButtonYesActive : {}) }}>✓ Yes</button>
              <button type="button" aria-pressed={entry.hasExpiryConcern === false} onClick={() => setExpiryEntries((current) => current.map((x) => x.sku === entry.sku ? { ...x, hasExpiryConcern: false, quantity: '', expiryDate: '' } : x))} style={{ ...styles.answerButton, ...(entry.hasExpiryConcern === false ? styles.answerButtonNoActive : {}) }}>× No</button>
            </div>
            {entry.hasExpiryConcern === true && (
              <div style={styles.stockInputs}>
                <label style={styles.stockField}>
                  <span style={styles.fieldLabel}>Affected quantity</span>
                  <input type="number" min="0" step="1" inputMode="numeric" value={entry.quantity} onChange={(e) => setExpiryEntries((current) => current.map((x) => x.sku === entry.sku ? { ...x, quantity: e.target.value } : x))} placeholder="0" style={styles.stockInput} />
                </label>
                <label style={styles.stockField}>
                  <span style={styles.fieldLabel}>Expiry date</span>
                  <input type="date" value={entry.expiryDate} onChange={(e) => setExpiryEntries((current) => current.map((x) => x.sku === entry.sku ? { ...x, expiryDate: e.target.value } : x))} style={styles.stockInput} />
                </label>
              </div>
            )}
          </article>
        ))}
      </div>
      {message && <div style={styles.message}>{message}</div>}
      <div style={styles.formActions}>
        <button onClick={() => { setVisitStep(3); setVisitMessage(''); }} style={styles.secondaryButton}>← Back</button>
        <button onClick={onSaveExpiry} disabled={saving} style={styles.darkButton}>{saving ? 'Saving…' : 'Save Expiry & Continue →'}</button>
      </div>
    </>}
    
    {visitMode === 'STANDARD' && visitStep === 5 && <>
      <div style={styles.stockIntro}>
        <div>
          <strong style={styles.checklistProgress}>Sampling & activation</strong>
          <span style={styles.checklistProgressText}>Capture what happened during sampling so we can measure activity and sales impact.</span>
        </div>
      </div>
      <div style={styles.samplingCard}>
        <div style={styles.samplingQuestion}>
          <div>
            <strong style={styles.checklistLabel}>Was sampling conducted?</strong>
            <span style={styles.stockSku}>Record No if no sampling or activation took place.</span>
          </div>
          <div style={styles.answerGroup}>
            <button type="button" aria-pressed={sampling.conducted === true} onClick={() => setSampling((current) => ({ ...current, conducted: true, reason: '' }))} style={{ ...styles.answerButton, ...(sampling.conducted === true ? styles.answerButtonYesActive : {}) }}>✓ Yes</button>
            <button type="button" aria-pressed={sampling.conducted === false} onClick={() => setSampling((current) => ({ ...current, conducted: false }))} style={{ ...styles.answerButton, ...(sampling.conducted === false ? styles.answerButtonNoActive : {}) }}>× No</button>
          </div>
        </div>
        {sampling.conducted === true && <>
          <div style={styles.samplingMetrics}>
            <label style={styles.stockField}><span style={styles.fieldLabel}>Customers sampled</span><input type="number" min="0" step="1" inputMode="numeric" value={sampling.customersSampled} onChange={(e) => setSampling((current) => ({ ...current, customersSampled: e.target.value }))} placeholder="0" style={styles.stockInput} /></label>
            <div style={styles.stockTotal}><span>Bottles sold</span><strong>{Object.values(sampling.bottlesSoldBySku).reduce((sum, value) => sum + (value === '' ? 0 : Number(value)), 0)}</strong></div>
          </div>
          <div style={styles.samplingProducts}>
            <div>
              <strong style={styles.reasonLabel}>Products sold during sampling</strong>
              <span style={styles.checklistProgressText}>Enter the number of bottles sold for each product. Leave blank for none.</span>
            </div>
            {['SKU-001:Honey Habanero Hot Sauce','SKU-002:Hot Honey','SKU-003:Jalapeno Lime Hot Sauce','SKU-004:Mango Pineapple Habanero Hot Sauce'].map((item) => {
              const [sku, productName] = item.split(':');
              return <label key={sku} style={styles.samplingProductRow}>
                <span style={styles.samplingProductName}>{productName}</span>
                <input type="number" min="0" step="1" inputMode="numeric" value={sampling.bottlesSoldBySku[sku] || ''} onChange={(e) => setSampling((current) => ({ ...current, bottlesSoldBySku: { ...current.bottlesSoldBySku, [sku]: e.target.value } }))} placeholder="0" style={styles.samplingQuantity} />
              </label>;
            })}
          </div>
          <div style={{ ...styles.samplingCard, marginTop: 14 }}>
          <div style={styles.samplingQuestion}>
            <div><strong style={styles.checklistLabel}>Was an order placed?</strong><span style={styles.stockSku}>Record whether the store placed an order during this visit.</span></div>
            <div style={styles.answerGroup}>
              <button type="button" aria-pressed={samplingOrderPlaced === true} onClick={() => setSamplingOrderPlaced(true)} style={{ ...styles.answerButton, ...(samplingOrderPlaced === true ? styles.answerButtonYesActive : {}) }}>✓ Yes</button>
              <button type="button" aria-pressed={samplingOrderPlaced === false} onClick={() => { setSamplingOrderPlaced(false); setSamplingOrderNotes(''); }} style={{ ...styles.answerButton, ...(samplingOrderPlaced === false ? styles.answerButtonNoActive : {}) }}>× No</button>
            </div>
          </div>
          {samplingOrderPlaced === true && <label style={styles.reasonField}><span style={styles.reasonLabel}>Order details / reference</span><textarea value={samplingOrderNotes} onChange={(e) => setSamplingOrderNotes(e.target.value)} placeholder="Enter order number, quantities or useful details" rows={2} style={styles.reasonTextarea} /></label>}
        </div>
        <label style={styles.reasonField}><span style={styles.reasonLabel}>Customer feedback</span><textarea value={sampling.feedback} onChange={(e) => setSampling((current) => ({ ...current, feedback: e.target.value }))} placeholder="What did shoppers say? What products did they respond to?" rows={3} style={styles.reasonTextarea} /></label>
        </>}
        {sampling.conducted === false && <label style={styles.reasonField}><span style={styles.reasonLabel}>Why was sampling not conducted?</span><textarea value={sampling.reason} onChange={(e) => setSampling((current) => ({ ...current, reason: e.target.value }))} placeholder="Enter the reason" rows={2} style={styles.reasonTextarea} /></label>}
      </div>
      {message && <div style={styles.message}>{message}</div>}
      <div style={styles.formActions}>
        <button onClick={() => { setVisitStep(4); setVisitMessage(''); }} style={styles.secondaryButton}>← Back</button>
        <button onClick={onSaveSampling} disabled={saving} style={styles.darkButton}>{saving ? 'Saving…' : 'Save Sampling & Continue →'}</button>
      </div>
    </>}
    
    {visitMode === 'STANDARD' && visitStep === 6 && <>
      <div style={styles.activeVisitCard}>
        <div style={styles.activeVisitBadge}>● VISIT ACTIVE</div>
        <h3 style={styles.activeVisitTitle}>{visit.outletName || 'Selected store'}</h3>
        <div style={styles.visitTimer}>
          <span style={styles.visitTimerLabel}>TIME IN STORE</span>
          <strong style={styles.visitTimerValue}>{formatDuration(activeVisitElapsedSeconds)}</strong>
          <span style={styles.visitTimerMeta}>Started {activeVisitStartedAt ? activeVisitStartedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        </div>
        <p style={styles.activeVisitText}>All visit observations have been recorded. When the store activity is complete, tap Stop Visit to record the end time and save the total visit duration.</p>
        <div style={styles.formActions}>
          <button onClick={onStop} disabled={saving} style={styles.stopButton}>{saving ? 'Stopping…' : 'Stop & Complete Visit'}</button>
        </div>
      </div>
      {message && <div style={styles.message}>{message}</div>}
    </>}
  </section>;
}
function PlaceholderSection({ title }: { title: string }) { return <section style={styles.sectionCard}><div style={styles.emptyState}><div style={styles.emptyIcon}>+</div><strong>{title} is next</strong><span>This section is part of the RetailOps shell. We&apos;ll connect it to Firestore in the next development steps.</span></div></section>; }
function Brand() { return <div style={styles.brand}><div style={styles.brandEyebrow}>KWE & COLE</div><div style={styles.brandName}>RetailOps</div></div>; }
function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) { return <button onClick={onClick} style={{ ...styles.navButton, ...(active ? styles.navButtonActive : {}) }}><span style={styles.navIcon}>{item.icon}</span><span>{item.label}</span></button>; }
function UserCard({ user }: { user: User }) { return <div style={styles.userCard}><div style={styles.avatar}>{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</div><div style={{ minWidth: 0 }}><div style={styles.userName}>{user.displayName || 'Signed-in user'}</div><div style={styles.userEmail}>{user.email}</div></div></div>; }
const styles: Record<string, React.CSSProperties> = {
  app: { minHeight: '100vh', background: '#f7f7f5', color: '#171717', display: 'flex' }, sidebar: { width: 240, background: '#fff', borderRight: '1px solid #e7e5e0', padding: 22, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'fixed', inset: '0 auto 0 0', zIndex: 10 }, brand: { padding: '6px 10px 28px' }, brandEyebrow: { fontSize: 10, fontWeight: 800, letterSpacing: 2, marginBottom: 4 }, brandName: { fontSize: 23, fontWeight: 800, letterSpacing: -0.8 }, sideNav: { display: 'grid', gap: 5 }, navButton: { appearance: 'none', border: 0, background: 'transparent', borderRadius: 10, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#5f5d58', cursor: 'pointer' }, navButtonActive: { background: '#171717', color: '#fff' }, navIcon: { width: 20, textAlign: 'center', fontSize: 16 }, sidebarBottom: { marginTop: 'auto' }, userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px', borderTop: '1px solid #eee' }, avatar: { width: 34, height: 34, borderRadius: 10, background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }, userName: { fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, userEmail: { fontSize: 10, color: '#777', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }, signOutButton: { width: '100%', border: '1px solid #ddd', background: '#fff', borderRadius: 9, padding: '9px 12px', fontWeight: 600, cursor: 'pointer' }, main: { marginLeft: 240, width: 'calc(100% - 240px)', minHeight: '100vh', padding: '36px 42px 48px', boxSizing: 'border-box' }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }, mobileBrand: { display: 'none' }, pageTitle: { fontSize: 30, margin: 0, letterSpacing: -1 }, pageSubtitle: { color: '#777', margin: '6px 0 0', fontSize: 14 }, headerUser: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#555' }, headerSignOut: { border: '1px solid #ddd', background: '#fff', borderRadius: 9, padding: '8px 11px', cursor: 'pointer' }, welcomeCard: { background: '#171717', color: '#fff', borderRadius: 18, padding: '28px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 18 }, welcomeTitle: { fontSize: 25, margin: '6px 0', letterSpacing: -0.7 }, welcomeText: { margin: 0, color: '#d2d2d2', fontSize: 14 }, primaryButton: { border: 0, borderRadius: 10, background: '#fff', color: '#171717', padding: '12px 17px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }, darkButton: { border: 0, borderRadius: 10, background: '#171717', color: '#fff', padding: '12px 17px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }, secondaryButton: { border: '1px solid #ddd', borderRadius: 10, background: '#fff', color: '#333', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }, smallButton: { border: '1px solid #ddd', borderRadius: 9, background: '#fff', color: '#333', padding: '8px 10px', fontWeight: 700, cursor: 'pointer', marginTop: 8, alignSelf: 'flex-start' }, kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }, kpiCard: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 15, padding: 19 }, kpiLabel: { color: '#777', fontSize: 12, fontWeight: 700 }, kpiValue: { fontSize: 30, fontWeight: 800, margin: '9px 0 4px', letterSpacing: -1 }, kpiDetail: { color: '#999', fontSize: 11 }, sectionCard: { background: '#fff', border: '1px solid #e7e5e0', borderRadius: 15, padding: 22 }, sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }, sectionTitle: { margin: 0, fontSize: 19 }, sectionSubtitle: { margin: '5px 0 0', color: '#888', fontSize: 12 }, statusPill: { borderRadius: 20, padding: '5px 9px', background: '#f0f0ed', fontSize: 10, fontWeight: 800 }, emptyState: { minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#777', textAlign: 'center' }, emptyIcon: { width: 38, height: 38, borderRadius: 12, background: '#f1f1ee', display: 'grid', placeItems: 'center', color: '#555', fontWeight: 800 }, loginPage: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f7f7f5', boxSizing: 'border-box' }, loginCard: { width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 12px 40px rgba(0,0,0,.08)', boxSizing: 'border-box' }, eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: 1.7 }, loginTitle: { fontSize: 32, margin: '8px 0 10px', letterSpacing: -1 }, loginText: { color: '#666', lineHeight: 1.5, marginBottom: 28 }, googleButton: { width: '100%', border: 0, borderRadius: 12, padding: '14px 16px', background: '#171717', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }, error: { marginTop: 16, padding: 12, borderRadius: 10, background: '#fff3f3', color: '#a40000', fontSize: 13, lineHeight: 1.45 }, bottomNav: { display: 'none' }, bottomNavButton: { border: 0, background: 'transparent', color: '#777', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 9, padding: '7px 2px', fontWeight: 600 }, bottomNavButtonActive: { color: '#171717', fontWeight: 800 }, bottomIcon: { fontSize: 17, lineHeight: 1 }, checklistIntro: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, padding: '11px 13px', borderRadius: 11, background: '#f7f7f5', border: '1px solid #e7e5e0' }, checklistProgress: { display: 'block', fontSize: 12, fontWeight: 800 }, checklistProgressText: { display: 'block', marginTop: 2, color: '#888', fontSize: 11 }, checklistCount: { minWidth: 34, height: 34, borderRadius: 10, background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }, checklistGrid: { display: 'grid', gap: 10 }, checklistItem: { display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr)', gap: 12, padding: 15, border: '1px solid #e7e5e0', borderRadius: 13, background: '#fff', boxSizing: 'border-box' }, checklistItemAnswered: { borderColor: '#d5d3cd' }, checklistNumber: { width: 32, height: 32, borderRadius: 10, background: '#f0f0ed', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: '#666' }, checklistContent: { minWidth: 0 }, checklistLabel: { display: 'block', fontSize: 14, lineHeight: 1.3 }, checklistHelp: { margin: '5px 0 12px', color: '#888', fontSize: 11, lineHeight: 1.45 }, answerGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 210 }, answerButton: { minHeight: 42, border: '1px solid #d9d7d1', borderRadius: 10, background: '#fafaf8', color: '#555', padding: '9px 12px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }, answerButtonYesActive: { background: '#171717', color: '#fff', borderColor: '#171717' }, answerButtonNoActive: { background: '#ecebe7', color: '#171717', borderColor: '#cfcfc8' }, answerIcon: { fontSize: 14, marginRight: 4 }, visitTimer: { margin: '16px 0', padding: '15px 16px', borderRadius: 12, background: '#171717', color: '#fff', display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }, visitTimerLabel: { fontSize: 9, fontWeight: 800, letterSpacing: 1, color: '#aaa' }, visitTimerValue: { fontSize: 28, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }, visitTimerMeta: { fontSize: 10, color: '#aaa' }, activeVisitCard: { border: '1px solid #e7e5e0', borderRadius: 14, padding: 18, background: '#fafaf8' }, activeVisitBadge: { display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: 1, padding: '6px 9px', borderRadius: 20, background: '#171717', color: '#fff' }, activeVisitTitle: { margin: '14px 0 5px', fontSize: 19 }, activeVisitText: { margin: 0, color: '#777', fontSize: 12, lineHeight: 1.5 }, stopButton: { border: '1px solid #171717', borderRadius: 10, background: '#fff', color: '#171717', padding: '11px 16px', fontWeight: 800, cursor: 'pointer' }, reasonField: { display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }, reasonLabel: { fontSize: 10, fontWeight: 800, color: '#777', textTransform: 'uppercase', letterSpacing: .6 }, reasonTextarea: { width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 9, padding: '9px 10px', fontSize: 12, resize: 'vertical', background: '#fff' }, stockIntro: { marginBottom: 12, padding: '11px 13px', borderRadius: 11, background: '#f7f7f5', border: '1px solid #e7e5e0' }, stockGrid: { display: 'grid', gap: 10 }, stockCard: { border: '1px solid #e7e5e0', borderRadius: 13, padding: 15, background: '#fff' }, stockHeader: { display: 'flex', alignItems: 'center', gap: 10 }, stockSku: { display: 'block', marginTop: 3, color: '#999', fontSize: 10, fontWeight: 700 }, stockInputs: { display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: 8, alignItems: 'end', marginTop: 13 }, stockField: { display: 'flex', flexDirection: 'column', gap: 5 }, stockInput: { width: '100%', boxSizing: 'border-box', minHeight: 42, border: '1px solid #d9d7d1', borderRadius: 10, padding: '9px 10px', fontSize: 14, background: '#fafaf8' }, stockTotal: { minHeight: 42, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: 10, background: '#f0f0ed', color: '#777', fontSize: 9, textTransform: 'uppercase', letterSpacing: .5 }, 'stockTotal strong': { display: 'block', color: '#171717', fontSize: 16 }, oosBadge: { fontSize: 9, fontWeight: 800, padding: '5px 7px', borderRadius: 20, background: '#171717', color: '#fff', whiteSpace: 'nowrap' }, expiryConcern: { fontSize: 9, fontWeight: 800, padding: '5px 7px', borderRadius: 20, background: '#171717', color: '#fff', whiteSpace: 'nowrap' }, samplingCard: { border: '1px solid #e7e5e0', borderRadius: 13, padding: 15, background: '#fff' }, samplingQuestion: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }, samplingMetrics: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }, samplingStockBlock: { marginTop: 14, padding: 15, border: '1px solid #e7e5e0', borderRadius: 13, background: '#fff' }, samplingOpeningRow: { display: 'grid', gridTemplateColumns: '1fr 72px 52px', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #f0efeb' }, samplingClosingRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #f0efeb' }, samplingStockLabel: { display: 'block', fontSize: 11, color: '#777', marginTop: 3 }, samplingProducts: { marginTop: 14, paddingTop: 14, borderTop: '1px solid #eceae5' }, samplingProductRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0efeb' }, samplingProductName: { fontSize: 13, fontWeight: 600, lineHeight: 1.3, flex: 1 }, samplingQuantity: { width: 72, minHeight: 40, boxSizing: 'border-box', border: '1px solid #d9d7d1', borderRadius: 10, padding: '8px 9px', fontSize: 14, textAlign: 'center', background: '#fafaf8' }, formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }, field: { display: 'flex', flexDirection: 'column', gap: 7 }, fieldLabel: { fontSize: 11, color: '#777', fontWeight: 800, textTransform: 'uppercase', letterSpacing: .7 }, input: { width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 10, padding: '12px 13px', background: '#fff', fontSize: 14 }, textarea: { width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 10, padding: '12px 13px', background: '#fff', fontSize: 14, resize: 'vertical' }, infoBox: { border: '1px solid #e7e5e0', borderRadius: 11, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 78, boxSizing: 'border-box' }, muted: { color: '#999', fontSize: 11 }, formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }, message: { marginTop: 16, padding: 12, borderRadius: 10, background: '#f4f4f1', color: '#333', fontSize: 13 }, visitList: { display: 'grid', gap: 8 }, visitRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 14px', border: '1px solid #e7e5e0', borderRadius: 11 }, visitStore: { fontSize: 14 }, visitMeta: { marginTop: 4, color: '#888', fontSize: 11 }
};