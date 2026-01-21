/**
 * Supported AI CLI tools for question generation
 */
export type CLITool = 'claude' | 'opencode' | 'aider'

/**
 * Options for spawning a CLI process
 */
export interface SpawnOptions {
  tool: CLITool
  prompt: string
  mcpConfigPath: string
  timeout?: number // ms, default 120000 (2 min)
  workingDir?: string
  onStdout?: (data: string) => void
  onStderr?: (data: string) => void
}

/**
 * Result of a CLI spawn operation
 */
export interface SpawnResult {
  success: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  error?: string
}

/**
 * Request body for the /api/generate endpoint
 */
export interface GenerateRequest {
  sessionId: string
  documentId: string
  count?: number
  tool?: CLITool
  timeout?: number
}

/**
 * Response from the /api/generate endpoint
 */
export interface GenerateResponse {
  success: boolean
  message?: string
  tool?: CLITool
  spawnId?: string
  error?: string
  stderr?: string
}

/**
 * Options for building question generation prompts
 */
export interface PromptOptions {
  sessionId: string
  documentId: string
  count: number
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
}
