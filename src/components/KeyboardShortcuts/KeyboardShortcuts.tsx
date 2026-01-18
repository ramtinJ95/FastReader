import './KeyboardShortcuts.css';

const shortcuts = [
  { key: 'Space', action: 'Play/Pause' },
  { key: 'Esc', action: 'Stop' },
  { key: 'G', action: 'Jump to' },
  { key: 'S', action: 'Settings' },
  { key: 'T', action: 'Load text' },
  { key: '↑/↓', action: 'WPM' },
  { key: '←/→', action: 'Skip' },
  { key: 'Ctrl+S', action: 'Save' },
];

export function KeyboardShortcuts() {
  return (
    <div className="keyboard-shortcuts">
      {shortcuts.map(({ key, action }) => (
        <span key={key} className="shortcut">
          <kbd>{key}</kbd>
          <span className="shortcut-action">{action}</span>
        </span>
      ))}
    </div>
  );
}

export default KeyboardShortcuts;
