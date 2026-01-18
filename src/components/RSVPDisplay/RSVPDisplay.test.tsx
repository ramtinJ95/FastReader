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
