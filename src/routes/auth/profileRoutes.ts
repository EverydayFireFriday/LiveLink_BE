import express from "express";
import { ProfileController } from "../../controllers/auth/profileController";
import { requireAuth, requireAdmin } from "../../middlewares/auth/authMiddleware";

const router = express.Router();
const profileController = new ProfileController();

// 프로필 관련
router.get('/profile', requireAuth, profileController.getProfile);
router.put('/profile', requireAuth, profileController.updateProfile);
router.put('/username', requireAuth, profileController.updateUsername);

// 관리자 전용
router.get('/users', requireAdmin, profileController.getAllUsers);

export default router;
