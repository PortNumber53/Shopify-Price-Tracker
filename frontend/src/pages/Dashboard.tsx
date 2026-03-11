import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, RefreshCw, Activity, LineChart, X } from 'lucide-react';

const API_URL = (import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:20911').replace(/\/$/, '');

interface TrackedURL {
  id: string;
  product_name: string;
  url: string;
  last_price: number;
  created_at: string;
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
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1rem' }}>Subscription Required</h2>
          <p style={{ marginBottom: '2rem' }}>Subscribe to the Competitor Price Tracker to start monitoring URLs automatically.</p>
          <button onClick={handleSubscribe} className="btn btn-primary" style={{ width: '100%' }}>
            Subscribe Now - $19/mo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', flex: 1, position: 'relative' }}>
        {historyModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3>Price History</h3>
              <button onClick={() => setHistoryModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            {loadingHistory ? (
              <p>Loading history...</p>
            ) : historyData.length === 0 ? (
              <p>No price history recorded yet. Check back after the next scrape.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {historyData.map(log => (
                  <li key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span>{new Date(log.checked_at).toLocaleDateString()} {new Date(log.checked_at).toLocaleTimeString()}</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>${log.price.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Watcher Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={handleSync} 
            disabled={isSyncing || urls.length === 0}
            className="btn btn-outline"
            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--border-light)', color: 'var(--text-main)', fontSize: '0.875rem' }}
          >
            {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Synchronize
          </button>
          <span style={{ color: 'var(--text-muted)' }}>{urls.length} active trackers</span>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Track New Product</h3>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>{error}</div>}
        
        <form onSubmit={handleAddUrl} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input 
              type="text" 
              placeholder="Product Name (e.g. Acme Widgets)" 
              value={newProductName} 
              onChange={e => setNewProductName(e.target.value)} 
              required 
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ flex: 2, minWidth: '300px' }}>
            <input 
              type="url" 
              placeholder="Competitor URL (https://...)" 
              value={newUrl} 
              onChange={e => setNewUrl(e.target.value)} 
              required 
              style={{ marginBottom: 0 }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isAdding || urls.length >= maxTrackers}>
            {isAdding ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            Start Tracking
          </button>
        </form>
        {urls.length >= maxTrackers && (
          <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            You've reached your plan's limit of {maxTrackers} trackers.
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading trackers...</div>
      ) : urls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-light)', borderRadius: '16px' }}>
          <Activity size={48} color="var(--border-light)" style={{ marginBottom: '1rem' }} />
          <h3>No trackers active</h3>
          <p>Add a product URL above to start monitoring competitor prices.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {urls.map(url => (
            <div key={url.id} className="glass-card url-card">
              <div className="url-card-header">
                <div>
                  <h3 style={{ marginBottom: '0.25rem' }}>{url.product_name}</h3>
                  <a href={url.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                    View Listing <ExternalLink size={14} />
                  </a>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => fetchHistory(url.id)} 
                    className="btn btn-outline" 
                    style={{ padding: '0.5rem', color: 'var(--text-main)', borderColor: 'var(--border-light)' }}
                    title="View History"
                  >
                    <LineChart size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(url.id)} 
                    className="btn btn-outline" 
                    style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'transparent' }}
                    title="Delete Tracker"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div style={{ marginTop: '1.5rem' }}>
                <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Current Price</span>
                <div className="price-display">
                  {url.last_price > 0 ? `$${url.last_price.toFixed(2)}` : 'Pending...'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
