import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 80, color: '#ccc' }}>
      <h1 style={{ color: '#e94560', fontSize: '3rem' }}>404</h1>
      <p>Page not found.</p>
      <Link to="/" style={{ color: '#e94560' }}>Go Home</Link>
    </div>
  );
}
