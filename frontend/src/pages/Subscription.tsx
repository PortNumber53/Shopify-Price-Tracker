import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { CreditCard, ExternalLink, Check, Zap, ArrowLeftRight, X, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

const API_URL = (import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:20911').replace(/\/$/, '');

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    features: ['1 URL tracker', 'Daily price checks', 'Email alerts', '7-day history'],
    highlighted: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/mo',
    features: ['25 URL trackers', 'Hourly price checks', 'Instant email alerts', '30-day history', 'Price change dashboard'],
    highlighted: true,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '$50',
    period: '/mo',
    features: ['100 URL trackers', 'Real-time price checks', 'Instant email alerts', 'Unlimited history', 'Priority support', 'Dedicated parsing engine'],
    highlighted: false,
  },
];

function formatDate(unix: number) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface SubInfo {
  subscription_active: boolean;
  plan_type: string;
  subscription_id: string;
  period_end: number;
}

export default function Subscription() {
  const location = useLocation();
  const { logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<typeof PLANS[0] | null>(null);
  const [switchSuccess, setSwitchSuccess] = useState(false);

  const apiFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });
    if (res.status === 401) {
      logout();
      throw new Error('session_expired');
    }
    return res;
  }, [logout]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('switch') === 'success') {
      setSwitchSuccess(true);
    }
  }, [location.search]);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(localUser);

    const token = localStorage.getItem('token');
    if (!token) return;

    apiFetch(`${API_URL}/api/auth/me`)
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
      })
      .catch(console.error);

    apiFetch(`${API_URL}/api/stripe/subscription`)
      .then(r => r.json())
      .then(data => setSubInfo(data))
      .catch(console.error);
  }, [apiFetch]);

  const handleCheckout = async (planType: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/api/stripe/checkout`, {
        method: 'POST',
        body: JSON.stringify({ plan: planType }),
      });
      if (res.ok) window.location.href = (await res.json()).url;
    } catch (err) {
      if ((err as Error).message !== 'session_expired') console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/api/stripe/portal`, { method: 'POST' });
      if (res.ok) window.location.href = (await res.json()).url;
    } catch (err) {
      if ((err as Error).message !== 'session_expired') console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchPlan = async (immediate: boolean) => {
    if (!switchTarget) return;
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/api/stripe/switch-plan`, {
        method: 'POST',
        body: JSON.stringify({ plan: switchTarget.key, immediate }),
      });
      if (res.ok) window.location.href = (await res.json()).url;
    } catch (err) {
      if ((err as Error).message !== 'session_expired') console.error(err);
    } finally {
      setLoading(false);
      setSwitchTarget(null);
    }
  };

  if (!user) return null;

  const activePlanKey = !user.subscription_active
    ? 'free'
    : (user.plan_type === 'premium' ? 'premium' : 'pro');

  const getPlanLabel = () => {
    if (!user.subscription_active) return 'Free';
    if (user.plan_type === 'premium') return 'Premium — $50/mo';
    return 'Pro — $19/mo';
  };

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', flex: 1 }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* ── Switch-plan modal ────────────────────────────── */}
        {switchTarget && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={e => { if (e.target === e.currentTarget) setSwitchTarget(null); }}>
            <div className="glass-card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
              <button onClick={() => setSwitchTarget(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                <ArrowLeftRight size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Switch to {switchTarget.name}</h3>
              </div>

              <p style={{ marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                You're currently on the <strong>{getPlanLabel()}</strong> plan.
                Choose how you'd like to switch to <strong>{switchTarget.name} ({switchTarget.price}/mo)</strong>:
              </p>

              {/* Option 1: Scheduled */}
              <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.25rem', marginBottom: '0.875rem', cursor: 'pointer', background: 'var(--bg-page)' }}
                onClick={() => !loading && handleSwitchPlan(false)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                  <Calendar size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ margin: '0 0 0.375rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                      Switch at next billing cycle
                    </p>
                    <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>
                      Your current plan stays active until{' '}
                      <strong>{subInfo?.period_end ? formatDate(subInfo.period_end) : 'the end of your billing period'}</strong>.
                      The new plan starts then — no double charges.
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-outline"
                  style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', pointerEvents: 'none' }}
                  disabled={loading}
                >
                  {loading ? 'Redirecting…' : `Schedule switch to ${switchTarget.name}`}
                </button>
              </div>

              {/* Option 2: Immediate */}
              <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', background: 'var(--bg-page)' }}
                onClick={() => !loading && handleSwitchPlan(true)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                  <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ margin: '0 0 0.375rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                      Switch immediately
                    </p>
                    <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>
                      You'll be charged for <strong>{switchTarget.name} ({switchTarget.price}/mo)</strong> now.
                      Your current subscription will be <strong>cancelled immediately</strong> with no refund for unused time.
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', pointerEvents: 'none' }}
                  disabled={loading}
                >
                  {loading ? 'Redirecting…' : `Switch now — ${switchTarget.price}/mo`}
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', marginBottom: 0 }}>
                You'll be taken to Stripe's secure checkout to complete payment.
              </p>
            </div>
          </div>
        )}

        {/* ── Page header ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <CreditCard size={26} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Subscription & Billing</h2>
        </div>

        {/* ── Switch success banner ────────────────────────── */}
        {switchSuccess && (
          <div style={{ background: 'rgba(22, 163, 74, 0.08)', border: '1px solid rgba(22, 163, 74, 0.25)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--success)', fontWeight: 500, fontSize: '0.9375rem' }}>
              ✓ Plan switch initiated successfully. Changes will reflect once Stripe confirms.
            </span>
            <button onClick={() => setSwitchSuccess(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Current plan summary ─────────────────────────── */}
        <div className="glass-card" style={{ marginBottom: '2.5rem', padding: '1.5rem 2rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Plan</h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Status</span>
            <span style={{
              fontWeight: 600, fontSize: '0.8125rem', padding: '0.25rem 0.75rem', borderRadius: '100px',
              background: user.subscription_active ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.08)',
              color: user.subscription_active ? 'var(--success)' : 'var(--danger)',
            }}>
              {user.subscription_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: subInfo?.period_end ? '0.875rem' : 0 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Plan</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{getPlanLabel()}</span>
          </div>

          {subInfo?.period_end ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Next billing date</span>
              <span style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.9375rem' }}>{formatDate(subInfo.period_end)}</span>
            </div>
          ) : null}

          {user.subscription_active && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
              <button onClick={handlePortal} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                <ExternalLink size={16} />
                {loading ? 'Redirecting…' : 'Manage Subscription & Invoices'}
              </button>
            </div>
          )}
        </div>

        {/* ── Plans grid ───────────────────────────────────── */}
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', textAlign: 'center' }}>
          {user.subscription_active ? 'Switch plan' : 'Choose a plan'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {PLANS.map(plan => {
            const isCurrent = activePlanKey === plan.key;

            return (
              <div key={plan.key} style={{
                padding: '1.75rem',
                borderRadius: '16px',
                border: isCurrent ? '2px solid var(--primary)' : plan.highlighted ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border-light)',
                background: isCurrent ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}>
                {isCurrent && (
                  <span style={{ position: 'absolute', top: '-12px', right: '1.25rem', background: 'var(--primary)', color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.625rem', borderRadius: '100px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current
                  </span>
                )}

                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem' }}>{plan.name}</h4>
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>{plan.price}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{plan.period}</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <Check size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', opacity: 0.5 }} disabled>
                    Current Plan
                  </button>
                ) : plan.key === 'free' ? (
                  <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handlePortal} disabled={loading}>
                    {loading ? 'Redirecting…' : 'Downgrade via Billing Portal'}
                  </button>
                ) : user.subscription_active ? (
                  <button
                    onClick={() => setSwitchTarget(plan)}
                    className={plan.highlighted ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={loading}
                  >
                    <ArrowLeftRight size={15} />
                    Switch to {plan.name}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.key)}
                    className={plan.highlighted ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={loading}
                  >
                    <Zap size={15} />
                    {loading ? 'Redirecting…' : `Subscribe — ${plan.price}/mo`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
          All paid plans include a 14-day free trial. Cancel anytime through the billing portal.
        </p>
      </div>
    </div>
  );
}
