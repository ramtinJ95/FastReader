import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from './Settings';
import { DEFAULT_SETTINGS } from '../../types';

const defaultProps = {
  settings: DEFAULT_SETTINGS,
  onChange: vi.fn(),
  onClose: vi.fn(),
};

describe('Settings', () => {
  it('should render without crashing', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should display all setting sections', () => {
    render(<Settings {...defaultProps} />);
    expect(screen.getByText('Reading Speed')).toBeInTheDocument();
    expect(screen.getByText('Display')).toBeInTheDocument();
    expect(screen.getByText('Fade Effect')).toBeInTheDocument();
    expect(screen.getByText('Punctuation Pauses')).toBeInTheDocument();
    expect(screen.getByText('Long Word Adjustment')).toBeInTheDocument();
    expect(screen.getByText('Periodic Pause')).toBeInTheDocument();
  });
});

describe('WPM Settings', () => {
  it('should display current WPM value', () => {
    render(<Settings {...defaultProps} settings={{ ...DEFAULT_SETTINGS, wordsPerMinute: 400 }} />);
    // The value is shown in the slider-with-value span
    const valueSpans = screen.getAllByText('400');
    expect(valueSpans.length).toBeGreaterThanOrEqual(1);
  });

  it('should call onChange when WPM slider changes', () => {
    const onChange = vi.fn();
    render(<Settings {...defaultProps} onChange={onChange} />);

    const slider = screen.getByLabelText(/words per minute/i);
    fireEvent.change(slider, { target: { value: '500' } });

    expect(onChange).toHaveBeenCalledWith({ wordsPerMinute: 500 });
  });

  it('should render WPM preset buttons', () => {
    render(<Settings {...defaultProps} />);

    expect(screen.getByRole('button', { name: '200' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '300' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '400' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '500' })).toBeInTheDocument();
  });

  it('should highlight active WPM preset', () => {
    render(<Settings {...defaultProps} settings={{ ...DEFAULT_SETTINGS, wordsPerMinute: 300 }} />);

    const activeButton = screen.getByRole('button', { name: '300' });
    expect(activeButton).toHaveClass('active');
  });

  it('should call onChange when preset button clicked', () => {
    const onChange = vi.fn();
    render(<Settings {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '500' }));
    expect(onChange).toHaveBeenCalledWith({ wordsPerMinute: 500 });
  });
});
