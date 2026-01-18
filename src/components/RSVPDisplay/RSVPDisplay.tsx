import { useMemo } from 'react';
import { splitWordForDisplay } from '../../lib/rsvp-utils';
import './RSVPDisplay.css';

export interface RSVPDisplayProps {
  /** Current word to display (single word mode) */
  word?: string;
  /** Array of words for multi-word context mode */
  wordGroup?: string[];
  /** Index of the highlighted word in wordGroup */
  highlightIndex?: number;
  /** Current opacity (0-1) for fade effect */
  opacity?: number;
  /** Fade transition duration in milliseconds */
  fadeDuration?: number;
  /** Whether fade transitions are enabled */
  fadeEnabled?: boolean;
  /** Whether multi-word context mode is enabled */
  multiWordEnabled?: boolean;
}

export function RSVPDisplay({
  word = '',
  wordGroup = [],
  highlightIndex = 0,
  opacity = 1,
  fadeDuration = 150,
  fadeEnabled = true,
  multiWordEnabled = false,
}: RSVPDisplayProps) {
  // Determine if we're using multi-word mode
  const useMultiMode = multiWordEnabled && wordGroup.length > 0;

  // Get the current word to display
  const currentWord = useMultiMode ? wordGroup[highlightIndex] || '' : word;

  // Split the current word into parts for ORP display
  const wordParts = useMemo(() => splitWordForDisplay(currentWord), [currentWord]);

  // Get words before and after the highlighted word (for multi-word mode)
  const wordsBefore = useMultiMode ? wordGroup.slice(0, highlightIndex) : [];
  const wordsAfter = useMultiMode ? wordGroup.slice(highlightIndex + 1) : [];

  // Calculate transition style
  const transitionStyle = {
    opacity,
    transition: fadeEnabled ? `opacity ${fadeDuration}ms ease-in-out` : 'none',
  };

  return (
    <div className="rsvp-display" role="region" aria-label="RSVP word display">
      {/* Screen reader announcement (visually hidden) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentWord || 'Ready to read'}
      </div>

      {/* Focus markers */}
      <div className="focus-marker" aria-hidden="true">
        <div className="marker-line top" />
        <div className="marker-line bottom" />
      </div>

      {/* Word container */}
      <div
        className={`word-container ${useMultiMode ? 'multi-mode' : ''}`}
        style={transitionStyle}
        aria-hidden="true"
      >
        {currentWord ? (
          <>
            {/* ORP letter - always centered at 50% */}
            <span className="orp">{wordParts.orp}</span>

            {/* Content before ORP */}
            <span className="before-orp">
              {useMultiMode && wordsBefore.length > 0 && (
                <span className="context-words">{wordsBefore.join(' ')}&nbsp;</span>
              )}
              {wordParts.before}
            </span>

            {/* Content after ORP */}
            <span className="after-orp">
              {wordParts.after}
              {useMultiMode && wordsAfter.length > 0 && (
                <span className="context-words">&nbsp;{wordsAfter.join(' ')}</span>
              )}
            </span>
          </>
        ) : (
          <span className="placeholder">Ready</span>
        )}
      </div>
    </div>
  );
}

export default RSVPDisplay;
