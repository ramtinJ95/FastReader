import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Controls } from './Controls';

const defaultProps = {
  isPlaying: false,
  isPaused: false,
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onStop: vi.fn(),
  onRestart: vi.fn(),
};

describe('Controls', () => {
  it('should render without crashing', () => {
    render(<Controls {...defaultProps} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });
});

describe('Button State Machine', () => {
  it('should show Play button when stopped (!isPlaying && !isPaused)', () => {
    render(<Controls {...defaultProps} isPlaying={false} isPaused={false} />);

    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument();
  });

  it('should show Pause button when playing', () => {
    render(<Controls {...defaultProps} isPlaying={true} isPaused={false} />);

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /play/i })).not.toBeInTheDocument();
  });

  it('should show Resume button when paused', () => {
    render(<Controls {...defaultProps} isPlaying={false} isPaused={true} />);

    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('should disable Stop button when stopped', () => {
    render(<Controls {...defaultProps} isPlaying={false} isPaused={false} />);

    expect(screen.getByRole('button', { name: /stop/i })).toBeDisabled();
  });

  it('should enable Stop button when playing', () => {
    render(<Controls {...defaultProps} isPlaying={true} />);

    expect(screen.getByRole('button', { name: /stop/i })).not.toBeDisabled();
  });

  it('should enable Stop button when paused', () => {
    render(<Controls {...defaultProps} isPaused={true} />);

    expect(screen.getByRole('button', { name: /stop/i })).not.toBeDisabled();
  });
});

describe('Button Callbacks', () => {
  it('should call onPlay when Play is clicked', () => {
    const onPlay = vi.fn();
    render(<Controls {...defaultProps} onPlay={onPlay} />);

    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('should call onPause when Pause is clicked', () => {
    const onPause = vi.fn();
    render(<Controls {...defaultProps} isPlaying={true} onPause={onPause} />);

    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('should call onResume when Resume is clicked', () => {
    const onResume = vi.fn();
    render(<Controls {...defaultProps} isPaused={true} onResume={onResume} />);

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('should call onStop when Stop is clicked', () => {
    const onStop = vi.fn();
    render(<Controls {...defaultProps} isPlaying={true} onStop={onStop} />);

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('should call onRestart when Restart is clicked', () => {
    const onRestart = vi.fn();
    render(<Controls {...defaultProps} onRestart={onRestart} />);

    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('should not call onPlay when disabled', () => {
    const onPlay = vi.fn();
    render(<Controls {...defaultProps} canPlay={false} onPlay={onPlay} />);

    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlay).not.toHaveBeenCalled();
  });
});

describe('Minimal Mode', () => {
  it('should apply minimal class when minimal is true', () => {
    const { container } = render(<Controls {...defaultProps} minimal={true} />);

    expect(container.querySelector('.controls')).toHaveClass('minimal');
  });

  it('should hide text labels in minimal mode', () => {
    render(<Controls {...defaultProps} minimal={true} />);

    // In minimal mode, there should be no text spans
    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton.querySelector('span')).not.toBeInTheDocument();
  });

  it('should hide Restart button in minimal mode', () => {
    render(<Controls {...defaultProps} minimal={true} />);

    expect(screen.queryByRole('button', { name: /restart/i })).not.toBeInTheDocument();
  });

  it('should show Restart button in normal mode', () => {
    render(<Controls {...defaultProps} minimal={false} />);

    expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument();
  });
});
