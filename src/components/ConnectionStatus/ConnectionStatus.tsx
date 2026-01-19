/**
 * Connection Status Indicator
 *
 * Shows PocketBase connection state in the UI.
 */

import { useComprehension } from '../../contexts/ComprehensionContext';
import type { ConnectionStatus as ConnectionStatusType } from '../../types/comprehension';
import './ConnectionStatus.css';

const STATUS_CONFIG: Record<ConnectionStatusType, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'status-connected' },
  disconnected: { label: 'Disconnected', className: 'status-disconnected' },
  connecting: { label: 'Connecting...', className: 'status-connecting' },
  error: { label: 'Error', className: 'status-error' },
};

export function ConnectionStatus() {
  const { connectionStatus, refreshConnection } = useComprehension();
  const config = STATUS_CONFIG[connectionStatus];

  return (
    <div className={`connection-status ${config.className}`}>
      <span className="status-indicator" />
      <span className="status-label">{config.label}</span>
      {connectionStatus === 'disconnected' && (
        <button
          className="retry-button"
          onClick={refreshConnection}
          title="Retry connection"
        >
          ↻
        </button>
      )}
    </div>
  );
}
