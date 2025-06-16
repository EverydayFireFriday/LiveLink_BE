import express from "express";
import { VerificationController } from "../../controllers/auth/verificationController";

const router = express.Router();
const verificationController = new VerificationController();

// 인증 관련
router.post(
  "/verification/status",
  verificationController.getVerificationStatus
);
router.post("/verification/cancel", verificationController.cancelVerification);

export default router;
