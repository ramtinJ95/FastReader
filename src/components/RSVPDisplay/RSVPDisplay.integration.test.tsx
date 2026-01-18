import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RSVPDisplay } from './RSVPDisplay';

describe('RSVPDisplay Integration', () => {
  it('should render complete component with all features', () => {
    const { container } = render(
      <RSVPDisplay
        word="FastReader"
        opacity={0.8}
        fadeEnabled={true}
        fadeDuration={200}
      />
    );

    // Check structure
    expect(container.querySelector('.rsvp-display')).toBeInTheDocument();
    expect(container.querySelector('.focus-marker')).toBeInTheDocument();
    expect(container.querySelector('.marker-line.top')).toBeInTheDocument();
    expect(container.querySelector('.marker-line.bottom')).toBeInTheDocument();
    expect(container.querySelector('.word-container')).toBeInTheDocument();

    // Check ORP display
    // "FastReader" = 10 letters, ORP index = 3 -> 't'
    expect(container.querySelector('.orp')).toHaveTextContent('t');
    expect(container.querySelector('.before-orp')).toHaveTextContent('Fas');
    expect(container.querySelector('.after-orp')).toHaveTextContent('Reader');

    // Check styles
    expect(container.querySelector('.word-container')).toHaveStyle({ opacity: '0.8' });
  });

  it('should handle rapid word changes', () => {
    const words = ['one', 'two', 'three', 'four', 'five'];
    const { rerender, container } = render(<RSVPDisplay word={words[0]} />);

    words.forEach((word) => {
      rerender(<RSVPDisplay word={word} />);
      expect(container.querySelector('.orp')).toBeInTheDocument();
    });
  });

  it('should handle empty to word transition', () => {
    const { rerender, container } = render(<RSVPDisplay word="" />);
    expect(container.querySelector('.placeholder')).toBeInTheDocument();

    rerender(<RSVPDisplay word="hello" />);
    expect(container.querySelector('.placeholder')).not.toBeInTheDocument();
    expect(container.querySelector('.orp')).toHaveTextContent('e');
  });

  it('should switch between single and multi-word modes', () => {
    const { rerender, container } = render(<RSVPDisplay word="hello" />);
    expect(container.querySelector('.word-container')).not.toHaveClass('multi-mode');

    rerender(
      <RSVPDisplay
        wordGroup={['one', 'two', 'three']}
        highlightIndex={1}
        multiWordEnabled={true}
      />
    );
    expect(container.querySelector('.word-container')).toHaveClass('multi-mode');
  });
});
