import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

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
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('App Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Render', () => {
    it('should render app title', () => {
      render(<App />);
      expect(screen.getByRole('heading', { name: 'FastReader' })).toBeInTheDocument();
    });

    it('should render control buttons', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      render(<App />);
      expect(screen.getByRole('slider', { name: /progress/i })).toBeInTheDocument();
    });

    it('should render header action buttons', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /load text/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save session/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /jump to position/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    });
  });

  describe('Playback Flow', () => {
    it('should start playback when play clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);

      // Should now show pause button
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should pause playback when pause clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Start playback
      await user.click(screen.getByRole('button', { name: /play/i }));

      // Pause
      await user.click(screen.getByRole('button', { name: /pause/i }));

      // Should show resume button
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    });

    it('should resume playback when resume clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Start playback
      await user.click(screen.getByRole('button', { name: /play/i }));

      // Pause
      await user.click(screen.getByRole('button', { name: /pause/i }));
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

      // Resume
      await user.click(screen.getByRole('button', { name: /resume/i }));

      // Should show pause button again
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should stop playback when stop clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Start playback
      await user.click(screen.getByRole('button', { name: /play/i }));

      // Stop
      await user.click(screen.getByRole('button', { name: /stop/i }));

      // Should show play button again
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('should restart playback when restart clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Start playback first
      await user.click(screen.getByRole('button', { name: /play/i }));

      // Advance time to progress through some words
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Stop playback first to see restart button
      await user.click(screen.getByRole('button', { name: /stop/i }));

      // Click restart
      await user.click(screen.getByRole('button', { name: /restart/i }));

      // Should start playing (pause button visible)
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });
  });

  describe('Settings', () => {
    it('should open settings panel', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      const settingsBtn = screen.getByRole('button', { name: /open settings/i });
      await user.click(settingsBtn);

      expect(screen.getByText('Reading Speed')).toBeInTheDocument();
    });

    it('should close settings on close button click', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /open settings/i }));
      expect(screen.getByText('Reading Speed')).toBeInTheDocument();

      // Click close button
      const dialog = screen.getByRole('dialog');
      const closeButton = within(dialog).getByRole('button', { name: /close settings/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Reading Speed')).not.toBeInTheDocument();
      });
    });

    it('should close settings on overlay click', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /open settings/i }));
      expect(screen.getByText('Reading Speed')).toBeInTheDocument();

      // Click overlay (the parent element of the settings panel)
      const overlay = document.querySelector('.settings-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }

      await waitFor(() => {
        expect(screen.queryByText('Reading Speed')).not.toBeInTheDocument();
      });
    });

    it('should change WPM via slider', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /open settings/i }));

      // Find WPM slider and change it
      const slider = screen.getByLabelText(/words per minute/i);
      fireEvent.change(slider, { target: { value: '475' } });

      // Verify value changed - look for it in the slider value display
      expect(screen.getByText('475')).toBeInTheDocument();
    });

    it('should apply WPM preset', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /open settings/i }));

      // Click 400 WPM preset
      const preset400 = screen.getByRole('button', { name: '400' });
      await user.click(preset400);

      // The 400 preset button should now be active
      expect(preset400).toHaveClass('active');
    });
  });

  describe('Text Input', () => {
    it('should open text input panel', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      const loadBtn = screen.getByRole('button', { name: /load text/i });
      await user.click(loadBtn);

      expect(screen.getByRole('heading', { name: 'Load Text' })).toBeInTheDocument();
    });

    it('should load new text when applied', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /load text/i }));

      const textarea = screen.getByPlaceholderText(/paste your text here/i);
      await user.clear(textarea);
      await user.type(textarea, 'New test content here');

      // The "Load Text" submit button
      const submitButton = within(screen.getByRole('dialog')).getByRole('button', {
        name: /^load text$/i,
      });
      await user.click(submitButton);

      // Panel should close
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Load Text' })).not.toBeInTheDocument();
      });
    });

    it('should close text input panel on cancel', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /load text/i }));
      expect(screen.getByRole('heading', { name: 'Load Text' })).toBeInTheDocument();

      // Click cancel button
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Load Text' })).not.toBeInTheDocument();
      });
    });

    it('should show error when trying to apply empty text', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /load text/i }));

      // Clear the textarea
      const textarea = screen.getByPlaceholderText(/paste your text here/i);
      await user.clear(textarea);

      // The submit button should be disabled when text is empty
      const submitButton = within(screen.getByRole('dialog')).getByRole('button', {
        name: /^load text$/i,
      });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Jump To Dialog', () => {
    it('should open jump-to dialog', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /jump to position/i }));

      expect(screen.getByRole('heading', { name: 'Jump to' })).toBeInTheDocument();
    });

    it('should close jump-to dialog on cancel', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /jump to position/i }));

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Jump to' })).not.toBeInTheDocument();
      });
    });

    it('should jump to position when valid number entered', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /jump to position/i }));

      const input = screen.getByLabelText(/jump to word number or percentage/i);
      await user.type(input, '10');
      await user.click(screen.getByRole('button', { name: /^jump$/i }));

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Jump to' })).not.toBeInTheDocument();
      });
    });

    it('should show error for invalid input', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /jump to position/i }));

      const input = screen.getByLabelText(/jump to word number or percentage/i);
      await user.type(input, '-5');
      await user.click(screen.getByRole('button', { name: /^jump$/i }));

      // Should show error
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should toggle playback on Space', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Space to play
      await user.keyboard(' ');
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

      // Space to pause
      await user.keyboard(' ');
      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

      // Space to resume
      await user.keyboard(' ');
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should stop playback on Escape during playback', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Start playing
      await user.keyboard(' ');
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

      // Escape to stop
      await user.keyboard('{Escape}');
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('should open jump-to on G key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.keyboard('g');

      expect(screen.getByRole('heading', { name: 'Jump to' })).toBeInTheDocument();
    });

    it('should open settings on S key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.keyboard('s');

      expect(screen.getByText('Reading Speed')).toBeInTheDocument();
    });

    it('should open text input on T key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.keyboard('t');

      expect(screen.getByRole('heading', { name: 'Load Text' })).toBeInTheDocument();
    });

    it('should close dialog on Escape', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Open jump-to
      await user.keyboard('g');
      expect(screen.getByRole('heading', { name: 'Jump to' })).toBeInTheDocument();

      // Close with Escape
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Jump to' })).not.toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should save session', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /save session/i }));

      // Should show confirmation message
      await waitFor(() => {
        expect(screen.getByText(/session saved/i)).toBeInTheDocument();
      });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should save session with Ctrl+S', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.keyboard('{Control>}s{/Control}');

      // Should show confirmation message
      await waitFor(() => {
        expect(screen.getByText(/session saved/i)).toBeInTheDocument();
      });
    });

    it('should show confirmation message temporarily', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.click(screen.getByRole('button', { name: /save session/i }));

      // Message appears
      await waitFor(() => {
        expect(screen.getByText(/session saved/i)).toBeInTheDocument();
      });

      // Message disappears after 2 seconds
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      await waitFor(() => {
        expect(screen.queryByText(/session saved/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Progress Bar Seeking', () => {
    it('should seek via progress bar click', async () => {
      render(<App />);

      const progressBar = screen.getByRole('slider', { name: /progress/i });

      // Simulate a click at the middle of the progress bar
      // In JSDOM, getBoundingClientRect returns zeros, so we mock it
      Object.defineProperty(progressBar, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 200, top: 0, height: 10 }),
      });

      // Click at approximately 50%
      fireEvent.click(progressBar, {
        clientX: 100,
        clientY: 5,
      });

      // Progress should update - check that the aria-valuenow changed
      await waitFor(() => {
        const newValue = progressBar.getAttribute('aria-valuenow');
        expect(Number(newValue)).toBeGreaterThan(0);
      });
    });

    it('should support keyboard navigation on progress bar', async () => {
      render(<App />);

      const progressBar = screen.getByRole('slider', { name: /progress/i });

      // Focus the progress bar
      progressBar.focus();

      // Press End to go to 100%
      fireEvent.keyDown(progressBar, { key: 'End' });

      await waitFor(() => {
        const value = progressBar.getAttribute('aria-valuenow');
        expect(Number(value)).toBe(100);
      });
    });
  });

  describe('Focus Mode', () => {
    it('should enter focus mode when playing', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Check header is visible initially
      expect(screen.getByRole('heading', { name: 'FastReader' })).toBeInTheDocument();

      // Start playback
      await user.click(screen.getByRole('button', { name: /play/i }));

      // Header should be hidden in focus mode
      expect(screen.queryByRole('heading', { name: 'FastReader' })).not.toBeInTheDocument();
    });

    it('should exit focus mode when stopped', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Start and then stop playback
      await user.click(screen.getByRole('button', { name: /play/i }));
      await user.click(screen.getByRole('button', { name: /stop/i }));

      // Header should be visible again
      expect(screen.getByRole('heading', { name: 'FastReader' })).toBeInTheDocument();
    });

    it('should show touch controls in focus mode', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Start playback to enter focus mode
      await user.click(screen.getByRole('button', { name: /play/i }));

      // Touch controls should be visible (aria-labels are "Skip back 5 words" and "Skip forward 5 words")
      expect(screen.getByRole('button', { name: /skip back 5 words/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skip forward 5 words/i })).toBeInTheDocument();
    });
  });
});
