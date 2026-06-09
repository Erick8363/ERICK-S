# 🏫 Nyeri Polytechnic LAN Access Control System

**RBAC File Access Management + Covert Audit Logging**  
*Designed for Nyeri National Polytechnic's Linux-based LAN*

---

## 🔒 What This Solves

| Problem | Solution Implemented |
|---|---|
| Students accidentally deleting files (e.g. entire Plumbing Theory folder) | **Write-only student upload** — students cannot delete or move ANY file |
| No accountability when files go missing | **Covert audit log** — every action silently recorded with student ID + IP |
| Unrestricted shared folder access | **RBAC** — 4 role tiers with enforced permissions |
| No way to identify who deleted a file | **inotifywait FS watcher** — OS-level event capture, runs invisibly |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   REACT FRONTEND (Vite)                  │
│  Login · Student Portal · Admin Dashboard · Audit Viewer │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────┐
│              EXPRESS.JS BACKEND (Node.js)                │
│  JWT Auth · RBAC Middleware · File Routes · Audit Routes  │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────┐         ┌────────▼──────────┐
│   SUPABASE   │         │  LOCAL FILESYSTEM  │
│   Postgres   │         │  /var/polytechnic/  │
│  audit_logs  │         │  uploads/ shared/  │
│  files, users│         │  audit_logs/*.log  │
└──────────────┘         └───────────────────┘
                                  ▲
                         ┌────────┴───────┐
                         │  inotifywait   │
                         │  FS Watcher    │
                         │  (background)  │
                         └────────────────┘
```

---

## 👤 Role Permissions

| Action | Student | Staff | Admin |
|--------|---------|-------|-------|
| List shared resources | ✅ | ✅ | ✅ |
| Download files | ✅ | ✅ | ✅ |
| Upload assignment | ✅ (write-only) | ✅ | ✅ |
| Upload shared resources | ❌ | ✅ | ✅ |
| Delete files | ❌ **BLOCKED+LOGGED** | Own only | ✅ |
| Move files | ❌ **BLOCKED+LOGGED** | ✅ | ✅ |
| View audit logs | ❌ Hidden | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

---

## 🚀 Quick Start (Ubuntu/Linux)

### Prerequisites
```bash
sudo apt-get update
sudo apt-get install -y nodejs npm inotify-tools
```

### 1. Clone and setup
```bash
git clone https://github.com/Erick8363/ERICK-S.git
cd ERICK-S
chmod +x setup.sh start-dev.sh stop.sh
```

### 2. Setup Supabase Database
1. Open Supabase dashboard → SQL Editor
2. Run the full contents of `docs/schema.sql`
3. This creates all tables + RLS policies + default admin account

### 3. Start the system
```bash
# Development (with hot-reload)
./start-dev.sh

# OR Production (built frontend served by Express)
./setup.sh
```

### 4. Access
- **Web UI**: http://localhost:3000 (dev) or http://localhost:5000 (prod)
- **Admin login**: `ADMIN001` / `Admin@Poly2024`  
  ⚠️ **Change this password immediately after first login!**

---

## 📁 Project Structure

```
├── backend/
│   ├── middleware/
│   │   ├── auth.js           # JWT + RBAC role guards
│   │   └── auditLogger.js    # Covert silent audit logger
│   ├── routes/
│   │   ├── auth.js           # Login, register, me
│   │   ├── files.js          # Upload, download, delete (RBAC)
│   │   ├── audit.js          # Admin-only audit log viewer
│   │   └── users.js          # User management
│   ├── server.js             # Express app entry point
│   └── supabaseClient.js     # Supabase admin + anon clients
│
├── frontend/src/
│   ├── pages/
│   │   ├── LoginPage.jsx       # Auth UI
│   │   ├── AdminDashboard.jsx  # Stats, charts, alerts
│   │   ├── AuditLogsPage.jsx   # Full audit log with filters
│   │   ├── UsersPage.jsx       # User management
│   │   ├── FileManagerPage.jsx # File operations for staff/admin
│   │   └── StudentPages.jsx    # Student portal (3 views)
│   ├── components/Sidebar.jsx  # Role-aware navigation
│   └── context/AuthContext.jsx # Global auth + axios
│
├── scripts/
│   └── filesystem_watcher.sh  # inotifywait OS-level monitor
│
├── docs/
│   └── schema.sql             # Full Supabase schema + RLS
│
├── setup.sh      # Full install + start (production)
├── start-dev.sh  # Dev mode with hot-reload
└── stop.sh       # Stop all services
```

---

## 🔍 Audit Log System

The audit system operates **covertly** — students see no indication it exists:

### Database Layer (Supabase)
- `audit_logs` table has RLS policy denying all direct student/staff access
- Only service role key (backend) can write/read it
- Records: user_id, student_id, full_name, action, target_path, ip_address, timestamp

### Filesystem Layer (inotifywait)
- Runs silently in background as daemon
- Captures OS-level events: `CREATE, DELETE, MOVED_FROM, MOVED_TO, MODIFY, ACCESS, ATTRIB`  
- Logs to daily rotating files: `/var/polytechnic/audit_logs/fs_audit_YYYY-MM-DD.log`
- Critical events (DELETE, MOVE) also written to `security_alerts.log`

### Admin View
- Dashboard shows blocked attempt count with red alert indicator
- Audit Logs page: full filterable table, exportable to CSV
- Filter by: action type, student ID, date range, success/blocked

---

## 🛡️ Security Features

- **Helmet.js** — HTTP security headers
- **Rate limiting** — 10 login attempts per 15 min, 200 API calls/min  
- **JWT** — 8-hour sessions, role embedded in token
- **Bcrypt** — passwords hashed with 12 salt rounds
- **Soft deletes** — files marked deleted, never permanently removed without admin
- **File type whitelist** — only PDF, video, Office, images, ZIP allowed
- **CORS** — restricted to LAN IP range in production

---

## 🔧 LAN Network Configuration

For deployment across the school network, update `backend/.env`:
```env
# Allow requests from your LAN subnet
CORS_ORIGIN=http://192.168.1.0/24
PORT=5000
```

Students on the LAN access the system via:
```
http://<server-ip>:5000
```

---

*Built by Mojowebs Digital Agency — Nairobi, Kenya*
