import { Router } from 'express';
import { transcribe, processText } from '../controllers/transcription.controller.js';

const router = Router();

router.post('/transcribe', transcribe);
router.post('/process', processText);

export default router;
