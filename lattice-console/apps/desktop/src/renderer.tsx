import React, { useState, useEffect } from 'react';
import { AgentDashboard } from './components/AgentDashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { OnboardingWizard } from './components/OnboardingWizard';
import { SystemInfo } from './components/SystemInfo';
import './App.css';

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

export const App: React.FC = () => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ status: 'stopped' });
  const [systemInfo, setSystemInfo] = useState<SystemInfoData | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'onboarding'>('dashboard');
  const [logs, setLogs] = useState<Array<{ level: string; message: string; timestamp: Date }>>([]);

  useEffect(() => {
    // Load initial data
    loadSystemInfo();
    loadSettings();
    loadAgentStatus();

    // Setup log listener
    window.latticeAPI.agent.onLog((log) => {
      setLogs(prev => [...prev.slice(-999), { ...log, timestamp: new Date() }]);
    });

    // Cleanup
    return () => {
      window.latticeAPI.agent.removeLogListener();
    };
  }, []);

  useEffect(() => {
    // Poll agent status every 5 seconds
    const interval = setInterval(loadAgentStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemInfo = async () => {
    try {
      const info = await window.latticeAPI.system.getInfo();
      setSystemInfo(info);
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const userSettings = await window.latticeAPI.settings.get();
      setSettings(userSettings);
      if (!userSettings.onboardingComplete) {
        setCurrentView('onboarding');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadAgentStatus = async () => {
    try {
      const status = await window.latticeAPI.agent.getStatus();
      setAgentStatus(status);
    } catch (error) {
      console.error('Failed to load agent status:', error);
    }
  };

  const handleStartAgent = async () => {
    try {
      await window.latticeAPI.agent.start();
      await loadAgentStatus();
    } catch (error) {
      console.error('Failed to start agent:', error);
    }
  };

  const handleStopAgent = async () => {
    try {
      await window.latticeAPI.agent.stop();
      await loadAgentStatus();
    } catch (error) {
      console.error('Failed to stop agent:', error);
    }
  };

  const handleSettingsUpdate = async (newSettings: any) => {
    try {
      await window.latticeAPI.settings.set(newSettings);
      setSettings((prev: any) => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleOnboardingComplete = async (onboardingData: any) => {
    const updatedSettings = {
      ...settings,
      ...onboardingData,
      onboardingComplete: true,
    };
    await handleSettingsUpdate(updatedSettings);
    setCurrentView('dashboard');
  };

  if (currentView === 'onboarding') {
    return (
      <OnboardingWizard
        systemInfo={systemInfo}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-title">
          <h1>Lattice Console</h1>
          <div className={`status-indicator ${agentStatus.status}`}>
            {agentStatus.status}
          </div>
        </div>
        <div className="app-navigation">
          <button
            className={currentView === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={currentView === 'settings' ? 'active' : ''}
            onClick={() => setCurrentView('settings')}
          >
            Settings
          </button>
        </div>
      </div>
      <div className="app-content">
        {currentView === 'dashboard' && (
          <AgentDashboard
            agentStatus={agentStatus}
            systemInfo={systemInfo}
            logs={logs}
            settings={settings}
            onStartAgent={handleStartAgent}
            onStopAgent={handleStopAgent}
          />
        )}
        {currentView === 'settings' && (
          <SettingsPanel
            settings={settings}
            systemInfo={systemInfo}
            onSettingsUpdate={handleSettingsUpdate}
          />
        )}
      </div>
    </div>
  );
};

// Render the app
import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} 