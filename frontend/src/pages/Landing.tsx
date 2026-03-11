import { Link } from 'react-router-dom';
import { Activity, Bell, TrendingDown, DollarSign } from 'lucide-react';

export default function Landing() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 1.5rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(79, 70, 229, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '2rem' }}>
        <Activity color="var(--primary)" size={48} />
      </div>
      
      <h1 style={{ fontSize: '3.5rem', maxWidth: '800px', lineHeight: 1.1, marginBottom: '1.5rem' }}>
        Track your competitors' prices. <br />
        <span className="text-gradient">Automatically.</span>
      </h1>
      
      <p style={{ fontSize: '1.25rem', maxWidth: '600px', marginBottom: '3rem' }}>
        A lean SaaS for Shopify sellers. Paste up to 10 URLs and receive instant alerts when prices change. Stop checking manually.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/signup" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem', textDecoration: 'none' }}>Start Tracking Now</Link>
        <Link to="/login" className="btn btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.125rem', textDecoration: 'none' }}>Log In</Link>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginTop: '5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '300px', textAlign: 'left' }}>
          <Bell color="var(--primary)" size={32} style={{ marginBottom: '1rem' }} />
          <h3>Instant Alerts</h3>
          <p>Get notified immediately via email when a competitor drops their price.</p>
        </div>
        <div className="glass-card" style={{ maxWidth: '300px', textAlign: 'left' }}>
          <TrendingDown color="var(--success)" size={32} style={{ marginBottom: '1rem' }} />
          <h3>Beat the Market</h3>
          <p>Adjust your pricing dynamically to stay competitive without manual busywork.</p>
        </div>
        <div className="glass-card" style={{ maxWidth: '300px', textAlign: 'left' }}>
          <DollarSign color="#EAB308" size={32} style={{ marginBottom: '1rem' }} />
          <h3>Affordable Pricing</h3>
          <p>Designed specifically for small e-commerce stores. No enterprise bloat.</p>
        </div>
      </div>
    </div>
  );
}
