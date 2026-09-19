// Frases de alucinación conocidas de Whisper
const WHISPER_HALLUCINATIONS: string[] = [
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

export const transcribeAudio = async (
    audioBase64: string,
    language: string,
    ext: string,
    topicContext?: string
): Promise<any> => {
    if (!audioBase64) throw new Error('No audio provided');
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY no configurada');

    const fileExt = ext || 'webm';
    const buffer = Buffer.from(audioBase64, 'base64');
    const blob = new Blob([buffer], { type: `audio/${fileExt}` });

    const fd = new FormData();
    fd.append('file', blob, `grabacion.${fileExt}`);
    fd.append('model', 'whisper-1');
    fd.append('language', language || 'es');
    if (topicContext) fd.append('prompt', `Vocabulario clave: ${topicContext}`);

    console.log('🎙️ Enviando audio a OpenAI Whisper...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: fd
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any).error?.message || `Error HTTP ${response.status} en OpenAI Whisper`);
    }

    const data = await response.json() as { text?: string };

    if (data.text && isHallucination(data.text)) {
        console.warn(`⚠️ Alucinación de Whisper filtrada: "${data.text}"`);
        return { ...data, text: '' };
    }

    console.log(`✅ Whisper OK: "${(data.text || '').slice(0, 60)}..."`);
    return data;
};
