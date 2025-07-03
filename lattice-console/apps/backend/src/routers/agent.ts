import { agentRouter as baseAgentRouter } from '@lattice-console/trpc/dist/routers/agent';

// For now, we'll just re-export the base router
// In a real implementation, we would override the procedures with actual logic
export const agentRouter = baseAgentRouter;