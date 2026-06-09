import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AuditLogsPage from './pages/AuditLogsPage';
import UsersPage from './pages/UsersPage';
import FileManagerPage from './pages/FileManagerPage';
import { StudentDashboard, ResourcesPage, UploadPage } from './pages/StudentPages';

// Protected layout with sidebar
function Layout() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <span className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}

// Admin-only guard
function AdminGuard() {
  const { user } = useAuth();
  if (!['admin', 'super_admin', 'staff'].includes(user?.role)) {
    return <Navigate to="/student" replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#231f1e',
              color: '#F4D6D5',
              border: '1px solid rgba(192,152,145,0.2)',
              borderRadius: 10,
              fontSize: 13,
            },
            success: { iconTheme: { primary: '#4ade80', secondary: '#231f1e' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#231f1e' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Student routes */}
          <Route element={<Layout />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/resources" element={<ResourcesPage />} />
            <Route path="/student/videos" element={<ResourcesPage />} />
            <Route path="/student/upload" element={<UploadPage />} />
            <Route path="/student/my-files" element={<StudentDashboard />} />

            {/* Admin/Staff routes */}
            <Route element={<AdminGuard />}>
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/dashboard/files" element={<FileManagerPage />} />
              <Route path="/dashboard/users" element={<UsersPage />} />
              <Route path="/dashboard/audit" element={<AuditLogsPage />} />
              <Route path="/dashboard/security" element={<AuditLogsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
