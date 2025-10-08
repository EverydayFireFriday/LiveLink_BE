/**
 * 이메일 주소를 마스킹 처리하는 유틸리티 함수
 * 예: user@example.com -> u***@example.com
 *      verylongemail@gmail.com -> very***@gmail.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***';
  }

  const [localPart, domain] = email.split('@');

  // 로컬 파트가 너무 짧으면 첫 글자만 보여주고 나머지 마스킹
  if (localPart.length <= 3) {
    return `${localPart.charAt(0)}***@${domain}`;
  }

  // 로컬 파트가 4글자 이상이면 처음 절반만 보여주고 나머지 마스킹
  const visibleLength = Math.ceil(localPart.length / 2);
  const visiblePart = localPart.substring(0, visibleLength);

  return `${visiblePart}***@${domain}`;
}

/**
 * 이메일 배열을 마스킹 처리
 */
export function maskEmails(emails: string[]): string[] {
  return emails.map((email) => maskEmail(email));
}
