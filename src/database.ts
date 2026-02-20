// ═══════════════════════════════════════════════════
//  D U D E  S I M U L A T O R  —  Database (SQLite)
// ═══════════════════════════════════════════════════

import Database from 'better-sqlite3';
import path from 'path';
import type { DudeStats, DudeState, CatState } from './types.js';

const DATA_DIR = process.env.DATA_DIR || '.';
const DB_PATH = path.join(DATA_DIR, 'dude.db');

let db: Database.Database;

export function initDatabase(): void {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS dude (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT 'The Dude',
      x INTEGER NOT NULL DEFAULT 10,
      y INTEGER NOT NULL DEFAULT 8,
      energy REAL NOT NULL DEFAULT 80,
      hunger REAL NOT NULL DEFAULT 70,
      thirst REAL NOT NULL DEFAULT 60,
      fun REAL NOT NULL DEFAULT 50,
      hygiene REAL NOT NULL DEFAULT 90,
      social REAL NOT NULL DEFAULT 40,
      current_activity TEXT,
      activity_progress INTEGER NOT NULL DEFAULT 0,
      activity_duration INTEGER NOT NULL DEFAULT 0,
      music_url TEXT,
      collapsed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cat (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      x INTEGER NOT NULL DEFAULT 2,
      y INTEGER NOT NULL DEFAULT 12,
      behavior TEXT NOT NULL DEFAULT 'sit',
      ticks_until_change INTEGER NOT NULL DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);

  // Ensure dude row exists
  const dudeRow = db.prepare('SELECT id FROM dude WHERE id = 1').get();
  if (!dudeRow) {
    db.prepare('INSERT INTO dude (id) VALUES (1)').run();
  }

  // Ensure cat row exists
  const catRow = db.prepare('SELECT id FROM cat WHERE id = 1').get();
  if (!catRow) {
    db.prepare('INSERT INTO cat (id) VALUES (1)').run();
  }
}

// ── Dude CRUD ────────────────────────────────────

export function loadDudeState(): DudeState {
  const row = db.prepare('SELECT * FROM dude WHERE id = 1').get() as any;
  return {
    name: row.name,
    x: row.x,
    y: row.y,
    stats: {
      energy: row.energy,
      hunger: row.hunger,
      thirst: row.thirst,
      fun: row.fun,
      hygiene: row.hygiene,
      social: row.social,
    },
    currentActivity: row.current_activity,
    activityProgress: row.activity_progress,
    activityDuration: row.activity_duration,
    targetX: null,
    targetY: null,
    path: [],
    musicUrl: row.music_url,
    collapsed: row.collapsed === 1,
  };
}

export function saveDudeState(dude: DudeState): void {
  db.prepare(`
    UPDATE dude SET
      name = ?, x = ?, y = ?,
      energy = ?, hunger = ?, thirst = ?, fun = ?, hygiene = ?, social = ?,
      current_activity = ?, activity_progress = ?, activity_duration = ?,
      music_url = ?, collapsed = ?
    WHERE id = 1
  `).run(
    dude.name, dude.x, dude.y,
    dude.stats.energy, dude.stats.hunger, dude.stats.thirst,
    dude.stats.fun, dude.stats.hygiene, dude.stats.social,
    dude.currentActivity, dude.activityProgress, dude.activityDuration,
    dude.musicUrl, dude.collapsed ? 1 : 0,
  );
}

// ── Cat CRUD ─────────────────────────────────────

export function loadCatState(): CatState {
  const row = db.prepare('SELECT * FROM cat WHERE id = 1').get() as any;
  return {
    x: row.x,
    y: row.y,
    behavior: row.behavior,
    ticksUntilChange: row.ticks_until_change,
  };
}

export function saveCatState(cat: CatState): void {
  db.prepare(`
    UPDATE cat SET x = ?, y = ?, behavior = ?, ticks_until_change = ?
    WHERE id = 1
  `).run(cat.x, cat.y, cat.behavior, cat.ticksUntilChange);
}

// ── Journal ──────────────────────────────────────

export function addJournalEntry(entry: string): void {
  db.prepare('INSERT INTO journal (entry, created_at) VALUES (?, ?)').run(entry, Date.now());
}

export function getJournalEntries(limit: number = 10): { entry: string; time: number }[] {
  const rows = db.prepare('SELECT entry, created_at as time FROM journal ORDER BY id DESC LIMIT ?').all(limit) as any[];
  return rows.map(r => ({ entry: r.entry, time: r.time }));
}

// ── Events ───────────────────────────────────────

export function addEvent(message: string, emoji: string): void {
  db.prepare('INSERT INTO events (message, emoji, created_at) VALUES (?, ?, ?)').run(message, emoji, Date.now());
  // Keep only last 50 events
  db.prepare('DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT 50)').run();
}

export function getRecentEvents(limit: number = 20): { message: string; emoji: string; time: number }[] {
  const rows = db.prepare('SELECT message, emoji, created_at as time FROM events ORDER BY id DESC LIMIT ?').all(limit) as any[];
  return rows.reverse(); // oldest first
}
