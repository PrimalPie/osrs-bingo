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
const { startEventScheduler } = require('./services/eventScheduler');
const auditRouter = require('./routes/audit');
const womRouter = require('./routes/wom');
const generateRouter = require('./routes/generate');
const settingsRouter = require('./routes/settings');

const UPLOAD_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://static.runelite.net https://oldschool.runescape.wiki https://oldschool.runescape.com",
      "connect-src 'self' wss:",
      "font-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  next();
});

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
app.use('/api/generate', generateRouter);
app.use('/api/settings', settingsRouter);
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

// Start event auto-activate/complete scheduler
startEventScheduler(io);

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
