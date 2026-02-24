# Frontend Architecture Blueprint

_Last updated: 15 Feb 2026_

## 🎯 Scope & Goals
- Rebuild the Felicity EMS frontend to match Assignment-1 constraints (role-based auth, protected dashboards, profile editing, onboarding preferences).
- Provide clear boundaries between routing, state, API calls, UI components, and feature pages so new features (dashboards, events, admin tools) can attach easily.
- Ship the first slice (login flows + student/club profile) while making it trivial to add dashboards, onboarding, registration, and Tiered advanced features later.

## 🧱 Tech Stack Choices
| Concern | Choice | Rationale |
| --- | --- | --- |
| Build tool | Create React App (react-scripts@5) | Matches earlier scaffolding, no new tooling to justify, integrates smoothly with existing configs. |
| Language | JavaScript (ES2022) | Keeps stack consistent with backend/CommonJS while staying approachable. |
| Routing | `react-router-dom@7` | Nested routing + loader/actions for future data APIs. |
| State/Auth | React Context + reducer + `useLocalStorage` helper | Lightweight, no external dependency, easy to extend to Zustand if complexity grows. |
| Styling | CSS Modules + `src/styles/tokens.css` | Deterministic class scoping, easy theming, zero runtime. |
| Forms | Native form elements + shared `<Field>` component + small validation helpers | Avoid large form libs until dynamic builder is required. |
| API | Thin wrapper around `fetch` with interceptors and role-aware headers | Centralizes base URL, error handling, and token refresh.

## 📁 Directory Layout
```
frontend/
└── src/
    ├── app/
    │   ├── router.jsx            # Route tree, lazy loaded feature bundles
    │   └── providers.jsx         # AuthProvider, QueryClientProvider, etc.
    ├── context/
    │   └── auth-context.jsx      # Auth state (user, role, token) + actions
    ├── hooks/
    │   ├── useAuth.js            # Convenience hook around context
    │   └── useApi.js             # Memoized API client with role injection
    ├── services/
    │   └── api-client.js         # Base fetch wrapper + endpoint helpers
    ├── components/
    │   ├── forms/
    │   │   ├── Field.jsx
    │   │   └── FormCard.jsx
    │   ├── layout/
    │   │   ├── AuthLayout.jsx
    │   │   └── DashboardShell.jsx
    │   └── feedback/
    │       └── Alert.jsx
    ├── pages/
    │   ├── auth/
    │   │   ├── LoginHub.jsx
    │   │   ├── StudentLogin.jsx
    │   │   ├── ClubLogin.jsx
    │   │   └── SysadminLogin.jsx
    │   ├── profile/
    │   │   ├── StudentProfile.jsx
    │   │   └── ClubProfile.jsx
    │   ├── onboarding/
    │   │   └── PreferencesWizard.jsx (future)
    │   ├── dashboard/
    │   │   ├── StudentDashboard.jsx (future)
    │   │   └── ClubDashboard.jsx (future)
    │   └── misc/
    │       ├── Landing.jsx
    │       └── NotFound.jsx
    ├── routes/
    │   ├── ProtectedRoute.jsx    # Role-aware guard
    │   └── RoleRedirect.jsx      # Redirects users to correct dashboard
    ├── styles/
    │   ├── tokens.css            # CSS variables (colors, spacing)
    │   └── globals.css           # Resets + typography + layout helpers
    └── main.jsx                  # Mounts providers + router
```

## 🔐 Authentication & Session Contract
- Tokens are issued by backend JWT endpoints (`/user/login`, `/user/club/login`, `/user/sysadmin/login`).
- `AuthContext` stores `{ token, role, email, metadata }` and persists to `localStorage` keys `felicity.auth.*`.
- `ProtectedRoute` checks context + required role(s); unauthenticated users are pushed to `/login` with location state fallback.
- Logout clears storage, resets API client cache.
- Future: add refresh-token flow + idle timeout using context reducer events.

## 🌐 API Layer Strategy
- `api-client.js` exports `request(path, { method, body, auth = true })` that attaches `Authorization: Bearer <token>` when `auth` is true.
- Endpoint helpers encapsulate paths & payload shapes so UI stays declarative:
  - `loginStudent`, `loginClub`, `loginSysadmin`
  - `fetchStudentProfile`, `updateStudentProfile`
  - `fetchClubProfile`, `updateClubProfile`
  - `sendOtp`, `verifyOtp`, `signupStudent` (future onboarding)
- Centralized error normalization returns `{ ok, data, error }` to keep components tiny and predictable.

## 🧩 UI & State Composition
- **Login Hub**: Tabbed cards for each role, shares `AuthForm` component and validators.
- **Profile pages**: Use `useEffect` + `useApi` to load profile on mount, feed data into controlled form fields, submit via PUT -> optimistic toast.
- **Navigation**: Minimal header that conditionally renders based on role; ready to expand to dashboards later.
- **Feedback**: `Alert` + inline field errors; `useAsync` helper handles loading/disabled states.

## 📐 Validation & Edge Cases
- Client-side validation mirrors backend rules: email format, password length, required OTP for signup (future), mobile phone pattern.
- Handle backend error messages gracefully (display inline + fallback toast).
- Guard against simultaneous submits and missing env vars (`VITE_API_BASE_URL`).

## 🧭 Rollout Stages
1. **Slice 1 (now)**: Implement auth context, login flows (student/club/sysadmin), profile pages with edit/save, layout & theming foundation.
2. **Slice 2**: Onboarding wizard + preferences editing within profile; follow/unfollow clubs UI.
3. **Slice 3**: Student dashboard (events list/history) + event browsing shell.
4. **Slice 4**: Organizer dashboard + event CRUD flows.
5. **Slice 5**: Admin console polish + Tiered advanced features.

## ✅ Acceptance Criteria for Slice 1
- All login roles functional and persisting session.
- Student & club profile pages fetch + update live data via protected APIs.
- Unauthenticated access to profile routes redirects to `/login`.
- Codebase structure matches layout above; lint/build succeeds.
- Documentation + TODO list updated so next contributors can continue confidently.
