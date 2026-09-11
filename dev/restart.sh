#!/bin/bash
# Restart the local dev server with a fresh fake database, then add sample entries.
cd "$(dirname "$0")/.."
[ -f dev/.pid ] && kill "$(cat dev/.pid)" 2>/dev/null
sleep 0.4
RESET=1 nohup node dev/server.mjs > dev/server.log 2>&1 &
echo $! > dev/.pid
sleep 1
python3 dev/seed.py
