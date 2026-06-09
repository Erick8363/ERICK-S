const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/audit/logs - Admin sees all logs with filters
router.get('/logs', authenticate, adminOnly, async (req, res) => {
  try {
    const {
      action,
      studentId,
      startDate,
      endDate,
      success,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (action) query = query.eq('action', action);
    if (studentId) query = query.ilike('student_id', `%${studentId}%`);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (success !== undefined) query = query.eq('success', success === 'true');

    const { data: logs, error, count } = await query;

    if (error) throw error;

    res.json({ logs, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[AUDIT-LOGS]', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/audit/stats - Dashboard statistics
router.get('/stats', authenticate, adminOnly, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total events today
    const { count: todayCount } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Blocked attempts
    const { count: blockedCount } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .like('action', 'BLOCKED_%');

    // Most active students
    const { data: activeStudents } = await supabaseAdmin
      .from('audit_logs')
      .select('student_id, full_name')
      .not('student_id', 'eq', 'UNKNOWN')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Action breakdown
    const { data: actionStats } = await supabaseAdmin
      .from('audit_logs')
      .select('action')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Count actions
    const actionBreakdown = {};
    actionStats?.forEach(({ action }) => {
      actionBreakdown[action] = (actionBreakdown[action] || 0) + 1;
    });

    res.json({
      todayEvents: todayCount || 0,
      blockedAttempts: blockedCount || 0,
      actionBreakdown,
      period: '30 days'
    });
  } catch (err) {
    console.error('[AUDIT-STATS]', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/audit/user/:studentId - Deep-dive on specific student
router.get('/user/:studentId', authenticate, adminOnly, async (req, res) => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('student_id', req.params.studentId.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user audit trail' });
  }
});

// GET /api/audit/security-alerts
router.get('/security-alerts', authenticate, adminOnly, async (req, res) => {
  try {
    const { data: alerts, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .like('action', 'BLOCKED_%')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch security alerts' });
  }
});

module.exports = router;
