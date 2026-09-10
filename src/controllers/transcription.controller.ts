import { Request, Response } from 'express';
import { transcribeAudio } from '../services/whisper.service.js';
import { processLSM } from '../services/openai.service.js';
import { classStore } from '../mocks/class.store.js';

export const transcribe = async (req: Request, res: Response): Promise<any> => {
    try {
        const { audioBase64, language, ext, classId } = req.body;

        let topicContext = '';
        if (classId && classStore[classId]) {
            topicContext = classStore[classId].topicContext || '';
        }

        const data = await transcribeAudio(audioBase64, language, ext, topicContext);
        
        // Acumular la transcripción completa
        if (classId && data.text) {
            if (!classStore[classId]) {
                classStore[classId] = { topicContext: '', fullTranscription: '', fullLsm: '' };
            }
            classStore[classId].fullTranscription += (classStore[classId].fullTranscription ? ' ' : '') + data.text;
            data.fullTranscription = classStore[classId].fullTranscription;
        }

        return res.status(200).json(data);
    } catch (error: any) {
        console.error('Transcribe error:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const processText = async (req: Request, res: Response): Promise<any> => {
    try {
        const { text, lang, context, classId } = req.body;

        const data = await processLSM(text, lang, context);

        // Acumular el texto LSM completo
        if (classId && data.lsm) {
            if (!classStore[classId]) {
                classStore[classId] = { topicContext: '', fullTranscription: '', fullLsm: '' };
            }
            classStore[classId].fullLsm += (classStore[classId].fullLsm ? ' ' : '') + data.lsm;
            data.fullLsm = classStore[classId].fullLsm;
        }

        return res.status(200).json(data);
    } catch (error: any) {
        console.error('Process error:', error);
        return res.status(500).json({ error: error.message });
    }
};
