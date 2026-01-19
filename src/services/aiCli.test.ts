import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AICliService, getAIConfig, setAIConfig } from './aiCli';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AICliService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('config management', () => {
    it('returns default config when none stored', () => {
      const config = getAIConfig();
      expect(config.command).toBe('claude');
      expect(config.args).toEqual(['--print']);
      expect(config.timeout).toBe(300);
    });

    it('persists config changes', () => {
      setAIConfig({ command: 'codex', timeout: 600 });
      const config = getAIConfig();
      expect(config.command).toBe('codex');
      expect(config.timeout).toBe(600);
      expect(config.args).toEqual(['--print']); // unchanged
    });
  });

  describe('AICliService', () => {
    it('can be instantiated with custom config', () => {
      const service = new AICliService({ command: 'opencode' });
      expect(service).toBeInstanceOf(AICliService);
    });

    it('tracks generation state', () => {
      const service = new AICliService();
      expect(service.isGenerating()).toBe(false);
    });

    it('can be cancelled', () => {
      const service = new AICliService();
      service.cancel();
      expect(service.isGenerating()).toBe(false);
    });
  });
});
