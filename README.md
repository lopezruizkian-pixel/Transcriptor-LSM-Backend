# Transcriptor LSM - Backend API

Servidor API independiente desarrollado en Node.js + Express para el proyecto Transcriptor LSM.

## 🚀 Requisitos e Instalación

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno en el archivo `.env`:
   ```env
   PORT=3000
   OPENAI_API_KEY=tu_clave_openai
   GROQ_API_KEY=tu_clave_groq (opcional)
   ```

3. Iniciar el servidor:
   ```bash
   npm start
   ```

El servidor estará escuchando en `http://localhost:3000`.

## 🌐 Endpoints

- `GET /health`: Verificación del estado del servidor.
- `POST /api/transcribe`: Recibe audio en formato Base64 y realiza la transcripción mediante Whisper (Groq u OpenAI).
- `POST /api/process`: Recibe texto transcrito y aplica la traducción a español/LSM mediante OpenAI GPT-4o-mini.
