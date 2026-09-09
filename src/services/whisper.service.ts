export const transcribeAudio = async (audioBase64: string, language?: string, ext?: string): Promise<any> => {
    if (!audioBase64) {
        throw new Error('No audio provided');
    }

    const fileExt = ext || 'webm';
    const fileName = `grabacion.${fileExt}`;

    const buffer = Buffer.from(audioBase64, 'base64');
    const blob = new Blob([buffer], { type: `audio/${fileExt}` });

    const formData = new FormData();
    formData.append('file', blob, fileName);

    const useGroq = Boolean(process.env.GROQ_API_KEY);
    const apiUrl = useGroq
        ? 'https://api.groq.com/openai/v1/audio/transcriptions'
        : 'https://api.openai.com/v1/audio/transcriptions';
    const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
    const model = useGroq ? 'whisper-large-v3-turbo' : 'whisper-1';

    formData.append('model', model);
    formData.append('language', language || 'es');

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || error.message || `Error HTTP ${response.status} en la API de transcripción`);
    }

    return await response.json();
};
