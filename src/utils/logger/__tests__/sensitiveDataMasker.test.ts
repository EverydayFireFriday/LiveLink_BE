import {
  maskSensitiveData,
  addSensitiveKeys,
  addSensitivePattern,
} from '../sensitiveDataMasker';

const maskOne = (value: unknown): unknown => maskSensitiveData(value)[0];

describe('sensitiveDataMasker', () => {
  describe('sensitive keys', () => {
    it('should fully mask short values (4 chars or fewer)', () => {
      expect(maskOne({ password: 'abcd' })).toEqual({ password: '***' });
    });

    it('should keep the first 2 chars of longer values', () => {
      expect(maskOne({ password: 'secret123' })).toEqual({
        password: 'se*******',
      });
    });

    it('should cap the number of mask characters at 20', () => {
      const masked = maskOne({ token: 'a'.repeat(50) }) as { token: string };

      expect(masked.token).toBe(`aa${'*'.repeat(20)}`);
    });

    it('should match keys case-insensitively and by substring', () => {
      const masked = maskOne({
        Password: 'hunter2hunter2',
        accessToken: 'tokentokentoken',
        userApiKey: 'keykeykeykey',
      }) as Record<string, string>;

      expect(masked.Password).toMatch(/^hu\*+$/);
      expect(masked.accessToken).toMatch(/^to\*+$/);
      expect(masked.userApiKey).toMatch(/^ke\*+$/);
    });

    it('should mask non-string sensitive values without leaking them', () => {
      expect(maskOne({ secret: 12345, cookie: { a: 1 } })).toEqual({
        secret: '***MASKED***',
        cookie: '***MASKED_OBJECT***',
      });
    });

    it('should leave non-sensitive keys untouched', () => {
      expect(maskOne({ title: 'concert', count: 3, ok: true })).toEqual({
        title: 'concert',
        count: 3,
        ok: true,
      });
    });
  });

  describe('nested data', () => {
    it('should mask sensitive keys in nested objects and arrays', () => {
      const masked = maskOne({
        user: { name: 'kim', password: 'longpassword' },
        list: [{ token: 'abcdefgh' }, { note: 'fine' }],
      });

      expect(masked).toEqual({
        user: { name: 'kim', password: 'lo**********' },
        list: [{ token: 'ab******' }, { note: 'fine' }],
      });
    });

    it('should stop at the max depth instead of recursing forever', () => {
      let deep: Record<string, unknown> = { value: 'leaf' };
      for (let i = 0; i < 15; i++) deep = { child: deep };

      expect(JSON.stringify(maskOne(deep))).toContain('[Max Depth Reached]');
    });

    it('should convert Error objects to plain objects', () => {
      const masked = maskOne({ err: new Error('boom') }) as {
        err: { name: string; message: string; stack?: string };
      };

      expect(masked.err.name).toBe('Error');
      expect(masked.err.message).toBe('boom');
      expect(masked.err.stack).toBeDefined();
    });

    it('should not mutate the original object', () => {
      const original = { password: 'secret123' };

      maskOne(original);

      expect(original.password).toBe('secret123');
    });
  });

  describe('string patterns', () => {
    it('should partially mask email addresses', () => {
      expect(maskOne('contact test@example.com now')).toBe(
        'contact t***@example.com now',
      );
    });

    it('should mask Bearer tokens', () => {
      expect(maskOne('Authorization: Bearer aaa.bbb.ccc')).toBe(
        'Authorization: Bearer ***TOKEN_MASKED***',
      );
    });

    it('should mask JWT-like strings only when a token context exists', () => {
      expect(maskOne('token is aaa.bbb.ccc')).toBe('token is ***JWT_MASKED***');
      expect(maskOne('version 1.2.3')).toBe('version 1.2.3');
    });

    it('should mask long API keys only when an api/key context exists', () => {
      const key = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6';

      expect(maskOne(`api key ${key}`)).toBe('api key ***API_KEY_MASKED***');
      expect(maskOne(`id ${key}`)).toBe(`id ${key}`);
    });

    it('should mask patterns inside string values of objects', () => {
      expect(maskOne({ note: 'mail me: a.b@example.com' })).toEqual({
        note: 'mail me: a***@example.com',
      });
    });
  });

  describe('maskSensitiveData', () => {
    it('should return the message followed by masked additional data', () => {
      const result = maskSensitiveData(
        'login a@b.com',
        { password: 'abcdefg' },
        42,
      );

      expect(result).toEqual(['login a***@b.com', { password: 'ab*****' }, 42]);
    });

    it('should pass through primitives, null and undefined', () => {
      expect(maskSensitiveData(1, null, undefined)).toEqual([
        1,
        null,
        undefined,
      ]);
    });

    it('should keep Date values as they are', () => {
      const date = new Date('2026-01-01T00:00:00Z');

      expect(maskOne({ at: date })).toEqual({ at: date });
    });
  });

  describe('extension points', () => {
    it('should mask keys added with addSensitiveKeys', () => {
      addSensitiveKeys('MyCustomSecretField');

      expect(maskOne({ mycustomsecretfield: 'value12345' })).toEqual({
        mycustomsecretfield: 'va********',
      });
    });

    it('should apply patterns added with addSensitivePattern', () => {
      addSensitivePattern(/ORDER-\d{6}/g, 'ORDER-******');

      expect(maskOne('paid ORDER-123456')).toBe('paid ORDER-******');
    });
  });
});
