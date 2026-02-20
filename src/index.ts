// ═══════════════════════════════════════════════════
//  D U D E  S I M U L A T O R  —  Main Entry Point
// ═══════════════════════════════════════════════════

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initGame, startGameLoop, onSpectatorUpdate, getFullState } from './game-engine.js';
import { handleMcpRequest } from './mcp-server.js';
import { mcpRateLimiter, apiRateLimiter, canAcceptWebSocket, trackWebSocketOpen, trackWebSocketClose } from './middleware.js';
import type { IncomingMessage } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3333', 10);

// ── Initialize ───────────────────────────────────
initGame();

// ── Express App ──────────────────────────────────
const app = express();

app.set('trust proxy', true);

// MCP endpoint
app.use('/mcp', mcpRateLimiter);
app.use('/mcp', express.json({ limit: '16kb' }));
app.all('/mcp', handleMcpRequest as any);

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── OAuth / well-known endpoints for MCP client compat ──
app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  const baseUrl = `${_req.protocol}://${_req.get('host')}`;
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
  });
});

app.get('/.well-known/oauth-protected-resource', (_req, res) => {
  const baseUrl = `${_req.protocol}://${_req.get('host')}`;
  res.json({ resource: `${baseUrl}/mcp` });
});

app.post('/register', (_req, res) => {
  res.status(400).json({ error: 'invalid_request', error_description: 'This server does not require OAuth. Connect directly to /mcp.' });
});

app.post('/token', (_req, res) => {
  res.status(400).json({ error: 'invalid_request', error_description: 'This server does not require OAuth. Connect directly to /mcp.' });
});

app.get('/authorize', (_req, res) => {
  res.status(400).json({ error: 'invalid_request', error_description: 'This server does not require OAuth. Connect directly to /mcp.' });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', game: 'dude-simulator', version: '0.1.0' });
});

// API endpoint for current state
app.get('/api/state', apiRateLimiter, (_req, res) => {
  res.json(getFullState());
});

// JSON catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found', error_description: `Cannot ${_req.method} ${_req.path}` });
});

// ── HTTP Server + WebSocket ──────────────────────
const server = createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req: IncomingMessage) => {
  const check = canAcceptWebSocket(req);
  if (!check.allowed) {
    ws.close(1013, check.reason);
    return;
  }

  trackWebSocketOpen(req);

  // Send initial full state
  const state = getFullState();
  ws.send(JSON.stringify({ type: 'full_state', data: state }));

  ws.on('close', () => {
    trackWebSocketClose(req);
  });
});

// Broadcast game updates to all WebSocket clients
onSpectatorUpdate((update) => {
  const msg = JSON.stringify(update);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
});

// ── Start ────────────────────────────────────────
server.listen(PORT, () => {
  startGameLoop();
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║         D U D E  S I M U L A T O R          ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log(`  ║  Web UI:        http://localhost:${PORT}       ║`);
  console.log(`  ║  MCP Endpoint:  http://localhost:${PORT}/mcp   ║`);
  console.log(`  ║  Health Check:  http://localhost:${PORT}/health ║`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[DUDE] Shutting down...');
  server.close();
  process.exit(0);
});
