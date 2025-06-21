export class AuthValidator {
  static validateEmail(email: string): { isValid: boolean; message?: string } {
    if (!email) {
      return { isValid: false, message: "이메일을 입력해주세요." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: "올바른 이메일 형식을 입력해주세요." };
    }

    return { isValid: true };
  }

  static validatePassword(password: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!password) {
      return { isValid: false, message: "비밀번호를 입력해주세요." };
    }

    if (password.length < 7) {
      return {
        isValid: false,
        message: "비밀번호는 최소 7자 이상이어야 합니다.",
      };
    }

    return { isValid: true };
  }

  static validateVerificationCode(code: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!code) {
      return { isValid: false, message: "인증 코드를 입력해주세요." };
    }

    if (!/^\d{6}$/.test(code)) {
      return { isValid: false, message: "인증 코드는 6자리 숫자여야 합니다." };
    }

    return { isValid: true };
  }
}
