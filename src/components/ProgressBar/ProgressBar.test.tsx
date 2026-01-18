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

describe('Stats Display', () => {
  it('should display word count', () => {
    render(<ProgressBar {...defaultProps} currentWord={25} totalWords={100} />);
    expect(screen.getByText('25 / 100')).toBeInTheDocument();
  });

  it('should display WPM', () => {
    render(<ProgressBar {...defaultProps} wpm={400} />);
    expect(screen.getByText('400 WPM')).toBeInTheDocument();
  });

  it('should display time remaining', () => {
    render(<ProgressBar {...defaultProps} timeRemaining="2:30" />);
    expect(screen.getByText('2:30')).toBeInTheDocument();
  });

  it('should hide stats in minimal mode', () => {
    render(<ProgressBar {...defaultProps} minimal={true} />);
    expect(screen.queryByText('50 / 100')).not.toBeInTheDocument();
    expect(screen.queryByText('300 WPM')).not.toBeInTheDocument();
  });
});
