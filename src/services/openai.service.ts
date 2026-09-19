// ─── Traducción/LSM ───────────────────────────────────────────────────────────
// Prompt optimizado: ~120 tokens vs ~320 tokens anterior (~60% de ahorro)
export const processLSM = async (text: string, lang: string, context?: string): Promise<any> => {
    if (!text) throw new Error('No text provided');

    // Contexto compacto: solo los últimos 120 caracteres para no inflar tokens
    const ctx = context?.trim().slice(-120) || '';
    const ctxLine = ctx ? `\nContexto reciente: "${ctx}"` : '';

    // Símbolos matemáticos en un solo string compacto
    const mathMap = '√=raíz ²=cuadrado ³=cubo π=pi ∞=infinito Σ=sumatoria ±=más-menos ∫=integral Δ=delta θ=theta α=alfa β=beta';

    let systemPrompt: string;

    if (lang === 'en') {
        systemPrompt =
            `Traduce al español y adapta a LSM (Lengua de Señas Mexicana).${ctxLine}
Reglas LSM: Tiempo·Lugar·Sujeto·Objeto·Verbo, sin artículos ni conectores, minúsculas (excepto símbolos: ${mathMap}).
Devuelve JSON: {"traduccion":"...","lsm":"..."}`;
    } else {
        systemPrompt =
            `Adapta a LSM (Lengua de Señas Mexicana).${ctxLine}
Reglas: Tiempo·Lugar·Sujeto·Objeto·Verbo, sin artículos ni conectores, minúsculas (excepto símbolos: ${mathMap}).
Devuelve JSON: {"lsm":"..."}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
            ],
            temperature: 0,
            max_tokens: 200
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any).error?.message || `Error HTTP ${response.status} en OpenAI`);
    }

    const data = await response.json() as any;
    return JSON.parse(data.choices[0].message.content);
};

// ─── Resumen de clase ──────────────────────────────────────────────────────────
// Devuelve JSON estructurado { titulo, puntos[], conclusion } en lugar de Markdown crudo
export const generateSummary = async (fullTranscription: string, topicContext: string): Promise<string> => {
    if (!fullTranscription) return JSON.stringify({ titulo: '', puntos: [], conclusion: 'Sin contenido académico.' });

    const tema = topicContext?.trim() || 'Clase general';

    const systemPrompt =
        `Resume esta transcripción de clase (tema: "${tema}").
Omite ruido (saludos, charlas irrelevantes). Solo conocimiento académico.
Devuelve JSON: {"titulo":"<título breve>","puntos":["<punto 1>","<punto 2>",...],"conclusion":"<conclusión en 1-2 oraciones>"}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: fullTranscription }
            ],
            temperature: 0.2,
            max_tokens: 600
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any).error?.message || `Error HTTP ${response.status} en OpenAI (Resumen)`);
    }

    const data = await response.json() as any;
    // Devolvemos el JSON como string (se guardará así en Prisma y se parseará en el frontend)
    return data.choices[0].message.content;
};

export const generateDefinition = async (word: string): Promise<string> => {
    if (!word) return '';

    const systemPrompt = `Eres un diccionario especializado en español de México para jóvenes de la comunidad sorda (LSM). Define la palabra '${word}' en español mexicano cotidiano, usando vocabulario extremadamente básico, claro y sin modismos de otros países (ejemplo: usa 'computadora' en vez de 'ordenador', 'celular' en vez de 'móvil'). Máximo 10 palabras. Solo entrega la definición directa.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt }
            ],
            temperature: 0,
            max_tokens: 80
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("OpenAI Dictionary Error:", error);
        throw new Error(error.error?.message || `Error HTTP ${response.status} en la API de OpenAI (Diccionario)`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
};
