import { Logger } from '@lattice-console/utils';
import { DockerService } from './docker';
import { TunnelService } from './tunnel';
import { ApiClient } from '../lib/api-client';

const logger = Logger.child({ module: 'workload-manager' });

/**
 * Manages the lifecycle of all workloads assigned to this agent node.
 * Polls backend for assignments, deploys containers, sets up tunnels, and reports status.
 */
export class WorkloadManager {
  private pollInterval: NodeJS.Timeout | null = null;
  private activeWorkloads: Map<string, any> = new Map();

  constructor(
    private dockerService: DockerService,
    private tunnelService: TunnelService,
    private apiClient: ApiClient
  ) {}

  /**
   * Start polling for workloads and managing their lifecycle.
   */
  async start() {
    logger.info('Starting workload manager');
    this.pollInterval = setInterval(() => this.pollWorkloads(), 10000);
    await this.pollWorkloads();
  }

  /**
   * Stop all workloads and polling.
   */
  async stop() {
    logger.info('Stopping workload manager');
    if (this.pollInterval) clearInterval(this.pollInterval);
    for (const id of this.activeWorkloads.keys()) {
      await this.stopWorkload(id);
    }
    this.activeWorkloads.clear();
  }

  /**
   * Poll backend for assigned workloads and deploy/stop as needed.
   */
  private async pollWorkloads() {
    try {
      // TODO: Implement workload polling from backend
      // const workloads = await this.apiClient.getAssignedWorkloads();
      // for (const workload of workloads) {
      //   if (!this.activeWorkloads.has(workload.id) && workload.status === 'provisioning') {
      //     await this.deployWorkload(workload);
      //   }
      // }
      // for (const id of this.activeWorkloads.keys()) {
      //   if (!workloads.find((w: any) => w.id === id && w.status === 'running')) {
      //     await this.stopWorkload(id);
      //   }
      // }
    } catch (err) {
      Logger.error('Error polling workloads', err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Stop and clean up a workload by ID.
   */
  private async stopWorkload(workloadId: string) {
    logger.info('Stopping workload', { id: workloadId });
    const w = this.activeWorkloads.get(workloadId);
    if (w) {
      try {
        await this.dockerService.stopContainer(w.containerId);
        await this.tunnelService.closeTunnel(w.tunnelId);
        await this.apiClient.reportWorkloadStatus({
          workloadId,
          status: 'stopped',
        });
      } catch (err) {
        logger.error('Error stopping workload', err);
      }
      this.activeWorkloads.delete(workloadId);
    }
  }

  /**
   * Returns the IDs of currently active workloads (for testing/monitoring).
   */
  public getActiveWorkloadIds(): string[] {
    return Array.from(this.activeWorkloads.keys());
  }
}