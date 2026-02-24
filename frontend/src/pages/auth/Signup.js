import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { sendOtp, signupStudent, fetchClubs } from '../../services/api';
import './Auth.css';

const INTEREST_OPTIONS = ['technical', 'cultural', 'sports', 'theoretical', 'other'];

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = email+otp, 2 = details
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [st, setSt] = useState('IIIT');
  const [interests, setInterests] = useState([]);
  const [clubsInterests, setClubsInterests] = useState([]);
  const [clubs, setClubs] = useState([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClubs()
      .then((d) => setClubs(d.clubs || []))
      .catch(() => {});
  }, []);

  // ---- OTP flow ----
  const handleSendOtp = async () => {
    setError('');
    if (!email) return setError('Enter your email first');
    setLoading(true);
    try {
      await sendOtp(email);
      setOtpSent(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await import('../../services/api').then(m => m.verifyOtp(email, otpCode));
      setOtpVerified(true);
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ---- Signup ----
  const toggleInterest = (val) => {
    setInterests((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  };

  const toggleClub = (val) => {
    setClubsInterests((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await signupStudent({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        contact_number: contactNumber,
        college_name: collegeName,
        st,
        code: otpCode,
        interests,
        clubs_interests: clubsInterests,
      });
      login({ _id: data._id, email: data.email, role: data.role, token: data.token });
      navigate('/dashboard');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card wide">
        <h1 className="auth-title">Create Account</h1>

        {/* ---- Step 1: Email & OTP ---- */}
        {step === 1 && (
          <>
            <div className="auth-form">
              <label>Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </label>

              {!otpSent ? (
                <button className="btn-primary" onClick={handleSendOtp} disabled={loading}>
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              ) : !otpVerified ? (
                <>
                  <label>OTP Code
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="6-digit code"
                      maxLength={6}
                    />
                  </label>
                  <button className="btn-primary" onClick={handleVerifyOtp} disabled={loading}>
                    {loading ? 'Verifying…' : 'Verify OTP'}
                  </button>
                  <button className="btn-secondary" onClick={handleSendOtp} disabled={loading}>
                    Resend OTP
                  </button>
                </>
              ) : null}

              {error && <p className="auth-error">{error}</p>}
            </div>
          </>
        )}

        {/* ---- Step 2: Details ---- */}
        {step === 2 && (
          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-row">
              <label>First Name
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>
              <label>Last Name
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
            </div>

            <label>Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min 8 chars, upper, lower, number, symbol"
              />
            </label>

            <label>Contact Number
              <input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required />
            </label>

            <label>College / Organization
              <input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} required />
            </label>

            <label>Participant Type
              <select value={st} onChange={(e) => setSt(e.target.value)}>
                <option value="IIIT">IIIT Student</option>
                <option value="NON_IIIT">Non-IIIT Participant</option>
              </select>
            </label>

            <fieldset className="checkbox-group">
              <legend>Areas of Interest (optional)</legend>
              {INTEREST_OPTIONS.map((opt) => (
                <label key={opt} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={interests.includes(opt)}
                    onChange={() => toggleInterest(opt)}
                  />
                  {opt}
                </label>
              ))}
            </fieldset>

            {clubs.length > 0 && (
              <fieldset className="checkbox-group">
                <legend>Clubs to Follow (optional)</legend>
                {clubs.map((c) => (
                  <label key={c._id || c.organizer_name} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={clubsInterests.includes(c.organizer_name)}
                      onChange={() => toggleClub(c.organizer_name)}
                    />
                    {c.organizer_name}
                  </label>
                ))}
              </fieldset>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
