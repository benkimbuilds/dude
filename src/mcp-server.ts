// ═══════════════════════════════════════════════════
//  D U D E  S I M U L A T O R  —  MCP Server
// ═══════════════════════════════════════════════════

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Request, Response } from 'express';
import {
  startActivity, stopActivity, getFullState, getDudeStatus, getLookView,
  setMusicUrl, stopMusic, renameDude, getCatStatus,
  writeJournal, readJournal, feedDude, getRoomState,
} from './game-engine.js';
import { ACTIVITIES } from './types.js';

const transports = new Map<string, StreamableHTTPServerTransport>();

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'dude-simulator',
    version: '0.1.0',
  });

  // ── 1. status ─────────────────────────────────
  server.tool(
    'status',
    'Get the dude\'s current stats, mood, activity, and position. Call this to check how he\'s doing.',
    {},
    async () => {
      const status = getDudeStatus();
      return { content: [{ type: 'text' as const, text: status }] };
    },
  );

  // ── 2. do_activity ────────────────────────────
  server.tool(
    'do_activity',
    `Direct the dude to perform an activity. He'll walk to the right spot and do it. Available: ${Object.keys(ACTIVITIES).join(', ')}`,
    {
      activity: z.string().describe(`Activity name. One of: ${Object.keys(ACTIVITIES).join(', ')}`),
    },
    async (params) => {
      const result = startActivity(params.activity);
      if (!result.ok) return { content: [{ type: 'text' as const, text: `ERROR: ${result.error}` }] };
      return { content: [{ type: 'text' as const, text: result.message! }] };
    },
  );

  // ── 3. stop ───────────────────────────────────
  server.tool(
    'stop',
    'Interrupt the dude\'s current activity. He gets partial credit for time spent.',
    {},
    async () => {
      const result = stopActivity();
      return { content: [{ type: 'text' as const, text: result.message! }] };
    },
  );

  // ── 4. look ───────────────────────────────────
  server.tool(
    'look',
    'See an ASCII art view of the room with the dude\'s position and the cat.',
    {},
    async () => {
      const view = getLookView();
      return { content: [{ type: 'text' as const, text: view }] };
    },
  );

  // ── 5. feed ───────────────────────────────────
  server.tool(
    'feed',
    'Shortcut: have the dude cook food and then eat. Chains cook_food and eat_food activities.',
    {},
    async () => {
      const result = feedDude();
      if (!result.ok) return { content: [{ type: 'text' as const, text: `ERROR: ${result.message}` }] };
      return { content: [{ type: 'text' as const, text: result.message }] };
    },
  );

  // ── 6. play_music ─────────────────────────────
  server.tool(
    'play_music',
    'Set a music URL for the dude to listen to. Shows in the UI.',
    {
      url: z.string().describe('YouTube or music URL'),
    },
    async (params) => {
      setMusicUrl(params.url);
      return { content: [{ type: 'text' as const, text: `Now playing: ${params.url}` }] };
    },
  );

  // ── 7. stop_music ─────────────────────────────
  server.tool(
    'stop_music',
    'Stop the currently playing music.',
    {},
    async () => {
      stopMusic();
      return { content: [{ type: 'text' as const, text: 'Music stopped.' }] };
    },
  );

  // ── 8. write_journal ──────────────────────────
  server.tool(
    'write_journal',
    'Have the dude write a journal entry. He walks to the desk and writes.',
    {
      entry: z.string().max(500).describe('The journal entry text'),
    },
    async (params) => {
      startActivity('journal');
      writeJournal(params.entry);
      return { content: [{ type: 'text' as const, text: `Journal entry written: "${params.entry}"` }] };
    },
  );

  // ── 9. read_journal ───────────────────────────
  server.tool(
    'read_journal',
    'Read the last 10 journal entries.',
    {},
    async () => {
      const entries = readJournal();
      if (entries.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No journal entries yet.' }] };
      }
      const text = entries.map((e, i) =>
        `${i + 1}. [${new Date(e.time).toLocaleString()}] ${e.entry}`
      ).join('\n');
      return { content: [{ type: 'text' as const, text: `═══ Journal ═══\n${text}` }] };
    },
  );

  // ── 10. check_cat ─────────────────────────────
  server.tool(
    'check_cat',
    'See what the cat is doing right now.',
    {},
    async () => {
      const status = getCatStatus();
      return { content: [{ type: 'text' as const, text: status }] };
    },
  );

  // ── 11. rename ────────────────────────────────
  server.tool(
    'rename',
    'Rename the dude.',
    {
      name: z.string().min(1).max(30).describe('New name for the dude'),
    },
    async (params) => {
      const result = renameDude(params.name);
      return { content: [{ type: 'text' as const, text: `Renamed from "${result.oldName}" to "${result.newName}".` }] };
    },
  );

  // ── 12. room_state ────────────────────────────
  server.tool(
    'room_state',
    'Get the full room state as JSON. Includes dude position, stats, cat, room dimensions, and tick count.',
    {},
    async () => {
      const state = getRoomState();
      return { content: [{ type: 'text' as const, text: JSON.stringify(state, null, 2) }] };
    },
  );

  return server;
}

// ── Express Request Handler ──────────────────────

export async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (req.method === 'POST') {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        transports.delete(sid);
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    const sid = transport.sessionId;
    if (sid) {
      transports.set(sid, transport);
    }
    return;
  }

  if (req.method === 'GET') {
    if (!sessionId || !transports.has(sessionId)) {
      res.status(405).json({ error: 'Method not allowed. POST to initialize a session first.' });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    return;
  }

  if (req.method === 'DELETE') {
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      transports.delete(sessionId);
      return;
    }
    res.status(200).end();
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
