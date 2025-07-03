import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DockerService } from './services/docker';
import { TunnelService } from './services/tunnel';
import { workloadRoutes } from './routes/workload';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const dockerService = new DockerService();
const tunnelService = new TunnelService();

// Add services to request context
app.use((req, res, next) => {
  req.dockerService = dockerService;
  req.tunnelService = tunnelService;
  next();
});

// Routes
app.use('/api/workloads', workloadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    docker: dockerService.isConnected(),
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Agent Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

async function startAgent() {
  try {
    // Initialize Docker connection
    await dockerService.connect();
    console.log('✅ Docker connection established');

    // Start server
    app.listen(port, () => {
      console.log(`🤖 Lattice Console Agent running on port ${port}`);
      console.log(`🐳 Docker connected: ${dockerService.isConnected()}`);
      console.log(`🌐 API endpoint: http://localhost:${port}/api`);
      console.log(`❤️ Health check: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start agent:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down agent...');
  await dockerService.cleanup();
  process.exit(0);
});

startAgent();