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
