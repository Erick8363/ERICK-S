const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../supabaseClient');
const { authenticate, adminOnly, staffOrAdmin } = require('../middleware/auth');

// GET /api/users - Admin sees all users
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { role, department, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('users')
      .select('id, student_id, full_name, email, role, department, is_active, last_login, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (role) query = query.eq('role', role);
    if (department) query = query.eq('department', department);
    if (search) query = query.or(`full_name.ilike.%${search}%,student_id.ilike.%${search}%`);

    const { data: users, error, count } = await query;
    if (error) throw error;

    res.json({ users, total: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/users/:id/suspend
router.patch('/:id/suspend', authenticate, adminOnly, async (req, res) => {
  try {
    const { is_active } = req.body;
    await supabaseAdmin
      .from('users')
      .update({ is_active })
      .eq('id', req.params.id);

    res.json({ message: `User ${is_active ? 'activated' : 'suspended'}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// PATCH /api/users/:id/role
router.patch('/:id/role', authenticate, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['student', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', req.params.id);

    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    // Soft delete
    await supabaseAdmin
      .from('users')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', req.params.id);

    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/users/bulk-import (CSV style batch create)
router.post('/bulk-import', authenticate, adminOnly, async (req, res) => {
  try {
    const { users } = req.body; // Array of user objects

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Users array required' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (const u of users) {
      try {
        const passwordHash = await bcrypt.hash(u.password || u.student_id, 12);
        await supabaseAdmin.from('users').insert({
          student_id: u.studentId?.toUpperCase(),
          full_name: u.fullName,
          email: u.email || null,
          password_hash: passwordHash,
          role: u.role || 'student',
          department: u.department || null,
          is_active: true,
          created_by: req.user.id
        });
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ studentId: u.studentId, error: e.message });
      }
    }

    res.json({ message: 'Bulk import complete', results });
  } catch (err) {
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

module.exports = router;
