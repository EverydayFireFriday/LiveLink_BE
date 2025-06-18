// routes/auth/index.ts
import express from "express";
import authRoutes from "./authRoutes";
import registrationRoutes from "./registrationRoutes";
import passwordRoutes from "./passwordRoutes";
import profileRoutes from "./profileRoutes";
import verificationRoutes from "./verificationRoutes";
import adminRouter from "./adminRoutes";

const router = express.Router();

//auth 관련 라우터
router.use("/", authRoutes);
router.use("/", registrationRoutes);
router.use("/", passwordRoutes);
router.use("/", profileRoutes);
router.use("/", verificationRoutes);
//admin용 라우터 설정
router.use("/admin", adminRouter);

export default router;
