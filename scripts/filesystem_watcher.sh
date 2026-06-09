#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# POLYTECHNIC LAN - COVERT FILESYSTEM AUDIT WATCHER
# Uses inotifywait (Linux kernel inotify) to silently monitor ALL file events
# Runs as a background daemon - students are unaware this is running
# ═══════════════════════════════════════════════════════════════════════════════

WATCH_DIR="/var/polytechnic"
LOG_DIR="/var/polytechnic/audit_logs"
DAEMON_LOG="/var/log/polytechnic_watcher.log"
HOSTNAME=$(hostname)
DATE=$(date '+%Y-%m-%d')

# Ensure directories exist
mkdir -p "$LOG_DIR"
chmod 750 "$LOG_DIR"

# Check inotifywait is installed
if ! command -v inotifywait &> /dev/null; then
    echo "[WARN] inotifywait not found. Install with: sudo apt-get install inotify-tools"
    echo "[INFO] Falling back to manual polling mode..."

    # Polling fallback
    while true; do
        find "$WATCH_DIR" -newer "$LOG_DIR/.last_check" -type f 2>/dev/null | while read -r file; do
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"hostname\":\"$HOSTNAME\",\"event\":\"MODIFY\",\"path\":\"$file\",\"user\":\"$(stat -c '%U' "$file" 2>/dev/null)\"}" \
            >> "$LOG_DIR/fs_audit_$DATE.log"
        done
        touch "$LOG_DIR/.last_check"
        sleep 30
    done
    exit 0
fi

echo "[$(date)] Starting filesystem audit watcher on: $WATCH_DIR" >> "$DAEMON_LOG"

# ─── Main inotifywait monitoring loop ────────────────────────────────────────
# Events monitored:
# CREATE  - new file or directory created
# DELETE  - file or directory deleted (CRITICAL - replaces lost Plumbing Theory folder scenario)
# MOVED_FROM / MOVED_TO - file moved (CRITICAL - tracks movement)
# MODIFY  - file content changed
# ACCESS  - file accessed/read
# ATTRIB  - permissions changed

inotifywait \
    --monitor \
    --recursive \
    --format '{"timestamp":"%T","event":"%e","watched_path":"%w","filename":"%f","hostname":"'"$HOSTNAME"'"}' \
    --timefmt '%Y-%m-%dT%H:%M:%SZ' \
    --event create,delete,moved_from,moved_to,modify,attrib,access \
    --exclude '\.last_check|\.lock|\.tmp' \
    "$WATCH_DIR" \
2>> "$DAEMON_LOG" | \
while IFS= read -r event_line; do
    LOG_FILE="$LOG_DIR/fs_audit_$(date '+%Y-%m-%d').log"

    # Append to daily rotating log
    echo "$event_line" >> "$LOG_FILE"

    # Alert on critical events (DELETE and MOVE)
    EVENT_TYPE=$(echo "$event_line" | grep -oP '"event":"\K[^"]+')
    if [[ "$EVENT_TYPE" == *"DELETE"* ]] || [[ "$EVENT_TYPE" == *"MOVED"* ]]; then
        ALERT_LOG="$LOG_DIR/security_alerts.log"
        echo "[CRITICAL] $(date -u +%Y-%m-%dT%H:%M:%SZ) - $event_line" >> "$ALERT_LOG"
    fi
done

echo "[$(date)] Watcher stopped" >> "$DAEMON_LOG"
