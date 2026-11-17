import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { Server } from 'socket.io';
import { startClockLoop } from './clock.js';
import { applyChange, getFullState, readLog, replaceFullState, uploadsDir } from './state.js';
import type { ClientToServerEvents, FullDbPayload, PatchChange, ServerToClientEvents } from './types.js';

const PORT = Number(process.env.PORT ?? 3000);
const ALLOWED_UPLOAD_FOLDERS = new Set([
  'team-logos',
  'team-photos',
  'solo-photos',
  'event-photos',
  'event-videos',
]);

for (const folder of ALLOWED_UPLOAD_FOLDERS) {
  mkdirSync(path.join(uploadsDir, folder), { recursive: true });
}

const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });
await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });
await app.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/',
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
  cors: { origin: true },
});

app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString() }));

app.get('/api/db', async () => getFullState());

app.get('/api/log', async (_req, reply) => {
  reply.type('text/plain; charset=utf-8');
  return readLog();
});

app.post<{ Body: PatchChange }>('/api/patch', async (req) => {
  const { state, logLine } = applyChange(req.body ?? {});
  io.emit('db:state', state);
  if (logLine) io.emit('log:line', logLine);
  return state;
});

app.post<{ Params: { folder: string } }>('/api/upload/:folder', async (req, reply) => {
  const { folder } = req.params;
  if (!ALLOWED_UPLOAD_FOLDERS.has(folder)) {
    return reply.code(400).send({ error: 'Invalid upload folder' });
  }
  const data = await req.file();
  if (!data) {
    return reply.code(400).send({ error: 'No file uploaded' });
  }
  const safeExt = path.extname(data.filename || '').replace(/[^a-zA-Z0-9.]/g, '') || '.bin';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
  const dest = path.join(uploadsDir, folder, filename);
  await pipeline(data.file, createWriteStream(dest));
  return { url: `/uploads/${folder}/${filename}` };
});

const clientDist = path.resolve(process.cwd(), '../client/dist');

if (existsSync(clientDist)) {
  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: '/',
    decorateReply: false,
  });
}

app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith('/api')) {
    return reply.code(404).send({
      message: `Route ${req.method}:${req.url} not found`,
      error: 'Not Found',
      statusCode: 404,
    });
  }
  if (existsSync(path.join(clientDist, 'index.html'))) {
    return reply.sendFile('index.html', clientDist);
  }
  return reply.code(404).send({
    message: 'Frontend build not found. Run "npm run build" in client/ first.',
  });
});

app.post<{ Body: Partial<FullDbPayload> }>('/api/restore', async (req, reply) => {
  const body = req.body;
  if (!body || !Array.isArray(body.teams) || !Array.isArray(body.players) || !Array.isArray(body.games)) {
    return reply.code(400).send({ error: 'Invalid HoopIO backup JSON structure' });
  }
  const { state, logLine } = replaceFullState(body);
  io.emit('db:state', state);
  io.emit('log:line', logLine);
  return state;
});

io.on('connection', (socket) => {
  socket.emit('db:state', getFullState());

  socket.on('patch', (change, ack) => {
    const { state, logLine } = applyChange(change ?? {});
    io.emit('db:state', state);
    if (logLine) io.emit('log:line', logLine);
    if (ack) ack(state);
  });
});

const clockTimer = startClockLoop(io);

const shutdown = async () => {
  clearInterval(clockTimer);
  await app.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: PORT, host: '0.0.0.0' });