import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import * as paymentController from '../controllers/paymentController';
import * as shipmentController from '../controllers/shipmentController';

const router = Router();

router.get('/', orderController.list);
router.get('/:id', orderController.detail);
router.post('/', orderController.create);
// Sandbox pay flow: intent + gateway callback (callback lives under /payments).
router.post('/:id/pay-intent', paymentController.createPayIntent);
router.get('/:orderId/payments', paymentController.listOrderPayments);
// Shipment timeline for the order's owner.
router.get('/:orderId/shipment-events', shipmentController.listForOrder);
// Kept for tests and admin — real traffic now goes through /pay-intent.
router.put('/:id/pay', orderController.pay);
// Shipping is an admin action — the endpoint lives under /api/admin/orders/:id/ship.
router.put('/:id/confirm', orderController.confirm);
router.put('/:id/cancel', orderController.cancel);

export default router;
