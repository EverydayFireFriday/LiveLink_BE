import express from "express";
import {
  register,
  login,
  logout,
  checkSession,
  getProfile,
  updateProfile,
  getAllUsers,
} from "../controllers/authController";

const router = express.Router();

// 인증 관련
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// 세션 관련
router.get("/session", checkSession);

// 프로필 관련
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// 관리자 기능
router.get("/users", getAllUsers);

export default router;