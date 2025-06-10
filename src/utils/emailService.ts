import nodemailer from "nodemailer";
import {
  EmailTemplates,
  EmailTemplateData,
  SecurityAlertData,
  WelcomeEmailData,
} from "../templates/emailTemplates";

interface EmailConfig {
  service: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    this.config = this.getEmailConfig();
    this.transporter = this.createTransporter();
  }

  /**
   * 이메일 설정 구성
   */
  private getEmailConfig(): EmailConfig {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      throw new Error(
        "EMAIL_USER 및 EMAIL_PASS 환경변수가 설정되지 않았습니다."
      );
    }

    return {
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass, // Gmail 앱 비밀번호 사용
      },
      tls: {
        rejectUnauthorized: false,
      },
    };
  }

  /**
   * Nodemailer transporter 생성
   */
  private createTransporter(): nodemailer.Transporter {
    try {
      // createTransport로 수정 (createTransporter 아님)
      return nodemailer.createTransport(this.config);
    } catch (error) {
      console.error("이메일 transporter 생성 실패:", error);
      throw new Error("이메일 서비스 초기화 실패");
    }
  }

  /**
   * 기본 이메일 발송 메서드
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    fromName: string = "LiveLink"
  ): Promise<EmailSendResult> {
    try {
      const mailOptions = {
        from: {
          name: fromName,
          address: this.config.auth.user,
        },
        to,
        subject,
        html,
        // priority를 올바른 타입으로 수정
        priority: "normal" as "normal" | "high" | "low",
        headers: {
          "X-Mailer": "LiveLink Email Service",
          "X-Priority": "3",
        },
      };

      // 타입 어서션으로 수정
      const info = (await this.transporter.sendMail(mailOptions)) as any;

      console.log(`✅ 이메일 전송 성공: ${to} - Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error(`❌ 이메일 전송 실패: ${to}`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  /**
   * 회원가입 인증 이메일 전송
   */
  async sendRegistrationVerification(
    data: EmailTemplateData
  ): Promise<EmailSendResult> {
    const subject = `[LiveLink] 회원가입 이메일 인증`;
    const html = EmailTemplates.getRegistrationVerificationEmail(data);

    const result = await this.sendEmail(data.email, subject, html, "LiveLink");

    if (result.success) {
      console.log(
        `📧 회원가입 인증 이메일 전송: ${data.username || "Unknown"} (${data.email})`
      );
    }

    return result;
  }

  /**
   * 비밀번호 재설정 이메일 전송
   */
  async sendPasswordReset(data: EmailTemplateData): Promise<EmailSendResult> {
    const subject = `[LiveLink] 비밀번호 재설정 인증 코드`;
    const html = EmailTemplates.getPasswordResetEmail(data);

    const result = await this.sendEmail(
      data.email,
      subject,
      html,
      "LiveLink Security"
    );

    if (result.success) {
      console.log(
        `🔒 비밀번호 재설정 이메일 전송: ${data.username || "Unknown"} (${data.email})`
      );
    }

    return result;
  }

  /**
   * 환영 이메일 전송
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailSendResult> {
    const subject = `[LiveLink] 가입을 환영합니다!`;
    const html = EmailTemplates.getWelcomeEmail(data);

    const result = await this.sendEmail(
      data.email,
      subject,
      html,
      "LiveLink Team"
    );

    if (result.success) {
      console.log(`🎉 환영 이메일 전송: ${data.username} (${data.email})`);
    }

    return result;
  }

  /**
   * 보안 알림 이메일 전송
   */
  async sendSecurityAlert(data: SecurityAlertData): Promise<EmailSendResult> {
    const subject = `[LiveLink] 계정 보안 알림`;
    const html = EmailTemplates.getSecurityAlertEmail(data);

    const result = await this.sendEmail(
      data.email,
      subject,
      html,
      "LiveLink Security"
    );

    if (result.success) {
      console.log(
        `🚨 보안 알림 이메일 전송: ${data.username} (${data.email}) - ${data.action}`
      );
    }

    return result;
  }

  /**
   * 이메일 서비스 연결 상태 확인
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("✅ 이메일 서비스 연결 확인 성공");
      return true;
    } catch (error) {
      console.error("❌ 이메일 서비스 연결 실패:", error);
      return false;
    }
  }

  /**
   * 이메일 서비스 상태 정보 조회
   */
  async getServiceStatus(): Promise<{
    connected: boolean;
    config: {
      service: string;
      host: string;
      port: number;
      user: string;
    };
    features: string[];
  }> {
    const connected = await this.verifyConnection();

    return {
      connected,
      config: {
        service: this.config.service,
        host: this.config.host,
        port: this.config.port,
        user: this.config.auth.user,
      },
      features: [
        "회원가입 인증",
        "비밀번호 재설정",
        "환영 메시지",
        "보안 알림",
        "반응형 템플릿",
        "HTML/CSS 스타일링",
      ],
    };
  }

  /**
   * 대량 이메일 전송 (향후 마케팅 등에 사용)
   */
  async sendBulkEmails(
    recipients: string[],
    subject: string,
    html: string,
    batchSize: number = 10
  ): Promise<{
    totalSent: number;
    totalFailed: number;
    results: EmailSendResult[];
  }> {
    const results: EmailSendResult[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    // 배치 단위로 전송하여 서버 부하 방지
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchPromises = batch.map((email) =>
        this.sendEmail(email, subject, html)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 성공/실패 카운트
      batchResults.forEach((result) => {
        if (result.success) {
          totalSent++;
        } else {
          totalFailed++;
        }
      });

      // 배치 간 딜레이 (API 제한 방지)
      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `📊 대량 이메일 전송 완료: 성공 ${totalSent}건, 실패 ${totalFailed}건`
    );

    return {
      totalSent,
      totalFailed,
      results,
    };
  }

  /**
   * 이메일 템플릿 미리보기 생성 (개발/테스트용)
   */
  generatePreview(
    type: "registration" | "password_reset" | "welcome" | "security_alert"
  ): string {
    const sampleData = {
      registration: {
        email: "user@example.com",
        username: "testuser",
        verificationCode: "123456",
        createdAt: new Date().toLocaleString("ko-KR"),
      },
      password_reset: {
        email: "user@example.com",
        username: "testuser",
        verificationCode: "654321",
        createdAt: new Date().toLocaleString("ko-KR"),
      },
      welcome: {
        email: "user@example.com",
        username: "testuser",
      },
      security_alert: {
        email: "user@example.com",
        username: "testuser",
        action: "로그인 시도",
        timestamp: new Date().toLocaleString("ko-KR"),
        ipAddress: "192.168.1.1",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    };

    switch (type) {
      case "registration":
        return EmailTemplates.getRegistrationVerificationEmail(
          sampleData.registration
        );
      case "password_reset":
        return EmailTemplates.getPasswordResetEmail(sampleData.password_reset);
      case "welcome":
        return EmailTemplates.getWelcomeEmail(sampleData.welcome);
      case "security_alert":
        return EmailTemplates.getSecurityAlertEmail(sampleData.security_alert);
      default:
        throw new Error("알 수 없는 템플릿 타입입니다.");
    }
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    try {
      this.transporter.close();
      console.log("✅ 이메일 서비스 리소스 정리 완료");
    } catch (error) {
      console.error("❌ 이메일 서비스 정리 실패:", error);
    }
  }
}
