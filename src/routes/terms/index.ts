import express from 'express';
import { getTermsAndConditions } from '../../controllers/terms/termsController';

const router = express.Router();

router.get('/', getTermsAndConditions);

export default router;
