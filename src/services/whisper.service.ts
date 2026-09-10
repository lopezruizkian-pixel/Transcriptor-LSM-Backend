// Frases de alucinación conocidas de Whisper (entrenado con subtítulos de YouTube/Amara y fragmentos de prompt)
const WHISPER_HALLUCINATIONS = [
    'suscríbete', 'suscribete', 'subscribe', 'amara.org', 'amara',
    'gracias por ver', 'thanks for watching', 'like y suscríbete',
    'comparte el video', 'share the video', 'subtítulos por', 'subtitulos por',
    'subtitles by', 'traducido por', 'translated by', 'no olvides suscribirte',
    "don't forget to subscribe", 'da like', 'darle like', 'próximo video',
    'siguiente video', 'hasta la próxima', 'nos vemos en el próximo',
    'puedes activar', 'la campanita',
    'maestro explica', 'tema académico', 'tema academico', 'tema específico', 'tema especifico',
    'clase escolar'
];

const isHallucination = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    return WHISPER_HALLUCINATIONS.some(phrase => lower.includes(phrase));
};

export const transcribeAudio = async (audioBase64: string, language?: string, ext?: string, topicContext?: string): Promise<any> => {
    if (!audioBase64) throw new Error('No audio provided');

    const fileExt = ext || 'webm';
    const buffer = Buffer.from(audioBase64, 'base64');
    const blob = new Blob([buffer], { type: `audio/${fileExt}` });

    const formData = new FormData();
    formData.append('file', blob, `grabacion.${fileExt}`);

    const useGroq = Boolean(process.env.GROQ_API_KEY);
    const apiUrl = useGroq
        ? 'https://api.groq.com/openai/v1/audio/transcriptions'
        : 'https://api.openai.com/v1/audio/transcriptions';
    const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
    const model = useGroq ? 'whisper-large-v3-turbo' : 'whisper-1';

    formData.append('model', model);
    formData.append('language', language || 'es');
    
    // Prompt de vocabulario: orienta a Whisper sin introducir frases descriptivas que alucine en silencio
    let promptText = 'Transcripción de clase escolar en español y vocabulario académico.';
    if (topicContext) {
        promptText = `Vocabulario de la clase: ${topicContext}. Transcripción en español.`;
    }
    formData.append('prompt', promptText);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Error HTTP ${response.status} en la API de transcripción`);
    }

    const data = await response.json();

    // Filtrar alucinaciones antes de retornar
    if (data.text && isHallucination(data.text)) {
        console.warn(`⚠️  Alucinación de Whisper filtrada: "${data.text}"`);
        return { ...data, text: '' };
    }

    return data;
};
