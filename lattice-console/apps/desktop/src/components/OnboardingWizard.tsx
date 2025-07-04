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

interface OnboardingWizardProps {
  systemInfo: SystemInfoData | null;
  onComplete: (data: any) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  systemInfo,
  onComplete,
}) => {
  const [hostname, setHostname] = useState(systemInfo?.hostname || '');
  const [resourceTier, setResourceTier] = useState('small');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    onComplete({ hostname, resourceTier, agree });
  };

  return (
    <div className="onboarding-wizard" data-testid="onboarding">
      <h2>Welcome to Lattice Console</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Hostname
          <input
            data-testid="hostname-input"
            type="text"
            value={hostname}
            onChange={e => setHostname(e.target.value)}
            required
          />
        </label>
        <label>
          Resource Tier
          <select
            data-testid="resource-tier"
            value={resourceTier}
            onChange={e => setResourceTier(e.target.value)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label>
          <input
            data-testid="agree-terms"
            type="checkbox"
            checked={agree}
            onChange={e => setAgree(e.target.checked)}
            required
          />
          I agree to the terms and conditions
        </label>
        <button data-testid="complete-onboarding" type="submit" disabled={submitting || !agree}>
          {submitting ? 'Completing...' : 'Complete Onboarding'}
        </button>
      </form>
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