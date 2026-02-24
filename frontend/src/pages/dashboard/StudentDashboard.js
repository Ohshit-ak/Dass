import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getMyRegistrations } from '../../services/api';
import './Dashboard.css';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRegistrations = async () => {
    try {
      const data = await getMyRegistrations(user.token);
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch registrations', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  const upcomingEvents = registrations.filter(r =>
    r.Event_id && r.Event_id.Event_type === 'normal' && new Date(r.Event_id.Event_start) > now
  );

  const pastEvents = registrations.filter(r =>
    r.Event_id && r.Event_id.Event_type === 'normal' && new Date(r.Event_id.Event_start) <= now
  );

  const merchandise = registrations.filter(r =>
    r.Event_id && r.Event_id.Event_type === 'merchandise'
  );

  const renderEventList = (list) => {
    if (list.length === 0) return <p className="placeholder">No records found.</p>;

    return (
      <div className="registrations-list">
        {list.map(reg => (
          <Link to={`/events/${reg.Event_id?._id}`} key={reg._id} className="reg-card-link">
            <div className="reg-card">
              <h4>{reg.Event_id?.name || 'Unknown Event'}</h4>
              <p className="reg-details">
                Type: {reg.Event_id?.Event_type === 'merchandise' ? '🛍️ Merch' : '📅 Event'}
              </p>
              {reg.Event_id?.Event_type === 'normal' && (
                <p className="reg-date">Date: {new Date(reg.Event_id.Event_start).toLocaleDateString()}</p>
              )}
              <div className="ticket-section">
                <span>Ticket: <code style={{ color: '#4dabf7' }}>{reg.ticketId ? reg.ticketId.slice(0, 12) + '...' : reg._id.slice(-6).toUpperCase()}</code></span>
                <span className={`status-pill ${reg.status || 'confirmed'}`}>{reg.status || 'confirmed'}</span>
              </div>
              {reg.Event_id?.Event_type === 'merchandise' && reg.paymentStatus && (
                <div style={{ marginTop: 6 }}>
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>Payment: </span>
                  <span className={`status-pill ${reg.paymentStatus}`}>{reg.paymentStatus}</span>
                  {reg.merchandiseSelection && (
                    <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: 8 }}>
                      {reg.merchandiseSelection.size}/{reg.merchandiseSelection.color}
                    </span>
                  )}
                </div>
              )}
              {reg.qrCode && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <img src={reg.qrCode} alt="QR" style={{ maxWidth: 80, borderRadius: 6 }} />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <h1>My Events</h1>
      <p className="dashboard-subtitle">Welcome, {user?.email}</p>

      <div className="tabs">
        <button className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => setActiveTab('upcoming')}>Upcoming ({upcomingEvents.length})</button>
        <button className={activeTab === 'past' ? 'active' : ''} onClick={() => setActiveTab('past')}>History ({pastEvents.length})</button>
        <button className={activeTab === 'merch' ? 'active' : ''} onClick={() => setActiveTab('merch')}>Merchandise ({merchandise.length})</button>
      </div>

      <div className="tab-content">
        {loading ? <p>Loading...</p> : (
          <>
            {activeTab === 'upcoming' && renderEventList(upcomingEvents)}
            {activeTab === 'past' && renderEventList(pastEvents)}
            {activeTab === 'merch' && renderEventList(merchandise)}
          </>
        )}
      </div>
    </div>
  );
}
