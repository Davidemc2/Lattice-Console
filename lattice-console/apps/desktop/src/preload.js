// Preload script for Electron. Expose safe APIs if needed.
const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function getSystemInfo() {
  return new Promise((resolve) => {
    // CPU
    const cpuCores = os.cpus().length;
    // Memory (MB)
    const totalMemory = Math.round(os.totalmem() / 1024 / 1024);
    // Disk (GB) - use root partition
    let totalDisk = 0;
    try {
      const stat = fs.statSync('/');
      // Fallback: use 100GB if stat fails (cross-platform note)
      totalDisk = stat.blksize ? Math.round(stat.blksize / 1024 / 1024 / 1024) : 100;
    } catch {
      totalDisk = 100;
    }
    // Platform/arch
    const platform = os.platform();
    const arch = os.arch();
    // Docker version
    exec('docker --version', (err, stdout) => {
      const dockerVersion = err ? 'unknown' : (stdout.match(/Docker version ([^,]+)/)?.[1] || 'unknown');
      resolve({
        hostname: os.hostname(),
        platform,
        arch,
        cpuCores,
        totalMemory,
        totalDisk,
        dockerVersion,
      });
    });
  });
}

const sessionPath = path.join(appDataPath(), 'lattice-session.json');
function appDataPath() {
  return (
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.config'))
  );
}
function saveSession(data) {
  try {
    fs.writeFileSync(sessionPath, JSON.stringify(data), { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}
function loadSession() {
  try {
    if (fs.existsSync(sessionPath)) {
      const data = fs.readFileSync(sessionPath, { encoding: 'utf-8' });
      return JSON.parse(data);
    }
  } catch {}
  return null;
}
function clearSession() {
  try {
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
    }
    return true;
  } catch {
    return false;
  }
}

contextBridge.exposeInMainWorld('latticeAPI', {
  checkDocker: () => {
    return new Promise((resolve) => {
      exec('docker info', (error) => {
        resolve(!error);
      });
    });
  },
  startAgent: (agentConfig) => ipcRenderer.invoke('start-agent', agentConfig),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  onAgentLog: (callback) => {
    ipcRenderer.on('agent-log', (event, log) => callback(log));
  },
  onAgentExit: (callback) => {
    ipcRenderer.on('agent-exit', (event, data) => callback(data));
  },
  getSystemInfo,
  saveSession,
  loadSession,
  clearSession,
});

window.addEventListener('DOMContentLoaded', () => {
  // Placeholder for future APIs
}); 
}); 