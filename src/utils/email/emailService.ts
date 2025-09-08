import nodemailer from 'nodemailer';
import { logger } from '../index';
import {
  EmailTemplates,
  EmailTemplateData,
  SecurityAlertData,
  WelcomeEmailData,
} from '../../templates/emailTemplates';

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

  private getEmailConfig(): EmailConfig {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      throw new Error(
        'EMAIL_USER 및 EMAIL_PASS 환경변수가 설정되지 않았습니다.',
      );
    }

    return {
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    };
  }

  private createTransporter(): nodemailer.Transporter {
    try {
      return nodemailer.createTransport({
        ...this.config,
        debug: true, // Add this line
      });
    } catch (error) {
      logger.error('이메일 transporter 생성 실패:', { error });
      throw new Error('이메일 서비스 초기화 실패');
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    fromName: string = 'stagelives',
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
        priority: 'normal' as 'normal' | 'high' | 'low',
        headers: {
          'X-Mailer': 'stagelives Email Service',
          'X-Priority': '3',
        },
      };

      const info = (await this.transporter.sendMail(mailOptions)) as any;

      logger.info(`✅ 이메일 전송 성공: ${to} - Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error(`❌ 이메일 전송 실패: ${to}`, { error });

      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  async sendRegistrationVerification(
    data: EmailTemplateData,
  ): Promise<EmailSendResult> {
    const subject = `[stagelives] 회원가입 이메일 인증`;
    const html = EmailTemplates.getRegistrationVerificationEmail(data);

    const result = await this.sendEmail(
      data.email,
      subject,
      html,
      'stagelives',
    );

    if (result.success) {
      logger.info(
        `📧 회원가입 인증 이메일 전송: ${data.username || 'Unknown'} (${data.email})`,
      );
    }

    return result;
  }

  async sendPasswordReset(data: EmailTemplateData): Promise<EmailSendResult> {
    const subject = `[stagelives] 비밀번호 재설정 인증 코드`;
    const html = EmailTemplates.getPasswordResetEmail(data);

    const result = await this.sendEmail(
      data.email,
      subject,
      html,
      'stagelives Security',
    );

    if (result.success) {
      logger.info(
        `🔒 비밀번호 재설정 이메일 전송: ${data.username || 'Unknown'} (${data.email})`,
      );
    }

    return result;
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailSendResult> {
    const subject = `[stagelives] 가입을 환영합니다!`;
    const html = EmailTemplates.getWelcomeEmail(data);

    const result = await this.sendEmail(
      data.email,
      subject,
      html,
      'stagelives',
    );

    if (result.success) {
      logger.info(`🎉 환영 이메일 전송: ${data.username} (${data.email})`);
    }

    return result;
  }

  async sendSecurityAlert(data: SecurityAlertData): Promise<EmailSendResult> {
    const subject = `[stagelives] 계정 보안 알림`;
    const html = EmailTemplates.getSecurityAlertEmail(data);

    const result = await this.sendEmail(
      data.email,
      subject,
      html,
      'stagelives Security',
    );

    if (result.success) {
      logger.info(
        `🚨 보안 알림 이메일 전송: ${data.username} (${data.email}) - ${data.action}`,
      );
    }

    return result;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('✅ 이메일 서비스 연결 확인 성공');
      return true;
    } catch (error) {
      logger.error('❌ 이메일 서비스 연결 실패:', { error });
      return false;
    }
  }

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
        '회원가입 인증',
        '비밀번호 재설정',
        '환영 메시지',
        '보안 알림',
        '반응형 템플릿',
        'HTML/CSS 스타일링',
      ],
    };
  }

  async sendBulkEmails(
    recipients: string[],
    subject: string,
    html: string,
    batchSize: number = 10,
  ): Promise<{
    totalSent: number;
    totalFailed: number;
    results: EmailSendResult[];
  }> {
    const results: EmailSendResult[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchPromises = batch.map((email) =>
        this.sendEmail(email, subject, html),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      batchResults.forEach((result) => {
        if (result.success) {
          totalSent++;
        } else {
          totalFailed++;
        }
      });

      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    logger.info(
      `📊 대량 이메일 전송 완료: 성공 ${totalSent}건, 실패 ${totalFailed}건`,
    );

    return {
      totalSent,
      totalFailed,
      results,
    };
  }

  generatePreview(
    type: 'registration' | 'password_reset' | 'welcome' | 'security_alert',
  ): string {
    const sampleData = {
      registration: {
        email: 'user@example.com',
        username: 'testuser',
        verificationCode: '123456',
        createdAt: new Date().toLocaleString('ko-KR'),
      },
      password_reset: {
        email: 'user@example.com',
        username: 'testuser',
        verificationCode: '654321',
        createdAt: new Date().toLocaleString('ko-KR'),
      },
      welcome: {
        email: 'user@example.com',
        username: 'testuser',
      },
      security_alert: {
        email: 'user@example.com',
        username: 'testuser',
        action: '로그인 시도',
        timestamp: new Date().toLocaleString('ko-KR'),
        ipAddress: '192.168.1.1',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    };

    switch (type) {
      case 'registration':
        return EmailTemplates.getRegistrationVerificationEmail(
          sampleData.registration,
        );
      case 'password_reset':
        return EmailTemplates.getPasswordResetEmail(sampleData.password_reset);
      case 'welcome':
        return EmailTemplates.getWelcomeEmail(sampleData.welcome);
      case 'security_alert':
        return EmailTemplates.getSecurityAlertEmail(sampleData.security_alert);
      default:
        throw new Error('알 수 없는 템플릿 타입입니다.');
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.transporter.close();
      logger.info('✅ 이메일 서비스 리소스 정리 완료');
    } catch (error) {
      logger.error('❌ 이메일 서비스 정리 실패:', { error });
    }
  }
}
