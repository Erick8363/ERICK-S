import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Files, Upload, Users, ScrollText,
  ShieldAlert, LogOut, Shield, BookOpen, Video, FolderOpen
} from 'lucide-react';

export default function Sidebar({ mobile, onClose }) {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const studentLinks = [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/resources', icon: BookOpen, label: 'Resources' },
    { to: '/student/videos', icon: Video, label: 'Learning Videos' },
    { to: '/student/upload', icon: Upload, label: 'Submit Assignment' },
    { to: '/student/my-files', icon: FolderOpen, label: 'My Uploads' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/files', icon: Files, label: 'File Manager' },
    { to: '/dashboard/users', icon: Users, label: 'User Management' },
    { to: '/dashboard/audit', icon: ScrollText, label: 'Audit Logs' },
    { to: '/dashboard/security', icon: ShieldAlert, label: 'Security Alerts' },
  ];

  const links = (isAdmin || isStaff) ? adminLinks : studentLinks;
  const roleColor = isAdmin ? 'var(--warning)' : isStaff ? 'var(--accent)' : 'var(--info)';

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <div style={styles.logoIcon}>
          <Shield size={20} color="#C09891" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={styles.logoTitle}>LAN Control</div>
          <div style={styles.logoSub}>Nyeri Polytechnic</div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* User chip */}
      <div style={styles.userChip}>
        <div style={{ ...styles.avatar, background: roleColor + '22', border: `1px solid ${roleColor}44` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: roleColor }}>
            {user?.fullName?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.userName}>{user?.fullName?.split(' ')[0]}</div>
          <div style={styles.userRole}>
            <span style={{ ...styles.roleDot, background: roleColor }} />
            {user?.role}
          </div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navSection}>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to.split('/').length === 2}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
              onClick={mobile ? onClose : undefined}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div style={styles.footer}>
        <div style={styles.divider} />
        <button style={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
        <div style={styles.version}>v1.0.0 · RBAC Enabled</div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 220,
    minWidth: 220,
    height: '100vh',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    overflow: 'hidden',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px 16px',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
  },
  logoSub: {
    fontSize: 10,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    margin: '0 16px',
  },
  userChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: 11,
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    textTransform: 'capitalize',
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 8px',
  },
  navSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 10px',
    borderRadius: 8,
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  navLinkActive: {
    background: 'rgba(192, 152, 145, 0.1)',
    color: 'var(--accent)',
    borderLeft: '2px solid var(--accent)',
    paddingLeft: 8,
  },
  footer: {
    padding: '0 0 16px',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 18px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: 13,
    fontWeight: 500,
    width: '100%',
    marginTop: 12,
    transition: 'color 0.15s',
  },
  version: {
    fontSize: 10,
    color: 'var(--text-muted)',
    padding: '4px 18px',
    opacity: 0.5,
  },
};
