#!/bin/bash
# Test PocketBase connection

echo "Testing PocketBase connection..."

HEALTH=$(curl -s http://127.0.0.1:8090/api/health)

if echo "$HEALTH" | grep -q "healthy"; then
    echo "PocketBase is running and healthy"
    exit 0
else
    echo "PocketBase is not responding correctly"
    echo "Response: $HEALTH"
    exit 1
fi
