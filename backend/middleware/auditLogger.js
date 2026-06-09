const { supabaseAdmin } = require('../supabaseClient');
const fs = require('fs');
const path = require('path');
const os = require('os');

const AUDIT_LOG_DIR = process.env.AUDIT_LOG_DIR || '/var/polytechnic/audit_logs';

// Ensure audit log dir exists
const ensureAuditDir = () => {
  try {
    if (!fs.existsSync(AUDIT_LOG_DIR)) {
      fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true, mode: 0o750 });
    }
  } catch (e) {
    // Fallback to /tmp if /var not writable
    return path.join(os.tmpdir(), 'polytechnic_audit');
  }
  return AUDIT_LOG_DIR;
};

/**
 * Silent covert audit log - records ALL file system events.
 * Students are unaware this runs in the background.
 *
 * @param {object} options
 * @param {string} options.userId - Actor's user ID
 * @param {string} options.action - Action type: UPLOAD, DOWNLOAD, DELETE, MOVE, VIEW, LOGIN, LOGOUT
 * @param {string} options.targetPath - File or folder path affected
 * @param {string} options.ipAddress - Client IP
 * @param {string} options.details - Extra context
 * @param {boolean} options.success - Whether action succeeded
 */
const auditLog = async ({
  userId,
  studentId,
  fullName,
  action,
  targetPath,
  targetType = 'file',
  ipAddress,
  userAgent,
  details = '',
  success = true,
  fileSize = null,
  oldPath = null
}) => {
  const timestamp = new Date().toISOString();
  const hostname = os.hostname();

  // 1. Write to Supabase (primary audit store)
  try {
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId || null,
      student_id: studentId || 'UNKNOWN',
      full_name: fullName || 'Unknown User',
      action,
      target_path: targetPath,
      target_type: targetType,
      old_path: oldPath,
      ip_address: ipAddress,
      user_agent: userAgent,
      details,
      success,
      file_size: fileSize,
      hostname,
      created_at: timestamp
    });
  } catch (dbError) {
    // Silently fail DB write but still write to file
    console.error('[AUDIT-DB-ERROR]', dbError.message);
  }

  // 2. Write to local encrypted log file (backup + offline mode)
  try {
    const logDir = ensureAuditDir();
    const logFile = path.join(
      logDir,
      `audit_${new Date().toISOString().slice(0, 10)}.log`
    );

    const logEntry = JSON.stringify({
      timestamp,
      hostname,
      userId,
      studentId,
      fullName,
      action,
      targetPath,
      oldPath,
      targetType,
      ipAddress,
      success,
      fileSize,
      details
    }) + '\n';

    fs.appendFileSync(logFile, logEntry, { encoding: 'utf8', mode: 0o640 });
  } catch (fileError) {
    console.error('[AUDIT-FILE-ERROR]', fileError.message);
  }
};

// Pre-built action helpers
const audit = {
  upload: (user, req, filePath, fileSize) =>
    auditLog({
      userId: user.id,
      studentId: user.student_id,
      fullName: user.full_name,
      action: 'UPLOAD',
      targetPath: filePath,
      targetType: 'file',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      fileSize,
      success: true,
      details: `File uploaded by ${user.role}`
    }),

  download: (user, req, filePath) =>
    auditLog({
      userId: user.id,
      studentId: user.student_id,
      fullName: user.full_name,
      action: 'DOWNLOAD',
      targetPath: filePath,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      details: `File accessed for download`
    }),

  delete: (user, req, filePath, success = true) =>
    auditLog({
      userId: user.id,
      studentId: user.student_id,
      fullName: user.full_name,
      action: 'DELETE',
      targetPath: filePath,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success,
      details: success ? 'File deleted' : 'Delete attempt blocked - insufficient permissions'
    }),

  move: (user, req, oldPath, newPath) =>
    auditLog({
      userId: user.id,
      studentId: user.student_id,
      fullName: user.full_name,
      action: 'MOVE',
      targetPath: newPath,
      oldPath,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      details: `Moved from ${oldPath} to ${newPath}`
    }),

  view: (user, req, folderPath) =>
    auditLog({
      userId: user.id,
      studentId: user.student_id,
      fullName: user.full_name,
      action: 'VIEW',
      targetPath: folderPath,
      targetType: 'folder',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      details: 'Directory listing accessed'
    }),

  login: (user, req, success) =>
    auditLog({
      userId: user?.id || null,
      studentId: user?.student_id || 'UNKNOWN',
      fullName: user?.full_name || 'Unknown',
      action: 'LOGIN',
      targetPath: '/auth/login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success,
      details: success ? 'Successful login' : 'Failed login attempt'
    }),

  blockedAttempt: (user, req, action, targetPath) =>
    auditLog({
      userId: user.id,
      studentId: user.student_id,
      fullName: user.full_name,
      action: `BLOCKED_${action}`,
      targetPath,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
      details: `SECURITY: Attempted unauthorized ${action} - Role: ${user.role}`
    })
};

module.exports = { auditLog, audit };
