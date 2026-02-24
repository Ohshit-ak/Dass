import { useState, useEffect, useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import { listPasswordResets, approvePasswordReset, rejectPasswordReset } from '../../services/api';
import './Dashboard.css';

export default function PasswordResets() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('pending'); // 'pending' | 'all'
  const [comments, setComments] = useState({}); // { [id]: string }
  const [newPassword, setNewPassword] = useState(null); // { clubName, password }

  const load = useCallback(() => {
    listPasswordResets(user.token)
      .then((d) => setRequests(d.requests || []))
      .catch((err) => setError(err.message));
  }, [user.token]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id, clubName) => {
    setError(''); setSuccess('');
    try {
      const data = await approvePasswordReset(id, comments[id] || '', user.token);
      setNewPassword({ clubName, password: data.newPassword });
      setSuccess(`Password reset approved for "${clubName}".`);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleReject = async (id, clubName) => {
    setError(''); setSuccess('');
    try {
      await rejectPasswordReset(id, comments[id] || '', user.token);
      setSuccess(`Password reset rejected for "${clubName}".`);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCommentChange = (id, value) => {
    setComments((prev) => ({ ...prev, [id]: value }));
  };

  const filtered = filter === 'pending'
    ? requests.filter((r) => r.passwordResetRequest?.status === 'pending')
    : requests;

  const statusColor = (status) => {
    switch (status) {
      case 'pending': return 'status-upcoming';
      case 'approved': return 'status-active';
      case 'rejected': return 'status-cancelled';
      default: return '';
    }
  };

  return (
    <div className="dashboard-page">
      <h1>🔑 Password Reset Requests</h1>
      <p className="dashboard-subtitle">Manage organizer/club password reset requests</p>

      {/* New password modal */}
      {newPassword && (
        <div className="modal-overlay" onClick={() => setNewPassword(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✅ Password Reset Approved</h3>
            <p><strong>Club:</strong> {newPassword.clubName}</p>
            <div className="credentials-box">
              <p><strong>New Password:</strong> <code>{newPassword.password}</code></p>
            </div>
            <p className="credentials-warning">⚠️ Share this password securely with the club. It cannot be recovered later.</p>
            <button className="btn-primary" onClick={() => {
              navigator.clipboard.writeText(newPassword.password);
              setNewPassword(null);
            }}>📋 Copy & Close</button>
            <button className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => setNewPassword(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="creation-tabs" style={{ marginBottom: 20 }}>
        <button className={`tab-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
          Pending ({requests.filter(r => r.passwordResetRequest?.status === 'pending').length})
        </button>
        <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({requests.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="dash-card wide">
          <p className="placeholder">
            {filter === 'pending' ? 'No pending password reset requests.' : 'No password reset requests found.'}
          </p>
        </div>
      ) : (
        <div className="reset-list">
          {filtered.map((r) => {
            const pr = r.passwordResetRequest || {};
            const isPending = pr.status === 'pending';
            return (
              <div key={r._id} className="dash-card wide reset-card">
                <div className="reset-header">
                  <div>
                    <h3>{r.organizer_name || r.first_name}</h3>
                    <p className="reset-email">{r.email}</p>
                  </div>
                  <span className={`status-pill ${statusColor(pr.status)}`}>
                    {pr.status?.toUpperCase()}
                  </span>
                </div>

                <div className="reset-body">
                  <p><strong>Reason:</strong> {pr.reason || '—'}</p>
                  <p><strong>Requested:</strong> {pr.requestedAt ? new Date(pr.requestedAt).toLocaleString() : '—'}</p>
                  {pr.resolvedAt && <p><strong>Resolved:</strong> {new Date(pr.resolvedAt).toLocaleString()}</p>}
                  {pr.adminComment && <p><strong>Admin Comment:</strong> {pr.adminComment}</p>}
                </div>

                {isPending && (
                  <div className="reset-actions">
                    <input
                      type="text"
                      placeholder="Admin comment (optional)"
                      value={comments[r._id] || ''}
                      onChange={(e) => handleCommentChange(r._id, e.target.value)}
                      className="reset-comment-input"
                    />
                    <div className="action-btns">
                      <button className="btn-success" onClick={() => handleApprove(r._id, r.organizer_name || r.first_name)}>
                        ✅ Approve & Reset
                      </button>
                      <button className="btn-danger" onClick={() => handleReject(r._id, r.organizer_name || r.first_name)}>
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
      {success && <p className="profile-success" style={{ marginTop: 16 }}>{success}</p>}
    </div>
  );
}
