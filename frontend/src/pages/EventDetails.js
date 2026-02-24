import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as d3 from 'd3';
import useAuth from '../hooks/useAuth';
import {
    getEventById as fetchEvent, registerForEvent, uploadPaymentProof,
    getEventFeedback, getMyFeedback, submitFeedback,
    getForumMessages,
    markAttendance as apiMarkAttendance, manualAttendance as apiManualAttendance,
    getAttendanceDashboard, exportAttendanceCSV,
    getMerchOrders, approvePaymentOrder, rejectPaymentOrder,
    getEventRegistrations, getEventAnalytics,
    getMyEventRegistration, cancelRegistration
} from '../services/api';
import './EventDetails.css';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function EventDetails() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');

    // Registration
    const [selectedItems, setSelectedItems] = useState([]);
    const [formResponses, setFormResponses] = useState([]);
    const [myRegistration, setMyRegistration] = useState(null);

    // Payment proof
    const [paymentFile, setPaymentFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Forum
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Feedback
    const [feedbackData, setFeedbackData] = useState({ feedbacks: [], stats: {} });
    const [myFeedback, setMyFeedback] = useState(null);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackFilter, setFeedbackFilter] = useState(0);

    // Organizer: Attendance
    const [attendanceDash, setAttendanceDash] = useState(null);
    const [scanResult, setScanResult] = useState(null);
    const [manualUserId, setManualUserId] = useState('');
    const [manualReason, setManualReason] = useState('');
    const [scanTicketId, setScanTicketId] = useState('');

    // Organizer: Merch Orders
    const [merchOrders, setMerchOrders] = useState([]);
    const [orderFilter, setOrderFilter] = useState('all');
    const [rejectComment, setRejectComment] = useState('');

    // Organizer: Registrations list
    const [registrations, setRegistrations] = useState([]);
    const [regSearch, setRegSearch] = useState('');

    // Analytics
    const [analytics, setAnalytics] = useState(null);

    const isOrganizer = user && event && (event.Club_id?._id === user._id || event.Club_id === user._id);
    const isMerch = event?.Event_type === 'merchandise';
    const isDeadlinePassed = event ? new Date() > new Date(event.Registration_deadline) : false;
    const isCompleted = event ? new Date(event.Event_end) < new Date() : false;

    const loadEvent = useCallback(async () => {
        try {
            const data = await fetchEvent(id, user?.token);
            setEvent(data);
            if (data.Event_type === 'normal' && data.customForm?.fields) {
                setFormResponses(data.customForm.fields.map(f => ({
                    fieldId: f._id, label: f.label, value: ''
                })));
            }
            // Load user's existing registration for this event
            if (user?.token) {
                try {
                    const regData = await getMyEventRegistration(id, user.token);
                    if (regData.registration) {
                        setMyRegistration(regData.registration);
                    }
                } catch (e) { /* no registration found — that's fine */ }
            }
        } catch (err) {
            setError(err.message || 'Failed to load event');
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => { loadEvent(); }, [loadEvent]);

    // Load feedback
    useEffect(() => {
        if (!id) return;
        getEventFeedback(id).then(setFeedbackData).catch(console.error);
        if (user?.token) {
            getMyFeedback(id, user.token).then(d => { if (d.feedback) { setMyFeedback(d.feedback); setFeedbackRating(d.feedback.rating); setFeedbackComment(d.feedback.comment); }}).catch(console.error);
        }
    }, [id, user]);

    // Socket.io for forum
    useEffect(() => {
        if (!id || !user?.token) return;
        const socket = io(BASE_URL, { auth: { token: user.token } });
        socketRef.current = socket;
        socket.on('connect', () => { socket.emit('joinForum', id); });
        socket.on('newMessage', (msg) => { setMessages(prev => [...prev, msg]); });
        socket.on('messageDeleted', ({ messageId }) => {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        });
        socket.on('messagePinned', ({ messageId, pinned }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, pinned } : m));
        });
        socket.on('messageReacted', ({ messageId, reactions }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
        });

        // Load existing messages
        getForumMessages(id).then(data => setMessages(Array.isArray(data) ? data : [])).catch(console.error);

        return () => { socket.emit('leaveForum', id); socket.disconnect(); };
    }, [id, user]);

    // Auto-scroll forum
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Organizer tabs data
    useEffect(() => {
        if (!isOrganizer || !user?.token || !id) return;
        if (activeTab === 'attendance') {
            getAttendanceDashboard(id, user.token).then(setAttendanceDash).catch(console.error);
        }
        if (activeTab === 'orders') {
            getMerchOrders({ eventId: id, status: orderFilter }, user.token).then(setMerchOrders).catch(console.error);
        }
        if (activeTab === 'participants') {
            getEventRegistrations(id, { search: regSearch }, user.token).then(setRegistrations).catch(console.error);
        }
        if (activeTab === 'analytics') {
            getEventAnalytics(id, user.token).then(setAnalytics).catch(console.error);
        }
    }, [isOrganizer, activeTab, id, user, orderFilter, regSearch]);

    const handleRegister = async () => {
        if (!window.confirm('Confirm registration?')) return;
        setRegistering(true); setError('');
        try {
            const body = {
                eventId: event._id,
                formResponses,
                merchandiseSelection: isMerch && selectedItems.length > 0 ? selectedItems[0] : undefined
            };
            const data = await registerForEvent(body, user.token);
            setSuccess(isMerch ? 'Order placed! Upload payment proof below.' : `Registration Successful! Ticket ID: ${data.ticketId}`);
            setMyRegistration(data.registration);
            loadEvent();
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally { setRegistering(false); }
    };

    const handleCancelRegistration = async () => {
        if (!myRegistration || !window.confirm('Are you sure you want to cancel your registration?')) return;
        try {
            await cancelRegistration(myRegistration._id, user.token);
            setSuccess('Registration cancelled.');
            setMyRegistration(null);
            loadEvent();
        } catch (err) { setError(err.message); }
    };

    const handleUploadProof = async () => {
        if (!paymentFile || !myRegistration) return;
        setUploading(true); setError('');
        try {
            await uploadPaymentProof(myRegistration._id, paymentFile, user.token);
            setSuccess('Payment proof uploaded! Waiting for organizer approval.');
            setPaymentFile(null);
        } catch (err) { setError(err.message); }
        finally { setUploading(false); }
    };

    const handleMerchSelect = (variant) => {
        setSelectedItems([{ size: variant.size, color: variant.color }]);
    };

    // Forum
    const handleSendMessage = () => {
        if (!newMessage.trim() || !socketRef.current) return;
        socketRef.current.emit('sendMessage', {
            eventId: id, content: newMessage, parentId: replyTo, isAnnouncement
        });
        setNewMessage(''); setReplyTo(null); setIsAnnouncement(false);
    };

    const handleDeleteMessage = (messageId) => {
        socketRef.current?.emit('deleteMessage', { messageId, eventId: id });
    };

    const handlePinMessage = (messageId) => {
        socketRef.current?.emit('togglePin', { messageId, eventId: id });
    };

    const handleReact = (messageId, emoji) => {
        socketRef.current?.emit('reactMessage', { messageId, eventId: id, emoji });
    };

    // Feedback
    const handleSubmitFeedback = async () => {
        if (!feedbackRating) return;
        try {
            await submitFeedback(id, feedbackRating, feedbackComment, user.token);
            setSuccess('Feedback submitted!');
            setMyFeedback({ rating: feedbackRating, comment: feedbackComment });
            getEventFeedback(id).then(setFeedbackData).catch(console.error);
        } catch (err) { setError(err.message); }
    };

    // Attendance scan
    const handleScanTicket = async () => {
        if (!scanTicketId.trim()) return;
        setScanResult(null);
        try {
            const data = await apiMarkAttendance(scanTicketId.trim(), id, user.token);
            setScanResult({ type: 'success', message: `✅ ${data.participant?.name || 'Participant'} — Attendance marked` });
            setScanTicketId('');
            getAttendanceDashboard(id, user.token).then(setAttendanceDash).catch(console.error);
        } catch (err) {
            setScanResult({ type: 'error', message: err.message });
        }
    };

    const handleManualAttendance = async () => {
        if (!manualUserId || !manualReason) return;
        try {
            await apiManualAttendance(manualUserId, id, manualReason, user.token);
            setScanResult({ type: 'success', message: '✅ Manual attendance recorded' });
            setManualUserId(''); setManualReason('');
            getAttendanceDashboard(id, user.token).then(setAttendanceDash).catch(console.error);
        } catch (err) { setScanResult({ type: 'error', message: err.message }); }
    };

    const handleExportCSV = async () => {
        try {
            const blob = await exportAttendanceCSV(id, user.token);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `attendance_${id}.csv`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch (err) { setError(err.message); }
    };

    // Merch order actions
    const handleApproveOrder = async (regId) => {
        try {
            await approvePaymentOrder(regId, '', user.token);
            setSuccess('Payment approved!');
            getMerchOrders({ eventId: id, status: orderFilter }, user.token).then(setMerchOrders).catch(console.error);
        } catch (err) { setError(err.message); }
    };

    const handleRejectOrder = async (regId) => {
        try {
            await rejectPaymentOrder(regId, rejectComment, user.token);
            setSuccess('Payment rejected');
            setRejectComment('');
            getMerchOrders({ eventId: id, status: orderFilter }, user.token).then(setMerchOrders).catch(console.error);
        } catch (err) { setError(err.message); }
    };

    // QR file upload parsing
    const handleQRFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const html5QrCode = new Html5Qrcode("qr-reader-hidden");
            const result = await html5QrCode.scanFile(file, true);
            const parsed = JSON.parse(result);
            if (parsed.ticketId) {
                setScanTicketId(parsed.ticketId);
                handleScanWithTicket(parsed.ticketId);
            }
        } catch (err) {
            setScanResult({ type: 'error', message: 'Could not read QR code from image' });
        }
    };

    const handleScanWithTicket = async (ticketId) => {
        setScanResult(null);
        try {
            const data = await apiMarkAttendance(ticketId, id, user.token);
            setScanResult({ type: 'success', message: `✅ ${data.participant?.name || 'Participant'} — Attendance marked` });
            setScanTicketId('');
            getAttendanceDashboard(id, user.token).then(setAttendanceDash).catch(console.error);
        } catch (err) {
            setScanResult({ type: 'error', message: err.message });
        }
    };

    if (loading) return <div className="event-details-container"><p>Loading...</p></div>;
    if (!event) return <div className="event-details-container"><p>Event not found</p></div>;

    // Filtered feedbacks
    const filteredFeedbacks = feedbackFilter > 0
        ? feedbackData.feedbacks.filter(f => f.rating === feedbackFilter)
        : feedbackData.feedbacks;

    // Group forum messages for threading
    const topLevelMessages = messages.filter(m => !m.parentId);
    const replies = messages.filter(m => m.parentId);
    const getReplies = (parentId) => replies.filter(r => r.parentId === parentId);

    return (
        <div className="event-details-container">
            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}

            <div className="event-header">
                <h1>{event.name}</h1>
                <span className="badge">{isMerch ? 'Merchandise' : 'Event'}</span>
            </div>

            {/* Tab Navigation */}
            <div className="ed-tabs">
                <button className={activeTab === 'details' ? 'active' : ''} onClick={() => setActiveTab('details')}>📋 Details</button>
                <button className={activeTab === 'forum' ? 'active' : ''} onClick={() => setActiveTab('forum')}>💬 Forum</button>
                <button className={activeTab === 'feedback' ? 'active' : ''} onClick={() => setActiveTab('feedback')}>⭐ Feedback</button>
                {isOrganizer && <button className={activeTab === 'participants' ? 'active' : ''} onClick={() => setActiveTab('participants')}>👥 Participants</button>}
                {isOrganizer && <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>📷 Attendance</button>}
                {isOrganizer && isMerch && <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>💳 Orders</button>}
                {isOrganizer && <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>📊 Analytics</button>}
            </div>

            {/* ====== DETAILS TAB ====== */}
            {activeTab === 'details' && (
                <div className="event-content">
                    <div className="main-info">
                        <p className="description">{event.Description}</p>
                        <div className="meta-info">
                            <p><strong>Organizer:</strong> {event.Club_id?.organizer_name}</p>
                            <p><strong>Deadline:</strong> {new Date(event.Registration_deadline).toLocaleString()}</p>
                            <p><strong>Fee:</strong> ₹{event.Registration_fee}</p>
                            <p><strong>Eligibility:</strong> {event.Eligibility_criteria}</p>
                            {!isMerch && <p><strong>Schedule:</strong> {new Date(event.Event_start).toLocaleString()} - {new Date(event.Event_end).toLocaleString()}</p>}
                        </div>
                    </div>
                    <div className="action-section">
                        {!isMerch && event.customForm?.fields?.length > 0 && (
                            <div className="custom-form">
                                <h3>Registration Form</h3>
                                {event.customForm.fields.sort((a, b) => a.order - b.order).map((field, idx) => (
                                    <label key={idx} className="form-field">
                                        {field.label} {field.required && <span style={{color:'#e94560'}}>*</span>}
                                        {field.fieldType === 'text' && <input type="text" required={field.required} value={formResponses[idx]?.value || ''} onChange={e => { const next = [...formResponses]; next[idx] = { ...next[idx], value: e.target.value }; setFormResponses(next); }} />}
                                        {field.fieldType === 'textarea' && <textarea required={field.required} rows={3} value={formResponses[idx]?.value || ''} onChange={e => { const next = [...formResponses]; next[idx] = { ...next[idx], value: e.target.value }; setFormResponses(next); }} />}
                                        {field.fieldType === 'number' && <input type="number" required={field.required} value={formResponses[idx]?.value || ''} onChange={e => { const next = [...formResponses]; next[idx] = { ...next[idx], value: e.target.value }; setFormResponses(next); }} />}
                                        {field.fieldType === 'dropdown' && <select required={field.required} value={formResponses[idx]?.value || ''} onChange={e => { const next = [...formResponses]; next[idx] = { ...next[idx], value: e.target.value }; setFormResponses(next); }}><option value="">Select...</option>{(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>}
                                        {field.fieldType === 'checkbox' && <input type="checkbox" checked={formResponses[idx]?.value === true} onChange={e => { const next = [...formResponses]; next[idx] = { ...next[idx], value: e.target.checked }; setFormResponses(next); }} />}
                                    </label>
                                ))}
                            </div>
                        )}
                        {isMerch && (
                            <div className="merch-selection">
                                <h3>Select Variant</h3>
                                <div className="variants-grid">
                                    {event.merchandiseDetails?.variants?.map((v, idx) => (
                                        <button key={idx} className={`variant-btn ${selectedItems.some(i => i.size === v.size && i.color === v.color) ? 'selected' : ''}`} disabled={v.stock <= 0} onClick={() => handleMerchSelect(v)}>
                                            {v.size} - {v.color} ({v.stock} left)
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {user?.role === 'student' && !myRegistration && (
                            <>
                                <button className="register-btn" onClick={handleRegister} disabled={isDeadlinePassed || registering || (isMerch && selectedItems.length === 0)}>
                                    {registering ? 'Processing...' : (isMerch ? '🛒 Place Order' : '✅ Register')}
                                </button>
                                {isDeadlinePassed && <p className="warning">Deadline Passed</p>}
                            </>
                        )}

                        {/* Already registered — show status */}
                        {user?.role === 'student' && myRegistration && myRegistration.status !== 'cancelled' && (
                            <div className="registered-status">
                                <p style={{ color: '#51cf66', fontWeight: 600 }}>✅ You are registered!</p>
                                <p>Status: <span className={`status-pill ${myRegistration.status}`}>{myRegistration.status}</span></p>
                                {isMerch && <p>Payment: <span className={`status-pill ${myRegistration.paymentStatus}`}>{myRegistration.paymentStatus}</span></p>}
                                {myRegistration.status !== 'cancelled' && (
                                    <button className="btn-danger" onClick={handleCancelRegistration} style={{ marginTop: 8 }}>❌ Cancel Registration</button>
                                )}
                            </div>
                        )}

                        {/* Payment proof upload for merchandise */}
                        {isMerch && myRegistration && myRegistration.paymentStatus === 'pending' && (
                            <div className="payment-proof-section">
                                <h3>📤 Upload Payment Proof</h3>
                                <input type="file" accept="image/*" onChange={e => setPaymentFile(e.target.files[0])} />
                                <button className="register-btn" onClick={handleUploadProof} disabled={!paymentFile || uploading}>
                                    {uploading ? 'Uploading...' : '📤 Upload Proof'}
                                </button>
                            </div>
                        )}

                        {/* Show QR code if confirmed */}
                        {myRegistration?.qrCode && (
                            <div className="ticket-qr">
                                <h3>🎫 Your Ticket</h3>
                                <p>Ticket ID: <code>{myRegistration.ticketId}</code></p>
                                <img src={myRegistration.qrCode} alt="QR Code" style={{ maxWidth: 200, borderRadius: 8 }} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ====== FORUM TAB ====== */}
            {activeTab === 'forum' && (
                <div className="forum-section">
                    <h2>💬 Discussion Forum</h2>
                    <div className="forum-messages">
                        {topLevelMessages.length === 0 && <p className="placeholder">No messages yet. Be the first to post!</p>}
                        {topLevelMessages.map(msg => (
                            <div key={msg._id} className={`forum-msg ${msg.pinned ? 'pinned' : ''} ${msg.isAnnouncement ? 'announcement' : ''}`}>
                                <div className="msg-header">
                                    <strong className={`msg-author ${msg.userRole}`}>{msg.userName}</strong>
                                    <span className="msg-role-badge">{msg.userRole === 'club' ? '🏢 Organizer' : '🎓'}</span>
                                    {msg.pinned && <span className="pin-badge">📌 Pinned</span>}
                                    {msg.isAnnouncement && <span className="announcement-badge">📢 Announcement</span>}
                                    <span className="msg-time">{new Date(msg.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="msg-content">{msg.content}</p>
                                <div className="msg-actions">
                                    <button onClick={() => setReplyTo(msg._id)} className="msg-action-btn">↩️ Reply</button>
                                    {['👍', '❤️', '😂', '🎉'].map(emoji => {
                                        const reactors = msg.reactions?.[emoji] || [];
                                        return (
                                            <button key={emoji} onClick={() => handleReact(msg._id, emoji)} className={`msg-action-btn reaction-btn ${reactors.includes(user?._id) ? 'reacted' : ''}`}>
                                                {emoji} {reactors.length > 0 && <span>{reactors.length}</span>}
                                            </button>
                                        );
                                    })}
                                    {isOrganizer && <button onClick={() => handlePinMessage(msg._id)} className="msg-action-btn">📌</button>}
                                    {(isOrganizer || msg.User_id === user?._id) && <button onClick={() => handleDeleteMessage(msg._id)} className="msg-action-btn delete-btn">🗑️</button>}
                                </div>
                                {/* Replies */}
                                {getReplies(msg._id).map(reply => (
                                    <div key={reply._id} className="forum-msg reply">
                                        <div className="msg-header">
                                            <strong className={`msg-author ${reply.userRole}`}>{reply.userName}</strong>
                                            <span className="msg-role-badge">{reply.userRole === 'club' ? '🏢' : '🎓'}</span>
                                            <span className="msg-time">{new Date(reply.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p className="msg-content">{reply.content}</p>
                                        <div className="msg-actions">
                                            {['👍', '❤️'].map(emoji => {
                                                const reactors = reply.reactions?.[emoji] || [];
                                                return <button key={emoji} onClick={() => handleReact(reply._id, emoji)} className="msg-action-btn reaction-btn">{emoji} {reactors.length > 0 && reactors.length}</button>;
                                            })}
                                            {(isOrganizer || reply.User_id === user?._id) && <button onClick={() => handleDeleteMessage(reply._id)} className="msg-action-btn delete-btn">🗑️</button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    {replyTo && <p className="reply-indicator">Replying to message... <button onClick={() => setReplyTo(null)}>✕ Cancel</button></p>}
                    <div className="forum-input">
                        <input type="text" placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
                        {isOrganizer && (
                            <label className="announcement-toggle">
                                <input type="checkbox" checked={isAnnouncement} onChange={e => setIsAnnouncement(e.target.checked)} /> 📢
                            </label>
                        )}
                        <button onClick={handleSendMessage} className="send-btn">Send</button>
                    </div>
                </div>
            )}

            {/* ====== FEEDBACK TAB ====== */}
            {activeTab === 'feedback' && (
                <div className="feedback-section">
                    <h2>⭐ Event Feedback</h2>
                    {/* Stats */}
                    <div className="feedback-stats">
                        <div className="avg-rating">
                            <span className="big-rating">{(feedbackData.stats?.avgRating || 0).toFixed(1)}</span>
                            <span className="star-display">{'★'.repeat(Math.round(feedbackData.stats?.avgRating || 0))}{'☆'.repeat(5 - Math.round(feedbackData.stats?.avgRating || 0))}</span>
                            <span className="total-reviews">{feedbackData.stats?.totalReviews || 0} reviews</span>
                        </div>
                        <div className="rating-bars">
                            {[5, 4, 3, 2, 1].map(star => {
                                const count = feedbackData.stats?.[`rating${star}`] || 0;
                                const pct = feedbackData.stats?.totalReviews ? (count / feedbackData.stats.totalReviews * 100) : 0;
                                return (
                                    <div key={star} className="rating-bar-row" onClick={() => setFeedbackFilter(feedbackFilter === star ? 0 : star)}>
                                        <span>{star}★</span>
                                        <div className="rating-bar"><div className="rating-bar-fill" style={{ width: `${pct}%` }}></div></div>
                                        <span>{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Submit feedback */}
                    {user?.role === 'student' && isCompleted && (
                        <div className="submit-feedback">
                            <h3>{myFeedback ? 'Update Your Feedback' : 'Leave Feedback'}</h3>
                            <div className="star-picker">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <span key={s} onClick={() => setFeedbackRating(s)} className={`star ${feedbackRating >= s ? 'active' : ''}`}>★</span>
                                ))}
                            </div>
                            <textarea placeholder="Share your experience (anonymous)..." value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} rows={3} />
                            <button onClick={handleSubmitFeedback} className="register-btn" disabled={!feedbackRating}>
                                {myFeedback ? 'Update Feedback' : 'Submit Feedback'}
                            </button>
                        </div>
                    )}

                    {/* Feedback list */}
                    <div className="feedback-list">
                        {feedbackFilter > 0 && <p className="filter-note">Showing {feedbackFilter}★ reviews <button onClick={() => setFeedbackFilter(0)}>Show all</button></p>}
                        {filteredFeedbacks.length === 0 ? <p className="placeholder">No feedback yet.</p> : filteredFeedbacks.map((f, idx) => (
                            <div key={idx} className="feedback-card">
                                <div className="feedback-rating">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</div>
                                {f.comment && <p>{f.comment}</p>}
                                <span className="feedback-time">{new Date(f.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ====== PARTICIPANTS TAB (Organizer) ====== */}
            {activeTab === 'participants' && isOrganizer && (
                <div className="participants-section">
                    <h2>👥 Registered Participants</h2>
                    <input type="text" placeholder="Search by name, email, ticket..." value={regSearch} onChange={e => setRegSearch(e.target.value)} className="search-bar" style={{ marginBottom: 16 }} />
                    <table className="clubs-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Ticket ID</th><th>Date</th><th>Status</th>{isMerch && <th>Payment</th>}</tr></thead>
                        <tbody>
                            {registrations.map(r => (
                                <tr key={r._id}>
                                    <td>{r.User_id?.first_name} {r.User_id?.last_name || ''}</td>
                                    <td>{r.User_id?.email}</td>
                                    <td><code>{r.ticketId?.slice(0, 8)}...</code></td>
                                    <td>{new Date(r.Registration_date).toLocaleDateString()}</td>
                                    <td><span className={`status-pill ${r.status}`}>{r.status}</span></td>
                                    {isMerch && <td><span className={`status-pill ${r.paymentStatus}`}>{r.paymentStatus}</span></td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {registrations.length === 0 && <p className="placeholder">No registrations yet.</p>}
                </div>
            )}

            {/* ====== ATTENDANCE TAB (Organizer) ====== */}
            {activeTab === 'attendance' && isOrganizer && (
                <div className="attendance-section">
                    <h2>📷 QR Scanner & Attendance</h2>

                    {/* Scanner */}
                    <div className="scanner-box">
                        <h3>Scan Ticket</h3>
                        <div className="scan-input-row">
                            <input type="text" placeholder="Enter or scan Ticket ID..." value={scanTicketId} onChange={e => setScanTicketId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScanTicket()} />
                            <button onClick={handleScanTicket} className="btn-primary">✅ Mark</button>
                        </div>
                        <div className="scan-file-upload">
                            <label>Or upload QR image: <input type="file" accept="image/*" onChange={handleQRFileUpload} /></label>
                        </div>
                        <div id="qr-reader-hidden" style={{ display: 'none' }}></div>
                        {scanResult && <div className={`scan-result ${scanResult.type}`}>{scanResult.message}</div>}
                    </div>

                    {/* Manual Override */}
                    <div className="scanner-box" style={{ marginTop: 16 }}>
                        <h3>🔧 Manual Override</h3>
                        <input type="text" placeholder="User ID" value={manualUserId} onChange={e => setManualUserId(e.target.value)} style={{ marginBottom: 8 }} />
                        <input type="text" placeholder="Reason (required for audit)" value={manualReason} onChange={e => setManualReason(e.target.value)} style={{ marginBottom: 8 }} />
                        <button onClick={handleManualAttendance} className="btn-primary" disabled={!manualUserId || !manualReason}>Mark Manually</button>
                    </div>

                    {/* Live Dashboard */}
                    {attendanceDash && (
                        <div className="attendance-dashboard">
                            <div className="att-stats">
                                <div className="att-stat"><span className="big-num">{attendanceDash.totalScanned}</span><span>Scanned</span></div>
                                <div className="att-stat"><span className="big-num">{attendanceDash.totalNotScanned}</span><span>Not Scanned</span></div>
                                <div className="att-stat"><span className="big-num">{attendanceDash.totalRegistered}</span><span>Total</span></div>
                                <div className="att-stat">
                                    <span className="big-num">{attendanceDash.totalRegistered > 0 ? Math.round(attendanceDash.totalScanned / attendanceDash.totalRegistered * 100) : 0}%</span>
                                    <span>Rate</span>
                                </div>
                            </div>
                            <button onClick={handleExportCSV} className="btn-primary" style={{ marginTop: 12, marginBottom: 16 }}>📥 Export CSV</button>

                            <h3 style={{ color: '#51cf66' }}>✅ Scanned ({attendanceDash.totalScanned})</h3>
                            <div className="att-list">
                                {attendanceDash.scanned.map(a => (
                                    <div key={a._id} className="att-item scanned">
                                        <span>{a.name}</span> <span>{a.email}</span>
                                        <span>{new Date(a.scannedAt).toLocaleTimeString()}</span>
                                        <span className={`method-badge ${a.method}`}>{a.method === 'manual_override' ? '🔧 Manual' : '📷 QR'}</span>
                                        {a.overrideReason && <span className="override-reason">Reason: {a.overrideReason}</span>}
                                    </div>
                                ))}
                            </div>

                            <h3 style={{ color: '#ff6b6b', marginTop: 16 }}>❌ Not Scanned ({attendanceDash.totalNotScanned})</h3>
                            <div className="att-list">
                                {attendanceDash.notScanned.map(ns => (
                                    <div key={ns.userId} className="att-item not-scanned">
                                        <span>{ns.name}</span> <span>{ns.email}</span>
                                        <button onClick={() => { setManualUserId(ns.userId); setActiveTab('attendance'); }} className="msg-action-btn">🔧 Override</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ====== ORDERS TAB (Organizer — Merchandise) ====== */}
            {activeTab === 'orders' && isOrganizer && isMerch && (
                <div className="orders-section">
                    <h2>💳 Merchandise Orders</h2>
                    <div className="tabs">
                        {['all', 'pending', 'approved', 'rejected'].map(f => (
                            <button key={f} className={orderFilter === f ? 'active' : ''} onClick={() => setOrderFilter(f)}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    {merchOrders.length === 0 ? <p className="placeholder">No orders found.</p> : (
                        <div className="orders-list">
                            {merchOrders.map(order => (
                                <div key={order._id} className={`order-card ${order.paymentStatus}`}>
                                    <div className="order-header">
                                        <strong>{order.User_id?.first_name} {order.User_id?.last_name || ''}</strong>
                                        <span className={`status-pill ${order.paymentStatus}`}>{order.paymentStatus}</span>
                                    </div>
                                    <p>Email: {order.User_id?.email}</p>
                                    <p>Variant: {order.merchandiseSelection?.size} / {order.merchandiseSelection?.color}</p>
                                    <p>Ordered: {new Date(order.createdAt).toLocaleString()}</p>
                                    {order.paymentProof && (
                                        <div className="proof-preview">
                                            <p><strong>Payment Proof:</strong></p>
                                            <img src={`${BASE_URL}${order.paymentProof}`} alt="Payment proof" style={{ maxWidth: 300, borderRadius: 8 }} />
                                        </div>
                                    )}
                                    {order.paymentStatus === 'pending' && (
                                        <div className="order-actions">
                                            <button onClick={() => handleApproveOrder(order._id)} className="btn-success">✅ Approve</button>
                                            <input placeholder="Rejection reason..." value={rejectComment} onChange={e => setRejectComment(e.target.value)} style={{ flex: 1 }} />
                                            <button onClick={() => handleRejectOrder(order._id)} className="btn-danger">❌ Reject</button>
                                        </div>
                                    )}
                                    {order.paymentComment && <p className="order-comment">Comment: {order.paymentComment}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ====== ANALYTICS TAB (Organizer) ====== */}
            {activeTab === 'analytics' && isOrganizer && analytics && (
                <div className="analytics-section">
                    <h2>📊 Event Analytics</h2>
                    <div className="analytics-row">
                        <div className="analytics-card"><h4>Total Registrations</h4><div className="big-num">{analytics.totalRegistrations}</div></div>
                        <div className="analytics-card"><h4>Confirmed</h4><div className="big-num" style={{ color: '#51cf66' }}>{analytics.confirmedRegistrations}</div></div>
                        <div className="analytics-card"><h4>Attendance</h4><div className="big-num" style={{ color: '#4dabf7' }}>{analytics.totalAttendance}</div></div>
                        <div className="analytics-card"><h4>Attendance Rate</h4><div className="big-num">{analytics.attendanceRate}%</div></div>
                        <div className="analytics-card"><h4>Revenue</h4><div className="big-num" style={{ color: '#ffd43b' }}>₹{analytics.revenue}</div></div>
                    </div>
                    {isMerch && (
                        <div className="analytics-row">
                            <div className="analytics-card"><h4>Pending Payments</h4><div className="big-num" style={{ color: '#ffc107' }}>{analytics.pendingPayments}</div></div>
                            <div className="analytics-card"><h4>Approved</h4><div className="big-num" style={{ color: '#51cf66' }}>{analytics.approvedPayments}</div></div>
                            <div className="analytics-card"><h4>Rejected</h4><div className="big-num" style={{ color: '#ff6b6b' }}>{analytics.rejectedPayments}</div></div>
                        </div>
                    )}
                    {/* D3 charts are rendered below */}
                    <div className="d3-charts">
                        <RegistrationTimelineChart data={analytics.regTimeline} />
                        {analytics.feedbackStats?.totalReviews > 0 && <FeedbackDistChart stats={analytics.feedbackStats} />}
                        {analytics.attendanceByMethod?.length > 0 && <AttendanceMethodChart data={analytics.attendanceByMethod} />}
                        {analytics.merchBreakdown?.length > 0 && <MerchBreakdownChart data={analytics.merchBreakdown} />}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============== D3 CHART COMPONENTS ==============
function RegistrationTimelineChart({ data }) {
    const ref = useRef();
    useEffect(() => {
        if (!data || data.length === 0 || !ref.current) return;
        const svg = d3.select(ref.current);
        svg.selectAll('*').remove();

        const width = 500, height = 250, margin = { top: 20, right: 20, bottom: 40, left: 50 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const g = svg.attr('width', width).attr('height', height).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const parseDate = d3.timeParse('%Y-%m-%d');
        const chartData = data.map(d => ({ date: parseDate(d._id), count: d.count }));

        const x = d3.scaleTime().domain(d3.extent(chartData, d => d.date)).range([0, w]);
        const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count)]).nice().range([h, 0]);

        g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(5)).selectAll('text').style('fill', '#999');
        g.append('g').call(d3.axisLeft(y).ticks(5)).selectAll('text').style('fill', '#999');
        g.selectAll('.domain, .tick line').style('stroke', '#444');

        const line = d3.line().x(d => x(d.date)).y(d => y(d.count)).curve(d3.curveMonotoneX);
        g.append('path').datum(chartData).attr('fill', 'none').attr('stroke', '#e94560').attr('stroke-width', 2).attr('d', line);

        const area = d3.area().x(d => x(d.date)).y0(h).y1(d => y(d.count)).curve(d3.curveMonotoneX);
        g.append('path').datum(chartData).attr('fill', 'rgba(233,69,96,0.15)').attr('d', area);

        g.selectAll('circle').data(chartData).join('circle').attr('cx', d => x(d.date)).attr('cy', d => y(d.count)).attr('r', 4).attr('fill', '#e94560');
    }, [data]);

    if (!data || data.length === 0) return null;
    return (
        <div className="d3-chart-box">
            <h3>📈 Registration Timeline</h3>
            <svg ref={ref}></svg>
        </div>
    );
}

function FeedbackDistChart({ stats }) {
    const ref = useRef();
    useEffect(() => {
        if (!stats || !ref.current) return;
        const svg = d3.select(ref.current);
        svg.selectAll('*').remove();

        const width = 300, height = 250, margin = { top: 20, right: 20, bottom: 40, left: 40 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const g = svg.attr('width', width).attr('height', height).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const data = [1, 2, 3, 4, 5].map(s => ({ star: s, count: stats[`rating${s}`] || 0 }));
        const x = d3.scaleBand().domain(data.map(d => d.star)).range([0, w]).padding(0.3);
        const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([h, 0]);

        g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickFormat(d => d + '★')).selectAll('text').style('fill', '#999');
        g.append('g').call(d3.axisLeft(y).ticks(5)).selectAll('text').style('fill', '#999');
        g.selectAll('.domain, .tick line').style('stroke', '#444');

        const colors = ['#ff6b6b', '#ffa06b', '#ffd43b', '#a9e34b', '#51cf66'];
        g.selectAll('rect').data(data).join('rect').attr('x', d => x(d.star)).attr('y', d => y(d.count)).attr('width', x.bandwidth()).attr('height', d => h - y(d.count)).attr('fill', (d, i) => colors[i]).attr('rx', 4);
    }, [stats]);

    return (
        <div className="d3-chart-box">
            <h3>⭐ Rating Distribution</h3>
            <svg ref={ref}></svg>
        </div>
    );
}

function AttendanceMethodChart({ data }) {
    const ref = useRef();
    useEffect(() => {
        if (!data || data.length === 0 || !ref.current) return;
        const svg = d3.select(ref.current);
        svg.selectAll('*').remove();

        const width = 250, height = 250;
        const radius = Math.min(width, height) / 2 - 20;
        const g = svg.attr('width', width).attr('height', height).append('g').attr('transform', `translate(${width / 2},${height / 2})`);

        const pie = d3.pie().value(d => d.count);
        const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);
        const color = d3.scaleOrdinal(['#4dabf7', '#ffc107']);

        g.selectAll('path').data(pie(data)).join('path').attr('d', arc).attr('fill', (d, i) => color(i)).attr('stroke', '#16213e').attr('stroke-width', 2);

        g.selectAll('text').data(pie(data)).join('text').attr('transform', d => `translate(${arc.centroid(d)})`).attr('text-anchor', 'middle').attr('fill', '#fff').attr('font-size', '11px').text(d => d.data._id === 'qr_scan' ? 'QR' : 'Manual');
    }, [data]);

    return (
        <div className="d3-chart-box">
            <h3>📷 Attendance Method</h3>
            <svg ref={ref}></svg>
        </div>
    );
}

function MerchBreakdownChart({ data }) {
    const ref = useRef();
    useEffect(() => {
        if (!data || data.length === 0 || !ref.current) return;
        const svg = d3.select(ref.current);
        svg.selectAll('*').remove();

        const width = 350, height = 250, margin = { top: 20, right: 20, bottom: 50, left: 40 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;
        const g = svg.attr('width', width).attr('height', height).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const labels = data.map(d => `${d._id.size}/${d._id.color}`);
        const x = d3.scaleBand().domain(labels).range([0, w]).padding(0.3);
        const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([h, 0]);

        g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x)).selectAll('text').style('fill', '#999').attr('transform', 'rotate(-25)').attr('text-anchor', 'end');
        g.append('g').call(d3.axisLeft(y).ticks(5)).selectAll('text').style('fill', '#999');
        g.selectAll('.domain, .tick line').style('stroke', '#444');

        g.selectAll('rect').data(data).join('rect').attr('x', (d, i) => x(labels[i])).attr('y', d => y(d.count)).attr('width', x.bandwidth()).attr('height', d => h - y(d.count)).attr('fill', '#e94560').attr('rx', 4);
    }, [data]);

    return (
        <div className="d3-chart-box">
            <h3>🛍️ Variant Sales</h3>
            <svg ref={ref}></svg>
        </div>
    );
}
