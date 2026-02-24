import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { getProfile, updateClubProfile, requestPasswordReset, changePassword } from '../../services/api';
import './Profile.css';

export default function ClubProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Password reset request
  const [resetReason, setResetReason] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfile(user._id || user.id, user.token)
      .then((d) => {
        setProfile(d.user);
        setForm({
          first_name: d.user.first_name || '',
          organizer_name: d.user.organizer_name || '',
          category: d.user.category || '',
          description: d.user.description || '',
          contact_email: d.user.contact_email || '',
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await updateClubProfile(user._id || user.id, form, user.token);
      setSuccess('Profile updated!');
      updateUser(form);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResetRequest = async () => {
    if (!resetReason.trim()) { setResetMsg('Please provide a reason.'); return; }
    setResetLoading(true);
    setResetMsg('');
    try {
      await requestPasswordReset(resetReason.trim(), user.token);
      setResetMsg('Password reset request submitted! The admin will review it.');
      setResetReason('');
      // Reload profile to get updated status
      const d = await getProfile(user._id || user.id, user.token);
      setProfile(d.user);
    } catch (err) { setResetMsg(err.message); }
    finally { setResetLoading(false); }
  };

  if (loading) return <div className="profile-page"><p>Loading…</p></div>;

  const prStatus = profile?.passwordResetRequest?.status;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>Club / Organizer Profile</h2>

        <div className="field-readonly">
          <span className="field-label">Login Email</span>
          <span>{profile?.email}</span>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          <label>Display Name
            <input name="first_name" value={form.first_name} onChange={handleChange} required />
          </label>

          <label>Organizer Name
            <input name="organizer_name" value={form.organizer_name} onChange={handleChange} required />
          </label>

          <label>Category
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="technical">Technical</option>
              <option value="cultural">Cultural</option>
              <option value="sports">Sports</option>
            </select>
          </label>

          <label>Description
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
            />
          </label>

          <label>Contact Email
            <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange} />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="profile-success">{success}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        {/* Password Change Section */}
        <div className="pw-reset-section">
          <h3>🔒 Change Password</h3>
          <div className="profile-form">
            <label>Current Password
              <input
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
              />
            </label>
            <label>New Password
              <input
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
              />
            </label>
            <label>Confirm New Password
              <input
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
              />
            </label>
            {pwError && <p className="auth-error">{pwError}</p>}
            {pwSuccess && <p className="profile-success">{pwSuccess}</p>}
            <button
              className="btn-primary"
              disabled={pwLoading}
              onClick={async () => {
                setPwError(''); setPwSuccess('');
                if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
                  setPwError('All password fields are required'); return;
                }
                if (pwForm.newPassword !== pwForm.confirmPassword) {
                  setPwError('New passwords do not match'); return;
                }
                if (pwForm.newPassword.length < 8) {
                  setPwError('Password must be at least 8 characters'); return;
                }
                setPwLoading(true);
                try {
                  await changePassword(pwForm.currentPassword, pwForm.newPassword, user.token);
                  setPwSuccess('Password changed successfully!');
                  setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                } catch (err) { setPwError(err.message); }
                finally { setPwLoading(false); }
              }}
            >
              {pwLoading ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </div>

        {/* Password Reset Request Section */}
        <div className="pw-reset-section">
          <h3>🔑 Request Password Reset</h3>
          {prStatus === 'pending' ? (
            <p className="pw-reset-status">⏳ Your password reset request is pending admin review.</p>
          ) : (
            <>
              {prStatus === 'approved' && (
                <p className="pw-reset-status" style={{ color: '#51cf66' }}>
                  ✅ Your last request was approved. Check with admin for the new password.
                </p>
              )}
              {prStatus === 'rejected' && (
                <p className="pw-reset-status" style={{ color: '#ff6b6b' }}>
                  ❌ Your last request was rejected.
                  {profile?.passwordResetRequest?.adminComment &&
                    ` Reason: ${profile.passwordResetRequest.adminComment}`}
                </p>
              )}
              <textarea
                rows={3}
                placeholder="Why do you need a password reset?"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
              />
              <button
                className="btn-primary"
                style={{ marginTop: 10 }}
                onClick={handleResetRequest}
                disabled={resetLoading}
              >
                {resetLoading ? 'Submitting…' : 'Submit Reset Request'}
              </button>
            </>
          )}
          {resetMsg && <p className="pw-reset-status" style={{ marginTop: 8 }}>{resetMsg}</p>}
        </div>
      </div>
    </div>
  );
}
