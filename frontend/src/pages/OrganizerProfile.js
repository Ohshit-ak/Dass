import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchClubs, getOrganizerEvents } from '../services/api';
import './OrganizerProfile.css';

export default function OrganizerProfile() {
    const { organizerId } = useParams();
    const [organizer, setOrganizer] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizerId]);

    const loadData = async () => {
        try {
            const clubsData = await fetchClubs();
            const org = (clubsData.clubs || []).find(c => c._id === organizerId);
            setOrganizer(org || null);

            const eventsData = await getOrganizerEvents(organizerId);
            setEvents(Array.isArray(eventsData) ? eventsData : []);
        } catch (error) {
            console.error('Error loading organizer profile', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!organizer) return <div>Organizer not found</div>;

    const now = new Date();
    const upcoming = events.filter(e => new Date(e.Event_start) > now);
    const past = events.filter(e => new Date(e.Event_start) <= now);

    return (
        <div className="org-profile-container">
            <div className="org-header">
                <h1>{organizer.organizer_name}</h1>
                <span className="category-badge">{organizer.category}</span>
                <p className="description">{organizer.description}</p>
                <p className="contact">📧 {organizer.contact_email}</p>
            </div>

            <div className="org-events-section">
                <h2>Upcoming Events</h2>
                <div className="events-grid">
                    {upcoming.length > 0 ? upcoming.map(event => (
                        <Link to={`/events/${event._id}`} key={event._id} className="event-card-link">
                            <div className="event-card">
                                <h3>{event.name}</h3>
                                <p className="date">{new Date(event.Event_start).toLocaleDateString()}</p>
                            </div>
                        </Link>
                    )) : <p>No upcoming events.</p>}
                </div>

                <h2>Past Events</h2>
                <div className="events-grid">
                    {past.length > 0 ? past.map(event => (
                        <Link to={`/events/${event._id}`} key={event._id} className="event-card-link">
                            <div className="event-card past">
                                <h3>{event.name}</h3>
                                <p className="date">{new Date(event.Event_start).toLocaleDateString()}</p>
                            </div>
                        </Link>
                    )) : <p>No past events.</p>}
                </div>
            </div>
        </div>
    );
}
