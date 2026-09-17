import { PrismaClient } from '@prisma/client';
import { generateSummary } from '../services/openai.service.js';
import { Request, Response } from 'express';
import { classStore } from '../mocks/class.store.js';

const prisma = new PrismaClient();

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

export const endClass = async (req: Request, res: Response): Promise<any> => {
    try {
        const { classId } = req.body;

        if (!classId) {
            return res.status(400).json({ error: 'Falta classId' });
        }

        const sessionData = classStore[classId];
        if (!sessionData) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // Generar resumen
        console.log(`Generando resumen para la clase ${classId}...`);
        const summary = await generateSummary(sessionData.fullTranscription, sessionData.topicContext);

        // Guardar en Prisma
        const classSession = await prisma.classSession.create({
            data: {
                classId: classId,
                topicContext: sessionData.topicContext,
                fullTranscription: sessionData.fullTranscription,
                fullLsm: sessionData.fullLsm,
                summary: summary
            }
        });

        // Limpiar store
        delete classStore[classId];

        return res.status(200).json({
            message: 'Clase finalizada y guardada',
            document: classSession
        });
    } catch (error: any) {
        console.error('Error al finalizar clase:', error);
        return res.status(500).json({ error: error.message });
    }
};
