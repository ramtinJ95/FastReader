import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Click-to-Seek', () => {
  it('should call onSeek when clicked', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar {...defaultProps} clickable={true} onSeek={onSeek} />
    );

    const progressContainer = container.querySelector('.progress-container');

    // Mock getBoundingClientRect
    Object.defineProperty(progressContainer, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 100 }),
    });

    fireEvent.click(progressContainer!, { clientX: 50 });
    expect(onSeek).toHaveBeenCalledWith(50);
  });

  it('should not call onSeek when not clickable', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar {...defaultProps} clickable={false} onSeek={onSeek} />
    );

    const progressContainer = container.querySelector('.progress-container');
    fireEvent.click(progressContainer!);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('should clamp seek percentage to 0-100', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar {...defaultProps} clickable={true} onSeek={onSeek} />
    );

    const progressContainer = container.querySelector('.progress-container');

    Object.defineProperty(progressContainer, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 100 }),
    });

    // Click beyond bounds
    fireEvent.click(progressContainer!, { clientX: 150 });
    expect(onSeek).toHaveBeenCalledWith(100);

    fireEvent.click(progressContainer!, { clientX: -50 });
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it('should have slider role when clickable', () => {
    const { container } = render(<ProgressBar {...defaultProps} clickable={true} />);
    const progressContainer = container.querySelector('.progress-container');
    expect(progressContainer).toHaveAttribute('role', 'slider');
  });

  it('should not have slider role when not clickable', () => {
    const { container } = render(<ProgressBar {...defaultProps} clickable={false} />);
    const progressContainer = container.querySelector('.progress-container');
    expect(progressContainer).not.toHaveAttribute('role');
  });
});

describe('Keyboard Navigation', () => {
  it('should seek forward with ArrowRight', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar {...defaultProps} progress={50} clickable={true} onSeek={onSeek} />
    );

    const progressContainer = container.querySelector('.progress-container');
    fireEvent.keyDown(progressContainer!, { key: 'ArrowRight' });
    expect(onSeek).toHaveBeenCalledWith(51);
  });

  it('should seek backward with ArrowLeft', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar {...defaultProps} progress={50} clickable={true} onSeek={onSeek} />
    );

    const progressContainer = container.querySelector('.progress-container');
    fireEvent.keyDown(progressContainer!, { key: 'ArrowLeft' });
    expect(onSeek).toHaveBeenCalledWith(49);
  });

  it('should seek 10% with Shift+Arrow', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar {...defaultProps} progress={50} clickable={true} onSeek={onSeek} />
    );

    const progressContainer = container.querySelector('.progress-container');
    fireEvent.keyDown(progressContainer!, { key: 'ArrowRight', shiftKey: true });
    expect(onSeek).toHaveBeenCalledWith(60);
  });

  it('should seek to 0% with Home', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar {...defaultProps} progress={50} clickable={true} onSeek={onSeek} />
    );

    const progressContainer = container.querySelector('.progress-container');
    fireEvent.keyDown(progressContainer!, { key: 'Home' });
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it('should seek to 100% with End', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar {...defaultProps} progress={50} clickable={true} onSeek={onSeek} />
    );

    const progressContainer = container.querySelector('.progress-container');
    fireEvent.keyDown(progressContainer!, { key: 'End' });
    expect(onSeek).toHaveBeenCalledWith(100);
  });

  it('should clamp keyboard navigation to bounds', () => {
    const onSeek = vi.fn();
    const { container } = render(
      <ProgressBar {...defaultProps} progress={99} clickable={true} onSeek={onSeek} />
    );

    const progressContainer = container.querySelector('.progress-container');
    fireEvent.keyDown(progressContainer!, { key: 'ArrowRight', shiftKey: true });
    expect(onSeek).toHaveBeenCalledWith(100);
  });
});
