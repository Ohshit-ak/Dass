import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getOrganizerEvents } from '../../services/api';
import './Dashboard.css';

export default function ClubDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEvents = async () => {
    try {
      const data = await getOrganizerEvents(user._id || user.id, user.token);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  const getStatus = (ev) => {
    if (ev.Action === 'draft') return 'Draft';
    if (new Date(ev.Event_end) < now) return 'Completed';
    if (new Date(ev.Event_start) <= now && new Date(ev.Event_end) >= now) return 'Ongoing';
    return 'Published';
  };

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => getStatus(e).toLowerCase() === filter);

  const totalRevenue = events.reduce((sum, e) => sum + (e.Registration_fee || 0) * (e.Attendance || 0), 0);

  return (
    <div className="dashboard-page">
      <h1>Organizer Dashboard</h1>
      <p className="dashboard-subtitle">Logged in as {user?.email}</p>

      {/* Analytics row */}
      <div className="dashboard-grid">
        <div className="dash-card">
          <h3>📊 Total Events</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#e94560' }}>{events.length}</p>
        </div>
        <div className="dash-card">
          <h3>📈 Total Attendance</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#51cf66' }}>{events.reduce((s, e) => s + (e.Attendance || 0), 0)}</p>
        </div>
        <div className="dash-card">
          <h3>� Est. Revenue</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#ffd43b' }}>₹{totalRevenue}</p>
        </div>
        <div className="dash-card">
          <h3>➕ Create Event</h3>
          <Link to="/events/create" className="btn-primary" style={{ display: 'inline-block', marginTop: 8 }}>New Event</Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginTop: 28 }}>
        {['all', 'draft', 'published', 'ongoing', 'completed'].map(f => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Event cards */}
      {loading ? <p>Loading events...</p> : (
        <div className="events-carousel">
          {filteredEvents.length === 0 && <p className="placeholder">No events found.</p>}
          {filteredEvents.map(ev => {
            const status = getStatus(ev);
            const isOngoingOrCompleted = status === 'Ongoing' || status === 'Completed';
            return (
              <div key={ev._id} className="dash-card" style={{ marginBottom: 12 }}>
                <Link to={`/events/${ev._id}`} className="event-card-link" style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{ev.name}</h3>
                    <span className={`status-pill ${status.toLowerCase()}`}>{status}</span>
                  </div>
                  <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 4 }}>
                    {ev.Event_type === 'merchandise' ? '🛍️ Merch' : '📅 Event'} · {new Date(ev.Event_start).toLocaleDateString()}
                  </p>
                </Link>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {isOngoingOrCompleted && (
                    <Link to={`/events/${ev._id}?tab=attendance`} className="btn-small">📷 Attendance</Link>
                  )}
                  {ev.Event_type === 'merchandise' && (
                    <Link to={`/events/${ev._id}?tab=orders`} className="btn-small">💳 Orders</Link>
                  )}
                  <Link to={`/events/${ev._id}?tab=analytics`} className="btn-small">📊 Analytics</Link>
                  <Link to={`/events/${ev._id}?tab=participants`} className="btn-small">👥 Participants</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
