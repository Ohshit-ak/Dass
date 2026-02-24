import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-hero">
        <h1>🎉 Felicity Event Management</h1>
        <p>Your one-stop platform for events, registrations, and club management.</p>
        <div className="landing-actions">
          <Link to="/login" className="btn-primary">Login</Link>
          <Link to="/signup" className="btn-secondary">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
