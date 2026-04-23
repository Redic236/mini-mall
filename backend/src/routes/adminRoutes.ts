import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import * as couponController from '../controllers/couponController';
import * as shipmentController from '../controllers/shipmentController';

const router = Router();

// requireAuth + requireAdmin are applied at the mount point (routes/index.ts).
router.get('/stats', adminController.stats);

router.get('/orders', adminController.listOrders);
router.put('/orders/:id/ship', adminController.shipOrder);
router.get('/orders/:id/shipment-events', shipmentController.adminListForOrder);
router.post('/orders/:id/shipment-events', shipmentController.adminAddEvent);

router.get('/products', adminController.listProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

router.get('/coupons', couponController.adminList);
router.post('/coupons', couponController.adminCreate);
router.put('/coupons/:id', couponController.adminUpdate);
router.delete('/coupons/:id', couponController.adminDelete);

export default router;
