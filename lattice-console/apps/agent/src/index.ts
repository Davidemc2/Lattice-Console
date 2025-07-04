import 'dotenv/config';
import { Logger } from '@lattice-console/utils';
import { DockerService } from './services/docker';
import { TunnelService } from './services/tunnel';
import { ApiClient } from './lib/api-client';
import cron from 'node-cron';
import { WorkloadManager } from './services/workload-manager';
import { BuildService } from './services/build';
import { CronService } from './services/cron';

const logger = Logger.child({ service: 'agent' });

class Agent {
  private dockerService: DockerService;
  private tunnelService: TunnelService;
  private apiClient: ApiClient;
  private workloadManager: WorkloadManager;
  private buildService: BuildService;
  private cronService: CronService;
  private agentId?: string;
  private heartbeatTask?: cron.ScheduledTask;

  constructor() {
    this.dockerService = new DockerService();
    this.tunnelService = new TunnelService();
    this.apiClient = new ApiClient();
    this.buildService = new BuildService();
    this.cronService = new CronService();
    this.workloadManager = new WorkloadManager(
      this.dockerService,
      this.tunnelService,
      this.apiClient
    );
  }

  async start() {
    try {
      logger.info('Starting Lattice Console Agent...');

      // Initialize all services
      await this.dockerService.initialize();
      await this.tunnelService.initialize();
      await this.buildService.initialize();
      await this.cronService.initialize();

      // Register with backend
      await this.register();

      // Start heartbeat
      this.startHeartbeat();

      // Start workload manager
      await this.workloadManager.start();

      logger.info('Agent started successfully', { agentId: this.agentId });

      // Handle shutdown gracefully
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
    } catch (error) {
      logger.error('Failed to start agent', error);
      process.exit(1);
    }
  }

  private async register() {
    try {
      const result = await this.apiClient.registerAgent({
        hostname: process.env.HOSTNAME || 'localhost',
        platform: process.platform,
        dockerVersion: process.env.DOCKER_VERSION || 'unknown',
        resources: {
          cpuCores: Number(process.env.CPU_CORES) || 4,
          totalMemory: Number(process.env.TOTAL_MEMORY) || 8192,
          totalDisk: Number(process.env.TOTAL_DISK) || 256000,
        },
      });

      this.agentId = result.id;
      this.apiClient.setAgentCredentials(result.id, result.token);
      
      logger.info('Agent registered successfully', { agentId: this.agentId });
    } catch (error) {
      logger.error('Failed to register agent', error);
      throw error;
    }
  }

  private startHeartbeat() {
    // Send heartbeat every 30 seconds
    this.heartbeatTask = cron.schedule('*/30 * * * * *', async () => {
      try {
        const resources = await this.dockerService.getResourceUsage();
        
        await this.apiClient.sendHeartbeat({
          availableMemory: resources.availableMemory,
          availableDisk: resources.availableDisk,
        });
        
        logger.debug('Heartbeat sent successfully');
      } catch (error) {
        logger.error('Failed to send heartbeat', error);
      }
    });
  }

  private async shutdown() {
    logger.info('Shutting down agent...');

    // Stop heartbeat
    try {
      if (this.heartbeatTask) {
        this.heartbeatTask.stop();
      }
    } catch (err) {
      logger.warn('Error stopping heartbeat:', err);
    }

    // Stop workload manager
    try {
      await this.workloadManager.stop();
    } catch (err) {
      logger.warn('Error stopping workload manager:', err);
    }

    // Shutdown CronService
    try {
      await this.cronService.shutdown();
    } catch (err) {
      logger.warn('Error shutting down CronService:', err);
    }

    // Shutdown TunnelService
    try {
      await this.tunnelService.closeAllTunnels();
    } catch (err) {
      logger.warn('Error shutting down TunnelService:', err);
    }

    // Shutdown DockerService
    try {
      await this.dockerService.shutdown();
    } catch (err) {
      logger.warn('Error shutting down DockerService:', err);
    }

    // Shutdown BuildService
    try {
      await this.buildService.shutdown();
    } catch (err) {
      logger.warn('Error shutting down BuildService:', err);
    }

    logger.info('Agent shutdown complete');
    process.exit(0);
  }
}

// Start the agent
const agent = new Agent();
agent.start().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});