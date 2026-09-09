import { Request, Response } from 'express';
import { transcribeAudio } from '../services/whisper.service.js';
import { processLSM } from '../services/openai.service.js';

export const transcribe = async (req: Request, res: Response): Promise<any> => {
    try {
        const { audioBase64, language, ext } = req.body;

        const data = await transcribeAudio(audioBase64, language, ext);
        return res.status(200).json(data);
    } catch (error: any) {
        console.error('Transcribe error:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const processText = async (req: Request, res: Response): Promise<any> => {
    try {
        const { text, lang } = req.body;

        const data = await processLSM(text, lang);
        return res.status(200).json(data);
    } catch (error: any) {
        console.error('Process error:', error);
        return res.status(500).json({ error: error.message });
    }
};
