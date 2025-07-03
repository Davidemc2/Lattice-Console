import { type inferAsyncReturnType } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { type JWTPayload } from '@lattice-console/utils';

export interface Session {
  user: JWTPayload | null;
}

export interface CreateContextOptions {
  session: Session | null;
  req?: any;
  res?: any;
}

/**
 * Inner context for tRPC procedures
 * This is where we define what data is available in all procedures
 */
export const createContextInner = async (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    req: opts.req,
    res: opts.res,
  };
};

/**
 * Context creator for Next.js
 * This is called for each request
 */
export const createContext = async (
  opts: CreateNextContextOptions | CreateContextOptions
): Promise<inferAsyncReturnType<typeof createContextInner>> => {
  // For SSG and SSR
  if (!('req' in opts) || !opts.req) {
    return createContextInner({
      session: null,
    });
  }

  // For API Routes
  const { req, res } = opts as CreateNextContextOptions;
  
  // Here you would typically validate the JWT token from headers
  // For now, we'll just pass null
  const session: Session = {
    user: null,
  };

  return createContextInner({
    session,
    req,
    res,
  });
};

export type Context = inferAsyncReturnType<typeof createContext>;