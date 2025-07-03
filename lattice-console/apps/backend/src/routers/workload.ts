import { workloadRouter as baseWorkloadRouter } from '@lattice-console/trpc/dist/routers/workload';

// For now, we'll just re-export the base router
// In a real implementation, we would override the procedures with actual logic
export const workloadRouter = baseWorkloadRouter;