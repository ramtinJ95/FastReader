import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, KeyboardShortcutHandlers } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  const createHandlers = (): KeyboardShortcutHandlers => ({
    onTogglePlayPause: vi.fn(),
    onStop: vi.fn(),
    onOpenJumpTo: vi.fn(),
    onSave: vi.fn(),
    onIncreaseWPM: vi.fn(),
    onDecreaseWPM: vi.fn(),
    onSkipBackward: vi.fn(),
    onSkipForward: vi.fn(),
    onEscape: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenTextInput: vi.fn(),
  });

  const fireKey = (code: string, options: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
      code,
      bubbles: true,
      ...options,
    });
    window.dispatchEvent(event);
  };

  it('should call onTogglePlayPause on Space', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('Space');
    expect(handlers.onTogglePlayPause).toHaveBeenCalled();
  });

  it('should call onEscape on Escape', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('Escape');
    expect(handlers.onEscape).toHaveBeenCalled();
  });

  it('should call onOpenJumpTo on G', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('KeyG');
    expect(handlers.onOpenJumpTo).toHaveBeenCalled();
  });

  it('should call onSave on Ctrl+S', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('KeyS', { ctrlKey: true });
    expect(handlers.onSave).toHaveBeenCalled();
  });

  it('should call onSave on Cmd+S (Mac)', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('KeyS', { metaKey: true });
    expect(handlers.onSave).toHaveBeenCalled();
  });

  it('should call onOpenSettings on S without modifier', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('KeyS');
    expect(handlers.onOpenSettings).toHaveBeenCalled();
    expect(handlers.onSave).not.toHaveBeenCalled();
  });

  it('should call onOpenTextInput on T', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('KeyT');
    expect(handlers.onOpenTextInput).toHaveBeenCalled();
  });

  it('should call onIncreaseWPM on ArrowUp', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('ArrowUp');
    expect(handlers.onIncreaseWPM).toHaveBeenCalled();
  });

  it('should call onDecreaseWPM on ArrowDown', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('ArrowDown');
    expect(handlers.onDecreaseWPM).toHaveBeenCalled();
  });

  it('should call onSkipBackward on ArrowLeft', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('ArrowLeft');
    expect(handlers.onSkipBackward).toHaveBeenCalled();
  });

  it('should call onSkipForward on ArrowRight', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('ArrowRight');
    expect(handlers.onSkipForward).toHaveBeenCalled();
  });

  it('should not fire when disabled', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers, enabled: false }));

    fireKey('Space');
    expect(handlers.onTogglePlayPause).not.toHaveBeenCalled();
  });

  it('should not call onOpenJumpTo on Ctrl+G', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts({ handlers }));

    fireKey('KeyG', { ctrlKey: true });
    expect(handlers.onOpenJumpTo).not.toHaveBeenCalled();
  });

  it('should clean up event listener on unmount', () => {
    const handlers = createHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ handlers }));

    unmount();

    fireKey('Space');
    expect(handlers.onTogglePlayPause).not.toHaveBeenCalled();
  });
});
