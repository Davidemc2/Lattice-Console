import { t } from './_trpc';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

export const nodeRouter = t.router({
  getAll: t.procedure.query(async () => {
    return prisma.node.findMany();
  }),
  create: t.procedure.input(
    z.object({
      name: z.string(),
      address: z.string(),
    })
  ).mutation(async ({ input }) => {
    return prisma.node.create({ data: input });
  }),
}); 