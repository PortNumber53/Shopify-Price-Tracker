import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Try it out, no card needed',
    features: ['1 URL tracker', 'Daily price checks', 'Email alerts', '7-day price history'],
    cta: 'Get Started Free',
    href: '/signup',
    highlighted: false,
    badge: null,
    note: null,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'For active Shopify sellers',
    features: [
      '25 URL trackers',
      'Price checks up to 4× daily',
      'Instant email alerts',
      '30-day price history',
      'Price change dashboard',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    highlighted: true,
    badge: 'Most Popular',
    note: '14-day free trial. Cancel anytime.',
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '$50',
    period: '/mo',
    description: 'For high-volume sellers',
    features: [
      '100 URL trackers',
      'Up to hourly price checks',
      'Instant email alerts',
      'Unlimited price history',
      'Priority support',
      'Dedicated parsing engine',
    ],
    cta: 'Go Premium',
    href: '/signup',
    highlighted: false,
    badge: null,
    note: null,
  },
];

const FAQ = [
  {
    q: 'Can I change plans at any time?',
    a: "Yes. You can upgrade or downgrade through the billing portal at any time. Changes take effect immediately and you'll be prorated.",
  },
  {
    q: "What happens when I hit my tracker limit?",
    a: "You won't be able to add new trackers until you remove an existing one or upgrade your plan.",
  },
  {
    q: 'How does the free trial work?',
    a: "Pro and Premium plans include a 14-day free trial. No credit card is charged until the trial ends. Cancel anytime before that.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We use Stripe for secure payments. All major credit and debit cards are accepted.',
  },
];

export default function Pricing() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem 4rem', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1rem' }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: '1.125rem' }}>
            Start free and scale as your store grows. No hidden fees, cancel anytime.
          </p>
        </div>
      </section>

      {/* ── Plans ────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
            {PLANS.map(plan => (
              <div
                key={plan.key}
                style={{
                  padding: '2rem',
                  borderRadius: '16px',
                  border: plan.highlighted ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  background: plan.highlighted ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-page)',
                  boxShadow: plan.highlighted ? '0 4px 24px rgba(37, 99, 235, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {plan.badge && (
                  <span style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.875rem', borderRadius: '100px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </span>
                )}
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>{plan.name}</h3>
                <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>{plan.description}</p>
                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>{plan.price}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
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
                {plan.note && (
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
                    {plan.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.875rem', marginBottom: '3rem' }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {FAQ.map(item => (
              <div key={item.q} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <h4 style={{ marginBottom: '0.625rem', fontSize: '1rem' }}>{item.q}</h4>
                <p style={{ marginBottom: 0, fontSize: '0.9375rem', lineHeight: 1.65 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
