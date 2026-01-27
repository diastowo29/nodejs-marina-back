const { encryptData, decryptData } = require('../../../functions/encryption');

describe('Encryption Functions', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Encryption module loads env vars on require, so we need to set them before importing
    process.env = {
      ...originalEnv,
      M_SECRET_KEY: 'test-secret-key-for-encryption',
      M_SECRET_IV: 'test-secret-iv-for-encryption',
      ENCRYPTION_METHOD: 'aes-256-cbc'
    };
  });

  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('encryptData', () => {
    it('should encrypt plain text data', () => {
      const plainText = 'Hello, World!';
      const encrypted = encryptData(plainText);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);
      expect(typeof encrypted).toBe('string');
    });

    it('should encrypt JSON data', () => {
      const jsonData = JSON.stringify({ user: 'test', password: 'secret' });
      const encrypted = encryptData(jsonData);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(jsonData);
    });

    it('should produce different output for different inputs', () => {
      const text1 = 'first message';
      const text2 = 'second message';

      const encrypted1 = encryptData(text1);
      const encrypted2 = encryptData(text2);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should produce consistent output for same input', () => {
      const plainText = 'consistent message';
      const encrypted1 = encryptData(plainText);
      const encrypted2 = encryptData(plainText);

      expect(encrypted1).toBe(encrypted2);
    });
  });

  describe('decryptData', () => {
    it('should decrypt encrypted data back to original', () => {
      const plainText = 'Hello, World!';
      const encrypted = encryptData(plainText);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should decrypt JSON data correctly', () => {
      const jsonData = JSON.stringify({ user: 'test', password: 'secret' });
      const encrypted = encryptData(jsonData);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(jsonData);
      expect(JSON.parse(decrypted)).toEqual({ user: 'test', password: 'secret' });
    });

    it('should handle special characters', () => {
      const specialText = '!@#$%^&*()_+-={}[]|:";\'<>?,./';
      const encrypted = encryptData(specialText);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(specialText);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '你好世界 🌍 مرحبا بالعالم';
      const encrypted = encryptData(unicodeText);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(unicodeText);
    });
  });

  describe('Encryption/Decryption Integration', () => {
    it('should successfully encrypt and decrypt complex data', () => {
      const complexData = JSON.stringify({
        id: 12345,
        name: 'Test User',
        email: 'test@example.com',
        metadata: {
          created: '2025-01-27',
          active: true
        }
      });

      const encrypted = encryptData(complexData);
      const decrypted = decryptData(encrypted);

      expect(JSON.parse(decrypted)).toEqual(JSON.parse(complexData));
    });

    it('should handle empty string', () => {
      const emptyString = '';
      const encrypted = encryptData(emptyString);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(emptyString);
    });
  });
});
