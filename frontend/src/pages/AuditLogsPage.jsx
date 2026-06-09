import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../context/AuthContext';
import { Search, Filter, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const ACTIONS = ['', 'LOGIN', 'UPLOAD', 'DOWNLOAD', 'DELETE', 'MOVE', 'VIEW',
  'BLOCKED_DELETE', 'BLOCKED_MOVE', 'BLOCKED_DOWNLOAD'];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    studentId: '',
    startDate: '',
    endDate: '',
    success: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const { data } = await API.get(`/audit/logs?${params}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const exportCSV = () => {
    const headers = ['Time', 'Student ID', 'Name', 'Action', 'Target', 'IP', 'Status'];
    const rows = logs.map(l => [
      l.created_at, l.student_id, l.full_name, l.action,
      l.target_path, l.ip_address, l.success ? 'OK' : 'BLOCKED'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `audit_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(total / 25);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Audit Log
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {total.toLocaleString()} total events — covert system monitoring
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <div>
            <label className="label">Student ID</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} color="#775144" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="input"
                style={{ paddingLeft: 32 }}
                placeholder="Search ID..."
                value={filters.studentId}
                onChange={e => setFilters(f => ({ ...f, studentId: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Action</label>
            <select className="input" value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
              {ACTIONS.map(a => <option key={a} value={a}>{a || 'All Actions'}</option>)}
            </select>
          </div>

          <div>
            <label className="label">From Date</label>
            <input type="date" className="input" value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>

          <div>
            <label className="label">To Date</label>
            <input type="date" className="input" value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>

          <div>
            <label className="label">Status</label>
            <select className="input" value={filters.success}
              onChange={e => setFilters(f => ({ ...f, success: e.target.value }))}>
              <option value="">All</option>
              <option value="true">Successful</option>
              <option value="false">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="spinner" />
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Action</th>
                  <th>Target Path</th>
                  <th>IP Address</th>
                  <th>Details</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={log.action.startsWith('BLOCKED') ? { background: 'rgba(248,113,113,0.03)' } : {}}>
                    <td style={{ fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      <Clock size={10} style={{ marginRight: 4 }} />
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-primary)' }}>
                        {log.full_name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {log.student_id}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${log.action.startsWith('BLOCKED') ? 'badge-danger' : getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
                      {log.target_path || '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.details || '—'}
                    </td>
                    <td>
                      {log.success
                        ? <CheckCircle size={14} color="var(--success)" />
                        : <AlertTriangle size={14} color="var(--danger)" />}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                      No logs found for this filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '5px 12px' }}>
              {page} / {totalPages}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getActionBadge(action) {
  switch (action) {
    case 'UPLOAD': return 'badge-staff';
    case 'DOWNLOAD': return 'badge-student';
    case 'DELETE': return 'badge-warning';
    case 'LOGIN': return 'badge-success';
    default: return 'badge-muted';
  }
}
