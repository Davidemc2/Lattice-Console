import { Logger } from '@lattice-console/utils';
import localtunnel from 'localtunnel';

const logger = Logger.child({ module: 'tunnel-service' });

export interface TunnelConfig {
  port: number;
  subdomain?: string;
}

export interface Tunnel {
  id: string;
  url: string;
  port: number;
  close: () => Promise<void>;
}

export class TunnelService {
  private tunnels: Map<string, Tunnel> = new Map();

  async createTunnel(config: TunnelConfig): Promise<Tunnel> {
    try {
      logger.info('Creating tunnel', { port: config.port });

      const tunnel = await localtunnel({
        port: config.port,
        subdomain: config.subdomain,
      });

      const tunnelInfo: Tunnel = {
        id: `tunnel-${Date.now()}`,
        url: tunnel.url,
        port: config.port,
        close: async () => {
          tunnel.close();
          this.tunnels.delete(tunnelInfo.id);
        },
      };

      this.tunnels.set(tunnelInfo.id, tunnelInfo);

      logger.info('Tunnel created', { 
        id: tunnelInfo.id, 
        url: tunnelInfo.url,
        port: config.port 
      });

      return tunnelInfo;
    } catch (error) {
      logger.error('Failed to create tunnel', error);
      throw new Error(`Failed to create tunnel: ${error}`);
    }
  }

  async closeTunnel(id: string): Promise<void> {
    const tunnel = this.tunnels.get(id);
    if (tunnel) {
      await tunnel.close();
      logger.info('Tunnel closed', { id });
    }
  }

  async closeAll(): Promise<void> {
    logger.info('Closing all tunnels', { count: this.tunnels.size });
    
    const promises = Array.from(this.tunnels.values()).map(tunnel => 
      tunnel.close().catch(err => 
        logger.error('Failed to close tunnel', err, { id: tunnel.id })
      )
    );

    await Promise.all(promises);
    this.tunnels.clear();
  }

  getTunnel(id: string): Tunnel | undefined {
    return this.tunnels.get(id);
  }

  getAllTunnels(): Tunnel[] {
    return Array.from(this.tunnels.values());
  }
}