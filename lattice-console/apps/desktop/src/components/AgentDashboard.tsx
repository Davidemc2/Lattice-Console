import React from 'react';

interface AgentStatus {
  status: 'stopped' | 'starting' | 'running' | 'error';
  pid?: number;
  uptime?: number;
  lastError?: string;
}

interface SystemInfoData {
  hostname: string;
  platform: string;
  arch: string;
  cpuCores: number;
  totalMemory: number;
  totalDisk: number;
  dockerVersion?: string;
}

interface AgentDashboardProps {
  agentStatus: AgentStatus;
  systemInfo: SystemInfoData | null;
  logs: Array<{ level: string; message: string; timestamp: Date }>;
  settings: any;
  onStartAgent: () => void;
  onStopAgent: () => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  agentStatus,
  systemInfo,
  logs,
  settings,
  onStartAgent,
  onStopAgent,
}) => {
  return (
    <div className="agent-dashboard" data-testid="dashboard">
      <div className="status-section">
        <h2>Agent Status</h2>
        <div data-testid="agent-status" className={`status-badge ${agentStatus.status}`}>
          {agentStatus.status}
        </div>
        {agentStatus.status === 'error' && (
          <div className="error-message">{agentStatus.lastError}</div>
        )}
        <div className="status-controls">
          {agentStatus.status !== 'running' ? (
            <button data-testid="start-agent" onClick={onStartAgent}>
              Start Agent
            </button>
          ) : (
            <button data-testid="stop-agent" onClick={onStopAgent}>
              Stop Agent
            </button>
          )}
        </div>
        {agentStatus.pid && (
          <div className="status-detail">PID: {agentStatus.pid}</div>
        )}
        {agentStatus.uptime && (
          <div className="status-detail">Uptime: {Math.floor((Date.now() - agentStatus.uptime) / 1000)}s</div>
        )}
      </div>
      <div className="system-section">
        <h3>System Info</h3>
        {systemInfo ? (
          <ul>
            <li>Hostname: {systemInfo.hostname}</li>
            <li>Platform: {systemInfo.platform}</li>
            <li>Arch: {systemInfo.arch}</li>
            <li>CPU Cores: {systemInfo.cpuCores}</li>
            <li>Total Memory: {systemInfo.totalMemory} MB</li>
            <li>Total Disk: {systemInfo.totalDisk} GB</li>
            <li>Docker: {systemInfo.dockerVersion}</li>
          </ul>
        ) : (
          <div>Loading system info...</div>
        )}
      </div>
      <div className="logs-section">
        <h3>Agent Logs</h3>
        <div className="logs-viewer" data-testid="log-viewer">
          {logs.length === 0 && <div>No logs yet.</div>}
          {logs.map((log, i) => (
            <div key={i} className={`log-line ${log.level}`} data-testid="log-line">
              <span className="log-timestamp">{log.timestamp.toLocaleTimeString()}</span> [{log.level}] {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 