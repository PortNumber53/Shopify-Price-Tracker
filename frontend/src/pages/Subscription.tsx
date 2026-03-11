import { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Activity } from 'lucide-react';

const API_URL = (import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:20911').replace(/\/$/, '');

export default function Subscription() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(localUser);
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

  const getPlanName = () => {
    if (!user.subscription_active) return 'Free (1 Tracker)';
    if (user.plan_type === 'premium') return 'Premium ($50/mo)';
    return 'Pro ($19/mo)';
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', flex: 1, textAlign: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <CreditCard size={28} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Subscription & Billing</h2>
        </div>

        <div style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Current Plan</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status</span>
            <span style={{ fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '100px', background: user.subscription_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: user.subscription_active ? 'var(--success)' : 'var(--danger)' }}>
              {user.subscription_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Plan</span>
            <span style={{ fontWeight: 600 }}>{getPlanName()}</span>
          </div>
          
          {user.subscription_active && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
              <button onClick={handlePortal} className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} disabled={loading}>
                <ExternalLink size={18} />
                {loading ? 'Redirecting...' : 'Manage Subscription & Invoices'}
              </button>
            </div>
          )}
        </div>

        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', textAlign: 'center' }}>Available Plans</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {/* Free Plan */}
          <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)', background: !user.subscription_active ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-glass)', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>Free</h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>$0<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span></div>
            <ul style={{ padding: 0, margin: '0 0 1.5rem 0', listStyle: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', flex: 1 }}>
              <li style={{ marginBottom: '0.5rem' }}>✓ 1 Tracker Match</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ Daily Sync</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ Limited Price History</li>
            </ul>
            <button className="btn btn-outline" style={{ width: '100%' }} disabled>
              {!user.subscription_active ? 'Current Plan' : 'Downgrade (via Portal)'}
            </button>
          </div>

          {/* Pro Plan */}
          <div style={{ padding: '1.5rem', borderRadius: '12px', border: user.plan_type === 'pro' && user.subscription_active ? '2px solid var(--primary)' : '1px solid var(--border-light)', background: user.plan_type === 'pro' && user.subscription_active ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-glass)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {user.plan_type === 'pro' && user.subscription_active && (
              <span style={{ position: 'absolute', top: '-10px', right: '1.5rem', background: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '100px', fontWeight: 600 }}>Active</span>
            )}
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>Pro</h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>$19<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span></div>
            <ul style={{ padding: 0, margin: '0 0 1.5rem 0', listStyle: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', flex: 1 }}>
              <li style={{ marginBottom: '0.5rem' }}>✓ 25 Tracker Matches</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ Automatic Price Alerts</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ Full Price History</li>
            </ul>
            {user.plan_type === 'pro' && user.subscription_active ? (
              <button className="btn btn-outline" style={{ width: '100%' }} disabled>Current Plan</button>
            ) : (
              <button onClick={() => user.subscription_active ? handlePortal() : handleCheckout('pro')} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} disabled={loading}>
                <Activity size={16} /> {user.subscription_active ? 'Change Plan' : 'Subscribe'}
              </button>
            )}
          </div>

          {/* Premium Plan */}
          <div style={{ padding: '1.5rem', borderRadius: '12px', border: user.plan_type === 'premium' && user.subscription_active ? '2px solid var(--primary)' : '1px solid var(--border-light)', background: user.plan_type === 'premium' && user.subscription_active ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-glass)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {user.plan_type === 'premium' && user.subscription_active && (
              <span style={{ position: 'absolute', top: '-10px', right: '1.5rem', background: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '100px', fontWeight: 600 }}>Active</span>
            )}
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>Premium</h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>$50<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span></div>
            <ul style={{ padding: 0, margin: '0 0 1.5rem 0', listStyle: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', flex: 1 }}>
              <li style={{ marginBottom: '0.5rem' }}>✓ 100 Tracker Matches</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ Priority Support</li>
              <li style={{ marginBottom: '0.5rem' }}>✓ Dedicated Parsing Engine</li>
            </ul>
            {user.plan_type === 'premium' && user.subscription_active ? (
              <button className="btn btn-outline" style={{ width: '100%' }} disabled>Current Plan</button>
            ) : (
              <button onClick={() => user.subscription_active ? handlePortal() : handleCheckout('premium')} className={!user.subscription_active ? "btn btn-outline" : "btn btn-primary"} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} disabled={loading}>
                <Activity size={16} /> {user.subscription_active ? 'Change Plan' : 'Subscribe'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
