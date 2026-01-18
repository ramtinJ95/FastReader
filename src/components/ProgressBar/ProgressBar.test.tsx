import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

const defaultProps = {
  progress: 50,
  currentWord: 50,
  totalWords: 100,
  wpm: 300,
  timeRemaining: '0:30',
};

describe('ProgressBar', () => {
  it('should render without crashing', () => {
    render(<ProgressBar {...defaultProps} />);
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
  });

  it('should display progress bar with correct width', () => {
    const { container } = render(<ProgressBar {...defaultProps} progress={75} />);
    const progressBar = container.querySelector('.progress-bar');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });
});
