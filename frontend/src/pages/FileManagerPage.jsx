import React, { useState, useEffect } from 'react';
import { API } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Upload, Trash2, CheckCircle, Search, File, Video, FileText, X } from 'lucide-react';
import { format } from 'date-fns';

export default function FileManagerPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: 'past_papers', department: 'ICT', description: '' });
  const [uploadFile, setUploadFile] = useState(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      // Admin sees all files including pending
      const { data } = await API.get(`/files/shared?${params}&limit=50`);
      setFiles(data.files || []);
    } catch (err) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, [search]);

  const approve = async (id) => {
    try {
      await API.post(`/files/${id}/approve`);
      toast.success('File approved');
      fetchFiles();
    } catch { toast.error('Failed to approve'); }
  };

  const deleteFile = async (id) => {
    if (!confirm('Delete this file?')) return;
    try {
      await API.delete(`/files/${id}`);
      toast.success('File deleted');
      fetchFiles();
    } catch { toast.error('Failed to delete'); }
  };

  const uploadShared = async (e) => {
    e.preventDefault();
    if (!uploadFile) return toast.error('Select a file');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('category', uploadForm.category);
      fd.append('department', uploadForm.department);
      fd.append('description', uploadForm.description);
      await API.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('File uploaded and published');
      setShowUpload(false);
      setUploadFile(null);
      fetchFiles();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getIcon = (mime) => {
    if (mime?.includes('pdf')) return <FileText size={16} color="#f87171" />;
    if (mime?.includes('video')) return <Video size={16} color="var(--accent)" />;
    return <File size={16} color="var(--text-muted)" />;
  };

  const fmtSize = (b) => {
    if (!b) return '—';
    return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            File Manager
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Manage shared resources and review student submissions
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(!showUpload)}>
          <Upload size={14} /> Upload Resource
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Upload Shared Resource
            </h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowUpload(false)}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={uploadShared}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">File</label>
                <input type="file" className="input" style={{ padding: '7px 10px' }}
                  onChange={e => setUploadFile(e.target.files[0])} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={uploadForm.category}
                  onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="past_papers">Past Papers</option>
                  <option value="videos">Learning Videos</option>
                  <option value="general">General Resources</option>
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <select className="input" value={uploadForm.department}
                  onChange={e => setUploadForm(f => ({ ...f, department: e.target.value }))}>
                  {['ICT', 'Plumbing', 'Electrical', 'Carpentry', 'Mechanical'].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Description</label>
              <input className="input" placeholder="Brief description..."
                value={uploadForm.description}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={uploading}>
              {uploading ? <><span className="spinner" /> Uploading...</> : <><Upload size={12} /> Publish Resource</>}
            </button>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <Search size={13} color="#775144" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
        <input className="input" style={{ paddingLeft: 32 }} placeholder="Search files..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* File Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Size</th>
                  <th>Downloads</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, background: 'var(--surface2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getIcon(f.mime_type)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{f.original_name}</div>
                          {f.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-muted">{f.category}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.department || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtSize(f.file_size)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{f.download_count || 0}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {format(new Date(f.created_at), 'MMM d, yyyy')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => approve(f.id)} title="Approve">
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteFile(f.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No files found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
