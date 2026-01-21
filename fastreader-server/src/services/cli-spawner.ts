import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { CLITool, SpawnOptions, SpawnResult } from '../types.js'

export type { CLITool, SpawnOptions, SpawnResult }

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
            '-p',
            options.prompt,
            '--mcp-config',
            options.mcpConfigPath,
            '--allowedTools',
            'mcp__fastreader__*',
            '--output-format',
            'text',
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
