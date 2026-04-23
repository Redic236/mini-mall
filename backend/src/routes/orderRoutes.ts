import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import * as paymentController from '../controllers/paymentController';

const router = Router();

router.get('/', orderController.list);
router.get('/:id', orderController.detail);
router.post('/', orderController.create);
// Sandbox pay flow: intent + gateway callback (callback lives under /payments).
router.post('/:id/pay-intent', paymentController.createPayIntent);
router.get('/:orderId/payments', paymentController.listOrderPayments);
// Kept for tests and admin — real traffic now goes through /pay-intent.
router.put('/:id/pay', orderController.pay);
router.put('/:id/ship', orderController.ship);
router.put('/:id/confirm', orderController.confirm);
router.put('/:id/cancel', orderController.cancel);

export default router;
