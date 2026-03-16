import { Link } from 'react-router-dom';
import { Eye, Bell, TrendingDown, ArrowRight, Check } from 'lucide-react';

const FEATURES = [
  {
    icon: Eye,
    color: 'var(--primary)',
    bg: 'rgba(37, 99, 235, 0.08)',
    title: 'Real-time Monitoring',
    description: 'Track competitor product URLs with automatic price checks. Hourly checks on Pro and Premium plans.',
  },
  {
    icon: Bell,
    color: 'var(--success)',
    bg: 'rgba(22, 163, 74, 0.08)',
    title: 'Instant Alerts',
    description: 'Get email notifications the moment a competitor changes their price. React faster than the competition.',
  },
  {
    icon: TrendingDown,
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.08)',
    title: 'Price History',
    description: 'See previous prices and track percentage changes over time. Make data-driven pricing decisions.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Try it out',
    features: ['1 URL tracker', 'Daily price checks', 'Email alerts', '7-day history'],
    cta: 'Get Started Free',
    href: '/signup',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'For active sellers',
    features: ['25 URL trackers', 'Price checks up to 4× daily', 'Instant email alerts', '30-day history', 'Price change dashboard'],
    cta: 'Start Free Trial',
    href: '/signup',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Premium',
    price: '$50',
    period: '/mo',
    description: 'For power users',
    features: ['100 URL trackers', 'Up to hourly price checks', 'Instant email alerts', '1-year price history', 'Priority support', 'Dedicated parsing engine'],
    cta: 'Go Premium',
    href: '/signup',
    highlighted: false,
    badge: null,
  },
];

const STEPS = [
  { n: 1, title: 'Create your account', desc: 'Sign up with your email and activate your subscription through our secure Stripe checkout.' },
  { n: 2, title: 'Add competitor URLs', desc: 'Paste product links from any competitor website and give them a friendly name to track.' },
  { n: 3, title: 'Get price alerts', desc: 'Sit back and receive email notifications whenever a tracked price changes.' },
];

export default function Landing() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem 4.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '100px', border: '1px solid var(--border-light)', background: 'rgba(37, 99, 235, 0.06)', padding: '0.375rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', flexShrink: 0 }} />
            Now tracking 10,000+ products
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
            Track Competitor Prices.{' '}
            <span className="text-gradient">Get Alerts Automatically.</span>
          </h1>

          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '620px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            A lean SaaS for Shopify sellers. Paste competitor URLs and receive instant alerts when prices change. Starting free.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', textDecoration: 'none' }}>
              Start Tracking Free <ArrowRight size={18} />
            </Link>
            <Link to="/how-it-works" className="btn btn-outline" style={{ padding: '0.875rem 2rem', fontSize: '1rem', textDecoration: 'none' }}>
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section id="features" style={{ padding: '5rem 1.5rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>Everything you need to stay competitive</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem' }}>Simple, powerful tools designed for Shopify store owners</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map(f => (
              <div key={f.title} className="glass-card">
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <f.icon size={24} color={f.color} />
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.9375rem', marginBottom: 0 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>Get started in 3 steps</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem' }}>From sign-up to insights in under 5 minutes</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '0.9375rem', color: 'white' }}>
                  {s.n}
                </div>
                <div>
                  <h3 style={{ marginBottom: '0.375rem', fontSize: '1.125rem' }}>{s.title}</h3>
                  <p style={{ marginBottom: 0, fontSize: '0.9375rem' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '5rem 1.5rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>Simple, transparent pricing</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem' }}>Start free, scale as you grow. Cancel anytime.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{
                padding: '2rem',
                borderRadius: '16px',
                border: plan.highlighted ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                background: plan.highlighted ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-card)',
                boxShadow: plan.highlighted ? '0 4px 24px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {plan.badge && (
                  <span style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.875rem', borderRadius: '100px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </span>
                )}
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{plan.name}</h3>
                <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>{plan.description}</p>
                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>{plan.price}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
                      <Check size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href}
                  className={plan.highlighted ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ textDecoration: 'none', justifyContent: 'center' }}
                >
                  {plan.cta}
                </Link>
                {plan.highlighted && (
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
                    14-day free trial. Cancel anytime.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{ padding: '2.5rem 1.5rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-glass)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <img src="/logo.png" alt="Logo" width={20} height={20} style={{ borderRadius: '4px' }} />
            <span style={{ fontWeight: 600, fontSize: '1.0625rem', color: 'var(--text-main)' }}>Competitor Tracker</span>
          </Link>

          <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/features" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Features</Link>
            <Link to="/pricing" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Pricing</Link>
            <Link to="/how-it-works" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>How it works</Link>
            <Link to="/terms" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</Link>
            <Link to="/privacy" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy</Link>
          </div>

          <p style={{ marginBottom: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>© {new Date().getFullYear()} Competitor Tracker. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
