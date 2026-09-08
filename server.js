import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ruta de salud / estado
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Servidor Backend de Transcriptor LSM activo' });
});

app.get('/', (req, res) => {
    res.status(200).json({ message: 'API Backend Transcriptor LSM' });
});

// ─── ENDPOINT 1: Transcripción de Audio con Whisper (Groq u OpenAI) ────────
app.post('/api/transcribe', async (req, res) => {
    try {
        const { audioBase64, language, ext } = req.body;

        if (!audioBase64) {
            return res.status(400).json({ error: 'No audio provided' });
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

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Transcribe error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ─── ENDPOINT 2: Procesamiento de IA (Traducción y LSM) ─────────────────────
app.post('/api/process', async (req, res) => {
    try {
        const { text, lang } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        let systemPrompt = "";

        if (lang === 'en') {
            systemPrompt = `Recibirás texto transcrito por Whisper. Devuelve un JSON con dos claves:

1. "traduccion": Traducción fiel al español.
2. "lsm": Adaptación a Lengua de Señas Mexicana (LSM) simplificada.

REGLAS ESTRICTAS PARA LSM:
- Identifica el tema principal y el sentido exacto de lo que quiere decir el maestro.
- Extrae e interpreta modismos o expresiones complejas, reescribiéndolos con palabras más sencillas.
- Adapta la oración a la estructura gramatical LSM: Tiempo → Lugar → Sujeto → Objeto → Verbo.
- Elimina artículos (el, la, los, un, una) y conectores innecesarios.
- Escribe TODO en minúsculas.
- NO utilices etiquetas como "Tiempo:", "Lugar:", etc. Solo la frase limpia.`;
        } else {
            systemPrompt = `Recibirás texto transcrito por Whisper en español. Devuelve un JSON con una sola clave:

1. "lsm": Adaptación a Lengua de Señas Mexicana (LSM) simplificada.

REGLAS ESTRICTAS PARA LSM:
- Identifica el tema principal y el sentido exacto de lo que quiere decir el maestro.
- Extrae e interpreta modismos o expresiones complejas, reescribiéndolos con palabras más sencillas.
- Adapta la oración a la estructura gramatical LSM: Tiempo → Lugar → Sujeto → Objeto → Verbo.
- Elimina artículos (el, la, los, un, una) y conectores innecesarios.
- Escribe TODO en minúsculas.
- NO utilices etiquetas como "Tiempo:", "Lugar:", etc. Solo la frase limpia.`;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Error HTTP ${response.status} en la API de OpenAI`);
        }

        const data = await response.json();
        const jsonResult = JSON.parse(data.choices[0].message.content);
        return res.status(200).json(jsonResult);
    } catch (error) {
        console.error('Process error:', error);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend corriendo en http://localhost:${PORT}`);
});
