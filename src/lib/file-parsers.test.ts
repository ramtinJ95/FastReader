import { describe, it, expect } from 'vitest';
import { cleanText, validateFile, getSupportedExtensions } from './file-parsers';

describe('cleanText', () => {
  it('should replace multiple spaces with single space', () => {
    expect(cleanText('hello    world')).toBe('hello world');
  });

  it('should replace newlines with spaces', () => {
    expect(cleanText('hello\n\nworld')).toBe('hello world');
  });

  it('should remove excessive punctuation', () => {
    expect(cleanText('hello!!! world...')).toBe('hello! world.');
  });

  it('should trim whitespace', () => {
    expect(cleanText('  hello world  ')).toBe('hello world');
  });

  it('should handle mixed whitespace', () => {
    expect(cleanText('hello\t\n  world')).toBe('hello world');
  });
});

describe('validateFile', () => {
  it('should accept valid PDF file', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateFile(file)).toEqual({ valid: true });
  });

  it('should accept valid TXT file', () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateFile(file)).toEqual({ valid: true });
  });

  it('should reject unsupported file type', () => {
    const file = new File([''], 'test.doc', { type: 'application/msword' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateFile(file).valid).toBe(false);
    expect(validateFile(file).error).toContain('Unsupported');
  });

  it('should reject file over 10MB', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 });
    expect(validateFile(file).valid).toBe(false);
    expect(validateFile(file).error).toContain('too large');
  });
});

describe('getSupportedExtensions', () => {
  it('should return supported extensions', () => {
    expect(getSupportedExtensions()).toBe('.pdf,.txt');
  });
});
