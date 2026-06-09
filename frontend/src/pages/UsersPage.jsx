import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { UserPlus, Search, Shield, UserCheck, UserX, Edit3 } from 'lucide-react';
import { format } from 'date-fns';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ studentId: '', fullName: '', email: '', password: '', role: 'student', department: '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      const { data } = await API.get(`/users?${params}`);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleSuspend = async (id, currentStatus) => {
    try {
      await API.patch(`/users/${id}/suspend`, { is_active: !currentStatus });
      toast.success(currentStatus ? 'User suspended' : 'User activated');
      fetchUsers();
    } catch { toast.error('Failed to update user'); }
  };

  const changeRole = async (id, role) => {
    try {
      await API.patch(`/users/${id}/role`, { role });
      toast.success('Role updated');
      fetchUsers();
    } catch { toast.error('Failed to update role'); }
  };

  const addUser = async (e) => {
    e.preventDefault();
    try {
      await API.post('/auth/register', form);
      toast.success('User created successfully');
      setShowAdd(false);
      setForm({ studentId: '', fullName: '', email: '', password: '', role: 'student', department: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            User Management
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} registered users</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus size={14} /> Add User
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
            New User Account
          </h3>
          <form onSubmit={addUser}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
              {[
                { key: 'studentId', label: 'Student ID', placeholder: 'NP2024001' },
                { key: 'fullName', label: 'Full Name', placeholder: 'John Doe' },
                { key: 'email', label: 'Email (optional)', placeholder: 'user@poly.ac.ke' },
                { key: 'password', label: 'Password', placeholder: 'Minimum 8 chars', type: 'password' },
                { key: 'department', label: 'Department', placeholder: 'ICT, Plumbing...' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    className="input" type={type || 'text'} placeholder={placeholder}
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={key !== 'email' && key !== 'department'}
                  />
                </div>
              ))}
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm">Create User</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} color="#775144" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Search name or ID..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['', 'student', 'staff', 'admin'].map(r => (
          <button key={r} className={`btn ${roleFilter === r ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setRoleFilter(r)}>
            {r || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Student ID</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email || '—'}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.student_id}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.department || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {u.last_login ? format(new Date(u.last_login), 'MMM d, HH:mm') : 'Never'}
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 6, padding: '3px 6px', fontSize: 11, cursor: 'pointer' }}
                          value={u.role}
                          onChange={e => changeRole(u.id, e.target.value)}
                        >
                          <option value="student">Student</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-ghost'}`}
                          onClick={() => toggleSuspend(u.id, u.is_active)}
                          title={u.is_active ? 'Suspend' : 'Activate'}
                        >
                          {u.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
