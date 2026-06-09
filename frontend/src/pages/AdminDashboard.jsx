import React, { useState, useEffect } from 'react';
import { API } from '../context/AuthContext';
import {
  Users, Files, ShieldAlert, Activity, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, logsRes, alertsRes] = await Promise.all([
          API.get('/audit/stats'),
          API.get('/audit/logs?limit=8'),
          API.get('/audit/security-alerts')
        ]);
        setStats(statsRes.data);
        setRecentLogs(logsRes.data.logs || []);
        setAlerts(alertsRes.data.alerts?.slice(0, 5) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const actionChartData = stats?.actionBreakdown
    ? Object.entries(stats.actionBreakdown).map(([action, count]) => ({ action, count }))
    : [];

  const actionColor = (action) => {
    if (action.startsWith('BLOCKED')) return '#f87171';
    if (action === 'UPLOAD') return '#C09891';
    if (action === 'DOWNLOAD') return '#60a5fa';
    if (action === 'DELETE') return '#fbbf24';
    return '#BEA8A7';
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <span className="spinner" />
    </div>
  );

  return (
    <div style={styles.page} className="fade-in">
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>System Overview</h1>
          <p style={styles.subtitle}>Real-time LAN activity and access control status</p>
        </div>
        <div style={styles.liveBadge}>
          <span style={styles.liveDot} />
          Live monitoring
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          icon={<Activity size={18} />}
          label="Events Today"
          value={stats?.todayEvents ?? 0}
          color="var(--accent)"
        />
        <StatCard
          icon={<ShieldAlert size={18} />}
          label="Blocked Attempts"
          value={stats?.blockedAttempts ?? 0}
          color="var(--danger)"
          alert={stats?.blockedAttempts > 0}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Uploads (30d)"
          value={stats?.actionBreakdown?.UPLOAD ?? 0}
          color="var(--info)"
        />
        <StatCard
          icon={<Eye size={18} />}
          label="Downloads (30d)"
          value={stats?.actionBreakdown?.DOWNLOAD ?? 0}
          color="var(--success)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Activity Chart */}
        <div className="card">
          <h3 style={styles.cardTitle}>Activity Breakdown (30 days)</h3>
          {actionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={actionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="action"
                  tick={{ fontSize: 10, fill: '#775144' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#775144' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1a1716',
                    border: '1px solid rgba(192,152,145,0.2)',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {actionChartData.map((entry, i) => (
                    <Cell key={i} fill={actionColor(entry.action)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No activity data yet</p>
            </div>
          )}
        </div>

        {/* Security Alerts */}
        <div className="card">
          <h3 style={styles.cardTitle}>
            <AlertTriangle size={14} color="var(--danger)" style={{ marginRight: 6 }} />
            Security Alerts
          </h3>
          {alerts.length === 0 ? (
            <div style={styles.noAlerts}>
              <CheckCircle size={28} color="var(--success)" />
              <p>No security incidents</p>
            </div>
          ) : (
            <div style={styles.alertList}>
              {alerts.map((alert) => (
                <div key={alert.id} style={styles.alertItem}>
                  <div style={styles.alertDot} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.alertName}>{alert.full_name}</div>
                    <div style={styles.alertAction}>{alert.action} — {alert.target_path}</div>
                  </div>
                  <div style={styles.alertTime}>
                    <Clock size={10} />
                    {format(new Date(alert.created_at), 'HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Audit Log */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={styles.cardTitle}>Recent Activity Log</h3>
          <a href="/dashboard/audit" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
            View all →
          </a>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Action</th>
                <th>Target</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {log.full_name}
                    </span>
                    <br />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {log.student_id}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${log.action.startsWith('BLOCKED') ? 'badge-danger' : 'badge-muted'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.target_path}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{log.ip_address}</td>
                  <td>
                    {log.success
                      ? <span className="badge badge-success">OK</span>
                      : <span className="badge badge-danger">BLOCKED</span>
                    }
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {format(new Date(log.created_at), 'MMM d, HH:mm')}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                    No activity yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, alert }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {alert && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 4, height: '100%',
          background: 'var(--danger)',
          borderRadius: '0 10px 10px 0',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: color + '18',
          border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '24px', maxWidth: 1200, margin: '0 auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  subtitle: { fontSize: 13, color: 'var(--text-muted)' },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    background: 'rgba(74, 222, 128, 0.08)',
    border: '1px solid rgba(74, 222, 128, 0.2)',
    borderRadius: 20,
    padding: '6px 12px',
    fontSize: 12,
    color: 'var(--success)',
    fontWeight: 500,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--success)',
    animation: 'pulse 2s infinite',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
  },
  noAlerts: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: '40px 0',
    color: 'var(--text-muted)',
    fontSize: 13,
  },
  alertList: { display: 'flex', flexDirection: 'column', gap: 10 },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'rgba(248, 113, 113, 0.05)',
    borderRadius: 8,
    border: '1px solid rgba(248, 113, 113, 0.15)',
  },
  alertDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--danger)',
    flexShrink: 0,
  },
  alertName: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' },
  alertAction: { fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  alertTime: { fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 },
};
