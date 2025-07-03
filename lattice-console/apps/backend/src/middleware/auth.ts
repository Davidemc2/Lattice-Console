import { AuthUtils, type JWTPayload } from '@lattice-console/utils';
import { prisma } from '../lib/prisma';

export async function authMiddleware(token?: string): Promise<JWTPayload | null> {
  if (!token) {
    return null;
  }

  try {
    // Verify the JWT token
    const payload = AuthUtils.verifyToken(token);
    
    // Check if session exists and is valid
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Return the user payload
    return payload;
  } catch (error) {
    // Invalid token or other error
    return null;
  }
}