export interface AICliConfig {
  command: string;
  args: string[];
  timeout: number; // seconds
}

const DEFAULT_CONFIG: AICliConfig = {
  command: 'claude',
  args: ['--print'],
  timeout: 300,
};

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error' | 'timeout' | 'cancelled';

export interface GenerationResult {
  status: GenerationStatus;
  error?: string;
}

// Store config in localStorage
const CONFIG_KEY = 'fastreader_ai_config';

export function getAIConfig(): AICliConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_CONFIG;
}

export function setAIConfig(config: Partial<AICliConfig>): void {
  const current = getAIConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

// Browser-based approach: generate questions by calling an endpoint
// that spawns the CLI, or show instructions for manual CLI usage.
// For Electron/Tauri apps, you could use child_process directly.

export class AICliService {
  private abortController: AbortController | null = null;
  private config: AICliConfig;

  constructor(config?: Partial<AICliConfig>) {
    this.config = { ...getAIConfig(), ...config };
  }

  /**
   * Generate questions for the current session.
   *
   * In a browser context, this creates a prompt that users can copy
   * to their CLI. For native apps, this would spawn the process directly.
   */
  async generateQuestions(
    sessionId: string,
    documentId: string,
    count: number = 5,
    onStatusChange?: (status: GenerationStatus) => void
  ): Promise<GenerationResult> {
    this.abortController = new AbortController();
    onStatusChange?.('generating');

    const prompt = this.buildPrompt(count);

    // For web apps: We'll rely on SSE from PocketBase to know when questions arrive
    // The user runs the CLI manually, or we have a backend endpoint that does it

    // Check if we're in a context where we can spawn processes
    if (typeof window !== 'undefined' && !('electronAPI' in window)) {
      // Browser context - return the prompt for manual execution
      console.log('AI CLI Prompt (run in terminal):', prompt);
      console.log(`Command: ${this.config.command} ${this.config.args.join(' ')} "${prompt}"`);

      // In browser, we wait for SSE events from PocketBase
      // The "generation" is considered started once the user runs the command
      return { status: 'success' };
    }

    // Native context (Electron/Tauri) - spawn process directly
    // This would be implemented with IPC to the main process
    return { status: 'success' };
  }

  private buildPrompt(count: number): string {
    return `Generate ${count} comprehension questions for my current FastReader session. ` +
      `Use the fastreader_get_current_session tool to get the document and progress, ` +
      `use fastreader_get_question_history to avoid duplicates, ` +
      `then save questions using fastreader_save_questions. ` +
      `Include a mix of multiple choice, short answer, and fill-in-blank questions. ` +
      `Focus on factual recall and inference.`;
  }

  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  isGenerating(): boolean {
    return this.abortController !== null;
  }
}

// Singleton instance
let cliService: AICliService | null = null;

export function getAICliService(): AICliService {
  if (!cliService) {
    cliService = new AICliService();
  }
  return cliService;
}
