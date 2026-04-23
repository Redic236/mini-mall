import { Router } from 'express';
import * as reviewController from '../controllers/reviewController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public: anyone can read reviews for a product.
router.get('/', reviewController.list);

// Authed: my eligibility + CRUD on my own reviews.
router.get('/eligibility', requireAuth, reviewController.eligibility);
router.post('/', requireAuth, reviewController.create);
router.put('/:id', requireAuth, reviewController.update);
router.delete('/:id', requireAuth, reviewController.remove);

export default router;
