import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@lattice-console/trpc';
import { 
  UserCreateSchema, 
  UserLoginSchema, 
  AuthUtils, 
  ConflictError,
  AuthenticationError,
  CryptoUtils,
  Logger
} from '@lattice-console/utils';
import { TRPCError } from '@trpc/server';
import { prisma } from '../lib/prisma';

const logger = Logger.child({ module: 'auth' });

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(UserCreateSchema)
    .output(z.object({
      id: z.string(),
      email: z.string(),
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: input.email },
        });

        if (existingUser) {
          throw new ConflictError('User with this email already exists');
        }

        // Hash the password
        const passwordHash = await AuthUtils.hashPassword(input.password);

        // Create the user
        const user = await prisma.user.create({
          data: {
            email: input.email,
            passwordHash,
            name: input.name,
          },
        });

        // Generate JWT token
        const token = AuthUtils.generateToken({
          userId: user.id,
          email: user.email,
        });

        // Generate refresh token
        const refreshToken = CryptoUtils.generateRandomString(32);

        // Create session
        await prisma.session.create({
          data: {
            userId: user.id,
            token,
            refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        logger.info('User registered successfully', { userId: user.id, email: user.email });

        return {
          id: user.id,
          email: user.email,
          token,
        };
      } catch (error) {
        logger.error('Registration failed', error, { email: input.email });
        if (error instanceof ConflictError) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to register user',
        });
      }
    }),

  login: publicProcedure
    .input(UserLoginSchema)
    .output(z.object({
      id: z.string(),
      email: z.string(),
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: input.email },
        });

        if (!user) {
          throw new AuthenticationError('Invalid credentials');
        }

        // Verify password
        const isValid = await AuthUtils.comparePassword(input.password, user.passwordHash);
        if (!isValid) {
          throw new AuthenticationError('Invalid credentials');
        }

        // Generate new JWT token
        const token = AuthUtils.generateToken({
          userId: user.id,
          email: user.email,
        });

        // Generate refresh token
        const refreshToken = CryptoUtils.generateRandomString(32);

        // Create new session (invalidate old ones)
        await prisma.session.deleteMany({
          where: { userId: user.id },
        });

        await prisma.session.create({
          data: {
            userId: user.id,
            token,
            refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        logger.info('User logged in successfully', { userId: user.id, email: user.email });

        return {
          id: user.id,
          email: user.email,
          token,
        };
      } catch (error) {
        logger.error('Login failed', error, { email: input.email });
        if (error instanceof AuthenticationError) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to login',
        });
      }
    }),

  logout: protectedProcedure
    .output(z.object({
      success: z.boolean(),
    }))
    .mutation(async ({ ctx }) => {
      try {
        if (!ctx.session?.user) {
          throw new AuthenticationError();
        }

        // Delete the current session
        await prisma.session.deleteMany({
          where: {
            userId: ctx.session.user.userId,
          },
        });

        logger.info('User logged out successfully', { userId: ctx.session.user.userId });

        return {
          success: true,
        };
      } catch (error) {
        logger.error('Logout failed', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to logout',
        });
      }
    }),

  getSession: publicProcedure
    .output(z.object({
      user: z.object({
        id: z.string(),
        email: z.string(),
      }).nullable(),
    }))
    .query(async ({ ctx }) => {
      if (!ctx.session?.user) {
        return { user: null };
      }

      try {
        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.userId },
          select: {
            id: true,
            email: true,
          },
        });

        return {
          user: user || null,
        };
      } catch (error) {
        logger.error('Get session failed', error);
        return { user: null };
      }
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
      try {
        // Find session by refresh token
        const session = await prisma.session.findUnique({
          where: { refreshToken: input.refreshToken },
          include: { user: true },
        });

        if (!session || session.expiresAt < new Date()) {
          throw new AuthenticationError('Invalid or expired refresh token');
        }

        // Generate new tokens
        const token = AuthUtils.generateToken({
          userId: session.user.id,
          email: session.user.email,
        });

        const newRefreshToken = CryptoUtils.generateRandomString(32);

        // Update session
        await prisma.session.update({
          where: { id: session.id },
          data: {
            token,
            refreshToken: newRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        logger.info('Token refreshed successfully', { userId: session.user.id });

        return {
          token,
          refreshToken: newRefreshToken,
        };
      } catch (error) {
        logger.error('Token refresh failed', error);
        if (error instanceof AuthenticationError) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: error.message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to refresh token',
        });
      }
    }),
});