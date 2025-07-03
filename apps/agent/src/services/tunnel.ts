import ngrok from 'ngrok';

export interface TunnelConfig {
  port: number;
  protocol?: 'http' | 'tcp';
  subdomain?: string;
}

export interface ActiveTunnel {
  id: string;
  port: number;
  publicUrl: string;
  protocol: string;
  createdAt: Date;
}

export class TunnelService {
  private tunnels: Map<string, ActiveTunnel> = new Map();

  async createTunnel(config: TunnelConfig): Promise<ActiveTunnel> {
    try {
      // Configure ngrok options
      const ngrokOptions: any = {
        addr: config.port,
        proto: config.protocol || 'tcp',
      };

      if (config.subdomain) {
        ngrokOptions.subdomain = config.subdomain;
      }

      // Create tunnel
      const publicUrl = await ngrok.connect(ngrokOptions);
      
      const tunnel: ActiveTunnel = {
        id: `tunnel-${config.port}-${Date.now()}`,
        port: config.port,
        publicUrl,
        protocol: config.protocol || 'tcp',
        createdAt: new Date(),
      };

      this.tunnels.set(tunnel.id, tunnel);
      console.log(`Tunnel created: ${publicUrl} -> localhost:${config.port}`);

      return tunnel;
    } catch (error) {
      console.error(`Failed to create tunnel for port ${config.port}:`, error);
      throw new Error(`Tunnel creation failed: ${error}`);
    }
  }

  async closeTunnel(tunnelId: string): Promise<void> {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      throw new Error('Tunnel not found');
    }

    try {
      await ngrok.disconnect(tunnel.publicUrl);
      this.tunnels.delete(tunnelId);
      console.log(`Tunnel closed: ${tunnel.publicUrl}`);
    } catch (error) {
      console.error(`Failed to close tunnel ${tunnel.publicUrl}:`, error);
      throw new Error(`Failed to close tunnel: ${error}`);
    }
  }

  async closeAllTunnels(): Promise<void> {
    try {
      await ngrok.kill();
      this.tunnels.clear();
      console.log('All tunnels closed');
    } catch (error) {
      console.error('Failed to close all tunnels:', error);
      throw new Error(`Failed to close all tunnels: ${error}`);
    }
  }

  getTunnel(tunnelId: string): ActiveTunnel | undefined {
    return this.tunnels.get(tunnelId);
  }

  getAllTunnels(): ActiveTunnel[] {
    return Array.from(this.tunnels.values());
  }

  getTunnelByPort(port: number): ActiveTunnel | undefined {
    return Array.from(this.tunnels.values()).find(tunnel => tunnel.port === port);
  }

  async getStatus(): Promise<{ connected: boolean; tunnelCount: number }> {
    try {
      // Check if ngrok is running by getting API status
      const api = await ngrok.getApi();
      return {
        connected: !!api,
        tunnelCount: this.tunnels.size,
      };
    } catch (error) {
      return {
        connected: false,
        tunnelCount: this.tunnels.size,
      };
    }
  }
}