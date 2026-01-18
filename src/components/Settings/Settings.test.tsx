import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
