import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from './Settings';
import { DEFAULT_SETTINGS } from '../../types';

describe('Settings Integration', () => {
  it('should handle complete settings interaction flow', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <Settings settings={DEFAULT_SETTINGS} onChange={onChange} onClose={onClose} />
    );

    // Change WPM with slider
    fireEvent.change(screen.getByLabelText(/words per minute/i), { target: { value: '450' } });
    expect(onChange).toHaveBeenCalledWith({ wordsPerMinute: 450 });

    // Click WPM preset
    fireEvent.click(screen.getByRole('button', { name: '500' }));
    expect(onChange).toHaveBeenCalledWith({ wordsPerMinute: 500 });

    // Toggle fade off
    fireEvent.click(screen.getByRole('switch', { name: /enable fade/i }));
    expect(onChange).toHaveBeenCalledWith({ fadeEnabled: false });

    // Verify conditional rendering
    rerender(
      <Settings
        settings={{ ...DEFAULT_SETTINGS, fadeEnabled: false }}
        onChange={onChange}
        onClose={onClose}
      />
    );
    expect(screen.queryByLabelText(/fade duration/i)).not.toBeInTheDocument();

    // Close settings
    fireEvent.click(screen.getByLabelText(/close settings/i));
    expect(onClose).toHaveBeenCalled();
  });
});
