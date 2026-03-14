import { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Check, Zap } from 'lucide-react';

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

export default function Subscription() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(localUser);

    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
          }
        })
        .catch(console.error);
    }
  }, []);

  const handleCheckout = async (planType: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: planType })
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/stripe/portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

        {/* ── Page header ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <CreditCard size={26} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Subscription & Billing</h2>
        </div>

        {/* ── Current plan summary ─────────────────────────── */}
        <div className="glass-card" style={{ marginBottom: '2.5rem', padding: '1.5rem 2rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Plan</h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Status</span>
            <span style={{
              fontWeight: 600, fontSize: '0.8125rem', padding: '0.25rem 0.75rem', borderRadius: '100px',
              background: user.subscription_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)',
              color: user.subscription_active ? 'var(--success)' : 'var(--danger)'
            }}>
              {user.subscription_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Plan</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{getPlanLabel()}</span>
          </div>

          {user.subscription_active && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
              <button
                onClick={handlePortal}
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                <ExternalLink size={16} />
                {loading ? 'Redirecting…' : 'Manage Subscription & Invoices'}
              </button>
            </div>
          )}
        </div>

        {/* ── Plans grid ───────────────────────────────────── */}
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', textAlign: 'center' }}>Choose a plan</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {PLANS.map(plan => {
            const isCurrent = activePlanKey === plan.key;

            return (
              <div key={plan.key} style={{
                padding: '1.75rem',
                borderRadius: '16px',
                border: isCurrent ? '2px solid var(--primary)' : plan.highlighted ? '1px solid rgba(79, 70, 229, 0.4)' : '1px solid var(--border-light)',
                background: isCurrent ? 'rgba(79, 70, 229, 0.07)' : 'var(--bg-card)',
                backdropFilter: 'blur(12px)',
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
                  <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', opacity: 0.6 }} disabled>
                    Current Plan
                  </button>
                ) : plan.key === 'free' ? (
                  <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handlePortal} disabled={loading}>
                    {loading ? 'Redirecting…' : 'Downgrade (via Portal)'}
                  </button>
                ) : (
                  <button
                    onClick={() => user.subscription_active ? handlePortal() : handleCheckout(plan.key)}
                    className={plan.highlighted ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={loading}
                  >
                    <Zap size={15} />
                    {loading ? 'Redirecting…' : user.subscription_active ? 'Switch Plan' : `Subscribe — ${plan.price}/mo`}
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
