import { Server, Socket } from 'socket.io';
import { classStore } from '../mocks/class.store.js';

export default (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log(`Usuario conectado: ${socket.id}`);

        // Evento para unirse a una clase específica
        socket.on('join_class', ({ classId, role }: { classId: string, role: string }) => {
            socket.join(classId);
            console.log(`Usuario ${socket.id} (${role}) se unió a la clase: ${classId}`);
            
            // Enviar transcripción acumulada existente si entra un alumno a media clase
            if (role === 'alumno' && classStore[classId]) {
                const { fullTranscription, fullLsm } = classStore[classId];
                if (fullTranscription || fullLsm) {
                    socket.emit('receive_transcription', {
                        fullTranscription,
                        fullLsm
                    });
                }
            }

            socket.to(classId).emit('user_joined', { userId: socket.id, role });
        });

        // Evento emitido por el profesor con los datos de transcripción/LSM
        socket.on('send_transcription', ({ classId, data }: { classId: string, data: any }) => {
            socket.to(classId).emit('receive_transcription', data);
        });

        // Evento para salir de la clase
        socket.on('leave_class', (classId: string) => {
            socket.leave(classId);
            console.log(`Usuario ${socket.id} abandonó la clase: ${classId}`);
        });

        socket.on('disconnect', () => {
            console.log(`Usuario desconectado: ${socket.id}`);
        });
    });
};
