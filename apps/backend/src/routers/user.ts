import { t } from './_trpc';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';

export const userRouter = t.router({
  getAll: t.procedure.query(async () => {
    return prisma.user.findMany();
  }),
  register: t.procedure.input(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    })
  ).mutation(async ({ input }) => {
    const hashed = await bcrypt.hash(input.password, 10);
    return prisma.user.create({
      data: { email: input.email, password: hashed },
    });
  }),
}); 