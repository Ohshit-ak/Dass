# Change Log – Bug Fixes & Frontend Completion

## Summary

Comprehensive audit and fix of all backend bugs and frontend issues. Every inline `fetch()` call (using wrong port) was replaced with the centralized `api.js` service. Missing pages were created, dark theme was applied consistently, and all routes were wired up.

---

## Backend Fixes

### 1. `models/eventmodels.js` — Schema Crash Fix
**Bug:** `TypeError: Invalid schema configuration: 'Required' is not a valid type at path 'customForm.required'`

**Root Cause:** `customForm` and `merchandiseDetails` were defined as inline objects with `required: function() {...}` as a sibling property alongside `fields`/`variants`. Mongoose interpreted `required` as a nested schema path and `function` as an invalid type declaration.

**Fix:**
- Extracted four sub-schemas: `CustomFormFieldSchema`, `CustomFormSchema`, `MerchVariantSchema`, `MerchDetailsSchema` (all with `{ _id: false }`).
- Used `type: SubSchema` for `customForm` and `merchandiseDetails` fields.
- Moved `required` to be a top-level conditional function: `required: function() { return this.Event_type === 'normal'; }`.
- Fixed `this.type` → `this.Event_type` (wrong field reference in conditional).
- Removed unused `require('./usermodel')` import.

### 2. `controllers/usercontroller.js` — Missing Follow Endpoints
**Bug:** Routes in `routes/user.js` referenced `toggleFollowClub` and `getFollowedClubs`, but these functions were missing from the controller after a user revert.

**Fix:** Added both functions:
- `toggleFollowClub` – POST `/user/follow` – Toggles a club ID in/out of the student's `clubs_interests` array.
- `getFollowedClubs` – GET `/user/following` – Returns the list of club IDs the student follows.
- Updated `module.exports` to include both new functions.

### 3. `routes/events.js` — Route Ordering
**Bug:** `GET /:id` was declared before `GET /organizer/:organizerId`. Express matched `/organizer/abc123` against `/:id` first, treating `"organizer"` as an event ID, causing a 404 or cast error.

**Fix:** Reordered routes: `GET /organizer/:organizerId` now appears before `GET /:id`.

---

## Frontend Fixes

### 4. `services/api.js` — Centralized API Service (Complete Rewrite)
**Bug:** All 5 page components had inline `fetch()` calls to `http://localhost:4000`, but the backend runs on port `8000`. This meant every data-fetching operation silently failed.

**Fix:** Rewrote `api.js` with:
- `BASE` URL defaults to `http://localhost:8000` (configurable via `REACT_APP_API_URL`).
- Central `request()` helper that handles JSON headers, auth tokens, and error parsing.
- All API functions: `loginStudent`, `loginClub`, `loginAdmin`, `sendOtp`, `verifyOtp`, `signupStudent`, `fetchClubs`, `toggleFollow`, `getFollowing`, `getProfile`, `updateStudentProfile`, `updateClubProfile`, `createClub`, `deleteClubApi`, `getEvents`, `getEventById`, `getOrganizerEvents`, `createEvent`, `registerForEvent`, `getMyRegistrations`.

### 5. `pages/auth/Login.js` — Missing `_id` in Auth Context
**Bug:** On login, only `{ email, role, token }` was stored in auth context. Profile pages, dashboard, and follow features needed `user._id` — causing undefined errors.

**Fix:** Added `_id: data._id` to the `login()` call.

### 6. `pages/auth/Signup.js` — Missing `_id` in Auth Context
**Bug:** Same as Login — `_id` was not stored on signup.

**Fix:** Added `_id: data._id` to the `login()` call after successful signup.

### 7. `pages/dashboard/AdminDashboard.js` — Import Name Mismatch
**Bug:** Imported `deleteClub` from `api.js`, but the function was renamed to `deleteClubApi` to avoid naming conflicts.

**Fix:** Updated import and usage from `deleteClub` → `deleteClubApi`.

### 8. `pages/BrowseEvents.js` — Port 4000 & Missing Imports
**Bug:** Inline `fetch('http://localhost:4000/api/events?...')` — wrong port, no error handling, no loading state consistency.

**Fix:** Replaced with `getEvents()` from `api.js`. Added `useCallback` for stable `useEffect` dependency. Proper error state handling.

### 9. `pages/EventDetails.js` — Port 4000, No Custom Form, Broken Registration
**Bugs:**
- Inline fetch to wrong port for event details and registration.
- Custom form fields from normal events were never rendered — students couldn't fill required fields.
- Registration payload didn't include form responses.

**Fix:**
- Replaced all fetches with `getEventById()` and `registerForEvent()` from `api.js`.
- Added dynamic custom form rendering: iterates `event.customForm.fields` (sorted by `order`), renders appropriate input types (text, textarea, number, dropdown, checkbox).
- Tracks `formResponses` state and includes it in the registration payload.

### 10. `pages/ClubsList.js` — Port 4000 & Response Parsing Errors
**Bugs:**
- Inline fetch to wrong port.
- Response treated as array, but backend returns `{ clubs: [...] }` and `{ following: [...] }`.
- No link to organizer profile from club cards.

**Fix:**
- Replaced with `fetchClubs()` and `getFollowing()` from `api.js`.
- Fixed response parsing: `data.clubs || []`, `data.following || []`.
- Added `Link` to `/organizer/:id` for each club card name.

### 11. `pages/OrganizerProfile.js` — Port 4000
**Bug:** Inline fetch to wrong port for club profile and events.

**Fix:** Replaced with `fetchClubs()` and `getOrganizerEvents()` from `api.js`. Removed unused `useAuth` import.

### 12. `pages/dashboard/StudentDashboard.js` — Port 4000, No Navigation
**Bugs:**
- Inline fetch to wrong port for registrations.
- Greeted user as `user?.firstname` (undefined — backend returns `first_name`).
- Registration cards were static divs with no navigation to event details.

**Fix:**
- Replaced with `getMyRegistrations()` from `api.js`.
- Fixed greeting to use `user?.email`.
- Wrapped each registration card in `<Link to="/events/${id}">` for navigation.
- Added tabs: Upcoming / History / Merchandise with counts.

### 13. `pages/dashboard/ClubDashboard.js` — Was a Stub
**Bug:** ClubDashboard was just a placeholder div with "Club Dashboard coming soon".

**Fix:** Full implementation:
- Fetches organizer's events via `getOrganizerEvents(user._id)`.
- Analytics cards: Total Events, Total Attendance, Est. Revenue.
- Filter tabs: All / Draft / Published / Ongoing / Completed.
- Event cards with status pills and type icons.
- Link to `/events/create` for creating new events.

---

## New Files Created

### 14. `pages/CreateEvent.js` — Event Creation Page
Full event creation form for club organizers:
- Basic fields: name, description, type (normal/merchandise), venue, dates, fee, max attendance, tags.
- **Normal events:** Dynamic form builder — add/remove custom fields with types: text, textarea, number, dropdown, checkbox, file. Each field has label, required toggle, and options (for dropdowns).
- **Merchandise events:** Variant builder — add/remove variants with size, color, stock, price, purchase limit.
- Draft/Publish toggle via `Action` field.
- Submits via `createEvent()` from `api.js`.
- Redirects to dashboard on success.

### 15. `pages/CreateEvent.css` — Dark-Themed Styling
Matches the app's dark theme (`#0f0c29`, `#16213e`, `#e94560`).

---

## Route Changes (`App.js`)

### 16. New Routes Added
- `GET /events/create` → `<CreateEvent />` (protected: club only)
- `GET /events/ongoing` → `<BrowseEvents />` (protected: club only)

### 17. Role Access Widened
- `GET /events/:id` — Changed from `['student', 'sysadmin']` to `['student', 'club', 'sysadmin']` so organizers can view their own event details.

### 18. Route Ordering
- `/events/create` and `/events/ongoing` placed before `/events/:id` for correct matching.

---

## CSS Dark Theme Fixes

### 19. `pages/BrowseEvents.css`
- Changed from light theme (white bg, `#f8f9fa` filters, `#333` text) to dark theme.
- Container: `background: #0f0c29`, `color: #eee`.
- Filters section: `background: #16213e`, inputs: `background: #1a1a2e`, `border: #333`.
- Event cards: `background: #16213e`, `border: #222`, hover glow with accent color.
- Tags: `background: rgba(233,69,96,0.15)`, `color: #e94560`.

### 20. `pages/EventDetails.css`
- Changed from white background to `#16213e` surface.
- Meta info: `background: #1a1a2e`.
- Action section: `background: #1a1a2e`, `border: #333`.
- Badge: `background: #e94560`.
- Register button: `background: #e94560`.
- Error/success messages: semi-transparent dark backgrounds.
- Added custom form field styles (`.custom-form-section`, `.form-field`).

### 21. `pages/ClubsList.css`
- Changed from white cards to `background: #16213e`.
- Follow button: `border-color: #e94560`, `color: #e94560`.
- Category: `color: #e94560`.
- Added club name link styles with hover accent.

### 22. `pages/OrganizerProfile.css`
- Changed from white header/cards to dark theme.
- Category badge: `background: #e94560`.
- Section headings: `color: #e94560`.
- Past event cards: `opacity: 0.5`, `background: #111`.

### 23. `pages/dashboard/Dashboard.css` — New Classes Added
- `.tabs` — Flexbox row with pill-style buttons, active state with `#e94560`.
- `.analytics-row` / `.analytics-card` — Stat cards with large numbers.
- `.status-pill` — Colored pills for draft (yellow), published (blue), ongoing (green), completed (grey).
- `.events-carousel` — Grid layout for event cards in organizer dashboard.
- `.registrations-list` / `.reg-card` / `.reg-card-link` — Student registration card grid.
- `.create-event-link` — CTA button for event creation.
- `.no-data` — Empty state placeholder.

---

## Files Modified (Summary)

| File | Change Type |
|------|-------------|
| `backend/models/eventmodels.js` | Bug fix (schema crash) |
| `backend/controllers/usercontroller.js` | Added 2 functions |
| `backend/routes/events.js` | Route reorder |
| `frontend/src/services/api.js` | Complete rewrite |
| `frontend/src/pages/auth/Login.js` | Bug fix (_id) |
| `frontend/src/pages/auth/Signup.js` | Bug fix (_id) |
| `frontend/src/pages/dashboard/AdminDashboard.js` | Import fix |
| `frontend/src/pages/BrowseEvents.js` | Rewrite (api.js) |
| `frontend/src/pages/BrowseEvents.css` | Dark theme |
| `frontend/src/pages/EventDetails.js` | Rewrite (api.js + custom form) |
| `frontend/src/pages/EventDetails.css` | Dark theme + form styles |
| `frontend/src/pages/ClubsList.js` | Rewrite (api.js + response fix) |
| `frontend/src/pages/ClubsList.css` | Dark theme |
| `frontend/src/pages/OrganizerProfile.js` | Rewrite (api.js) |
| `frontend/src/pages/OrganizerProfile.css` | Dark theme |
| `frontend/src/pages/dashboard/StudentDashboard.js` | Rewrite (api.js + tabs) |
| `frontend/src/pages/dashboard/ClubDashboard.js` | Full implementation |
| `frontend/src/pages/dashboard/Dashboard.css` | Added 8+ new classes |
| `frontend/src/App.js` | New routes + role fix |
| `frontend/src/pages/CreateEvent.js` | **New file** |
| `frontend/src/pages/CreateEvent.css` | **New file** |
| `docs/change1.md` | **New file** (this doc) |
