import 'dotenv/config';
import { Logger, CryptoUtils } from '@lattice-console/utils';
import { DockerService } from './services/docker';
import { TunnelService } from './services/tunnel';
import { ApiClient } from './lib/api-client';
import cron from 'node-cron';
import { WorkloadManager } from './services/workload-manager';

const logger = Logger.child({ service: 'agent' });

class Agent {
  private dockerService: DockerService;
  private tunnelService: TunnelService;
  private apiClient: ApiClient;
  private workloadManager: WorkloadManager;
  private agentId?: string;
  private heartbeatTask?: cron.ScheduledTask;

  constructor() {
    this.dockerService = new DockerService();
    this.tunnelService = new TunnelService();
    this.apiClient = new ApiClient();
    this.workloadManager = new WorkloadManager(
      this.dockerService,
      this.tunnelService,
      this.apiClient
    );
  }

  async start() {
    try {
      logger.info('Starting Lattice Console Agent...');

      // Check Docker connectivity
      await this.dockerService.checkConnection();
      logger.info('Docker connection established');

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
      const systemInfo = await this.dockerService.getSystemInfo();
      
      const result = await this.apiClient.registerAgent({
        hostname: systemInfo.hostname,
        platform: systemInfo.platform,
        dockerVersion: systemInfo.dockerVersion,
        resources: {
          cpuCores: systemInfo.cpuCores,
          totalMemory: systemInfo.totalMemory,
          totalDisk: systemInfo.totalDisk,
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
    if (this.heartbeatTask) {
      this.heartbeatTask.stop();
    }

    // Stop workload manager
    await this.workloadManager.stop();

    // Clean up resources
    await this.tunnelService.closeAll();

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