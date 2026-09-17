import { Router } from 'express';
import { setClassContext, endClass } from '../controllers/class.controller.js';

const router = Router();

router.post('/context', setClassContext);
router.post('/end', endClass);

export default router;
