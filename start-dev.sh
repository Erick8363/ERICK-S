#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# DEV MODE: Start backend + frontend with hot-reload
# Usage: ./start-dev.sh
# ═══════════════════════════════════════════════════════════════════════════════

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "🏫 Nyeri Polytechnic LAN — Dev Mode"
echo "──────────────────────────────────────"

# Create local dirs if /var not accessible
mkdir -p /tmp/polytechnic/{uploads,shared/{past_papers,videos,general},audit_logs}

# Update .env for local paths
if [ ! -w "/var/polytechnic" ]; then
    sed -i 's|/var/polytechnic/uploads|/tmp/polytechnic/uploads|g' "$BACKEND_DIR/.env"
    sed -i 's|/var/polytechnic/shared|/tmp/polytechnic/shared|g' "$BACKEND_DIR/.env"
    sed -i 's|/var/polytechnic/audit_logs|/tmp/polytechnic/audit_logs|g' "$BACKEND_DIR/.env"
fi

# Install if needed
[ ! -d "$BACKEND_DIR/node_modules" ] && (cd "$BACKEND_DIR" && npm install)
[ ! -d "$FRONTEND_DIR/node_modules" ] && (cd "$FRONTEND_DIR" && npm install)

# Start filesystem watcher (silent background)
bash "$PROJECT_DIR/scripts/filesystem_watcher.sh" &>/tmp/fs_watcher.log &
echo "✓ Filesystem watcher running (PID: $!)"

# Run backend + frontend in parallel
echo "✓ Starting backend on :5000"
echo "✓ Starting frontend on :3000"
echo ""
echo "  Admin:   http://localhost:3000  → Login: ADMIN001 / Admin@Poly2024"
echo "  Student: http://localhost:3000  → Login: student ID"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Kill background jobs on exit
trap 'kill $(jobs -p) 2>/dev/null; echo "Stopped."' EXIT

# Start both
(cd "$BACKEND_DIR" && npm start) &
(cd "$FRONTEND_DIR" && npm run dev) &

wait
