/*
 * test_features.js — Comprehensive API test for all new features
 * Run: node test_features.js (with backend running on port 8000)
 * Uses native fetch (Node 18+)
 */

const BASE_URL = 'http://localhost:8000';

let studentToken = '';
let clubToken = '';
let adminToken = '';
let clubId = '';
let studentId = '';
let eventId = '';
let merchEventId = '';
let registrationId = '';
let merchRegistrationId = '';
let ticketId = '';

const log = (label, data) => {
  console.log(`\n[${label}]`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const fail = (label, err) => {
  console.error(`❌ [${label}] FAILED:`, err.message || err);
};

async function req(path, opts = {}) {
  const { method = 'GET', body, token, rawBody } = opts;
  const headers = {};
  if (!rawBody) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: rawBody ? rawBody : (body ? JSON.stringify(body) : undefined),
  });

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) {
    const text = await res.text();
    return { _csv: text, _status: res.status };
  }

  const data = await res.json().catch(() => ({}));
  data._status = res.status;
  return data;
}

// ===================== AUTH =====================
async function testAuth() {
  console.log('\n========== AUTH ==========');

  // 1. Signup student
  const email = `teststu_${Date.now()}@iiit.ac.in`;
  const d = await req('/user/signup', {
    method: 'POST',
    body: {
      email, password: 'Test1234!',
      first_name: 'TestStu', last_name: 'User',
      role: 'student', st: 'IIIT',
      contact_number: '9876543210',
      college_name: 'IIIT Hyderabad',
      interests: ['technical'], clubs_interests: ['coding']
    }
  });
  if (d._status === 200 || d._status === 201) {
    studentToken = d.token;
    studentId = d._id || d.user?._id;
    log('Student Signup ✅', { email, studentId });
  } else {
    fail('Student Signup', d);
    // try login instead
    const ld = await req('/user/login', { method: 'POST', body: { email, password: 'Test1234!' } });
    if (ld.token) { studentToken = ld.token; studentId = ld._id; log('Student Login ✅', {}); }
    else { fail('Student Login', ld); return; }
  }

  // 2. Login as sysadmin
  const ad = await req('/user/sysadmin/login', {
    method: 'POST',
    body: { email: 'admin@iiit.ac.in', password: 'admin123' }
  });
  if (ad.token) {
    adminToken = ad.token;
    log('Admin Login ✅', {});
  } else {
    log('Admin Login ❌ (will skip admin-dependent tests)', ad);
  }

  // 3. Create or login club
  if (adminToken) {
    const cc = await req('/user/sysadmin/autocreateclub', {
      method: 'POST',
      token: adminToken,
      body: {
        email: `testclub_${Date.now()}@iiit.ac.in`,
        organizer_name: 'TestClub',
        description: 'A test club for feature testing'
      }
    });
    if (cc.club && cc.generatedPassword) {
      clubId = cc.club._id;
      const cl = await req('/user/club/login', {
        method: 'POST',
        body: { email: cc.club.email, password: cc.generatedPassword }
      });
      if (cl.token) {
        clubToken = cl.token;
        log('Club Created & Login ✅', { clubId, email: cc.club.email });
      } else {
        fail('Club Login with generated password', cl);
      }
    } else {
      fail('Auto-create club', cc);
    }
  }

  if (!clubToken) {
    log('⚠️ No club token — trying fallback login');
    const cl = await req('/user/club/login', {
      method: 'POST',
      body: { email: 'club@test.com', password: 'password123' }
    });
    if (cl.token) { clubToken = cl.token; clubId = cl._id; }
  }
}

// ===================== EVENTS =====================
async function testEvents() {
  console.log('\n========== EVENTS ==========');
  if (!clubToken) { log('⚠️ Skipping events — no club token'); return; }

  const now = new Date();
  const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const deadline = new Date(now.getTime() + 1 * 60 * 60 * 1000);

  // Create normal event
  const e = await req('/api/events/create', {
    method: 'POST', token: clubToken,
    body: {
      name: `Test Normal Event ${Date.now()}`,
      Description: 'Normal event for feature testing',
      Event_type: 'normal', Category: 'technical',
      Registration_fee: 0, Registrationlimit: 100,
      Event_start: start.toISOString(), Event_end: end.toISOString(),
      Registration_deadline: deadline.toISOString(),
      Eligibility_criteria: 'All students', Action: 'published'
    }
  });

  if (e.event || e._id) {
    eventId = e.event?._id || e._id;
    log('Normal Event Created ✅', { eventId });
  } else {
    fail('Create Normal Event', e);
  }

  // Create merchandise event
  const me = await req('/api/events/create', {
    method: 'POST', token: clubToken,
    body: {
      name: `Test Merch Event ${Date.now()}`,
      Description: 'Merchandise event for feature testing',
      Event_type: 'merchandise', Category: 'cultural',
      Registration_fee: 500, Registrationlimit: 50,
      Event_start: start.toISOString(), Event_end: end.toISOString(),
      Registration_deadline: deadline.toISOString(),
      Eligibility_criteria: 'All', Action: 'published',
      merchandiseDetails: {
        name: 'Test T-Shirt', description: 'Cool test merch',
        variants: [
          { size: 'M', color: 'Black', stock: 10 },
          { size: 'L', color: 'White', stock: 5 },
          { size: 'S', color: 'Red', stock: 0 }
        ]
      }
    }
  });

  if (me.event || me._id) {
    merchEventId = me.event?._id || me._id;
    log('Merch Event Created ✅', { merchEventId });
  } else {
    fail('Create Merch Event', me);
  }

  // Trending & upcoming
  const tr = await req('/api/events/trending');
  log('Trending Events', { count: Array.isArray(tr) ? tr.length : '?' });

  const up = await req('/api/events/upcoming');
  log('Upcoming Events', { count: Array.isArray(up) ? up.length : '?' });
}

// ===================== REGISTRATION =====================
async function testRegistration() {
  console.log('\n========== REGISTRATION ==========');
  if (!studentToken || !eventId) { log('⚠️ Skipping registration'); return; }

  // Normal event registration
  const r = await req('/api/registrations', {
    method: 'POST', token: studentToken,
    body: { eventId }
  });

  if (r.registration) {
    registrationId = r.registration._id;
    ticketId = r.ticketId || r.registration.ticketId;
    log('Normal Registration ✅', { registrationId, ticketId, hasQR: !!r.qrCode });
  } else {
    fail('Normal Registration', r);
  }

  // Merch event registration
  if (merchEventId) {
    const mr = await req('/api/registrations', {
      method: 'POST', token: studentToken,
      body: { eventId: merchEventId, merchandiseSelection: { size: 'M', color: 'Black' } }
    });

    if (mr.registration) {
      merchRegistrationId = mr.registration._id;
      log('Merch Registration ✅', { merchRegistrationId, paymentStatus: mr.registration.paymentStatus });
    } else {
      fail('Merch Registration', mr);
    }
  }

  // My registrations
  const my = await req('/api/registrations/my-registrations', { token: studentToken });
  log('My Registrations', { count: Array.isArray(my) ? my.length : '?' });
}

// ===================== MERCHANDISE PAYMENT WORKFLOW =====================
async function testMerchPayment() {
  console.log('\n========== MERCHANDISE PAYMENT WORKFLOW ==========');
  if (!clubToken || !merchRegistrationId) { log('⚠️ Skipping merch payment'); return; }

  // Pending orders
  const orders = await req(`/api/registrations/merch-orders?eventId=${merchEventId}&status=pending`, { token: clubToken });
  log('Pending Merch Orders', { count: Array.isArray(orders) ? orders.length : '?' });

  // Approve payment
  const ap = await req(`/api/registrations/approve-payment/${merchRegistrationId}`, {
    method: 'PATCH', token: clubToken,
    body: { comment: 'Approved in test' }
  });
  if (ap._status === 200) {
    log('Approve Payment ✅', { message: ap.message, hasTicketId: !!ap.registration?.ticketId });
  } else {
    fail('Approve Payment', ap);
  }
}

// ===================== QR / ATTENDANCE =====================
async function testAttendance() {
  console.log('\n========== QR SCANNER & ATTENDANCE ==========');
  if (!clubToken || !ticketId || !eventId) { log('⚠️ Skipping attendance'); return; }

  // Mark attendance via ticket ID (QR scan)
  const ma = await req('/api/registrations/mark-attendance', {
    method: 'POST', token: clubToken,
    body: { ticketId, eventId }
  });
  if (ma._status === 200) {
    log('Mark Attendance (QR) ✅', { participant: ma.participant?.name });
  } else {
    fail('Mark Attendance', ma);
  }

  // Duplicate scan — should fail
  const dup = await req('/api/registrations/mark-attendance', {
    method: 'POST', token: clubToken,
    body: { ticketId, eventId }
  });
  log('Duplicate Scan (should fail)', { status: dup._status, error: dup.error });

  // Manual override
  const mo = await req('/api/registrations/manual-attendance', {
    method: 'POST', token: clubToken,
    body: { userId: studentId, eventId, reason: 'Test manual override' }
  });
  log('Manual Override', { status: mo._status, message: mo.message || mo.error });

  // Attendance dashboard
  const dash = await req(`/api/registrations/attendance/${eventId}`, { token: clubToken });
  if (dash.totalScanned !== undefined) {
    log('Attendance Dashboard ✅', {
      totalScanned: dash.totalScanned,
      totalNotScanned: dash.totalNotScanned,
      totalRegistered: dash.totalRegistered
    });
  } else {
    fail('Attendance Dashboard', dash);
  }

  // Export CSV
  const csv = await req(`/api/registrations/attendance/${eventId}/csv`, { token: clubToken });
  if (csv._csv) {
    log('Export CSV ✅', { lines: csv._csv.split('\n').length });
  } else {
    log('Export CSV', csv);
  }
}

// ===================== FEEDBACK =====================
async function testFeedback() {
  console.log('\n========== ANONYMOUS FEEDBACK ==========');
  if (!studentToken || !eventId) { log('⚠️ Skipping feedback'); return; }

  // Submit feedback (event may not be "completed" — check response)
  const fb = await req('/api/feedback', {
    method: 'POST', token: studentToken,
    body: { eventId, rating: 4, comment: 'Great event! Well organized.' }
  });
  if (fb._status === 200 || fb._status === 201) {
    log('Submit Feedback ✅', { rating: 4 });
  } else {
    log('Submit Feedback (may need completed event)', { status: fb._status, error: fb.error });
  }

  // Get event feedback (public, anonymous)
  const ef = await req(`/api/feedback/event/${eventId}`);
  log('Event Feedback', {
    totalReviews: ef.stats?.totalReviews || 0,
    avgRating: ef.stats?.avgRating || 0,
    feedbackCount: ef.feedbacks?.length || 0
  });

  // Get my feedback
  const mf = await req(`/api/feedback/my/${eventId}`, { token: studentToken });
  log('My Feedback', mf.feedback ? { rating: mf.feedback.rating } : { message: 'none' });
}

// ===================== FORUM (REST endpoints) =====================
async function testForum() {
  console.log('\n========== DISCUSSION FORUM (REST) ==========');
  if (!studentToken || !eventId) { log('⚠️ Skipping forum'); return; }

  // Post a message
  const pm = await req(`/api/forum/${eventId}`, {
    method: 'POST', token: studentToken,
    body: { content: 'Hello from test! This is a forum message.' }
  });
  let messageId = '';
  if (pm._id) {
    messageId = pm._id;
    log('Post Message ✅', { messageId, content: pm.content });
  } else {
    fail('Post Message', pm);
  }

  // Get messages
  const msgs = await req(`/api/forum/${eventId}`);
  log('Get Messages', { count: Array.isArray(msgs) ? msgs.length : '?' });

  // React to message
  if (messageId) {
    const rc = await req(`/api/forum/message/${messageId}/react`, {
      method: 'POST', token: studentToken,
      body: { emoji: '👍' }
    });
    log('React to Message', { status: rc._status });
  }

  // Pin message (needs organizer)
  if (messageId && clubToken) {
    const pin = await req(`/api/forum/message/${messageId}/pin`, {
      method: 'PATCH', token: clubToken
    });
    log('Pin Message', { status: pin._status, pinned: pin.pinned });
  }

  // Delete message
  if (messageId) {
    const del = await req(`/api/forum/message/${messageId}`, {
      method: 'DELETE', token: studentToken
    });
    log('Delete Message', { status: del._status });
  }
}

// ===================== ANALYTICS =====================
async function testAnalytics() {
  console.log('\n========== EVENT ANALYTICS ==========');
  if (!clubToken || !eventId) { log('⚠️ Skipping analytics'); return; }

  const an = await req(`/api/events/${eventId}/analytics`, { token: clubToken });
  if (an.totalRegistrations !== undefined) {
    log('Event Analytics ✅', {
      totalRegistrations: an.totalRegistrations,
      confirmedRegistrations: an.confirmedRegistrations,
      totalAttendance: an.totalAttendance,
      attendanceRate: an.attendanceRate,
      revenue: an.revenue,
      regTimelinePoints: an.regTimeline?.length || 0,
      feedbackStats: an.feedbackStats ? 'present' : 'none',
      attendanceByMethod: an.attendanceByMethod?.length || 0,
      merchBreakdown: an.merchBreakdown?.length || 0
    });
  } else {
    fail('Event Analytics', an);
  }

  // Merch analytics
  if (merchEventId) {
    const man = await req(`/api/events/${merchEventId}/analytics`, { token: clubToken });
    log('Merch Event Analytics', {
      totalRegistrations: man.totalRegistrations,
      pendingPayments: man.pendingPayments,
      approvedPayments: man.approvedPayments,
      merchBreakdown: man.merchBreakdown?.length || 0
    });
  }
}

// ===================== ORGANIZER VIEWS =====================
async function testOrganizerViews() {
  console.log('\n========== ORGANIZER VIEWS ==========');
  if (!clubToken || !eventId) { log('⚠️ Skipping organizer views'); return; }

  const regs = await req(`/api/registrations/event/${eventId}`, { token: clubToken });
  log('Event Registrations (organizer)', { count: Array.isArray(regs) ? regs.length : '?' });
}

// ===================== RUN ALL =====================
async function runAll() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  FELICITY — Comprehensive Feature Test Suite    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Server: ${BASE_URL}\n`);

  try {
    await testAuth();
    await testEvents();
    await testRegistration();
    await testMerchPayment();
    await testAttendance();
    await testFeedback();
    await testForum();
    await testAnalytics();
    await testOrganizerViews();

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL TESTS COMPLETED                         ║');
    console.log('╚══════════════════════════════════════════════════╝');
  } catch (err) {
    console.error('\n💥 UNHANDLED ERROR:', err);
  }
}

runAll();
