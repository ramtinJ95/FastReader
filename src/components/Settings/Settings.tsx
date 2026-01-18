import { useCallback, useEffect, useRef } from 'react';
import type { Settings as SettingsType } from '../../types';
import './Settings.css';

// Close icon
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

export interface SettingsProps {
  /** Current settings values */
  settings: SettingsType;
  /** Called when any setting changes */
  onChange: (settings: Partial<SettingsType>) => void;
  /** Called when panel should close */
  onClose: () => void;
}

const WPM_PRESETS = [200, 300, 400, 500];

export function Settings({ settings, onChange, onClose }: SettingsProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Helper to update a single setting
  const updateSetting = useCallback(
    <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
      onChange({ [key]: value });
    },
    [onChange]
  );

  // Focus close button when modal opens
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <header className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button ref={closeButtonRef} className="close-btn" onClick={onClose} aria-label="Close settings">
            <CloseIcon />
          </button>
        </header>

        <div className="settings-content">
          {/* WPM Section */}
          <section className="setting-section">
            <h3>Reading Speed</h3>

            <div className="setting-row">
              <label htmlFor="wpm-slider">Words per minute</label>
              <div className="slider-with-value">
                <input
                  id="wpm-slider"
                  type="range"
                  min={50}
                  max={1000}
                  step={25}
                  value={settings.wordsPerMinute}
                  onChange={(e) => updateSetting('wordsPerMinute', Number(e.target.value))}
                />
                <span className="value">{settings.wordsPerMinute}</span>
              </div>
            </div>

            <div className="preset-buttons">
              {WPM_PRESETS.map((wpm) => (
                <button
                  key={wpm}
                  className={`preset-btn ${settings.wordsPerMinute === wpm ? 'active' : ''}`}
                  onClick={() => updateSetting('wordsPerMinute', wpm)}
                >
                  {wpm}
                </button>
              ))}
            </div>
          </section>

          {/* Speed Ramp-Up Section */}
          <section className="setting-section">
            <h3>Speed Ramp-Up</h3>

            <div className="setting-row toggle-row">
              <label htmlFor="rampup-toggle">Enable ramp-up</label>
              <button
                id="rampup-toggle"
                role="switch"
                aria-checked={settings.rampUpEnabled}
                className={`toggle ${settings.rampUpEnabled ? 'active' : ''}`}
                onClick={() => updateSetting('rampUpEnabled', !settings.rampUpEnabled)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {settings.rampUpEnabled && (
              <>
                <div className="setting-row">
                  <label htmlFor="rampup-start">Start WPM</label>
                  <div className="slider-with-value">
                    <input
                      id="rampup-start"
                      type="range"
                      min={50}
                      max={1000}
                      step={25}
                      value={settings.rampUpStartWpm}
                      onChange={(e) => updateSetting('rampUpStartWpm', Number(e.target.value))}
                    />
                    <span className="value">{settings.rampUpStartWpm}</span>
                  </div>
                </div>

                <div className="setting-row">
                  <label htmlFor="rampup-duration">Ramp duration</label>
                  <div className="slider-with-value">
                    <input
                      id="rampup-duration"
                      type="range"
                      min={15}
                      max={180}
                      step={15}
                      value={settings.rampUpDuration}
                      onChange={(e) => updateSetting('rampUpDuration', Number(e.target.value))}
                    />
                    <span className="value">{settings.rampUpDuration}s</span>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Display Section */}
          <section className="setting-section">
            <h3>Display</h3>

            <div className="setting-row">
              <label htmlFor="frame-count">Words shown</label>
              <div className="slider-with-value">
                <input
                  id="frame-count"
                  type="range"
                  min={1}
                  max={7}
                  step={2}
                  value={settings.frameWordCount}
                  onChange={(e) => updateSetting('frameWordCount', Number(e.target.value))}
                />
                <span className="value">{settings.frameWordCount}</span>
              </div>
            </div>
          </section>

          {/* Fade Effects Section */}
          <section className="setting-section">
            <h3>Fade Effect</h3>

            <div className="setting-row toggle-row">
              <label htmlFor="fade-toggle">Enable fade</label>
              <button
                id="fade-toggle"
                role="switch"
                aria-checked={settings.fadeEnabled}
                className={`toggle ${settings.fadeEnabled ? 'active' : ''}`}
                onClick={() => updateSetting('fadeEnabled', !settings.fadeEnabled)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {settings.fadeEnabled && (
              <div className="setting-row">
                <label htmlFor="fade-duration">Fade duration</label>
                <div className="slider-with-value">
                  <input
                    id="fade-duration"
                    type="range"
                    min={50}
                    max={300}
                    step={25}
                    value={settings.fadeDuration}
                    onChange={(e) => updateSetting('fadeDuration', Number(e.target.value))}
                  />
                  <span className="value">{settings.fadeDuration}ms</span>
                </div>
              </div>
            )}
          </section>

          {/* Punctuation Pause Section */}
          <section className="setting-section">
            <h3>Punctuation Pauses</h3>

            <div className="setting-row toggle-row">
              <label htmlFor="punct-toggle">Pause on punctuation</label>
              <button
                id="punct-toggle"
                role="switch"
                aria-checked={settings.pauseOnPunctuation}
                className={`toggle ${settings.pauseOnPunctuation ? 'active' : ''}`}
                onClick={() => updateSetting('pauseOnPunctuation', !settings.pauseOnPunctuation)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {settings.pauseOnPunctuation && (
              <div className="setting-row">
                <label htmlFor="punct-mult">Pause multiplier</label>
                <div className="slider-with-value">
                  <input
                    id="punct-mult"
                    type="range"
                    min={1}
                    max={4}
                    step={0.5}
                    value={settings.punctuationPauseMultiplier}
                    onChange={(e) =>
                      updateSetting('punctuationPauseMultiplier', Number(e.target.value))
                    }
                  />
                  <span className="value">{settings.punctuationPauseMultiplier}x</span>
                </div>
              </div>
            )}
          </section>

          {/* Long Word Adjustment Section */}
          <section className="setting-section">
            <h3>Long Word Adjustment</h3>

            <div className="setting-row">
              <label htmlFor="long-word">Extra delay per char (12+)</label>
              <div className="slider-with-value">
                <input
                  id="long-word"
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={settings.wordLengthWPMMultiplier}
                  onChange={(e) =>
                    updateSetting('wordLengthWPMMultiplier', Number(e.target.value))
                  }
                />
                <span className="value">{settings.wordLengthWPMMultiplier}%</span>
              </div>
            </div>
          </section>

          {/* Periodic Pause Section */}
          <section className="setting-section">
            <h3>Periodic Pause</h3>

            <div className="setting-row">
              <label htmlFor="pause-every">Pause every N words</label>
              <div className="slider-with-value">
                <input
                  id="pause-every"
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={settings.pauseAfterWords}
                  onChange={(e) => updateSetting('pauseAfterWords', Number(e.target.value))}
                />
                <span className="value">
                  {settings.pauseAfterWords === 0 ? 'Off' : settings.pauseAfterWords}
                </span>
              </div>
            </div>

            {settings.pauseAfterWords > 0 && (
              <div className="setting-row">
                <label htmlFor="pause-duration">Pause duration</label>
                <div className="slider-with-value">
                  <input
                    id="pause-duration"
                    type="range"
                    min={100}
                    max={2000}
                    step={100}
                    value={settings.pauseDuration}
                    onChange={(e) => updateSetting('pauseDuration', Number(e.target.value))}
                  />
                  <span className="value">{settings.pauseDuration}ms</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
