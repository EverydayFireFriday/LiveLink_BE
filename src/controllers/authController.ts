import express from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { UserModel } from "../models/user";

// UserModel을 지연 초기화하는 함수
const getUserModel = () => {
  return new UserModel();
};

// 이메일 전송을 위한 nodemailer 설정
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // 또는 다른 이메일 서비스
    auth: {
      user: process.env.EMAIL_USER, // 환경변수에서 가져오기
      pass: process.env.EMAIL_PASS, // 앱 비밀번호
    },
  });
};

// 인증 코드 저장소 (실제로는 Redis나 DB에 저장하는 것이 좋습니다)
interface VerificationCode {
  code: string;
  email: string;
  type: 'password_reset' | 'username_recovery';
  expiresAt: Date;
  isUsed: boolean;
}

// 메모리 저장소 (실제로는 Redis 사용 권장)
const verificationCodes = new Map<string, VerificationCode>();

// 만료된 코드 정리 함수
const cleanupExpiredCodes = () => {
  const now = new Date();
  for (const [key, value] of verificationCodes.entries()) {
    if (value.expiresAt < now) {
      verificationCodes.delete(key);
    }
  }
};

// 6자리 인증 코드 생성
const generateVerificationCode = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: 사용자 회원가입
 *     description: 새로운 사용자를 MongoDB에 등록합니다. 이메일이 아이디 역할을 합니다.
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

  if (!email || !username || !password) {
    res.status(400).json({ message: "이메일(아이디), 별명, 비밀번호를 모두 입력해주세요." });
    return;
  }

  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "올바른 이메일 형식을 입력해주세요." });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: "비밀번호는 최소 6자 이상이어야 합니다." });
    return;
  }

  if (username.length < 2) {
    res.status(400).json({ message: "별명은 최소 2자 이상이어야 합니다." });
    return;
  }

  try {
    const userModel = getUserModel();
    
    // 이메일과 별명 중복 확인
    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
      res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
      return;
    }

    const existingUsername = await userModel.findByUsername(username);
    if (existingUsername) {
      res.status(400).json({ message: "이미 사용 중인 별명입니다." });
      return;
    }

    // 비밀번호 해시화
    const passwordHash = await bcrypt.hash(password, 12);

    // 새 사용자 생성
    const newUser = await userModel.createUser({
      email,
      username,
      passwordHash,
      profileImage: profileImage || undefined,
    });

    console.log(`새 사용자 가입: ${username} (${email}) - MongoDB 저장 완료`);
    res.status(201).json({
      message: "회원가입 성공",
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        profileImage: newUser.profileImage,
        createdAt: newUser.createdAt,
      },
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
 *     description: 이메일(아이디)과 비밀번호로 로그인합니다.
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

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
      return;
    }

    // 마지막 로그인 시간 업데이트
    await userModel.updateUser(user._id!, { updatedAt: new Date() });

    // 세션에 사용자 정보 저장
    req.session.user = {
      email: user.email,
      userId: user._id!.toString(),
      username: user.username,
      profileImage: user.profileImage,
      loginTime: new Date().toISOString(),
    };

    console.log(
      `로그인 성공: ${user.username} (${user.email}) - 세션 ID: ${req.sessionID}, Redis 저장 완료`
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
      `로그아웃 완료: ${username} (세션 ID: ${sessionId}, Redis에서 삭제 완료)`
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
 * /auth/profile:
 *   get:
 *     summary: 사용자 프로필 조회
 *     description: 로그인된 사용자의 MongoDB 프로필 정보를 조회합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 사용자 없음
 *       500:
 *         description: 서버 에러
 */
export const getProfile = async (
  req: express.Request,
  res: express.Response
) => {
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
 *     description: 사용자 프로필 이미지를 업데이트합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 description: 새 프로필 이미지 URL
 *     responses:
 *       200:
 *         description: 프로필 업데이트 성공
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 사용자 없음
 *       500:
 *         description: 서버 에러
 */
export const updateProfile = async (
  req: express.Request,
  res: express.Response
) => {
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
 * /auth/update-username:
 *   put:
 *     summary: 별명 변경
 *     description: 사용자 별명(username)을 변경합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newUsername:
 *                 type: string
 *                 description: 새로운 별명
 *     responses:
 *       200:
 *         description: 별명 변경 성공
 *       400:
 *         description: 잘못된 요청 또는 중복된 별명
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 사용자 없음
 *       500:
 *         description: 서버 에러
 */
export const updateUsername = async (
  req: express.Request,
  res: express.Response
) => {
  if (!req.session.user) {
    res.status(401).json({ message: "로그인이 필요합니다." });
    return;
  }

  const { newUsername } = req.body;

  if (!newUsername) {
    res.status(400).json({ message: "새로운 별명을 입력해주세요." });
    return;
  }

  if (newUsername.length < 2) {
    res.status(400).json({ message: "별명은 최소 2자 이상이어야 합니다." });
    return;
  }

  if (newUsername.length > 20) {
    res.status(400).json({ message: "별명은 최대 20자까지 가능합니다." });
    return;
  }

  try {
    const userId = req.session.user.userId;
    const userModel = getUserModel();

    // 현재 사용자 조회
    const currentUser = await userModel.findById(userId);
    if (!currentUser) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    // 현재 별명과 동일한지 확인
    if (currentUser.username === newUsername) {
      res.status(400).json({ message: "현재 별명과 동일합니다." });
      return;
    }

    // 새 별명이 이미 사용 중인지 확인
    const existingUser = await userModel.findByUsername(newUsername);
    if (existingUser) {
      res.status(400).json({ message: "이미 사용 중인 별명입니다." });
      return;
    }

    // 별명 업데이트
    const updatedUser = await userModel.updateUser(userId, {
      username: newUsername,
    });

    if (!updatedUser) {
      res.status(404).json({ message: "사용자 업데이트에 실패했습니다." });
      return;
    }

    // 세션 정보도 업데이트
    req.session.user.username = newUsername;

    console.log(`별명 변경 완료: ${currentUser.username} → ${newUsername} (${updatedUser.email})`);

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
 *     summary: 별명 중복 확인
 *     description: 새로운 별명이 사용 가능한지 확인합니다.
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
 *                 description: 확인할 별명
 *     responses:
 *       200:
 *         description: 사용 가능한 별명
 *       400:
 *         description: 사용 불가능한 별명
 *       500:
 *         description: 서버 에러
 */
export const checkUsername = async (
  req: express.Request,
  res: express.Response
) => {
  const { username } = req.body;

  if (!username) {
    res.status(400).json({ message: "별명을 입력해주세요." });
    return;
  }

  if (username.length < 2) {
    res.status(400).json({ 
      message: "별명은 최소 2자 이상이어야 합니다.",
      available: false
    });
    return;
  }

  if (username.length > 20) {
    res.status(400).json({ 
      message: "별명은 최대 20자까지 가능합니다.",
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
 * /auth/users:
 *   get:
 *     summary: 전체 사용자 목록 조회 (관리자용)
 *     description: 모든 사용자 정보를 MongoDB에서 조회합니다.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 조회할 사용자 수
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 건너뛸 사용자 수
 *     responses:
 *       200:
 *         description: 사용자 목록 조회 성공
 *       500:
 *         description: 서버 에러
 */
export const getAllUsers = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;
    const userModel = getUserModel();

    const users = await userModel.findAllUsers(limit, skip);
    const totalUsers = await userModel.countUsers();

    // passwordHash 제거
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
    });
  } catch (error) {
    console.error("사용자 목록 조회 에러:", error);
    res.status(500).json({ message: "사용자 목록 조회 실패" });
  }
};

// ===========================================
// 🆕 이메일 인증 관련 함수들
// ===========================================

/**
 * @swagger
 * /auth/find-username:
 *   post:
 *     summary: 아이디 찾기 (이메일 인증)
 *     description: 이메일로 인증 코드를 전송하여 별명을 찾습니다.
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
 *     responses:
 *       200:
 *         description: 인증 코드 전송 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 이메일을 찾을 수 없음
 *       500:
 *         description: 서버 에러
 */
export const findUsername = async (req: express.Request, res: express.Response) => {
  const { email } = req.body;

  if (!email) {
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
    const userModel = getUserModel();
    // 이메일로 사용자 찾기
    const user = await userModel.findByEmail(email);
    
    if (!user) {
      res.status(404).json({ message: "해당 이메일로 등록된 사용자를 찾을 수 없습니다." });
      return;
    }

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    const codeKey = `username_${email}_${Date.now()}`;
    
    // 인증 코드 저장 (15분 만료)
    verificationCodes.set(codeKey, {
      code: verificationCode,
      email,
      type: 'username_recovery',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15분
      isUsed: false,
    });

    // 이메일 전송
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '[LiveLink] 아이디 찾기 인증 코드',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">아이디 찾기 인증 코드</h2>
          <p>안녕하세요!</p>
          <p>아이디 찾기를 위한 인증 코드를 발송해드립니다.</p>
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="color: #007bff; font-size: 24px; margin: 0;">인증 코드: ${verificationCode}</h3>
          </div>
          <p><strong>주의사항:</strong></p>
          <ul>
            <li>이 코드는 15분 후에 만료됩니다.</li>
            <li>인증 코드를 다른 사람과 공유하지 마세요.</li>
            <li>본인이 요청하지 않았다면 이 이메일을 무시해주세요.</li>
          </ul>
          <p>감사합니다.<br>LiveLink 팀</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // 만료된 코드 정리
    cleanupExpiredCodes();

    res.status(200).json({
      message: "인증 코드가 이메일로 전송되었습니다.",
      codeKey,
      expiresIn: "15분",
    });

  } catch (error) {
    console.error("아이디 찾기 이메일 전송 에러:", error);
    res.status(500).json({ message: "이메일 전송 실패" });
  }
};

/**
 * @swagger
 * /auth/verify-username:
 *   post:
 *     summary: 아이디 찾기 인증 코드 확인
 *     description: 인증 코드를 확인하고 별명을 반환합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codeKey:
 *                 type: string
 *               verificationCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: 인증 성공 및 별명 반환
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 코드 불일치
 *       410:
 *         description: 인증 코드 만료
 *       500:
 *         description: 서버 에러
 */
export const verifyUsernameCode = async (req: express.Request, res: express.Response) => {
  const { codeKey, verificationCode } = req.body;

  if (!codeKey || !verificationCode) {
    res.status(400).json({ message: "인증 키와 인증 코드를 입력해주세요." });
    return;
  }

  try {
    const storedCode = verificationCodes.get(codeKey);
    
    if (!storedCode) {
      res.status(410).json({ message: "인증 코드가 만료되었거나 존재하지 않습니다." });
      return;
    }

    if (storedCode.isUsed) {
      res.status(410).json({ message: "이미 사용된 인증 코드입니다." });
      return;
    }

    if (storedCode.expiresAt < new Date()) {
      verificationCodes.delete(codeKey);
      res.status(410).json({ message: "인증 코드가 만료되었습니다." });
      return;
    }

    if (storedCode.code !== verificationCode) {
      res.status(401).json({ message: "인증 코드가 일치하지 않습니다." });
      return;
    }

    // 사용자 정보 조회
    const userModel = getUserModel();
    const user = await userModel.findByEmail(storedCode.email);
    
    if (!user) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    // 인증 코드 사용 표시
    storedCode.isUsed = true;
    verificationCodes.set(codeKey, storedCode);

    res.status(200).json({
      message: "인증 성공",
      username: user.username,
      maskedEmail: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // 이메일 마스킹
    });

  } catch (error) {
    console.error("아이디 찾기 인증 확인 에러:", error);
    res.status(500).json({ message: "인증 확인 실패" });
  }
};

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: 비밀번호 재설정 요청 (이메일 인증)
 *     description: 이메일로 비밀번호 재설정 인증 코드를 전송합니다.
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
    const userModel = getUserModel();
    // 이메일로 사용자 찾기
    const user = await userModel.findByEmail(email);
    
    if (!user) {
      res.status(404).json({ message: "해당 이메일로 등록된 사용자를 찾을 수 없습니다." });
      return;
    }

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    const codeKey = `password_${email}_${Date.now()}`;
    
    // 인증 코드 저장 (15분 만료)
    verificationCodes.set(codeKey, {
      code: verificationCode,
      email,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15분
      isUsed: false,
    });

    // 이메일 전송
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '[LiveLink] 비밀번호 재설정 인증 코드',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">비밀번호 재설정 인증 코드</h2>
          <p>안녕하세요, <strong>${user.username}</strong>님!</p>
          <p>비밀번호 재설정을 위한 인증 코드를 발송해드립니다.</p>
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="color: #dc3545; font-size: 24px; margin: 0;">인증 코드: ${verificationCode}</h3>
          </div>
          <p><strong>주의사항:</strong></p>
          <ul>
            <li>이 코드는 15분 후에 만료됩니다.</li>
            <li>인증 코드를 다른 사람과 공유하지 마세요.</li>
            <li>본인이 요청하지 않았다면 즉시 비밀번호를 변경해주세요.</li>
          </ul>
          <p>감사합니다.<br>LiveLink 팀</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // 만료된 코드 정리
    cleanupExpiredCodes();

    res.status(200).json({
      message: "비밀번호 재설정 인증 코드가 이메일로 전송되었습니다.",
      codeKey,
      expiresIn: "15분",
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
 *     description: 인증 코드를 확인하고 새 비밀번호로 변경합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codeKey:
 *                 type: string
 *               verificationCode:
 *                 type: string
 *               newPassword:
 *                 type: string
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
  const { codeKey, verificationCode, newPassword } = req.body;

  if (!codeKey || !verificationCode || !newPassword) {
    res.status(400).json({ message: "모든 필드를 입력해주세요." });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ message: "새 비밀번호는 최소 6자 이상이어야 합니다." });
    return;
  }

  try {
    const storedCode = verificationCodes.get(codeKey);
    
    if (!storedCode) {
      res.status(410).json({ message: "인증 코드가 만료되었거나 존재하지 않습니다." });
      return;
    }

    if (storedCode.isUsed) {
      res.status(410).json({ message: "이미 사용된 인증 코드입니다." });
      return;
    }

    if (storedCode.expiresAt < new Date()) {
      verificationCodes.delete(codeKey);
      res.status(410).json({ message: "인증 코드가 만료되었습니다." });
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
    const user = await userModel.findByEmail(storedCode.email);
    
    if (!user) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    // 새 비밀번호 해시화
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // 비밀번호 업데이트
    await userModel.updateUser(user._id!.toString(), {
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    });

    // 인증 코드 사용 표시 및 삭제
    verificationCodes.delete(codeKey);

    console.log(`비밀번호 재설정 완료: ${user.username} (${storedCode.email})`);

    res.status(200).json({
      message: "비밀번호가 성공적으로 재설정되었습니다.",
      username: user.username,
      email: user.email,
    });

  } catch (error) {
    console.error("비밀번호 재설정 에러:", error);
    res.status(500).json({ message: "비밀번호 재설정 실패" });
  }
};

/**
 * @swagger
 * /auth/resend-code:
 *   post:
 *     summary: 인증 코드 재전송
 *     description: 만료된 인증 코드를 새로 생성하여 재전송합니다.
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
 *               type:
 *                 type: string
 *                 enum: [username_recovery, password_reset]
 *     responses:
 *       200:
 *         description: 인증 코드 재전송 성공
 *       400:
 *         description: 잘못된 요청
 *       429:
 *         description: 너무 많은 요청
 *       500:
 *         description: 서버 에러
 */
export const resendVerificationCode = async (req: express.Request, res: express.Response) => {
  const { email, type } = req.body;

  if (!email || !type) {
    res.status(400).json({ message: "이메일과 인증 유형을 입력해주세요." });
    return;
  }

  try {
    // 기존 코드들 정리
    cleanupExpiredCodes();

    // 같은 이메일로 최근 1분 내에 요청한 코드가 있는지 확인 (스팸 방지)
    const recentCodes = Array.from(verificationCodes.values()).filter(
      code => code.email === email && 
      code.type === type && 
      (Date.now() - (code.expiresAt.getTime() - 15 * 60 * 1000)) < 60 * 1000
    );

    if (recentCodes.length > 0) {
      res.status(429).json({ 
        message: "너무 빈번한 요청입니다. 1분 후에 다시 시도해주세요.",
        retryAfter: 60
      });
      return;
    }

    // 새로운 인증 요청 처리
    if (type === 'username_recovery') {
      await findUsername(req, res);
    } else if (type === 'password_reset') {
      await resetPasswordRequest(req, res);
    } else {
      res.status(400).json({ message: "올바르지 않은 인증 유형입니다." });
    }

  } catch (error) {
    console.error("인증 코드 재전송 에러:", error);
    res.status(500).json({ message: "인증 코드 재전송 실패" });
  }
};
