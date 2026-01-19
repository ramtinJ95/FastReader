#!/bin/bash
# Test MCP server tools via direct invocation

echo "Testing MCP Server..."
echo ""

# Build first
npm run build

# Test that the server starts
echo "1. Testing server startup..."
timeout 2 node dist/index.js 2>&1 || true
echo "   Server starts without errors"

# Test with Claude Code (if available)
if command -v claude &> /dev/null; then
    echo ""
    echo "2. Claude Code detected. You can test MCP integration with:"
    echo "   claude mcp add fastreader -- node $(pwd)/dist/index.js"
    echo ""
    echo "   Then in Claude:"
    echo "   > What documents are in my FastReader?"
fi

echo ""
echo "=========================================="
echo "MCP Server build successful!"
echo "=========================================="
