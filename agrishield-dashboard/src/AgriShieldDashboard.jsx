import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CloudRain, Zap, RotateCcw, Wifi, WifiOff, Settings2, Users,
  ShieldCheck, ShieldAlert, Wallet, ChevronDown, X, Radio, Loader2
} from 'lucide-react';

const C = {
  ink: '#20261C',
  inkSoft: '#5B5641',
  paper: '#ECE5D0',
  panel: '#E4D9B9',
  panelDeep: '#DACD9F',
  line: '#B8A876',
  rain: '#1B6E62',
  rainSoft: '#D5E4D8',
  alert: '#B23A1F',
  alertSoft: '#F1D6C6',
  ochre: '#B87F1E',
  white: '#FBF8EF'
};

const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.as-root { font-family: 'IBM Plex Sans', system-ui, sans-serif; color: ${C.ink}; }
.as-display { font-family: 'Big Shoulders Display', sans-serif; }
.as-mono { font-family: 'IBM Plex Mono', monospace; }

@keyframes as-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.as-row-new { animation: as-fade-in 0.5s ease-out; }

@keyframes as-pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(178,58,31,0.45); }
  70% { box-shadow: 0 0 0 10px rgba(178,58,31,0); }
  100% { box-shadow: 0 0 0 0 rgba(178,58,31,0); }
}
.as-alert-pulse { animation: as-pulse-ring 1.4s ease-out 2; }

@keyframes as-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.as-live-dot { animation: as-dot 1.8s ease-in-out infinite; }

.as-needle { transition: transform 0.9s cubic-bezier(.34,1.4,.4,1); }
.as-arc-value { transition: d 0.9s cubic-bezier(.34,1.4,.4,1); }

.as-btn:active { transform: translateY(1px); }
.as-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
.as-scroll::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 4px; }
`;

const SEED_WEATHER = [
  { county: 'Machakos', rainfallAmount: 34.2, threshold: 20, consecutiveDryDays: 6, risk: 'LOW' },
  { county: 'Kitui', rainfallAmount: 41.0, threshold: 20, consecutiveDryDays: 3, risk: 'LOW' },
  { county: 'Makueni', rainfallAmount: 26.8, threshold: 20, consecutiveDryDays: 9, risk: 'LOW' }
];

const SEED_FARMERS = [
  { id: 'f1', name: 'Jane Wanjiku', phoneNumber: '+254711111111', county: 'Machakos', cropType: 'Maize', farmSize: 2, policyStatus: 'Active', coverageAmount: 15000 },
  { id: 'f2', name: 'Peter Mutua', phoneNumber: '+254722222222', county: 'Machakos', cropType: 'Beans', farmSize: 1.5, policyStatus: 'Active', coverageAmount: 15000 },
  { id: 'f3', name: 'Grace Nduku', phoneNumber: '+254733333333', county: 'Kitui', cropType: 'Sorghum', farmSize: 3, policyStatus: 'Active', coverageAmount: 15000 },
  { id: 'f4', name: 'Samuel Kioko', phoneNumber: '+254744444444', county: 'Makueni', cropType: 'Maize', farmSize: 2.5, policyStatus: 'Active', coverageAmount: 15000 }
];

let idSeq = 100;
const nextId = () => `sim-${idSeq++}`;

function RainGauge({ county, rainfall, threshold, dryDays, justTriggered }) {
  const max = threshold * 2.5;
  const clamped = Math.max(0, Math.min(max, rainfall));
  const risk = rainfall < threshold ? 'HIGH' : 'LOW';
  const accent = risk === 'HIGH' ? C.alert : C.rain;

  const angleFor = (v) => 180 - (Math.max(0, Math.min(max, v)) / max) * 180;
  const pointAt = (deg, r) => {
    const rad = (deg * Math.PI) / 180;
    return { x: 100 + r * Math.cos(rad), y: 110 - r * Math.sin(rad) };
  };

  const needleAngle = angleFor(clamped);
  const needleTip = pointAt(needleAngle, 74);
  const valueEnd = pointAt(needleAngle, 90);
  const threshPoint = pointAt(angleFor(threshold), 90);
  const threshInner = pointAt(angleFor(threshold), 74);

  return (
    <div
      className={justTriggered ? 'as-alert-pulse' : ''}
      style={{
        background: C.white,
        border: `1px solid ${risk === 'HIGH' ? C.alert : C.line}`,
        borderRadius: 4,
        padding: '14px 14px 10px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
        <span className="as-display" style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.3 }}>
          {county}
        </span>
        <span
          className="as-mono"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1,
            padding: '2px 6px',
            borderRadius: 3,
            color: risk === 'HIGH' ? C.alert : C.rain,
            background: risk === 'HIGH' ? C.alertSoft : C.rainSoft
          }}
        >
          {risk} RISK
        </span>
      </div>

      <svg viewBox="0 0 200 118" width="100%" height="104">
        <path d="M10,110 A90,90 0 0,1 190,110" fill="none" stroke={C.panelDeep} strokeWidth="14" strokeLinecap="round" />
        <path
          className="as-arc-value"
          d={`M10,110 A90,90 0 0,1 ${valueEnd.x},${valueEnd.y}`}
          fill="none"
          stroke={accent}
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* threshold tick */}
        <line x1={threshInner.x} y1={threshInner.y} x2={threshPoint.x} y2={threshPoint.y} stroke={C.ink} strokeWidth="3" />
        <circle cx="100" cy="110" r="7" fill={C.ink} />
        <line
          className="as-needle"
          x1="100"
          y1="110"
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={C.ink}
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transformOrigin: '100px 110px' }}
        />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -6 }}>
        <div>
          <div className="as-mono" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: accent }}>
            {rainfall.toFixed(1)}<span style={{ fontSize: 13, fontWeight: 500, color: C.inkSoft }}>mm</span>
          </div>
          <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>rainfall, last 30 days</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="as-mono" style={{ fontSize: 13, color: C.inkSoft }}>{threshold}mm threshold</div>
          <div className="as-mono" style={{ fontSize: 13, color: C.inkSoft }}>{dryDays}d dry</div>
        </div>
      </div>
    </div>
  );
}

/*  Overview card                                                     */
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 4, padding: '16px 18px', flex: 1, minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.inkSoft, marginBottom: 10 }}>
        <Icon size={15} strokeWidth={2} color={accent || C.inkSoft} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div className="as-mono" style={{ fontSize: 30, fontWeight: 600, color: accent || C.ink }}>{value}</div>
    </div>
  );
}
/* Main dashboard                                                    */

export default function AgriShieldDashboard() {
  const [farmers, setFarmers] = useState(SEED_FARMERS);
  const [weather, setWeather] = useState(SEED_WEATHER);
  const [payouts, setPayouts] = useState([]);
  const [apiBase, setApiBase] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [simCounty, setSimCounty] = useState('Machakos');
  const [simulating, setSimulating] = useState(false);
  const [justTriggeredCounty, setJustTriggeredCounty] = useState(null);
  const [toast, setToast] = useState(null);
  const [newestPayoutId, setNewestPayoutId] = useState(null);

  const showToast = useCallback((msg, tone = 'ink') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const counties = useMemo(() => Array.from(new Set(weather.map((w) => w.county))), [weather]);

  const overview = useMemo(() => {
    const active = farmers.filter((f) => f.policyStatus === 'Active').length;
    const triggered = farmers.filter((f) => f.policyStatus === 'Triggered' || f.policyStatus === 'Paid').length;
    const paid = payouts.reduce((sum, p) => sum + p.amount, 0);
    return { totalFarmers: farmers.length, activePolicies: active, policiesTriggered: triggered, totalCompensationPaid: paid };
  }, [farmers, payouts]);

  /* ---------------- live backend wiring ---------------- */
  const fetchLive = useCallback(async (base) => {
    const [ov, fm, wx, po] = await Promise.all([
      fetch(`${base}/api/demo/overview`).then((r) => r.json()),
      fetch(`${base}/api/farmers`).then((r) => r.json()),
      fetch(`${base}/api/weather`).then((r) => r.json()),
      fetch(`${base}/api/payouts`).then((r) => r.json())
    ]);

    setFarmers(
      fm.map((f) => ({
        id: f._id,
        name: f.name,
        phoneNumber: f.phoneNumber,
        county: f.county,
        cropType: f.cropType,
        farmSize: f.farmSize,
        policyStatus: f.policy ? f.policy.status : 'Unknown',
        coverageAmount: f.policy ? f.policy.coverageAmount : null
      }))
    );
    setWeather(
      wx.map((w) => ({
        county: w.county,
        rainfallAmount: w.rainfallAmount ?? 0,
        threshold: w.threshold,
        consecutiveDryDays: w.consecutiveDryDays ?? 0,
        risk: w.risk
      }))
    );
    setPayouts(
      po.map((p) => ({
        id: p._id,
        farmerName: p.farmerId?.name || 'Unknown',
        county: p.farmerId?.county || '—',
        amount: p.amount,
        triggerReason: p.triggerReason,
        status: p.status,
        date: p.dateTriggered
      }))
    );
    void ov;
  }, []);

  const handleConnect = useCallback(async () => {
    if (!apiBase.trim()) return;
    setConnecting(true);
    try {
      await fetchLive(apiBase.trim().replace(/\/$/, ''));
      setConnected(true);
      showToast('Connected to live backend', 'rain');
    } catch (err) {
      setConnected(false);
      showToast('Could not reach that backend — check the URL and CORS settings', 'alert');
    } finally {
      setConnecting(false);
    }
  }, [apiBase, fetchLive, showToast]);

  const handleDisconnect = () => {
    setConnected(false);
    setFarmers(SEED_FARMERS);
    setWeather(SEED_WEATHER);
    setPayouts([]);
    showToast('Switched back to sandbox data');
  };

  /* ---------------- Simulate Drought ---------------- */
  const handleSimulate = useCallback(async () => {
    setSimulating(true);

    if (connected && apiBase) {
      try {
        const base = apiBase.trim().replace(/\/$/, '');
        const res = await fetch(`${base}/api/demo/simulate-drought`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ county: simCounty })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Simulation failed');
        await fetchLive(base);
        setJustTriggeredCounty(simCounty);
        if (data.payouts?.[0]?._id) setNewestPayoutId(data.payouts[0]._id);
        showToast(`Drought confirmed in ${simCounty} — ${data.payoutsTriggered} payout(s) sent`, 'alert');
      } catch (err) {
        showToast(err.message || 'Simulation failed', 'alert');
      } finally {
        setSimulating(false);
        setTimeout(() => setJustTriggeredCounty(null), 2800);
      }
      return;
    }

    // Local sandbox simulation — no backend required for the demo to work.
    await new Promise((r) => setTimeout(r, 550));

    setWeather((prev) =>
      prev.map((w) => (w.county === simCounty ? { ...w, rainfallAmount: Math.max(2, w.threshold - 8), consecutiveDryDays: 30, risk: 'HIGH' } : w))
    );

    const eligible = farmers.filter((f) => f.county === simCounty && f.policyStatus === 'Active');
    if (eligible.length === 0) {
      showToast(`No active policies in ${simCounty} to trigger`, 'ochre');
      setSimulating(false);
      return;
    }

    setFarmers((prev) => prev.map((f) => (f.county === simCounty && f.policyStatus === 'Active' ? { ...f, policyStatus: 'Triggered' } : f)));

    const countyRecord = weather.find((w) => w.county === simCounty);
    const threshold = countyRecord?.threshold ?? 20;
    const simulatedRainfall = Math.max(2, threshold - 8);

    const newPayouts = eligible.map((f) => ({
      id: nextId(),
      farmerName: f.name,
      county: f.county,
      amount: Math.round(f.coverageAmount * 0.85),
      triggerReason: `Rainfall ${simulatedRainfall.toFixed(1)}mm < ${threshold}mm threshold for 30 consecutive dry days`,
      status: 'Approved',
      date: new Date().toISOString()
    }));

    setPayouts((prev) => [...newPayouts, ...prev]);
    setNewestPayoutId(newPayouts[0].id);
    setJustTriggeredCounty(simCounty);
    showToast(`Drought confirmed in ${simCounty} — ${newPayouts.length} payout(s) sent by SMS`, 'alert');
    setSimulating(false);
    setTimeout(() => setJustTriggeredCounty(null), 2800);
  }, [connected, apiBase, simCounty, farmers, weather, fetchLive, showToast]);

  const handleReset = useCallback(async () => {
    if (connected && apiBase) {
      try {
        const base = apiBase.trim().replace(/\/$/, '');
        await fetch(`${base}/api/demo/reset`, { method: 'POST' });
        await fetchLive(base);
        showToast('Demo state reset');
      } catch {
        showToast('Reset failed', 'alert');
      }
      return;
    }
    setFarmers(SEED_FARMERS);
    setWeather(SEED_WEATHER);
    setPayouts([]);
    showToast('Sandbox reset');
  }, [connected, apiBase, fetchLive, showToast]);

  useEffect(() => {
    if (counties.length && !counties.includes(simCounty)) setSimCounty(counties[0]);
  }, [counties, simCounty]);

  const toastColor = toast?.tone === 'alert' ? C.alert : toast?.tone === 'rain' ? C.rain : toast?.tone === 'ochre' ? C.ochre : C.ink;

  return (
    <div className="as-root" style={{ minHeight: '100vh', background: C.paper }}>
      <style>{FONTS_CSS}</style>

      {/* ---------------- Masthead ---------------- */}
      <header style={{ borderBottom: `1px solid ${C.line}`, background: C.paper, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 4, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CloudRain size={18} color={C.paper} strokeWidth={2.2} />
            </div>
            <div>
              <div className="as-display" style={{ fontSize: 26, fontWeight: 800, letterSpacing: 0.4, lineHeight: 1 }}>AGRISHIELD</div>
              <div style={{ fontSize: 11, color: C.inkSoft, letterSpacing: 0.3 }}>Automatic crop cover, monitored by county</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
                padding: '5px 9px', borderRadius: 3, background: connected ? C.rainSoft : C.panel, color: connected ? C.rain : C.inkSoft
              }}
            >
              <span className="as-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? C.rain : C.inkSoft, display: 'inline-block' }} />
              {connected ? 'LIVE BACKEND' : 'SANDBOX DATA'}
            </div>

            <button
              className="as-btn"
              onClick={() => setShowSettings((s) => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 3, padding: '6px 10px', cursor: 'pointer', color: C.ink }}
            >
              <Settings2 size={13} /> Connect
            </button>

            <select
              value={simCounty}
              onChange={(e) => setSimCounty(e.target.value)}
              className="as-mono"
              style={{ fontSize: 12, border: `1px solid ${C.line}`, borderRadius: 3, padding: '6px 8px', background: C.white, color: C.ink }}
            >
              {counties.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <button
              className="as-btn"
              onClick={handleSimulate}
              disabled={simulating}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
                background: C.alert, color: C.white, border: 'none', borderRadius: 3, padding: '9px 14px', cursor: simulating ? 'default' : 'pointer',
                opacity: simulating ? 0.75 : 1
              }}
            >
              {simulating ? <Loader2 size={14} className="as-live-dot" /> : <Zap size={14} />}
              {simulating ? 'Confirming drought…' : 'Simulate drought'}
            </button>

            <button
              className="as-btn"
              onClick={handleReset}
              title="Reset demo data"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 3, padding: '9px 10px', cursor: 'pointer', color: C.inkSoft }}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {showSettings && (
          <div style={{ borderTop: `1px solid ${C.line}`, background: C.white }}>
            <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Backend URL</span>
              <input
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                placeholder="https://your-agrishield-backend.onrender.com"
                className="as-mono"
                style={{ flex: 1, minWidth: 240, fontSize: 12, border: `1px solid ${C.line}`, borderRadius: 3, padding: '7px 9px', background: C.paper }}
              />
              {!connected ? (
                <button onClick={handleConnect} disabled={connecting} className="as-btn" style={{ fontSize: 12, fontWeight: 600, background: C.rain, color: C.white, border: 'none', borderRadius: 3, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {connecting ? <Loader2 size={13} className="as-live-dot" /> : <Wifi size={13} />} {connecting ? 'Connecting…' : 'Connect'}
                </button>
              ) : (
                <button onClick={handleDisconnect} className="as-btn" style={{ fontSize: 12, fontWeight: 600, background: 'transparent', color: C.alert, border: `1px solid ${C.alert}`, borderRadius: 3, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <WifiOff size={13} /> Disconnect
                </button>
              )}
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkSoft, padding: 4 }}>
                <X size={15} />
              </button>
              <div style={{ width: '100%', fontSize: 11, color: C.inkSoft }}>
                Without a connected backend, this dashboard runs entirely on sandbox data — every control still works for a demo.
              </div>
            </div>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '22px 20px 60px' }}>
        {/* ---------------- Overview ---------------- */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 26 }}>
          <StatCard icon={Users} label="Farmers registered" value={overview.totalFarmers} />
          <StatCard icon={ShieldCheck} label="Active policies" value={overview.activePolicies} accent={C.rain} />
          <StatCard icon={ShieldAlert} label="Policies triggered" value={overview.policiesTriggered} accent={overview.policiesTriggered ? C.alert : C.inkSoft} />
          <StatCard icon={Wallet} label="Compensation paid" value={`KES ${overview.totalCompensationPaid.toLocaleString()}`} accent={overview.totalCompensationPaid ? C.ochre : C.inkSoft} />
        </div>

        {/* ---------------- Weather Monitoring ---------------- */}
        <section style={{ marginBottom: 30 }}>
          <SectionHeader eyebrow="Instrument readings" title="Weather monitoring" />
          {weather.length === 0 ? (
            <EmptyState text="No counties reporting yet. Once a farmer registers, their county appears here." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
              {weather.map((w) => (
                <RainGauge
                  key={w.county}
                  county={w.county}
                  rainfall={w.rainfallAmount}
                  threshold={w.threshold}
                  dryDays={w.consecutiveDryDays}
                  justTriggered={justTriggeredCounty === w.county}
                />
              ))}
            </div>
          )}
        </section>

        {/* ---------------- Farmer Management ---------------- */}
        <section style={{ marginBottom: 30 }}>
          <SectionHeader eyebrow={`${farmers.length} registered`} title="Farmer ledger" />
          {farmers.length === 0 ? (
            <EmptyState text="No farmers yet. They register free by dialing *384*123# — nothing to do here until the first call comes in." />
          ) : (
            <div className="as-scroll" style={{ overflowX: 'auto', border: `1px solid ${C.line}`, borderRadius: 4, background: C.white }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: C.panel }}>
                    {['Farmer', 'Phone', 'County', 'Crop', 'Size', 'Policy'].map((h) => (
                      <Th key={h}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {farmers.map((f, i) => (
                    <tr key={f.id} style={{ borderTop: `1px solid ${C.panel}` }}>
                      <Td strong>{f.name}</Td>
                      <Td mono>{f.phoneNumber}</Td>
                      <Td>{f.county}</Td>
                      <Td>{f.cropType}</Td>
                      <Td mono>{f.farmSize} ac</Td>
                      <Td><StatusPill status={f.policyStatus} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------------- Payout Management ---------------- */}
        <section>
          <SectionHeader eyebrow={payouts.length ? `KES ${overview.totalCompensationPaid.toLocaleString()} disbursed` : 'No activity yet'} title="Payout ledger" />
          {payouts.length === 0 ? (
            <EmptyState text="No payouts yet. Run “Simulate drought” above to see a policy trigger and pay out automatically, end to end." />
          ) : (
            <div className="as-scroll" style={{ overflowX: 'auto', border: `1px solid ${C.line}`, borderRadius: 4, background: C.white }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: C.panel }}>
                    {['Farmer', 'County', 'Amount', 'Trigger reason', 'Status', 'Date'].map((h) => (
                      <Th key={h}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className={p.id === newestPayoutId ? 'as-row-new' : ''} style={{ borderTop: `1px solid ${C.panel}` }}>
                      <Td strong>{p.farmerName}</Td>
                      <Td>{p.county}</Td>
                      <Td mono style={{ color: C.ochre, fontWeight: 600 }}>KES {p.amount.toLocaleString()}</Td>
                      <Td style={{ color: C.inkSoft, maxWidth: 280 }}>{p.triggerReason}</Td>
                      <Td><StatusPill status={p.status} /></Td>
                      <Td mono>{new Date(p.date).toLocaleDateString()}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: C.ink, color: C.paper, padding: '10px 18px', borderRadius: 4, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.25)', zIndex: 50
          }}
        >
          <Radio size={13} color={toastColor === C.ink ? C.paper : toastColor} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                 */
/* ------------------------------------------------------------------ */
function SectionHeader({ eyebrow, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
      <h2 className="as-display" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h2>
      <span className="as-mono" style={{ fontSize: 11, color: C.inkSoft, letterSpacing: 0.5, textTransform: 'uppercase' }}>{eyebrow}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ border: `1px dashed ${C.line}`, borderRadius: 4, padding: '26px 20px', textAlign: 'center', color: C.inkSoft, fontSize: 13, background: C.white }}>
      {text}
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: C.inkSoft }}>{children}</th>;
}

function Td({ children, strong, mono, style }) {
  return (
    <td
      className={mono ? 'as-mono' : undefined}
      style={{ padding: '10px 14px', fontWeight: strong ? 600 : 400, whiteSpace: mono ? 'nowrap' : 'normal', ...style }}
    >
      {children}
    </td>
  );
}

function StatusPill({ status }) {
  const map = {
    Active: { bg: C.rainSoft, fg: C.rain },
    Triggered: { bg: C.alertSoft, fg: C.alert },
    Approved: { bg: C.alertSoft, fg: C.alert },
    Paid: { bg: C.rainSoft, fg: C.rain },
    Notified: { bg: '#E4D9B9', fg: C.ochre },
    Lapsed: { bg: '#E4D9B9', fg: C.inkSoft },
    Unknown: { bg: '#E4D9B9', fg: C.inkSoft }
  };
  const { bg, fg } = map[status] || map.Unknown;
  return (
    <span className="as-mono" style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 3, background: bg, color: fg }}>
      {status}
    </span>
  );
}
