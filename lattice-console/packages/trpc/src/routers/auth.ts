import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { UserCreateSchema, UserLoginSchema } from '@lattice-console/utils';
import { TRPCError } from '@trpc/server';

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(UserCreateSchema)
    .output(z.object({
      id: z.string(),
      email: z.string(),
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // This would be implemented in the backend
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Register endpoint not implemented',
      });
    }),

  login: publicProcedure
    .input(UserLoginSchema)
    .output(z.object({
      id: z.string(),
      email: z.string(),
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // This would be implemented in the backend
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Login endpoint not implemented',
      });
    }),

  logout: protectedProcedure
    .output(z.object({
      success: z.boolean(),
    }))
    .mutation(async ({ ctx }) => {
      // This would be implemented in the backend
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Logout endpoint not implemented',
      });
    }),

  getSession: publicProcedure
    .output(z.object({
      user: z.object({
        id: z.string(),
        email: z.string(),
      }).nullable(),
    }))
    .query(async ({ ctx }) => {
      return {
        user: ctx.session?.user ? {
          id: ctx.session.user.userId,
          email: ctx.session.user.email,
        } : null,
      };
    }),

  refresh: publicProcedure
    .input(z.object({
      refreshToken: z.string(),
    }))
    .output(z.object({
      token: z.string(),
      refreshToken: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // This would be implemented in the backend
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Refresh endpoint not implemented',
      });
    }),
});