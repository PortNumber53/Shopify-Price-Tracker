import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = (import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:20911').replace(/\/$/, '');

export default function Login({ setAuth }: { setAuth: (val: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuth(true);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-form">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Welcome Back</h2>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="Store owner email" 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••" 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Log In</button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
