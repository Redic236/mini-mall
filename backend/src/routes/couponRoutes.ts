import { Router } from 'express';
import * as couponController from '../controllers/couponController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public: list currently-valid coupons for the shop front.
router.get('/', couponController.listPublic);

// Auth-required: preview (must be logged in so we can enforce perUserLimit).
router.post('/preview', requireAuth, couponController.preview);

export default router;
