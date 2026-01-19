#!/bin/bash
# FastReader PocketBase startup script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting PocketBase for FastReader..."
echo "Admin UI: http://127.0.0.1:8090/_/"
echo "API: http://127.0.0.1:8090/api/"
echo ""
echo "Press Ctrl+C to stop"
echo ""

./pocketbase serve --http="127.0.0.1:8090"
