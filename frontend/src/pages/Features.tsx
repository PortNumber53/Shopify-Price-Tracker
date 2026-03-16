import { Link } from 'react-router-dom';
import { Eye, Bell, TrendingDown, BarChart2, Mail, Zap, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Eye,
    color: 'var(--primary)',
    bg: 'rgba(37, 99, 235, 0.08)',
    title: 'Real-time URL Monitoring',
    description:
      "Paste any competitor product URL and we'll automatically detect price changes. Supports any e-commerce platform.",
  },
  {
    icon: Bell,
    color: 'var(--success)',
    bg: 'rgba(22, 163, 74, 0.08)',
    title: 'Instant Email Alerts',
    description:
      "Receive an email the moment a tracked price drops or rises. No polling dashboards — we notify you as soon as it happens.",
  },
  {
    icon: TrendingDown,
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.08)',
    title: 'Price Change History',
    description:
      "See a full timeline of every price change for each tracked product. Spot trends and make smarter repricing decisions.",
  },
  {
    icon: BarChart2,
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.08)',
    title: 'Price Change Dashboard',
    description:
      "A single view of all your tracked products with current price, previous price, and percentage change highlighted at a glance.",
  },
  {
    icon: Clock,
    color: 'var(--primary)',
    bg: 'rgba(37, 99, 235, 0.08)',
    title: 'Configurable Check Frequency',
    description:
      "Free accounts get daily checks. Pro accounts get hourly checks. Premium accounts get near real-time monitoring.",
  },
  {
    icon: Mail,
    color: 'var(--success)',
    bg: 'rgba(22, 163, 74, 0.08)',
    title: 'Daily Digest',
    description:
      "Prefer a summary over individual alerts? Opt-in to a daily digest email that lists all price changes from the past 24 hours.",
  },
  {
    icon: Zap,
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.08)',
    title: 'Dedicated Parsing Engine',
    description:
      "Premium accounts get a dedicated scraping worker with higher reliability and priority queue — ideal for high-volume sellers.",
  },
  {
    icon: ShieldCheck,
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.08)',
    title: 'Secure & Private',
    description:
      "Your tracked URLs and pricing data are private to your account. We never share or sell your competitive intelligence.",
  },
];

export default function Features() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero ────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem 4rem', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1rem' }}>
            Everything you need to stay competitive
          </h1>
          <p style={{ fontSize: '1.125rem', maxWidth: '540px', margin: '0 auto 2rem' }}>
            Simple, powerful tools built for online sellers who want to react to market changes instantly.
          </p>
          <Link to="/signup" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Start Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Feature Grid ────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map(f => (
              <div key={f.title} className="glass-card">
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <f.icon size={22} color={f.color} />
                </div>
                <h3 style={{ marginBottom: '0.625rem', fontSize: '1.0625rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.9375rem', marginBottom: 0, lineHeight: 1.65 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Ready to track smarter?</h2>
          <p style={{ marginBottom: '2rem' }}>Start for free — no credit card required. Upgrade when you need more trackers.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Get Started Free
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
