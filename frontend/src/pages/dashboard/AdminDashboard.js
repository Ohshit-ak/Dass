import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import {
  fetchClubs, autoCreateClub, deleteClubApi,
  disableClub, enableClub
} from '../../services/api';
import './Dashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Credentials modal
  const [credentials, setCredentials] = useState(null); // { email, password, name }

  // Create club form
  const [form, setForm] = useState({
    email: '',
    organizer_name: '',
    category: 'technical',
    description: '',
    contact_email: '',
  });

  const loadClubs = () => {
    fetchClubs()
      .then((d) => setClubs(d.clubs || []))
      .catch((err) => setError(err.message));
  };

  useEffect(() => { loadClubs(); }, []);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* ---- Create club (auto-generated credentials) ---- */
  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const data = await autoCreateClub(form, user.token);
      setCredentials({ email: data.email, password: data.password, name: form.organizer_name });
      setForm({ email: '', organizer_name: '', category: 'technical', description: '', contact_email: '' });
      loadClubs();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  /* ---- Delete ---- */
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently remove club "${name}"? This cannot be undone.`)) return;
    setError(''); setSuccess('');
    try {
      await deleteClubApi(id, user.token);
      setSuccess(`Club "${name}" permanently removed.`);
      loadClubs();
    } catch (err) { setError(err.message); }
  };

  /* ---- Disable / Enable toggle ---- */
  const handleToggleDisable = async (club) => {
    setError(''); setSuccess('');
    try {
      if (club.disabled) {
        await enableClub(club._id, user.token);
        setSuccess(`Club "${club.organizer_name}" enabled.`);
      } else {
        await disableClub(club._id, user.token);
        setSuccess(`Club "${club.organizer_name}" disabled.`);
      }
      loadClubs();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="dashboard-page">
      <h1>Admin Dashboard</h1>
      <p className="dashboard-subtitle">Logged in as {user?.email}</p>

      {/* ===== Credentials Modal ===== */}
      {credentials && (
        <div className="modal-overlay" onClick={() => setCredentials(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✅ Club Created Successfully</h3>
            <p><strong>Club:</strong> {credentials.name}</p>
            <div className="credentials-box">
              <p><strong>Email:</strong> <code>{credentials.email}</code></p>
              <p><strong>Password:</strong> <code>{credentials.password}</code></p>
            </div>
            <p className="credentials-warning">⚠️ Save these credentials now — the password cannot be recovered later.</p>
            <button className="btn-primary" onClick={() => {
              navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
              setSuccess('Credentials copied to clipboard!');
              setCredentials(null);
            }}>📋 Copy & Close</button>
            <button className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => setCredentials(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* ===== Create Club Card ===== */}
        <div className="dash-card wide">
          <h3>➕ Add New Club / Organizer</h3>
          <p className="auto-hint">Password will be auto-generated. Credentials will be shown after creation.</p>

          <form onSubmit={handleCreate} className="admin-form">
            <label>Login Email
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="club-login@iiit.ac.in" />
            </label>
            <div className="form-row">
              <label>Organizer Name
                <input name="organizer_name" value={form.organizer_name} onChange={handleChange} required placeholder="e.g. Robotics Club" />
              </label>
            </div>
            <label>Category
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="technical">Technical</option>
                <option value="cultural">Cultural</option>
                <option value="sports">Sports</option>
              </select>
            </label>
            <label>Description
              <textarea name="description" rows={3} value={form.description} onChange={handleChange} required placeholder="Brief description of the club..." />
            </label>
            <label>Contact Email
              <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange} required placeholder="club-contact@example.com" />
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Club'}</button>
          </form>
        </div>

        {/* ===== Clubs List ===== */}
        <div className="dash-card wide">
          <h3>📋 Existing Clubs ({clubs.length})</h3>
          {clubs.length === 0 ? (
            <p className="placeholder">No clubs yet.</p>
          ) : (
            <table className="clubs-table">
              <thead>
                <tr><th>Name</th><th>Category</th><th>Email</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {clubs.map((c) => (
                  <tr key={c._id} className={c.disabled ? 'row-disabled' : ''}>
                    <td>{c.organizer_name}</td>
                    <td>{c.category}</td>
                    <td>{c.email}</td>
                    <td>
                      <span className={`status-pill ${c.disabled ? 'status-cancelled' : 'status-active'}`}>
                        {c.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="action-btns">
                      <button
                        className={c.disabled ? 'btn-success' : 'btn-warning'}
                        onClick={() => handleToggleDisable(c)}
                      >{c.disabled ? 'Enable' : 'Disable'}</button>
                      <button className="btn-danger" onClick={() => handleDelete(c._id, c.organizer_name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}
      {success && <p className="profile-success" style={{ marginTop: 16 }}>{success}</p>}
    </div>
  );
}
