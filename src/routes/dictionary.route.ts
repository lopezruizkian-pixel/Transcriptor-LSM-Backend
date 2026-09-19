import { Router } from 'express';
import { getDefinition } from '../controllers/dictionary.controller.js';

const router = Router();

router.get('/:word', getDefinition);

export default router;
