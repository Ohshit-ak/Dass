import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 80, color: '#ccc' }}>
      <h1 style={{ color: '#e94560', fontSize: '2rem' }}>🚫 Unauthorized</h1>
      <p>You don't have permission to view this page.</p>
      <Link to="/dashboard" style={{ color: '#e94560' }}>Back to Dashboard</Link>
    </div>
  );
}
