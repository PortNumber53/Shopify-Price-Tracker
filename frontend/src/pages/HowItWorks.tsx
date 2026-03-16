import { Link } from 'react-router-dom';
import { UserPlus, Link2, Bell, TrendingDown, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    n: 1,
    icon: UserPlus,
    title: 'Create your account',
    desc: "Sign up with your email address. No credit card required to start — the Free plan is yours immediately.",
    detail: [
      'Email & password signup',
      'Instant access to your dashboard',
      'Free plan active right away',
      'Upgrade at any time',
    ],
  },
  {
    n: 2,
    icon: Link2,
    title: 'Add competitor URLs',
    desc: "Paste the product page URL of any competitor and give it a friendly name. We handle the rest.",
    detail: [
      'Supports any public product page',
      'Works with any e-commerce platform',
      'Add up to your plan limit',
      'Remove or replace trackers anytime',
    ],
  },
  {
    n: 3,
    icon: TrendingDown,
    title: 'We monitor prices automatically',
    desc: 'Our scraping engine checks your tracked URLs on your plan schedule — daily, hourly, or near real-time.',
    detail: [
      'Free: daily checks',
      'Pro: hourly checks',
      'Premium: near real-time checks',
      'All checks run automatically',
    ],
  },
  {
    n: 4,
    icon: Bell,
    title: 'Get instant alerts',
    desc: 'When a price changes, you receive an email notification immediately. No need to check the dashboard.',
    detail: [
      'Email alert on every price change',
      'Shows old price and new price',
      'Includes percentage change',
      'Optional daily digest summary',
    ],
  },
];

export default function HowItWorks() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem 4rem', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1rem' }}>
            From sign-up to alerts in under 5 minutes
          </h1>
          <p style={{ fontSize: '1.125rem' }}>
            No technical setup required. Just paste a URL and let us do the monitoring.
          </p>
        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {STEPS.map((step, idx) => (
            <div key={step.n} style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

              {/* Step number */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', flexShrink: 0 }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.125rem' }}>
                  {step.n}
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{ width: '2px', height: '3rem', background: 'var(--border-light)', marginTop: '0.5rem' }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: '260px', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <step.icon size={20} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{step.title}</h3>
                </div>
                <p style={{ marginBottom: '1.25rem', fontSize: '1rem', lineHeight: 1.65 }}>{step.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {step.detail.map(d => (
                    <li key={d} style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Ready to get started?</h2>
          <p style={{ marginBottom: '2rem' }}>
            Create a free account and start tracking your first competitor URL in minutes.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Start Free <ArrowRight size={16} />
            </Link>
            <Link to="/pricing" className="btn btn-outline" style={{ textDecoration: 'none' }}>
              View Pricing
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
