import { t } from './_trpc';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

export const workloadRouter = t.router({
  getAll: t.procedure.query(async () => {
    return prisma.workload.findMany();
  }),
  create: t.procedure.input(
    z.object({
      name: z.string(),
      userId: z.string(),
      nodeId: z.string().optional(),
      status: z.string().default('pending'),
    })
  ).mutation(async ({ input }) => {
    return prisma.workload.create({ data: input });
  }),
}); 