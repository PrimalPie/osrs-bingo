import { io } from 'socket.io-client';

// Dev: Vite runs on a different port so point explicitly at the backend.
// Production: client is served from the same Express server, connect to same origin.
const socket = io(import.meta.env.DEV ? 'http://localhost:3001' : undefined, { autoConnect: true });

export default socket;
