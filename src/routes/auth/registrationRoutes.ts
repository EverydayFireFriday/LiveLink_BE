import express from "express";
import { RegistrationController } from "../../controllers/auth/registrationController";
import { requireNoAuth } from "../../middlewares/auth/authMiddleware";

const router = express.Router();
const registrationController = new RegistrationController();

// 회원가입 관련
router.post(
  "/register-request",
  requireNoAuth,
  registrationController.registerRequest
);
router.post(
  "/verify-register",
  requireNoAuth,
  registrationController.verifyRegister
);

// 사용자명 관련
router.get("/generate-username", registrationController.generateUsername);
router.post("/check-username", registrationController.checkUsername);

export default router;
