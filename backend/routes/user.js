const express = require('express');
const {
  loginUSer, signupUSer, loginclub, loginsys,
  createClub, deleteClub, listClubs,
  updateStudent, updateClub, getProfile,
  toggleFollowClub, getFollowedClubs,
  changePassword,
  disableClub, enableClub,
  requestPasswordReset, listPasswordResetRequests,
  approvePasswordReset, rejectPasswordReset,
  autoCreateClub
} = require('../controllers/usercontroller.js');
const { requireAuth, requireRole, sendOtp, verifyOtp } = require('../middleware/auth.js');

const router = express.Router();

// Student routes
router.post('/login', loginUSer);
router.post('/signup', signupUSer);

// OTP for signup
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// public clubs list
router.get('/clubs', listClubs);

// Profile routes (protected)
router.get('/profile/:id', requireAuth, getProfile);
router.patch('/profile/student/:id', requireAuth, updateStudent);
router.patch('/profile/club/:id', requireAuth, updateClub);

// Follow/Unfollow
router.post('/follow', requireAuth, toggleFollowClub);
router.get('/following', requireAuth, getFollowedClubs);

// Change password (students & clubs)
router.patch('/change-password', requireAuth, changePassword);

// Club routes
router.post('/club/login', loginclub);
router.post('/club/request-password-reset', requireAuth, requireRole('club'), requestPasswordReset);

// Sysadmin routes
router.post('/sysadmin/login', loginsys);
router.post('/sysadmin/createclub', requireAuth, requireRole('sysadmin'), createClub);
router.post('/sysadmin/autocreateclub', requireAuth, requireRole('sysadmin'), autoCreateClub);
router.delete('/sysadmin/deleteclub/:id', requireAuth, requireRole('sysadmin'), deleteClub);
router.patch('/sysadmin/disableclub/:id', requireAuth, requireRole('sysadmin'), disableClub);
router.patch('/sysadmin/enableclub/:id', requireAuth, requireRole('sysadmin'), enableClub);

// Sysadmin password reset management
router.get('/sysadmin/password-resets', requireAuth, requireRole('sysadmin'), listPasswordResetRequests);
router.patch('/sysadmin/password-resets/:id/approve', requireAuth, requireRole('sysadmin'), approvePasswordReset);
router.patch('/sysadmin/password-resets/:id/reject', requireAuth, requireRole('sysadmin'), rejectPasswordReset);

module.exports = router;




