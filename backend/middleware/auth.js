const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../supabaseClient');

// Verify JWT token issued by our system
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data from DB
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, student_id, full_name, email, role, department, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access guard
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
};

// Admin only
const adminOnly = requireRole('admin', 'super_admin');

// Staff + Admin
const staffOrAdmin = requireRole('staff', 'admin', 'super_admin');

module.exports = { authenticate, requireRole, adminOnly, staffOrAdmin };
