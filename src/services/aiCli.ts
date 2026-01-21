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
   * In a browser context, this signals that generation should start.
   * Questions will arrive via SSE from PocketBase when the AI CLI
   * (running externally) saves them.
   *
   * For native apps (Electron/Tauri), this would spawn the process directly.
   */
  async generateQuestions(
    sessionId: string,
    documentId: string,
    count: number = 5,
    onStatusChange?: (status: GenerationStatus) => void
  ): Promise<GenerationResult> {
    this.abortController = new AbortController();
    onStatusChange?.('generating');

    // Store session context for potential future use in native apps
    this.lastSessionId = sessionId;
    this.lastDocumentId = documentId;
    this.lastCount = count;

    // For web apps: We rely on SSE from PocketBase to know when questions arrive.
    // The AI CLI runs externally (e.g., user runs it in terminal or via MCP).
    // Generation is considered "started" - questions will arrive via subscription.

    // In native context (Electron/Tauri), this would spawn the CLI process
    // directly using IPC to the main process with sessionId/documentId.

    return { status: 'success' };
  }

  /** Last session ID used for generation (for native app IPC) */
  private lastSessionId: string | null = null;
  /** Last document ID used for generation (for native app IPC) */
  private lastDocumentId: string | null = null;
  /** Last question count used for generation (for native app IPC) */
  private lastCount: number = 5;

  /** Get the prompt for manual CLI execution */
  getPrompt(count: number = 5): string {
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

/**
 * Generate questions via the companion server.
 *
 * Calls the companion server which spawns the AI CLI tool to generate
 * comprehension questions. Questions arrive via PocketBase SSE subscription.
 */
export async function generateQuestionsViaServer(
  sessionId: string,
  documentId: string,
  count: number = 5,
  tool: 'claude' | 'opencode' | 'aider' = 'claude'
): Promise<{ success: boolean; error?: string }> {
  const serverUrl = import.meta.env.VITE_COMPANION_SERVER_URL || 'http://127.0.0.1:3001';

  try {
    const response = await fetch(`${serverUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, documentId, count, tool }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Server error' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
