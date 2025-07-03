import Docker from 'dockerode';
import { Logger, DockerError, CONTAINER_LABELS, VOLUME_PATHS } from '@lattice-console/utils';
import os from 'os';
import { promises as fs } from 'fs';

const logger = Logger.child({ module: 'docker-service' });

export interface SystemInfo {
  hostname: string;
  platform: string;
  dockerVersion: string | null;
  cpuCores: number;
  totalMemory: number;
  totalDisk: number;
}

export interface ResourceUsage {
  availableMemory: number;
  availableDisk: number;
}

export interface ContainerConfig {
  image: string;
  name: string;
  env?: Record<string, string>;
  labels?: Record<string, string>;
  ports?: Array<{ container: number; host?: number }>;
  volumes?: Array<{ host: string; container: string }>;
  resources?: {
    cpu?: number;
    memory?: number;
  };
}

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    });
  }

  async checkConnection(): Promise<void> {
    try {
      await this.docker.ping();
    } catch (error) {
      throw new DockerError('Failed to connect to Docker daemon');
    }
  }

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const [version, info] = await Promise.all([
        this.docker.version().catch(() => null),
        this.docker.info(),
      ]);

      const totalDisk = await this.getTotalDiskSpace();

      return {
        hostname: os.hostname(),
        platform: os.platform(),
        dockerVersion: version?.Version || null,
        cpuCores: os.cpus().length,
        totalMemory: os.totalmem(),
        totalDisk,
      };
    } catch (error) {
      logger.error('Failed to get system info', error);
      throw new DockerError('Failed to get system information');
    }
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    try {
      const availableMemory = os.freemem();
      const availableDisk = await this.getAvailableDiskSpace();

      return {
        availableMemory,
        availableDisk,
      };
    } catch (error) {
      logger.error('Failed to get resource usage', error);
      throw new DockerError('Failed to get resource usage');
    }
  }

  async createContainer(config: ContainerConfig): Promise<string> {
    try {
      logger.info('Creating container', { name: config.name, image: config.image });

      // Prepare port bindings
      const exposedPorts: Record<string, {}> = {};
      const portBindings: Record<string, Array<{ HostPort: string }>> = {};

      if (config.ports) {
        for (const port of config.ports) {
          const containerPort = `${port.container}/tcp`;
          exposedPorts[containerPort] = {};
          portBindings[containerPort] = [{
            HostPort: port.host ? port.host.toString() : '',
          }];
        }
      }

      // Prepare volume bindings
      const binds: string[] = [];
      if (config.volumes) {
        for (const volume of config.volumes) {
          binds.push(`${volume.host}:${volume.container}`);
        }
      }

      // Create container
      const container = await this.docker.createContainer({
        Image: config.image,
        name: config.name,
        Env: config.env ? Object.entries(config.env).map(([k, v]) => `${k}=${v}`) : [],
        Labels: {
          ...CONTAINER_LABELS,
          ...config.labels,
        },
        ExposedPorts: exposedPorts,
        HostConfig: {
          PortBindings: portBindings,
          Binds: binds,
          RestartPolicy: {
            Name: 'unless-stopped',
          },
          ...(config.resources && {
            CpuShares: config.resources.cpu ? config.resources.cpu * 1024 : undefined,
            Memory: config.resources.memory ? config.resources.memory * 1024 * 1024 : undefined,
          }),
        },
      });

      // Start container
      await container.start();

      logger.info('Container created and started', { 
        name: config.name, 
        id: container.id 
      });

      return container.id;
    } catch (error: any) {
      logger.error('Failed to create container', error);
      
      if (error.statusCode === 409) {
        throw new DockerError('Container with this name already exists');
      }
      
      throw new DockerError(`Failed to create container: ${error.message}`);
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
      logger.info('Container stopped', { containerId });
    } catch (error: any) {
      if (error.statusCode === 304) {
        // Container already stopped
        return;
      }
      logger.error('Failed to stop container', error);
      throw new DockerError(`Failed to stop container: ${error.message}`);
    }
  }

  async removeContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
      logger.info('Container removed', { containerId });
    } catch (error: any) {
      logger.error('Failed to remove container', error);
      throw new DockerError(`Failed to remove container: ${error.message}`);
    }
  }

  async getContainerStats(containerId: string): Promise<any> {
    try {
      const container = this.docker.getContainer(containerId);
      const stream = await container.stats({ stream: false });
      return stream;
    } catch (error: any) {
      logger.error('Failed to get container stats', error);
      throw new DockerError(`Failed to get container stats: ${error.message}`);
    }
  }

  async getContainerLogs(containerId: string, lines: number = 100): Promise<string[]> {
    try {
      const container = this.docker.getContainer(containerId);
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines,
        timestamps: true,
      });

      // Parse logs from stream
      const logs = stream.toString().split('\n').filter(Boolean);
      return logs;
    } catch (error: any) {
      logger.error('Failed to get container logs', error);
      throw new DockerError(`Failed to get container logs: ${error.message}`);
    }
  }

  async pullImage(image: string): Promise<void> {
    try {
      logger.info('Pulling Docker image', { image });
      
      const stream = await this.docker.pull(image);
      
      // Wait for pull to complete
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(undefined);
          }
        });
      });

      logger.info('Docker image pulled successfully', { image });
    } catch (error: any) {
      logger.error('Failed to pull Docker image', error);
      throw new DockerError(`Failed to pull image ${image}: ${error.message}`);
    }
  }

  private async getTotalDiskSpace(): Promise<number> {
    try {
      const stats = await fs.statfs('/');
      return stats.blocks * stats.bsize;
    } catch (error) {
      logger.error('Failed to get total disk space', error);
      return 0;
    }
  }

  private async getAvailableDiskSpace(): Promise<number> {
    try {
      const stats = await fs.statfs('/');
      return stats.bavail * stats.bsize;
    } catch (error) {
      logger.error('Failed to get available disk space', error);
      return 0;
    }
  }
}