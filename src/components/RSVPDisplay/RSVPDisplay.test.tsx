import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RSVPDisplay } from './RSVPDisplay';

describe('RSVPDisplay', () => {
  it('should render without crashing', () => {
    render(<RSVPDisplay />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('should display placeholder when no word provided', () => {
    render(<RSVPDisplay word="" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('should render focus markers', () => {
    const { container } = render(<RSVPDisplay word="hello" />);

    const focusMarker = container.querySelector('.focus-marker');
    expect(focusMarker).toBeInTheDocument();

    const topMarker = container.querySelector('.marker-line.top');
    const bottomMarker = container.querySelector('.marker-line.bottom');
    expect(topMarker).toBeInTheDocument();
    expect(bottomMarker).toBeInTheDocument();
  });
});

describe('Word Display', () => {
  it('should display word with correct ORP split', () => {
    // "hello" (5 letters) -> ORP index 1 -> 'e' is highlighted
    const { container } = render(<RSVPDisplay word="hello" />);

    const orp = container.querySelector('.orp');
    const before = container.querySelector('.before-orp');
    const after = container.querySelector('.after-orp');

    expect(orp).toHaveTextContent('e');
    expect(before).toHaveTextContent('h');
    expect(after).toHaveTextContent('llo');
  });

  it('should handle single character words', () => {
    const { container } = render(<RSVPDisplay word="a" />);

    const orp = container.querySelector('.orp');
    const before = container.querySelector('.before-orp');
    const after = container.querySelector('.after-orp');

    expect(orp).toHaveTextContent('a');
    expect(before).toHaveTextContent('');
    expect(after).toHaveTextContent('');
  });

  it('should handle words with punctuation', () => {
    // "Hello," (5 letters + comma) -> ORP index 1 -> 'e'
    const { container } = render(<RSVPDisplay word="Hello," />);

    const orp = container.querySelector('.orp');
    expect(orp).toHaveTextContent('e');
  });

  it('should handle words with leading punctuation', () => {
    // '"hello' -> 'e' should still be the ORP
    const { container } = render(<RSVPDisplay word={'"hello'} />);

    const orp = container.querySelector('.orp');
    expect(orp).toHaveTextContent('e');
  });
});

describe('Fade Transitions', () => {
  it('should apply opacity style', () => {
    const { container } = render(<RSVPDisplay word="hello" opacity={0.5} />);

    const wordContainer = container.querySelector('.word-container');
    expect(wordContainer).toHaveStyle({ opacity: '0.5' });
  });

  it('should apply fade transition when enabled', () => {
    const { container } = render(
      <RSVPDisplay word="hello" fadeEnabled={true} fadeDuration={200} />
    );

    const wordContainer = container.querySelector('.word-container');
    expect(wordContainer).toHaveStyle({ transition: 'opacity 200ms ease-in-out' });
  });

  it('should not apply transition when fade disabled', () => {
    const { container } = render(<RSVPDisplay word="hello" fadeEnabled={false} />);

    const wordContainer = container.querySelector('.word-container');
    expect(wordContainer).toHaveStyle({ transition: 'none' });
  });
});
