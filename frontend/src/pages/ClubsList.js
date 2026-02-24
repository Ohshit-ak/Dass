import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { fetchClubs as fetchClubsApi, toggleFollow, getFollowing } from '../services/api';
import './ClubsList.css';

export default function ClubsList() {
    const { user } = useAuth();
    const [clubs, setClubs] = useState([]);
    const [following, setFollowing] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadClubs();
        loadFollowing();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadClubs = async () => {
        try {
            const data = await fetchClubsApi();
            setClubs(data.clubs || []);
        } catch (error) {
            console.error('Error fetching clubs', error);
        }
    };

    const loadFollowing = async () => {
        if (!user || user.role !== 'student') { setLoading(false); return; }
        try {
            const data = await getFollowing(user.token);
            setFollowing((data.following || []).map(c => typeof c === 'string' ? c : c._id));
        } catch (error) {
            console.error('Error fetching followed clubs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (clubId) => {
        try {
            const data = await toggleFollow(clubId, user.token);
            setFollowing(data.following || []);
        } catch (error) {
            console.error('Error toggling follow', error);
        }
    };

    return (
        <div className="clubs-list-container">
            <h1>Clubs & Organizers</h1>
            {loading ? <p>Loading...</p> : (
                <div className="clubs-grid">
                    {clubs.map(club => (
                        <div key={club._id} className="club-card">
                            <Link to={`/organizer/${club._id}`} className="club-card-link">
                                <h2>{club.organizer_name || club.first_name}</h2>
                            </Link>
                            <p className="category">{club.category}</p>
                            <p className="description">{club.description}</p>
                            <p className="contact-email">📧 {club.contact_email}</p>

                            {user?.role === 'student' && (
                                <button
                                    className={`follow-btn ${following.includes(club._id) ? 'following' : ''}`}
                                    onClick={() => handleFollow(club._id)}
                                >
                                    {following.includes(club._id) ? 'Unfollow' : 'Follow'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
