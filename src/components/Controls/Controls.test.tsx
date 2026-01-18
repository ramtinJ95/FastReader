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
