import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';

export interface ContainerConfig {
  name: string;
  type: 'postgres' | 'minio' | 'custom';
  image?: string;
  environment?: Record<string, string>;
  ports?: number[];
  volumes?: string[];
}

export interface DeployedContainer {
  id: string;
  containerId: string;
  name: string;
  type: string;
  status: string;
  port?: number;
  publicUrl?: string;
  credentials?: Record<string, string>;
  config: ContainerConfig;
  createdAt: Date;
}

export class DockerService {
  private docker: Docker;
  private containers: Map<string, DeployedContainer> = new Map();
  private connected = false;

  constructor() {
    this.docker = new Docker();
  }

  async connect(): Promise<void> {
    try {
      await this.docker.ping();
      this.connected = true;
      console.log('Docker daemon connected successfully');
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to Docker daemon: ${error}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async deployContainer(config: ContainerConfig): Promise<DeployedContainer> {
    if (!this.connected) {
      throw new Error('Docker daemon not connected');
    }

    const deploymentId = uuidv4();
    let containerConfig: any;
    let credentials: Record<string, string> = {};

    switch (config.type) {
      case 'postgres':
        credentials = {
          username: 'lattice_user',
          password: uuidv4().slice(0, 16),
          database: 'lattice_db',
        };
        containerConfig = this.createPostgresConfig(config, credentials);
        break;
      
      case 'minio':
        credentials = {
          accessKey: 'lattice' + uuidv4().slice(0, 8),
          secretKey: uuidv4(),
        };
        containerConfig = this.createMinioConfig(config, credentials);
        break;
      
      case 'custom':
        containerConfig = this.createCustomConfig(config);
        break;
      
      default:
        throw new Error(`Unsupported container type: ${config.type}`);
    }

    try {
      // Pull image if needed
      await this.pullImageIfNeeded(containerConfig.Image);

      // Create and start container
      const container = await this.docker.createContainer(containerConfig);
      await container.start();

      // Get container info
      const containerInfo = await container.inspect();
      const hostPort = this.extractHostPort(containerInfo);

      const deployedContainer: DeployedContainer = {
        id: deploymentId,
        containerId: container.id,
        name: config.name,
        type: config.type,
        status: 'running',
        ...(hostPort && { port: hostPort }),
        credentials,
        config,
        createdAt: new Date(),
      };

      this.containers.set(deploymentId, deployedContainer);
      console.log(`Container ${config.name} deployed successfully`);

      return deployedContainer;
    } catch (error) {
      console.error(`Failed to deploy container ${config.name}:`, error);
      throw new Error(`Container deployment failed: ${error}`);
    }
  }

  async stopContainer(deploymentId: string): Promise<void> {
    const deployed = this.containers.get(deploymentId);
    if (!deployed) {
      throw new Error('Container not found');
    }

    try {
      const container = this.docker.getContainer(deployed.containerId);
      await container.stop();
      deployed.status = 'stopped';
      console.log(`Container ${deployed.name} stopped`);
    } catch (error) {
      console.error(`Failed to stop container ${deployed.name}:`, error);
      throw new Error(`Failed to stop container: ${error}`);
    }
  }

  async startContainer(deploymentId: string): Promise<void> {
    const deployed = this.containers.get(deploymentId);
    if (!deployed) {
      throw new Error('Container not found');
    }

    try {
      const container = this.docker.getContainer(deployed.containerId);
      await container.start();
      deployed.status = 'running';
      console.log(`Container ${deployed.name} started`);
    } catch (error) {
      console.error(`Failed to start container ${deployed.name}:`, error);
      throw new Error(`Failed to start container: ${error}`);
    }
  }

  async deleteContainer(deploymentId: string): Promise<void> {
    const deployed = this.containers.get(deploymentId);
    if (!deployed) {
      throw new Error('Container not found');
    }

    try {
      const container = this.docker.getContainer(deployed.containerId);
      
      // Stop if running
      try {
        await container.stop();
      } catch (error) {
        // Ignore if already stopped
      }

      // Remove container
      await container.remove();
      this.containers.delete(deploymentId);
      console.log(`Container ${deployed.name} deleted`);
    } catch (error) {
      console.error(`Failed to delete container ${deployed.name}:`, error);
      throw new Error(`Failed to delete container: ${error}`);
    }
  }

  async getContainerLogs(deploymentId: string, lines = 100): Promise<string[]> {
    const deployed = this.containers.get(deploymentId);
    if (!deployed) {
      throw new Error('Container not found');
    }

    try {
      const container = this.docker.getContainer(deployed.containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines,
        timestamps: true,
      });

      return logs.toString().split('\n').filter(line => line.trim());
    } catch (error) {
      console.error(`Failed to get logs for ${deployed.name}:`, error);
      throw new Error(`Failed to get container logs: ${error}`);
    }
  }

  getContainer(deploymentId: string): DeployedContainer | undefined {
    return this.containers.get(deploymentId);
  }

  getAllContainers(): DeployedContainer[] {
    return Array.from(this.containers.values());
  }

  private createPostgresConfig(config: ContainerConfig, credentials: Record<string, string>) {
    return {
      Image: 'postgres:15',
      name: `lattice-postgres-${config.name}`,
      Env: [
        `POSTGRES_USER=${credentials.username}`,
        `POSTGRES_PASSWORD=${credentials.password}`,
        `POSTGRES_DB=${credentials.database}`,
      ],
      ExposedPorts: {
        '5432/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '5432/tcp': [{ HostPort: '0' }], // Auto-assign port
        },
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
    };
  }

  private createMinioConfig(config: ContainerConfig, credentials: Record<string, string>) {
    return {
      Image: 'minio/minio:latest',
      name: `lattice-minio-${config.name}`,
      Env: [
        `MINIO_ROOT_USER=${credentials.accessKey}`,
        `MINIO_ROOT_PASSWORD=${credentials.secretKey}`,
      ],
      Cmd: ['server', '/data', '--console-address', ':9001'],
      ExposedPorts: {
        '9000/tcp': {},
        '9001/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '9000/tcp': [{ HostPort: '0' }],
          '9001/tcp': [{ HostPort: '0' }],
        },
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
    };
  }

  private createCustomConfig(config: ContainerConfig) {
    if (!config.image) {
      throw new Error('Custom containers require an image');
    }

    const exposedPorts: any = {};
    const portBindings: any = {};

    if (config.ports) {
      config.ports.forEach(port => {
        exposedPorts[`${port}/tcp`] = {};
        portBindings[`${port}/tcp`] = [{ HostPort: '0' }];
      });
    }

    return {
      Image: config.image,
      name: `lattice-custom-${config.name}`,
      Env: config.environment ? Object.entries(config.environment).map(([k, v]) => `${k}=${v}`) : [],
      ExposedPorts: exposedPorts,
      HostConfig: {
        PortBindings: portBindings,
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
    };
  }

  private async pullImageIfNeeded(image: string): Promise<void> {
    try {
      await this.docker.getImage(image).inspect();
    } catch (error) {
      // Image not found, pull it
      console.log(`Pulling image: ${image}`);
      await new Promise((resolve, reject) => {
        this.docker.pull(image, (err: any, stream: any) => {
          if (err) reject(err);
          else {
            this.docker.modem.followProgress(stream, resolve);
          }
        });
      });
    }
  }

  private extractHostPort(containerInfo: any): number | undefined {
    const ports = containerInfo.NetworkSettings?.Ports;
    if (!ports) return undefined;

    for (const [containerPort, hostBindings] of Object.entries(ports)) {
      if (hostBindings && Array.isArray(hostBindings) && hostBindings.length > 0) {
        return parseInt(hostBindings[0].HostPort);
      }
    }
    return undefined;
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up Docker service...');
    // Optionally stop all managed containers on shutdown
    // for (const [id, container] of this.containers) {
    //   try {
    //     await this.stopContainer(id);
    //   } catch (error) {
    //     console.error(`Failed to stop container ${container.name}:`, error);
    //   }
    // }
  }
}