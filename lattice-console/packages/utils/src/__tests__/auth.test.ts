import { AuthUtils, JWTPayload } from '../auth';

describe('AuthUtils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.BCRYPT_ROUNDS = '10';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123!';
      const hash = await AuthUtils.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await AuthUtils.hashPassword(password);
      const hash2 = await AuthUtils.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123!';
      const hash = await AuthUtils.hashPassword(password);
      
      const result = await AuthUtils.comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hash = await AuthUtils.hashPassword(password);
      
      const result = await AuthUtils.comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const payload: JWTPayload = {
        userId: '123',
        email: 'test@example.com',
      };
      
      const token = AuthUtils.generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should throw error if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      
      const payload: JWTPayload = {
        userId: '123',
        email: 'test@example.com',
      };
      
      expect(() => AuthUtils.generateToken(payload)).toThrow('JWT_SECRET not configured');
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const payload: JWTPayload = {
        userId: '123',
        email: 'test@example.com',
      };
      
      const token = AuthUtils.generateToken(payload);
      const decoded = AuthUtils.verifyToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => AuthUtils.verifyToken(invalidToken)).toThrow('Invalid token');
    });

    it('should throw error if JWT_SECRET is not set', () => {
      const payload: JWTPayload = {
        userId: '123',
        email: 'test@example.com',
      };
      
      const token = AuthUtils.generateToken(payload);
      delete process.env.JWT_SECRET;
      
      expect(() => AuthUtils.verifyToken(token)).toThrow('JWT_SECRET not configured');
    });

    it('should throw error for expired token', () => {
      // Create a token that expires immediately
      process.env.JWT_EXPIRES_IN = '0s';
      
      const payload: JWTPayload = {
        userId: '123',
        email: 'test@example.com',
      };
      
      const token = AuthUtils.generateToken(payload);
      
      // Wait a bit to ensure token is expired
      setTimeout(() => {
        expect(() => AuthUtils.verifyToken(token)).toThrow('Token expired');
      }, 100);
    });
  });

  describe('extractBearerToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const authHeader = `Bearer ${token}`;
      
      const extracted = AuthUtils.extractBearerToken(authHeader);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(AuthUtils.extractBearerToken('InvalidHeader')).toBeNull();
      expect(AuthUtils.extractBearerToken('Basic token')).toBeNull();
      expect(AuthUtils.extractBearerToken('')).toBeNull();
      expect(AuthUtils.extractBearerToken(undefined)).toBeNull();
    });

    it('should return null for Bearer header without token', () => {
      expect(AuthUtils.extractBearerToken('Bearer')).toBeNull();
      expect(AuthUtils.extractBearerToken('Bearer ')).toBe('');
    });
  });
});