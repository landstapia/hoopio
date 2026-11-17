import { io } from 'socket.io-client';

const name = process.argv[2] ?? 'anon';
const socket = io('http://127.0.0.1:3000');

socket.on('connect', () => {
  console.log('connected as', socket.id);
  socket.emit('ping', name, (reply: string) => console.log('ack:', reply));
});

socket.on('connect_error', (err) => console.log('connect error:', err.message));
socket.on('disconnect', (reason) => console.log('disconnected:', reason));
socket.on('peer:ping', (from: string) => console.log('peer pinged:', from));