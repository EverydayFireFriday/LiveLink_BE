export class UserValidator {
  static validateUsername(username: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!username) {
      return { isValid: false, message: "사용자명을 입력해주세요." };
    }

    if (username.length < 2) {
      return {
        isValid: false,
        message: "사용자명은 최소 2자 이상이어야 합니다.",
      };
    }

    if (username.length > 20) {
      return {
        isValid: false,
        message: "사용자명은 최대 20자까지 가능합니다.",
      };
    }

    return { isValid: true };
  }

  static validateProfileImage(url?: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!url) return { isValid: true };

    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return { isValid: false, message: "올바른 이미지 URL을 입력해주세요." };
    }
  }
}
