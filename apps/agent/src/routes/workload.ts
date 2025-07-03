import express from 'express';
import { z } from 'zod';
import { DockerService, ContainerConfig } from '../services/docker';
import { TunnelService } from '../services/tunnel';

const router = express.Router();

// Validation schemas
const deploySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['postgres', 'minio', 'custom']),
  config: z.object({
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    image: z.string().optional(),
    ports: z.array(z.number()).optional(),
    environment: z.record(z.string()).optional(),
    accessKey: z.string().optional(),
    secretKey: z.string().optional(),
    bucket: z.string().optional(),
  }).optional(),
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      dockerService: DockerService;
      tunnelService: TunnelService;
    }
  }
}

// Deploy a new workload
router.post('/deploy', async (req, res) => {
  try {
    const validatedData = deploySchema.parse(req.body);
    
    const containerConfig: ContainerConfig = {
      name: validatedData.name,
      type: validatedData.type,
      image: validatedData.config?.image,
      environment: validatedData.config?.environment,
      ports: validatedData.config?.ports,
    };

    // Deploy container
    const deployedContainer = await req.dockerService.deployContainer(containerConfig);

    // Create tunnel if container has a port
    let tunnel = null;
    if (deployedContainer.port) {
      try {
        tunnel = await req.tunnelService.createTunnel({
          port: deployedContainer.port,
          protocol: deployedContainer.type === 'postgres' ? 'tcp' : 'http',
        });
        deployedContainer.publicUrl = tunnel.publicUrl;
      } catch (error) {
        console.error('Failed to create tunnel:', error);
        // Continue without tunnel - container is still usable locally
      }
    }

    res.json({
      success: true,
      data: {
        ...deployedContainer,
        tunnel: tunnel || null,
      },
    });
  } catch (error) {
    console.error('Deploy error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// List all workloads
router.get('/', async (req, res) => {
  try {
    const containers = req.dockerService.getAllContainers();
    res.json({
      success: true,
      data: containers,
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get workload by ID
router.get('/:id', async (req, res) => {
  try {
    const container = req.dockerService.getContainer(req.params.id);
    if (!container) {
      return res.status(404).json({
        success: false,
        error: 'Workload not found',
      });
    }

    res.json({
      success: true,
      data: container,
    });
  } catch (error) {
    console.error('Get workload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Stop workload
router.post('/:id/stop', async (req, res) => {
  try {
    await req.dockerService.stopContainer(req.params.id);
    res.json({
      success: true,
      message: 'Workload stopped successfully',
    });
  } catch (error) {
    console.error('Stop error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start workload
router.post('/:id/start', async (req, res) => {
  try {
    await req.dockerService.startContainer(req.params.id);
    res.json({
      success: true,
      message: 'Workload started successfully',
    });
  } catch (error) {
    console.error('Start error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete workload
router.delete('/:id', async (req, res) => {
  try {
    // Get container info to find associated tunnel
    const container = req.dockerService.getContainer(req.params.id);
    
    // Close tunnel if exists
    if (container?.port) {
      const tunnel = req.tunnelService.getTunnelByPort(container.port);
      if (tunnel) {
        try {
          await req.tunnelService.closeTunnel(tunnel.id);
        } catch (error) {
          console.error('Failed to close tunnel:', error);
          // Continue with container deletion
        }
      }
    }

    // Delete container
    await req.dockerService.deleteContainer(req.params.id);
    
    res.json({
      success: true,
      message: 'Workload deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get workload logs
router.get('/:id/logs', async (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines as string) : 100;
    const logs = await req.dockerService.getContainerLogs(req.params.id, lines);
    
    res.json({
      success: true,
      data: {
        logs,
      },
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get tunnel status
router.get('/:id/tunnel', async (req, res) => {
  try {
    const container = req.dockerService.getContainer(req.params.id);
    if (!container || !container.port) {
      return res.status(404).json({
        success: false,
        error: 'No tunnel found for this workload',
      });
    }

    const tunnel = req.tunnelService.getTunnelByPort(container.port);
    res.json({
      success: true,
      data: tunnel || null,
    });
  } catch (error) {
    console.error('Tunnel status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as workloadRoutes };