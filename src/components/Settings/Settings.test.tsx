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

describe('Toggle Settings', () => {
  it('should toggle fade enabled', () => {
    const onChange = vi.fn();
    render(<Settings {...defaultProps} onChange={onChange} settings={{ ...DEFAULT_SETTINGS, fadeEnabled: true }} />);

    const toggle = screen.getByRole('switch', { name: /enable fade/i });
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ fadeEnabled: false });
  });

  it('should show fade duration slider only when fade enabled', () => {
    const { rerender } = render(
      <Settings {...defaultProps} settings={{ ...DEFAULT_SETTINGS, fadeEnabled: true }} />
    );
    expect(screen.getByLabelText(/fade duration/i)).toBeInTheDocument();

    rerender(
      <Settings {...defaultProps} settings={{ ...DEFAULT_SETTINGS, fadeEnabled: false }} />
    );
    expect(screen.queryByLabelText(/fade duration/i)).not.toBeInTheDocument();
  });

  it('should toggle punctuation pause', () => {
    const onChange = vi.fn();
    render(<Settings {...defaultProps} onChange={onChange} />);

    const toggle = screen.getByRole('switch', { name: /pause on punctuation/i });
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ pauseOnPunctuation: false });
  });

  it('should show punctuation multiplier only when enabled', () => {
    const { rerender } = render(
      <Settings {...defaultProps} settings={{ ...DEFAULT_SETTINGS, pauseOnPunctuation: true }} />
    );
    expect(screen.getByLabelText(/pause multiplier/i)).toBeInTheDocument();

    rerender(
      <Settings {...defaultProps} settings={{ ...DEFAULT_SETTINGS, pauseOnPunctuation: false }} />
    );
    expect(screen.queryByLabelText(/pause multiplier/i)).not.toBeInTheDocument();
  });
});

describe('Slider Settings', () => {
  it('should update fade duration', () => {
    const onChange = vi.fn();
    render(<Settings {...defaultProps} onChange={onChange} />);

    const slider = screen.getByLabelText(/fade duration/i);
    fireEvent.change(slider, { target: { value: '200' } });

    expect(onChange).toHaveBeenCalledWith({ fadeDuration: 200 });
  });

  it('should update punctuation multiplier', () => {
    const onChange = vi.fn();
    render(<Settings {...defaultProps} onChange={onChange} />);

    const slider = screen.getByLabelText(/pause multiplier/i);
    fireEvent.change(slider, { target: { value: '3' } });

    expect(onChange).toHaveBeenCalledWith({ punctuationPauseMultiplier: 3 });
  });

  it('should update long word multiplier', () => {
    const onChange = vi.fn();
    render(<Settings {...defaultProps} onChange={onChange} />);

    const slider = screen.getByLabelText(/extra delay per char/i);
    fireEvent.change(slider, { target: { value: '10' } });

    expect(onChange).toHaveBeenCalledWith({ wordLengthWPMMultiplier: 10 });
  });

  it('should update frame word count', () => {
    const onChange = vi.fn();
    render(<Settings {...defaultProps} onChange={onChange} />);

    const slider = screen.getByLabelText(/words shown/i);
    fireEvent.change(slider, { target: { value: '5' } });

    expect(onChange).toHaveBeenCalledWith({ frameWordCount: 5 });
  });

  it('should update periodic pause settings', () => {
    const onChange = vi.fn();
    render(<Settings {...defaultProps} onChange={onChange} settings={{ ...DEFAULT_SETTINGS, pauseAfterWords: 10 }} />);

    const durationSlider = screen.getByLabelText(/pause duration/i);
    fireEvent.change(durationSlider, { target: { value: '1000' } });

    expect(onChange).toHaveBeenCalledWith({ pauseDuration: 1000 });
  });

  it('should show "Off" when periodic pause is 0', () => {
    render(<Settings {...defaultProps} settings={{ ...DEFAULT_SETTINGS, pauseAfterWords: 0 }} />);
    expect(screen.getByText('Off')).toBeInTheDocument();
  });
});
