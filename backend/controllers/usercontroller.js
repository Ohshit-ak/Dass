const User = require('../models/usermodel.js');
const validator = require('validator');
const { createToken, bcrypt, otps, sendMail, sendLoginNotification, sendOtp, verifyOtp } = require('../middleware/auth.js');
// =====================
// LIST CLUBS (public)
// =====================
const listClubs = async (req, res) => {
  try {
    const clubs = await User.find({ role: 'club' }).select('first_name organizer_name category description contact_email email disabled');
    res.status(200).json({ clubs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// SYSADMIN LOGIN (fixed credentials from .env)
// =====================
const loginsys = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  if (email !== process.env.SYSADMIN_EMAIL || password !== process.env.SYSADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid sysadmin credentials' });
  }

  const token = createToken('sysadmin', 'sysadmin');
  await sendLoginNotification('sysadmin', email);
  res.status(200).json({ email, role: 'sysadmin', token });
};

// =====================
// SYSADMIN CREATES A CLUB
// =====================
const createClub = async (req, res) => {
  const { email, password, first_name, organizer_name, category, description, contact_email } = req.body;

  if (!email || !password || !first_name || !organizer_name || !category || !description || !contact_email) {
    return res.status(400).json({ error: 'All club fields are required' });
  }
  if (!validator.isEmail(email)) return res.status(400).json({ error: 'Invalid email' });
  if (!validator.isEmail(contact_email)) return res.status(400).json({ error: 'Invalid contact email' });

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const club = await User.create({
      email, password: hash, first_name, role: 'club',
      organizer_name, category, description, contact_email
    });

    await sendMail({ to: process.env.SYSADMIN_EMAIL, subject: '[Felicity] Club Created', text: 'Club "' + organizer_name + '" (' + email + ') created.' });
    await sendMail({ to: contact_email, subject: '[Felicity] Your Club Account', text: 'Your club "' + organizer_name + '" has been created.\nLogin email: ' + email });

    res.status(201).json({ email: club.email, role: 'club', message: 'Club created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// =====================
// SYSADMIN DELETES A CLUB
// =====================
const deleteClub = async (req, res) => {
  const { id } = req.params;
  try {
    const club = await User.findOneAndDelete({ _id: id, role: 'club' });
    if (!club) return res.status(404).json({ error: 'Club not found' });

    await sendMail({ to: process.env.SYSADMIN_EMAIL, subject: '[Felicity] Club Deleted', text: 'Club "' + club.organizer_name + '" (' + club.email + ') deleted.' });
    if (club.contact_email) {
      await sendMail({ to: club.contact_email, subject: '[Felicity] Club Removed', text: 'Your club "' + club.organizer_name + '" has been removed.' });
    }

    res.status(200).json({ message: 'Club deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// CLUB LOGIN
// =====================
const loginclub = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const club = await User.findOne({ email, role: 'club' });
    if (!club) return res.status(401).json({ error: 'Club not found. Clubs must be created by sysadmin.' });
    if (club.disabled) return res.status(403).json({ error: 'This account has been disabled by the admin.' });

    const match = await bcrypt.compare(password, club.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    const token = createToken(club._id, 'club');
    await sendLoginNotification('club', email);
    res.status(200).json({ _id: club._id, email: club.email, role: 'club', token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// STUDENT SIGNUP (with OTP)
// =====================
const signupUSer = async (req, res) => {
  const { email, password, first_name, last_name, contact_number, college_name, st, code, interests, clubs_interests } = req.body;

  if (!email || !password || !first_name || !last_name || !contact_number || !college_name || !st) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!validator.isEmail(email)) return res.status(400).json({ error: 'Invalid email' });
  if (!validator.isStrongPassword(password)) {
    return res.status(400).json({ error: 'Password not strong enough (min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol)' });
  }
  if (!validator.isMobilePhone(contact_number)) return res.status(400).json({ error: 'Invalid contact number' });
  if (!['IIIT', 'NON_IIIT'].includes(st)) return res.status(400).json({ error: 'Student type must be IIIT or NON_IIIT' });

  // verify OTP
  if (!code) return res.status(400).json({ error: 'OTP code is required' });
  const entry = otps.get(email);
  if (!entry) return res.status(400).json({ error: 'No OTP found. Request a new one.' });
  if (Date.now() > entry.expiresAt) { otps.delete(email); return res.status(400).json({ error: 'OTP expired' }); }
  if (entry.code !== code) return res.status(400).json({ error: 'Incorrect OTP' });
  clearTimeout(entry.timeoutId);
  otps.delete(email);

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email, password: hash, first_name, last_name,
      contact_number, college_name, role: 'student', st,
      interests: interests || [], clubs_interests: clubs_interests || []
    });

    const token = createToken(user._id, 'student');
    res.status(201).json({ _id: user._id, email: user.email, role: 'student', token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// =====================
// STUDENT LOGIN
// =====================
const loginUSer = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await User.findOne({ email, role: 'student' });
    if (!user) return res.status(401).json({ error: 'Student not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    const token = createToken(user._id, 'student');
    await sendLoginNotification('student', email);
    res.status(200).json({ _id: user._id, email: user.email, role: 'student', token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//====================
// STUDENT UPDATE
//=====================

const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, contact_number, college_name, st, interests, clubs_interests } = req.body;

  try {
    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (first_name) student.first_name = first_name;
    if (last_name) student.last_name = last_name;
    if (contact_number) {
      if (!validator.isMobilePhone(contact_number, 'any')) return res.status(400).json({ error: 'Invalid contact number' });
      student.contact_number = contact_number;
    }
    if (college_name) student.college_name = college_name;
    if (st) {
      if (!['IIIT', 'NON_IIIT'].includes(st)) return res.status(400).json({ error: 'Student type must be IIIT or NON_IIIT' });
      student.st = st;
    }
    if (interests) student.interests = interests;
    if (clubs_interests) student.clubs_interests = clubs_interests;

    await student.save();
    res.status(200).json({ message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateClub = async (req, res) => {
  const { id } = req.params;
  const { first_name, organizer_name, category, description, contact_email } = req.body;

  try {
    const club = await User.findOne({ _id: id, role: 'club' });
    if (!club) return res.status(404).json({ error: 'Club not found' });

    if (first_name) club.first_name = first_name;
    if (organizer_name) club.organizer_name = organizer_name;
    if (category) club.category = category;
    if (description) club.description = description;
    if (contact_email) {
      if (!validator.isEmail(contact_email)) return res.status(400).json({ error: 'Invalid contact email' });
      club.contact_email = contact_email;
    }

    await club.save();
    res.status(200).json({ message: 'Club updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// GET PROFILE (by id)
// =====================
const getProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// CHANGE PASSWORD (students & clubs – authenticated)
// =====================
const changePassword = async (req, res) => {
  const userId = req.user && req.user._id;
  const { currentPassword, newPassword } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current password and new password are required' });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    if (!validator.isStrongPassword(newPassword)) {
      return res.status(400).json({ error: 'New password not strong enough (min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol)' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    user.password = hash;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// FOLLOW / UNFOLLOW CLUB (toggle)
// =====================
const toggleFollowClub = async (req, res) => {
  const userId = req.user && req.user._id;
  const { clubId } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!clubId) return res.status(400).json({ error: 'clubId is required' });

  try {
    const club = await User.findOne({ _id: clubId, role: 'club' });
    if (!club) return res.status(404).json({ error: 'Club not found' });

    const student = await User.findById(userId);
    if (!student) return res.status(404).json({ error: 'User not found' });

    const idx = student.following.findIndex(f => f.toString() === clubId.toString());
    let action;
    if (idx === -1) {
      student.following.push(club._id);
      action = 'followed';
    } else {
      student.following.splice(idx, 1);
      action = 'unfollowed';
    }

    await student.save();
    res.status(200).json({ message: 'Successfully ' + action + ' club', following: student.following });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// GET FOLLOWED CLUBS
// =====================
const getFollowedClubs = async (req, res) => {
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await User.findById(userId)
      .populate({ path: 'following', select: 'first_name organizer_name category description contact_email email' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ following: user.following });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// DISABLE / ENABLE CLUB (sysadmin)
// =====================
const disableClub = async (req, res) => {
  const { id } = req.params;
  try {
    const club = await User.findOne({ _id: id, role: 'club' });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    club.disabled = true;
    await club.save();
    await sendMail({
      to: club.contact_email || club.email,
      subject: '[Felicity] Account Disabled',
      text: 'Your club account "' + club.organizer_name + '" has been disabled by the administrator. Please contact admin for details.'
    });
    res.status(200).json({ message: 'Club "' + club.organizer_name + '" disabled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const enableClub = async (req, res) => {
  const { id } = req.params;
  try {
    const club = await User.findOne({ _id: id, role: 'club' });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    club.disabled = false;
    await club.save();
    await sendMail({
      to: club.contact_email || club.email,
      subject: '[Felicity] Account Re-enabled',
      text: 'Your club account "' + club.organizer_name + '" has been re-enabled by the administrator.'
    });
    res.status(200).json({ message: 'Club "' + club.organizer_name + '" enabled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// PASSWORD RESET WORKFLOW
// =====================

// Club requests a password reset (called by club user)
const requestPasswordReset = async (req, res) => {
  const userId = req.user && req.user._id;
  const { reason } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const club = await User.findOne({ _id: userId, role: 'club' });
    if (!club) return res.status(404).json({ error: 'Club not found' });

    club.passwordResetRequest = {
      requested: true,
      reason: reason || 'No reason given',
      status: 'pending',
      adminComment: '',
      requestedAt: new Date(),
      resolvedAt: null
    };
    await club.save();

    // Notify admin
    await sendMail({
      to: process.env.SYSADMIN_EMAIL,
      subject: '[Felicity] Password Reset Request - ' + club.organizer_name,
      text: 'Club "' + club.organizer_name + '" (' + club.email + ') has requested a password reset.\nReason: ' + (reason || 'Not specified')
    });

    res.status(200).json({ message: 'Password reset request submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin lists all pending password reset requests
const listPasswordResetRequests = async (req, res) => {
  try {
    const clubs = await User.find({
      role: 'club',
      'passwordResetRequest.requested': true
    }).select('email organizer_name category passwordResetRequest disabled');
    res.status(200).json({ requests: clubs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin approves a password reset (auto-generates new password)
const approvePasswordReset = async (req, res) => {
  const { id } = req.params;
  const { adminComment } = req.body;
  try {
    const club = await User.findOne({ _id: id, role: 'club' });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    if (!club.passwordResetRequest || club.passwordResetRequest.status !== 'pending') {
      return res.status(400).json({ error: 'No pending password reset request' });
    }

    // Auto-generate a strong password (guaranteed to have upper, lower, digit, symbol)
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$&';
    const all = upper + lower + digits + symbols;
    const pick = (s) => s[Math.floor(Math.random() * s.length)];
    let newPassword = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    for (let i = 4; i < 14; i++) newPassword.push(pick(all));
    for (let i = newPassword.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPassword[i], newPassword[j]] = [newPassword[j], newPassword[i]];
    }
    newPassword = newPassword.join('');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    club.password = hash;

    club.passwordResetRequest.status = 'approved';
    club.passwordResetRequest.adminComment = adminComment || '';
    club.passwordResetRequest.resolvedAt = new Date();
    await club.save();

    // Email the new password to admin (admin shares it manually with the club)
    await sendMail({
      to: process.env.SYSADMIN_EMAIL,
      subject: '[Felicity] Password Reset Approved - ' + club.organizer_name,
      text: 'Password for club "' + club.organizer_name + '" (' + club.email + ') has been reset.\n\nNew Password: ' + newPassword + '\n\nPlease share this with the organizer securely.'
    });

    res.status(200).json({
      message: 'Password reset approved',
      newPassword: newPassword,
      clubEmail: club.email,
      organizerName: club.organizer_name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin rejects a password reset
const rejectPasswordReset = async (req, res) => {
  const { id } = req.params;
  const { adminComment } = req.body;
  try {
    const club = await User.findOne({ _id: id, role: 'club' });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    if (!club.passwordResetRequest || club.passwordResetRequest.status !== 'pending') {
      return res.status(400).json({ error: 'No pending password reset request' });
    }

    club.passwordResetRequest.status = 'rejected';
    club.passwordResetRequest.adminComment = adminComment || '';
    club.passwordResetRequest.resolvedAt = new Date();
    await club.save();

    // Notify club
    await sendMail({
      to: club.contact_email || club.email,
      subject: '[Felicity] Password Reset Rejected',
      text: 'Your password reset request has been rejected by the administrator.\nComment: ' + (adminComment || 'No comment')
    });

    res.status(200).json({ message: 'Password reset request rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// =====================
// AUTO-GENERATE CLUB CREDENTIALS (sysadmin)
// =====================
const autoCreateClub = async (req, res) => {
  const { email, organizer_name, category, description, contact_email } = req.body;

  if (!email || !organizer_name || !category || !description || !contact_email) {
    return res.status(400).json({ error: 'email, organizer_name, category, description, contact_email are required' });
  }
  if (!validator.isEmail(email)) return res.status(400).json({ error: 'Invalid login email' });
  if (!validator.isEmail(contact_email)) return res.status(400).json({ error: 'Invalid contact email' });

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use' });

    // Auto-generate a strong password (guaranteed to have upper, lower, digit, symbol)
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$&';
    const all = upper + lower + digits + symbols;
    const pick = (s) => s[Math.floor(Math.random() * s.length)];
    let generatedPassword = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    for (let i = 4; i < 14; i++) generatedPassword.push(pick(all));
    // Shuffle
    for (let i = generatedPassword.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [generatedPassword[i], generatedPassword[j]] = [generatedPassword[j], generatedPassword[i]];
    }
    generatedPassword = generatedPassword.join('');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(generatedPassword, salt);

    const club = await User.create({
      email,
      password: hash,
      first_name: organizer_name,
      role: 'club',
      organizer_name,
      category,
      description,
      contact_email
    });

    // Send credentials to admin
    await sendMail({
      to: process.env.SYSADMIN_EMAIL,
      subject: '[Felicity] New Club Created - ' + organizer_name,
      text: 'Club "' + organizer_name + '" has been created.\n\nLogin Email: ' + email + '\nPassword: ' + generatedPassword + '\n\nShare these credentials with the organizer.'
    });

    // Notify the club contact
    await sendMail({
      to: contact_email,
      subject: '[Felicity] Your Club Account',
      text: 'Your club "' + organizer_name + '" account has been created.\nLogin at the platform with the credentials your admin will share with you.'
    });

    res.status(201).json({
      email,
      password: generatedPassword,
      organizer_name: club.organizer_name,
      role: 'club',
      message: 'Club created with auto-generated password'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  loginUSer, signupUSer, loginclub, loginsys,
  createClub, deleteClub, listClubs,
  updateStudent, updateClub, getProfile,
  toggleFollowClub, getFollowedClubs,
  changePassword,
  disableClub, enableClub,
  requestPasswordReset, listPasswordResetRequests,
  approvePasswordReset, rejectPasswordReset,
  autoCreateClub
};