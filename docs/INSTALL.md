# FastReader Comprehension - Installation Guide

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/ramtinJ95/FastReader.git
cd FastReader

# 2. Setup backend
cd fastreader-backend
./setup.sh
./pocketbase serve &

# 3. Add MCP server to your AI CLI
claude mcp add fastreader -- npx @anthropic/fastreader-mcp

# 4. Start FastReader (in another terminal)
cd ..
npm install
npm run dev

# 5. Open http://localhost:5173
```

## Component Installation

### PocketBase Backend

**Option A: Use setup script (recommended)**
```bash
cd fastreader-backend
./setup.sh
./pocketbase serve
```

**Option B: Manual installation**
```bash
# Download PocketBase from https://pocketbase.io/docs
# Extract to fastreader-backend/
./pocketbase migrate up
./pocketbase serve
```

The backend runs at `http://127.0.0.1:8090`. Admin UI at `http://127.0.0.1:8090/_/`.

### MCP Server

**For Claude Code:**
```bash
claude mcp add fastreader -- npx @anthropic/fastreader-mcp
```

**For other AI CLIs:**
```bash
npm install -g @anthropic/fastreader-mcp
# Then add "fastreader-mcp" to your CLI's MCP configuration
```

**Configuration (optional):**
```bash
export FASTREADER_API_URL="http://127.0.0.1:8090"
```

### Text Extractor (optional)

Download from [GitHub Releases](https://github.com/ramtinJ95/FastReader/releases):

```bash
# Linux/macOS
curl -L https://github.com/ramtinJ95/FastReader/releases/latest/download/fastreader-extract-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m) -o fastreader-extract
chmod +x fastreader-extract
sudo mv fastreader-extract /usr/local/bin/
```

## Verification

```bash
# Check PocketBase is running
curl http://127.0.0.1:8090/api/health

# Check MCP server works
claude mcp list  # Should show "fastreader"

# Check text extractor
fastreader-extract --version
```

## Troubleshooting

### "PocketBase is not running"
Start PocketBase: `cd fastreader-backend && ./pocketbase serve`

### "MCP server not found"
Re-add the server: `claude mcp add fastreader -- npx @anthropic/fastreader-mcp`

### SSE connection issues
1. Verify PocketBase is running
2. Check browser console for errors
3. Refresh the page

### "Cannot connect to backend"
1. Ensure PocketBase is running on port 8090
2. Check if another process is using port 8090: `lsof -i :8090`
3. Verify the `VITE_POCKETBASE_URL` environment variable is set correctly

### Migration errors
If migrations fail, try:
```bash
cd fastreader-backend
rm -rf pb_data  # Warning: this deletes all data
./setup.sh
```
