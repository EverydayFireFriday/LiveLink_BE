import express from "express";
import { AdminController } from "../../controllers/auth/adminController";
import {
  requireAdmin,
  checkAdminStatus,
} from "../../middlewares/auth/adminMiddleware";

const router = express.Router();
const adminController = new AdminController();

// 관리자 권한 확인
router.get("/admin/check", checkAdminStatus);

// 사용자 관리
router.get("/admin/users", requireAdmin, adminController.getAllUsers);
router.get("/admin/users/:userId", requireAdmin, adminController.getUserById);
router.patch(
  "/admin/users/:userId/status",
  requireAdmin,
  adminController.updateUserStatus
);

// 통계 및 대시보드
router.get("/admin/stats", requireAdmin, adminController.getAdminStats);

export default router;
