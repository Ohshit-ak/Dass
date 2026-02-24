const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function request(path, { method = 'GET', body, token, rawBody } = {}) {
  const headers = {};
  if (!rawBody) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: rawBody ? rawBody : (body ? JSON.stringify(body) : undefined),
  });

  // Handle CSV downloads
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) {
    const blob = await res.blob();
    return blob;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Auth ----------
export const loginStudent = (email, password) =>
  request('/user/login', { method: 'POST', body: { email, password } });

export const loginClub = (email, password) =>
  request('/user/club/login', { method: 'POST', body: { email, password } });

export const loginAdmin = (email, password) =>
  request('/user/sysadmin/login', { method: 'POST', body: { email, password } });

export const sendOtp = (email) =>
  request('/user/send-otp', { method: 'POST', body: { email } });

export const verifyOtp = (email, code) =>
  request('/user/verify-otp', { method: 'POST', body: { email, code } });

export const signupStudent = (payload) =>
  request('/user/signup', { method: 'POST', body: payload });

// ---------- Clubs list (public) ----------
export const fetchClubs = () => request('/user/clubs');

// ---------- Follow / Unfollow ----------
export const toggleFollow = (clubId, token) =>
  request('/user/follow', { method: 'POST', body: { clubId }, token });

export const getFollowing = (token) =>
  request('/user/following', { token });

// ---------- Profile ----------
export const getProfile = (id, token) =>
  request(`/user/profile/${id}`, { token });

export const updateStudentProfile = (id, fields, token) =>
  request(`/user/profile/student/${id}`, { method: 'PATCH', body: fields, token });

export const updateClubProfile = (id, fields, token) =>
  request(`/user/profile/club/${id}`, { method: 'PATCH', body: fields, token });

// ---------- Admin: club management ----------
export const createClub = (payload, token) =>
  request('/user/sysadmin/createclub', { method: 'POST', body: payload, token });

export const autoCreateClub = (payload, token) =>
  request('/user/sysadmin/autocreateclub', { method: 'POST', body: payload, token });

export const deleteClubApi = (id, token) =>
  request(`/user/sysadmin/deleteclub/${id}`, { method: 'DELETE', token });

export const disableClub = (id, token) =>
  request(`/user/sysadmin/disableclub/${id}`, { method: 'PATCH', token });

export const enableClub = (id, token) =>
  request(`/user/sysadmin/enableclub/${id}`, { method: 'PATCH', token });

// ---------- Admin: password reset management ----------
export const listPasswordResets = (token) =>
  request('/user/sysadmin/password-resets', { token });

export const approvePasswordReset = (id, comment, token) =>
  request(`/user/sysadmin/password-resets/${id}/approve`, {
    method: 'PATCH', body: { adminComment: comment }, token
  });

export const rejectPasswordReset = (id, comment, token) =>
  request(`/user/sysadmin/password-resets/${id}/reject`, {
    method: 'PATCH', body: { adminComment: comment }, token
  });

// ---------- Club: request password reset ----------
export const requestPasswordReset = (reason, token) =>
  request('/user/club/request-password-reset', { method: 'POST', body: { reason }, token });

// ---------- Change password (students & clubs) ----------
export const changePassword = (currentPassword, newPassword, token) =>
  request('/user/change-password', { method: 'PATCH', body: { currentPassword, newPassword }, token });

// ---------- Events ----------
export const getEvents = (params, token) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/events?${qs}`, { token });
};

export const getEventById = (id, token) =>
  request(`/api/events/${id}`, { token });

export const getOrganizerEvents = (organizerId, token) =>
  request(`/api/events/organizer/${organizerId}${token ? '?includeDrafts=true' : ''}`, { token });

export const getTrendingEvents = () =>
  request('/api/events/trending');

export const getUpcomingEvents = () =>
  request('/api/events/upcoming');

export const getEventAnalytics = (eventId, token) =>
  request(`/api/events/${eventId}/analytics`, { token });

export const createEvent = (payload, token) =>
  request('/api/events/create', { method: 'POST', body: payload, token });

export const updateEvent = (id, payload, token) =>
  request(`/api/events/${id}`, { method: 'PATCH', body: payload, token });

// ---------- Registrations ----------
export const registerForEvent = (payload, token) =>
  request('/api/registrations', { method: 'POST', body: payload, token });

export const getMyRegistrations = (token) =>
  request('/api/registrations/my-registrations', { token });

export const cancelRegistration = (registrationId, token) =>
  request(`/api/registrations/cancel/${registrationId}`, { method: 'PATCH', token });

export const getMyEventRegistration = (eventId, token) =>
  request(`/api/registrations/my-event/${eventId}`, { token });

// ---------- Payment Proof ----------
export const uploadPaymentProof = (registrationId, file, token) => {
  const formData = new FormData();
  formData.append('paymentProof', file);
  return request(`/api/registrations/payment-proof/${registrationId}`, {
    method: 'POST', rawBody: formData, token
  });
};

// ---------- Merchandise Orders (organizer) ----------
export const getMerchOrders = (params, token) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/registrations/merch-orders?${qs}`, { token });
};

export const approvePaymentOrder = (registrationId, comment, token) =>
  request(`/api/registrations/approve-payment/${registrationId}`, {
    method: 'PATCH', body: { comment }, token
  });

export const rejectPaymentOrder = (registrationId, comment, token) =>
  request(`/api/registrations/reject-payment/${registrationId}`, {
    method: 'PATCH', body: { comment }, token
  });

// ---------- Attendance / QR ----------
export const markAttendance = (ticketId, eventId, token) =>
  request('/api/registrations/mark-attendance', { method: 'POST', body: { ticketId, eventId }, token });

export const manualAttendance = (userId, eventId, reason, token) =>
  request('/api/registrations/manual-attendance', { method: 'POST', body: { userId, eventId, reason }, token });

export const getAttendanceDashboard = (eventId, token) =>
  request(`/api/registrations/attendance/${eventId}`, { token });

export const exportAttendanceCSV = (eventId, token) =>
  request(`/api/registrations/attendance/${eventId}/csv`, { token });

export const getEventRegistrations = (eventId, params, token) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/registrations/event/${eventId}?${qs}`, { token });
};

// ---------- Feedback ----------
export const submitFeedback = (eventId, rating, comment, token) =>
  request('/api/feedback', { method: 'POST', body: { eventId, rating, comment }, token });

export const getEventFeedback = (eventId) =>
  request(`/api/feedback/event/${eventId}`);

export const getMyFeedback = (eventId, token) =>
  request(`/api/feedback/my/${eventId}`, { token });

// ---------- Forum ----------
export const getForumMessages = (eventId) =>
  request(`/api/forum/${eventId}`);

export const postForumMessage = (eventId, content, parentId, isAnnouncement, token) =>
  request(`/api/forum/${eventId}`, { method: 'POST', body: { content, parentId, isAnnouncement }, token });

export const deleteForumMessage = (messageId, token) =>
  request(`/api/forum/message/${messageId}`, { method: 'DELETE', token });

export const togglePinMessage = (messageId, token) =>
  request(`/api/forum/message/${messageId}/pin`, { method: 'PATCH', token });

export const reactToMessage = (messageId, emoji, token) =>
  request(`/api/forum/message/${messageId}/react`, { method: 'POST', body: { emoji }, token });
