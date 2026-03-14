import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, RefreshCw, Activity, LineChart, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const API_URL = (import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:20911').replace(/\/$/, '');

interface TrackedURL {
  id: string;
  product_name: string;
  url: string;
  last_price: number;
  previous_price?: number;
  created_at: string;
  last_checked?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function priceChange(current: number, previous?: number): { pct: number | null; dir: 'up' | 'down' | 'same' } {
  if (!previous || previous === 0) return { pct: null, dir: 'same' };
  const diff = ((current - previous) / previous) * 100;
  if (Math.abs(diff) < 0.01) return { pct: 0, dir: 'same' };
  return { pct: Math.abs(diff), dir: diff > 0 ? 'up' : 'down' };
}

export default function Dashboard() {
  const [urls, setUrls] = useState<TrackedURL[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProductName, setNewProductName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  const [isSubscribed, setIsSubscribed] = useState(true);
  const [maxTrackers, setMaxTrackers] = useState(1);

  useEffect(() => {
    const updateMaxTrackers = (u: any) => {
      let max = 1;
      if (u && u.subscription_active) {
        if (u.plan_type === 'premium') max = 100;
        else max = 25; // Default Pro limit
      }
      setMaxTrackers(max);
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.subscription_active === false) {
      setIsSubscribed(false);
    }
    updateMaxTrackers(user);

    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setIsSubscribed(data.user.subscription_active !== false);
            updateMaxTrackers(data.user);
          }
        })
        .catch(console.error);
    }
  }, []);

  const fetchUrls = async () => {
    try {
      const res = await fetch(`${API_URL}/api/urls`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUrls(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch URLs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAdding(true);
    
    try {
      const res = await fetch(`${API_URL}/api/urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ product_name: newProductName, url: newUrl })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add URL');
      
      setUrls([data, ...urls]);
      setNewProductName('');
      setNewUrl('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to stop tracking this URL?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/urls/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (res.ok) {
        setUrls(urls.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete URL:', err);
    }
  };

  const fetchHistory = async (id: string) => {
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/urls/${id}/history`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setHistoryData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/urls/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        // Wait a few seconds for the background worker to finish scraping
        setTimeout(() => {
          fetchUrls();
          setIsSyncing(false);
        }, 3000);
      } else {
        setIsSyncing(false);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setIsSyncing(false);
    }
  };

  if (!isSubscribed) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', flex: 1, textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Activity size={28} color="var(--primary)" />
          </div>
          <h2 style={{ marginBottom: '0.75rem' }}>Subscription Required</h2>
          <p style={{ marginBottom: '2rem' }}>Subscribe to start monitoring competitor prices automatically.</p>
          <button onClick={handleSubscribe} className="btn btn-primary" style={{ width: '100%' }}>
            View Plans & Subscribe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', flex: 1 }}>

      {/* ── History Modal ─────────────────────────────────── */}
      {historyModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Price History</h3>
              <button onClick={() => setHistoryModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            {loadingHistory ? (
              <p style={{ textAlign: 'center', padding: '2rem 0' }}>Loading history…</p>
            ) : historyData.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem 0' }}>No price history recorded yet. Check back after the next scrape.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {historyData.map(log => (
                  <li key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(log.checked_at).toLocaleDateString()} {new Date(log.checked_at).toLocaleTimeString()}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>${log.price.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Watcher Dashboard</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            {urls.length} / {maxTrackers} trackers active
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing || urls.length === 0}
          className="btn btn-outline"
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          <RefreshCw size={15} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
          {isSyncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>

      {/* ── Add URL Form ──────────────────────────────────── */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.0625rem' }}>Track a new product</h3>
        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleAddUrl} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <input
            type="text"
            placeholder="Product name (e.g. Acme Widgets)"
            value={newProductName}
            onChange={e => setNewProductName(e.target.value)}
            required
            style={{ flex: '1 1 180px', marginBottom: 0 }}
          />
          <input
            type="url"
            placeholder="Competitor URL (https://…)"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            required
            style={{ flex: '2 1 260px', marginBottom: 0 }}
          />
          <button type="submit" className="btn btn-primary" disabled={isAdding || urls.length >= maxTrackers} style={{ flexShrink: 0 }}>
            {isAdding ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
            {isAdding ? 'Adding…' : 'Add Tracker'}
          </button>
        </form>
        {urls.length >= maxTrackers && (
          <p style={{ marginTop: '0.625rem', marginBottom: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            You've reached your plan limit of {maxTrackers} trackers. <a href="/subscription" style={{ color: 'var(--primary)' }}>Upgrade your plan</a> for more.
          </p>
        )}
      </div>

      {/* ── URL List ─────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Loading trackers…</p>
        </div>
      ) : urls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-light)', borderRadius: '16px' }}>
          <Activity size={40} color="var(--border-light)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No trackers yet</h3>
          <p style={{ margin: 0 }}>Add a competitor URL above to start monitoring prices.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {urls.map(url => {
            const change = priceChange(url.last_price, url.previous_price);
            const isActive = url.last_price > 0;
            const checkedAt = url.last_checked || url.created_at;

            return (
              <div key={url.id} className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>

                  {/* Left: status + name + url */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: 0 }}>
                    <div style={{ marginTop: '5px', flexShrink: 0 }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isActive ? 'var(--success)' : 'var(--text-muted)', boxShadow: isActive ? '0 0 6px var(--success)' : 'none' }} title={isActive ? 'Active' : 'Pending first scrape'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{url.product_name}</h3>
                      <a href={url.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url.url}</span>
                        <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
                      </a>
                    </div>
                  </div>

                  {/* Right: price + change + timestamp + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                    {/* Price */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {isActive ? `$${url.last_price.toFixed(2)}` : <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.9rem' }}>Pending…</span>}
                      </div>
                      {url.previous_price != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>was ${url.previous_price.toFixed(2)}</span>
                          {change.dir === 'down' && change.pct !== null && (
                            <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                              <TrendingDown size={12} /> {change.pct.toFixed(0)}%
                            </span>
                          )}
                          {change.dir === 'up' && change.pct !== null && (
                            <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                              <TrendingUp size={12} /> {change.pct.toFixed(0)}%
                            </span>
                          )}
                          {change.dir === 'same' && <Minus size={12} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'none' }} className="hide-mobile">
                      <span style={{ display: 'block' }}>Checked</span>
                      <span>{timeAgo(checkedAt)}</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        onClick={() => fetchHistory(url.id)}
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.6rem', borderColor: 'var(--border-light)' }}
                        title="Price History"
                      >
                        <LineChart size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(url.id)}
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.6rem', color: 'var(--danger)', borderColor: 'transparent' }}
                        title="Remove tracker"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 640px) { .hide-mobile { display: block !important; } }
      `}</style>
    </div>
  );
}
