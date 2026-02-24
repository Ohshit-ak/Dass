const mongoose = require('mongoose');
const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  registerForEvent, getUserRegistrations, cancelRegistration,
  uploadPaymentProof, getMerchOrders, approvePayment, rejectPayment,
  markAttendance, manualAttendance, getAttendanceDashboard, exportAttendanceCSV,
  getEventRegistrations, getMyEventRegistration
} = require('../controllers/registrationcontroller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Multer for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// Student routes
router.post('/', requireAuth, registerForEvent);
router.get('/my-registrations', requireAuth, getUserRegistrations);
router.get('/my-event/:eventId', requireAuth, getMyEventRegistration);
router.patch('/cancel/:registrationId', requireAuth, cancelRegistration);
router.post('/payment-proof/:registrationId', requireAuth, upload.single('paymentProof'), uploadPaymentProof);

// Organizer routes
router.get('/event/:eventId', requireAuth, requireRole('club'), getEventRegistrations);
router.get('/merch-orders', requireAuth, requireRole('club'), getMerchOrders);
router.patch('/approve-payment/:registrationId', requireAuth, requireRole('club'), approvePayment);
router.patch('/reject-payment/:registrationId', requireAuth, requireRole('club'), rejectPayment);

// QR / Attendance routes (organizer)
router.post('/mark-attendance', requireAuth, requireRole('club'), markAttendance);
router.post('/manual-attendance', requireAuth, requireRole('club'), manualAttendance);
router.get('/attendance/:eventId', requireAuth, requireRole('club'), getAttendanceDashboard);
router.get('/attendance/:eventId/csv', requireAuth, requireRole('club'), exportAttendanceCSV);

module.exports = router;
