import { Router } from 'express';
import * as addressController from '../controllers/addressController';

const router = Router();

router.get('/', addressController.list);
router.post('/', addressController.create);
router.put('/:id', addressController.update);
router.delete('/:id', addressController.remove);
router.patch('/:id/default', addressController.setDefault);

export default router;
