import { Request, Response } from 'express';
import { classStore } from '../mocks/class.store.js';

export const setClassContext = async (req: Request, res: Response): Promise<any> => {
    try {
        const { classId, topicContext } = req.body;

        if (!classId) {
            return res.status(400).json({ error: 'Falta classId' });
        }

        if (!classStore[classId]) {
            classStore[classId] = {
                topicContext: '',
                fullTranscription: '',
                fullLsm: ''
            };
        }

        if (topicContext) {
            classStore[classId].topicContext = topicContext;
        }

        return res.status(200).json({ 
            message: 'Contexto de clase actualizado', 
            topicContext: classStore[classId].topicContext 
        });
    } catch (error: any) {
        console.error('Error al establecer contexto de clase:', error);
        return res.status(500).json({ error: error.message });
    }
};
