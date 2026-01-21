# Implementation Plan: FastReader Companion Server

## Overview

Add a local companion server (`fastreader-server/`) that receives HTTP requests from the frontend and spawns AI CLI tools (Claude, OpenCode, etc.) to generate comprehension questions. Questions flow back to the frontend via the existing PocketBase SSE subscription.

## Architecture

```
┌─────────────────┐     POST /api/generate     ┌─────────────────────┐
│   Frontend      │ ─────────────────────────► │  Companion Server   │
│   (React)       │                            │  (Hono + Node.js)   │
│   Port 5173     │                            │  Port 3001          │
└────────┬────────┘                            └──────────┬──────────┘
         │                                                │
         │ SSE subscription                               │ spawn CLI
         │                                                ▼
         │                                     ┌─────────────────────┐
         │                                     │  AI CLI Tool        │
         │                                     │  (claude/opencode)  │
         │                                     └──────────┬──────────┘
         │                                                │
         │                                                │ MCP tools
         │                                                ▼
         │                                     ┌─────────────────────┐
         └────────────────────────────────────►│  PocketBase         │
                    questions arrive           │  Port 8090          │
                    via SSE                    └─────────────────────┘
```

## Data Flow

1. User clicks "Quiz" button in UI
2. Frontend calls `POST http://localhost:3001/api/generate` with `{ sessionId, documentId, count, cliTool }`
3. Companion server spawns the configured CLI tool (e.g., `claude -p "..." --mcp-config ...`)
4. CLI tool uses MCP tools to:
   - Call `fastreader_get_current_session` to get document content
   - Call `fastreader_get_question_history` to avoid duplicates
   - Call `fastreader_save_questions` to persist questions
5. Questions saved to PocketBase `questions` collection
6. Frontend receives questions via existing SSE subscription
7. Quiz modal displays questions

---

## Implementation Steps

### Step 1: Create fastreader-server package ✅ COMPLETED

Create new directory structure:

```
fastreader-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Entry point, Hono server setup
│   ├── routes/
│   │   ├── generate.ts       # POST /api/generate endpoint
│   │   └── health.ts         # GET /health endpoint
│   ├── services/
│   │   ├── cli-spawner.ts    # Generic CLI spawning logic
│   │   └── prompt-builder.ts # Build prompts for different CLI tools
│   └── types.ts              # TypeScript interfaces
└── README.md
```

**package.json:**
```json
{
  "name": "fastreader-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "@hono/node-server": "^1.13.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "tsx": "^4.19.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Step 2: Implement the Hono server (src/index.ts) ✅ COMPLETED

```typescript
import { serve, ServerType } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { generateRoute } from './routes/generate.js'
import { healthRoute } from './routes/health.js'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('/api/*', cors({
  origin: (origin) => {
    // Allow any localhost origin
    if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return origin
    }
    return null
  },
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}))

// Routes
app.route('/health', healthRoute)
app.route('/api', generateRoute)

// Error handling
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ error: err.message || 'Internal server error' }, 500)
})

// Server setup with graceful shutdown
const PORT = Number(process.env.COMPANION_PORT) || 3001
let server: ServerType

const startServer = () => {
  server = serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`Companion server running at http://localhost:${info.port}`)
  })
}

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down...`)
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.once('SIGTERM', () => shutdown('SIGTERM'))
process.once('SIGINT', () => shutdown('SIGINT'))

startServer()
```

---

### Step 3: Implement CLI spawner service (src/services/cli-spawner.ts) ✅ COMPLETED

```typescript
import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'

export type CLITool = 'claude' | 'opencode' | 'aider'

export interface SpawnOptions {
  tool: CLITool
  prompt: string
  mcpConfigPath: string
  timeout?: number // ms, default 120000 (2 min)
  workingDir?: string
  onStdout?: (data: string) => void
  onStderr?: (data: string) => void
}

export interface SpawnResult {
  success: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  error?: string
}

const ALLOWED_TOOLS: CLITool[] = ['claude', 'opencode', 'aider']
const DEFAULT_TIMEOUT = 120000 // 2 minutes

export class CLISpawner extends EventEmitter {
  private activeProcesses: Map<string, ChildProcess> = new Map()

  async spawn(id: string, options: SpawnOptions): Promise<SpawnResult> {
    // Validate tool
    if (!ALLOWED_TOOLS.includes(options.tool)) {
      return {
        success: false,
        exitCode: null,
        stdout: '',
        stderr: '',
        error: `Tool not allowed: ${options.tool}`,
      }
    }

    const { command, args } = this.buildCommand(options)
    const timeout = options.timeout ?? DEFAULT_TIMEOUT

    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: options.workingDir || process.cwd(),
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false, // Security: no shell interpretation
      })

      this.activeProcesses.set(id, child)

      let stdout = ''
      let stderr = ''

      // Timeout handling
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        setTimeout(() => {
          if (!child.killed) child.kill('SIGKILL')
        }, 5000)
      }, timeout)

      child.stdout?.on('data', (data) => {
        const text = data.toString()
        stdout += text
        options.onStdout?.(text)
        this.emit('stdout', { id, data: text })
      })

      child.stderr?.on('data', (data) => {
        const text = data.toString()
        stderr += text
        options.onStderr?.(text)
        this.emit('stderr', { id, data: text })
      })

      child.on('error', (err) => {
        clearTimeout(timeoutId)
        this.activeProcesses.delete(id)
        resolve({
          success: false,
          exitCode: null,
          stdout,
          stderr,
          error: err.message,
        })
      })

      child.on('close', (code) => {
        clearTimeout(timeoutId)
        this.activeProcesses.delete(id)
        resolve({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
        })
      })
    })
  }

  private buildCommand(options: SpawnOptions): { command: string; args: string[] } {
    switch (options.tool) {
      case 'claude':
        return {
          command: 'claude',
          args: [
            '-p', options.prompt,
            '--mcp-config', options.mcpConfigPath,
            '--allowedTools', 'mcp__fastreader__*',
            '--output-format', 'text',
          ],
        }

      case 'opencode':
        return {
          command: 'opencode',
          args: ['run', options.prompt],
        }

      case 'aider':
        return {
          command: 'aider',
          args: ['--message', options.prompt, '--yes'],
        }

      default:
        throw new Error(`Unknown tool: ${options.tool}`)
    }
  }

  cancel(id: string): boolean {
    const child = this.activeProcesses.get(id)
    if (!child) return false

    child.kill('SIGTERM')
    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL')
    }, 5000)

    return true
  }

  cancelAll(): void {
    for (const [id] of this.activeProcesses) {
      this.cancel(id)
    }
  }
}

// Singleton
export const cliSpawner = new CLISpawner()

// Cleanup on process exit
process.on('SIGTERM', () => cliSpawner.cancelAll())
process.on('SIGINT', () => cliSpawner.cancelAll())
```

---

### Step 4: Implement prompt builder (src/services/prompt-builder.ts) ✅ COMPLETED

```typescript
export interface PromptOptions {
  sessionId: string
  documentId: string
  count: number
}

export function buildQuestionGenerationPrompt(options: PromptOptions): string {
  return `Generate ${options.count} comprehension questions for my current FastReader session.

Instructions:
1. Use the fastreader_get_current_session tool to get the document content and reading progress
2. Use fastreader_get_question_history tool to see existing questions and avoid duplicates
3. Generate ${options.count} NEW questions that are different from existing ones
4. Save the questions using fastreader_save_questions tool with documentId: "${options.documentId}"

Question requirements:
- Include a mix of question types: multiple_choice, short_answer, and fill_in_blank
- Include different comprehension types: factual_recall, inference, and synthesis
- Vary difficulty levels: easy, medium, and hard
- For multiple choice, provide 4 options (A, B, C, D)
- Include rationale explaining why the answer is correct

IMPORTANT: You must call fastreader_save_questions to save the generated questions. Do not just output them as text.`
}
```

---

### Step 5: Implement generate endpoint (src/routes/generate.ts) ✅ COMPLETED

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { cliSpawner, CLITool } from '../services/cli-spawner.js'
import { buildQuestionGenerationPrompt } from '../services/prompt-builder.js'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const generateRoute = new Hono()

const generateSchema = z.object({
  sessionId: z.string().min(1),
  documentId: z.string().min(1),
  count: z.number().int().min(1).max(20).default(5),
  tool: z.enum(['claude', 'opencode', 'aider']).default('claude'),
  timeout: z.number().int().min(10000).max(600000).optional(),
})

generateRoute.post('/generate', async (c) => {
  // Parse and validate request body
  let body: z.infer<typeof generateSchema>
  try {
    const raw = await c.req.json()
    body = generateSchema.parse(raw)
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof z.ZodError ? err.errors : 'Invalid request body'
    }, 400)
  }

  const { sessionId, documentId, count, tool, timeout } = body

  // Build the prompt
  const prompt = buildQuestionGenerationPrompt({ sessionId, documentId, count })

  // Path to MCP config (relative to project root)
  const mcpConfigPath = path.resolve(process.cwd(), '..', '.mcp.json')

  // Spawn the CLI
  const spawnId = randomUUID()

  console.log(`[${spawnId}] Starting ${tool} for session ${sessionId}`)

  const result = await cliSpawner.spawn(spawnId, {
    tool: tool as CLITool,
    prompt,
    mcpConfigPath,
    timeout,
    workingDir: path.resolve(process.cwd(), '..'), // Project root
    onStdout: (data) => console.log(`[${spawnId}] stdout:`, data.trim()),
    onStderr: (data) => console.error(`[${spawnId}] stderr:`, data.trim()),
  })

  if (result.success) {
    console.log(`[${spawnId}] Completed successfully`)
    return c.json({
      success: true,
      message: 'Question generation completed',
      tool,
    })
  } else {
    console.error(`[${spawnId}] Failed:`, result.error || result.stderr)
    return c.json({
      success: false,
      error: result.error || 'CLI execution failed',
      stderr: result.stderr,
    }, 500)
  }
})

// Cancel endpoint for long-running generations
generateRoute.post('/generate/cancel/:id', async (c) => {
  const id = c.req.param('id')
  const cancelled = cliSpawner.cancel(id)
  return c.json({ success: cancelled })
})

export { generateRoute }
```

---

### Step 6: Implement health endpoint (src/routes/health.ts) ✅ COMPLETED

```typescript
import { Hono } from 'hono'

const healthRoute = new Hono()

healthRoute.get('/', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

export { healthRoute }
```

---

### Step 7: Update Makefile ✅ COMPLETED

Add companion server targets:

```makefile
# Add to existing variables
COMPANION_PORT ?= 3001

# Add new targets
## Start companion server in foreground
companion:
	@echo "$(GREEN)Starting companion server on http://127.0.0.1:$(COMPANION_PORT)$(NC)"
	cd "$(CURDIR)/fastreader-server" && npm run dev

## Start companion server in background
companion-bg:
	@if lsof -i:$(COMPANION_PORT) > /dev/null 2>&1; then \
		echo "$(YELLOW)Companion server already running on port $(COMPANION_PORT)$(NC)"; \
	else \
		echo "$(GREEN)Starting companion server on http://127.0.0.1:$(COMPANION_PORT)$(NC)"; \
		mkdir -p "$(CURDIR)/logs"; \
		cd "$(CURDIR)/fastreader-server" && npm run dev > "$(CURDIR)/logs/companion.log" 2>&1 & \
		sleep 2; \
		echo "$(GREEN)Companion server started (logs: logs/companion.log)$(NC)"; \
	fi

## Stop companion server
stop-companion:
	@echo "$(YELLOW)Stopping companion server...$(NC)"
	@pkill -f "fastreader-server" 2>/dev/null || echo "Companion server not running"

## Install companion server dependencies
install-companion:
	cd "$(CURDIR)/fastreader-server" && npm install

# Update dev target to include companion server
dev: backend-bg companion-bg frontend

# Update install target
install: install-companion
	npm install
```

---

### Step 8: Update .env.example ✅ COMPLETED

```bash
# PocketBase server URL
VITE_POCKETBASE_URL=http://127.0.0.1:8090

# Companion server URL (for question generation)
VITE_COMPANION_SERVER_URL=http://127.0.0.1:3001

# Companion server port (used by fastreader-server)
COMPANION_PORT=3001
```

---

### Step 9: Update frontend to call companion server ✅ COMPLETED

**Update src/services/aiCli.ts:**

```typescript
// Add new method to call companion server
export async function generateQuestionsViaServer(
  sessionId: string,
  documentId: string,
  count: number = 5,
  tool: 'claude' | 'opencode' | 'aider' = 'claude'
): Promise<{ success: boolean; error?: string }> {
  const serverUrl = import.meta.env.VITE_COMPANION_SERVER_URL || 'http://127.0.0.1:3001'

  try {
    const response = await fetch(`${serverUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, documentId, count, tool }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Server error' }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}
```

**Update src/hooks/useComprehension.ts:**

Change `generateQuiz` to call the companion server:

```typescript
import { generateQuestionsViaServer } from '../services/aiCli'

const generateQuiz = useCallback(
  async (count: number = 5) => {
    if (!sessionId || !documentId) {
      setGenerationError('No active session')
      return
    }

    setIsGenerating(true)
    setGenerationError(null)

    try {
      // Call companion server instead of local CLI service
      const result = await generateQuestionsViaServer(sessionId, documentId, count)

      if (!result.success) {
        throw new Error(result.error || 'Generation failed')
      }

      // Mark milestone as prompted if we have one
      if (pendingMilestone) {
        await markMilestonePrompted(pendingMilestone.id)
        setPendingMilestone(null)
      }

      // Set 2-minute timeout for questions to arrive via SSE
      generationTimeoutRef.current = window.setTimeout(() => {
        generationTimeoutRef.current = null
        setIsGenerating((current) => {
          if (current) {
            setGenerationError('Generation timed out. The CLI may still be running.')
            return false
          }
          return current
        })
      }, 120000)
    } catch (error) {
      setIsGenerating(false)
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate questions'
      )
    }
  },
  [sessionId, documentId, pendingMilestone]
)
```

---

### Step 10: Add CLI tool selection to Settings UI (optional enhancement)

Add a setting to let users choose their preferred CLI tool:

**Update src/types/index.ts:**
```typescript
export interface Settings {
  // ... existing settings ...

  // AI CLI tool preference
  aiCliTool: 'claude' | 'opencode' | 'aider'
}

export const DEFAULT_SETTINGS: Settings = {
  // ... existing defaults ...
  aiCliTool: 'claude',
}
```

---

## Testing Plan

### Manual Testing

1. **Start all services:**
   ```bash
   make dev
   ```

2. **Verify companion server health:**
   ```bash
   curl http://localhost:3001/health
   ```

3. **Load text in FastReader UI**

4. **Click Quiz button**

5. **Verify:**
   - Companion server receives POST request (check logs/companion.log)
   - CLI tool is spawned (check stdout)
   - Questions appear in UI via SSE

### Unit Tests

Add tests for:
- `cli-spawner.ts`: Mock child_process, test timeout, test cancellation
- `prompt-builder.ts`: Test prompt generation
- `generate.ts`: Test request validation, mock CLI spawner

---

## Security Considerations

1. **Allowlisted CLI tools only** - Only `claude`, `opencode`, `aider` can be spawned
2. **No shell execution** - `shell: false` prevents command injection
3. **Timeout enforcement** - 2-minute default prevents runaway processes
4. **Localhost only** - CORS restricts to localhost origins
5. **Input validation** - Zod schema validates all request parameters

---

## Future Enhancements

1. **SSE streaming from companion server** - Stream CLI output to frontend for progress indication
2. **Tool auto-detection** - Check which CLI tools are installed and available
3. **Configuration UI** - Let users configure CLI tool paths and arguments
4. **Queue system** - Handle multiple concurrent generation requests
5. **Retry logic** - Automatically retry failed generations

---

## Files to Create/Modify Summary

### New Files
- `fastreader-server/package.json`
- `fastreader-server/tsconfig.json`
- `fastreader-server/src/index.ts`
- `fastreader-server/src/types.ts`
- `fastreader-server/src/routes/generate.ts`
- `fastreader-server/src/routes/health.ts`
- `fastreader-server/src/services/cli-spawner.ts`
- `fastreader-server/src/services/prompt-builder.ts`
- `fastreader-server/README.md`

### Modified Files
- `Makefile` - Add companion server targets
- `.env.example` - Add companion server URL
- `src/services/aiCli.ts` - Add `generateQuestionsViaServer()`
- `src/hooks/useComprehension.ts` - Update `generateQuiz()` to call companion server
- `src/types/index.ts` - Add `aiCliTool` setting (optional)

---

## Estimated Effort

| Task | Complexity |
|------|------------|
| Step 1-2: Create package and server | Low |
| Step 3-4: CLI spawner and prompt builder | Medium |
| Step 5-6: Route handlers | Low |
| Step 7-8: Makefile and env updates | Low |
| Step 9: Frontend integration | Medium |
| Step 10: Settings UI (optional) | Low |
| Testing | Medium |

**Total: ~4-6 hours of implementation work**
