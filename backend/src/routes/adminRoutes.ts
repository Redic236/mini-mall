import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import * as couponController from '../controllers/couponController';

const router = Router();

// requireAuth + requireAdmin are applied at the mount point (routes/index.ts).
router.get('/stats', adminController.stats);

router.get('/orders', adminController.listOrders);
router.put('/orders/:id/ship', adminController.shipOrder);

router.get('/products', adminController.listProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

router.get('/coupons', couponController.adminList);
router.post('/coupons', couponController.adminCreate);
router.put('/coupons/:id', couponController.adminUpdate);
router.delete('/coupons/:id', couponController.adminDelete);

export default router;
