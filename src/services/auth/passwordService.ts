import { EmailService } from "../../utils/emailService";
import logger from "../../utils/logger";

export class PasswordService {
  async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // 지연 로딩으로 서비스들 import
      const { AuthService } = await import("./authService");
      const { UserService } = await import("./userService");
      const { VerificationService } = await import("./verificationService");

      const authService = new AuthService();
      const userService = new UserService();
      const verificationService = new VerificationService();
      const emailService = new EmailService();

      // 스팸 방지 체크
      const hasRecentRequest = await verificationService.checkRecentRequest(
        email,
        "password_reset"
      );
      if (hasRecentRequest) {
        return {
          success: false,
          message: "너무 빈번한 요청입니다. 1분 후에 다시 시도해주세요.",
        };
      }

      // 사용자 확인
      const user = await userService.findByEmail(email);
      if (!user) {
        return {
          success: false,
          message: "해당 이메일로 등록된 사용자를 찾을 수 없습니다.",
        };
      }

      // 인증 코드 생성 및 저장
      const verificationCode = authService.generateVerificationCode();
      const redisKey = await verificationService.saveVerificationCode(
        "password_reset",
        email,
        verificationCode
      );

      // 이메일 전송
      const emailResult = await emailService.sendPasswordReset({
        email,
        username: user.username,
        verificationCode,
        createdAt: new Date().toLocaleString("ko-KR"),
      });

      if (!emailResult.success) {
        await verificationService.deleteVerificationCode(redisKey);
        return {
          success: false,
          message: "이메일 전송에 실패했습니다. 다시 시도해주세요.",
        };
      }

      return {
        success: true,
        message: "비밀번호 재설정 인증 코드가 이메일로 전송되었습니다.",
        data: {
          redisKey,
          expiresIn: "3분",
        },
      };
    } catch (error) {
      logger.error("비밀번호 재설정 요청 에러:", error);
      return {
        success: false,
        message: "서버 에러가 발생했습니다.",
      };
    }
  }

  async verifyAndResetPassword(
    email: string,
    verificationCode: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { AuthService } = await import("./authService");
      const { UserService } = await import("./userService");
      const { VerificationService } = await import("./verificationService");

      const authService = new AuthService();
      const userService = new UserService();
      const verificationService = new VerificationService();

      const redisKey = `verification:password_reset:${email}`;
      const storedCode =
        await verificationService.getVerificationCode(redisKey);

      if (!storedCode) {
        return {
          success: false,
          message: "인증 코드가 만료되었거나 존재하지 않습니다.",
        };
      }

      if (storedCode.code !== verificationCode) {
        return {
          success: false,
          message: "인증 코드가 일치하지 않습니다.",
        };
      }

      // 사용자 확인
      const user = await userService.findByEmail(email);
      if (!user) {
        return {
          success: false,
          message: "사용자를 찾을 수 없습니다.",
        };
      }

      // 새 비밀번호 해시화 및 업데이트
      const hashedNewPassword = await authService.hashPassword(newPassword);
      await userService.updateUser(user._id!.toString(), {
        passwordHash: hashedNewPassword,
        updatedAt: new Date(),
      });

      // 인증 코드 삭제
      await verificationService.deleteVerificationCode(redisKey);

      return {
        success: true,
        message: "비밀번호가 성공적으로 재설정되었습니다.",
      };
    } catch (error) {
      logger.error("비밀번호 재설정 에러:", error);
      return {
        success: false,
        message: "비밀번호 재설정에 실패했습니다.",
      };
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { AuthService } = await import("./authService");
      const { UserService } = await import("./userService");

      const authService = new AuthService();
      const userService = new UserService();

      const user = await userService.findById(userId);
      if (!user) {
        return {
          success: false,
          message: "사용자를 찾을 수 없습니다.",
        };
      }

      // 현재 비밀번호 확인
      const isCurrentPasswordValid = await authService.verifyPassword(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: "현재 비밀번호가 일치하지 않습니다.",
        };
      }

      // 새 비밀번호 해시화 및 업데이트
      const hashedNewPassword = await authService.hashPassword(newPassword);
      await userService.updateUser(userId, {
        passwordHash: hashedNewPassword,
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: "비밀번호가 성공적으로 변경되었습니다.",
      };
    } catch (error) {
      logger.error("비밀번호 변경 에러:", error);
      return {
        success: false,
        message: "비밀번호 변경에 실패했습니다.",
      };
    }
  }
}
