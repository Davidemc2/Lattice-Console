import { DockerService } from './docker';
import { TunnelService } from './tunnel';
import { BuildService } from './build';
import { CronService } from './cron';
import { WorkloadManager } from './workload-manager';

// Mock ApiClient for isolated testing
// Do not extend ApiClient, just implement the required methods for the test
class MockApiClient {
  async registerAgent(): Promise<{ id: string; token: string }> {
    return { id: 'agent-123', token: 'mock-token' };
  }
  setAgentCredentials(): void {}
  async getAssignedWorkloads(): Promise<any[]> {
    return [
      {
        id: 'workload-1',
        type: 'POSTGRES',
        status: 'provisioning',
        config: {
          version: '15',
          database: 'testdb',
          username: 'testuser',
          password: 'testpass',
          cpu: 1,
          memory: 256,
          disk: 5,
        },
      },
    ];
  }
  async reportWorkloadStatus(): Promise<void> {}
  async sendHeartbeat(): Promise<void> {}
  async reportWorkloadLog(): Promise<void> {}
}

describe('Agent E2E Integration', () => {
  let dockerService: DockerService;
  let tunnelService: TunnelService;
  let buildService: BuildService;
  let cronService: CronService;
  let workloadManager: WorkloadManager;
  let apiClient: MockApiClient;

  beforeAll(async () => {
    dockerService = new DockerService();
    tunnelService = new TunnelService();
    buildService = new BuildService();
    cronService = new CronService();
    apiClient = new MockApiClient();
    workloadManager = new WorkloadManager(dockerService, tunnelService, apiClient as any);
    await dockerService.initialize();
    await tunnelService.initialize();
    await buildService.initialize();
    await cronService.initialize();
  }, 60000);

  afterAll(async () => {
    await tunnelService.shutdown();
    await dockerService.shutdown();
    await buildService.shutdown();
    await cronService.shutdown();
  }, 30000);

  it('should deploy a Postgres workload end-to-end', async () => {
    await workloadManager.start();
    // Wait for workload to be deployed
    await new Promise((resolve) => setTimeout(resolve, 15000));
    // Check that the workload is tracked as active
    expect(workloadManager.getActiveWorkloadIds().includes('workload-1')).toBe(true);
    await workloadManager.stop();
  }, 30000);
}); 