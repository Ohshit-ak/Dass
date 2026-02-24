const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const nodemailer = require('nodemailer');

// =====================
// JWT MIDDLEWARE
// =====================
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { _id, role }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional auth – extracts user from token if present, but does NOT reject anonymous requests
function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return next();
  try {
    req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
  } catch (_) { /* ignore invalid token */ }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

// =====================
// HELPERS
// =====================
const createToken = (_id, role) => {
  return jwt.sign({ _id, role }, process.env.JWT_SECRET, { expiresIn: '3d' });
};

// In-memory OTP store
const otps = new Map();

// Email transporter (cached)
let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    // Verify connection works, fallback to Ethereal if not
    try {
      await _transporter.verify();
      console.log('SMTP connected to', process.env.SMTP_HOST);
    } catch (err) {
      console.error('SMTP verify failed, falling back to Ethereal:', err.message);
      _transporter = null;
      // Fall through to Ethereal below
    }
  }

  if (!_transporter) {
    console.log('Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    console.log('Ethereal account:', testAccount.user);
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
  }

  return _transporter;
}

async function sendMail({ to, subject, text }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'kandagatla.akshith@research.iiit.ac.in',
      to, subject, text
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('Email preview URL:', preview);
    return info;
  } catch (err) {
    console.error('sendMail error:', err.message);
  }
}

// Send login notification to sysadmin
async function sendLoginNotification(role, email) {
  const sysadminEmail = process.env.SYSADMIN_EMAIL;
  if (!sysadminEmail) return;
  const now = new Date().toLocaleString();
  await sendMail({
    to: sysadminEmail,
    subject: '[Felicity] Login Detected - ' + role.toUpperCase(),
    text: 'Login detected:\n\nRole: ' + role + '\nEmail: ' + email + '\nTime: ' + now
  });
}

// =====================
// OTP ENDPOINTS
// =====================
const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email || !validator.isEmail(email)) return res.status(400).json({ error: 'Valid email required' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  if (otps.has(email)) clearTimeout(otps.get(email).timeoutId);
  const timeoutId = setTimeout(() => otps.delete(email), 5 * 60 * 1000);
  otps.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000, timeoutId });

  await sendMail({ to: email, subject: 'Felicity OTP', text: 'Your OTP is ' + code + '. It expires in 5 minutes.' });
  res.status(200).json({ message: 'OTP sent' });
};

const verifyOtp = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const entry = otps.get(email);
  if (!entry) return res.status(400).json({ error: 'No OTP found or expired' });
  if (Date.now() > entry.expiresAt) { otps.delete(email); return res.status(400).json({ error: 'OTP expired' }); }
  if (entry.code !== code) return res.status(400).json({ error: 'Incorrect OTP' });

  // Don't delete OTP here — signup will consume it
  // Just mark it as verified
  entry.verified = true;
  res.status(200).json({ message: 'OTP verified' });
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  createToken,
  bcrypt,
  otps,
  sendMail,
  sendLoginNotification,
  sendOtp,
  verifyOtp
};