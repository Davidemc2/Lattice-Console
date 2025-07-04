import { spawn, ChildProcess } from 'child_process';
import { Logger } from '@lattice-console/utils';
import * as net from 'net';

interface TunnelConfig {
  localPort: number;
  subdomain?: string;
  customDomain?: string;
}

interface TunnelInfo {
  url: string;
  host: string;
  port: number;
  tunnelId: string;
}

interface TunnelProcess {
  process: ChildProcess;
  info: TunnelInfo;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export class TunnelService {
  private tunnels: Map<string, TunnelProcess> = new Map();
  private tunnelProvider: 'localtunnel' | 'ngrok' | 'cloudflare';

  constructor() {
    // Determine which tunnel provider to use based on availability
    this.tunnelProvider = process.env.TUNNEL_PROVIDER as any || 'localtunnel';
  }

  async initialize(): Promise<void> {
    Logger.info('Initializing Tunnel service...');

    try {
      // Install tunnel dependencies if needed
      await this.ensureTunnelTools();

      Logger.info(`Tunnel service initialized with provider: ${this.tunnelProvider}`);
    } catch (error) {
      Logger.error('Failed to initialize Tunnel service:', error);
      throw error;
    }
  }

  async createTunnel(config: TunnelConfig): Promise<TunnelInfo> {
    const tunnelId = `tunnel-${config.localPort}-${Date.now()}`;
    
    Logger.info(`Creating tunnel for port ${config.localPort} with ID ${tunnelId}`);

    // Verify local port is accessible
    await this.verifyLocalPort(config.localPort);

    try {
      let tunnelInfo: TunnelInfo;

      switch (this.tunnelProvider) {
        case 'localtunnel':
          tunnelInfo = await this.createLocalTunnel(config, tunnelId);
          break;
        case 'ngrok':
          tunnelInfo = await this.createNgrokTunnel(config, tunnelId);
          break;
        case 'cloudflare':
          tunnelInfo = await this.createCloudflareTunnel(config, tunnelId);
          break;
        default:
          throw new Error(`Unsupported tunnel provider: ${this.tunnelProvider}`);
      }

      Logger.info(`Tunnel created successfully: ${tunnelInfo.url}`);
      return tunnelInfo;

    } catch (error: any) {
      Logger.error(`Failed to create tunnel: ${error.message}`);
      throw error;
    }
  }

  private async createLocalTunnel(config: TunnelConfig, tunnelId: string): Promise<TunnelInfo> {
    return new Promise((resolve, reject) => {
      const args = ['--port', config.localPort.toString()];
      
      if (config.subdomain) {
        args.push('--subdomain', config.subdomain);
      }

      const process = spawn('lt', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let tunnelUrl = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
        
        // Look for tunnel URL in output
        const urlMatch = output.match(/your url is: (https:\/\/[\S]+)/);
        if (urlMatch && !tunnelUrl) {
          tunnelUrl = urlMatch[1];
          
          const url = new URL(tunnelUrl);
          const tunnelInfo: TunnelInfo = {
            url: tunnelUrl,
            host: url.hostname,
            port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
            tunnelId,
          };

          this.tunnels.set(tunnelId, {
            process,
            info: tunnelInfo,
            status: 'connected',
          });

          resolve(tunnelInfo);
        }
      });

      process.stderr.on('data', (data) => {
        const error = data.toString();
        Logger.warn(`LocalTunnel stderr: ${error}`);
      });

      process.on('close', (code) => {
        if (code !== 0 && !tunnelUrl) {
          reject(new Error(`LocalTunnel process exited with code ${code}`));
        }
        
        // Update tunnel status
        const tunnel = this.tunnels.get(tunnelId);
        if (tunnel) {
          tunnel.status = 'disconnected';
        }
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!tunnelUrl) {
          process.kill();
          reject(new Error('Tunnel creation timeout'));
        }
      }, 30000);
    });
  }

  private async createNgrokTunnel(config: TunnelConfig, tunnelId: string): Promise<TunnelInfo> {
    return new Promise((resolve, reject) => {
      const args = ['http', config.localPort.toString(), '--log=stdout', '--log-format=json'];
      
      if (config.subdomain) {
        args.push('--subdomain', config.subdomain);
      }

      const process = spawn('ngrok', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let tunnelUrl = '';

      process.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const logEntry = JSON.parse(line);
            
            // Look for tunnel URL
            if (logEntry.msg === 'started tunnel' && logEntry.url) {
              tunnelUrl = logEntry.url;
              
              const url = new URL(tunnelUrl);
              const tunnelInfo: TunnelInfo = {
                url: tunnelUrl,
                host: url.hostname,
                port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
                tunnelId,
              };

              this.tunnels.set(tunnelId, {
                process,
                info: tunnelInfo,
                status: 'connected',
              });

              resolve(tunnelInfo);
              return;
            }
          } catch (error) {
            // Not a JSON log line, ignore
          }
        }
      });

      process.stderr.on('data', (data) => {
        const error = data.toString();
        Logger.warn(`Ngrok stderr: ${error}`);
      });

      process.on('close', (code) => {
        if (code !== 0 && !tunnelUrl) {
          reject(new Error(`Ngrok process exited with code ${code}`));
        }

        const tunnel = this.tunnels.get(tunnelId);
        if (tunnel) {
          tunnel.status = 'disconnected';
        }
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!tunnelUrl) {
          process.kill();
          reject(new Error('Ngrok tunnel creation timeout'));
        }
      }, 30000);
    });
  }

  private async createCloudflareTunnel(config: TunnelConfig, tunnelId: string): Promise<TunnelInfo> {
    return new Promise((resolve, reject) => {
      const args = ['tunnel', '--url', `http://localhost:${config.localPort}`, '--no-autoupdate'];

      const process = spawn('cloudflared', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let tunnelUrl = '';

      process.stderr.on('data', (data) => {
        const output = data.toString();
        
        // Cloudflare tunnel outputs URL to stderr
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !tunnelUrl) {
          tunnelUrl = urlMatch[0];
          
          const url = new URL(tunnelUrl);
          const tunnelInfo: TunnelInfo = {
            url: tunnelUrl,
            host: url.hostname,
            port: parseInt(url.port) || 443,
            tunnelId,
          };

          this.tunnels.set(tunnelId, {
            process,
            info: tunnelInfo,
            status: 'connected',
          });

          resolve(tunnelInfo);
        }
      });

      process.on('close', (code) => {
        if (code !== 0 && !tunnelUrl) {
          reject(new Error(`Cloudflare tunnel process exited with code ${code}`));
        }

        const tunnel = this.tunnels.get(tunnelId);
        if (tunnel) {
          tunnel.status = 'disconnected';
        }
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!tunnelUrl) {
          process.kill();
          reject(new Error('Cloudflare tunnel creation timeout'));
        }
      }, 30000);
    });
  }

  async closeTunnel(workloadId: string): Promise<void> {
    Logger.info(`Closing tunnel for workload ${workloadId}`);

    // Find tunnel by workload ID (stored in tunnel ID)
    for (const [tunnelId, tunnel] of this.tunnels.entries()) {
      if (tunnelId.includes(workloadId)) {
        tunnel.process.kill('SIGTERM');
        this.tunnels.delete(tunnelId);
        Logger.info(`Tunnel ${tunnelId} closed`);
        return;
      }
    }

    Logger.warn(`No tunnel found for workload ${workloadId}`);
  }

  async closeAllTunnels(): Promise<void> {
    Logger.info('Closing all tunnels...');

    for (const [, tunnel] of this.tunnels.entries()) {
      tunnel.process.kill('SIGTERM');
    }

    this.tunnels.clear();
    Logger.info('All tunnels closed');
  }

  getTunnelStatus(tunnelId: string): string | null {
    const tunnel = this.tunnels.get(tunnelId);
    return tunnel ? tunnel.status : null;
  }

  listActiveTunnels(): Array<{ tunnelId: string; info: TunnelInfo; status: string }> {
    return Array.from(this.tunnels.entries()).map(([tunnelId, tunnel]) => ({
      tunnelId,
      info: tunnel.info,
      status: tunnel.status,
    }));
  }

  private async ensureTunnelTools(): Promise<void> {
    switch (this.tunnelProvider) {
      case 'localtunnel':
        await this.ensureLocalTunnel();
        break;
      case 'ngrok':
        await this.ensureNgrok();
        break;
      case 'cloudflare':
        await this.ensureCloudflare();
        break;
    }
  }

  private async ensureLocalTunnel(): Promise<void> {
    try {
      // Check if localtunnel is installed
      await this.executeCommand('which', ['lt']);
      Logger.info('LocalTunnel is available');
    } catch (error) {
      Logger.info('Installing LocalTunnel...');
      try {
        await this.executeCommand('npm', ['install', '-g', 'localtunnel']);
        Logger.info('LocalTunnel installed successfully');
      } catch (installError) {
        throw new Error(`Failed to install LocalTunnel: ${typeof installError === 'object' && installError && 'message' in installError ? (installError as any).message : String(installError)}`);
      }
    }
  }

  private async ensureNgrok(): Promise<void> {
    try {
      await this.executeCommand('which', ['ngrok']);
      Logger.info('Ngrok is available');
    } catch (error) {
      throw new Error('Ngrok is not installed. Please install ngrok manually.');
    }
  }

  private async ensureCloudflare(): Promise<void> {
    try {
      await this.executeCommand('which', ['cloudflared']);
      Logger.info('Cloudflare tunnel is available');
    } catch (error) {
      throw new Error('Cloudflared is not installed. Please install cloudflared manually.');
    }
  }

  private async verifyLocalPort(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(port, 'localhost');
      
      socket.on('connect', () => {
        socket.end();
        resolve();
      });
      
      socket.on('error', (error) => {
        reject(new Error(`Local port ${port} is not accessible: ${error.message}`));
      });
      
      setTimeout(() => {
        socket.destroy();
        reject(new Error(`Local port ${port} connection timeout`));
      }, 5000);
    });
  }

  private async executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async shutdown(): Promise<void> {
    Logger.info('Shutting down Tunnel service...');
    await this.closeAllTunnels();
    Logger.info('Tunnel service shutdown complete');
  }
}