#!/bin/bash
echo "Stopping Nyeri Polytechnic LAN services..."

# Stop by PID files
for pid_file in /tmp/polytechnic_backend.pid /tmp/polytechnic_watcher.pid; do
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        kill "$PID" 2>/dev/null && echo "✓ Stopped PID $PID"
        rm -f "$pid_file"
    fi
done

# Kill any remaining node processes on port 5000
fuser -k 5000/tcp 2>/dev/null && echo "✓ Port 5000 freed"

echo "System stopped."
