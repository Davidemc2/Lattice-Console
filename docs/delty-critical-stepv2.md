<tool_use name="create_project_document">
<document_name>Next Steps Technical Guide</document_name>
<document_content_markdown># Next Steps Technical Guide
## Lattice Console: MVP Launch Execution Manual

**Version**: 1.0  
**Date**: January 2025  
**Purpose**: Step-by-step execution guide to complete MVP and launch  
**Target Audience**: Senior developers ready for immediate implementation  
**References**: Solo MVP Technical Specification, Tech Implementation Guide  

---

## 1. Executive Summary

### 1.1 Current State vs MVP Requirements

**✅ Completed Components**:
- Database schema and migrations (Prisma)
- Backend API structure (tRPC routers)
- Frontend LogViewer component with E2E testing
- Project architecture and documentation

**⚠️ Critical Missing Components**:
- Agent Docker Service implementation (50% complete)
- Build Service for Git → Build → Deploy pipelines
- Cron Service for background job scheduling
- Tunnel Service for public access
- Desktop App (Electron) for provider onboarding
- Complete frontend dashboard for workload management
- Production deployment infrastructure

**🚀 MVP Definition**: 
- 10 active provider nodes running the desktop app
- 50 successfully deployed workloads (PostgreSQL, Redis, Node.js apps)
- End-to-end user journey: Download app → Register agent → Deploy workload → Access via public URL

### 1.2 Critical Path to Launch

:::plantuml
@startuml
rectangle "Week 1-2" as week1 {
  rectangle "Complete Agent Services" as agent
  rectangle "Docker Service" as docker
  rectangle "Build Service" as build
  rectangle "Tunnel Service" as tunnel
}
rectangle "Week 3-4" as week3 {
  rectangle "Desktop App" as desktop
  rectangle "Provider Onboarding" as onboard
  rectangle "Agent Integration" as integration
}
rectangle "Week 5-6" as week5 {
  rectangle "Consumer Dashboard" as dashboard
  rectangle "Workload Management" as workload
  rectangle "End-to-End Testing" as e2e
}
rectangle "Week 7-8" as week7 {
  rectangle "Production Deployment" as prod
  rectangle "Beta Testing" as beta
  rectangle "MVP Launch" as launch
}
week1 -> week3
week3 -> week5
week5 -> week7
@enduml
:::

---

## 2. Phase 1: Complete Agent Services (Week 1-2)

### 2.1 Docker Service Completion

**Current State**: Implementation cut off at Node.js deployment
**Required**: Complete all service deployments + resource management

**Complete Implementation** (`apps/agent/src/services/DockerService.ts`):

```typescript
import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

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
    logger.info('Initializing Docker service...');

    try {
      // Test Docker connection
      const info = await this.docker.info();
      logger.info(`Docker connected: ${info.ServerVersion}`);

      // Create Docker network for Lattice containers
      await this.createLatticeNetwork();

      // Pull required base images
      await this.pullBaseImages();

      // Discover existing containers
      await this.discoverExistingContainers();

      logger.info('Docker service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Docker service:', error);
      throw error;
    }
  }

  private async createLatticeNetwork(): Promise<void> {
    try {
      const networks = await this.docker.listNetworks();
      const latticeNetwork = networks.find(network => network.Name === 'lattice');
      
      if (!latticeNetwork) {
        logger.info('Creating Lattice Docker network...');
        await this.docker.createNetwork({
          Name: 'lattice',
          Driver: 'bridge',
          Internal: false,
          Attachable: true,
          Labels: {
            'lattice.network': 'true'
          }
        });
        logger.info('Lattice Docker network created');
      }
    } catch (error) {
      logger.warn('Failed to create Lattice network:', error);
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
        logger.info(`Pulling image: ${image}`);
        const stream = await this.docker.pull(image);
        await this.streamToPromise(stream);
      } catch (error) {
        logger.warn(`Failed to pull image ${image}:`, error);
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
      
      logger.info(`Discovered ${this.containers.size} existing Lattice containers`);
    } catch (error) {
      logger.error('Failed to discover existing containers:', error);
    }
  }

  async deployPostgreSQL(config: PostgreSQLConfig): Promise<ContainerInfo> {
    logger.info(`Deploying PostgreSQL for workload ${config.workloadId}`);

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
    await this.waitForPostgreSQL(container, config.username, config.password, config.database);

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
    logger.info(`Deploying Redis for workload ${config.workloadId}`);

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
    logger.info(`Deploying MinIO for workload ${config.workloadId}`);

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
    await this.waitForMinIO(container, port);

    // Create initial buckets
    await this.createMinIOBuckets(config.accessKey, config.secretKey, port, config.buckets);

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
    logger.info(`Deploying Node.js app for workload ${config.workloadId}`);

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
    logger.info(`Deploying Python app for workload ${config.workloadId}`);

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
    logger.info(`Stopping container ${containerId}`);
    
    const container = this.docker.getContainer(containerId);
    await container.stop();
    
    logger.info(`Container ${containerId} stopped successfully`);
  }

  async removeContainer(containerId: string): Promise<void> {
    logger.info(`Removing container ${containerId}`);
    
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
    
    logger.info(`Container ${containerId} removed successfully`);
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
      logger.error('Failed to get resource usage:', error);
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
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  private async waitForPostgreSQL(container: Docker.Container, username: string, password: string, database: string): Promise<void> {
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
          logger.info('PostgreSQL is ready');
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
          logger.info('Redis is ready');
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

  private async waitForMinIO(container: Docker.Container, port: number): Promise<void> {
    await this.waitForHTTP(port, 30000);
    logger.info('MinIO is ready');
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

  private async createMinIOBuckets(accessKey: string, secretKey: string, port: number, buckets: string[]): Promise<void> {
    // Implementation would use MinIO client to create buckets
    // For now, this is a placeholder
    logger.info(`Creating MinIO buckets: ${buckets.join(', ')}`);
  }

  private async getDiskUsage(): Promise<{ total: number; used: number; available: number; usedPercentage: number }> {
    try {
      const stats = await fs.stat('/');
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
    logger.info('Shutting down Docker service...');
    
    // Stop all managed containers gracefully
    for (const [workloadId, container] of this.containers.entries()) {
      try {
        await container.stop({ t: 10 }); // 10 second grace period
        logger.info(`Stopped container for workload ${workloadId}`);
      } catch (error) {
        logger.error(`Failed to stop container for workload ${workloadId}:`, error);
      }
    }
    
    this.containers.clear();
    this.usedPorts.clear();
    
    logger.info('Docker service shutdown complete');
  }
}
```

### 2.2 Build Service Implementation

**Create Build Service** (`apps/agent/src/services/BuildService.ts`):

```typescript
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import Docker from 'dockerode';

interface GitRepository {
  url: string;
  branch: string;
  credentials?: {
    username: string;
    token: string;
  };
}

interface BuildConfig {
  workloadId: string;
  gitUrl: string;
  gitBranch: string;
  env?: Record<string, string>;
}

interface BuildResult {
  success: boolean;
  imageId?: string;
  logs: string[];
  artifacts?: {
    type: string;
    imageId?: string;
    buildTime: number;
    size?: number;
  };
}

interface FrameworkDetection {
  framework: 'nodejs' | 'python' | 'static' | 'docker';
  subtype?: string;
  buildCommand?: string;
  startCommand?: string;
  dockerfile?: string;
}

export class BuildService {
  private docker: Docker;
  private buildDir: string;
  private activeBuildslogs: Map<string, string[]> = new Map();

  constructor() {
    this.docker = new Docker();
    this.buildDir = '/tmp/lattice-builds';
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Build service...');

    try {
      // Create build directory
      await fs.mkdir(this.buildDir, { recursive: true });

      // Verify Docker connection
      await this.docker.ping();

      logger.info('Build service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Build service:', error);
      throw error;
    }
  }

  async buildNodeJS(config: BuildConfig): Promise<BuildResult> {
    const buildId = uuidv4();
    const logs: string[] = [];
    this.activeBuildslogs.set(buildId, logs);

    try {
      logs.push(`Starting Node.js build for workload ${config.workloadId}`);
      const startTime = Date.now();

      // Clone repository
      const repoDir = await this.cloneRepository({
        url: config.gitUrl,
        branch: config.gitBranch,
      }, buildId);

      logs.push('Repository cloned successfully');

      // Detect framework and configuration
      const framework = await this.detectNodeJSFramework(repoDir);
      logs.push(`Detected framework: ${framework.framework} (${framework.subtype})`);

      // Create Dockerfile if not exists
      const dockerfile = await this.createNodeJSDockerfile(repoDir, framework, config.env);
      logs.push('Dockerfile created');

      // Build Docker image
      const imageId = await this.buildDockerImage(repoDir, dockerfile, buildId, logs);
      logs.push(`Docker image built successfully: ${imageId}`);

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        imageId,
        logs,
        artifacts: {
          type: 'docker',
          imageId,
          buildTime,
        },
      };
    } catch (error) {
      logs.push(`Build failed: ${error.message}`);
      logger.error('Node.js build failed:', error);
      return {
        success: false,
        logs,
      };
    } finally {
      this.activeBuildslogs.delete(buildId);
    }
  }

  async buildPython(config: BuildConfig): Promise<BuildResult> {
    const buildId = uuidv4();
    const logs: string[] = [];
    this.activeBuildslogs.set(buildId, logs);

    try {
      logs.push(`Starting Python build for workload ${config.workloadId}`);
      const startTime = Date.now();

      // Clone repository
      const repoDir = await this.cloneRepository({
        url: config.gitUrl,
        branch: config.gitBranch,
      }, buildId);

      logs.push('Repository cloned successfully');

      // Detect framework
      const framework = await this.detectPythonFramework(repoDir);
      logs.push(`Detected framework: ${framework.framework} (${framework.subtype})`);

      // Create Dockerfile
      const dockerfile = await this.createPythonDockerfile(repoDir, framework, config.env);
      logs.push('Dockerfile created');

      // Build Docker image
      const imageId = await this.buildDockerImage(repoDir, dockerfile, buildId, logs);
      logs.push(`Docker image built successfully: ${imageId}`);

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        imageId,
        logs,
        artifacts: {
          type: 'docker',
          imageId,
          buildTime,
        },
      };
    } catch (error) {
      logs.push(`Build failed: ${error.message}`);
      logger.error('Python build failed:', error);
      return {
        success: false,
        logs,
      };
    } finally {
      this.activeBuildslogs.delete(buildId);
    }
  }

  async buildStatic(config: BuildConfig): Promise<BuildResult> {
    const buildId = uuidv4();
    const logs: string[] = [];
    this.activeBuildslogs.set(buildId, logs);

    try {
      logs.push(`Starting static site build for workload ${config.workloadId}`);
      const startTime = Date.now();

      // Clone repository
      const repoDir = await this.cloneRepository({
        url: config.gitUrl,
        branch: config.gitBranch,
      }, buildId);

      logs.push('Repository cloned successfully');

      // Detect static site framework
      const framework = await this.detectStaticFramework(repoDir);
      logs.push(`Detected framework: ${framework.framework} (${framework.subtype})`);

      // Build static assets
      const buildDir = await this.buildStaticAssets(repoDir, framework, logs);
      logs.push('Static assets built successfully');

      // Create nginx Docker image for serving
      const dockerfile = await this.createStaticDockerfile(buildDir);
      logs.push('Dockerfile created');

      // Build Docker image
      const imageId = await this.buildDockerImage(path.dirname(dockerfile), dockerfile, buildId, logs);
      logs.push(`Docker image built successfully: ${imageId}`);

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        imageId,
        logs,
        artifacts: {
          type: 'docker',
          imageId,
          buildTime,
        },
      };
    } catch (error) {
      logs.push(`Build failed: ${error.message}`);
      logger.error('Static build failed:', error);
      return {
        success: false,
        logs,
      };
    } finally {
      this.activeBuildslogs.delete(buildId);
    }
  }

  private async cloneRepository(repo: GitRepository, buildId: string): Promise<string> {
    const repoDir = path.join(this.buildDir, buildId);
    await fs.mkdir(repoDir, { recursive: true });

    const gitArgs = ['clone', '--branch', repo.branch, '--depth', '1'];
    
    if (repo.credentials) {
      const authUrl = repo.url.replace('https://', `https://${repo.credentials.username}:${repo.credentials.token}@`);
      gitArgs.push(authUrl, repoDir);
    } else {
      gitArgs.push(repo.url, repoDir);
    }

    await this.executeCommand('git', gitArgs, '/tmp');
    return repoDir;
  }

  private async detectNodeJSFramework(repoDir: string): Promise<FrameworkDetection> {
    try {
      const packageJsonPath = path.join(repoDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      // Check for Next.js
      if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
        return {
          framework: 'nodejs',
          subtype: 'nextjs',
          buildCommand: 'npm run build',
          startCommand: 'npm start',
        };
      }

      // Check for Express/tRPC patterns
      if (packageJson.dependencies?.express || packageJson.dependencies?.['@trpc/server']) {
        return {
          framework: 'nodejs',
          subtype: 'express',
          buildCommand: packageJson.scripts?.build ? 'npm run build' : undefined,
          startCommand: packageJson.scripts?.start || 'node index.js',
        };
      }

      // Default Node.js application
      return {
        framework: 'nodejs',
        subtype: 'generic',
        startCommand: packageJson.scripts?.start || 'node index.js',
      };
    } catch (error) {
      throw new Error(`Failed to detect Node.js framework: ${error.message}`);
    }
  }

  private async detectPythonFramework(repoDir: string): Promise<FrameworkDetection> {
    try {
      // Check for Django
      const djangoFiles = ['manage.py', 'settings.py'];
      const hasDjango = await Promise.all(
        djangoFiles.map(file => fs.access(path.join(repoDir, file)).then(() => true).catch(() => false))
      );

      if (hasDjango.some(exists => exists)) {
        return {
          framework: 'python',
          subtype: 'django',
          startCommand: 'python manage.py runserver 0.0.0.0:8000',
        };
      }

      // Check for Flask
      const requirementsPath = path.join(repoDir, 'requirements.txt');
      try {
        const requirements = await fs.readFile(requirementsPath, 'utf8');
        if (requirements.includes('Flask')) {
          return {
            framework: 'python',
            subtype: 'flask',
            startCommand: 'python app.py',
          };
        }
        if (requirements.includes('fastapi')) {
          return {
            framework: 'python',
            subtype: 'fastapi',
            startCommand: 'uvicorn main:app --host 0.0.0.0 --port 8000',
          };
        }
      } catch (error) {
        // requirements.txt doesn't exist
      }

      // Default Python application
      return {
        framework: 'python',
        subtype: 'generic',
        startCommand: 'python main.py',
      };
    } catch (error) {
      throw new Error(`Failed to detect Python framework: ${error.message}`);
    }
  }

  private async detectStaticFramework(repoDir: string): Promise<FrameworkDetection> {
    try {
      const packageJsonPath = path.join(repoDir, 'package.json');
      
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

        // Check for React
        if (packageJson.dependencies?.react) {
          return {
            framework: 'static',
            subtype: 'react',
            buildCommand: 'npm run build',
          };
        }

        // Check for Vue
        if (packageJson.dependencies?.vue) {
          return {
            framework: 'static',
            subtype: 'vue',
            buildCommand: 'npm run build',
          };
        }

        // Check for Svelte
        if (packageJson.dependencies?.svelte) {
          return {
            framework: 'static',
            subtype: 'svelte',
            buildCommand: 'npm run build',
          };
        }
      } catch (error) {
        // No package.json, assume pure HTML/CSS/JS
      }

      return {
        framework: 'static',
        subtype: 'html',
        buildCommand: undefined,
      };
    } catch (error) {
      throw new Error(`Failed to detect static framework: ${error.message}`);
    }
  }

  private async createNodeJSDockerfile(repoDir: string, framework: FrameworkDetection, env?: Record<string, string>): Promise<string> {
    const dockerfilePath = path.join(repoDir, 'Dockerfile');

    // Check if Dockerfile already exists
    try {
      await fs.access(dockerfilePath);
      return dockerfilePath; // Use existing Dockerfile
    } catch (error) {
      // Create new Dockerfile
    }

    let dockerfileContent = `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

`;

    // Add build step if needed
    if (framework.buildCommand) {
      dockerfileContent += `# Build application
RUN ${framework.buildCommand}

`;
    }

    // Add environment variables
    if (env) {
      Object.entries(env).forEach(([key, value]) => {
        dockerfileContent += `ENV ${key}=${value}\n`;
      });
      dockerfileContent += '\n';
    }

    dockerfileContent += `# Expose port
EXPOSE 3000

# Start application
CMD ["${framework.startCommand?.split(' ')[0] || 'npm'}", "${framework.startCommand?.split(' ').slice(1).join('", "') || 'start'}"]
`;

    await fs.writeFile(dockerfilePath, dockerfileContent);
    return dockerfilePath;
  }

  private async createPythonDockerfile(repoDir: string, framework: FrameworkDetection, env?: Record<string, string>): Promise<string> {
    const dockerfilePath = path.join(repoDir, 'Dockerfile');

    // Check if Dockerfile already exists
    try {
      await fs.access(dockerfilePath);
      return dockerfilePath;
    } catch (error) {
      // Create new Dockerfile
    }

    let dockerfileContent = `FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

`;

    // Add environment variables
    if (env) {
      Object.entries(env).forEach(([key, value]) => {
        dockerfileContent += `ENV ${key}=${value}\n`;
      });
      dockerfileContent += '\n';
    }

    dockerfileContent += `# Expose port
EXPOSE 8000

# Start application
CMD ${JSON.stringify(framework.startCommand?.split(' ') || ['python', 'main.py'])}
`;

    await fs.writeFile(dockerfilePath, dockerfileContent);
    return dockerfilePath;
  }

  private async buildStaticAssets(repoDir: string, framework: FrameworkDetection, logs: string[]): Promise<string> {
    const buildOutputDir = path.join(repoDir, 'dist');

    if (framework.buildCommand) {
      logs.push(`Running build command: ${framework.buildCommand}`);
      
      // Install dependencies first
      await this.executeCommand('npm', ['install'], repoDir);
      logs.push('Dependencies installed');

      // Run build command
      await this.executeCommand('npm', ['run', 'build'], repoDir);
      logs.push('Build completed');

      // Find the actual build output directory
      const possibleDirs = ['dist', 'build', 'out', '.next/out'];
      for (const dir of possibleDirs) {
        const fullPath = path.join(repoDir, dir);
        try {
          await fs.access(fullPath);
          return fullPath;
        } catch (error) {
          // Directory doesn't exist
        }
      }
    }

    // If no build process or output found, use the repo dir itself
    return repoDir;
  }

  private async createStaticDockerfile(buildDir: string): Promise<string> {
    const dockerfilePath = path.join(path.dirname(buildDir), 'Dockerfile.static');

    const dockerfileContent = `FROM nginx:alpine

# Copy built assets
COPY ${path.basename(buildDir)} /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;

    // Create nginx configuration
    const nginxConfigPath = path.join(path.dirname(buildDir), 'nginx.conf');
    const nginxConfig = `events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;

        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
        }

        error_page 404 /index.html;
    }
}
`;

    await fs.writeFile(dockerfilePath, dockerfileContent);
    await fs.writeFile(nginxConfigPath, nginxConfig);

    return dockerfilePath;
  }

  private async buildDockerImage(contextDir: string, dockerfilePath: string, buildId: string, logs: string[]): Promise<string> {
    const imageTag = `lattice-build-${buildId}`;

    const buildStream = await this.docker.buildImage({
      context: contextDir,
      src: ['.'],
    }, {
      t: imageTag,
      dockerfile: path.basename(dockerfilePath),
    });

    return new Promise((resolve, reject) => {
      this.docker.modem.followProgress(buildStream, 
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(imageTag);
          }
        },
        (event) => {
          if (event.stream) {
            logs.push(event.stream.trim());
          }
        }
      );
    });
  }

  private async executeCommand(command: string, args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { cwd });
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
    logger.info('Shutting down Build service...');
    
    // Clean up build directories
    try {
      await fs.rm(this.buildDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to clean up build directory:', error);
    }

    this.activeBuildslogs.clear();
    
    logger.info('Build service shutdown complete');
  }
}
```

### 2.3 Tunnel Service Implementation

**Create Tunnel Service** (`apps/agent/src/services/TunnelService.ts`):

```typescript
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger';
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
    logger.info('Initializing Tunnel service...');

    try {
      // Install tunnel dependencies if needed
      await this.ensureTunnelTools();

      logger.info(`Tunnel service initialized with provider: ${this.tunnelProvider}`);
    } catch (error) {
      logger.error('Failed to initialize Tunnel service:', error);
      throw error;
    }
  }

  async createTunnel(config: TunnelConfig): Promise<TunnelInfo> {
    const tunnelId = `tunnel-${config.localPort}-${Date.now()}`;
    
    logger.info(`Creating tunnel for port ${config.localPort} with ID ${tunnelId}`);

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

      logger.info(`Tunnel created successfully: ${tunnelInfo.url}`);
      return tunnelInfo;

    } catch (error) {
      logger.error(`Failed to create tunnel: ${error.message}`);
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
        const urlMatch = output.match(/your url is: (https:\/\/[^\s]+)/);
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
        logger.warn(`LocalTunnel stderr: ${error}`);
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
        logger.warn(`Ngrok stderr: ${error}`);
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
    logger.info(`Closing tunnel for workload ${workloadId}`);

    // Find tunnel by workload ID (stored in tunnel ID)
    for (const [tunnelId, tunnel] of this.tunnels.entries()) {
      if (tunnelId.includes(workloadId)) {
        tunnel.process.kill('SIGTERM');
        this.tunnels.delete(tunnelId);
        logger.info(`Tunnel ${tunnelId} closed`);
        return;
      }
    }

    logger.warn(`No tunnel found for workload ${workloadId}`);
  }

  async closeAllTunnels(): Promise<void> {
    logger.info('Closing all tunnels...');

    for (const [tunnelId, tunnel] of this.tunnels.entries()) {
      tunnel.process.kill('SIGTERM');
    }

    this.tunnels.clear();
    logger.info('All tunnels closed');
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
      logger.info('LocalTunnel is available');
    } catch (error) {
      logger.info('Installing LocalTunnel...');
      try {
        await this.executeCommand('npm', ['install', '-g', 'localtunnel']);
        logger.info('LocalTunnel installed successfully');
      } catch (installError) {
        throw new Error(`Failed to install LocalTunnel: ${installError.message}`);
      }
    }
  }

  private async ensureNgrok(): Promise<void> {
    try {
      await this.executeCommand('which', ['ngrok']);
      logger.info('Ngrok is available');
    } catch (error) {
      throw new Error('Ngrok is not installed. Please install ngrok manually.');
    }
  }

  private async ensureCloudflare(): Promise<void> {
    try {
      await this.executeCommand('which', ['cloudflared']);
      logger.info('Cloudflare tunnel is available');
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
    logger.info('Shutting down Tunnel service...');
    await this.closeAllTunnels();
    logger.info('Tunnel service shutdown complete');
  }
}
```

### 2.4 Cron Service Implementation

**Create Cron Service** (`apps/agent/src/services/CronService.ts`):

```typescript
import * as cron from 'node-cron';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger';
import { APIClient } from '../lib/APIClient';

interface CronJobConfig {
  workloadId: string;
  name: string;
  schedule: string;
  command: string;
  env?: Record<string, string>;
  timeout?: number;
}

interface CronJob {
  id: string;
  workloadId: string;
  name: string;
  schedule: string;
  command: string;
  env: Record<string, string>;
  timeout: number;
  task: cron.ScheduledTask;
  status: 'active' | 'paused' | 'disabled';
  lastRun?: Date;
  nextRun?: Date;
  lastOutput?: string;
  lastError?: string;
}

interface CronExecution {
  jobId: string;
  startTime: Date;
  endTime?: Date;
  success?: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

export class CronService {
  private jobs: Map<string, CronJob> = new Map();
  private executions: Map<string, CronExecution[]> = new Map();
  private apiClient: APIClient;

  constructor() {
    this.apiClient = new APIClient();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Cron service...');

    try {
      // Validate cron library
      const testSchedule = '* * * * * *';
      const testTask = cron.schedule(testSchedule, () => {}, { scheduled: false });
      testTask.destroy();

      logger.info('Cron service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Cron service:', error);
      throw error;
    }
  }

  async deployCronJob(config: CronJobConfig): Promise<CronJob> {
    const jobId = `cron-${config.workloadId}-${Date.now()}`;
    
    logger.info(`Deploying cron job ${jobId} for workload ${config.workloadId}`);

    // Validate cron schedule
    if (!cron.validate(config.schedule)) {
      throw new Error(`Invalid cron schedule: ${config.schedule}`);
    }

    try {
      const task = cron.schedule(config.schedule, async () => {
        await this.executeCronJob(jobId);
      }, {
        scheduled: false, // Start manually after setup
        timezone: 'UTC',
      });

      const cronJob: CronJob = {
        id: jobId,
        workloadId: config.workloadId,
        name: config.name,
        schedule: config.schedule,
        command: config.command,
        env: config.env || {},
        timeout: config.timeout || 300000, // 5 minutes default
        task,
        status: 'active',
        nextRun: this.getNextRunTime(config.schedule),
      };

      this.jobs.set(jobId, cronJob);
      this.executions.set(jobId, []);

      // Start the cron job
      task.start();

      logger.info(`Cron job ${jobId} deployed and started`);
      return cronJob;

    } catch (error) {
      logger.error(`Failed to deploy cron job: ${error.message}`);
      throw error;
    }
  }

  private async executeCronJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'active') {
      return;
    }

    const execution: CronExecution = {
      jobId,
      startTime: new Date(),
    };

    logger.info(`Executing cron job ${jobId}: ${job.command}`);

    try {
      const result = await this.runCommand(job.command, job.env, job.timeout);
      
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.success = result.exitCode === 0;
      execution.output = result.stdout;
      execution.error = result.stderr;

      // Update job info
      job.lastRun = execution.startTime;
      job.nextRun = this.getNextRunTime(job.schedule);
      job.lastOutput = result.stdout;
      job.lastError = result.stderr;

      // Store execution history (keep last 100)
      const executions = this.executions.get(jobId) || [];
      executions.push(execution);
      if (executions.length > 100) {
        executions.shift();
      }
      this.executions.set(jobId, executions);

      // Report to backend
      await this.reportExecution(job, execution);

      if (result.exitCode === 0) {
        logger.info(`Cron job ${jobId} completed successfully`);
      } else {
        logger.warn(`Cron job ${jobId} failed with exit code ${result.exitCode}`);
      }

    } catch (error) {
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.success = false;
      execution.error = error.message;

      job.lastRun = execution.startTime;
      job.nextRun = this.getNextRunTime(job.schedule);
      job.lastError = error.message;

      // Store execution
      const executions = this.executions.get(jobId) || [];
      executions.push(execution);
      if (executions.length > 100) {
        executions.shift();
      }
      this.executions.set(jobId, executions);

      // Report to backend
      await this.reportExecution(job, execution);

      logger.error(`Cron job ${jobId} failed: ${error.message}`);
    }
  }

  private async runCommand(command: string, env: Record<string, string>, timeout: number): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      
      const process = spawn(cmd, args, {
        env: { ...process.env, ...env },
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        process.kill('SIGKILL');
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutHandle);
      });
    });
  }

  async pauseCronJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Cron job ${jobId} not found`);
    }

    job.task.stop();
    job.status = 'paused';
    job.nextRun = undefined;

    logger.info(`Cron job ${jobId} paused`);
  }

  async resumeCronJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Cron job ${jobId} not found`);
    }

    job.task.start();
    job.status = 'active';
    job.nextRun = this.getNextRunTime(job.schedule);

    logger.info(`Cron job ${jobId} resumed`);
  }

  async stopCronJob(workloadId: string): Promise<void> {
    // Find and stop all cron jobs for the workload
    const jobsToStop = Array.from(this.jobs.values()).filter(job => job.workloadId === workloadId);

    for (const job of jobsToStop) {
      job.task.stop();
      job.task.destroy();
      job.status = 'disabled';
      
      this.jobs.delete(job.id);
      this.executions.delete(job.id);
      
      logger.info(`Cron job ${job.id} stopped and removed`);
    }
  }

  async updateCronJob(jobId: string, updates: Partial<CronJobConfig>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Cron job ${jobId} not found`);
    }

    // Stop current task
    job.task.stop();
    job.task.destroy();

    // Apply updates
    if (updates.name) job.name = updates.name;
    if (updates.command) job.command = updates.command;
    if (updates.env) job.env = updates.env;
    if (updates.timeout) job.timeout = updates.timeout;

    // If schedule changed, create new task
    if (updates.schedule) {
      if (!cron.validate(updates.schedule)) {
        throw new Error(`Invalid cron schedule: ${updates.schedule}`);
      }
      
      job.schedule = updates.schedule;
      job.task = cron.schedule(job.schedule, async () => {
        await this.executeCronJob(jobId);
      }, {
        scheduled: false,
        timezone: 'UTC',
      });
    } else {
      // Recreate task with same schedule
      job.task = cron.schedule(job.schedule, async () => {
        await this.executeCronJob(jobId);
      }, {
        scheduled: false,
        timezone: 'UTC',
      });
    }

    // Restart if was active
    if (job.status === 'active') {
      job.task.start();
      job.nextRun = this.getNextRunTime(job.schedule);
    }

    logger.info(`Cron job ${jobId} updated`);
  }

  getCronJob(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  listCronJobs(workloadId?: string): CronJob[] {
    const allJobs = Array.from(this.jobs.values());
    return workloadId ? allJobs.filter(job => job.workloadId === workloadId) : allJobs;
  }

  getCronJobExecutions(jobId: string, limit: number = 50): CronExecution[] {
    const executions = this.executions.get(jobId) || [];
    return executions.slice(-limit).reverse(); // Most recent first
  }

  private getNextRunTime(schedule: string): Date {
    try {
      // This is a simplified implementation
      // In production, you'd use a proper cron expression parser
      const task = cron.schedule(schedule, () => {}, { scheduled: false });
      
      // Create a temporary task to get next execution time
      // This is a workaround since node-cron doesn't expose next run time directly
      const now = new Date();
      const next = new Date(now.getTime() + 60000); // Approximate next minute
      
      task.destroy();
      return next;
    } catch (error) {
      return new Date(Date.now() + 60000); // Default to 1 minute from now
    }
  }

  private async reportExecution(job: CronJob, execution: CronExecution): Promise<void> {
    try {
      // This would report to the backend API
      // Implementation depends on your API client
      await this.apiClient.reportCronExecution({
        jobId: job.id,
        workloadId: job.workloadId,
        execution: {
          startTime: execution.startTime,
          endTime: execution.endTime,
          duration: execution.duration,
          success: execution.success,
          output: execution.output,
          error: execution.error,
        },
      });
    } catch (error) {
      logger.warn(`Failed to report cron execution: ${error.message}`);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Cron service...');

    // Stop all cron jobs
    for (const job of this.jobs.values()) {
      job.task.stop();
      job.task.destroy();
    }

    this.jobs.clear();
    this.executions.clear();

    logger.info('Cron service shutdown complete');
  }
}
```

---

## 3. Phase 2: Desktop App Development (Week 3-4)

### 3.1 Electron Main Process

**Create Main Process** (`apps/desktop/src/main/main.ts`):

```typescript
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { Agent } from '../../../agent/src/Agent';
import { SystemInfo } from '../../../agent/src/utils/SystemInfo';
import { logger } from '../../../agent/src/utils/logger';

class DesktopApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private agent: Agent | null = null;
  private systemInfo: SystemInfo;
  private isQuitting = false;

  constructor() {
    this.systemInfo = new SystemInfo();
  }

  async initialize(): Promise<void> {
    // Wait for app to be ready
    await app.whenReady();

    // Create main window
    this.createMainWindow();

    // Create system tray
    this.createSystemTray();

    // Setup IPC handlers
    this.setupIPC();

    // Initialize agent
    await this.initializeAgent();

    // Setup app event handlers
    this.setupAppEvents();
  }

  private createMainWindow(): void {
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
      icon: this.getAppIcon(),
      show: false,
      titleBarStyle: 'default',
      autoHideMenuBar: true,
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3002');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Handle window events
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.webContents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });
  }

  private createSystemTray(): void {
    const trayIcon = this.getTrayIcon();
    this.tray = new Tray(trayIcon);

    this.updateTrayMenu();

    this.tray.on('click', () => {
      this.toggleMainWindow();
    });

    this.tray.on('right-click', () => {
      this.tray?.popUpContextMenu();
    });
  }

  private updateTrayMenu(): void {
    if (!this.tray) return;

    const agentStatus = this.agent ? 'Online' : 'Offline';
    const template = [
      {
        label: `Lattice Console - ${agentStatus}`,
        enabled: false,
      },
      {
        type: 'separator' as const,
      },
      {
        label: 'Show Dashboard',
        click: () => this.showMainWindow(),
      },
      {
        label: 