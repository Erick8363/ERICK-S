import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId || !password) return toast.error('Fill in all fields');
    setLoading(true);
    try {
      const user = await login(studentId, password);
      toast.success(`Welcome, ${user.fullName.split(' ')[0]}`);
      navigate(user.role === 'student' ? '/student' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Background geometry */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      <div style={styles.wrapper}>
        {/* Logo area */}
        <div style={styles.logo}>
          <div style={styles.iconRing}>
            <Shield size={28} color="#C09891" />
          </div>
          <div>
            <h1 style={styles.title}>LAN Access Control</h1>
            <p style={styles.subtitle}>Nyeri National Polytechnic</p>
          </div>
        </div>

        {/* Login card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sign in</h2>
          <p style={styles.cardSub}>Use your Student ID and password</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Student ID */}
            <div style={styles.field}>
              <label className="label">Student ID</label>
              <div style={styles.inputWrap}>
                <User size={15} color="#775144" style={styles.inputIcon} />
                <input
                  className="input"
                  style={{ paddingLeft: 38 }}
                  placeholder="e.g. NP2024001"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value.toUpperCase())}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.field}>
              <label className="label">Password</label>
              <div style={styles.inputWrap}>
                <Lock size={15} color="#775144" style={styles.inputIcon} />
                <input
                  className="input"
                  style={{ paddingLeft: 38, paddingRight: 40 }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <p style={styles.hint}>
            <Lock size={11} style={{ marginRight: 5 }} />
            All activity on this system is monitored and logged
          </p>
        </div>

        {/* Role legend */}
        <div style={styles.legend}>
          {[
            { role: 'Student', desc: 'Upload & Read access', icon: '📚' },
            { role: 'Staff', desc: 'Full content management', icon: '🎓' },
            { role: 'Admin', desc: 'System administration', icon: '🛡️' },
          ].map(({ role, desc, icon }) => (
            <div key={role} style={styles.legendItem}>
              <span>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{role}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--bg)',
    padding: '24px',
  },
  bgOrb1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(192,152,145,0.08) 0%, transparent 70%)',
    top: -200,
    right: -150,
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(119,81,68,0.06) 0%, transparent 70%)',
    bottom: -150,
    left: -100,
    pointerEvents: 'none',
  },
  wrapper: {
    width: '100%',
    maxWidth: 400,
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 32,
  },
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(192,152,145,0.15)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: 28,
    boxShadow: 'var(--shadow-lg)',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 24,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column' },
  inputWrap: { position: 'relative' },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: 2,
  },
  hint: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 20,
    textAlign: 'center',
    justifyContent: 'center',
  },
  legend: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginTop: 16,
  },
  legendItem: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '10px 12px',
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
};
