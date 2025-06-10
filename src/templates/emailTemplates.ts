// templates/emailTemplates.ts (로고 완전 제거)
export interface EmailTemplateData {
  username?: string;
  email: string;
  verificationCode: string;
  createdAt?: string;
}

export interface SecurityAlertData {
  username: string;
  email: string;
  action: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface WelcomeEmailData {
  username: string;
  email: string;
}

export class EmailTemplates {
  /**
   * 회원가입 이메일 인증 템플릿
   */
  static getRegistrationVerificationEmail(data: EmailTemplateData): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>회원가입 이메일 인증</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">회원가입 이메일 인증</h2>
            <p>안녕하세요${data.username ? `, <strong>${data.username}</strong>님` : ""}!</p>
            <p><strong>LiveLink</strong>에 회원가입해주셔서 감사합니다.</p>
            <p>아래 인증 코드를 입력하여 회원가입을 완료해주세요.</p>
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
              <h3 style="color: #007bff; font-size: 24px; margin: 0;">인증 코드: ${data.verificationCode}</h3>
            </div>
            <p><strong>주의사항:</strong></p>
            <ul>
              <li>이 코드는 3분 후에 만료됩니다.</li>
              <li>인증 코드를 다른 사람과 공유하지 마세요.</li>
              <li>본인이 요청하지 않았다면 이 이메일을 무시하세요.</li>
            </ul>
            <p>감사합니다.<br>LiveLink 팀</p>
          </div>
        </body>
        </html>
      `;
  }

  /**
   * 비밀번호 재설정 이메일 템플릿
   */
  static getPasswordResetEmail(data: EmailTemplateData): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>비밀번호 재설정</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">비밀번호 재설정 인증 코드</h2>
            <p>안녕하세요${data.username ? `, <strong>${data.username}</strong>님` : ""}!</p>
            <p>비밀번호 재설정을 위한 인증 코드를 발송해드립니다.</p>
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
              <h3 style="color: #dc3545; font-size: 24px; margin: 0;">인증 코드: ${data.verificationCode}</h3>
            </div>
            <p><strong>주의사항:</strong></p>
            <ul>
              <li>이 코드는 3분 후에 만료됩니다.</li>
              <li>인증 코드를 다른 사람과 공유하지 마세요.</li>
              <li>본인이 요청하지 않았다면 즉시 비밀번호를 변경해주세요.</li>
            </ul>
            <p>감사합니다.<br>LiveLink 팀</p>
          </div>
        </body>
        </html>
      `;
  }

  /**
   * 환영 이메일 템플릿
   */
  static getWelcomeEmail(data: WelcomeEmailData): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>가입을 환영합니다</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">가입을 환영합니다!</h2>
            <p>안녕하세요, <strong>${data.username}</strong>님!</p>
            <p><strong>LiveLink</strong> 가족이 되어주셔서 진심으로 감사합니다.</p>
            <p>이제 모든 기능을 자유롭게 이용하실 수 있습니다.</p>
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
              <h3 style="color: #28a745; font-size: 20px; margin: 0;">환영합니다, ${data.username}님!</h3>
            </div>
            <p><strong>다음 단계:</strong></p>
            <ul>
              <li>프로필 설정하기</li>
              <li>다른 사용자들과 연결하기</li>
              <li>새로운 기능들 탐험하기</li>
            </ul>
            <p>문의사항이 있으시면 언제든지 연락주세요.</p>
            <p>감사합니다.<br>LiveLink 팀</p>
          </div>
        </body>
        </html>
      `;
  }

  /**
   * 보안 알림 이메일 템플릿
   */
  static getSecurityAlertEmail(data: SecurityAlertData): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>계정 보안 알림</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">계정 보안 알림</h2>
            <p>안녕하세요, <strong>${data.username}</strong>님!</p>
            <p>귀하의 계정에서 다음과 같은 보안 관련 활동이 감지되었습니다.</p>
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
              <h3 style="color: #ffc107; font-size: 20px; margin: 0;">활동: ${data.action}</h3>
              <p style="margin: 10px 0 0 0;">시간: ${data.timestamp}</p>
            </div>
            <p><strong>본인의 활동이 아닌 경우:</strong></p>
            <ul>
              <li>즉시 비밀번호를 변경해주세요</li>
              <li>모든 기기에서 로그아웃하세요</li>
              <li>고객센터에 즉시 신고해주세요</li>
            </ul>
            <p>감사합니다.<br>LiveLink 보안팀</p>
          </div>
        </body>
        </html>
      `;
  }
}
