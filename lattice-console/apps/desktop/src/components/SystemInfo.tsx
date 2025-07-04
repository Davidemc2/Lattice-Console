import React from 'react';

interface SystemInfoData {
  hostname: string;
  platform: string;
  arch: string;
  cpuCores: number;
  totalMemory: number;
  totalDisk: number;
  dockerVersion?: string;
}

export const SystemInfo: React.FC<{ info: SystemInfoData | null }> = ({ info }) => {
  if (!info) return <div>Loading system info...</div>;
  return (
    <div className="system-info" data-testid="system-info">
      <ul>
        <li data-testid="hostname">Hostname: {info.hostname}</li>
        <li data-testid="platform">Platform: {info.platform}</li>
        <li data-testid="arch">Arch: {info.arch}</li>
        <li data-testid="cpu-cores">CPU Cores: {info.cpuCores}</li>
        <li data-testid="total-memory">Total Memory: {info.totalMemory} MB</li>
        <li data-testid="total-disk">Total Disk: {info.totalDisk} GB</li>
        <li data-testid="docker-version">Docker: {info.dockerVersion}</li>
      </ul>
    </div>
  );
}; 