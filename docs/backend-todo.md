# Backend TODO — Remaining Work per Assignment PDF

_Generated: 15 Feb 2026 · Felicity Event Management System_

> Legend: ✅ Done | 🔧 Partially done | ❌ Not started

---

## 1. What Already Works

| Feature | Status | Files |
|---------|--------|-------|
| User model (student + club fields) | ✅ | `models/usermodel.js` |
| Event model (basic) | 🔧 | `models/eventmodels.js` |
| Registration model (basic) | 🔧 | `models/registrationmodel.js` |
| Student signup with OTP | ✅ | `controllers/usercontroller.js` |
| Student login + JWT | ✅ | `controllers/usercontroller.js` |
| Club login + JWT | ✅ | `controllers/usercontroller.js` |
| Sysadmin login (env-based) | ✅ | `controllers/usercontroller.js` |
| Create / delete club (sysadmin) | ✅ | `controllers/usercontroller.js` |
| List clubs (public) | ✅ | `controllers/usercontroller.js` |
| Get profile by ID | ✅ | `controllers/usercontroller.js` |
| Update student profile | ✅ | `controllers/usercontroller.js` |
| Update club profile | ✅ | `controllers/usercontroller.js` |
| Email (OTP + notifications) | ✅ | `controllers/usercontroller.js` |
| Routes wired for above | ✅ | `routes/user.js` |

---

## 2. JWT Auth Middleware (HIGH PRIORITY)

**What:** A middleware that verifies `Authorization: Bearer <token>` on every protected route, decodes `{ _id, role }`, and attaches it to `req.user`.

**How to do it:**

Create file `middleware/auth.js`:

```js
const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).json({ error: 'Token required' });

  const token = authorization.split(' ')[1];
  try {
    const { _id, role } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id, role };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Optional: role-check helper
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = { requireAuth, requireRole };
```

**Usage:** In routes:
```js
const { requireAuth, requireRole } = require('../middleware/auth');
router.get('/profile/:id', requireAuth, getProfile);
router.post('/sysadmin/createclub', requireAuth, requireRole('sysadmin'), createClub);
```

**Apply to:** Every route except `POST /login`, `POST /signup`, `POST /send-otp`, `POST /verify-otp`, `GET /clubs`.

---

## 3. Event Model Enhancements (Section 7 & 8)

**Current state:** `models/eventmodels.js` has basic fields but is missing event types and merchandise-specific fields.

**What to add:**

| Field | Type | Notes |
|-------|------|-------|
| `event_type` | `String enum: ['normal', 'merchandise']` | Replace current technical/cultural/sports (that's category, not type) |
| `status` | `String enum: ['draft','published','ongoing','completed','closed']` | Currently only `draft/publish` |
| `registration_fee` | `Number` | Already exists |
| `custom_form_fields` | `[{ label, type, required, options }]` | For normal events' dynamic form builder |
| `merchandise_items` | `[{ name, size, color, variants, stock, price, purchase_limit }]` | For merchandise events |
| `registered_count` | `Number, default 0` | Track against `Registrationlimit` |

**How:**
```js
// Add to Eventschema:
event_type: { type: String, enum: ['normal', 'merchandise'], required: true },

status: { type: String, enum: ['draft', 'published', 'ongoing', 'completed', 'closed'], default: 'draft' },

custom_form_fields: [{
  label: String,
  field_type: { type: String, enum: ['text', 'dropdown', 'checkbox', 'file_upload'] },
  required: { type: Boolean, default: false },
  options: [String]  // for dropdown/checkbox
}],

merchandise_items: [{
  name: String,
  sizes: [String],
  colors: [String],
  stock: { type: Number, default: 0 },
  price: Number,
  purchase_limit: { type: Number, default: 1 }
}],

registered_count: { type: Number, default: 0 }
```

---

## 4. Events Controller & Routes (Section 9.3–9.5, 10.2–10.4)

**File:** `controllers/eventscontroller.js` (currently almost empty)  
**Routes:** `routes/events.js` (currently just a stub GET `/`)

### 4a. Endpoints to implement:

| Method | Path | Who | What |
|--------|------|-----|------|
| `POST` | `/events` | club (auth) | Create event (draft) |
| `GET` | `/events` | public | List/search events (with filters) |
| `GET` | `/events/:id` | public | Single event details |
| `PATCH` | `/events/:id` | club (owner) | Edit event (status-based rules) |
| `PATCH` | `/events/:id/publish` | club (owner) | Publish a draft |
| `PATCH` | `/events/:id/status` | club (owner) | Change status (ongoing/completed/closed) |
| `GET` | `/events/trending` | public | Top 5 by registrations in 24h |
| `GET` | `/events/my` | club (auth) | All events by logged-in organizer |
| `GET` | `/events/:id/participants` | club (owner) | List participants for CSV/analytics |

### 4b. How to implement key features:

**Search with fuzzy matching (Section 9.3):**
```js
// Use MongoDB $text index or regex
const events = await Event.find({
  $or: [
    { name: { $regex: query, $options: 'i' } },
    { Description: { $regex: query, $options: 'i' } }
  ]
});
```
Or install `mongoose-fuzzy-searching` for better fuzzy search. Simpler: use `$regex` with partial match.

**Filters (Section 9.3):**
```js
const filter = {};
if (req.query.event_type) filter.event_type = req.query.event_type;
if (req.query.eligibility) filter.Eligibility_criteria = req.query.eligibility;
if (req.query.from && req.query.to) {
  filter.Event_start = { $gte: new Date(req.query.from), $lte: new Date(req.query.to) };
}
if (req.query.club_id) filter.Club_id = req.query.club_id;
```

**Trending (Top 5 / 24h):**
```js
const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
const trending = await Registration.aggregate([
  { $match: { createdAt: { $gte: since } } },
  { $group: { _id: '$Event_id', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 5 }
]);
// Then populate event details
```

**Event status edit rules (Section 10.4):**
```js
// In PATCH /events/:id
if (event.status === 'draft') { /* allow all edits */ }
else if (event.status === 'published') { /* only description, extend deadline, increase limit */ }
else { /* no edits except status change */ }
```

### 4c. Wire routes in `index.js`:
```js
const eventRoutes = require('./routes/events.js');
app.use('/events', eventRoutes);
```

---

## 5. Registration Controller & Routes (Section 9.5)

**File:** `controllers/registrationcontroller.js` (currently empty)  
**Model:** `models/registrationmodel.js` (basic, needs enhancement)

### 5a. Enhance Registration model:
```js
const RegistrationSchema = new Schema({
  Event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  User_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registration_date: { type: Date, default: Date.now },
  status: { type: String, enum: ['confirmed', 'cancelled', 'rejected'], default: 'confirmed' },
  ticket_id: { type: String, unique: true },
  custom_form_data: { type: Object },          // answers to dynamic form
  merchandise_selections: [{                    // for merchandise events
    item_name: String, size: String, color: String, quantity: Number
  }],
  payment_status: { type: String, enum: ['pending', 'paid', 'na'], default: 'na' },
  qr_data: String,                             // QR code data URL
  attended: { type: Boolean, default: false }
}, { timestamps: true });
```

### 5b. Endpoints:

| Method | Path | Who | What |
|--------|------|-----|------|
| `POST` | `/registrations` | student (auth) | Register for event |
| `GET` | `/registrations/my` | student (auth) | My registrations (dashboard) |
| `GET` | `/registrations/:id` | student (auth) | Single registration + ticket |
| `PATCH` | `/registrations/:id/cancel` | student (auth) | Cancel registration |
| `GET` | `/registrations/event/:eventId` | club (owner) | All registrations for event |
| `GET` | `/registrations/event/:eventId/csv` | club (owner) | CSV export |

### 5c. Key logic:

**Register for normal event:**
```js
// 1. Check event exists & is published
// 2. Check deadline not passed: if (event.Registration_deadline < new Date()) → 400
// 3. Check registration limit: if (event.registered_count >= event.Registrationlimit) → 400
// 4. Check not already registered
// 5. Create registration with unique ticket_id (use uuid or nanoid)
// 6. Increment event.registered_count
// 7. Generate QR code (npm install qrcode)
// 8. Send confirmation email with ticket
```

**Generate ticket with QR:**
```bash
npm install qrcode uuid
```
```js
const QRCode = require('qrcode');
const { v4: uuid } = require('uuid');

const ticketId = uuid();
const qrData = await QRCode.toDataURL(JSON.stringify({
  ticket_id: ticketId, event: event.name, participant: user.email
}));
```

**Wire routes in `index.js`:**
```js
const registrationRoutes = require('./routes/registrations.js');
app.use('/registrations', registrationRoutes);
```

---

## 6. Participant "Follow Club" Feature (Section 5, 9.7)

**Current state:** `clubs_interests` field exists on User model. Needs actual follow/unfollow endpoints.

### Endpoints:
```
POST   /user/follow/:clubId      → push clubId into user.clubs_interests
DELETE /user/follow/:clubId      → pull clubId from user.clubs_interests
GET    /user/following           → list clubs the user follows
```

### How:
```js
const followClub = async (req, res) => {
  const userId = req.user._id;
  const { clubId } = req.params;
  await User.findByIdAndUpdate(userId, { $addToSet: { clubs_interests: clubId } });
  res.json({ message: 'Followed' });
};
```

> Note: You may want to change `clubs_interests` from `[String]` enum to `[ObjectId] ref: 'User'` to store actual club references instead of string names.

---

## 7. Password Change / Reset (Section 4, 9.6, 13.2)

### 7a. Student password change (Profile page):
```
PATCH /user/change-password   body: { oldPassword, newPassword }
```
Logic: verify old password with bcrypt.compare, hash new one, save.

### 7b. Organizer password reset (Tier B advanced feature):
```
POST   /user/password-reset-request     → organizer requests reset
GET    /admin/password-resets            → admin views requests
PATCH  /admin/password-resets/:id        → admin approves/rejects
```
On approval: generate random password, hash it, update club user, email the new password to admin.

---

## 8. Onboarding Preferences (Section 5)

**Current state:** Signup already accepts `interests` and `clubs_interests`. Need:
- Make them optional during signup (already done — they default to `[]`)
- Ensure they're editable from profile (already done via `updateStudent`)
- **Influence event ordering:** When fetching events for a student, sort/boost events whose tags match the student's interests or whose organizer is in their followed clubs

**How to implement preference-based ordering:**
```js
// In GET /events when user is logged in:
const user = await User.findById(req.user._id);
const events = await Event.find({ status: 'published' }).lean();

// Score each event
events.forEach(e => {
  e.score = 0;
  if (user.interests.some(i => e.Event_tags.includes(i))) e.score += 2;
  if (user.clubs_interests.includes(e.Club_id.toString())) e.score += 3;
});
events.sort((a, b) => b.score - a.score);
```

---

## 9. Discord Webhook for Organizers (Section 10.5)

**What:** Club profile can save a Discord webhook URL. When they publish an event, auto-POST to that webhook.

### Add to User model (club fields):
```js
discord_webhook: { type: String }   // e.g. https://discord.com/api/webhooks/...
```

### Send on event publish:
```js
const fetch = require('node-fetch');   // already in package.json

async function postToDiscord(webhookUrl, event) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `📢 **New Event:** ${event.name}\n${event.Description}\nRegister by: ${event.Registration_deadline}`
    })
  });
}
```

---

## 10. Admin Password Reset Requests (Tier B - Section 13.2)

### New Model: `models/passwordresetmodel.js`
```js
const PasswordResetSchema = new Schema({
  club_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  admin_comment: String,
  new_password_hash: String
}, { timestamps: true });
```

### Endpoints:
```
POST   /user/password-reset-request        → club submits request
GET    /admin/password-resets               → admin lists requests
PATCH  /admin/password-resets/:id/approve   → admin approves, auto-generates new pwd
PATCH  /admin/password-resets/:id/reject    → admin rejects with comment
```

---

## 11. Packages to Install

```bash
cd backend
npm install qrcode uuid multer
# qrcode  → generate QR codes for tickets
# uuid    → unique ticket IDs
# multer  → file uploads (payment proofs, custom form file fields)
```

**Optional (for advanced features):**
```bash
npm install socket.io         # real-time discussion forum / team chat
npm install csv-writer        # export CSV for participant lists
```

---

## 12. File Upload Setup (for Tier A merch payment proofs, form builder)

```js
// middleware/upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
module.exports = upload;
```

Serve static files:
```js
// in index.js
app.use('/uploads', express.static('uploads'));
```

---

## 13. Summary: Priority Order for Remaining Work

| Priority | Task | Marks | Est. Time |
|----------|------|-------|-----------|
| 🔴 1 | JWT auth middleware | 3 | 30 min |
| 🔴 2 | Events CRUD controller + routes | 2+4+5 = 11 | 3–4 hrs |
| 🔴 3 | Registration controller + tickets/QR | 5 | 2–3 hrs |
| 🟡 4 | Browse events (search/filters/trending) | 5 | 2 hrs |
| 🟡 5 | Event detail page API (participant + organizer views) | 2+4 = 6 | 1–2 hrs |
| 🟡 6 | Follow/unfollow clubs API | 1 | 30 min |
| 🟡 7 | Password change API | part of 2 | 30 min |
| 🟡 8 | Preference-based event ordering | 3 | 1 hr |
| 🟡 9 | Discord webhook on publish | part of 4 | 30 min |
| 🟢 10 | CSV export for participants | part of 4 | 30 min |
| 🟢 11 | Tier A advanced features (choose 2) | 16 | 4–6 hrs |
| 🟢 12 | Tier B advanced features (choose 2) | 12 | 3–4 hrs |
| 🟢 13 | Tier C advanced feature (choose 1) | 2 | 1 hr |
| 🟢 14 | Deployment | 5 | 1 hr |

**Total remaining backend: ~20-25 hours of work**

---

## 14. Recommended Advanced Feature Picks

### Tier A (pick 2 of 3):
1. **Merchandise Payment Approval** — straightforward workflow, builds on existing event/registration models
2. **QR Scanner & Attendance** — `qrcode` package already needed; camera scanning is frontend work

### Tier B (pick 2 of 3):
1. **Organizer Password Reset** — simple CRUD + email, described above
2. **Real-Time Discussion Forum** — uses `socket.io`, good to learn, impressive in eval

### Tier C (pick 1 of 3):
- **Anonymous Feedback** — simplest: one model (EventFeedback), two endpoints (submit + aggregate)

---

## 15. Quick Reference: File Tree After All Backend Work

```
backend/
├── index.js
├── config.js
├── db.js
├── .env
├── package.json
├── middleware/
│   ├── auth.js          ← NEW: JWT verification + role guard
│   └── upload.js        ← NEW: multer file upload config
├── models/
│   ├── usermodel.js
│   ├── eventmodels.js   ← ENHANCE: add event_type, status, form fields, merch items
│   ├── registrationmodel.js ← ENHANCE: add ticket_id, qr, status, merch selections
│   ├── passwordresetmodel.js ← NEW (Tier B)
│   └── feedbackmodel.js      ← NEW (Tier C)
├── controllers/
│   ├── usercontroller.js
│   ├── eventscontroller.js    ← IMPLEMENT: full CRUD + search/filter/trending
│   ├── registrationcontroller.js ← IMPLEMENT: register, cancel, QR, email
│   └── admincontroller.js     ← NEW: password reset management
├── routes/
│   ├── user.js
│   ├── events.js         ← IMPLEMENT: wire event endpoints
│   ├── registrations.js  ← IMPLEMENT: wire registration endpoints
│   └── admin.js          ← NEW: admin-only routes
└── uploads/              ← NEW: file upload directory
```
