import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import transcriptionRoutes from './routes/transcription.routes.js';
import classRoutes from './routes/class.routes.js';
import dictionaryRoutes from './routes/dictionary.route.js';
import setupSockets from './sockets/class.socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configuración de Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configuración de Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Permitir todas las conexiones. En producción, especificar el dominio del frontend
        methods: ["GET", "POST"]
    }
});

// Inicializar Sockets
setupSockets(io);

// Rutas API
app.use('/api', transcriptionRoutes);
app.use('/api/class', classRoutes);
app.use('/api/dictionary', dictionaryRoutes);

// Ruta de salud / estado
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Servidor Backend de Transcriptor LSM activo' });
});

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: 'API Backend Transcriptor LSM' });
});

const PORT = process.env.PORT || 3000;

const server = httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor Backend corriendo en http://localhost:${PORT}`);
});

server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} está ocupado por otro proceso.`);
        console.error(`👉 Cambia el PORT en tu archivo .env o cierra la aplicación que lo usa.`);
    } else {
        console.error('Error en el servidor:', err);
    }
});
