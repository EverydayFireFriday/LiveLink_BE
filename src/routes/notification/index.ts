import express from 'express';
import notificationRoutes from './notificationRoutes.js';

const router = express.Router();

router.use('/notifications', notificationRoutes);

export default router;
