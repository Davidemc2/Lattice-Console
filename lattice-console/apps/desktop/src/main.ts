import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell, autoUpdater } from 'electron';
import { join } from 'path';
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
  private isQuitting = false;
  private userData: any = {};

  constructor() {
    this.setupAppDefaults();
  }

  async initialize(): Promise<void> {
    console.info('Initializing Lattice Desktop App...');
    await app.whenReady();
    this.createSystemTray();
    this.setupIPC();
    await this.checkAgentInstallation();
    this.setupAutoUpdater();
    this.setupAppEvents();
    if (this.userData.autoStartAgent) {
      await this.startAgent();
    }
    console.info('Desktop app initialized successfully');
  }

  private setupAppDefaults(): void {
    app.setName('Lattice Console');
    app.setAppUserModelId('com.lattice.console');
    app.commandLine.appendSwitch('ignore-certificate-errors');
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
    console.info('Starting agent process...');
    this.agentStatus = { status: 'starting' };
    this.updateTrayMenu();
    this.updateTrayTooltip();
    try {
      const agentPath = this.getAgentBinaryPath();
      this.agentProcess = spawn(agentPath, [], {
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          LATTICE_DESKTOP_MODE: 'true',
        },
      });
      this.agentProcess.on('spawn', () => {
        console.info(`Agent process started with PID: ${this.agentProcess?.pid}`);
        this.agentStatus = {
          status: 'running',
          pid: this.agentProcess?.pid,
          uptime: Date.now(),
        };
        this.updateTrayMenu();
        this.updateTrayTooltip();
      });
      this.agentProcess.on('error', (error) => {
        console.error('Agent process error:', error);
        const message = typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error);
        this.agentStatus = {
          status: 'error',
          lastError: message,
        };
        this.updateTrayMenu();
        this.updateTrayTooltip();
      });
      this.agentProcess.on('exit', (code, signal) => {
        console.info(`Agent process exited with code ${code}, signal ${signal}`);
        this.agentStatus = { status: 'stopped' };
        this.agentProcess = null;
        this.updateTrayMenu();
        this.updateTrayTooltip();
      });
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
      console.error('Failed to start agent:', error);
      const message = typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error);
      this.agentStatus = {
        status: 'error',
        lastError: message,
      };
      this.updateTrayMenu();
      this.updateTrayTooltip();
    }
  }

  private async stopAgent(): Promise<void> {
    if (!this.agentProcess || this.agentStatus.status === 'stopped') {
      return;
    }
    console.info('Stopping agent process...');
    try {
      this.agentProcess.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.agentProcess) {
            this.agentProcess.kill('SIGKILL');
          }
          resolve();
        }, 10000);
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
      console.error('Failed to stop agent:', error);
    }
  }

  private setupIPC(): void {
    ipcMain.handle('agent:start', () => this.startAgent());
    ipcMain.handle('agent:stop', () => this.stopAgent());
    ipcMain.handle('agent:status', () => this.agentStatus);
    ipcMain.handle('system:info', async () => {
      return {
        hostname: 'unknown',
        platform: process.platform,
        arch: process.arch,
        cpuCores: 4,
        totalMemory: 8192,
        totalDisk: 256,
        dockerVersion: 'unknown',
      };
    });
    ipcMain.handle('settings:get', () => this.userData);
    ipcMain.handle('settings:set', (_, settings) => {
      this.userData = { ...this.userData, ...settings };
      this.saveUserData();
    });
    ipcMain.handle('file:selectFolder', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });
      return result.filePaths[0];
    });
    ipcMain.handle('shell:openExternal', (_, url) => {
      shell.openExternal(url);
    });
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
      console.warn('Agent binary not found, may need installation');
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
      console.info('Update available');
    });
    autoUpdater.on('update-downloaded', () => {
      console.info('Update downloaded');
    });
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 3600000);
  }

  private setupAppEvents(): void {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
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
    const logPath = '/tmp/lattice-agent.log';
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

const latticeApp = new LatticeDesktopApp();
latticeApp.initialize().catch((error) => {
  const message = typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error);
  console.error('Failed to initialize desktop app:', message);
  app.quit();
}); 