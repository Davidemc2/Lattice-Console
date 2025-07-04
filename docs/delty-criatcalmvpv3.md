Perfect! Let me create a comprehensive completion plan with detailed schematics and step-by-step instructions for Cursor to execute the final implementation steps.

<tool_use name="create_project_document">
<document_name>MVP Completion Guide</document_name>
<document_content_markdown># MVP Completion Guide
## Lattice Console: Final Implementation & Launch Plan

**Version**: 1.0  
**Date**: January 2025  
**Purpose**: Complete step-by-step guide to finish MVP and launch  
**Target**: Production-ready 100-node platform  
**Execution**: Cursor AI implementation ready  

---

## 1. Current Implementation Status Assessment

### ✅ **Confirmed Complete Components**
- **Agent DockerService**: Full container lifecycle management
- **Agent TunnelService**: Multi-provider public URL generation  
- **Agent CronService**: Background job scheduling
- **Backend tRPC API**: Type-safe routes and authentication
- **Frontend LogViewer**: Real-time log streaming with pagination
- **Database Schema**: Complete Prisma setup with migrations
- **Project Infrastructure**: Monorepo, Docker, CI/CD foundation

### ⚠️ **Components Requiring Completion**
- **Desktop App Integration**: System tray and agent management
- **Frontend Dashboard**: Workload deployment forms and monitoring
- **End-to-End Workflows**: Complete user journeys
- **Production Deployment**: Scalable infrastructure setup
- **Integration Testing**: Automated E2E test coverage

---

## 2. System Architecture Overview

:::plantuml
@startuml
!define RECTANGLE class

actor "Provider" as provider
actor "Consumer" as consumer

package "Desktop App" {
  RECTANGLE "Electron Main" as main
  RECTANGLE "System Tray" as tray
  RECTANGLE "Agent Manager" as manager
}

package "Web Dashboard" {
  RECTANGLE "Next.js Frontend" as frontend
  RECTANGLE "Deployment Forms" as forms
  RECTANGLE "Monitoring Views" as monitor
}

package "Backend Services" {
  RECTANGLE "tRPC API" as api
  RECTANGLE "Workload Scheduler" as scheduler
  RECTANGLE "Auth Service" as auth
  database "PostgreSQL" as db
}

package "Agent Node" {
  RECTANGLE "Docker Service" as docker
  RECTANGLE "Build Service" as build
  RECTANGLE "Tunnel Service" as tunnel
  RECTANGLE "Cron Service" as cron
}

package "External Services" {
  RECTANGLE "Git Repositories" as git
  RECTANGLE "Docker Registry" as registry
  RECTANGLE "Tunnel Providers" as tunnels
}

provider --> main : Download & Install
main --> manager : Launch Agent
manager --> docker : Manage Containers

consumer --> frontend : Deploy Workloads
frontend --> api : tRPC Calls
api --> scheduler : Orchestrate
scheduler --> docker : Deploy

docker --> git : Clone Repo
build --> registry : Push Images
tunnel --> tunnels : Create Public URLs

api --> db : Store Data
monitor --> api : Real-time Updates

@enduml
:::

---

## 3. Phase 1: Desktop App Completion (Week 1)

### 3.1 Electron Main Process Implementation

**File**: `apps/desktop/src/main/main.ts`

```typescript
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell, autoUpdater } from 'electron';
import { join } from 'path';
import { Agent } from '../../../agent/src/Agent';
import { SystemInfo } from '../../../agent/src/utils/SystemInfo';
import { logger } from '../../../agent/src/utils/logger';
import { spawn, ChildProcess } from 'child_process';

interface AgentStatus {
  status: 'stopped' | 'starting' | 'running' | 'error';
  pid?: number;
  uptime?: number;
  lastError?: string;
}

class LatticeDesktopApp {
  private mainWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private agentProcess: ChildProcess | null = null;
  private agentStatus: AgentStatus = { status: 'stopped' };
  private systemInfo: SystemInfo;
  private isQuitting = false;
  private userData: any = {};

  constructor() {
    this.systemInfo = new SystemInfo();
    this.setupAppDefaults();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Lattice Desktop App...');

    // Wait for app ready
    await app.whenReady();

    // Create system tray first (always visible)
    this.createSystemTray();

    // Setup IPC handlers
    this.setupIPC();

    // Check for existing agent installation
    await this.checkAgentInstallation();

    // Setup auto-updater
    this.setupAutoUpdater();

    // Setup app event handlers
    this.setupAppEvents();

    // Start agent if configured
    if (this.userData.autoStartAgent) {
      await this.startAgent();
    }

    logger.info('Desktop app initialized successfully');
  }

  private setupAppDefaults(): void {
    app.setName('Lattice Console');
    app.setAppUserModelId('com.lattice.console');
    
    // Handle certificate errors for development
    app.commandLine.appendSwitch('ignore-certificate-errors');
    
    // Single instance lock
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
      return;
    }
  }

  private createSystemTray(): void {
    const iconPath = this.getIconPath('tray-icon.png');
    this.tray = new Tray(nativeImage.createFromPath(iconPath));

    this.updateTrayMenu();
    this.updateTrayTooltip();

    this.tray.on('click', () => {
      this.showMainWindow();
    });

    this.tray.on('right-click', () => {
      this.tray?.popUpContextMenu();
    });
  }

  private updateTrayMenu(): void {
    if (!this.tray) return;

    const template = [
      {
        label: `Lattice Console - ${this.agentStatus.status}`,
        enabled: false,
      },
      { type: 'separator' as const },
      {
        label: 'Open Dashboard',
        click: () => this.showMainWindow(),
      },
      {
        label: 'Agent Settings',
        click: () => this.showSettingsWindow(),
      },
      { type: 'separator' as const },
      {
        label: this.agentStatus.status === 'running' ? 'Stop Agent' : 'Start Agent',
        click: () => this.toggleAgent(),
      },
      {
        label: 'View Logs',
        click: () => this.showLogs(),
      },
      { type: 'separator' as const },
      {
        label: 'About',
        click: () => this.showAbout(),
      },
      {
        label: 'Quit',
        click: () => this.quit(),
      },
    ];

    this.tray.setContextMenu(Menu.buildFromTemplate(template));
  }

  private updateTrayTooltip(): void {
    if (!this.tray) return;

    let tooltip = 'Lattice Console';
    
    if (this.agentStatus.status === 'running') {
      const uptime = this.agentStatus.uptime ? Math.floor(this.agentStatus.uptime / 1000) : 0;
      tooltip += `\nAgent: Running (${uptime}s)`;
    } else {
      tooltip += `\nAgent: ${this.agentStatus.status}`;
    }

    this.tray.setToolTip(tooltip);
  }

  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/preload.js'),
      },
      icon: this.getIconPath('app-icon.png'),
      show: false,
      titleBarStyle: 'default',
      autoHideMenuBar: true,
    });

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3002');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private showSettingsWindow(): void {
    if (this.settingsWindow) {
      this.settingsWindow.show();
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 600,
      height: 500,
      resizable: false,
      modal: true,
      parent: this.mainWindow || undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/preload.js'),
      },
      icon: this.getIconPath('app-icon.png'),
    });

    if (process.env.NODE_ENV === 'development') {
      this.settingsWindow.loadURL('http://localhost:3002/settings');
    } else {
      this.settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'));
    }

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  private async toggleAgent(): Promise<void> {
    if (this.agentStatus.status === 'running') {
      await this.stopAgent();
    } else {
      await this.startAgent();
    }
  }

  private async startAgent(): Promise<void> {
    if (this.agentStatus.status === 'running' || this.agentStatus.status === 'starting') {
      return;
    }

    logger.info('Starting agent process...');
    this.agentStatus = { status: 'starting' };
    this.updateTrayMenu();
    this.updateTrayTooltip();

    try {
      // Verify agent binary exists
      const agentPath = this.getAgentBinaryPath();
      
      // Start agent process
      this.agentProcess = spawn(agentPath, [], {
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          LATTICE_DESKTOP_MODE: 'true',
        },
      });

      // Handle agent process events
      this.agentProcess.on('spawn', () => {
        logger.info(`Agent process started with PID: ${this.agentProcess?.pid}`);
        this.agentStatus = {
          status: 'running',
          pid: this.agentProcess?.pid,
          uptime: Date.now(),
        };
        this.updateTrayMenu();
        this.updateTrayTooltip();
      });

      this.agentProcess.on('error', (error) => {
        logger.error('Agent process error:', error);
        this.agentStatus = {
          status: 'error',
          lastError: error.message,
        };
        this.updateTrayMenu();
        this.updateTrayTooltip();
      });

      this.agentProcess.on('exit', (code, signal) => {
        logger.info(`Agent process exited with code ${code}, signal ${signal}`);
        this.agentStatus = { status: 'stopped' };
        this.agentProcess = null;
        this.updateTrayMenu();
        this.updateTrayTooltip();
      });

      // Stream logs
      this.agentProcess.stdout?.on('data', (data) => {
        const logLine = data.toString().trim();
        if (logLine) {
          this.sendToRenderer('agent-log', { level: 'info', message: logLine });
        }
      });

      this.agentProcess.stderr?.on('data', (data) => {
        const logLine = data.toString().trim();
        if (logLine) {
          this.sendToRenderer('agent-log', { level: 'error', message: logLine });
        }
      });

    } catch (error) {
      logger.error('Failed to start agent:', error);
      this.agentStatus = {
        status: 'error',
        lastError: error.message,
      };
      this.updateTrayMenu();
      this.updateTrayTooltip();
    }
  }

  private async stopAgent(): Promise<void> {
    if (!this.agentProcess || this.agentStatus.status === 'stopped') {
      return;
    }

    logger.info('Stopping agent process...');

    try {
      // Send SIGTERM for graceful shutdown
      this.agentProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill if not responding
          if (this.agentProcess) {
            this.agentProcess.kill('SIGKILL');
          }
          resolve();
        }, 10000); // 10 second timeout

        this.agentProcess?.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.agentStatus = { status: 'stopped' };
      this.agentProcess = null;
      this.updateTrayMenu();
      this.updateTrayTooltip();

    } catch (error) {
      logger.error('Failed to stop agent:', error);
    }
  }

  private setupIPC(): void {
    // Agent management
    ipcMain.handle('agent:start', () => this.startAgent());
    ipcMain.handle('agent:stop', () => this.stopAgent());
    ipcMain.handle('agent:status', () => this.agentStatus);

    // System information
    ipcMain.handle('system:info', async () => {
      return await this.systemInfo.gather();
    });

    // Settings management
    ipcMain.handle('settings:get', () => this.userData);
    ipcMain.handle('settings:set', (_, settings) => {
      this.userData = { ...this.userData, ...settings };
      this.saveUserData();
    });

    // File operations
    ipcMain.handle('file:selectFolder', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });
      return result.filePaths[0];
    });

    // External links
    ipcMain.handle('shell:openExternal', (_, url) => {
      shell.openExternal(url);
    });

    // App control
    ipcMain.handle('app:quit', () => this.quit());
    ipcMain.handle('app:minimize', () => {
      this.mainWindow?.minimize();
    });
    ipcMain.handle('app:hide', () => {
      this.mainWindow?.hide();
    });
  }

  private async checkAgentInstallation(): Promise<void> {
    try {
      const agentPath = this.getAgentBinaryPath();
      // Check if agent binary exists and is executable
      // Implementation depends on your agent distribution method
    } catch (error) {
      logger.warn('Agent binary not found, may need installation');
    }
  }

  private setupAutoUpdater(): void {
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    autoUpdater.setFeedURL({
      url: 'https://your-update-server.com/updates',
      headers: {
        'User-Agent': `Lattice Console ${app.getVersion()}`,
      },
    });

    autoUpdater.on('update-available', () => {
      logger.info('Update available');
    });

    autoUpdater.on('update-downloaded', () => {
      logger.info('Update downloaded');
      // Notify user about update
    });

    // Check for updates every hour
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 3600000);
  }

  private setupAppEvents(): void {
    app.on('window-all-closed', () => {
      // On macOS, keep app running even when all windows are closed
      if (process.platform !== 'darwin') {
        // Don't quit if agent is running
        if (this.agentStatus.status !== 'running') {
          app.quit();
        }
      }
    });

    app.on('activate', () => {
      this.showMainWindow();
    });

    app.on('before-quit', async () => {
      this.isQuitting = true;
      await this.stopAgent();
    });

    app.on('second-instance', () => {
      this.showMainWindow();
    });
  }

  private showLogs(): void {
    // Open logs in default text editor or show in a window
    const logPath = logger.getLogFilePath?.() || '/tmp/lattice-agent.log';
    shell.openPath(logPath);
  }

  private showAbout(): void {
    dialog.showMessageBox({
      type: 'info',
      title: 'About Lattice Console',
      message: 'Lattice Console',
      detail: `Version: ${app.getVersion()}\nDecentralized Cloud Platform\n\n© 2025 Lattice Console`,
      buttons: ['OK'],
    });
  }

  private quit(): void {
    this.isQuitting = true;
    app.quit();
  }

  private getIconPath(filename: string): string {
    return join(__dirname, '../assets', filename);
  }

  private getAgentBinaryPath(): string {
    // This depends on how you package the agent
    if (process.env.NODE_ENV === 'development') {
      return join(__dirname, '../../../agent/dist/index.js');
    }
    return join(process.resourcesPath, 'agent', 'lattice-agent');
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  private saveUserData(): void {
    // Save user preferences to local storage
    // Implementation depends on your preference storage method
  }
}

// Initialize and start the app
const latticeApp = new LatticeDesktopApp();
latticeApp.initialize().catch((error) => {
  logger.error('Failed to initialize desktop app:', error);
  app.quit();
});
```

### 3.2 Electron Preload Script

**File**: `apps/desktop/src/preload/preload.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('latticeAPI', {
  // Agent management
  agent: {
    start: () => ipcRenderer.invoke('agent:start'),
    stop: () => ipcRenderer.invoke('agent:stop'),
    getStatus: () => ipcRenderer.invoke('agent:status'),
    onLog: (callback: (log: { level: string; message: string }) => void) => {
      ipcRenderer.on('agent-log', (_, log) => callback(log));
    },
    removeLogListener: () => {
      ipcRenderer.removeAllListeners('agent-log');
    },
  },

  // System information
  system: {
    getInfo: () => ipcRenderer.invoke('system:info'),
  },

  // Settings management
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings: any) => ipcRenderer.invoke('settings:set', settings),
  },

  // File operations
  file: {
    selectFolder: () => ipcRenderer.invoke('file:selectFolder'),
  },

  // External operations
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // App control
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    hide: () => ipcRenderer.invoke('app:hide'),
  },
});

// Type definitions for the exposed API
declare global {
  interface Window {
    latticeAPI: {
      agent: {
        start: () => Promise<void>;
        stop: () => Promise<void>;
        getStatus: () => Promise<{
          status: 'stopped' | 'starting' | 'running' | 'error';
          pid?: number;
          uptime?: number;
          lastError?: string;
        }>;
        onLog: (callback: (log: { level: string; message: string }) => void) => void;
        removeLogListener: () => void;
      };
      system: {
        getInfo: () => Promise<{
          hostname: string;
          platform: string;
          arch: string;
          cpuCores: number;
          totalMemory: number;
          totalDisk: number;
          dockerVersion?: string;
        }>;
      };
      settings: {
        get: () => Promise<any>;
        set: (settings: any) => Promise<void>;
      };
      file: {
        selectFolder: () => Promise<string>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
      };
      app: {
        quit: () => Promise<void>;
        minimize: () => Promise<void>;
        hide: () => Promise<void>;
      };
    };
  }
}
```

### 3.3 React Renderer App

**File**: `apps/desktop/src/renderer/App.tsx`

```typescript
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
      
      // Check if onboarding is complete
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
      setSettings(prev => ({ ...prev, ...newSettings }));
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
```

---

## 4. Phase 2: Frontend Dashboard Completion (Week 2)

### 4.1 Workload Deployment Forms

**File**: `apps/frontend/src/components/WorkloadDeployForm.tsx`

```typescript
import React, { useState } from 'react';
import { trpc } from '../lib/trpc';

interface WorkloadDeployFormProps {
  onSuccess: (workload: any) => void;
  onCancel: () => void;
}

type WorkloadType = 'postgresql' | 'redis' | 'minio' | 'nodejs' | 'python' | 'static';

interface FormData {
  type: WorkloadType;
  name: string;
  // PostgreSQL specific
  postgres?: {
    version: string;
    database: string;
    username: string;
    password: string;
  };
  // Redis specific
  redis?: {
    version: string;
    password: string;
  };
  // MinIO specific
  minio?: {
    accessKey: string;
    secretKey: string;
    buckets: string[];
  };
  // Code deployment specific
  deployment?: {
    gitUrl: string;
    gitBranch: string;
    env: Record<string, string>;
  };
  // Resource requirements
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export const WorkloadDeployForm: React.FC<WorkloadDeployFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<FormData>({
    type: 'postgresql',
    name: '',
    resources: {
      cpu: 1,
      memory: 512,
      disk: 10,
    },
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deployPostgreSQL = trpc.workload.deployPostgreSQL.useMutation();
  const deployRedis = trpc.workload.deployRedis.useMutation();
  const deployMinIO = trpc.workload.deployMinIO.useMutation();
  const deployNodeJS = trpc.workload.deployNodeJS.useMutation();
  const deployPython = trpc.workload.deployPython.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    setError(null);

    try {
      let result;

      switch (formData.type) {
        case 'postgresql':
          result = await deployPostgreSQL.mutateAsync({
            name: formData.name,
            version: formData.postgres?.version || '15',
            database: formData.postgres?.database || formData.name,
            username: formData.postgres?.username || 'lattice',
            password: formData.postgres?.password,
            resources: formData.resources,
          });
          break;

        case 'redis':
          result = await deployRedis.mutateAsync({
            name: formData.name,
            version: formData.redis?.version || '7',
            password: formData.redis?.password,
            resources: formData.resources,
          });
          break;

        case 'minio':
          result = await deployMinIO.mutateAsync({
            name: formData.name,
            accessKey: formData.minio?.accessKey || '',
            secretKey: formData.minio?.secretKey || '',
            buckets: formData.minio?.buckets || [],
            resources: formData.resources,
          });
          break;

        case 'nodejs':
          result = await deployNodeJS.mutateAsync({
            name: formData.name,
            gitUrl: formData.deployment?.gitUrl || '',
            gitBranch: formData.deployment?.gitBranch || 'main',
            env: formData.deployment?.env || {},
            resources: formData.resources,
          });
          break;

        case 'python':
          result = await deployPython.mutateAsync({
            name: formData.name,
            gitUrl: formData.deployment?.gitUrl || '',
            gitBranch: formData.deployment?.gitBranch || 'main',
            env: formData.deployment?.env || {},
            resources: formData.resources,
          });
          break;

        default:
          throw new Error(`Unsupported workload type: ${formData.type}`);
      }

      onSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'postgresql':
        return (
          <div className="form-section">
            <h3>PostgreSQL Configuration</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Version</label>
                <select
                  value={formData.postgres?.version || '15'}
                  onChange={(e) => updateFormData({
                    postgres: { ...formData.postgres, version: e.target.value }
                  })}
                >
                  <option value="15">PostgreSQL 15</option>
                  <option value="14">PostgreSQL 14</option>
                  <option value="13">PostgreSQL 13</option>
                </select>
              </div>
              
              <div className="form-field">
                <label>Database Name</label>
                <input
                  type="text"
                  value={formData.postgres?.database || formData.name}
                  onChange={(e) => updateFormData({
                    postgres: { ...formData.postgres, database: e.target.value }
                  })}
                  placeholder="Database name"
                />
              </div>
              
              <div className="form-field">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.postgres?.username || 'lattice'}
                  onChange={(e) => updateFormData({
                    postgres: { ...formData.postgres, username: e.target.value }
                  })}
                  placeholder="Database username"
                />
              </div>
              
              <div className="form-field">
                <label>Password (optional)</label>
                <input
                  type="password"
                  value={formData.postgres?.password || ''}
                  onChange={(e) => updateFormData({
                    postgres: { ...formData.postgres, password: e.target.value }
                  })}
                  placeholder="Leave empty for auto-generated"
                />
              </div>
            </div>
          </div>
        );

      case 'redis':
        return (
          <div className="form-section">
            <h3>Redis Configuration</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Version</label>
                <select
                  value={formData.redis?.version || '7'}
                  onChange={(e) => updateFormData({
                    redis: { ...formData.redis, version: e.target.value }
                  })}
                >
                  <option value="7">Redis 7</option>
                  <option value="6">Redis 6</option>
                </select>
              </div>
              
              <div className="form-field">
                <label>Password (optional)</label>
                <input
                  type="password"
                  value={formData.redis?.password || ''}
                  onChange={(e) => updateFormData({
                    redis: { ...formData.redis, password: e.target.value }
                  })}
                  placeholder="Leave empty for auto-generated"
                />
              </div>
            </div>
          </div>
        );

      case 'nodejs':
      case 'python':
        return (
          <div className="form-section">
            <h3>Code Deployment</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Git Repository URL</label>
                <input
                  type="url"
                  value={formData.deployment?.gitUrl || ''}
                  onChange={(e) => updateFormData({
                    deployment: { ...formData.deployment, gitUrl: e.target.value }
                  })}
                  placeholder="https://github.com/user/repo.git"
                  required
                />
              </div>
              
              <div className="form-field">
                <label>Branch</label>
                <input
                  type="text"
                  value={formData.deployment?.gitBranch || 'main'}
                  onChange={(e) => updateFormData({
                    deployment: { ...formData.deployment, gitBranch: e.target.value }
                  })}
                  placeholder="main"
                />
              </div>
              
              <div className="form-field">
                <label>Environment Variables</label>
                <EnvironmentVariablesEditor
                  env={formData.deployment?.env || {}}
                  onChange={(env) => updateFormData({
                    deployment: { ...formData.deployment, env }
                  })}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="workload-deploy-form">
      <div className="form-header">
        <h2>Deploy New Workload</h2>
        <button className="close-button" onClick={onCancel}>×</button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Workload Type</label>
              <select
                value={formData.type}
                onChange={(e) => updateFormData({ type: e.target.value as WorkloadType })}
              >
                <option value="postgresql">PostgreSQL Database</option>
                <option value="redis">Redis Cache</option>
                <option value="minio">MinIO S3 Storage</option>
                <option value="nodejs">Node.js Application</option>
                <option value="python">Python Application</option>
                <option value="static">Static Website</option>
              </select>
            </div>
            
            <div className="form-field">
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="my-workload"
                required
              />
            </div>
          </div>
        </div>

        {renderTypeSpecificFields()}

        <div className="form-section">
          <h3>Resource Requirements</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>CPU Cores</label>
              <input
                type="number"
                min="0.1"
                max="8"
                step="0.1"
                value={formData.resources.cpu}
                onChange={(e) => updateFormData({
                  resources: { ...formData.resources, cpu: parseFloat(e.target.value) }
                })}
              />
            </div>
            
            <div className="form-field">
              <label>Memory (MB)</label>
              <input
                type="number"
                min="128"
                max="16384"
                step="128"
                value={formData.resources.memory}
                onChange={(e) => updateFormData({
                  resources: { ...formData.resources, memory: parseInt(e.target.value) }
                })}
              />
            </div>
            
            <div className="form-field">
              <label>Disk (GB)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.resources.disk}
                onChange={(e) => updateFormData({
                  resources: { ...formData.resources, disk: parseInt(e.target.value) }
                })}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" disabled={isDeploying}>
            {isDeploying ? 'Deploying...' : 'Deploy Workload'}
          </button>
        </div>
      </form>
    </div>
  );
};

const EnvironmentVariablesEditor: React.FC<{
  env: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
}> = ({ env, onChange }) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const addVariable = () => {
    if (newKey && newValue) {
      onChange({ ...env, [newKey]: newValue });
      setNewKey('');
      setNewValue('');
    }
  };

  const removeVariable = (key: string) => {
    const newEnv = { ...env };
    delete newEnv[key];
    onChange(newEnv);
  };

  return (
    <div className="env-editor">
      {Object.entries(env).map(([key, value]) => (
        <div key={key} className="env-var">
          <span className="env-key">{key}</span>
          <span className="env-value">{value}</span>
          <button type="button" onClick={() => removeVariable(key)}>×</button>
        </div>
      ))}
      
      <div className="env-add">
        <input
          type="text"
          placeholder="Key"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <input
          type="text"
          placeholder="Value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <button type="button" onClick={addVariable}>Add</button>
      </div>
    </div>
  );
};
```

### 4.2 Workload Management Dashboard

**File**: `apps/frontend/src/components/WorkloadDashboard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import { WorkloadDeployForm } from './WorkloadDeployForm';
import { LogViewer } from './LogViewer';

interface Workload {
  id: string;
  name: string;
  type: string;
  status: string;
  publicUrl?: string;
  credentials?: Record<string, string>;
  createdAt: string;
  agent: {
    id: string;
    hostname: string;
    status: string;
  };
}

export const WorkloadDashboard: React.FC = () => {
  const [selectedWorkload, setSelectedWorkload] = useState<Workload | null>(null);
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const { data: workloads, refetch: refetchWorkloads } = trpc.workload.list.useQuery();
  const stopWorkload = trpc.workload.stop.useMutation();
  const deleteWorkload = trpc.workload.delete.useMutation();

  // Auto-refresh workloads every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchWorkloads();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchWorkloads]);

  const handleStopWorkload = async (workload: Workload) => {
    try {
      await stopWorkload.mutateAsync({ workloadId: workload.id });
      await refetchWorkloads();
    } catch (error) {
      console.error('Failed to stop workload:', error);
    }
  };

  const handleDeleteWorkload = async (workload: Workload) => {
    if (confirm(`Are you sure you want to delete "${workload.name}"?`)) {
      try {
        await deleteWorkload.mutateAsync({ workloadId: workload.id });
        await refetchWorkloads();
        if (selectedWorkload?.id === workload.id) {
          setSelectedWorkload(null);
        }
      } catch (error) {
        console.error('Failed to delete workload:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running': return 'green';
      case 'pending': case 'building': case 'deploying': return 'orange';
      case 'stopped': return 'gray';
      case 'error': case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="workload-dashboard">
      <div className="dashboard-header">
        <h1>Workloads</h1>
        <button 
          className="deploy-button"
          onClick={() => setShowDeployForm(true)}
        >
          Deploy New Workload
        </button>
      </div>

      <div className="dashboard-content">
        <div className="workloads-list">
          <div className="workloads-grid">
            {workloads?.map((workload) => (
              <div
                key={workload.id}
                className={`workload-card ${selectedWorkload?.id === workload.id ? 'selected' : ''}`}
                onClick={() => setSelectedWorkload(workload)}
              >
                <div className="workload-header">
                  <h3>{workload.name}</h3>
                  <div 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(workload.status) }}
                  >
                    {workload.status}
                  </div>
                </div>
                
                <div className="workload-details">
                  <div className="detail-row">
                    <span className="label">Type:</span>
                    <span className="value">{workload.type}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Agent:</span>
                    <span className="value">{workload.agent.hostname}</span>
                  </div>
                  
                  {workload.publicUrl && (
                    <div className="detail-row">
                      <span className="label">URL:</span>
                      <span 
                        className="value link"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(workload.publicUrl, '_blank');
                        }}
                      >
                        {workload.publicUrl}
                      </span>
                    </div>
                  )}
                  
                  <div className="detail-row">
                    <span className="label">Created:</span>
                    <span className="value">
                      {new Date(workload.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="workload-actions">
                  <button
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWorkload(workload);
                      setShowLogs(true);
                    }}
                  >
                    Logs
                  </button>
                  
                  {workload.status === 'running' && (
                    <button
                      className="action-button stop"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopWorkload(workload);
                      }}
                    >
                      Stop
                    </button>
                  )}
                  
                  <button
                    className="action-button delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkload(workload);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!workloads?.length && (
            <div className="empty-state">
              <h3>No workloads deployed</h3>
              <p>Deploy your first workload to get started</p>
              <button onClick={() => setShowDeployForm(true)}>
                Deploy Workload
              </button>
            </div>
          )}
        </div>

        {selectedWorkload && (
          <div className="workload-details-panel">
            <div className="panel-header">
              <h2>{selectedWorkload.name}</h2>
              <button 
                className="close-button"
                onClick={() => setSelectedWorkload(null)}
              >
                ×
              </button>
            </div>

            <div className="panel-content">
              <div className="info-section">
                <h3>Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Status</label>
                    <span className={`status ${selectedWorkload.status}`}>
                      {selectedWorkload.status}
                    </span>
                  </div>
                  
                  <div className="info-item">
                    <label>Type</label>
                    <span>{selectedWorkload.type}</span>
                  </div>
                  
                  <div className="info-item">
                    <label>Agent</label>
                    <span>{selectedWorkload.agent.hostname}</span>
                  </div>
                  
                  <div className="info-item">
                    <label>Created</label>
                    <span>{new Date(selectedWorkload.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedWorkload.publicUrl && (
                <div className="access-section">
                  <h3>Access</h3>
                  <div className="access-item">
                    <label>Public URL</label>
                    <div className="url-container">
                      <span>{selectedWorkload.publicUrl}</span>
                      <button onClick={() => copyToClipboard(selectedWorkload.publicUrl!)}>
                        Copy
                      </button>
                      <button onClick={() => window.open(selectedWorkload.publicUrl, '_blank')}>
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedWorkload.credentials && (
                <div className="credentials-section">
                  <h3>Credentials</h3>
                  <div className="credentials-grid">
                    {Object.entries(selectedWorkload.credentials).map(([key, value]) => (
                      <div key={key} className="credential-item">
                        <label>{key}</label>
                        <div className="credential-value">
                          <span>{key.toLowerCase().includes('password') ? '••••••••' : value}</span>
                          <button onClick={() => copyToClipboard(value)}>
                            Copy
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="actions-section">
                <button
                  className="action-button"
                  onClick={() => setShowLogs(true)}
                >
                  View Logs
                </button>
                
                {selectedWorkload.status === 'running' && (
                  <button
                    className="action-button stop"
                    onClick={() => handleStopWorkload(selectedWorkload)}
                  >
                    Stop Workload
                  </button>
                )}
                
                <button
                  className="action-button delete"
                  onClick={() => handleDeleteWorkload(selectedWorkload)}
                >
                  Delete Workload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeployForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <WorkloadDeployForm
              onSuccess={(workload) => {
                setShowDeployForm(false);
                setSelectedWorkload(workload);
                refetchWorkloads();
              }}
              onCancel={() => setShowDeployForm(false)}
            />
          </div>
        </div>
      )}

      {showLogs && selectedWorkload && (
        <div className="modal-overlay">
          <div className="modal-content logs-modal">
            <LogViewer
              workloadId={selectedWorkload.id}
              onClose={() => setShowLogs(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 5. Phase 3: End-to-End Integration Testing (Week 3)

### 5.1 E2E Test Suite Setup

**File**: `tests/e2e/complete-user-journey.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('provider onboarding and workload deployment', async ({ page, context }) => {
    // Test provider onboarding flow
    await test.step('Provider downloads and installs desktop app', async () => {
      // This would test the download and installation process
      // For now, we'll assume the desktop app is already running
    });

    await test.step('Provider completes onboarding wizard', async () => {
      await page.goto('http://localhost:3002'); // Desktop app renderer
      
      // Fill onboarding form
      await page.fill('[data-testid="hostname-input"]', 'test-provider-node');
      await page.selectOption('[data-testid="resource-tier"]', 'small');
      await page.check('[data-testid="agree-terms"]');
      await page.click('[data-testid="complete-onboarding"]');
      
      // Wait for agent registration
      await expect(page.locator('[data-testid="agent-status"]')).toContainText('running');
    });

    await test.step('Agent successfully registers with backend', async () => {
      // Verify agent appears in backend
      const agentsPage = await context.newPage();
      await agentsPage.goto('http://localhost:3001/admin/agents');
      await expect(agentsPage.locator('[data-testid="agent-list"]')).toContainText('test-provider-node');
    });

    // Test consumer workflow
    await test.step('Consumer logs into web dashboard', async () => {
      const dashboardPage = await context.newPage();
      await dashboardPage.goto('http://localhost:3000');
      
      await dashboardPage.fill('[data-testid="email"]', 'test@example.com');
      await dashboardPage.fill('[data-testid="password"]', 'testpassword');
      await dashboardPage.click('[data-testid="login-button"]');
      
      await expect(dashboardPage.locator('[data-testid="dashboard"]')).toBeVisible();
    });

    await test.step('Consumer deploys PostgreSQL workload', async () => {
      const dashboardPage = context.pages().find(p => p.url().includes('localhost:3000'));
      
      await dashboardPage!.click('[data-testid="deploy-workload"]');
      await dashboardPage!.selectOption('[data-testid="workload-type"]', 'postgresql');
      await dashboardPage!.fill('[data-testid="workload-name"]', 'test-postgres');
      await dashboardPage!.fill('[data-testid="database-name"]', 'testdb');
      await dashboardPage!.click('[data-testid="deploy-button"]');
      
      // Wait for deployment to complete
      await expect(dashboardPage!.locator('[data-testid="workload-status"]')).toContainText('running', { timeout: 60000 });
    });

    await test.step('Workload is accessible via public URL', async () => {
      const dashboardPage = context.pages().find(p => p.url().includes('localhost:3000'));
      
      const publicUrl = await dashboardPage!.locator('[data-testid="public-url"]').textContent();
      expect(publicUrl).toMatch(/https:\/\/.+/);
      
      // Test database connection
      const connectionString = await dashboardPage!.locator('[data-testid="connection-string"]').textContent();
      expect(connectionString).toContain('postgresql://');
    });

    await test.step('Consumer can view real-time logs', async () => {
      const dashboardPage = context.pages().find(p => p.url().includes('localhost:3000'));
      
      await dashboardPage!.click('[data-testid="view-logs"]');
      await expect(dashboardPage!.locator('[data-testid="log-viewer"]')).toBeVisible();
      await expect(dashboardPage!.locator('[data-testid="log-line"]')).toHaveCount(1, { timeout: 10000 });
    });

    await test.step('Consumer can stop and delete workload', async () => {
      const dashboardPage = context.pages().find(p => p.url().includes('localhost:3000'));
      
      await dashboardPage!.click('[data-testid="stop-workload"]');
      await expect(dashboardPage!.locator('[data-testid="workload-status"]')).toContainText('stopped');
      
      await dashboardPage!.click('[data-testid="delete-workload"]');
      await dashboardPage!.click('[data-testid="confirm-delete"]');
      await expect(dashboardPage!.locator('[data-testid="workload-card"]')).toHaveCount(0);
    });

    await test.step('Provider can monitor earnings and usage', async () => {
      // Return to desktop app
      await page.click('[data-testid="earnings-tab"]');
      await expect(page.locator('[data-testid="total-earnings"]')).toContainText('$');
      await expect(page.locator('[data-testid="resource-usage"]')).toBeVisible();
    });
  });

  test('multi-service deployment workflow', async ({ page, context }) => {
    // Test deploying multiple interconnected services
    await test.step('Deploy full-stack application', async () => {
      await page.goto('http://localhost:3000');
      
      // Deploy PostgreSQL database
      await page.click('[data-testid="deploy-workload"]');
      await page.selectOption('[data-testid="workload-type"]', 'postgresql');
      await page.fill('[data-testid="workload-name"]', 'app-database');
      await page.click('[data-testid="deploy-button"]');
      await expect(page.locator('[data-testid="workload-status"]').first()).toContainText('running', { timeout: 60000 });

      // Deploy Redis cache
      await page.click('[data-testid="deploy-workload"]');
      await page.selectOption('[data-testid="workload-type"]', 'redis');
      await page.fill('[data-testid="workload-name"]', 'app-cache');
      await page.click('[data-testid="deploy-button"]');
      await expect(page.locator('[data-testid="workload-status"]').first()).toContainText('running', { timeout: 60000 });

      // Deploy Node.js backend
      await page.click('[data-testid="deploy-workload"]');
      await page.selectOption('[data-testid="workload-type"]', 'nodejs');
      await page.fill('[data-testid="workload-name"]', 'app-backend');
      await page.fill('[data-testid="git-url"]', 'https://github.com/example/backend.git');
      await page.click('[data-testid="deploy-button"]');
      await expect(page.locator('[data-testid="workload-status"]').first()).toContainText('running', { timeout: 120000 });

      // Deploy React frontend
      await page.click('[data-testid="deploy-workload"]');
      await page.selectOption('[data-testid="workload-type"]', 'static');
      await page.fill('[data-testid="workload-name"]', 'app-frontend');
      await page.fill('[data-testid="git-url"]', 'https://github.com/example/frontend.git');
      await page.click('[data-testid="deploy-button"]');
      await expect(page.locator('[data-testid="workload-status"]').first()).toContainText('running', { timeout: 120000 });
    });

    await test.step('Verify all services are accessible', async () => {
      const workloadCards = page.locator('[data-testid="workload-card"]');
      await expect(workloadCards).toHaveCount(4);
      
      // Check each service has a public URL
      for (let i = 0; i < 4; i++) {
        await workloadCards.nth(i).click();
        await expect(page.locator('[data-testid="public-url"]')).toBeVisible();
        await page.click('[data-testid="close-details"]');
      }
    });
  });

  test('build pipeline and git integration', async ({ page }) => {
    await test.step('Deploy Node.js app from Git repository', async () => {
      await page.goto('http://localhost:3000');
      
      await page.click('[data-testid="deploy-workload"]');
      await page.selectOption('[data-testid="workload-type"]', 'nodejs');
      await page.fill('[data-testid="workload-name"]', 'test-build');
      await page.fill('[data-testid="git-url"]', 'https://github.com/example/test-app.git');
      await page.fill('[data-testid="git-branch"]', 'main');
      
      // Add environment variables
      await page.click('[data-testid="add-env-var"]');
      await page.fill('[data-testid="env-key"]', 'NODE_ENV');
      await page.fill('[data-testid="env-value"]', 'production');
      await page.click('[data-testid="add-env-button"]');
      
      await page.click('[data-testid="deploy-button"]');
      
      // Verify build process
      await expect(page.locator('[data-testid="workload-status"]')).toContainText('building', { timeout: 10000 });
      await expect(page.locator('[data-testid="workload-status"]')).toContainText('deploying', { timeout: 120000 });
      await expect(page.locator('[data-testid="workload-status"]')).toContainText('running', { timeout: 60000 });
    });

    await test.step('View build logs and deployment details', async () => {
      await page.click('[data-testid="view-logs"]');
      
      // Check for build-specific log entries
      await expect(page.locator('[data-testid="log-line"]')).toContainText('npm install');
      await expect(page.locator('[data-testid="log-line"]')).toContainText('npm run build');
      await expect(page.locator('[data-testid="log-line"]')).toContainText('Docker image built');
      
      await page.click('[data-testid="close-logs"]');
    });

    await test.step('Test application functionality', async () => {
      const publicUrl = await page.locator('[data-testid="public-url"]').textContent();
      
      // Open application in new tab
      const appPage = await page.context().newPage();
      await appPage.goto(publicUrl!);
      
      // Verify app is running
      await expect(appPage.locator('body')).toContainText('Hello World');
      
      await appPage.close();
    });
  });

  test('cron job scheduling and monitoring', async ({ page }) => {
    await test.step('Deploy cron job', async () => {
      await page.goto('http://localhost:3000');
      
      await page.click('[data-testid="deploy-workload"]');
      await page.selectOption('[data-testid="workload-type"]', 'cron');
      await page.fill('[data-testid="workload-name"]', 'backup-job');
      await page.fill('[data-testid="cron-schedule"]', '0 2 * * *'); // Daily at 2 AM
      await page.fill('[data-testid="cron-command"]', 'pg_dump -h database-host -U user database > backup.sql');
      await page.click('[data-testid="deploy-button"]');
      
      await expect(page.locator('[data-testid="workload-status"]')).toContainText('running', { timeout: 30000 });
    });

    await test.step('Monitor cron job execution', async () => {
      await page.click('[data-testid="view-details"]');
      
      // Check cron job details
      await expect(page.locator('[data-testid="cron-schedule"]')).toContainText('0 2 * * *');
      await expect(page.locator('[data-testid="next-run"]')).toBeVisible();
      
      // View execution history
      await page.click('[data-testid="execution-history"]');
      await expect(page.locator('[data-testid="execution-table"]')).toBeVisible();
    });
  });

  test('agent resource management and throttling', async ({ page }) => {
    await test.step('Configure resource limits', async () => {
      // This tests the desktop app resource configuration
      await page.goto('http://localhost:3002');
      
      await page.click('[data-testid="settings-tab"]');
      
      // Set CPU limit
      await page.fill('[data-testid="cpu-limit"]', '50');
      
      // Set memory limit
      await page.fill('[data-testid="memory-limit"]', '4096');
      
      // Set availability schedule
      await page.selectOption('[data-testid="schedule-start"]', '09:00');
      await page.selectOption('[data-testid="schedule-end"]', '17:00');
      
      await page.click('[data-testid="save-settings"]');
      
      await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
    });

    await test.step('Verify resource limits are enforced', async () => {
      // Deploy a resource-intensive workload
      const dashboardPage = await page.context().newPage();
      await dashboardPage.goto('http://localhost:3000');
      
      await dashboardPage.click('[data-testid="deploy-workload"]');
      await dashboardPage.selectOption('[data-testid="workload-type"]', 'postgresql');
      await dashboardPage.fill('[data-testid="workload-name"]', 'test-limits');
      
      // Try to allocate more resources than available
      await dashboardPage.fill('[data-testid="cpu-requirement"]', '4');
      await dashboardPage.fill('[data-testid="memory-requirement"]', '8192');
      
      await dashboardPage.click('[data-testid="deploy-button"]');
      
      // Should show resource constraint error
      await expect(dashboardPage.locator('[data-testid="error-message"]')).toContainText('Insufficient resources');
    });
  });
});
```

### 5.2 Integration Test Configuration

**File**: `tests/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially for integration testing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for integration tests
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'pnpm --filter @lattice-console/backend dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @lattice-console/frontend dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @lattice-console/desktop dev',
      port: 3002,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

---

## 6. Phase 4: Production Deployment (Week 4)

### 6.1 Production Infrastructure Setup

**File**: `infra/production/docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  # Nginx Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

  # Backend API Servers (3 replicas)
  backend:
    image: lattice-console/backend:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      AGENT_SECRET: ${AGENT_SECRET}
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend Servers (2 replicas)
  frontend:
    image: lattice-console/frontend:latest
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    depends_on:
      - backend
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  # PostgreSQL Database with High Availability
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Redis for Caching and Sessions
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/etc/redis/redis.conf:ro
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Prometheus Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  # Grafana Dashboard
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3003:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_SECURITY_ADMIN_USER: admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./grafana/datasources:/etc/grafana/provisioning/datasources:ro
    restart: unless-stopped

  # Log Aggregation
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - es_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    restart: unless-stopped

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash/logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
    depends_on:
      - elasticsearch
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch
    restart: unless-stopped

  # Backup Service
  backup:
    image: lattice-console/backup:latest
    environment:
      DATABASE_URL: ${DATABASE_URL}
      BACKUP_S3_BUCKET: