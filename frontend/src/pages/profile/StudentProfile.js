import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { getProfile, updateStudentProfile, changePassword } from '../../services/api';
import './Profile.css';

const INTEREST_OPTIONS = ['technical', 'cultural', 'sports', 'theoretical', 'other'];

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

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
          last_name: d.user.last_name || '',
          contact_number: d.user.contact_number || '',
          college_name: d.user.college_name || '',
          interests: d.user.interests || [],
          clubs_interests: d.user.clubs_interests || [],
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleArr = (key, val) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(val)
        ? prev[key].filter((x) => x !== val)
        : [...prev[key], val],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await updateStudentProfile(user._id || user.id, form, user.token);
      setSuccess('Profile updated!');
      updateUser(form);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="profile-page"><p>Loading…</p></div>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>Student Profile</h2>

        {/* Non-editable fields */}
        <div className="field-readonly">
          <span className="field-label">Email</span>
          <span>{profile?.email}</span>
        </div>
        <div className="field-readonly">
          <span className="field-label">Participant Type</span>
          <span>{profile?.st}</span>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          <div className="form-row">
            <label>First Name
              <input name="first_name" value={form.first_name} onChange={handleChange} required />
            </label>
            <label>Last Name
              <input name="last_name" value={form.last_name} onChange={handleChange} required />
            </label>
          </div>

          <label>Contact Number
            <input name="contact_number" value={form.contact_number} onChange={handleChange} />
          </label>

          <label>College / Organization
            <input name="college_name" value={form.college_name} onChange={handleChange} />
          </label>

          <fieldset className="checkbox-group">
            <legend>Areas of Interest</legend>
            {INTEREST_OPTIONS.map((opt) => (
              <label key={opt} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.interests?.includes(opt)}
                  onChange={() => toggleArr('interests', opt)}
                />
                {opt}
              </label>
            ))}
          </fieldset>

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
      </div>
    </div>
  );
}
