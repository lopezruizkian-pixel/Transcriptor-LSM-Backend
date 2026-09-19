import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateDefinition } from '../services/openai.service.js';

const prisma = new PrismaClient();

const STOP_WORDS = new Set([
    'yo', 'tú', 'tu', 'él', 'el', 'ella', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas',
    'mí', 'ti', 'sí', 'conmigo', 'contigo', 'consigo', 'me', 'te', 'se', 'nos', 'os', 'le', 'les', 'lo', 'la', 'los', 'las',
    'mi', 'mis', 'tus', 'su', 'sus', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras',
    'un', 'una', 'unos', 'unas',
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'esto', 'eso', 'aquello',
    'y', 'e', 'ni', 'o', 'u', 'ya', 'bien', 'sea', 'pero', 'mas', 'sino', 'aunque', 'porque', 'pues', 'como', 'si', 'que',
    'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'segun', 'sin', 'so', 'sobre', 'tras', 'versus', 'vía', 'via',
    'muy', 'mucho', 'poco', 'bastante', 'demasiado', 'más', 'mas', 'menos', 'algo', 'nada', 'todo', 'toda', 'todos', 'todas',
    'al', 'del', 'qué', 'que', 'quien', 'quién', 'quienes', 'quiénes', 'cual', 'cuál', 'cuales', 'cuáles', 'cuanto', 'cuánto', 'cuantos', 'cuántos', 'cuanta', 'cuánta', 'cuantas', 'cuántas', 'cuando', 'cuándo', 'donde', 'dónde', 'como', 'cómo',
    'ser', 'estar', 'haber', 'tener', 'hacer', 'ir', 'poder', 'saber', 'poner', 'querer', 'decir', 'ver', 'dar', 'venir'
]);

export const getDefinition = async (req: Request, res: Response): Promise<void> => {
    try {
        const { word } = req.params;
        if (!word) {
            res.status(400).json({ error: 'Word parameter is required' });
            return;
        }

        let cleanWord = (word as string).toLowerCase().replace(/[.,!?;:¿¡]/g, '').trim();

        // Eliminar acentos para la comparación de conectores
        const unaccentedWord = cleanWord.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (!cleanWord) {
            res.status(400).json({ error: 'Invalid word' });
            return;
        }

        // Filtro de conectores y palabras comunes
        if (STOP_WORDS.has(cleanWord) || STOP_WORDS.has(unaccentedWord)) {
            res.status(200).json({
                word: cleanWord,
                definition: '',
                ignored: true,
                message: 'Palabra ignorada por ser conector o palabra muy común.'
            });
            return;
        }

        // Check if it exists in cache
        const cachedEntry = await prisma.dictionary.findUnique({
            where: { word: cleanWord }
        });

        if (cachedEntry) {
            // Increment searchCount
            const updatedEntry = await prisma.dictionary.update({
                where: { id: cachedEntry.id },
                data: { searchCount: { increment: 1 } }
            });

            res.status(200).json({
                word: updatedEntry.word,
                definition: updatedEntry.definition,
                searchCount: updatedEntry.searchCount,
                cached: true
            });
            return;
        }

        let definition = '';
        let source = 'openai'; // Por defecto, asumimos que usará OpenAI

        try {
            // 1. Intentar primero con la API externa gratuita para ahorrar costos de OpenAI
            const freeApiRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/es/${cleanWord}`);
            if (freeApiRes.ok) {
                const data = await freeApiRes.json();
                const rawDef = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
                
                if (rawDef) {
                    // Limpiamos y recortamos para mantener el estándar LSM de palabras cortas
                    const firstSentence = rawDef.split('.')[0];
                    const words = firstSentence.split(' ');
                    definition = words.slice(0, 12).join(' ').trim();
                    if (words.length > 12) definition += '...';
                    source = 'free_api';
                }
            }
        } catch (e) {
            console.warn('Fallo en la API gratuita, procediendo al fallback con OpenAI');
        }

        // 2. Fallback a OpenAI si la API gratuita no encontró la palabra o falló
        if (!definition) {
            definition = await generateDefinition(cleanWord);
            source = 'openai';
        }

        // Save to cache with searchCount = 1 (default in prisma)
        const newEntry = await prisma.dictionary.create({
            data: {
                word: cleanWord,
                definition
            }
        });

        res.status(200).json({
            word: newEntry.word,
            definition: newEntry.definition,
            searchCount: newEntry.searchCount,
            cached: false,
            source: source
        });
    } catch (error: any) {
        console.error('Error fetching definition:', error);
        res.status(500).json({ error: 'Internal server error while fetching definition' });
    }
};
