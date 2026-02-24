import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getEvents as fetchEvents, getTrendingEvents, getUpcomingEvents } from '../services/api';
import './BrowseEvents.css';

export default function BrowseEvents() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [trending, setTrending] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showTrending, setShowTrending] = useState(true);
    const [showUpcoming, setShowUpcoming] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [type, setType] = useState('all');
    const [eligibility, setEligibility] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [followedClubs, setFollowedClubs] = useState(false);

    const loadEvents = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (type !== 'all') params.type = type;
            if (eligibility !== 'ALL') params.eligibility = eligibility;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (followedClubs) params.followedClubs = 'true';

            const data = await fetchEvents(params, user?.token);
            setEvents(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    }, [search, type, eligibility, startDate, endDate, followedClubs, user]);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    // Load trending events
    useEffect(() => {
        getTrendingEvents()
            .then(data => setTrending(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error fetching trending:', err));
        getUpcomingEvents()
            .then(data => setUpcoming(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error fetching upcoming:', err));
    }, []);

    return (
        <div className="browse-events-container">
            <h1>Browse Events</h1>

            {/* Trending Section */}
            {trending.length > 0 && (
                <div className="trending-section">
                    <div className="trending-header" onClick={() => setShowTrending(!showTrending)}>
                        <h2>🔥 Trending Now <span className="trending-badge">Top {trending.length} / 24h</span></h2>
                        <span className="trending-toggle">{showTrending ? '▼' : '▶'}</span>
                    </div>
                    {showTrending && (
                        <div className="trending-grid">
                            {trending.map((ev, idx) => (
                                <Link to={`/events/${ev._id}`} key={ev._id} className="event-card-link">
                                    <div className="trending-card">
                                        <span className="trending-rank">#{idx + 1}</span>
                                        <div className="trending-info">
                                            <h3>{ev.name}</h3>
                                            <p className="event-organizer">by {ev.organizer_name || 'Unknown'}</p>
                                            <p className="trending-stats">{ev.registrationCount} registration{ev.registrationCount !== 1 ? 's' : ''} in 24h</p>
                                        </div>
                                        <span className="event-type">{ev.Event_type === 'merchandise' ? '🛍️' : '📅'}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Upcoming Next 24h Section */}
            {upcoming.length > 0 && (
                <div className="trending-section upcoming-section">
                    <div className="trending-header" onClick={() => setShowUpcoming(!showUpcoming)}>
                        <h2>⏰ Starting Soon <span className="trending-badge upcoming-badge">Next 24h</span></h2>
                        <span className="trending-toggle">{showUpcoming ? '▼' : '▶'}</span>
                    </div>
                    {showUpcoming && (
                        <div className="trending-grid">
                            {upcoming.map((ev) => (
                                <Link to={`/events/${ev._id}`} key={ev._id} className="event-card-link">
                                    <div className="trending-card upcoming-card">
                                        <span className="trending-rank">⏰</span>
                                        <div className="trending-info">
                                            <h3>{ev.name}</h3>
                                            <p className="event-organizer">by {ev.Club_id?.organizer_name || 'Unknown'}</p>
                                            <p className="trending-stats upcoming-time">
                                                Starts {new Date(ev.Event_start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <span className="event-type">{ev.Event_type === 'merchandise' ? '🛍️' : '📅'}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="filters-section">
                <input
                    type="text"
                    placeholder="Search events or organizers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-bar"
                />

                <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="all">All Types</option>
                    <option value="normal">Normal</option>
                    <option value="merchandise">Merchandise</option>
                </select>

                <select value={eligibility} onChange={(e) => setEligibility(e.target.value)}>
                    <option value="ALL">All Eligibility</option>
                    <option value="IIIT">IIIT Only</option>
                    <option value="NON_IIIT">Non-IIIT Only</option>
                </select>

                <div className="date-filters">
                    <label>From: <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
                    <label>To: <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
                </div>

                <label className="checkbox-filter">
                    <input
                        type="checkbox"
                        checked={followedClubs}
                        onChange={(e) => setFollowedClubs(e.target.checked)}
                    />
                    Followed Clubs Only
                </label>
            </div>

            {loading ? <p>Loading events...</p> : (
                <div className="events-grid">
                    {events.length > 0 ? (
                        events.map(event => (
                            <Link to={`/events/${event._id}`} key={event._id} className="event-card-link">
                                <div className="event-card">
                                    <h3>{event.name}</h3>
                                    <p className="event-organizer">by {event.Club_id?.organizer_name || 'Unknown'}</p>
                                    <p className="event-type">{event.Event_type === 'merchandise' ? '🛍️ Merchandise' : '📅 Event'}</p>
                                    <p className="event-date">
                                        {event.Event_type === 'normal'
                                            ? new Date(event.Event_start).toLocaleDateString()
                                            : `Deadline: ${new Date(event.Registration_deadline).toLocaleDateString()}`
                                        }
                                    </p>
                                    <div className="tags">
                                        {event.Event_tags && event.Event_tags.map(tag => (
                                            <span key={tag} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p>No events found.</p>
                    )}
                </div>
            )}
        </div>
    );
}
