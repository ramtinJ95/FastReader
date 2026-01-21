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
    return c.json(
      {
        success: false,
        error: err instanceof z.ZodError ? err.errors : 'Invalid request body',
      },
      400
    )
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
    return c.json(
      {
        success: false,
        error: result.error || 'CLI execution failed',
        stderr: result.stderr,
      },
      500
    )
  }
})

// Cancel endpoint for long-running generations
generateRoute.post('/generate/cancel/:id', async (c) => {
  const id = c.req.param('id')
  const cancelled = cliSpawner.cancel(id)
  return c.json({ success: cancelled })
})

export { generateRoute }
