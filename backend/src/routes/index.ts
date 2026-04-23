import { Router } from 'express';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import cartRoutes from './cartRoutes';
import orderRoutes from './orderRoutes';
import addressRoutes from './addressRoutes';
import reviewRoutes from './reviewRoutes';
import paymentRoutes from './paymentRoutes';
import adminRoutes from './adminRoutes';
import couponRoutes from './couponRoutes';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, message: null });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
// Reviews: GET is public, writes are auth-gated inside the router.
router.use('/reviews', reviewRoutes);
// Payments: /callback is public (HMAC-authenticated), /:id needs a user
// token. The router itself handles the split.
router.use('/payments', paymentRoutes);
// Coupons: listing public coupons is unauthed; /preview needs a user token.
router.use('/coupons', couponRoutes);

// Everything below requires authentication.
router.use('/cart', requireAuth, cartRoutes);
router.use('/orders', requireAuth, orderRoutes);
router.use('/addresses', requireAuth, addressRoutes);

// Admin-only: requireAuth + requireAdmin chained in order.
router.use('/admin', requireAuth, requireAdmin, adminRoutes);

export default router;
