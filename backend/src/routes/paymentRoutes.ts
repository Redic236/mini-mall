import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Gateway callback must not require a user token — the signed payload is
// the auth. Mounted before the auth-required routes for clarity.
router.post('/callback', paymentController.gatewayCallback);

router.get('/:id', requireAuth, paymentController.getPayment);

export default router;
