import { maskEmail, maskEmails } from '../emailMask';

describe('emailMask', () => {
  describe('maskEmail', () => {
    it('should mask short email addresses (≤3 chars)', () => {
      expect(maskEmail('a@example.com')).toBe('a***@example.com');
      expect(maskEmail('ab@example.com')).toBe('a***@example.com');
      expect(maskEmail('abc@example.com')).toBe('a***@example.com');
    });

    it('should mask longer email addresses (>3 chars)', () => {
      expect(maskEmail('user@example.com')).toBe('us***@example.com');
      expect(maskEmail('test@example.com')).toBe('te***@example.com');
      // "verylongemail" is 13 chars, half is 6.5 -> ceil(6.5) = 7
      expect(maskEmail('verylongemail@gmail.com')).toBe('verylon***@gmail.com');
    });

    it('should show half of local part for longer emails', () => {
      // 4글자: 절반은 2글자
      expect(maskEmail('abcd@example.com')).toBe('ab***@example.com');

      // 5글자: 절반은 올림하여 3글자
      expect(maskEmail('abcde@example.com')).toBe('abc***@example.com');

      // 8글자: 절반은 4글자
      expect(maskEmail('testuser@example.com')).toBe('test***@example.com');
    });

    it('should preserve domain part', () => {
      expect(maskEmail('user@gmail.com')).toBe('us***@gmail.com');
      expect(maskEmail('admin@company.co.kr')).toBe('adm***@company.co.kr');
      expect(maskEmail('test@subdomain.example.com')).toBe(
        'te***@subdomain.example.com',
      );
    });

    it('should handle invalid email formats', () => {
      expect(maskEmail('')).toBe('***');
      expect(maskEmail('notanemail')).toBe('***');
      expect(maskEmail('missing-at-sign.com')).toBe('***');
    });

    it('should handle edge cases', () => {
      expect(maskEmail('@example.com')).toBe('***@example.com');
      expect(maskEmail('x@x.com')).toBe('x***@x.com');
    });

    it('should handle null/undefined gracefully', () => {
      expect(maskEmail(null as any)).toBe('***');
      expect(maskEmail(undefined as any)).toBe('***');
    });
  });

  describe('maskEmails', () => {
    it('should mask multiple email addresses', () => {
      const emails = ['user@example.com', 'admin@company.com', 'test@test.com'];

      const masked = maskEmails(emails);

      expect(masked).toEqual([
        'us***@example.com',
        'adm***@company.com',
        'te***@test.com',
      ]);
    });

    it('should handle empty array', () => {
      expect(maskEmails([])).toEqual([]);
    });

    it('should handle array with invalid emails', () => {
      const emails = ['valid@example.com', 'invalid', ''];
      const masked = maskEmails(emails);

      expect(masked).toEqual(['val***@example.com', '***', '***']);
    });

    it('should handle single element array', () => {
      expect(maskEmails(['user@example.com'])).toEqual(['us***@example.com']);
    });
  });
});
