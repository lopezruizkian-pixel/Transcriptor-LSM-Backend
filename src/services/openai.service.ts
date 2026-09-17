export const processLSM = async (text: string, lang: string, context?: string): Promise<any> => {
    if (!text) throw new Error('No text provided');

    // Si hay contexto previo, incluirlo en el prompt
    const contextSection = context?.trim()
        ? `\n\nCONTEXTO PREVIO (fragmentos anteriores del mismo maestro, en orden):\n"${context}"\n\nSi el texto actual parece incompleto o continúa una idea del contexto, combínalos para entender el significado completo antes de traducir.`
        : '';

    const mathInstructions = `
- Si detectas expresiones matemáticas, convierte a símbolos Unicode directamente:
  "raíz de" o "raíz cuadrada de" → √
  "elevado al cuadrado" o "al cuadrado" → ²
  "elevado al cubo" o "al cubo" → ³
  "pi" → π | "infinito" → ∞ | "sumatoria" → Σ | "más o menos" → ±
  "integral" → ∫ | "delta" → Δ | "theta" → θ | "alfa" → α | "beta" → β
  Ejemplo: "raíz de cinco más x al cuadrado" → √5 + x²`;

    const lsmRules = `
REGLAS ESTRICTAS PARA LSM:
- Identifica el tema principal y el sentido exacto. Si el fragmento parece incompleto, usa el CONTEXTO PREVIO para completarlo.
- Adapta a estructura gramatical LSM: Tiempo → Lugar → Sujeto → Objeto → Verbo.
- Elimina artículos (el, la, los, un, una) y conectores innecesarios.
- Escribe TODO en minúsculas, EXCEPTO símbolos matemáticos (√ π Σ etc.).
- NO uses etiquetas como "Tiempo:" o "Lugar:". Solo la frase limpia.${mathInstructions}`;

    let systemPrompt = '';

    if (lang === 'en') {
        systemPrompt = `Recibirás texto en inglés transcrito por Whisper.${contextSection}
Devuelve un JSON con dos claves:
1. "traduccion": traducción fiel al español.
2. "lsm": adaptación a Lengua de Señas Mexicana simplificada.
${lsmRules}`;
    } else {
        systemPrompt = `Recibirás texto en español transcrito por Whisper.${contextSection}
Devuelve un JSON con una sola clave:
1. "lsm": adaptación a Lengua de Señas Mexicana simplificada.
${lsmRules}`;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
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
    return JSON.parse(data.choices[0].message.content);
};

export const generateSummary = async (fullTranscription: string, topicContext: string): Promise<string> => {
    if (!fullTranscription) return '';

    const systemPrompt = `Eres un asistente educativo experto. Tu objetivo es generar un resumen académico estructurado de una clase, basado en su transcripción.
El contexto o tema principal de la clase es: "${topicContext}".

REGLAS ESTRICTAS:
1. Filtra y omite TODO el "ruido": conversaciones triviales, saludos, interrupciones, pláticas con alumnos que no tengan que ver con el tema, o anécdotas irrelevantes.
2. Enfócate ÚNICAMENTE en el conocimiento académico relacionado al contexto de la clase.
3. Estructura el resumen en viñetas o párrafos cortos y claros, usando Markdown.
4. Si la transcripción está casi vacía o no hay contenido académico real, responde con un breve texto indicando que no hubo suficiente contenido relevante.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: fullTranscription }
            ],
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("DeepSeek Summary Error:", error);
        throw new Error(error.error?.message || `Error HTTP ${response.status} en la API de DeepSeek (Resumen)`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};
