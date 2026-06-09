const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../supabaseClient');
const { authenticate } = require('../middleware/auth');
const { audit } = require('../middleware/auditLogger');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId || !password) {
      return res.status(400).json({ error: 'Student ID and password required' });
    }

    // Fetch user by student_id
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('student_id', studentId.toUpperCase())
      .single();

    if (error || !user) {
      await audit.login({ student_id: studentId }, req, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account suspended. Contact admin.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      await audit.login(user, req, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    await audit.login(user, req, true);

    res.json({
      token,
      user: {
        id: user.id,
        studentId: user.student_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (err) {
    console.error('[AUTH-LOGIN]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register (admin only creates accounts)
router.post('/register', authenticate, async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins can register users' });
    }

    const { studentId, fullName, email, password, role, department } = req.body;

    if (!studentId || !fullName || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validRoles = ['student', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if student ID already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('student_id', studentId.toUpperCase())
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Student ID already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        student_id: studentId.toUpperCase(),
        full_name: fullName,
        email: email || null,
        password_hash: passwordHash,
        role,
        department: department || null,
        is_active: true,
        created_by: req.user.id
      })
      .select('id, student_id, full_name, email, role, department')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    res.status(201).json({ message: 'User created', user: newUser });
  } catch (err) {
    console.error('[AUTH-REGISTER]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await supabaseAdmin
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', req.user.id);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
