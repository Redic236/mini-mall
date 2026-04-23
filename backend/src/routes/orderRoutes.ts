import { Router } from 'express';
import * as orderController from '../controllers/orderController';

const router = Router();

router.get('/', orderController.list);
router.get('/:id', orderController.detail);
router.post('/', orderController.create);
router.put('/:id/pay', orderController.pay);
router.put('/:id/ship', orderController.ship);
router.put('/:id/confirm', orderController.confirm);
router.put('/:id/cancel', orderController.cancel);

export default router;
