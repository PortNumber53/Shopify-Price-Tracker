export default function Profile() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', flex: 1, textAlign: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1rem' }}>User Profile</h2>
        <div style={{ textAlign: 'left', marginTop: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Email:</span>
            <span style={{ marginLeft: '1rem', fontWeight: 600 }}>{user.email || 'N/A'}</span>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Subscription:</span>
            <span style={{ marginLeft: '1rem', fontWeight: 600 }}>
              {user.subscription_active ? (
                <span style={{ color: 'var(--success)' }}>Active</span>
              ) : (
                <span style={{ color: 'var(--danger)' }}>Inactive</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
