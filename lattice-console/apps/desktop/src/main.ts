import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let agentProcess: ChildProcessWithoutNullStreams | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- Agent Process Management ---
ipcMain.handle('start-agent', async (event, agentConfig) => {
  if (agentProcess) {
    return { success: false, message: 'Agent already running' };
  }
  // Path to agent entry point (adjust as needed)
  const agentPath = path.resolve(__dirname, '../../../agent/src/index.ts');
  // Pass config as env vars
  agentProcess = spawn('node', [agentPath], {
    env: {
      ...process.env,
      AGENT_ID: agentConfig.agentId,
      AGENT_TOKEN: agentConfig.agentToken,
      AGENT_CPU: String(agentConfig.resourceConfig.cpu),
      AGENT_MEMORY: String(agentConfig.resourceConfig.memory),
      AGENT_DISK: String(agentConfig.resourceConfig.disk),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  agentProcess.stdout.on('data', (data) => {
    mainWindow?.webContents.send('agent-log', { type: 'stdout', data: data.toString() });
  });
  agentProcess.stderr.on('data', (data) => {
    mainWindow?.webContents.send('agent-log', { type: 'stderr', data: data.toString() });
  });
  agentProcess.on('exit', (code) => {
    mainWindow?.webContents.send('agent-exit', { code });
    agentProcess = null;
  });

  return { success: true, pid: agentProcess.pid };
});

ipcMain.handle('stop-agent', async () => {
  if (!agentProcess) {
    return { success: false, message: 'Agent not running' };
  }
  agentProcess.kill();
  agentProcess = null;
  return { success: true };
}); 