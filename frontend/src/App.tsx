import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Activity, LogOut, ChevronDown, User, CreditCard, LayoutDashboard } from 'lucide-react';

import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Landing from './pages/Landing.tsx';
import Profile from './pages/Profile.tsx';
import Subscription from './pages/Subscription.tsx';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color="var(--primary)" size={28} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Competitor Tracker</h2>
          </Link>
          
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {isAuthenticated ? (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Link to="/dashboard" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
                
                <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)} 
                  className="btn btn-outline" 
                  style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-glass)' }}
                >
                  <User size={18} />
                  Account
                  <ChevronDown size={14} style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                
                {dropdownOpen && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    right: 0, 
                    marginTop: '0.5rem',
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    minWidth: '200px',
                    zIndex: 50,
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Link 
                        to="/dashboard" 
                        onClick={() => setDropdownOpen(false)}
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', textDecoration: 'none', borderBottom: '1px solid var(--border-light)' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <LayoutDashboard size={16} /> Dashboard
                      </Link>
                      <Link 
                        to="/profile" 
                        onClick={() => setDropdownOpen(false)}
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', textDecoration: 'none', borderBottom: '1px solid var(--border-light)' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <User size={16} /> Profile
                      </Link>
                      <Link 
                        to="/subscription" 
                        onClick={() => setDropdownOpen(false)}
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', textDecoration: 'none', borderBottom: '1px solid var(--border-light)' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <CreditCard size={16} /> Subscription
                      </Link>
                      <button 
                        onClick={() => { setDropdownOpen(false); handleLogout(); }} 
                        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', fontSize: '1rem', fontFamily: 'inherit' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <LogOut size={16} /> Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            ) : (
              <>
                <Link to="/login" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>Log In</Link>
                <Link to="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>Sign Up</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={!isAuthenticated ? <Login setAuth={setIsAuthenticated} /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={!isAuthenticated ? <Signup setAuth={setIsAuthenticated} /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/subscription" element={isAuthenticated ? <Subscription /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
