import Docker from 'dockerode';
import { Logger } from '@lattice-console/utils';
import * as os from 'os';

interface DeploymentConfig {
  workloadId: string;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

interface PostgreSQLConfig extends DeploymentConfig {
  version: string;
  database: string;
  username: string;
  password: string;
}

interface RedisConfig extends DeploymentConfig {
  version: string;
  password: string;
}

interface MinIOConfig extends DeploymentConfig {
  accessKey: string;
  secretKey: string;
  buckets: string[];
}

interface NodeJSConfig extends DeploymentConfig {
  imageId: string;
  env: Record<string, string>;
  port?: number;
}

interface PythonConfig extends DeploymentConfig {
  imageId: string;
  env: Record<string, string>;
  port?: number;
}

interface ContainerInfo {
  id: string;
  port: number;
  internalPort: number;
  status: string;
  publicUrl?: string;
}

interface ResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  availableMemory: number;
  availableDisk: number;
}

export class DockerService {
  private docker: Docker;
  private containers: Map<string, Docker.Container> = new Map();
  private portRange = { min: 30000, max: 40000 };
  private usedPorts: Set<number> = new Set();

  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',
    });
  }

  async initialize(): Promise<void> {
    Logger.info('Initializing Docker service...');

    try {
      // Test Docker connection
      const info = await this.docker.info();
      Logger.info(`Docker connected: ${info.ServerVersion}`);

      // Create Docker network for Lattice containers
      await this.createLatticeNetwork();

      // Pull required base images
      await this.pullBaseImages();

      // Discover existing containers
      await this.discoverExistingContainers();

      Logger.info('Docker service initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize Docker service:', error);
      throw error;
    }
  }

  private async createLatticeNetwork(): Promise<void> {
    try {
      const networks = await this.docker.listNetworks();
      const latticeNetwork = networks.find(network => network.Name === 'lattice');
      
      if (!latticeNetwork) {
        Logger.info('Creating Lattice Docker network...');
        await this.docker.createNetwork({
          Name: 'lattice',
          Driver: 'bridge',
          Internal: false,
          Attachable: true,
          Labels: {
            'lattice.network': 'true'
          }
        });
        Logger.info('Lattice Docker network created');
      }
    } catch (error) {
      Logger.warn(`Failed to create Lattice network: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async pullBaseImages(): Promise<void> {
    const images = [
      'postgres:15',
      'postgres:14',
      'postgres:13',
      'redis:7',
      'redis:6',
      'minio/minio:latest',
      'node:18-alpine',
      'node:16-alpine',
      'python:3.11-slim',
      'python:3.10-slim',
      'python:3.9-slim',
    ];

    for (const image of images) {
      try {
        Logger.info(`Pulling image: ${image}`);
        const stream = await this.docker.pull(image);
        await this.streamToPromise(stream);
    } catch (error) {
        Logger.warn(`Failed to pull image ${image}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async discoverExistingContainers(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      
      for (const containerInfo of containers) {
        const workloadId = containerInfo.Labels?.['lattice.workload.id'];
        if (workloadId) {
          const container = this.docker.getContainer(containerInfo.Id);
          this.containers.set(workloadId, container);
          
          // Track used ports
          if (containerInfo.Ports) {
            containerInfo.Ports.forEach(port => {
              if (port.PublicPort) {
                this.usedPorts.add(port.PublicPort);
              }
            });
          }
        }
      }
      
      Logger.info(`Discovered ${this.containers.size} existing Lattice containers`);
    } catch (error) {
      Logger.error(`Failed to discover existing containers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deployPostgreSQL(config: PostgreSQLConfig): Promise<ContainerInfo> {
    Logger.info(`Deploying PostgreSQL for workload ${config.workloadId}`);

    const containerName = `postgres-${config.workloadId}`;
    const port = await this.getAvailablePort();
    const dataVolume = `postgres-data-${config.workloadId}`;

    // Create volume for data persistence
    await this.createVolume(dataVolume);

      const container = await this.docker.createContainer({
      name: containerName,
      Image: `postgres:${config.version}`,
      Env: [
        `POSTGRES_DB=${config.database}`,
        `POSTGRES_USER=${config.username}`,
        `POSTGRES_PASSWORD=${config.password}`,
      ],
      ExposedPorts: {
        '5432/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '5432/tcp': [{ HostPort: port.toString() }],
        },
        Memory: config.resources.memory * 1024 * 1024,
        CpuShares: Math.floor(config.resources.cpu * 1024),
        RestartPolicy: {
          Name: 'unless-stopped',
        },
        Mounts: [
          {
            Type: 'volume',
            Source: dataVolume,
            Target: '/var/lib/postgresql/data',
          },
        ],
      },
      NetworkingConfig: {
        EndpointsConfig: {
          lattice: {},
        },
      },
        Labels: {
        'lattice.workload.id': config.workloadId,
        'lattice.service.type': 'postgresql',
        'lattice.version': config.version,
      },
    });

    await container.start();
    await this.waitForPostgreSQL(container, config.username, config.database);

    this.containers.set(config.workloadId, container);
    this.usedPorts.add(port);

    return {
      id: container.id!,
      port,
      internalPort: 5432,
      status: 'running',
    };
  }

  async deployRedis(config: RedisConfig): Promise<ContainerInfo> {
    Logger.info(`Deploying Redis for workload ${config.workloadId}`);

    const containerName = `redis-${config.workloadId}`;
    const port = await this.getAvailablePort();
    const dataVolume = `redis-data-${config.workloadId}`;

    await this.createVolume(dataVolume);

    const container = await this.docker.createContainer({
      name: containerName,
      Image: `redis:${config.version}`,
      Cmd: ['redis-server', '--requirepass', config.password, '--appendonly', 'yes'],
      ExposedPorts: {
        '6379/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '6379/tcp': [{ HostPort: port.toString() }],
        },
        Memory: config.resources.memory * 1024 * 1024,
        CpuShares: Math.floor(config.resources.cpu * 1024),
          RestartPolicy: {
            Name: 'unless-stopped',
        },
        Mounts: [
          {
            Type: 'volume',
            Source: dataVolume,
            Target: '/data',
          },
        ],
      },
      NetworkingConfig: {
        EndpointsConfig: {
          lattice: {},
        },
      },
      Labels: {
        'lattice.workload.id': config.workloadId,
        'lattice.service.type': 'redis',
        'lattice.version': config.version,
        },
      });

      await container.start();
    await this.waitForRedis(container, config.password);

    this.containers.set(config.workloadId, container);
    this.usedPorts.add(port);

    return {
      id: container.id!,
      port,
      internalPort: 6379,
      status: 'running',
    };
  }

  async deployMinIO(config: MinIOConfig): Promise<ContainerInfo> {
    Logger.info(`Deploying MinIO for workload ${config.workloadId}`);

    const containerName = `minio-${config.workloadId}`;
    const port = await this.getAvailablePort();
    const consolePort = await this.getAvailablePort();
    const dataVolume = `minio-data-${config.workloadId}`;

    await this.createVolume(dataVolume);

    const container = await this.docker.createContainer({
      name: containerName,
      Image: 'minio/minio:latest',
      Cmd: ['server', '/data', '--console-address', `:${consolePort}`],
      Env: [
        `MINIO_ROOT_USER=${config.accessKey}`,
        `MINIO_ROOT_PASSWORD=${config.secretKey}`,
      ],
      ExposedPorts: {
        '9000/tcp': {},
        [`${consolePort}/tcp`]: {},
      },
      HostConfig: {
        PortBindings: {
          '9000/tcp': [{ HostPort: port.toString() }],
          [`${consolePort}/tcp`]: [{ HostPort: consolePort.toString() }],
        },
        Memory: config.resources.memory * 1024 * 1024,
        CpuShares: Math.floor(config.resources.cpu * 1024),
        RestartPolicy: {
          Name: 'unless-stopped',
        },
        Mounts: [
          {
            Type: 'volume',
            Source: dataVolume,
            Target: '/data',
          },
        ],
      },
      NetworkingConfig: {
        EndpointsConfig: {
          lattice: {},
        },
      },
      Labels: {
        'lattice.workload.id': config.workloadId,
        'lattice.service.type': 'minio',
        'lattice.console.port': consolePort.toString(),
      },
    });

    await container.start();
    await this.waitForMinIO(port);

    // Create initial buckets
    await this.createMinIOBuckets(config.buckets);

    this.containers.set(config.workloadId, container);
    this.usedPorts.add(port);
    this.usedPorts.add(consolePort);

    return {
      id: container.id!,
      port,
      internalPort: 9000,
      status: 'running',
    };
  }

  async deployNodeJS(config: NodeJSConfig): Promise<ContainerInfo> {
    Logger.info(`Deploying Node.js app for workload ${config.workloadId}`);

    const containerName = `nodejs-${config.workloadId}`;
    const port = await this.getAvailablePort();
    const internalPort = config.port || 3000;

    const envVars = Object.entries(config.env).map(([key, value]) => `${key}=${value}`);
    envVars.push(`PORT=${internalPort}`);

    const container = await this.docker.createContainer({
      name: containerName,
      Image: config.imageId,
      Env: envVars,
      ExposedPorts: {
        [`${internalPort}/tcp`]: {},
      },
      HostConfig: {
        PortBindings: {
          [`${internalPort}/tcp`]: [{ HostPort: port.toString() }],
        },
        Memory: config.resources.memory * 1024 * 1024,
        CpuShares: Math.floor(config.resources.cpu * 1024),
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
      NetworkingConfig: {
        EndpointsConfig: {
          lattice: {},
        },
      },
      Labels: {
        'lattice.workload.id': config.workloadId,
        'lattice.service.type': 'nodejs',
      },
    });

    await container.start();
    await this.waitForHTTP(port, 60000); // Wait up to 60 seconds

    this.containers.set(config.workloadId, container);
    this.usedPorts.add(port);

    return {
      id: container.id!,
      port,
      internalPort,
      status: 'running',
    };
  }

  async deployPython(config: PythonConfig): Promise<ContainerInfo> {
    Logger.info(`Deploying Python app for workload ${config.workloadId}`);

    const containerName = `python-${config.workloadId}`;
    const port = await this.getAvailablePort();
    const internalPort = config.port || 8000;

    const envVars = Object.entries(config.env).map(([key, value]) => `${key}=${value}`);
    envVars.push(`PORT=${internalPort}`);

    const container = await this.docker.createContainer({
      name: containerName,
      Image: config.imageId,
      Env: envVars,
      ExposedPorts: {
        [`${internalPort}/tcp`]: {},
      },
      HostConfig: {
        PortBindings: {
          [`${internalPort}/tcp`]: [{ HostPort: port.toString() }],
        },
        Memory: config.resources.memory * 1024 * 1024,
        CpuShares: Math.floor(config.resources.cpu * 1024),
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
      NetworkingConfig: {
        EndpointsConfig: {
          lattice: {},
        },
      },
      Labels: {
        'lattice.workload.id': config.workloadId,
        'lattice.service.type': 'python',
      },
    });

    await container.start();
    await this.waitForHTTP(port, 60000);

    this.containers.set(config.workloadId, container);
    this.usedPorts.add(port);

    return {
      id: container.id!,
      port,
      internalPort,
      status: 'running',
    };
  }

  async stopContainer(containerId: string): Promise<void> {
    Logger.info(`Stopping container ${containerId}`);
    
      const container = this.docker.getContainer(containerId);
      await container.stop();
    
    Logger.info(`Container ${containerId} stopped successfully`);
  }

  async removeContainer(containerId: string): Promise<void> {
    Logger.info(`Removing container ${containerId}`);
    
    const container = this.docker.getContainer(containerId);
    
    try {
      await container.stop();
    } catch (error) {
      // Container might already be stopped
    }
    
      await container.remove({ force: true });
    
    // Remove from tracking
    for (const [workloadId, trackedContainer] of this.containers.entries()) {
      if (trackedContainer.id === containerId) {
        this.containers.delete(workloadId);
        break;
      }
    }
    
    Logger.info(`Container ${containerId} removed successfully`);
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    try {
      const containers = await this.docker.listContainers();
      let totalCpuUsage = 0;
      let totalMemoryUsage = 0;

      // Get container stats
      for (const containerInfo of containers) {
        try {
          const container = this.docker.getContainer(containerInfo.Id);
          const stats = await container.stats({ stream: false });
          
          // Calculate CPU usage percentage
          const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
          const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
          const cpuUsage = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
          
          totalCpuUsage += cpuUsage || 0;
          totalMemoryUsage += stats.memory_stats.usage || 0;
        } catch (error) {
          // Skip containers that can't provide stats
        }
      }

      // Get system resources
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      // Get disk usage
      const diskUsage = await this.getDiskUsage();

      return {
        cpuUsage: totalCpuUsage,
        memoryUsage: (usedMemory / totalMemory) * 100,
        diskUsage: diskUsage.usedPercentage,
        availableMemory: freeMemory / (1024 * 1024), // Convert to MB
        availableDisk: diskUsage.available / (1024 * 1024 * 1024), // Convert to GB
      };
    } catch (error) {
      Logger.error('Failed to get resource usage:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        availableMemory: 0,
        availableDisk: 0,
      };
    }
  }

  private async getAvailablePort(): Promise<number> {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports in range');
  }

  private async createVolume(name: string): Promise<void> {
    try {
      await this.docker.createVolume({
        Name: name,
        Labels: {
          'lattice.volume': 'true',
        },
      });
    } catch (error) {
      // Volume might already exist
      if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' && !error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  private async waitForPostgreSQL(container: Docker.Container, username: string, database: string): Promise<void> {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const exec = await container.exec({
          Cmd: ['pg_isready', '-U', username, '-d', database],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({});
        const output = await this.streamToString(stream);

        if (output.includes('accepting connections')) {
          Logger.info('PostgreSQL is ready');
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('PostgreSQL failed to start within timeout');
  }

  private async waitForRedis(container: Docker.Container, password: string): Promise<void> {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const exec = await container.exec({
          Cmd: ['redis-cli', '-a', password, 'ping'],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({});
        const output = await this.streamToString(stream);

        if (output.includes('PONG')) {
          Logger.info('Redis is ready');
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      retries++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Redis failed to start within timeout');
  }

  private async waitForMinIO(port: number): Promise<void> {
    await this.waitForHTTP(port, 30000);
    Logger.info('MinIO is ready');
  }

  private async waitForHTTP(port: number, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}/health`).catch(() => null);
        if (response && response.ok) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`HTTP service on port ${port} failed to start within timeout`);
  }

  private async createMinIOBuckets(buckets: string[]): Promise<void> {
    // Implementation would use MinIO client to create buckets
    // For now, this is a placeholder
    Logger.info(`Creating MinIO buckets: ${buckets.join(', ')}`);
  }

  private async getDiskUsage(): Promise<{ total: number; used: number; available: number; usedPercentage: number }> {
    try {
      // This is a simplified implementation
      // In production, you'd use a proper disk usage library
      return {
        total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
        used: 50 * 1024 * 1024 * 1024,   // 50GB placeholder
        available: 50 * 1024 * 1024 * 1024, // 50GB placeholder
        usedPercentage: 50,
      };
    } catch (error) {
      return {
        total: 0,
        used: 0,
        available: 0,
        usedPercentage: 0,
      };
    }
  }

  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }

  private async streamToPromise(stream: NodeJS.ReadableStream): Promise<void> {
    return new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  }

  async shutdown(): Promise<void> {
    Logger.info('Shutting down Docker service...');
    
    // Stop all managed containers gracefully
    for (const [workloadId, container] of this.containers.entries()) {
      try {
        await container.stop({ t: 10 }); // 10 second grace period
        Logger.info(`Stopped container for workload ${workloadId}`);
    } catch (error) {
        Logger.error(`Failed to stop container for workload ${workloadId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    this.containers.clear();
    this.usedPorts.clear();
    
    Logger.info('Docker service shutdown complete');
  }
}