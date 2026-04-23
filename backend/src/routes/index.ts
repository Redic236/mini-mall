import { Router } from 'express';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import cartRoutes from './cartRoutes';
import orderRoutes from './orderRoutes';
import addressRoutes from './addressRoutes';
import reviewRoutes from './reviewRoutes';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, message: null });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
// Reviews: GET is public, writes are auth-gated inside the router.
router.use('/reviews', reviewRoutes);

// Everything below requires authentication.
router.use('/cart', requireAuth, cartRoutes);
router.use('/orders', requireAuth, orderRoutes);
router.use('/addresses', requireAuth, addressRoutes);

export default router;
