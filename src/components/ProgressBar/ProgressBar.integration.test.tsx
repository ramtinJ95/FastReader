import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar Integration', () => {
  it('should render complete component with all features', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar
        progress={33}
        currentWord={33}
        totalWords={100}
        wpm={300}
        timeRemaining="0:14"
        clickable={true}
        onSeek={onSeek}
      />
    );

    // Check structure
    expect(container.querySelector('.progress-wrapper')).toBeInTheDocument();
    expect(container.querySelector('.progress-container')).toBeInTheDocument();
    expect(container.querySelector('.progress-bar')).toBeInTheDocument();
    expect(container.querySelector('.stats')).toBeInTheDocument();

    // Check stats
    expect(screen.getByText('33 / 100')).toBeInTheDocument();
    expect(screen.getByText('300 WPM')).toBeInTheDocument();
    expect(screen.getByText('0:14')).toBeInTheDocument();

    // Check progress width
    expect(container.querySelector('.progress-bar')).toHaveStyle({ width: '33%' });

    // Check accessibility
    const progressContainer = container.querySelector('.progress-container');
    expect(progressContainer).toHaveAttribute('role', 'slider');
    expect(progressContainer).toHaveAttribute('aria-valuenow', '33');
  });

  it('should handle full interaction flow', () => {
    const onSeek = vi.fn();
    const { container, rerender } = render(
      <ProgressBar
        progress={0}
        currentWord={0}
        totalWords={100}
        wpm={300}
        timeRemaining="0:20"
        clickable={true}
        onSeek={onSeek}
      />
    );

    // Simulate click seek
    const progressContainer = container.querySelector('.progress-container');
    Object.defineProperty(progressContainer, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 100 }),
    });

    fireEvent.click(progressContainer!, { clientX: 50 });
    expect(onSeek).toHaveBeenCalledWith(50);

    // Simulate keyboard seek
    fireEvent.keyDown(progressContainer!, { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenLastCalledWith(1);

    // Update progress and verify
    rerender(
      <ProgressBar
        progress={50}
        currentWord={50}
        totalWords={100}
        wpm={300}
        timeRemaining="0:10"
        clickable={true}
        onSeek={onSeek}
      />
    );

    expect(container.querySelector('.progress-bar')).toHaveStyle({ width: '50%' });
    expect(screen.getByText('50 / 100')).toBeInTheDocument();
    expect(screen.getByText('0:10')).toBeInTheDocument();
  });
});
