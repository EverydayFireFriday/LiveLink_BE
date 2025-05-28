import express from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../models/user";

// UserModel을 지연 초기화하는 함수
const getUserModel = () => {
  return new UserModel();
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: 사용자 회원가입
 *     description: 새로운 사용자를 MongoDB에 등록합니다.
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
  const { username, password, profileImage } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: "username과 password를 입력해주세요." });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: "비밀번호는 최소 6자 이상이어야 합니다." });
    return;
  }

  try {
    // 사용자명 중복 확인
    const userModel = getUserModel();
    const existingUser = await userModel.findByUsername(username);
    if (existingUser) {
      res.status(400).json({ message: "이미 존재하는 사용자입니다." });
      return;
    }

    // 비밀번호 해시화
    const passwordHash = await bcrypt.hash(password, 12);

    // 새 사용자 생성
    const newUser = await userModel.createUser({
      username,
      passwordHash,
      profileImage: profileImage || undefined,
    });

    console.log(`새 사용자 가입: ${username} (MongoDB 저장 완료)`);
    res.status(201).json({
      message: "회원가입 성공",
      user: {
        id: newUser._id,
        username: newUser.username,
        profileImage: newUser.profileImage,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("회원가입 에러:", error);
    if (error.message === "Username already exists") {
      res.status(400).json({ message: "이미 존재하는 사용자입니다." });
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
 *     description: 사용자 인증 후 Redis에 세션을 저장합니다.
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
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: "username과 password를 입력해주세요." });
    return;
  }

  try {
    // 사용자 찾기
    const userModel = getUserModel();
    const user = await userModel.findByUsername(username);
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
      username: user.username,
      userId: user._id!.toString(),
      profileImage: user.profileImage,
      loginTime: new Date().toISOString(),
    };

    console.log(
      `로그인 성공: ${username} (세션 ID: ${req.sessionID}, Redis 저장 완료)`
    );
    res.status(200).json({
      message: "로그인 성공",
      user: {
        id: user._id,
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
    const user = await userModel.findByUsername(req.session.user.username);

    if (!user) {
      res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return;
    }

    res.status(200).json({
      message: "프로필 조회 성공",
      user: {
        id: user._id,
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
 *     description: 사용자 프로필 정보를 업데이트합니다.
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
