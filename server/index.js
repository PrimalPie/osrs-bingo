require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { getDb } = require('./db/database');
const authRouter = require('./routes/auth');
const eventsRouter = require('./routes/events');
const { router: tilesRouter } = require('./routes/tiles');
const teamsRouter = require('./routes/teams');
const submissionsRouter = require('./routes/submissions');
const boardRouter = require('./routes/board');
const itemsRouter = require('./routes/items');
const bossesRouter = require('./routes/bosses');
const { createBot } = require('./bot/index');
const { startWomPoller } = require('./services/wom');
const auditRouter = require('./routes/audit');
const womRouter = require('./routes/wom');

const UPLOAD_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Initialize DB
getDb();

// Routes
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/tiles', tilesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/board', boardRouter);
app.use('/api/items', itemsRouter);
app.use('/api', bossesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/wom', womRouter);
app.use('/uploads', express.static(UPLOAD_DIR));

const ICONS_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'icons')
  : path.join(__dirname, 'icons');
app.use('/icons', express.static(ICONS_DIR));

// Socket.io: broadcast progress updates when captain approves/rejects
// The routes emit via io directly — pass io through app locals
app.locals.io = io;

// Patch submission routes to emit socket events after approve/reject
// We do this by monkey-patching the response — simpler: import io in routes
// Instead, we re-export io and import it in submissions route
// Actually, let's just emit from here after the fact via a middleware

io.on('connection', (socket) => {
  console.log('[WS] Client connected:', socket.id);
  socket.on('disconnect', () => console.log('[WS] Client disconnected:', socket.id));
});

// Make io available to routes via req
app.use((req, _res, next) => { req.io = io; next(); });

// Start Discord bot
app.locals.bot = createBot(io);

// Start WiseOldMan poller
startWomPoller(io);

// Serve React build in production (must be after all API routes)
if (process.env.NODE_ENV === 'production') {
  const CLIENT_BUILD = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(CLIENT_BUILD));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_BUILD, 'index.html')));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
