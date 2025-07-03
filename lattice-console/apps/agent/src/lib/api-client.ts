import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { type AppRouter } from '@lattice-console/trpc';
import { Logger } from '@lattice-console/utils';
import superjson from 'superjson';

const logger = Logger.child({ module: 'api-client' });

export class ApiClient {
  private client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  private agentId?: string;
  private agentToken?: string;

  constructor() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    this.client = createTRPCProxyClient<AppRouter>({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${backendUrl}/trpc`,
          headers: () => ({
            'x-agent-id': this.agentId || '',
            'x-agent-token': this.agentToken || '',
          }),
        }),
      ],
    });
  }

  setAgentCredentials(agentId: string, token: string) {
    this.agentId = agentId;
    this.agentToken = token;
  }

  async registerAgent(data: {
    hostname: string;
    platform: string;
    dockerVersion: string | null;
    resources: {
      cpuCores: number;
      totalMemory: number;
      totalDisk: number;
    };
  }) {
    try {
      const result = await this.client.agent.register.mutate({
        ...data,
        secret: process.env.AGENT_SECRET || '',
      });
      return result;
    } catch (error) {
      logger.error('Failed to register agent', error);
      throw error;
    }
  }

  async sendHeartbeat(data: {
    availableMemory: number;
    availableDisk: number;
  }) {
    if (!this.agentId || !this.agentToken) {
      throw new Error('Agent not registered');
    }

    try {
      await this.client.agent.heartbeat.mutate({
        agentId: this.agentId,
        token: this.agentToken,
        resources: data,
      });
    } catch (error) {
      logger.error('Failed to send heartbeat', error);
      throw error;
    }
  }

  async reportWorkloadStatus(data: {
    workloadId: string;
    status: 'provisioning' | 'running' | 'stopping' | 'stopped' | 'error';
    message?: string;
    publicUrl?: string | null;
    credentials?: Record<string, string>;
  }) {
    if (!this.agentId || !this.agentToken) {
      throw new Error('Agent not registered');
    }

    try {
      await this.client.agent.reportWorkloadStatus.mutate({
        agentId: this.agentId,
        token: this.agentToken,
        ...data,
      });
    } catch (error) {
      logger.error('Failed to report workload status', error);
      throw error;
    }
  }
}