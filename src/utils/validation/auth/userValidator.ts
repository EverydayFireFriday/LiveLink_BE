import { UserStatus } from "../../../models/auth/user";

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

  static validateStatus(status: any): { isValid: boolean; message?: string } {
    const validStatuses = Object.values(UserStatus);
    if (!status) {
      return { isValid: false, message: "상태를 입력해주세요." };
    }
    if (!validStatuses.includes(status as UserStatus)) {
      return {
        isValid: false,
        message: `유효하지 않은 상태입니다. 다음 중 하나여야 합니다: ${validStatuses.join(
          ", "
        )}`,
      };
    }
    return { isValid: true };
  }
}
