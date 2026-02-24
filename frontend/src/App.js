import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import ClubDashboard from './pages/dashboard/ClubDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import PasswordResets from './pages/dashboard/PasswordResets';
import StudentProfile from './pages/profile/StudentProfile';
import ClubProfile from './pages/profile/ClubProfile';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import BrowseEvents from './pages/BrowseEvents';
import EventDetails from './pages/EventDetails';
import ClubsList from './pages/ClubsList';
import OrganizerProfile from './pages/OrganizerProfile';
import CreateEvent from './pages/CreateEvent';

import './index.css';

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') return <StudentDashboard />;
  if (user.role === 'club') return <ClubDashboard />;
  if (user.role === 'sysadmin') return <AdminDashboard />;
  return <Navigate to="/login" replace />;
}

function ProfileRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') return <StudentProfile />;
  if (user.role === 'club') return <ClubProfile />;
  return <Navigate to="/dashboard" replace />;
}

function ConditionalNavbar() {
  const location = useLocation();
  const hideOn = ['/', '/login', '/signup'];
  if (hideOn.includes(location.pathname)) return null;
  return <Navbar />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ConditionalNavbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/dashboard" element={
            <ProtectedRoute roles={['student', 'club', 'sysadmin']}>
              <DashboardRouter />
            </ProtectedRoute>
          } />

          <Route path="/events" element={
            <ProtectedRoute roles={['student', 'sysadmin']}>
              <BrowseEvents />
            </ProtectedRoute>
          } />

          <Route path="/events/create" element={
            <ProtectedRoute roles={['club']}>
              <CreateEvent />
            </ProtectedRoute>
          } />

          <Route path="/events/ongoing" element={
            <ProtectedRoute roles={['club']}>
              <BrowseEvents />
            </ProtectedRoute>
          } />

          <Route path="/events/:id" element={
            <ProtectedRoute roles={['student', 'club', 'sysadmin']}>
              <EventDetails />
            </ProtectedRoute>
          } />

          <Route path="/clubs" element={
            <ProtectedRoute roles={['student', 'sysadmin']}>
              <ClubsList />
            </ProtectedRoute>
          } />

          <Route path="/organizer/:organizerId" element={
            <ProtectedRoute roles={['student', 'sysadmin']}>
              <OrganizerProfile />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute roles={['student', 'club']}>
              <ProfileRouter />
            </ProtectedRoute>
          } />

          <Route path="/admin/clubs" element={
            <ProtectedRoute roles={['sysadmin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/password-resets" element={
            <ProtectedRoute roles={['sysadmin']}>
              <PasswordResets />
            </ProtectedRoute>
          } />

          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
