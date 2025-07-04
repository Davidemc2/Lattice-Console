import React, { useState } from 'react';

interface SystemInfoData {
  hostname: string;
  platform: string;
  arch: string;
  cpuCores: number;
  totalMemory: number;
  totalDisk: number;
  dockerVersion?: string;
}

interface SettingsPanelProps {
  settings: any;
  systemInfo: SystemInfoData | null;
  onSettingsUpdate: (settings: any) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  systemInfo,
  onSettingsUpdate,
}) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSettings({ ...localSettings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSettingsUpdate(localSettings);
    setSaving(false);
  };

  return (
    <div className="settings-panel" data-testid="settings">
      <h2>Agent Settings</h2>
      <div className="settings-form">
        <label>
          CPU Limit
          <input
            data-testid="cpu-limit"
            type="number"
            name="cpuLimit"
            min={1}
            max={16}
            value={localSettings.cpuLimit || ''}
            onChange={handleChange}
          />
        </label>
        <label>
          Memory Limit (MB)
          <input
            data-testid="memory-limit"
            type="number"
            name="memoryLimit"
            min={512}
            max={65536}
            value={localSettings.memoryLimit || ''}
            onChange={handleChange}
          />
        </label>
        <label>
          Availability Start
          <input
            data-testid="schedule-start"
            type="time"
            name="scheduleStart"
            value={localSettings.scheduleStart || ''}
            onChange={handleChange}
          />
        </label>
        <label>
          Availability End
          <input
            data-testid="schedule-end"
            type="time"
            name="scheduleEnd"
            value={localSettings.scheduleEnd || ''}
            onChange={handleChange}
          />
        </label>
        <button data-testid="save-settings" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saving && <div data-testid="settings-saved">Settings saved!</div>}
      </div>
      <div className="system-info-section">
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
    </div>
  );
}; 