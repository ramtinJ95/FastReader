import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Text Input Functionality', () => {
  it('should update textarea value', () => {
    render(<TextInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/paste your text/i);
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(textarea).toHaveValue('Hello world');
  });

  it('should call onApply with text when form submitted', () => {
    const onApply = vi.fn();
    render(<TextInput {...defaultProps} onApply={onApply} />);

    const textarea = screen.getByPlaceholderText(/paste your text/i);
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    const submitBtn = screen.getByRole('button', { name: /load text/i });
    fireEvent.click(submitBtn);

    expect(onApply).toHaveBeenCalledWith('Hello world');
  });

  it('should show error when submitting whitespace-only text', () => {
    render(<TextInput {...defaultProps} text="   " />);

    // Submit button should be disabled for whitespace-only text
    const submitBtn = screen.getByRole('button', { name: /load text/i });
    expect(submitBtn).toBeDisabled();
  });

  it('should disable submit button when text is empty', () => {
    render(<TextInput {...defaultProps} text="" />);

    const submitBtn = screen.getByRole('button', { name: /load text/i });
    expect(submitBtn).toBeDisabled();
  });

  it('should initialize with provided text', () => {
    render(<TextInput {...defaultProps} text="Initial text" />);

    const textarea = screen.getByPlaceholderText(/paste your text/i);
    expect(textarea).toHaveValue('Initial text');
  });
});

describe('File Upload Functionality', () => {
  it('should call onFileSelect when valid file selected', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<TextInput {...defaultProps} onFileSelect={onFileSelect} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 });

    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('should show error for unsupported file type', () => {
    const { container } = render(<TextInput {...defaultProps} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.doc', { type: 'application/msword' });
    Object.defineProperty(file, 'size', { value: 1024 });

    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    expect(screen.getByText(/unsupported/i)).toBeInTheDocument();
  });

  it('should show error for file too large', () => {
    const { container } = render(<TextInput {...defaultProps} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 });

    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    expect(screen.getByText(/too large/i)).toBeInTheDocument();
  });

  it('should accept txt files', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<TextInput {...defaultProps} onFileSelect={onFileSelect} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 1024 });

    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });
});
