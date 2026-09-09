import { Server, Socket } from 'socket.io';

export default (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log(`Usuario conectado: ${socket.id}`);

        // Evento para unirse a una clase específica
        socket.on('join_class', ({ classId, role }: { classId: string, role: string }) => {
            // classId: identificador único de la clase (ej. 'clase-101')
            // role: 'maestro' o 'alumno'
            socket.join(classId);
            console.log(`Usuario ${socket.id} (${role}) se unió a la clase: ${classId}`);
            
            // Opcional: Notificar a la sala que alguien se unió
            socket.to(classId).emit('user_joined', { userId: socket.id, role });
        });

        // Evento emitido por el profesor con los datos de transcripción/LSM
        socket.on('send_transcription', ({ classId, data }: { classId: string, data: any }) => {
            // Reenvía los datos a todos los clientes conectados a esa clase (excepto el emisor)
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
