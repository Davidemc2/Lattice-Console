import { randomBytes } from 'crypto';

export class CryptoUtils {
  /**
   * Generate a random string of specified length
   */
  static generateRandomString(length: number): string {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const randomBytesBuffer = randomBytes(length);
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
}