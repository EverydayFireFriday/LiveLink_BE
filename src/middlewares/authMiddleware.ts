// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';

// 환경변수에서 관리자 이메일 목록 가져오기
const getAdminEmails = (): string[] => {
  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  
  if (!adminEmailsEnv) {
    console.warn('⚠️  ADMIN_EMAILS 환경변수가 설정되지 않았습니다. 관리자 기능이 비활성화됩니다.');
    return [];
  }
  
  // 쉼표로 구분된 이메일들을 배열로 변환하고 공백 제거
  const emails = adminEmailsEnv
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
    
  console.log(`✅ 관리자 계정 ${emails.length}개 로드됨:`, emails.map(email => email.replace(/(.{3}).*(@.*)/, '$1***$2')));
  
  return emails;
};

// 관리자 이메일 목록 캐시
const ADMIN_EMAILS = getAdminEmails();

// 이메일 형식 검증 함수
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 관리자 권한 확인 함수
export const isAdmin = (email: string): boolean => {
  if (!email || !isValidEmail(email)) {
    return false;
  }
  
  const normalizedEmail = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalizedEmail);
};

// 로그인 확인 미들웨어
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  // 세션에서 사용자 정보 확인
  if (!req.session || !req.session.user) {
    res.status(401).json({
      success: false,
      message: "로그인이 필요합니다.",
      loginRequired: true
    });
    return;
  }
  
  // 사용자 정보를 req.user에 저장 (컨트롤러에서 사용 가능)
  req.user = {
    userId: req.session.user.userId,
    email: req.session.user.email,
    username: req.session.user.username,
    profileImage: req.session.user.profileImage,
    loginTime: req.session.user.loginTime
  };
  
  next();
};

// 관리자 권한 확인 미들웨어
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // 먼저 로그인 확인
  if (!req.session || !req.session.user) {
    res.status(401).json({
      success: false,
      message: "로그인이 필요합니다.",
      loginRequired: true
    });
    return;
  }

  // 관리자 권한 확인
  const userEmail = req.session.user.email;
  
  if (!isAdmin(userEmail)) {
    console.log(`🚫 관리자 권한 거부: ${userEmail} (관리자 아님)`);
    res.status(403).json({
      success: false,
      message: "관리자 권한이 필요합니다.",
      userEmail: userEmail,
      isAdmin: false
    });
    return;
  }

  // 관리자 권한 승인
  console.log(`✅ 관리자 권한 승인: ${userEmail}`);
  
  // 사용자 정보를 req.user에 저장
  req.user = {
    userId: req.session.user.userId,
    email: req.session.user.email,
    username: req.session.user.username,
    profileImage: req.session.user.profileImage,
    loginTime: req.session.user.loginTime
  };
  
  next();
};

// 관리자 목록 조회 (관리자만 접근 가능)
export const getAdminList = (req: Request, res: Response): void => {
  if (!req.session || !req.session.user || !isAdmin(req.session.user.email)) {
    res.status(403).json({ 
      success: false,
      message: "관리자 권한이 필요합니다." 
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "관리자 목록 조회 성공",
    data: {
      adminEmails: ADMIN_EMAILS,
      totalAdmins: ADMIN_EMAILS.length,
      currentUser: {
        email: req.session.user.email,
        isAdmin: true
      }
    }
  });
};

// 현재 사용자의 관리자 권한 확인
export const checkAdminStatus = (req: Request, res: Response): void => {
  if (!req.session || !req.session.user) {
    res.status(401).json({
      success: false,
      message: "로그인이 필요합니다.",
      data: { isAdmin: false }
    });
    return;
  }

  const userEmail = req.session.user.email;
  const adminStatus = isAdmin(userEmail);

  res.status(200).json({
    success: true,
    message: "관리자 권한 확인 완료",
    data: {
      email: userEmail,
      isAdmin: adminStatus,
      adminCount: ADMIN_EMAILS.length
    }
  });
};

// 환경변수 관리자 설정 검증 함수 (앱 시작시 호출)
export const validateAdminConfig = (): void => {
  console.log('\n🔧 관리자 계정 설정 검증 중...');
  
  if (ADMIN_EMAILS.length === 0) {
    console.warn('⚠️  경고: 관리자 계정이 설정되지 않았습니다!');
    console.warn('   .env 파일에 ADMIN_EMAILS를 설정해주세요.');
    console.warn('   예: ADMIN_EMAILS=admin@example.com,sinbla78@gmail.com');
    return;
  }

  // 이메일 형식 검증
  const invalidEmails = ADMIN_EMAILS.filter(email => !isValidEmail(email));
  if (invalidEmails.length > 0) {
    console.error('❌ 잘못된 관리자 이메일 형식:', invalidEmails);
    throw new Error(`잘못된 관리자 이메일 형식: ${invalidEmails.join(', ')}`);
  }

  console.log(`✅ 관리자 계정 설정 완료: ${ADMIN_EMAILS.length}개`);
  console.log('   관리자 계정:', ADMIN_EMAILS.map(email => 
    email.replace(/(.{3}).*(@.*)/, '$1***$2')
  ).join(', '));
  console.log('');
};

// 관리자 환경변수 새로고침 (런타임에서 관리자 목록 업데이트)
export const refreshAdminConfig = (): string[] => {
  const newAdminEmails = getAdminEmails();
  
  // 기존 배열을 새로운 값으로 업데이트
  ADMIN_EMAILS.length = 0;
  ADMIN_EMAILS.push(...newAdminEmails);
  
  console.log('🔄 관리자 설정 새로고침 완료');
  return ADMIN_EMAILS;
};

// .env.example에 추가할 설정 예시를 출력하는 헬퍼 함수
export const printEnvExample = (): void => {
  console.log('\n📝 .env 파일 설정 예시:');
  console.log('# 관리자 계정 설정 (쉼표로 구분, 공백 자동 제거)');
  console.log('ADMIN_EMAILS=admin@gmail.com,admin@example.com');
  console.log('');
  console.log('# 하나의 관리자만 설정하는 경우');
  console.log('ADMIN_EMAILS=sinbla78@gmail.com');
  console.log('');
};

// 기본 export
export default {
  requireAuth,
  requireAdmin,
  isAdmin,
  getAdminList,
  checkAdminStatus,
  validateAdminConfig,
  refreshAdminConfig,
  printEnvExample
};