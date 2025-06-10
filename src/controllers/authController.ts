// controllers/auth.ts (완전한 Swagger 문서 포함)
import express from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { UserModel } from "../models/user";
import Redis from "ioredis";
import { EmailService } from "../utils/emailService";

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const emailService = new EmailService();

// bcrypt 솔트 라운드 (10-12가 권장됨)
const SALT_ROUNDS = 12;

// UserModel을 지연 초기화하는 함수
const getUserModel = () => {
  return new UserModel();
};

// 인증 코드 인터페이스
interface VerificationCode {
  code: string;
  email: string;
  type: 'password_reset' | 'email_verification';
  createdAt: string;
  // 회원가입 인증을 위한 추가 정보
  userData?: {
    username: string;
    passwordHash: string;
    profileImage?: string;
  };
}

// Redis 키 생성 함수
const getRedisKey = (type: string, email: string): string => {
  return `verification:${type}:${email}`;
};

// Redis에서 인증 코드 저장 (3분 TTL)
const saveVerificationCode = async (
  type: string, 
  email: string, 
  code: string, 
  userData?: any
): Promise<string> => {
  const key = getRedisKey(type, email);
  const data: VerificationCode = {
    code,
    email,
    type: type as 'password_reset' | 'email_verification',
    createdAt: new Date().toISOString(),
    userData
  };
  
  // Redis에 3분(180초) TTL로 저장
  await redis.setex(key, 180, JSON.stringify(data));
  
  return key;
};

// Redis에서 인증 코드 조회
const getVerificationCode = async (key: string): Promise<VerificationCode | null> => {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    
    return JSON.parse(data) as VerificationCode;
  } catch (error) {
    console.error('Redis 데이터 파싱 에러:', error);
    return null;
  }
};

// Redis에서 인증 코드 삭제
const deleteVerificationCode = async (key: string): Promise<void> => {
  await redis.del(key);
};

// 최근 요청 확인 (스팸 방지용)
const checkRecentRequest = async (email: string, type: string): Promise<boolean> => {
  const recentKey = `recent:${type}:${email}`;
  const exists = await redis.exists(recentKey);
  
  if (exists) {
    return true; // 최근 요청이 있음
  }
  
  // 1분간 재요청 방지
  await redis.setex(recentKey, 60, '1');
  return false;
};

// 6자리 인증 코드 생성
const generateVerificationCode = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// 사용자명 자동 생성 함수
const generateUsername = async (email: string, baseUsername?: string): Promise<string> => {
  const userModel = getUserModel();
  
  // 기본 사용자명 생성 (이메일 앞부분 또는 제공된 기본값)
  let username = baseUsername || email.split('@')[0];
  
  // 특수문자 제거 및 소문자 변환
  username = username.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
  
  // 최소 길이 보장
  if (username.length < 2) {
    username = 'user';
  }
  
  // 최대 길이 제한
  if (username.length > 15) {
    username = username.substring(0, 15);
  }
  
  let finalUsername = username;
  let counter = 1;
  
  // 중복 확인 및 번호 추가
  while (await userModel.findByUsername(finalUsername)) {
    finalUsername = `${username}${counter}`;
    counter++;
    
    // 무한 루프 방지
    if (counter > 9999) {
      finalUsername = `${username}${Date.now().toString().slice(-4)}`;
      break;
    }
  }
  
  return finalUsername;
};

// 비밀번호 해시화 함수
const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// 비밀번호 검증 함수
const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * @swagger
 * /auth/generate-username:
 *   get:
 *     summary: 사용자명 자동 생성
 *     description: 이메일을 기반으로 사용 가능한 사용자명을 자동 생성합니다.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: 기반이 될 이메일 주소
 *       - in: query
 *         name: base
 *         required: false
 *         schema:
 *           type: string
 *         description: 선호하는 기본 사용자명 (선택사항)
 *     responses:
 *       200:
 *         description: 사용자명 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 에러
 */
export const generateUsernameAPI = async (
  req: express.Request,
  res: express.Response
) => {
  const { email, base } = req.query;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ message: "이메일을 입력해주세요." });
    return;
  }

  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "올바른 이메일 형식을 입력해주세요." });
    return;
  }

  try {
    const generatedUsername = await generateUsername(
      email, 
      base ? String(base) : undefined
    );

    res.status(200).json({
      message: "사용자명이 성공적으로 생성되었습니다.",
      username: generatedUsername,
      available: true,
      generatedFrom: base ? `기본값: ${base}` : `이메일: ${email}`,
    });

  } catch (error) {
    console.error("사용자명 생성 에러:", error);
    res.status(500).json({ message: "사용자명 생성 실패" });
  }
};

/**
 * @swagger
 * /auth/register-request:
 *   post:
 *     summary: 회원가입 이메일 인증 요청
 *     description: 회원가입을 위한 이메일 인증 코드를 전송합니다. 사용자 정보는 Redis에 임시 저장됩니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 회원가입할 이메일
 *               username:
 *                 type: string
 *                 description: 별명 (자동 생성 가능)
 *               password:
 *                 type: string
 *                 minLength: 7
 *                 description: 비밀번호
 *               profileImage:
 *                 type: string
 *                 description: 프로필 이미지 URL (선택사항)
 *     responses:
 *       200:
 *         description: 인증 코드 전송 성공
 *       400:
 *         description: 잘못된 요청 또는 이미 존재하는 사용자
 *       429:
 *         description: 너무 빈번한 요청
 *       500:
 *         description: 서버 에러
 */
export const registerRequest = async (req: express.Request, res: express.Response) => {
  const { email, username, password, profileImage } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "이메일과 비밀번호를 입력해주세요." });
    return;
  }

  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "올바른 이메일 형식을 입력해주세요." });
    return;
  }

  if (password.length < 7) {
    res.status(400).json({ message: "비밀번호는 최소 7자 이상이어야 합니다." });
    return;
  }

  try {
    // 최근 요청 확인 (스팸 방지)
    const hasRecentRequest = await checkRecentRequest(email, 'email_verification');
    if (hasRecentRequest) {
      res.status(429).json({ 
        message: "너무 빈번한 요청입니다. 1분 후에 다시 시도해주세요.",
        retryAfter: 60
      });
      return;
    }

    const userModel = getUserModel();
    
    // 이메일 중복 확인
    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
      res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
      return;
    }

    // 사용자명 처리 (자동 생성 또는 검증)
    let finalUsername: string;
    
    if (!username || username.trim() === '') {
      // 사용자명이 없으면 자동 생성
      finalUsername = await generateUsername(email);
      console.log(`사용자명 자동 생성: ${email} → ${finalUsername}`);
    } else {
      // 사용자명이 제공된 경우 검증
      if (username.length < 2) {
        res.status(400).json({ message: "별명은 최소 2자 이상이어야 합니다." });
        return;
      }

      if (username.length > 20) {
        res.status(400).json({ message: "별명은 최대 20자까지 가능합니다." });
        return;
      }

      const existingUsername = await userModel.findByUsername(username);
      if (existingUsername) {
        res.status(400).json({ 
          message: "이미 사용 중인 별명입니다.",
          suggestion: "자동 생성을 원하시면 별명을 비워두세요."
        });
        return;
      }
      
      finalUsername = username;
    }

    // 비밀번호 해시화
    const hashedPassword = await hashPassword(password);

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();

    // 사용자 데이터를 Redis에 임시 저장 (인증 후 DB에 저장)
    const userData = {
      username: finalUsername,
      passwordHash: hashedPassword,
      profileImage: profileImage || undefined,
    };

    const redisKey = await saveVerificationCode('email_verification', email, verificationCode, userData);

    // 이메일 전송 (새로운 이메일 서비스 사용)
    const emailResult = await emailService.sendRegistrationVerification({
      email,
      username: finalUsername,
      verificationCode,
      createdAt: new Date().toLocaleString('ko-KR')
    });

    if (!emailResult.success) {
      // 이메일 전송 실패시 Redis 데이터 정리
      await deleteVerificationCode(redisKey);
      res.status(500).json({ 
        message: "이메일 전송에 실패했습니다. 다시 시도해주세요.",
        error: emailResult.error
      });
      return;
    }

    console.log(`📧 회원가입 인증 코드 전송: ${finalUsername} (${email}) - 새로운 템플릿 시스템 사용`);

    res.status(200).json({
      message: "회원가입 인증 코드가 이메일로 전송되었습니다.",
      email,
      username: finalUsername,
      usernameGenerated: !username || username.trim() === '',
      redisKey,
      expiresIn: "3분",
      nextStep: "이메일에서 인증 코드를 확인하고 /auth/verify-register로 인증을 완료해주세요.",
      emailTemplate: "새로운 반응형 템플릿 적용",
      messageId: emailResult.messageId
    });

  } catch (error) {
    console.error("회원가입 인증 이메일 전송 에러:", error);
    res.status(500).json({ message: "이메일 전송 실패" });
  }
};

/**
 * @swagger
 * /auth/verify-register:
 *   post:
 *     summary: 회원가입 이메일 인증 완료
 *     description: 이메일 인증 코드를 확인하고 실제 회원가입을 완료합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               verificationCode:
 *                 type: string
 *                 description: 이메일로 받은 6자리 인증 코드
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 코드 불일치
 *       410:
 *         description: 인증 코드 만료
 *       500:
 *         description: 서버 에러
 */
export const verifyRegister = async (req: express.Request, res: express.Response) => {
  const { email, verificationCode } = req.body;

  if (!email || !verificationCode) {
    res.status(400).json({ message: "이메일과 인증 코드를 입력해주세요." });
    return;
  }

  try {
    const redisKey = getRedisKey('email_verification', email);
    const storedData = await getVerificationCode(redisKey);
    
    if (!storedData) {
      res.status(410).json({ message: "인증 코드가 만료되었거나 존재하지 않습니다." });
      return;
    }

    if (storedData.code !== verificationCode) {
      res.status(401).json({ message: "인증 코드가 일치하지 않습니다." });
      return;
    }

    if (storedData.type !== 'email_verification') {
      res.status(400).json({ message: "잘못된 인증 코드 유형입니다." });
      return;
    }

    if (!storedData.userData) {
      res.status(400).json({ message: "사용자 데이터가 없습니다. 다시 회원가입을 시도해주세요." });
      return;
    }

    const userModel = getUserModel();
    
    // 이메일 중복 재확인 (동시성 문제 방지)
    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
      await deleteVerificationCode(redisKey);
      res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
      return;
    }

    // 사용자명 중복 재확인
    const existingUsername = await userModel.findByUsername(storedData.userData.username);
    if (existingUsername) {
      await deleteVerificationCode(redisKey);
      res.status(400).json({ message: "이미 사용 중인 별명입니다. 다시 회원가입을 시도해주세요." });
      return;
    }

    // 실제 사용자 생성 (MongoDB에 저장)
    const newUser = await userModel.createUser({
      email,
      username: storedData.userData.username,
      passwordHash: storedData.userData.passwordHash,
      profileImage: storedData.userData.profileImage,
    });

    // 인증 코드 삭제 (일회용)
    await deleteVerificationCode(redisKey);

    // 환영 이메일 전송 (비동기로 처리하여 응답 속도 개선)
    setImmediate(async () => {
      try {
        await emailService.sendWelcomeEmail({
          username: newUser.username,
          email: newUser.email
        });
        console.log(`🎉 환영 이메일 전송 완료: ${newUser.username} (${email})`);
      } catch (emailError) {
        console.error('환영 이메일 전송 실패:', emailError);
        // 환영 이메일 실패는 회원가입 성공을 방해하지 않음
      }
    });

    console.log(`✅ 이메일 인증 회원가입 완료: ${newUser.username} (${email}) - MongoDB 저장 완료, Redis에서 임시 데이터 삭제`);

    res.status(201).json({
      message: "이메일 인증이 완료되어 회원가입이 성공했습니다!",
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        profileImage: newUser.profileImage,
        createdAt: newUser.createdAt,
      },
      verifiedFrom: "Redis 이메일 인증 시스템",
      security: "비밀번호가 bcrypt로 안전하게 해시화되었습니다.",
      nextStep: "환영 이메일을 확인하고 로그인할 수 있습니다.",
      emailTemplate: "환영 이메일 자동 발송 진행 중"
    });

  } catch (error: any) {
    console.error("회원가입 인증 완료 에러:", error);
    if (error.message === "Email already exists") {
      res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    } else if (error.message === "Username already exists") {
      res.status(400).json({ message: "이미 사용 중인 별명입니다." });
    } else {
      res.status(500).json({ message: "서버 에러로 회원가입 실패" });
    }
  }
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: 직접 회원가입 (이메일 인증 없이)
 *     description: 기존 방식의 즉시 회원가입입니다. 보안을 위해 이메일 인증 방식을 권장합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 아이디로 사용될 이메일
 *               username:
 *                 type: string
 *                 description: 별명 (수정 가능)
 *               password:
 *                 type: string
 *                 minLength: 7
 *                 description: 비밀번호 (bcrypt로 해시화됨)
 *               profileImage:
 *                 type: string
 *                 description: 프로필 이미지 URL (선택사항)
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 에러
 */
export const register = async (req: express.Request, res: express.Response) => {
  const { email, username, password, profileImage } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "이메일(아이디)과 비밀번호를 입력해주세요." });
    return;
  }

  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "올바른 이메일 형식을 입력해주세요." });
    return;
  }

  if (password.length < 7) {
    res.status(400).json({ message: "비밀번호는 최소 7자 이상이어야 합니다." });
    return;
  }

  try {
    const userModel = getUserModel();
    
    // 이메일 중복 확인
    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
      res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
      return;
    }

    // 사용자명 처리 (자동 생성 또는 검증)
    let finalUsername: string;
    
    if (!username || username.trim() === '') {
      // 사용자명이 없으면 자동 생성
      finalUsername = await generateUsername(email);
      console.log(`사용자명 자동 생성: ${email} → ${finalUsername}`);
    } else {
      // 사용자명이 제공된 경우 검증
      if (username.length < 2) {
        res.status(400).json({ message: "별명은 최소 2자 이상이어야 합니다." });
        return;
      }

      if (username.length > 20) {
        res.status(400).json({ message: "별명은 최대 20자까지 가능합니다." });
        return;
      }

      const existingUsername = await userModel.findByUsername(username);
      if (existingUsername) {
        res.status(400).json({ 
          message: "이미 사용 중인 별명입니다.",
          suggestion: "자동 생성을 원하시면 별명을 비워두세요."
        });
        return;
      }
      
      finalUsername = username;
    }

    // 비밀번호 해시화
    const hashedPassword = await hashPassword(password);

    // 새 사용자 생성 (해시화된 비밀번호 저장)
    const newUser = await userModel.createUser({
      email,
      username: finalUsername,
      passwordHash: hashedPassword, 
      profileImage: profileImage || undefined,
    });

    console.log(`✅ 새 사용자 가입: ${finalUsername} (${email}) - MongoDB 저장 완료 (bcrypt 해시화)`);
    
    res.status(201).json({
      message: "회원가입 성공",
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        profileImage: newUser.profileImage,
        createdAt: newUser.createdAt,
      },
      usernameGenerated: !username || username.trim() === '',
      security: "비밀번호가 bcrypt로 안전하게 해시화되었습니다.",
      recommendation: "보안을 위해 이메일 인증 회원가입(/auth/register-request)을 권장합니다.",
    });
  } catch (error: any) {
    console.error("회원가입 에러:", error);
    if (error.message === "Email already exists") {
      res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    } else if (error.message === "Username already exists") {
      res.status(400).json({ message: "이미 사용 중인 별명입니다." });
    } else {
      res.status(500).json({ message: "서버 에러로 회원가입 실패" });
    }
  }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 사용자 로그인
 *     description: 이메일(아이디)과 비밀번호로 로그인합니다. bcrypt로 비밀번호를 안전하게 검증합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 아이디로 사용되는 이메일
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       400:
 *         description: 요청 오류
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 에러
 */
export const login = async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "이메일(아이디)과 비밀번호를 입력해주세요." });
    return;
  }

  try {
    // 이메일로 사용자 찾기
    const userModel = getUserModel();
    const user = await userModel.findByEmail(email);
    if (!user) {
      res.status(401).json({ message: "존재하지 않는 사용자입니다." });
      return;
    }

    // 비밀번호 확인 (bcrypt 비교)
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
      return;
    }

    // 마지막 로그인 시간 업데이트
    await userModel.updateUser(user._id!.toString(), { updatedAt: new Date() });

    // 세션에 사용자 정보 저장
    req.session.user = {
      email: user.email,
      userId: user._id!.toString(),
      username: user.username,
      profileImage: user.profileImage,
      loginTime: new Date().toISOString(),
    };

    console.log(
      `🔑 로그인 성공: ${user.username} (${user.email}) - 세션 ID: ${req.sessionID}, Redis 저장 완료 (bcrypt 검증)`
    );
    
    res.status(200).json({
      message: "로그인 성공",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
      },
      sessionId: req.sessionID,
      security: "bcrypt로 안전하게 인증되었습니다.",
    });
  } catch (error) {
    console.error("로그인 에러:", error);
    res.status(500).json({ message: "서버 에러로 로그인 실패" });
  }
};

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 로그아웃
 *     description: Redis에서 세션을 삭제하고 로그아웃합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *       500:
 *         description: 로그아웃 실패
 */
export const logout = (req: express.Request, res: express.Response) => {
  const sessionId = req.sessionID;
  const username = req.session.user?.username;

  req.session.destroy((err) => {
    if (err) {
      console.error("로그아웃 에러:", err);
      res.status(500).json({ message: "로그아웃 실패" });
      return;
    }

    res.clearCookie("connect.sid");

    console.log(
      `👋 로그아웃 완료: ${username} (세션 ID: ${sessionId}, Redis에서 삭제 완료)`
    );
    res.status(200).json({
      message: "로그아웃 성공",
      deletedSessionId: sessionId,
    });
  });
};

/**
 * @swagger
 * /auth/session:
 *   get:
 *     summary: 로그인 상태 확인
 *     description: Redis 세션을 통해 로그인 여부를 확인합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 로그인 상태 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loggedIn:
 *                   type: boolean
 *                   description: 로그인 여부
 *                 user:
 *                   type: object
 *                   description: 로그인한 사용자 정보 (로그인 시에만)
 *                 sessionId:
 *                   type: string
 *                   description: 세션 ID
 */
export const checkSession = (req: express.Request, res: express.Response) => {
  if (req.session.user) {
    res.status(200).json({
      loggedIn: true,
      user: req.session.user,
      sessionId: req.sessionID,
      storage: "세션은 Redis에 저장됨",
    });
  } else {
    res.status(200).json({
      loggedIn: false,
      sessionId: req.sessionID,
    });
  }
};

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: 비밀번호 재설정 요청 (이메일 인증)
 *     description: 이메일로 비밀번호 재설정 인증 코드를 전송합니다. (3분 유효기간, Redis 저장)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 아이디로 사용되는 이메일
 *     responses:
 *       200:
 *         description: 인증 코드 전송 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       429:
 *         description: 너무 빈번한 요청
 *       500:
 *         description: 서버 에러
 */
export const resetPasswordRequest = async (req: express.Request, res: express.Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "이메일(아이디)을 입력해주세요." });
    return;
  }

  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "올바른 이메일 형식을 입력해주세요." });
    return;
  }

  try {
    // 최근 요청 확인 (스팸 방지)
    const hasRecentRequest = await checkRecentRequest(email, 'password_reset');
    if (hasRecentRequest) {
      res.status(429).json({ 
        message: "너무 빈번한 요청입니다. 1분 후에 다시 시도해주세요.",
        retryAfter: 60
      });
      return;
    }

    const userModel = getUserModel();
    // 이메일로 사용자 찾기
    const user = await userModel.findByEmail(email);
    
    if (!user) {
      res.status(404).json({ message: "해당 이메일로 등록된 사용자를 찾을 수 없습니다." });
      return;
    }

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    
    // Redis에 인증 코드 저장 (3분 TTL)
    const redisKey = await saveVerificationCode('password_reset', email, verificationCode);

    // 이메일 전송 (새로운 이메일 서비스 사용)
    const emailResult = await emailService.sendPasswordReset({
      email,
      username: user.username,
      verificationCode,
      createdAt: new Date().toLocaleString('ko-KR')
    });

    if (!emailResult.success) {
      // 이메일 전송 실패시 Redis 데이터 정리
      await deleteVerificationCode(redisKey);
      res.status(500).json({ 
        message: "이메일 전송에 실패했습니다. 다시 시도해주세요.",
        error: emailResult.error
      });
      return;
    }

    console.log(`🔒 비밀번호 재설정 인증 코드 전송: ${user.username} (${email}) - 새로운 보안 템플릿 사용`);

    res.status(200).json({
      message: "비밀번호 재설정 인증 코드가 이메일로 전송되었습니다.",
      redisKey,
      expiresIn: "3분",
      storage: "Redis에 저장됨",
      security: "bcrypt로 안전하게 해시화될 예정",
      emailTemplate: "새로운 보안 템플릿 적용",
      messageId: emailResult.messageId
    });

  } catch (error) {
    console.error("비밀번호 재설정 이메일 전송 에러:", error);
    res.status(500).json({ message: "이메일 전송 실패" });
  }
};

/**
 * @swagger
 * /auth/verify-reset-password:
 *   post:
 *     summary: 비밀번호 재설정 인증 및 새 비밀번호 설정
 *     description: Redis에서 인증 코드를 확인하고 새 비밀번호로 변경합니다. 새 비밀번호는 bcrypt로 해시화됩니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               verificationCode:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 7
 *                 description: 새 비밀번호 (bcrypt로 해시화됨)
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 코드 불일치
 *       410:
 *         description: 인증 코드 만료
 *       500:
 *         description: 서버 에러
 */
export const verifyResetPassword = async (req: express.Request, res: express.Response) => {
  const { email, verificationCode, newPassword } = req.body;

  if (!email || !verificationCode || !newPassword) {
    res.status(400).json({ message: "모든 필드를 입력해주세요." });
    return;
  }

  if (newPassword.length < 7) {
    res.status(400).json({ message: "새 비밀번호는 최소 7자 이상이어야 합니다." });
    return;
  }

  try {
    const redisKey = getRedisKey('password_reset', email);
    const storedCode = await getVerificationCode(redisKey);
    
    if (!storedCode) {
      res.status(410).json({ message: "인증 코드가 만료되었거나 존재하지 않습니다." });
      return;
    }

    if (storedCode.code !== verificationCode) {
      res.status(401).json({ message: "인증 코드가 일치하지 않습니다." });
      return;
    }

    if (storedCode.type !== 'password_reset') {
      res.status(400).json({ message: "잘못된 인증 코드 유형입니다." });
      return;
    }

    // 사용자 정보 조회
    const userModel = getUserModel();
    const user = await userModel.findByEmail(email);
    
    if (!user) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    // 새 비밀번호 해시화
    const hashedNewPassword = await hashPassword(newPassword);

    // 비밀번호 업데이트 (해시화된 비밀번호로 저장)
    await userModel.updateUser(user._id!.toString(), {
      passwordHash: hashedNewPassword,
      updatedAt: new Date(),
    });

    // 인증 코드 삭제 (일회용)
    await deleteVerificationCode(redisKey);

    // 보안 알림 이메일 전송 (비동기)
    setImmediate(async () => {
      try {
        await emailService.sendSecurityAlert({
          username: user.username,
          email: user.email,
          action: '비밀번호 변경',
          timestamp: new Date().toLocaleString('ko-KR'),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        });
        console.log(`🚨 보안 알림 전송 완료: ${user.username} (${email}) - 비밀번호 변경`);
      } catch (emailError) {
        console.error('보안 알림 이메일 전송 실패:', emailError);
      }
    });

    console.log(`✅ 비밀번호 재설정 완료: ${user.username} (${email}) - bcrypt 해시화 후 저장, Redis에서 코드 삭제`);

    res.status(200).json({
      message: "비밀번호가 성공적으로 재설정되었습니다.",
      username: user.username,
      email: user.email,
      verifiedFrom: "Redis 인증 시스템",
      security: "새 비밀번호가 bcrypt로 안전하게 해시화되었습니다.",
      notification: "보안 알림 이메일이 발송됩니다."
    });

  } catch (error) {
    console.error("비밀번호 재설정 에러:", error);
    res.status(500).json({ message: "비밀번호 재설정 실패" });
  }
};

/**
 * @swagger
 * /auth/email-service/status:
 *   get:
 *     summary: 이메일 서비스 상태 확인
 *     description: Gmail SMTP 연결 상태와 이메일 템플릿 정보를 확인합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 이메일 서비스 상태 정상
 *       500:
 *         description: 이메일 서비스 오류
 */
export const checkEmailServiceStatus = async (req: express.Request, res: express.Response) => {
  try {
    const serviceStatus = await emailService.getServiceStatus();
    
    res.status(serviceStatus.connected ? 200 : 500).json({
      status: serviceStatus.connected ? 'connected' : 'disconnected',
      service: 'Gmail SMTP',
      config: serviceStatus.config,
      templates: {
        registration: '회원가입 인증',
        passwordReset: '비밀번호 재설정', 
        welcome: '환영 메시지',
        securityAlert: '보안 알림'
      },
      features: serviceStatus.features,
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    console.error('이메일 서비스 상태 확인 에러:', error);
    res.status(500).json({
      status: 'error',
      message: '이메일 서비스 상태 확인 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};

/**
 * @swagger
 * /auth/email-service/preview:
 *   get:
 *     summary: 이메일 템플릿 미리보기
 *     description: 개발/테스트용 이메일 템플릿 미리보기를 생성합니다.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [registration, password_reset, welcome, security_alert]
 *         description: 미리보기할 템플릿 유형
 *     responses:
 *       200:
 *         description: HTML 템플릿 미리보기
 *       400:
 *         description: 잘못된 템플릿 유형
 *       500:
 *         description: 미리보기 생성 실패
 */
export const previewEmailTemplate = async (req: express.Request, res: express.Response) => {
  const { type } = req.query;

  if (!type || typeof type !== 'string') {
    res.status(400).json({ message: "템플릿 유형을 지정해주세요." });
    return;
  }

  const validTypes = ['registration', 'password_reset', 'welcome', 'security_alert'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ 
      message: "올바르지 않은 템플릿 유형입니다.",
      validTypes
    });
    return;
  }

  try {
    const htmlPreview = emailService.generatePreview(type as any);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(htmlPreview);
  } catch (error) {
    console.error('이메일 템플릿 미리보기 생성 에러:', error);
    res.status(500).json({ 
      message: "템플릿 미리보기 생성 실패",
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
};

/**
 * @swagger
 * /auth/health:
 *   get:
 *     summary: 인증 시스템 전체 상태 확인
 *     description: Redis 연결, MongoDB 연결, 이메일 서비스 상태를 종합적으로 확인합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 시스템 상태 정상
 *       500:
 *         description: 시스템 오류
 */
export const healthCheck = async (req: express.Request, res: express.Response) => {
  try {
    // Redis 연결 상태 확인
    const redisConnected = await checkRedisConnection();
    
    // MongoDB 연결 상태 확인
    const userModel = getUserModel();
    let mongoConnected = false;
    try {
      await userModel.countUsers();
      mongoConnected = true;
    } catch (error) {
      console.error("MongoDB 연결 확인 에러:", error);
    }

    // 이메일 서비스 상태 확인
    const emailConnected = await emailService.verifyConnection();

    const allConnected = redisConnected && mongoConnected && emailConnected;
    const status = allConnected ? 'healthy' : 'unhealthy';
    const statusCode = status === 'healthy' ? 200 : 500;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        redis: {
          connected: redisConnected,
          status: redisConnected ? 'OK' : 'ERROR',
          description: 'Session & Verification Code Storage'
        },
        mongodb: {
          connected: mongoConnected,
          status: mongoConnected ? 'OK' : 'ERROR',
          description: 'User Data Storage'
        },
        email: {
          connected: emailConnected,
          status: emailConnected ? 'OK' : 'ERROR',
          description: 'Gmail SMTP Service'
        }
      },
      features: {
        emailVerification: "활성화 - 새 템플릿 시스템",
        passwordReset: "활성화 - 보안 강화",
        sessionManagement: "Redis 기반",
        passwordHashing: "bcrypt",
        verificationTTL: "3분",
        securityAlerts: "자동 발송",
        emailTemplates: "반응형 HTML"
      },
      version: "2.0.0 - Email Template System"
    });

  } catch (error) {
    console.error("헬스체크 에러:", error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: '시스템 상태 확인 실패'
    });
  }
};

// Redis 연결 상태 확인 함수
export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error("Redis 연결 에러:", error);
    return false;
  }
};

// Redis 정리 작업 (선택사항 - 크론잡이나 스케줄러에서 사용)
export const cleanupExpiredCodes = async (): Promise<void> => {
  try {
    const pattern = 'verification:*';
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      keys.forEach(key => {
        pipeline.ttl(key);
      });
      
      const ttls = await pipeline.exec();
      let expiredCount = 0;
      
      if (ttls) {
        for (let i = 0; i < ttls.length; i++) {
          const [err, ttl] = ttls[i];
          if (!err && (ttl as number) <= 0) {
            await redis.del(keys[i]);
            expiredCount++;
          }
        }
      }
      
      console.log(`🧹 Redis 정리 작업 완료: ${expiredCount}개의 만료된 인증 코드 삭제`);
    }
  } catch (error) {
    console.error("Redis 정리 작업 에러:", error);
  }
};

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: 프로필 조회
 *     description: 로그인한 사용자의 프로필 정보를 조회합니다.
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                     profileImage:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const getProfile = async (req: express.Request, res: express.Response) => {
  if (!req.session.user) {
    res.status(401).json({ message: "로그인이 필요합니다." });
    return;
  }

  try {
    const userModel = getUserModel();
    const user = await userModel.findByEmail(req.session.user.email);

    if (!user) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    res.status(200).json({
      message: "프로필 조회 성공",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      session: req.session.user,
      dataSource: "사용자 정보는 MongoDB에서 조회, 세션은 Redis에서 확인",
    });
  } catch (error) {
    console.error("프로필 조회 에러:", error);
    res.status(500).json({ message: "프로필 조회 실패" });
  }
};

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: 프로필 업데이트
 *     description: 로그인한 사용자의 프로필 이미지를 업데이트합니다.
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 description: 프로필 이미지 URL
 *     responses:
 *       200:
 *         description: 프로필 업데이트 성공
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const updateProfile = async (req: express.Request, res: express.Response) => {
  if (!req.session.user) {
    res.status(401).json({ message: "로그인이 필요합니다." });
    return;
  }

  try {
    const { profileImage } = req.body;
    const userId = req.session.user.userId;
    const userModel = getUserModel();

    const updatedUser = await userModel.updateUser(userId, {
      profileImage,
    });

    if (!updatedUser) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    // 세션 정보도 업데이트
    req.session.user.profileImage = profileImage;

    res.status(200).json({
      message: "프로필 업데이트 성공",
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        username: updatedUser.username,
        profileImage: updatedUser.profileImage,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error("프로필 업데이트 에러:", error);
    res.status(500).json({ message: "프로필 업데이트 실패" });
  }
};

/**
 * @swagger
 * /auth/username:
 *   put:
 *     summary: 사용자명 변경
 *     description: 로그인한 사용자의 사용자명(별명)을 변경합니다.
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newUsername:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 20
 *                 description: 새로운 사용자명
 *     responses:
 *       200:
 *         description: 사용자명 변경 성공
 *       400:
 *         description: 잘못된 요청 또는 중복된 사용자명
 *       401:
 *         description: 로그인 필요
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const updateUsername = async (req: express.Request, res: express.Response) => {
  if (!req.session.user) {
    res.status(401).json({ message: "로그인이 필요합니다." });
    return;
  }

  const { newUsername } = req.body;

  if (!newUsername) {
    res.status(400).json({ message: "새로운 별명을 입력해주세요." });
    return;
  }

  if (newUsername.length < 2 || newUsername.length > 20) {
    res.status(400).json({ message: "별명은 2자 이상 20자 이하여야 합니다." });
    return;
  }

  try {
    const userId = req.session.user.userId;
    const userModel = getUserModel();

    const currentUser = await userModel.findById(userId);
    if (!currentUser) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    if (currentUser.username === newUsername) {
      res.status(400).json({ message: "현재 별명과 동일합니다." });
      return;
    }

    const existingUser = await userModel.findByUsername(newUsername);
    if (existingUser) {
      res.status(400).json({ message: "이미 사용 중인 별명입니다." });
      return;
    }

    const updatedUser = await userModel.updateUser(userId, {
      username: newUsername,
    });

    if (!updatedUser) {
      res.status(404).json({ message: "사용자 업데이트에 실패했습니다." });
      return;
    }

    req.session.user.username = newUsername;

    console.log(`✅ 별명 변경 완료: ${currentUser.username} → ${newUsername} (${updatedUser.email})`);

    res.status(200).json({
      message: "별명이 성공적으로 변경되었습니다.",
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        username: updatedUser.username,
        profileImage: updatedUser.profileImage,
        updatedAt: updatedUser.updatedAt,
      },
      previousUsername: currentUser.username,
    });
  } catch (error) {
    console.error("별명 변경 에러:", error);
    res.status(500).json({ message: "별명 변경 실패" });
  }
};

/**
 * @swagger
 * /auth/check-username:
 *   post:
 *     summary: 사용자명 중복 확인
 *     description: 사용자명이 이미 사용 중인지 확인합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 20
 *                 description: 확인할 사용자명
 *     responses:
 *       200:
 *         description: 사용 가능한 사용자명
 *       400:
 *         description: 사용 불가능한 사용자명 또는 잘못된 요청
 *       500:
 *         description: 서버 에러
 */
export const checkUsername = async (req: express.Request, res: express.Response) => {
  const { username } = req.body;

  if (!username) {
    res.status(400).json({ message: "별명을 입력해주세요." });
    return;
  }

  if (username.length < 2 || username.length > 20) {
    res.status(400).json({ 
      message: "별명은 2자 이상 20자 이하여야 합니다.",
      available: false
    });
    return;
  }

  try {
    const userModel = getUserModel();
    const existingUser = await userModel.findByUsername(username);

    if (existingUser) {
      res.status(400).json({
        message: "이미 사용 중인 별명입니다.",
        available: false,
      });
    } else {
      res.status(200).json({
        message: "사용 가능한 별명입니다.",
        available: true,
      });
    }
  } catch (error) {
    console.error("별명 중복 확인 에러:", error);
    res.status(500).json({ message: "별명 중복 확인 실패" });
  }
};

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: 비밀번호 변경 (로그인 상태)
 *     description: 로그인한 사용자가 현재 비밀번호를 확인하고 새 비밀번호로 변경합니다.
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: 현재 비밀번호
 *               newPassword:
 *                 type: string
 *                 minLength: 7
 *                 description: 새 비밀번호
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 로그인 필요 또는 현재 비밀번호 불일치
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const changePassword = async (req: express.Request, res: express.Response) => {
  if (!req.session.user) {
    res.status(401).json({ message: "로그인이 필요합니다." });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요." });
    return;
  }

  if (newPassword.length < 7) {
    res.status(400).json({ message: "새 비밀번호는 최소 7자 이상이어야 합니다." });
    return;
  }

  if (currentPassword === newPassword) {
    res.status(400).json({ message: "새 비밀번호는 현재 비밀번호와 달라야 합니다." });
    return;
  }

  try {
    const userModel = getUserModel();
    const user = await userModel.findByEmail(req.session.user.email);

    if (!user) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      res.status(401).json({ message: "현재 비밀번호가 일치하지 않습니다." });
      return;
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await userModel.updateUser(user._id!.toString(), {
      passwordHash: hashedNewPassword,
      updatedAt: new Date(),
    });

    // 보안 알림 전송
    setImmediate(async () => {
      try {
        await emailService.sendSecurityAlert({
          username: user.username,
          email: user.email,
          action: '로그인 중 비밀번호 변경',
          timestamp: new Date().toLocaleString('ko-KR'),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        });
      } catch (emailError) {
        console.error('보안 알림 이메일 전송 실패:', emailError);
      }
    });

    console.log(`🔒 비밀번호 변경 완료: ${user.username} (${user.email}) - bcrypt 해시화 후 저장`);

    res.status(200).json({
      message: "비밀번호가 성공적으로 변경되었습니다.",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        updatedAt: new Date(),
      },
      security: "새 비밀번호가 bcrypt로 안전하게 해시화되었습니다.",
      notification: "보안 알림 이메일이 발송됩니다."
    });

  } catch (error) {
    console.error("비밀번호 변경 에러:", error);
    res.status(500).json({ message: "비밀번호 변경 실패" });
  }
};

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: 전체 사용자 목록 조회
 *     description: 모든 사용자의 목록을 페이지네이션과 함께 조회합니다. (관리자용)
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 페이지당 사용자 수
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 건너뛸 사용자 수
 *     responses:
 *       200:
 *         description: 사용자 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 totalUsers:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       username:
 *                         type: string
 *                       profileImage:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *       500:
 *         description: 서버 에러
 */
export const getAllUsers = async (req: express.Request, res: express.Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;
    const userModel = getUserModel();

    const users = await userModel.findAllUsers(limit, skip);
    const totalUsers = await userModel.countUsers();

    const safeUsers = users.map((user) => ({
      id: user._id,
      email: user.email,
      username: user.username,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.status(200).json({
      message: "사용자 목록 조회 성공",
      totalUsers,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalUsers / limit),
      users: safeUsers,
      dataSource: "MongoDB에서 조회",
      security: "비밀번호 해시는 안전하게 제외됨",
    });
  } catch (error) {
    console.error("사용자 목록 조회 에러:", error);
    res.status(500).json({ message: "사용자 목록 조회 실패" });
  }
};

/**
 * @swagger
 * /auth/verification/status:
 *   post:
 *     summary: 인증 코드 상태 확인
 *     description: Redis에 저장된 인증 코드의 상태와 남은 시간을 확인합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 인증 대상 이메일
 *               type:
 *                 type: string
 *                 enum: [password_reset, email_verification]
 *                 description: 인증 유형
 *     responses:
 *       200:
 *         description: 인증 코드 활성화됨
 *       404:
 *         description: 활성화된 인증 코드 없음
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 서버 에러
 */
export const getVerificationStatus = async (req: express.Request, res: express.Response) => {
  const { email, type } = req.body;

  if (!email || !type) {
    res.status(400).json({ message: "이메일과 인증 유형을 입력해주세요." });
    return;
  }

  try {
    const redisKey = getRedisKey(type, email);
    const storedCode = await getVerificationCode(redisKey);
    const ttl = await redis.ttl(redisKey);

    if (!storedCode || ttl <= 0) {
      res.status(404).json({ 
        message: "활성화된 인증 코드가 없습니다.",
        exists: false
      });
      return;
    }

    res.status(200).json({
      message: "인증 코드가 활성화되어 있습니다.",
      exists: true,
      timeRemaining: ttl,
      timeRemainingText: `${Math.floor(ttl / 60)}분 ${ttl % 60}초`,
      type: storedCode.type,
      createdAt: storedCode.createdAt,
      storage: "Redis에서 확인됨",
      hasUserData: type === 'email_verification' ? !!storedCode.userData : false,
    });

  } catch (error) {
    console.error("인증 코드 상태 확인 에러:", error);
    res.status(500).json({ message: "인증 코드 상태 확인 실패" });
  }
};

/**
 * @swagger
 * /auth/verification/cancel:
 *   post:
 *     summary: 인증 프로세스 취소
 *     description: 진행 중인 인증 프로세스를 취소하고 Redis에서 관련 데이터를 삭제합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 인증 대상 이메일
 *               type:
 *                 type: string
 *                 enum: [password_reset, email_verification]
 *                 description: 인증 유형
 *     responses:
 *       200:
 *         description: 인증 프로세스 취소 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 취소할 인증 프로세스 없음
 *       500:
 *         description: 서버 에러
 */
export const cancelVerification = async (req: express.Request, res: express.Response) => {
  const { email, type } = req.body;

  if (!email || !type) {
    res.status(400).json({ message: "이메일과 인증 유형을 입력해주세요." });
    return;
  }

  if (!['password_reset', 'email_verification'].includes(type)) {
    res.status(400).json({ message: "올바르지 않은 인증 유형입니다." });
    return;
  }

  try {
    const redisKey = getRedisKey(type, email);
    const storedCode = await getVerificationCode(redisKey);

    if (!storedCode) {
      res.status(404).json({ 
        message: "취소할 인증 프로세스가 없습니다.",
        exists: false
      });
      return;
    }

    await deleteVerificationCode(redisKey);
    
    const recentKey = `recent:${type}:${email}`;
    await redis.del(recentKey);

    console.log(`❌ 인증 프로세스 취소: ${email} (${type}) - Redis에서 삭제 완료`);

    res.status(200).json({
      message: "인증 프로세스가 성공적으로 취소되었습니다.",
      email,
      type,
      deletedFrom: "Redis 인증 시스템",
    });

  } catch (error) {
    console.error("인증 프로세스 취소 에러:", error);
    res.status(500).json({ message: "인증 프로세스 취소 실패" });
  }
};

/**
 * @swagger
 * /auth/verification/resend:
 *   post:
 *     summary: 인증 코드 재전송
 *     description: 기존 인증 코드를 삭제하고 새로운 인증 코드를 재전송합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 인증 대상 이메일
 *               type:
 *                 type: string
 *                 enum: [password_reset, email_verification]
 *                 description: 인증 유형
 *     responses:
 *       200:
 *         description: 인증 코드 재전송 성공
 *       400:
 *         description: 잘못된 요청
 *       429:
 *         description: 너무 빈번한 요청
 *       500:
 *         description: 서버 에러
 */
export const resendVerificationCode = async (req: express.Request, res: express.Response) => {
  const { email, type } = req.body;

  if (!email || !type) {
    res.status(400).json({ message: "이메일과 인증 유형을 입력해주세요." });
    return;
  }

  if (!['password_reset', 'email_verification'].includes(type)) {
    res.status(400).json({ message: "올바르지 않은 인증 유형입니다." });
    return;
  }

  try {
    const hasRecentRequest = await checkRecentRequest(email, type);
    if (hasRecentRequest) {
      res.status(429).json({ 
        message: "너무 빈번한 요청입니다. 1분 후에 다시 시도해주세요.",
        retryAfter: 60
      });
      return;
    }

    const oldRedisKey = getRedisKey(type, email);
    await deleteVerificationCode(oldRedisKey);

    if (type === 'password_reset') {
      await resetPasswordRequest(req, res);
    } else if (type === 'email_verification') {
      res.status(400).json({ 
        message: "회원가입 인증은 처음부터 다시 시작해주세요.",
        suggestion: "/auth/register-request 엔드포인트를 다시 호출해주세요."
      });
      return;
    }

  } catch (error) {
    console.error("인증 코드 재전송 에러:", error);
    res.status(500).json({ message: "인증 코드 재전송 실패" });
  }
};