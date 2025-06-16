import express from "express";
import authRoutes from "./authRoutes";
import registrationRoutes from "./registrationRoutes";
import passwordRoutes from "./passwordRoutes";
import profileRoutes from "./profileRoutes";
import verificationRoutes from "./verificationRoutes";
import adminRouter from "./adminRoutes";


const router = express.Router();

// 모든 auth 관련 라우트를 하나로 합치기
router.use("/", authRoutes);
router.use("/", registrationRoutes);
router.use("/", passwordRoutes);
router.use("/", profileRoutes);
router.use("/", verificationRoutes);
//관리자용 라우터
router.use("/auth", adminRouter);


export default router;
