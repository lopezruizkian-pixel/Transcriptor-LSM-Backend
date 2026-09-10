import { Router } from 'express';
import { setClassContext } from '../controllers/class.controller.js';

const router = Router();

router.post('/context', setClassContext);

export default router;
