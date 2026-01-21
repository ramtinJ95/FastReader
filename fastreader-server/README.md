# FastReader Companion Server

A local companion server that spawns AI CLI tools (Claude, OpenCode, Aider) to generate comprehension questions for FastReader.

## Architecture

```
Frontend (React)  ──POST /api/generate──►  Companion Server (Hono)
     │                                            │
     │ SSE subscription                           │ spawn CLI
     │                                            ▼
     │                                     AI CLI Tool
     │                                     (claude/opencode/aider)
     │                                            │
     │                                            │ MCP tools
     │                                            ▼
     └──────────────────────────────────►  PocketBase
                questions arrive
                via SSE
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COMPANION_PORT` | Server port | `3001` |
| `MCP_CONFIG_PATH` | Path to MCP config file | `../.mcp.json` |

## API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-21T12:00:00.000Z",
  "version": "1.0.0"
}
```

### `POST /api/generate`

Generate comprehension questions using an AI CLI tool.

**Request Body:**
```json
{
  "sessionId": "string",
  "documentId": "string",
  "count": 5,
  "tool": "claude",
  "timeout": 120000
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sessionId` | string | Yes | - | FastReader session ID |
| `documentId` | string | Yes | - | Document ID |
| `count` | number | No | 5 | Number of questions (1-20) |
| `tool` | string | No | "claude" | CLI tool: "claude", "opencode", or "aider" |
| `timeout` | number | No | 120000 | Timeout in ms (10s-10min) |

**Success Response:**
```json
{
  "success": true,
  "message": "Question generation completed",
  "tool": "claude",
  "spawnId": "uuid"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "stderr": "CLI stderr output"
}
```

### `POST /api/generate/cancel/:id`

Cancel a running generation request.

**Parameters:**
- `id` - The `spawnId` returned from the generate endpoint

**Response:**
```json
{
  "success": true
}
```

## Supported CLI Tools

| Tool | Command | Notes |
|------|---------|-------|
| Claude | `claude -p "..." --mcp-config ...` | Uses MCP tools |
| OpenCode | `opencode run "..."` | - |
| Aider | `aider --message "..." --yes` | - |

## Security

- Only allowlisted CLI tools can be spawned
- Shell execution is disabled (`shell: false`)
- 2-minute default timeout prevents runaway processes
- CORS restricted to localhost origins
- Input validation via Zod schemas

## Development

```bash
# Run in watch mode
npm run dev

# Type check
npx tsc --noEmit
```

## License

MIT
