export class AuthValidator {
  static validateEmail(email: string): { isValid: boolean; message?: string } {
    if (!email) {
      return { isValid: false, message: '이메일을 입력해주세요.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: '올바른 이메일 형식을 입력해주세요.' };
    }

    return { isValid: true };
  }

  static validatePassword(password: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!password) {
      return { isValid: false, message: '비밀번호를 입력해주세요.' };
    }

    if (password.length < 6) {
      return {
        isValid: false,
        message: '비밀번호는 최소 6자 이상이어야 합니다.',
      };
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      return {
        isValid: false,
        message: '비밀번호는 최소 1개 이상의 숫자를 포함해야 합니다.',
      };
    }

    // Check for at least one English letter (case-insensitive)
    if (!/[a-zA-Z]/.test(password)) {
      return {
        isValid: false,
        message: '비밀번호는 최소 1개 이상의 영어 알파벳을 포함해야 합니다.',
      };
    }

    return { isValid: true };
  }

  static validateVerificationCode(code: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!code) {
      return { isValid: false, message: '인증 코드를 입력해주세요.' };
    }

    if (!/^\d{6}$/.test(code)) {
      return { isValid: false, message: '인증 코드는 6자리 숫자여야 합니다.' };
    }

    return { isValid: true };
  }

  static validateBoolean(
    value: any,
    fieldName: string,
  ): { isValid: boolean; message?: string } {
    if (typeof value !== 'boolean') {
      return {
        isValid: false,
        message: `${fieldName}은(는) true 또는 false여야 합니다.`,
      };
    }
    return { isValid: true };
  }
}
