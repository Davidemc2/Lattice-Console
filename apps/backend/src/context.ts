import { inferAsyncReturnType } from '@trpc/server';

export async function createContext() {
  // TODO: Add auth, DB, and other context values here
  return {};
}

export type Context = inferAsyncReturnType<typeof createContext>;
