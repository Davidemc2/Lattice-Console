import { inferAsyncReturnType } from '@trpc/server';
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from './utils/prisma';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './utils/jwt';

export async function createContext({
  req,
  res,
}: {
  req: FastifyRequest;
  res: FastifyReply;
}) {
  // Extract token from Authorization header
  const token = extractTokenFromHeader(req.headers.authorization);
  
  let user: JWTPayload | null = null;
  
  if (token) {
    try {
      user = verifyToken(token);
    } catch (error) {
      // Token is invalid, but we don't throw here to allow unauthenticated requests
      console.log('Invalid token:', error);
    }
  }

  return {
    req,
    res,
    prisma,
    user,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
