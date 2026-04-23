import { Router } from 'express';
import * as adminController from '../controllers/adminController';

const router = Router();

// requireAuth + requireAdmin are applied at the mount point (routes/index.ts).
router.get('/stats', adminController.stats);

router.get('/orders', adminController.listOrders);
router.put('/orders/:id/ship', adminController.shipOrder);

router.get('/products', adminController.listProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

export default router;
