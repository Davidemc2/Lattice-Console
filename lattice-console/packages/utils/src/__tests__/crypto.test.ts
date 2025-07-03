import { CryptoUtils } from '../crypto';

describe('CryptoUtils', () => {
  describe('generateRandomString', () => {
    it('should generate a string of specified length', () => {
      const lengths = [8, 16, 32, 64];
      
      lengths.forEach(length => {
        const result = CryptoUtils.generateRandomString(length);
        expect(result).toHaveLength(length);
        expect(typeof result).toBe('string');
      });
    });

    it('should generate unique strings', () => {
      const strings = new Set();
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        strings.add(CryptoUtils.generateRandomString(16));
      }
      
      expect(strings.size).toBe(iterations);
    });

    it('should only contain hexadecimal characters', () => {
      const result = CryptoUtils.generateRandomString(32);
      expect(result).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of default length', () => {
      const password = CryptoUtils.generateSecurePassword();
      expect(password).toHaveLength(16);
    });

    it('should generate password of specified length', () => {
      const lengths = [8, 12, 24, 32];
      
      lengths.forEach(length => {
        const password = CryptoUtils.generateSecurePassword(length);
        expect(password).toHaveLength(length);
      });
    });

    it('should include various character types', () => {
      const password = CryptoUtils.generateSecurePassword(32);
      
      // Check for at least one of each type (statistically likely in 32 chars)
      expect(password).toMatch(/[a-z]/); // lowercase
      expect(password).toMatch(/[A-Z]/); // uppercase
      expect(password).toMatch(/[0-9]/); // numbers
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/); // special chars
    });

    it('should generate unique passwords', () => {
      const passwords = new Set();
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        passwords.add(CryptoUtils.generateSecurePassword(24));
      }
      
      expect(passwords.size).toBe(iterations);
    });
  });

  describe('generateId', () => {
    it('should generate ID without prefix', () => {
      const id = CryptoUtils.generateId();
      expect(id).toBeDefined();
      expect(id.length).toBeGreaterThan(10);
      expect(typeof id).toBe('string');
    });

    it('should generate ID with prefix', () => {
      const prefix = 'user';
      const id = CryptoUtils.generateId(prefix);
      
      expect(id).toStartWith(`${prefix}_`);
      expect(id.length).toBeGreaterThan(prefix.length + 10);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        ids.add(CryptoUtils.generateId());
      }
      
      expect(ids.size).toBe(iterations);
    });
  });

  describe('generateDatabaseCredentials', () => {
    it('should generate complete database credentials', () => {
      const dbName = 'myapp';
      const creds = CryptoUtils.generateDatabaseCredentials(dbName);
      
      expect(creds).toHaveProperty('username');
      expect(creds).toHaveProperty('password');
      expect(creds).toHaveProperty('database');
      
      expect(creds.username).toMatch(/^user_[a-f0-9]{8}$/);
      expect(creds.password).toHaveLength(24);
      expect(creds.database).toMatch(new RegExp(`^${dbName}_[a-f0-9]{6}$`));
    });

    it('should generate unique credentials', () => {
      const creds1 = CryptoUtils.generateDatabaseCredentials('app');
      const creds2 = CryptoUtils.generateDatabaseCredentials('app');
      
      expect(creds1.username).not.toBe(creds2.username);
      expect(creds1.password).not.toBe(creds2.password);
      expect(creds1.database).not.toBe(creds2.database);
    });
  });

  describe('generateS3Credentials', () => {
    it('should generate S3 credentials', () => {
      const creds = CryptoUtils.generateS3Credentials();
      
      expect(creds).toHaveProperty('accessKey');
      expect(creds).toHaveProperty('secretKey');
      
      expect(creds.accessKey).toHaveLength(20);
      expect(creds.accessKey).toMatch(/^[A-F0-9]+$/); // uppercase hex
      expect(creds.secretKey).toHaveLength(40);
    });

    it('should generate unique S3 credentials', () => {
      const creds1 = CryptoUtils.generateS3Credentials();
      const creds2 = CryptoUtils.generateS3Credentials();
      
      expect(creds1.accessKey).not.toBe(creds2.accessKey);
      expect(creds1.secretKey).not.toBe(creds2.secretKey);
    });
  });
});