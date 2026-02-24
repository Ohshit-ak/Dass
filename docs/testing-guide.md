# Felicity Event Management System — Comprehensive Testing Guide

> **Reference:** `assignment.txt` — Part 1 (Sections 1–12) + Part 2 (Sections 13.1–13.3)
> Covers **all features through Part 1** and any implemented Tier A/B/C features.

---

## Pre-requisites

| Item | How to verify |
|------|---------------|
| Backend running | `cd backend && npm run dev` → "Server running on port 8000" + "Connected to MongoDB" |
| Frontend running | `cd frontend && npm start` → opens `http://localhost:3000` |
| MongoDB Atlas connected | Backend logs "Connected to MongoDB" with no errors |
| `.env` configured | `backend/.env` has `MONGO_URI`, `JWT_SECRET`, `SYSADMIN_EMAIL`, `SYSADMIN_PASSWORD`, SMTP credentials |
| Ethereal fallback | If Gmail SMTP fails, backend logs an Ethereal preview URL — check console for email previews |

---

## Section 3 — User Roles (Verify role isolation)

### Test 3.1: Role Enforcement
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1.1 | Student can't access admin pages | Login as student → navigate to `/admin/clubs` | Redirected to `/unauthorized` |
| 3.1.2 | Student can't access club pages | Login as student → navigate to `/events/create` | Redirected to `/unauthorized` |
| 3.1.3 | Club can't access student pages | Login as club → navigate to `/events` (browse) | Redirected to `/unauthorized` |
| 3.1.4 | Club can't access admin pages | Login as club → navigate to `/admin/clubs` | Redirected to `/unauthorized` |
| 3.1.5 | Admin can't create events | Login as admin → navigate to `/events/create` | Redirected to `/unauthorized` |
| 3.1.6 | No role switching | A user with role `student` cannot become `club` or `sysadmin` | No UI or API allows changing the `role` field |

---

## Section 4 — Authentication & Security [8 Marks]

### 4.1 Registration & Login [3 Marks]

#### 4.1.1 Participant Registration
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1.1a | IIIT student must use IIIT email | Go to `/signup` → Select "IIIT" → Enter `test@gmail.com` | Error: "Email domain not allowed" |
| 4.1.1b | IIIT student with valid email | `/signup` → "IIIT" → `test@students.iiit.ac.in` → fill all fields + OTP | Account created, redirected to dashboard |
| 4.1.1c | Non-IIIT can use any non-IIIT email | `/signup` → "NON_IIIT" → `test@gmail.com` → fill all fields + OTP | Account created |
| 4.1.1d | Non-IIIT cannot use IIIT email | `/signup` → "NON_IIIT" → `test@iiit.ac.in` | Error: "Email domain not allowed" |
| 4.1.1e | OTP flow works | Click "Send OTP" → check console for Ethereal URL → enter the 6-digit code → verify | OTP verified, signup proceeds |
| 4.1.1f | Expired OTP rejected | Wait >5 minutes after OTP → enter code | Error: "OTP expired" |
| 4.1.1g | Wrong OTP rejected | Enter wrong code | Error: "Incorrect OTP" |
| 4.1.1h | Duplicate email | Signup with an already-registered email | Error: "Email already in use" |
| 4.1.1i | Weak password rejected | Password: `123` | Error: "Password not strong enough" |
| 4.1.1j | Required fields check | Leave first_name blank | Error: "All fields are required" |

#### 4.1.2 Organizer Authentication
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1.2a | Club cannot self-register | There is no "Club Signup" page | Clubs created only by admin |
| 4.1.2b | Club login with admin-provided credentials | Admin creates club → use generated email/password at `/login` → select "Club" | Successful login, redirected to club dashboard |
| 4.1.2c | Disabled club cannot login | Admin disables club → club tries to login | Error: "This account has been disabled by the admin" |
| 4.1.2d | Wrong password | Club login with wrong password | Error: "Incorrect password" |

#### 4.1.3 Admin Account Provisioning
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1.3a | Admin login | Go to `/login` → select "Admin" → enter `.env` SYSADMIN_EMAIL & SYSADMIN_PASSWORD | Login success, admin dashboard |
| 4.1.3b | Wrong admin credentials | Wrong email or password | Error: "Invalid sysadmin credentials" |
| 4.1.3c | Admin is backend-only provisioned | No signup form exists for admin | Correct — admin credentials in `.env` only |

### 4.2 Security Requirements [3 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.2.1 | Passwords hashed | Check MongoDB Atlas → `users` collection → any user's `password` field | bcrypt hash (starts with `$2b$`) — NOT plaintext |
| 4.2.2 | JWT authentication | Open DevTools → Application → localStorage → check `user` | Token present; JWT format `xxxxx.yyyyy.zzzzz` |
| 4.2.3 | Protected routes block unauthenticated access | Open incognito → go to `/dashboard` | Redirected to `/login` |
| 4.2.4 | API rejects missing token | `curl http://localhost:8000/user/profile/someId` (no Auth header) | 401 error |
| 4.2.5 | Role-based access | Student token → `DELETE /user/sysadmin/deleteclub/someId` | 403 Forbidden |

### 4.3 Session Management [2 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.3.1 | Login redirects to dashboard | Login as any role | Redirected to `/dashboard` |
| 4.3.2 | Session persists across restart | Login → close browser → reopen → go to `/dashboard` | Still logged in (localStorage persists) |
| 4.3.3 | Logout clears tokens | Click "Logout" in navbar → check localStorage | `user` key removed, redirected to `/` |
| 4.3.4 | After logout, protected routes blocked | After logout → navigate to `/dashboard` | Redirected to `/login` |

---

## Section 5 — User Onboarding & Preferences [3 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | Interests selection at signup | During signup, select multiple interests | Saved in DB; visible on profile page |
| 5.2 | Skip preferences | Don't select any interests during signup | Account created, preferences empty |
| 5.3 | Edit preferences from profile | Go to `/profile` → change interests → Save | Updated in DB |
| 5.4 | Follow clubs from listing | Go to `/clubs` → click Follow on a club | Club added to following list |
| 5.5 | Edit followed clubs from profile | Profile page shows followed clubs | Can be modified |

---

## Section 6 — User Data Models [2 Marks]

### 6.1 Participant Details
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.1.1 | All fields stored | After signup, check MongoDB `users` collection | `first_name`, `last_name`, `email`, `st`, `college_name`, `contact_number`, `password` (hashed), `role: 'student'` all present |

### 6.2 Organizer Details
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.2.1 | Club only has required fields | Admin creates club → check MongoDB | `organizer_name`, `category`, `description`, `contact_email` present. `role: 'club'` |
| 6.2.2 | Admin form only shows 4 fields | Go to `/admin/clubs` or admin dashboard | Form shows only: Organizer Name, Category, Description, Contact Email |

---

## Section 7 — Event Types [2 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1 | Normal event creation | Club creates event with type "normal" | Event saved with custom form fields |
| 7.2 | Merchandise event creation | Club creates event with type "merchandise" | Event saved with merchandise details (sizes, variants, stock) |
| 7.3 | Event type cannot be changed after creation | Check that type is locked | Not editable in update |

---

## Section 8 — Event Attributes [2 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 8.1 | All required fields present | Create event → check MongoDB | `name`, `Description`, `Event_type`, `Eligibility_criteria`, `Registration_deadline`, `Event_start`, `Event_end`, `Registrationlimit`, `Registration_fee`, `Club_id`, `Event_tags` |
| 8.2 | Event end > Event start validation | Set end date before start date | Error: "Event end date must be after start date" |
| 8.3 | Normal events have custom form | Create normal event with custom form fields | `customForm` stored in DB |
| 8.4 | Merchandise events have item details | Create merchandise event with size/color/stock | `merchandiseDetails` stored with variants |

---

## Section 9 — Participant Features & Navigation [22 Marks]

### 9.1 Navigation Menu [1 Mark]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.1.1 | Student navbar items | Login as student | Navbar shows: Dashboard, Browse Events, Clubs/Organizers, Profile, Logout |

### 9.2 My Events Dashboard [6 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.2.1 | Upcoming events shown | Register for future event → go to dashboard | Event appears under upcoming |
| 9.2.2 | Participation history | Register for events of different types | Categorized under tabs: Normal, Merchandise, Completed, Cancelled |
| 9.2.3 | Event records show details | Check each registration card | Shows event name, type, organizer, status, ticket ID |
| 9.2.4 | Ticket ID clickable | Click on ticket ID | Navigates to event details |

### 9.3 Browse Events Page [5 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.3.1 | Search by event name | Type partial event name in search bar | Matching events shown (fuzzy) |
| 9.3.2 | Search by organizer name | Type organizer name in search | Events by that organizer shown |
| 9.3.3 | **Trending (Top 5/24h)** | Have multiple events with registrations in last 24h | 🔥 Trending section shows top 5 events ranked by recent registration count |
| 9.3.4 | Trending shows registration count | Check trending cards | Each shows "X registrations in 24h" |
| 9.3.5 | Trending collapsible | Click the trending header | Section toggles open/close |
| 9.3.6 | Filter by Event Type | Select "Normal" or "Merchandise" | Only matching events shown |
| 9.3.7 | Filter by Eligibility | Select "IIIT" or "Non-IIIT" | Only eligible events shown |
| 9.3.8 | Filter by Date Range | Set From/To dates | Only events in range shown |
| 9.3.9 | Followed Clubs Only | Check "Followed Clubs Only" checkbox | Only events from followed clubs |
| 9.3.10 | Filters work with search | Combine search + type filter | Both applied simultaneously |

### 9.4 Event Details Page [2 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.4.1 | Complete event info | Click any event card | Full details: name, description, type, dates, eligibility, fee, organizer |
| 9.4.2 | Register/Purchase button | Event with open registration | Button visible and clickable |
| 9.4.3 | Deadline passed blocking | Event past registration deadline | Button disabled, message shown |
| 9.4.4 | Registration limit reached | Event at capacity | Button disabled, "Registration full" message |

### 9.5 Event Registration Workflows [5 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.5.1 | Normal event registration | Fill custom form → submit | Registration created, confirmation shown |
| 9.5.2 | Ticket sent via email | After registration | Check console for Ethereal preview URL — email contains ticket details |
| 9.5.3 | Ticket in participation history | After registration | Ticket appears in dashboard history |
| 9.5.4 | Merchandise purchase | Select variant → purchase | Stock decremented, ticket generated |
| 9.5.5 | Out-of-stock blocked | Try purchasing when stock = 0 | Error: purchase blocked |

### 9.6 Profile Page [2 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.6.1 | Editable fields work | Edit First Name, Last Name, Contact, College, Interests, Followed Clubs → Save | Saved successfully |
| 9.6.2 | Non-editable fields shown | Check Email and Participant Type | Displayed but not editable (no input fields) |
| 9.6.3 | **Password Change** | Enter current password → new password → confirm → Change | "Password changed successfully!" |
| 9.6.4 | **Wrong current password** | Enter wrong current password | Error: "Current password is incorrect" |
| 9.6.5 | **Password mismatch** | New password ≠ confirm password | Error: "New passwords do not match" |
| 9.6.6 | **Weak new password** | New password: `123` | Error: "Password not strong enough" |
| 9.6.7 | **Same password rejected** | New password = current password | Error: "New password must be different" |

### 9.7 Clubs / Organizers Listing Page [1 Mark]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.7.1 | All clubs listed | Navigate to `/clubs` | All approved organizers shown with Name, Category, Description |
| 9.7.2 | Follow / Unfollow | Click Follow/Unfollow button on a club | Toggles; state persists on refresh |

### 9.8 Organizer Detail Page (Participant View) [1 Mark]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.8.1 | Organizer info shown | Click on a club from listing | Name, Category, Description, Contact Email shown |
| 9.8.2 | Upcoming events shown | Organizer has upcoming events | Listed under "Upcoming" |
| 9.8.3 | Past events shown | Organizer has past events | Listed under "Past" |

---

## Section 10 — Organizer Features & Navigation [18 Marks]

### 10.1 Navigation Menu [1 Mark]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.1.1 | Club navbar items | Login as club | Navbar shows: Dashboard, Create Event, Profile, Logout, Ongoing Events |

### 10.2 Organizer Dashboard [3 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.2.1 | Events carousel | Club with events → dashboard | All events shown as cards with Name, Type, Status |
| 10.2.2 | Event status shown | Events in different states | Draft/Published/Ongoing/Closed status visible |
| 10.2.3 | Event analytics | Completed events exist | Stats: registrations, revenue, attendance |
| 10.2.4 | Click to event detail | Click an event card | Navigates to event detail page |

### 10.3 Event Detail Page (Organizer View) [4 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.3.1 | Overview section | View any event as organizer | Name, Type, Status, Dates, Eligibility, Pricing shown |
| 10.3.2 | Analytics section | Event with registrations | Registration count, revenue, attendance stats |
| 10.3.3 | Participants list | Event with registrations | List with Name, Email, Reg Date, Payment, Attendance |
| 10.3.4 | Search/Filter participants | Use search in participants list | Filters by name/email |
| 10.3.5 | Export CSV | Click export button | CSV file downloaded with participant data |

### 10.4 Event Creation & Editing [4 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.4.1 | Create draft event | Fill form → Save as Draft | Event created with status "draft", not visible to students |
| 10.4.2 | Publish event | Open draft → click Publish | Status changes to "published", visible to students |
| 10.4.3 | Edit published event (allowed) | Update description, extend deadline, increase limit | Changes saved |
| 10.4.4 | Edit published event (blocked) | Try changing event type or reducing limit | Blocked with error |
| 10.4.5 | Custom form builder | Add text, dropdown, checkbox fields | Fields saved; rendered on registration page |
| 10.4.6 | Form locked after first registration | Register for event → try editing form | Form editing disabled |

### 10.5 Organizer Profile Page [4 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.5.1 | Editable fields | Edit Name, Category, Description, Contact Email → Save | Saved |
| 10.5.2 | Login email non-editable | Email field shown but disabled | Cannot be modified |
| 10.5.3 | **Password Change** | Enter current password → new password → confirm → Change | "Password changed successfully!" |
| 10.5.4 | **Wrong current password** | Enter wrong current password | Error: "Current password is incorrect" |
| 10.5.5 | **Password Reset Request** | Click "Submit Reset Request" with reason | Status shows "pending" |
| 10.5.6 | **Pending status displayed** | After submitting reset request | Shows "⏳ Your password reset request is pending admin review" |

---

## Section 11 — Admin Features & Navigation [6 Marks]

### 11.1 Navigation Menu [1 Mark]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 11.1.1 | Admin navbar items | Login as admin | Navbar shows: Dashboard, Manage Clubs/Organizers, Password Reset Requests, Logout |

### 11.2 Club/Organizer Management [5 Marks]

#### Add New Club/Organizer
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 11.2.1 | Create club form | Go to `/admin/clubs` or admin dashboard | Form shows only: Organizer Name, Category, Description, Contact Email |
| 11.2.2 | Auto-generate credentials | Fill form → Create Club | Modal appears with auto-generated email + password |
| 11.2.3 | Credentials display | After creation | Email (format: `slug.timestamp@club.iiit.ac.in`) and 12-char random password shown |
| 11.2.4 | Copy credentials | Click "📋 Copy & Close" | Credentials copied to clipboard |
| 11.2.5 | New club can login | Use generated credentials at `/login` → select Club | Login succeeds, club dashboard shown |
| 11.2.6 | Email notification | After club creation | Console shows Ethereal URL with email to admin + club contact |
| 11.2.7 | Validation: missing fields | Leave organizer name blank → submit | Error message shown |
| 11.2.8 | Validation: invalid contact email | Enter `not-an-email` | Error: "Invalid contact email" |

#### Remove / Disable Club/Organizer
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 11.2.9 | Clubs list visible | Admin dashboard → existing clubs section | All clubs shown with Name, Category, Email, Status |
| 11.2.10 | Disable club | Click "Disable" on a club | Status changes to "Disabled" (red pill), club row appears dimmed |
| 11.2.11 | Disabled club blocked from login | Try logging in as disabled club | Error: "This account has been disabled" |
| 11.2.12 | Re-enable club | Click "Enable" on disabled club | Status changes to "Active" (green pill) |
| 11.2.13 | Re-enabled club can login | Login with club credentials | Login succeeds |
| 11.2.14 | Permanent delete | Click "Delete" → confirm dialog | Club permanently removed from list and DB |
| 11.2.15 | Delete confirmation dialog | Click "Delete" | Prompt: "Permanently remove club...? This cannot be undone." |

---

## Section 12 — Deployment [5 Marks]
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 12.1 | Frontend deployed | Check `deployment.txt` for frontend URL | URL loads the app |
| 12.2 | Backend deployed | Check `deployment.txt` for backend API URL | `GET /user/clubs` returns response |
| 12.3 | MongoDB Atlas | Backend connects to Atlas | No local MongoDB dependency |
| 12.4 | Environment variables | Backend uses env vars for secrets | No hardcoded secrets in code |

---

## Part 2 — Advanced Features [30 Marks]

### 13.2 Tier B: Organizer Password Reset Workflow [6 Marks]

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 13.2.1 | Club requests reset | Login as club → Profile → enter reason → Submit | Request submitted, status shows "pending" |
| 13.2.2 | Admin sees request | Login as admin → navigate to `/admin/password-resets` | Request listed with club name, date, reason, status "PENDING" |
| 13.2.3 | Admin can filter | Click "Pending" / "All" tabs | Filters correctly |
| 13.2.4 | Admin approves with comment | Enter comment → click "✅ Approve & Reset" | Modal shows new auto-generated password |
| 13.2.5 | New password works | Use the new password to login as that club | Login succeeds |
| 13.2.6 | Old password fails | Try old password | Error: "Incorrect password" |
| 13.2.7 | Admin rejects with comment | Click "❌ Reject" with comment | Status changes to "REJECTED" |
| 13.2.8 | Club sees rejection | Club Profile → password reset section | Shows "❌ Your last request was rejected. Reason: ..." |
| 13.2.9 | Club can re-request | After rejection, submit new reason | New request submitted (status: pending) |
| 13.2.10 | Request status tracking | Check statuses: pending → approved/rejected | History visible in "All" tab |
| 13.2.11 | Email notifications | On request/approve/reject | Console shows Ethereal preview URLs |
| 13.2.12 | Copy new password | Admin clicks "📋 Copy & Close" on approval modal | Password copied to clipboard |

---

## Cross-Cutting Concerns

### API Error Handling
| # | Test | Steps | Expected |
|---|------|-------|----------|
| CC.1 | Invalid MongoDB ID | `GET /user/profile/notanid` | 500 error, not crash |
| CC.2 | Unauthenticated API call | Any protected endpoint without token | 401 error |
| CC.3 | Wrong role API call | Student token → admin endpoint | 403 error |

### Frontend Error States
| # | Test | Steps | Expected |
|---|------|-------|----------|
| CC.4 | Network error | Stop backend → try any action in frontend | Error message shown (not white screen) |
| CC.5 | Invalid route | Navigate to `/some-random-path` | NotFound page shown |
| CC.6 | Unauthorized route | Student navigates to `/admin/clubs` | Unauthorized page shown |

---

## Quick Test Checklist (For Evaluation)

### 🔴 Critical Path Tests (Must Pass)
- [done] Student signup with OTP → login → dashboard → browse events → register → profile
- [done] Admin login → create club → credentials shown → club login works
- [done] Admin disable club → club login blocked → admin enable → club login works
- [done] Club login → create event → publish → visible to students
- [done] Student registers for event → appears in history
- [done] Password change works for students
- [done] Password change works for clubs
- [done] Club requests password reset → admin approves → new password works

### 🟡 Feature Tests
- [done] Search: fuzzy partial matching on event/organizer names
- [done] Trending: top 5 events by 24h registrations displayed
- [done] Filters: type, eligibility, date range, followed clubs — all work
- [done] Follow/Unfollow clubs from listing page
- [done] Profile edit: all editable fields save correctly
- [done] Non-editable fields (email, participant type) cannot be changed
- [done] Admin: clubs table shows disabled status correctly
- [done] JWT: all API calls include Bearer token
- [done] Passwords: all stored as bcrypt hashes

### 🟢 Edge Cases
- [done] Duplicate email registration blocked
- [done] Expired OTP rejected
- [ ] Event with past deadline blocks registration
- [ ] Empty forms show validation errors
- [done] Disabled club can be permanently deleted

---

## How to Test with cURL (Backend Only)

```bash
# 1. Admin login
curl -X POST http://localhost:8000/user/sysadmin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iiit.ac.in","password":"your-admin-password"}'
# → Save the token from response

# 2. Create club (admin)
curl -X POST http://localhost:8000/user/sysadmin/autocreateclub \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"organizer_name":"Test Club","category":"technical","description":"A test club","contact_email":"test@example.com"}'
# → Note the email + password from response

# 3. Club login
curl -X POST http://localhost:8000/user/club/login \
  -H "Content-Type: application/json" \
  -d '{"email":"THE_GENERATED_EMAIL","password":"THE_GENERATED_PASSWORD"}'

# 4. Disable club (admin)
curl -X PATCH http://localhost:8000/user/sysadmin/disableclub/CLUB_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 5. Try login as disabled club
curl -X POST http://localhost:8000/user/club/login \
  -H "Content-Type: application/json" \
  -d '{"email":"THE_GENERATED_EMAIL","password":"THE_GENERATED_PASSWORD"}'
# → Should return 403

# 6. Change password (student or club)
curl -X PATCH http://localhost:8000/user/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"currentPassword":"OldPass123!","newPassword":"NewPass456!"}'

# 7. Request password reset (club)
curl -X POST http://localhost:8000/user/club/request-password-reset \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CLUB_TOKEN" \
  -d '{"reason":"Forgot my password"}'

# 8. List password resets (admin)
curl http://localhost:8000/user/sysadmin/password-resets \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 9. Approve password reset (admin)
curl -X PATCH http://localhost:8000/user/sysadmin/password-resets/CLUB_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"adminComment":"Approved — share new password"}'

# 10. Get trending events
curl http://localhost:8000/api/events/trending
```

---

## Files Modified for Each Feature

| Feature | Backend Files | Frontend Files |
|---------|---------------|----------------|
| Password Change (students + clubs) | `controllers/usercontroller.js` (changePassword), `routes/user.js` | `services/api.js`, `pages/profile/StudentProfile.js`, `pages/profile/ClubProfile.js` |
| Password Reset Workflow (Tier B) | `models/usermodel.js`, `controllers/usercontroller.js` (request/list/approve/reject), `routes/user.js` | `services/api.js`, `pages/profile/ClubProfile.js`, `pages/dashboard/PasswordResets.js` |
| Admin Club Management | `controllers/usercontroller.js` (autoCreateClub/disable/enable), `routes/user.js` | `services/api.js`, `pages/dashboard/AdminDashboard.js` |
| Trending Events | `controllers/eventscontroller.js` (getTrendingEvents), `routes/events.js` | `services/api.js`, `pages/BrowseEvents.js`, `pages/BrowseEvents.css` |
| Disabled Club Login Block | `controllers/usercontroller.js` (loginclub), `models/usermodel.js` | — (backend only) |
