import { Router } from 'express';
import * as productController from '../controllers/productController';

const router = Router();

// Keep /categories before /:id so Express doesn't match it as an id.
router.get('/', productController.list);
router.get('/categories', productController.categories);
router.get('/:id', productController.detail);
router.get('/:id/recommendations', productController.recommendations);

export default router;
