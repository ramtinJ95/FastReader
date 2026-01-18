import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JumpToDialog } from './JumpToDialog';

const defaultProps = {
  isOpen: true,
  totalWords: 100,
  onClose: vi.fn(),
  onJump: vi.fn(),
};

describe('JumpToDialog', () => {
  it('should not render when isOpen is false', () => {
    render(<JumpToDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Jump to')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<JumpToDialog {...defaultProps} />);
    expect(screen.getByText('Jump to')).toBeInTheDocument();
  });

  it('should call onJump with word number', () => {
    const onJump = vi.fn();
    render(<JumpToDialog {...defaultProps} onJump={onJump} />);

    const input = screen.getByPlaceholderText(/word/i);
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.click(screen.getByText('Jump'));

    expect(onJump).toHaveBeenCalledWith(50);
  });

  it('should call onJump with percentage', () => {
    const onJump = vi.fn();
    render(<JumpToDialog {...defaultProps} onJump={onJump} totalWords={100} />);

    const input = screen.getByPlaceholderText(/word/i);
    fireEvent.change(input, { target: { value: '50%' } });
    fireEvent.click(screen.getByText('Jump'));

    expect(onJump).toHaveBeenCalledWith(50);
  });

  it('should show error for invalid input', () => {
    render(<JumpToDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(/word/i);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Jump'));

    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
  });

  it('should close on Escape key', () => {
    const onClose = vi.fn();
    render(<JumpToDialog {...defaultProps} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/word/i);
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('should close on Cancel button', () => {
    const onClose = vi.fn();
    render(<JumpToDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should close on overlay click', () => {
    const onClose = vi.fn();
    const { container } = render(<JumpToDialog {...defaultProps} onClose={onClose} />);

    const overlay = container.querySelector('.dialog-overlay');
    fireEvent.click(overlay!);

    expect(onClose).toHaveBeenCalled();
  });
});
