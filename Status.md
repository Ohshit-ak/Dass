# Felicity Event Management System - One Week Tracker

**Assignment Deadline:** 19th Feb 2026  
**Total Marks:** 100 (70 Core + 30 Advanced)

---

## 📅 Week Overview

### Day 1 (Feb 12) - Foundation & Setup
**Focus:** Project setup, authentication, and database models

#### Morning (3-4 hours)
- [ ] Create project structure (frontend + backend folders)
- [ ] Initialize MERN stack:
  - [ ] Backend: `npm init`, install Express, MongoDB, bcrypt, JWT, cors
  - [ ] Frontend: Create React app (or Next.js/Vite)
  - [ ] Setup MongoDB Atlas account and create database
- [ ] Create `.env` files for both frontend and backend
-

#### Afternoon (3-4 hours)
- [ ] **Database Models (2 marks):**
  - [ ] User/Participant schema (all required fields from Section 6.1)
  - [ ] Organizer schema (all required fields from Section 6.2)
  - [ ] Event schema (all required fields from Section 8)
  - [ ] Add additional fields as needed (document in README)

#### Evening (2-3 hours)
- [ ] **Authentication Backend (8 marks):**
  - [ ] Admin provisioning script (backend only, no UI)
  - [ ] Registration API for IIIT participants (email validation)
  - [ ] Registration API for Non-IIIT participants
  - [ ] Login API with JWT generation
  - [ ] Password hashing with bcrypt
  - [ ] JWT middleware for protected routes

**Day 1 Target:** 10 marks worth of features completed

---

### Day 2 (Feb 13) - Complete Authentication & Start Participant Features
**Focus:** Frontend auth, role-based access, participant dashboard

#### Morning (3-4 hours)
- [ ] **Frontend Authentication:**
  - [ ] Login page (with role-based redirect)
  - [ ] Signup pages (IIIT vs Non-IIIT)
  - [ ] JWT storage and session management
  - [ ] Logout functionality
  - [ ] Protected routes with role-based access control

#### Afternoon (3-4 hours)
- [ ] **Onboarding & Preferences (3 marks):**
  - [ ] Onboarding flow after signup (areas of interest, clubs to follow)
  - [ ] Skip option functionality
  - [ ] Store preferences in database
- [ ] **Profile Page - Participant (2 marks):**
  - [ ] Display all user details
  - [ ] Edit functionality for allowed fields
  - [ ] Password change/reset mechanism

#### Evening (2-3 hours)
- [ ] **My Events Dashboard - Start (6 marks):**
  - [ ] Create dashboard layout
  - [ ] Upcoming Events section with API
  - [ ] Participation History tabs (Normal, Merchandise, Completed, Cancelled)
  - [ ] Ticket ID display and linking

**Day 2 Target:** Additional 11 marks (Total: 21 marks)

---

### Day 3 (Feb 14) - Event Management Core
**Focus:** Event CRUD, event types, browse events

#### Morning (3-4 hours)
- [ ] **Event Types Implementation (2 marks):**
  - [ ] Normal Event model and logic
  - [ ] Merchandise Event model and logic
  - [ ] Event attributes validation
- [ ] **Event Creation - Backend:**
  - [ ] Create event API (draft mode)
  - [ ] Publish event API
  - [ ] Edit event API (with rules based on status)
  - [ ] Custom form builder data structure

#### Afternoon (3-4 hours)
- [ ] **Browse Events Page (5 marks):**
  - [ ] Search with fuzzy matching (event/organizer names)
  - [ ] Trending events (Top 5/24h logic)
  - [ ] Filters: Event Type, Eligibility, Date Range, Followed Clubs
  - [ ] Display event cards with essential details
  
#### Evening (2-3 hours)
- [ ] **Event Details Page - Participant (2 marks):**
  - [ ] Display complete event information
  - [ ] Registration/Purchase button with validation
  - [ ] Block based on deadline/limit/stock
  - [ ] Different views for different event types

**Day 3 Target:** Additional 9 marks (Total: 30 marks)

---

### Day 4 (Feb 15) - Registration Workflows & Organizer Features
**Focus:** Tickets, QR codes, organizer dashboard

#### Morning (3-4 hours)
- [ ] **Event Registration Workflows (5 marks):**
  - [ ] Normal event registration with custom form
  - [ ] Merchandise purchase flow
  - [ ] Stock management and decrement
  - [ ] Ticket generation with QR code (use library like `qrcode`)
  - [ ] Email sending setup (nodemailer or similar)
  - [ ] Confirmation emails for registrations

#### Afternoon (3-4 hours)
- [ ] **Organizer Dashboard (3 marks):**
  - [ ] Events carousel showing all organizer's events
  - [ ] Event status display (Draft/Published/Ongoing/Closed)
  - [ ] Analytics: registrations, sales, revenue, attendance
  - [ ] Links to event detail pages

#### Evening (2-3 hours)
- [ ] **Event Detail Page - Organizer View (4 marks):**
  - [ ] Overview section with all event details
  - [ ] Analytics display
  - [ ] Participants list with search/filter
  - [ ] CSV export functionality

**Day 4 Target:** Additional 12 marks (Total: 42 marks)

---

### Day 5 (Feb 16) - Organizer & Admin Features
**Focus:** Event creation UI, admin panel

#### Morning (3-4 hours)
- [ ] **Event Creation & Editing UI (4 marks):**
  - [ ] Create event form (all fields from Section 8)
  - [ ] Draft/Publish workflow
  - [ ] Form builder UI for custom registration forms
  - [ ] Field types: text, dropdown, checkbox, file upload
  - [ ] Field reordering and required/optional marking
  - [ ] Edit restrictions based on event status

#### Afternoon (3-4 hours)
- [ ] **Organizer Profile Page (4 marks):**
  - [ ] Display and edit organizer details
  - [ ] Discord webhook integration
  - [ ] Auto-post new events to Discord
  - [ ] Test webhook functionality

#### Evening (2-3 hours)
- [ ] **Admin Features (6 marks):**
  - [ ] Admin dashboard
  - [ ] Add new club/organizer with auto-generated credentials
  - [ ] View all clubs/organizers
  - [ ] Remove/disable club functionality
  - [ ] Archive vs permanent delete option

**Day 5 Target:** Additional 14 marks (Total: 56 marks)

---

### Day 6 (Feb 17) - Remaining Core + Advanced Features
**Focus:** Complete remaining core features, start advanced features

#### Morning (3-4 hours)
- [ ] **Clubs/Organizers Pages (2 marks):**
  - [ ] Listing page with all approved organizers
  - [ ] Follow/Unfollow functionality
  - [ ] Organizer detail page (participant view)
  - [ ] Upcoming and past events display

#### Afternoon (4-5 hours)
- [ ] **Choose & Implement Tier A Features (16 marks - choose 2):**
  
  **Option 1: Hackathon Team Registration (8 marks)**
  - [ ] Team creation by leader
  - [ ] Unique invite code/link generation
  - [ ] Team member invitation flow
  - [ ] Accept/reject invite functionality
  - [ ] Team completion logic
  - [ ] Ticket generation for all members
  
  **Option 2: Merchandise Payment Approval (8 marks)**
  - [ ] Payment proof upload
  - [ ] Pending approval state
  - [ ] Organizer approval dashboard
  - [ ] Approve/reject functionality
  - [ ] Ticket generation on approval
  
  **Option 3: QR Scanner & Attendance (8 marks)**
  - [ ] QR scanner using device camera
  - [ ] File upload for QR
  - [ ] Attendance marking with timestamp
  - [ ] Duplicate scan prevention
  - [ ] Live attendance dashboard
  - [ ] Manual override with audit log

#### Evening (2 hours)
- [ ] Test Tier A features thoroughly
- [ ] Fix bugs and edge cases

**Day 6 Target:** Additional 18 marks (Total: 74 marks)

---

### Day 7 (Feb 18) - Advanced Features + Deployment
**Focus:** Tier B & C features, deployment, polish

#### Morning (3-4 hours)
- [ ] **Tier B Features (12 marks - choose 2):**
  
  **Option 1: Real-Time Discussion Forum (6 marks)**
  - [ ] Setup Socket.io
  - [ ] Message posting and display
  - [ ] Organizer moderation (delete/pin)
  - [ ] Notification system
  - [ ] Message reactions
  
  **Option 2: Organizer Password Reset (6 marks)**
  - [ ] Request password reset form
  - [ ] Admin view of reset requests
  - [ ] Approve/reject workflow
  - [ ] Auto-generate new password
  - [ ] Status tracking
  
  **Option 3: Team Chat (6 marks)**
  - [ ] Real-time chat with Socket.io
  - [ ] Message history
  - [ ] Online status indicators
  - [ ] Typing indicators
  - [ ] File sharing

#### Afternoon (3-4 hours)
- [ ] **Tier C Feature (2 marks - choose 1):**
  - [ ] **Anonymous Feedback:** Star rating + comments, aggregated view
  - [ ] **Add to Calendar:** .ics file generation, Google/Outlook links
  - [ ] **Bot Protection:** reCAPTCHA integration, rate limiting

- [ ] **Deployment (5 marks):**
  - [ ] Deploy frontend to Vercel/Netlify
  - [ ] Deploy backend to Render/Railway/Fly.io
  - [ ] Configure MongoDB Atlas connection
  - [ ] Set environment variables
  - [ ] Create `deployment.txt` with URLs

#### Evening (2-3 hours)
- [ ] **Final Polish:**
  - [ ] Test all features end-to-end
  - [ ] Fix any remaining bugs
  - [ ] Ensure responsive design
  - [ ] Update README.md with:
    - [ ] Project description
    - [ ] Tech stack
    - [ ] Setup instructions
    - [ ] Advanced features implemented (with justification)
    - [ ] Additional attributes added to models
  - [ ] Create ZIP file with correct structure
  - [ ] Final submission check

**Day 7 Target:** Additional 19 marks (Total: 93-100 marks)

---

## 📊 Progress Tracker

| Day | Features Completed | Marks | Cumulative |
|-----|-------------------|-------|------------|
| 1   | Setup + Auth + Models | 10 | 10 |
| 2   | Auth UI + Onboarding + Dashboard | 11 | 21 |
| 3   | Events + Browse + Details | 9 | 30 |
| 4   | Registration + Org Dashboard | 12 | 42 |
| 5   | Event Creation + Admin | 14 | 56 |
| 6   | Clubs + Tier A (2 features) | 18 | 74 |
| 7   | Tier B + C + Deployment | 26 | 100 |

---

## ⚡ Quick Tips

### Time Management
- **Stick to the schedule** - don't spend too much time perfecting one feature
- **Test as you build** - don't leave testing for the end
- **Commit frequently** - push to Git after each major feature

### Priority Order
1. **Core features first** (Day 1-5) - these are 70% of marks
2. **Choose advanced features wisely** - pick ones you're comfortable with
3. **Deployment early** - set up deployment on Day 6 to avoid last-minute issues

### Common Pitfalls to Avoid
- ❌ Not implementing role-based access control properly
- ❌ Forgetting email domain validation for IIIT students
- ❌ Not hashing passwords with bcrypt
- ❌ Missing JWT authentication on protected routes
- ❌ Not implementing proper event status workflows
- ❌ Forgetting to send confirmation emails
- ❌ Not generating QR codes for tickets

### Advanced Feature Recommendations

**Tier A - Choose 2:**
- **Easiest:** QR Scanner & Attendance (if you're comfortable with camera APIs)
- **Medium:** Merchandise Payment Approval (straightforward workflow)
- **Complex:** Hackathon Team Registration (most logic, but impressive)

**Tier B - Choose 2:**
- **Easiest:** Organizer Password Reset (simple CRUD workflow)
- **Medium:** Real-Time Discussion Forum (requires Socket.io but straightforward)
- **Complex:** Team Chat (requires Socket.io + advanced features)

**Tier C - Choose 1:**
- **Easiest:** Add to Calendar (.ics file generation)
- **Medium:** Anonymous Feedback (simple form + aggregation)
- **Bot Protection:** (integration with external service)

---

## 🛠️ Essential Libraries

### Backend
```bash
npm install express mongoose bcrypt jsonwebtoken cors dotenv
npm install nodemailer qrcode multer socket.io
```

### Frontend
```bash
npm install axios react-router-dom
npm install @heroicons/react # or any icon library
npm install socket.io-client # if using real-time features
npm install html5-qrcode # for QR scanning
```

---

## 📝 Daily Checklist Template

Use this for each day:

```
Date: ___________

Morning Goals:
□ _________________
□ _________________
□ _________________

Afternoon Goals:
□ _________________
□ _________________
□ _________________

Evening Goals:
□ _________________
□ _________________

Blockers/Issues:
- _________________

Next Day Priority:
- _________________
```

---

## 🎯 Final Day Checklist (Feb 18)

- [ ] All core features working (70 marks)
- [ ] 2 Tier A features working (16 marks)
- [ ] 2 Tier B features working (12 marks)
- [ ] 1 Tier C feature working (2 marks)
- [ ] Deployment complete with URLs in deployment.txt
- [ ] README.md complete with all sections
- [ ] Code is clean and commented
- [ ] Can explain every part of your code (for evals)
- [ ] ZIP file created with correct structure: `<roll_no>/backend/`, `<roll_no>/frontend/`, `README.md`, `deployment.txt`
- [ ] ZIP file tested (extract and verify structure)
- [ ] Submit before deadline!

---

## 🚨 Evaluation Preparation

**You MUST be able to explain:**
1. Authentication flow (JWT, bcrypt, session management)
2. Database schema and relationships
3. Event creation and registration workflows
4. Role-based access control implementation
5. Advanced features you implemented
6. Why you chose specific advanced features
7. How you handled edge cases

**Practice explaining:**
- Why you chose certain approaches
- How data flows from frontend to backend to database
- Security measures implemented
- Challenges faced and how you solved them

---

Good luck! Stay focused, manage your time well, and remember - completing core features is more important than perfect UI. Functionality > Aesthetics for this assignment.