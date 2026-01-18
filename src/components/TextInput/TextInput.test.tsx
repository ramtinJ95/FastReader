import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TextInput } from './TextInput';

const defaultProps = {
  text: '',
  isLoading: false,
  loadingMessage: '',
  onApply: vi.fn(),
  onFileSelect: vi.fn(),
  onClose: vi.fn(),
};

describe('TextInput', () => {
  it('should render without crashing', () => {
    render(<TextInput {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Load Text' })).toBeInTheDocument();
  });

  it('should display upload button', () => {
    render(<TextInput {...defaultProps} />);
    expect(screen.getByText(/upload pdf/i)).toBeInTheDocument();
  });

  it('should display textarea', () => {
    render(<TextInput {...defaultProps} />);
    expect(screen.getByPlaceholderText(/paste your text/i)).toBeInTheDocument();
  });
});
