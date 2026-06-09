const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../supabaseClient');
const { authenticate, staffOrAdmin, adminOnly } = require('../middleware/auth');
const { audit } = require('../middleware/auditLogger');

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/polytechnic/uploads';
const SHARED_DIR = process.env.SHARED_DIR || '/tmp/polytechnic/shared';

// Ensure directories exist
[UPLOAD_DIR, SHARED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer config - store to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userUploadDir = path.join(UPLOAD_DIR, req.user.student_id);
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true, mode: 0o755 });
    }
    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${uuidv4().slice(0, 8)}`;
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(ext, '');
    cb(null, `${safeName}_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'video/mp4', 'video/mkv', 'video/mpeg', 'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/gif',
    'application/zip', 'application/x-zip-compressed',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/files/upload
// Students: write-only to their personal upload folder
// Staff/Admin: can upload to any shared folder
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { category, description, isAssignment } = req.body;
    const filePath = req.file.path;
    const fileSize = req.file.size;

    // Store file record in Supabase
    const { data: fileRecord, error } = await supabaseAdmin
      .from('files')
      .insert({
        original_name: req.file.originalname,
        stored_name: req.file.filename,
        file_path: filePath,
        file_size: fileSize,
        mime_type: req.file.mimetype,
        uploaded_by: req.user.id,
        uploader_student_id: req.user.student_id,
        category: category || 'assignment',
        description: description || null,
        is_assignment: isAssignment === 'true',
        is_shared: ['staff', 'admin', 'super_admin'].includes(req.user.role),
        status: req.user.role === 'student' ? 'pending_review' : 'approved'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // AUDIT: silently log this upload
    await audit.upload(req.user, req, filePath, fileSize);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileRecord.id,
        name: req.file.originalname,
        size: fileSize,
        category: fileRecord.category
      }
    });
  } catch (err) {
    console.error('[FILES-UPLOAD]', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/shared
// All authenticated users can LIST shared resources (read-only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/shared', authenticate, async (req, res) => {
  try {
    const { category, department, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('files')
      .select('id, original_name, file_size, mime_type, category, description, department, created_at, uploader_student_id')
      .eq('is_shared', true)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);
    if (department) query = query.eq('department', department);
    if (search) query = query.ilike('original_name', `%${search}%`);

    const { data: files, error, count } = await query;

    if (error) throw error;

    // Log the view action
    await audit.view(req.user, req, '/shared');

    res.json({ files, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[FILES-SHARED]', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/download/:id
// Students: read-only (download but cannot delete/move)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/download/:id', authenticate, async (req, res) => {
  try {
    const { data: file, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Students can only download approved shared files
    if (req.user.role === 'student' && (!file.is_shared || file.status !== 'approved')) {
      await audit.blockedAttempt(req.user, req, 'DOWNLOAD', file.file_path);
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // AUDIT: log every download
    await audit.download(req.user, req, file.file_path);

    // Increment download count
    await supabaseAdmin
      .from('files')
      .update({ download_count: (file.download_count || 0) + 1 })
      .eq('id', file.id);

    res.download(file.file_path, file.original_name);
  } catch (err) {
    console.error('[FILES-DOWNLOAD]', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/files/:id
// STUDENTS: BLOCKED - audit logs the attempt
// Staff/Admin only
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { data: file, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // RBAC: Students cannot delete ANY file - log and block
    if (req.user.role === 'student') {
      await audit.delete(req.user, req, file.file_path, false);
      await audit.blockedAttempt(req.user, req, 'DELETE', file.file_path);
      return res.status(403).json({
        error: 'Insufficient permissions. Students cannot delete files.'
      });
    }

    // Staff can only delete their own uploads
    if (req.user.role === 'staff' && file.uploaded_by !== req.user.id) {
      await audit.blockedAttempt(req.user, req, 'DELETE', file.file_path);
      return res.status(403).json({ error: 'You can only delete your own uploads' });
    }

    // Soft delete - mark as deleted, keep audit trail
    await supabaseAdmin
      .from('files')
      .update({ status: 'deleted', deleted_by: req.user.id, deleted_at: new Date().toISOString() })
      .eq('id', file.id);

    // Also remove from disk if admin
    if (['admin', 'super_admin'].includes(req.user.role) && fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }

    await audit.delete(req.user, req, file.file_path, true);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('[FILES-DELETE]', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/files/:id/move
// STUDENTS: BLOCKED - any move attempt is logged
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/move', authenticate, async (req, res) => {
  try {
    const { newCategory, newDepartment } = req.body;

    const { data: file } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!file) return res.status(404).json({ error: 'File not found' });

    if (req.user.role === 'student') {
      await audit.blockedAttempt(req.user, req, 'MOVE', file.file_path);
      return res.status(403).json({
        error: 'Students cannot move files'
      });
    }

    const oldPath = `${file.category}/${file.department}`;
    const newPath = `${newCategory}/${newDepartment}`;

    await supabaseAdmin
      .from('files')
      .update({ category: newCategory, department: newDepartment })
      .eq('id', file.id);

    await audit.move(req.user, req, oldPath, newPath);

    res.json({ message: 'File moved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Move failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/my-uploads (students see only their own)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-uploads', authenticate, async (req, res) => {
  try {
    const { data: files, error } = await supabaseAdmin
      .from('files')
      .select('id, original_name, file_size, category, status, created_at')
      .eq('uploaded_by', req.user.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/files/:id/approve (staff + admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/approve', authenticate, staffOrAdmin, async (req, res) => {
  try {
    await supabaseAdmin
      .from('files')
      .update({ status: 'approved', approved_by: req.user.id, approved_at: new Date().toISOString() })
      .eq('id', req.params.id);

    res.json({ message: 'File approved and made available to students' });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed' });
  }
});

module.exports = router;
