#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# NYERI POLYTECHNIC LAN ACCESS CONTROL SYSTEM
# Linux (Ubuntu) Install & Launch Script
# Run: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${WHITE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║    NYERI POLYTECHNIC — LAN ACCESS CONTROL SYSTEM          ║"
echo "║    RBAC + Covert Audit Logging │ Node.js + React          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Check requirements ───────────────────────────────────────────────────────
echo -e "${CYAN}[1/6] Checking system requirements...${NC}"

check_cmd() {
    if command -v "$1" &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $1 found"
    else
        echo -e "  ${RED}✗${NC} $1 not found"
        echo -e "  ${YELLOW}Install with: sudo apt-get install $2${NC}"
        if [ "$3" == "required" ]; then
            exit 1
        fi
    fi
}

check_cmd "node" "nodejs" "required"
check_cmd "npm" "npm" "required"
check_cmd "inotifywait" "inotify-tools" "optional"

NODE_VERSION=$(node -v | grep -oP '\d+' | head -1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}Node.js 16+ required. Current: $(node -v)${NC}"
    exit 1
fi

# ─── Create system directories ────────────────────────────────────────────────
echo -e "\n${CYAN}[2/6] Setting up system directories...${NC}"

DIRS=(
    "/var/polytechnic/uploads"
    "/var/polytechnic/shared/past_papers"
    "/var/polytechnic/shared/videos"
    "/var/polytechnic/shared/general"
    "/var/polytechnic/audit_logs"
    "/var/log"
)

for dir in "${DIRS[@]}"; do
    if sudo mkdir -p "$dir" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $dir"
    else
        # Fallback to /tmp if no sudo
        local_dir="/tmp${dir}"
        mkdir -p "$local_dir"
        echo -e "  ${YELLOW}⚠${NC} Created at $local_dir (no sudo)"
        # Update .env
        sed -i "s|$dir|$local_dir|g" "$BACKEND_DIR/.env" 2>/dev/null || true
    fi
done

# ─── Install dependencies ─────────────────────────────────────────────────────
echo -e "\n${CYAN}[3/6] Installing backend dependencies...${NC}"
cd "$BACKEND_DIR" && npm install --silent
echo -e "  ${GREEN}✓${NC} Backend packages installed"

echo -e "\n${CYAN}[4/6] Installing frontend dependencies...${NC}"
cd "$FRONTEND_DIR" && npm install --silent
echo -e "  ${GREEN}✓${NC} Frontend packages installed"

# ─── Build frontend ───────────────────────────────────────────────────────────
echo -e "\n${CYAN}[5/6] Building frontend...${NC}"
cd "$FRONTEND_DIR" && npm run build
echo -e "  ${GREEN}✓${NC} Frontend built to dist/"

# ─── Start services ───────────────────────────────────────────────────────────
echo -e "\n${CYAN}[6/6] Starting services...${NC}"

# Start filesystem watcher in background
chmod +x "$PROJECT_DIR/scripts/filesystem_watcher.sh"
nohup bash "$PROJECT_DIR/scripts/filesystem_watcher.sh" > /tmp/fs_watcher.log 2>&1 &
WATCHER_PID=$!
echo -e "  ${GREEN}✓${NC} Filesystem watcher started (PID: $WATCHER_PID)"
echo "$WATCHER_PID" > /tmp/polytechnic_watcher.pid

# Start backend
cd "$BACKEND_DIR"
nohup node server.js > /tmp/polytechnic_backend.log 2>&1 &
BACKEND_PID=$!
echo -e "  ${GREEN}✓${NC} Backend server started (PID: $BACKEND_PID)"
echo "$BACKEND_PID" > /tmp/polytechnic_backend.pid

sleep 2

# Check if backend started
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "\n${GREEN}════════════════════════════════════════${NC}"
    echo -e "${WHITE}  ✅ System Online${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "  📡 Backend API:   ${CYAN}http://localhost:5000${NC}"
    echo -e "  🌐 Web Interface: ${CYAN}http://localhost:5000${NC}"
    echo -e "  🔑 Admin Login:   ${YELLOW}ADMIN001 / Admin@Poly2024${NC}"
    echo -e "  📋 Audit Logs:    /var/polytechnic/audit_logs/"
    echo -e "  📄 Backend Log:   /tmp/polytechnic_backend.log"
    echo -e ""
    echo -e "  ${YELLOW}⚠ Change admin password on first login!${NC}"
    echo -e ""
    echo -e "  To stop:  ${RED}./stop.sh${NC}"
    echo -e "  To view logs: ${CYAN}tail -f /tmp/polytechnic_backend.log${NC}"
else
    echo -e "${RED}Backend failed to start. Check: cat /tmp/polytechnic_backend.log${NC}"
    exit 1
fi
