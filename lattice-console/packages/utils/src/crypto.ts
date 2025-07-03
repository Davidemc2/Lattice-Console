import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class CryptoUtils {
  /**
   * Generate a random string of specified length
   */
  static generateRandomString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const randomBytesBuffer = crypto.randomBytes(length);
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytesBuffer[i] % charset.length];
    }
    
    return password;
  }

  /**
   * Generate a unique identifier
   */
  static generateId(prefix?: string): string {
    const timestamp = Date.now().toString(36);
    const randomPart = this.generateRandomString(8);
    return prefix ? `${prefix}_${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
  }

  /**
   * Generate database credentials
   */
  static generateDatabaseCredentials(dbName: string) {
    const username = `user_${this.generateRandomString(8)}`;
    const password = this.generateSecurePassword(24);
    const database = `${dbName}_${this.generateRandomString(6)}`;
    
    return {
      username,
      password,
      database,
    };
  }

  /**
   * Generate MinIO/S3 credentials
   */
  static generateS3Credentials() {
    const accessKey = this.generateRandomString(20).toUpperCase();
    const secretKey = this.generateSecurePassword(40);
    
    return {
      accessKey,
      secretKey,
    };
  }

  /**
   * Generate a cryptographically secure random ID
   */
  static generateSecureId(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a cryptographically secure token
   */
  static generateSecureToken(length: number = 64): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Hash a token using bcrypt
   */
  static async hashToken(token: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(token, saltRounds);
  }

  /**
   * Verify a token against its hash
   */
  static async verifyToken(token: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(token, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a cryptographically secure API key
   */
  static generateApiKey(): string {
    const prefix = 'lc_'; // Lattice Console prefix
    const randomPart = crypto.randomBytes(32).toString('base64url');
    return `${prefix}${randomPart}`;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  static encrypt(data: string, key: string): { encrypted: string; iv: string; tag: string } {
    const algorithm = 'aes-256-gcm';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, keyBuffer);
    cipher.setAAD(Buffer.from('lattice-console', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  /**
   * Decrypt data encrypted with encrypt()
   */
  static decrypt(encrypted: string, key: string, iv: string, tag: string): string {
    const algorithm = 'aes-256-gcm';
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    
    const decipher = crypto.createDecipher(algorithm, keyBuffer);
    decipher.setAAD(Buffer.from('lattice-console', 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate a secure session token with expiration
   */
  static generateSessionToken(): { token: string; expiresAt: Date } {
    const token = this.generateSecureToken(48);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    return { token, expiresAt };
  }

  /**
   * Generate a HMAC signature for webhook verification
   */
  static generateHmacSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  /**
   * Verify a HMAC signature
   */
  static verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
    const expectedSignature = this.generateHmacSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate a secure OTP code
   */
  static generateOtp(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }
    
    return otp;
  }

  /**
   * Generate a certificate fingerprint
   */
  static generateFingerprint(cert: string): string {
    return crypto
      .createHash('sha256')
      .update(cert)
      .digest('hex')
      .toUpperCase()
      .replace(/(.{2})/g, '$1:')
      .slice(0, -1);
  }

  /**
   * Generate a deterministic hash for data deduplication
   */
  static generateContentHash(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Secure random integer generation
   */
  static randomInt(min: number, max: number): number {
    return crypto.randomInt(min, max + 1);
  }

  /**
   * Generate a secure nonce
   */
  static generateNonce(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }
}