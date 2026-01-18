import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavedSessionPrompt } from './SavedSessionPrompt';

const defaultProps = {
  isOpen: true,
  summary: {
    currentWordIndex: 50,
    totalWords: 100,
    savedAt: Date.now() - 3600000, // 1 hour ago
  },
  onResume: vi.fn(),
  onStartFresh: vi.fn(),
  onClose: vi.fn(),
};

describe('SavedSessionPrompt', () => {
  it('should not render when isOpen is false', () => {
    render(<SavedSessionPrompt {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/resume reading/i)).not.toBeInTheDocument();
  });

  it('should not render when summary is null', () => {
    render(<SavedSessionPrompt {...defaultProps} summary={null} />);
    expect(screen.queryByText(/resume reading/i)).not.toBeInTheDocument();
  });

  it('should render when open with summary', () => {
    render(<SavedSessionPrompt {...defaultProps} />);
    expect(screen.getByText(/resume reading/i)).toBeInTheDocument();
  });

  it('should display progress percentage', () => {
    render(<SavedSessionPrompt {...defaultProps} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should display word count', () => {
    render(<SavedSessionPrompt {...defaultProps} />);
    expect(screen.getByText('50 / 100 words')).toBeInTheDocument();
  });

  it('should call onResume when Resume clicked', () => {
    const onResume = vi.fn();
    render(<SavedSessionPrompt {...defaultProps} onResume={onResume} />);

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(onResume).toHaveBeenCalled();
  });

  it('should call onStartFresh when Start Fresh clicked', () => {
    const onStartFresh = vi.fn();
    render(<SavedSessionPrompt {...defaultProps} onStartFresh={onStartFresh} />);

    fireEvent.click(screen.getByRole('button', { name: /start fresh/i }));
    expect(onStartFresh).toHaveBeenCalled();
  });

  it('should call onClose when overlay clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<SavedSessionPrompt {...defaultProps} onClose={onClose} />);

    const overlay = container.querySelector('.dialog-overlay');
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });

  it('should display relative time', () => {
    render(<SavedSessionPrompt {...defaultProps} />);
    expect(screen.getByText(/hour/i)).toBeInTheDocument();
  });

  it('should display "Just now" for recent saves', () => {
    const props = {
      ...defaultProps,
      summary: {
        currentWordIndex: 10,
        totalWords: 100,
        savedAt: Date.now() - 30000, // 30 seconds ago
      },
    };
    render(<SavedSessionPrompt {...props} />);
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it('should display minutes for saves under an hour', () => {
    const props = {
      ...defaultProps,
      summary: {
        currentWordIndex: 10,
        totalWords: 100,
        savedAt: Date.now() - 1800000, // 30 minutes ago
      },
    };
    render(<SavedSessionPrompt {...props} />);
    expect(screen.getByText(/30 minutes ago/i)).toBeInTheDocument();
  });

  it('should display days for older saves', () => {
    const props = {
      ...defaultProps,
      summary: {
        currentWordIndex: 10,
        totalWords: 100,
        savedAt: Date.now() - 172800000, // 2 days ago
      },
    };
    render(<SavedSessionPrompt {...props} />);
    expect(screen.getByText(/2 days ago/i)).toBeInTheDocument();
  });

  it('should not call onClose when dialog content is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<SavedSessionPrompt {...defaultProps} onClose={onClose} />);

    const dialog = container.querySelector('.dialog');
    fireEvent.click(dialog!);
    expect(onClose).not.toHaveBeenCalled();
  });
});
