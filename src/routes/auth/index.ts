// routes/auth/index.ts
import express from 'express';
import authRoutes from './authRoutes';
import registrationRoutes from './registrationRoutes';
import passwordRoutes from './passwordRoutes';
import profileRoutes from './profileRoutes';
import verificationRoutes from './verificationRoutes';
import adminRouter from './adminRoutes';
import googleRoutes from './googleRoutes'; // Google OAuth 라우트 추가
import appleRoutes from './appleRoutes'; // Apple OAuth 라우트 추가

const router = express.Router();

//auth 관련 라우터
router.use('/', authRoutes);
router.use('/', registrationRoutes);
router.use('/', passwordRoutes);
router.use('/', profileRoutes);
router.use('/', verificationRoutes);
router.use('/', googleRoutes); // Google OAuth 라우트 사용
router.use('/', appleRoutes); // Apple OAuth 라우트 사용

//admin용 라우터 설정
router.use('/admin', adminRouter);

export default router;
