import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/events', label: 'Browse Events' },
    { to: '/clubs', label: 'Clubs / Organizers' },
    { to: '/profile', label: 'Profile' },
  ];

  const clubLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/events/create', label: 'Create Event' },
    { to: '/profile', label: 'Profile' },
    { to: '/events/ongoing', label: 'Ongoing Events' },
  ];

  const adminLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/admin/clubs', label: 'Manage Clubs' },
    { to: '/admin/password-resets', label: 'Password Resets' },
  ];

  let links = [];
  if (user.role === 'student') links = studentLinks;
  else if (user.role === 'club') links = clubLinks;
  else if (user.role === 'sysadmin') links = adminLinks;

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">Felicity EMS</Link>
      <ul className="navbar-links">
        {links.map((l) => (
          <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
        ))}
        <li>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </li>
      </ul>
    </nav>
  );
}
