import { Router } from 'express';
import * as cartController from '../controllers/cartController';

const router = Router();

router.get('/', cartController.list);
router.post('/', cartController.add);
router.put('/:id', cartController.update);
router.delete('/:id', cartController.remove);

export default router;
