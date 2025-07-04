import { contextBridge, ipcRenderer } from 'electron';

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