import React, { useState, useEffect } from 'react';
import { API, useAuth } from '../context/AuthContext';
import { BookOpen, Upload, FolderOpen, Download, Search, Filter, FileText, Video, File } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ─── Student Home ─────────────────────────────────────────────────────────────
export function StudentDashboard() {
  const { user } = useAuth();
  const [myFiles, setMyFiles] = useState([]);
  const [sharedCount, setSharedCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [myRes, sharedRes] = await Promise.all([
          API.get('/files/my-uploads'),
          API.get('/files/shared?limit=1'),
        ]);
        setMyFiles(myRes.data.files?.slice(0, 3) || []);
        setSharedCount(sharedRes.data.total || 0);
      } catch (err) {}
    };
    load();
  }, []);

  return (
    <div style={{ padding: 24 }} className="fade-in">
      {/* Welcome */}
      <div style={styles.welcome}>
        <div style={styles.welcomeText}>
          <h1 style={styles.h1}>Welcome, {user?.fullName?.split(' ')[0]} 👋</h1>
          <p style={styles.sub}>Access study materials and submit your assignments below.</p>
        </div>
        <div style={styles.accessBadge}>
          <span style={{ color: 'var(--info)', fontSize: 20 }}>📚</span>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ACCESS LEVEL</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Read + Upload (write-only)
            </div>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <QuickLink href="/student/resources" icon={<BookOpen size={18} />} label="Past Papers" desc="Exam papers by department" color="var(--info)" />
        <QuickLink href="/student/videos" icon={<Video size={18} />} label="Learning Videos" desc="Instructional content" color="var(--accent)" />
        <QuickLink href="/student/upload" icon={<Upload size={18} />} label="Submit Assignment" desc="Upload your coursework" color="var(--success)" />
      </div>

      {/* My recent uploads */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={styles.cardTitle}>My Recent Uploads</h3>
          <a href="/student/my-files" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
        </div>
        {myFiles.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={32} />
            <p>No uploads yet — submit your first assignment</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myFiles.map(f => (
              <div key={f.id} style={styles.fileRow}>
                <FileText size={15} color="var(--accent)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.original_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {format(new Date(f.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <span className={`badge ${f.status === 'approved' ? 'badge-success' : f.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Resource Browser ─────────────────────────────────────────────────────────
export function ResourcesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('past_papers');
  const [department, setDepartment] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category });
      if (search) params.append('search', search);
      if (department) params.append('department', department);
      const { data } = await API.get(`/files/shared?${params}`);
      setFiles(data.files || []);
    } catch (err) {
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, [category, department]);

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await API.get(`/files/download/${fileId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      toast.success('Download started');
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const getFileIcon = (mime) => {
    if (mime?.includes('pdf')) return <FileText size={18} color="#f87171" />;
    if (mime?.includes('video')) return <Video size={18} color="var(--accent)" />;
    return <File size={18} color="var(--text-muted)" />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ padding: 24 }} className="fade-in">
      <h1 style={styles.h1}>Resources</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Browse and download approved study materials
      </p>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} color="#775144" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="input" style={{ paddingLeft: 32 }}
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchFiles()}
          />
        </div>

        {[
          { value: 'past_papers', label: '📄 Past Papers' },
          { value: 'videos', label: '🎥 Videos' },
          { value: 'general', label: '📁 General' },
        ].map(({ value, label }) => (
          <button
            key={value}
            className={`btn ${category === value ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setCategory(value)}
          >
            {label}
          </button>
        ))}

        <select className="input" style={{ width: 160 }} value={department} onChange={e => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {['Plumbing', 'Electrical', 'ICT', 'Carpentry', 'Mechanical'].map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* File grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner" />
        </div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={40} />
          <p>No resources found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {files.map(file => (
            <div key={file.id} className="card" style={{ padding: 16, transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: 'var(--surface2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {getFileIcon(file.mime_type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.original_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {file.department || 'General'} · {formatSize(file.file_size)}
                  </div>
                </div>
              </div>
              {file.description && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  {file.description}
                </p>
              )}
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => handleDownload(file.id, file.original_name)}
              >
                <Download size={12} /> Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upload Assignment ────────────────────────────────────────────────────────
export function UploadPage() {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('assignment');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select a file first');
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('description', description);
      fd.append('category', category);
      fd.append('isAssignment', 'true');

      await API.post('/files/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      });

      toast.success('Assignment submitted! Awaiting staff review.');
      setFile(null);
      setDescription('');
      setProgress(0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600 }} className="fade-in">
      <h1 style={styles.h1}>Submit Assignment</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Upload your coursework for review by your instructor.
      </p>

      <div className="card">
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Drop zone */}
          <div
            style={{
              border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: 40,
              textAlign: 'center',
              background: file ? 'rgba(192,152,145,0.05)' : 'var(--surface2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0])}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.txt,.jpg,.png"
            />
            {file ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div>
                <Upload size={28} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Click to select file
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  PDF, Word, PowerPoint, ZIP, Images (max 100MB)
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="assignment">Assignment</option>
              <option value="project">Project</option>
              <option value="report">Report</option>
            </select>
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input"
              style={{ height: 80, resize: 'vertical' }}
              placeholder="Brief description of your submission..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {uploading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ justifyContent: 'center' }}
            disabled={!file || uploading}
          >
            {uploading ? <><span className="spinner" /> Uploading...</> : <><Upload size={14} /> Submit Assignment</>}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(251,191,36,0.06)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.15)' }}>
          <p style={{ fontSize: 11, color: 'var(--warning)' }}>
            ⚠️ You have write-only upload access. You cannot delete or move files after submission.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  h1: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 },
  sub: { fontSize: 13, color: 'var(--text-muted)' },
  welcome: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  welcomeText: {},
  accessBadge: { display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  fileRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8 },
};

function QuickLink({ href, icon, label, desc, color }) {
  return (
    <a href={href} style={{ ...styles2.quickLink, borderColor: color + '33' }}>
      <div style={{ ...styles2.quickIcon, background: color + '15', color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
      </div>
    </a>
  );
}

const styles2 = {
  quickLink: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--surface)', border: '1px solid',
    borderRadius: 12, padding: 16, textDecoration: 'none',
    transition: 'all 0.2s',
  },
  quickIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};
