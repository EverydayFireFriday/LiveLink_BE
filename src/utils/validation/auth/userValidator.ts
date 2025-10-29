import { UserStatus } from '../../../models/auth/user';
import { containsProfanity } from '../profanityFilter.js';

export class UserValidator {
  static validateUsername(username: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!username) {
      return { isValid: false, message: '사용자명을 입력해주세요.' };
    }

    if (username.length < 2) {
      return {
        isValid: false,
        message: '사용자명은 최소 2자 이상이어야 합니다.',
      };
    }

    if (username.length > 20) {
      return {
        isValid: false,
        message: '사용자명은 최대 20자까지 가능합니다.',
      };
    }

    // 욕설 및 부적절한 단어 검사
    if (containsProfanity(username)) {
      return {
        isValid: false,
        message:
          '부적절한 단어가 포함되어 있습니다. 다른 사용자명을 입력해주세요.',
      };
    }

    return { isValid: true };
  }

  static validateName(name: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!name || name.trim() === '') {
      return { isValid: false, message: '이름을 입력해주세요.' };
    }

    if (name.trim().length < 2) {
      return {
        isValid: false,
        message: '이름은 최소 2자 이상이어야 합니다.',
      };
    }

    if (name.trim().length > 50) {
      return {
        isValid: false,
        message: '이름은 최대 50자까지 가능합니다.',
      };
    }

    // 한글, 영문, 공백만 허용
    const nameRegex = /^[가-힣a-zA-Z\s]+$/;
    if (!nameRegex.test(name)) {
      return {
        isValid: false,
        message: '이름은 한글 또는 영문만 입력 가능합니다.',
      };
    }

    return { isValid: true };
  }

  static validateBirthDate(birthDate: string | Date): {
    isValid: boolean;
    message?: string;
  } {
    if (!birthDate) {
      return { isValid: false, message: '생년월일을 입력해주세요.' };
    }

    const date =
      typeof birthDate === 'string' ? new Date(birthDate) : birthDate;

    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        message: '올바른 날짜 형식이 아닙니다. (예: 1990-01-01)',
      };
    }

    // 과거 날짜인지 확인
    const now = new Date();
    if (date >= now) {
      return {
        isValid: false,
        message: '생년월일은 현재 날짜보다 이전이어야 합니다.',
      };
    }

    // 너무 오래된 날짜인지 확인 (150년 전)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 150);
    if (date < minDate) {
      return {
        isValid: false,
        message: '올바른 생년월일을 입력해주세요.',
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
      return { isValid: false, message: '올바른 이미지 URL을 입력해주세요.' };
    }
  }

  static validateStatus(status: unknown): {
    isValid: boolean;
    message?: string;
  } {
    const validStatuses = Object.values(UserStatus);
    if (!status) {
      return { isValid: false, message: '상태를 입력해주세요.' };
    }
    if (!validStatuses.includes(status as UserStatus)) {
      return {
        isValid: false,
        message: `유효하지 않은 상태입니다. 다음 중 하나여야 합니다: ${validStatuses.join(
          ', ',
        )}`,
      };
    }
    return { isValid: true };
  }
}
