// Frases de alucinación de subtítulos de YouTube/Amara
const WHISPER_HALLUCINATIONS = [
    'suscríbete', 'suscribete', 'subscribe', 'amara.org', 'amara',
    'gracias por ver', 'thanks for watching', 'like y suscríbete',
    'comparte el video', 'share the video', 'subtítulos por', 'subtitulos por',
    'subtitles by', 'traducido por', 'translated by', 'no olvides suscribirte',
    "don't forget to subscribe", 'da like', 'darle like', 'próximo video',
    'siguiente video', 'hasta la próxima', 'nos vemos en el próximo',
    'puedes activar', 'la campanita'
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
    formData.append('temperature', '0');
    formData.append('response_format', 'verbose_json');
    
    if (topicContext) {
        formData.append('prompt', `Vocabulario clave: ${topicContext}`);
    }

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

    // Filtrar silencios, ruidos y alucinaciones en el backend usando las métricas de verbose_json
    if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
        const validSegments = data.segments.filter((seg: any) => {
            const isSilence = seg.no_speech_prob > 0.4;
            const isLowConfidence = seg.avg_logprob < -1.2;
            const isRepetitiveLoop = seg.compression_ratio > 2.4;

            if (isSilence || isLowConfidence || isRepetitiveLoop) {
                console.log(`🔇 Segmento descartado por ruido/silencio (no_speech_prob: ${seg.no_speech_prob?.toFixed(2)}, logprob: ${seg.avg_logprob?.toFixed(2)}, comp_ratio: ${seg.compression_ratio?.toFixed(2)}): "${seg.text}"`);
                return false;
            }
            return true;
        });

        const cleanText = validSegments.map((seg: any) => seg.text).join(' ').trim();
        
        if (cleanText && isHallucination(cleanText)) {
            console.warn(`⚠️ Alucinación de YouTube filtrada: "${cleanText}"`);
            return { ...data, text: '' };
        }

        return { ...data, text: cleanText };
    }

    const rawText = data.text?.trim() || '';
    if (rawText && isHallucination(rawText)) {
        return { ...data, text: '' };
    }

    return { ...data, text: rawText };
};
