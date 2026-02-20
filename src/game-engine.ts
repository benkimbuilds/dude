// ═══════════════════════════════════════════════════
//  D U D E  S I M U L A T O R  —  Game Engine
// ═══════════════════════════════════════════════════

import {
  ACTIVITIES, STAT_DECAY, STAT_KEYS, STAT_WEIGHTS, MOOD_FACES,
  ROOM_WIDTH, ROOM_HEIGHT, ROOM_LAYOUT, OBJECT_LOCATIONS,
  isWalkable,
  type DudeState, type DudeStats, type CatState, type GameEvent, type FullGameState,
  type ActivityDef, type CatBehavior,
} from './types.js';
import {
  initDatabase, loadDudeState, saveDudeState,
  loadCatState, saveCatState,
  addEvent, getRecentEvents,
  getJournalEntries, addJournalEntry,
} from './database.js';

// ── State ────────────────────────────────────────

let dude: DudeState;
let cat: CatState;
let tick = 0;
let updateCallback: ((state: any) => void) | null = null;
let tickInterval: ReturnType<typeof setInterval> | null = null;

const TICK_MS = 3000;

// Track which stats are depleted (at 0) for consequences
const depletedAlerted = new Set<keyof DudeStats>(); // avoid spamming events
let socialAutoWalkCooldown = 0; // ticks until next auto-walk to window

function getDepletedStats(): (keyof DudeStats)[] {
  return STAT_KEYS.filter(k => dude.stats[k] <= 0);
}

// ── Init ─────────────────────────────────────────

export function initGame(): void {
  initDatabase();
  dude = loadDudeState();
  cat = loadCatState();
  emitEvent('The dude wakes up...', '🌅');
}

export function startGameLoop(): void {
  tickInterval = setInterval(gameTick, TICK_MS);
}

export function onSpectatorUpdate(cb: (state: any) => void): void {
  updateCallback = cb;
}

// ── Mood Calculation ─────────────────────────────

function calculateMood(): number {
  let totalWeight = 0;
  let weighted = 0;
  for (const key of STAT_KEYS) {
    const w = STAT_WEIGHTS[key];
    weighted += dude.stats[key] * w;
    totalWeight += w;
  }
  return Math.round(weighted / totalWeight);
}

function getMoodFace(mood: number): { face: string; label: string } {
  for (const m of MOOD_FACES) {
    if (mood >= m.min) return { face: m.face, label: m.label };
  }
  return MOOD_FACES[MOOD_FACES.length - 1];
}

// ── BFS Pathfinding ──────────────────────────────

function findPath(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number }[] {
  if (fromX === toX && fromY === toY) return [];

  const visited = new Set<string>();
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [];
  queue.push({ x: fromX, y: fromY, path: [] });
  visited.add(`${fromX},${fromY}`);

  const dirs = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const d of dirs) {
      const nx = current.x + d.dx;
      const ny = current.y + d.dy;
      const key = `${nx},${ny}`;

      if (visited.has(key)) continue;
      if (!isWalkable(nx, ny)) continue;

      const newPath = [...current.path, { x: nx, y: ny }];

      if (nx === toX && ny === toY) return newPath;

      visited.add(key);
      queue.push({ x: nx, y: ny, path: newPath });
    }
  }

  // No path found, return empty
  return [];
}

// ── Activity Processing ──────────────────────────

export function startActivity(activityName: string): { ok: boolean; error?: string; message?: string } {
  const actDef = ACTIVITIES[activityName];
  if (!actDef) {
    return { ok: false, error: `Unknown activity: ${activityName}. Available: ${Object.keys(ACTIVITIES).join(', ')}` };
  }

  if (dude.collapsed) {
    return { ok: false, error: 'The dude has collapsed from exhaustion! Wait for him to recover.' };
  }

  // If already doing something, cancel it first
  if (dude.currentActivity) {
    cancelCurrentActivity(false);
  }

  const loc = OBJECT_LOCATIONS[actDef.object];
  if (!loc) {
    return { ok: false, error: `No location found for ${actDef.object}` };
  }

  // Set up pathfinding to the interaction tile
  const path = findPath(dude.x, dude.y, loc.interactX, loc.interactY);

  dude.targetX = loc.interactX;
  dude.targetY = loc.interactY;
  dude.path = path;
  dude.currentActivity = activityName;
  dude.activityProgress = 0;
  dude.activityDuration = actDef.durationTicks;

  if (path.length === 0 && dude.x === loc.interactX && dude.y === loc.interactY) {
    // Already at target
    emitEvent(`${actDef.description}...`, actDef.emoji);
  } else if (path.length === 0) {
    // Can't reach target — try anyway from current position
    emitEvent(`${actDef.description} (from here)...`, actDef.emoji);
    dude.targetX = null;
    dude.targetY = null;
  } else {
    emitEvent(`Walking to ${actDef.object.replace('_', ' ')}...`, '🚶');
  }

  return { ok: true, message: `${dude.name} will ${actDef.name.toLowerCase()}.` };
}

function cancelCurrentActivity(givePartialCredit: boolean): void {
  if (!dude.currentActivity) return;

  const actDef = ACTIVITIES[dude.currentActivity];
  if (actDef && givePartialCredit && dude.activityProgress > 0) {
    const ratio = dude.activityProgress / dude.activityDuration;
    applyEffects(actDef, ratio);
    emitEvent(`Stopped ${actDef.name.toLowerCase()} (${Math.round(ratio * 100)}% done)`, '⏹️');
  } else if (actDef) {
    emitEvent(`Cancelled ${actDef.name.toLowerCase()}`, '❌');
  }

  dude.currentActivity = null;
  dude.activityProgress = 0;
  dude.activityDuration = 0;
  dude.targetX = null;
  dude.targetY = null;
  dude.path = [];
}

export function stopActivity(): { ok: boolean; message?: string } {
  if (!dude.currentActivity) {
    return { ok: false, message: 'The dude is not doing anything.' };
  }
  cancelCurrentActivity(true);
  return { ok: true, message: 'Activity stopped.' };
}

function applyEffects(actDef: ActivityDef, ratio: number = 1): void {
  for (const key of STAT_KEYS) {
    const effect = actDef.effects[key];
    if (effect !== undefined) {
      dude.stats[key] = Math.max(0, Math.min(100, dude.stats[key] + effect * ratio));
    }
  }
}

function completeActivity(): void {
  if (!dude.currentActivity) return;
  const actDef = ACTIVITIES[dude.currentActivity];
  if (!actDef) return;

  applyEffects(actDef);
  emitEvent(`Finished ${actDef.name.toLowerCase()}!`, '✅');

  dude.currentActivity = null;
  dude.activityProgress = 0;
  dude.activityDuration = 0;
  dude.targetX = null;
  dude.targetY = null;
  dude.path = [];
}

// ── Cat AI ───────────────────────────────────────

function updateCat(): void {
  cat.ticksUntilChange--;

  if (cat.ticksUntilChange <= 0) {
    // Pick new behavior
    const roll = Math.random();
    if (roll < 0.3) {
      cat.behavior = 'wander';
      cat.ticksUntilChange = 3 + Math.floor(Math.random() * 5);
    } else if (roll < 0.5) {
      cat.behavior = 'follow';
      cat.ticksUntilChange = 5 + Math.floor(Math.random() * 8);
    } else if (roll < 0.7) {
      cat.behavior = 'sit';
      cat.ticksUntilChange = 5 + Math.floor(Math.random() * 10);
    } else if (roll < 0.85) {
      cat.behavior = 'sleep';
      cat.ticksUntilChange = 8 + Math.floor(Math.random() * 12);
    } else {
      cat.behavior = 'desk';
      cat.ticksUntilChange = 5 + Math.floor(Math.random() * 8);
    }
  }

  switch (cat.behavior) {
    case 'wander': {
      const dirs = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: 0, dy: 0 },
      ];
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = cat.x + d.dx;
      const ny = cat.y + d.dy;
      if (isWalkable(nx, ny)) {
        cat.x = nx;
        cat.y = ny;
      }
      break;
    }
    case 'follow': {
      // CONSEQUENCE: hygiene=0 — cat refuses to follow, runs away instead
      if (dude.stats.hygiene <= 0) {
        // Move AWAY from the dude
        if (Math.abs(cat.x - dude.x) + Math.abs(cat.y - dude.y) < 5) {
          const dx = -Math.sign(dude.x - cat.x);
          const dy = -Math.sign(dude.y - cat.y);
          if (dx !== 0 && isWalkable(cat.x + dx, cat.y)) {
            cat.x += dx;
          } else if (dy !== 0 && isWalkable(cat.x, cat.y + dy)) {
            cat.y += dy;
          }
        }
        break;
      }
      // Normal follow behavior
      if (Math.abs(cat.x - dude.x) + Math.abs(cat.y - dude.y) > 2) {
        const dx = Math.sign(dude.x - cat.x);
        const dy = Math.sign(dude.y - cat.y);
        if (dx !== 0 && isWalkable(cat.x + dx, cat.y)) {
          cat.x += dx;
        } else if (dy !== 0 && isWalkable(cat.x, cat.y + dy)) {
          cat.y += dy;
        }
      }
      break;
    }
    case 'desk': {
      // Move toward desk area
      const deskX = 12;
      const deskY = 13;
      if (cat.x !== deskX || cat.y !== deskY) {
        const dx = Math.sign(deskX - cat.x);
        const dy = Math.sign(deskY - cat.y);
        if (dx !== 0 && isWalkable(cat.x + dx, cat.y)) {
          cat.x += dx;
        } else if (dy !== 0 && isWalkable(cat.x, cat.y + dy)) {
          cat.y += dy;
        }
      }
      break;
    }
    case 'sit':
    case 'sleep':
      // Stay in place
      break;
  }
}

// ── Main Game Tick ───────────────────────────────

function gameTick(): void {
  tick++;

  // 1. Decay stats (with consequences for depleted stats)
  if (!dude.collapsed) {
    for (const key of STAT_KEYS) {
      let decay = STAT_DECAY[key];

      // CONSEQUENCE: hunger=0 makes energy decay 2x faster
      if (key === 'energy' && dude.stats.hunger <= 0) {
        decay *= 2;
      }

      dude.stats[key] = Math.max(0, dude.stats[key] + decay);
    }
  }

  // 2. Depletion alerts (fire once when stat first hits 0)
  for (const key of STAT_KEYS) {
    if (dude.stats[key] <= 0 && !depletedAlerted.has(key)) {
      depletedAlerted.add(key);
      switch (key) {
        case 'hunger': emitEvent('The dude is starving! Energy draining fast...', '🤢'); break;
        case 'thirst': emitEvent('The dude is dehydrated! Moving sluggishly...', '🥵'); break;
        case 'fun':    emitEvent('The dude is bored out of his mind! Everything feels slower...', '😩'); break;
        case 'hygiene': emitEvent('The dude reeks! The cat is keeping its distance...', '🦨'); break;
        case 'social': emitEvent('The dude feels completely isolated...', '😔'); break;
      }
    } else if (dude.stats[key] > 5 && depletedAlerted.has(key)) {
      depletedAlerted.delete(key);
    }
  }

  // 3. Check for collapse (energy = 0)
  if (dude.stats.energy <= 0 && !dude.collapsed) {
    dude.collapsed = true;
    dude.currentActivity = 'sleep';
    dude.activityProgress = 0;
    dude.activityDuration = 10; // auto-sleep for 10 ticks
    dude.path = [];
    dude.targetX = null;
    dude.targetY = null;
    emitEvent('The dude collapsed from exhaustion!', '😵');
  }

  // 4. Process movement & activity
  if (dude.currentActivity) {
    if (dude.path.length > 0) {
      // CONSEQUENCE: thirst=0 makes dude move every other tick (sluggish)
      const skipMove = dude.stats.thirst <= 0 && tick % 2 === 0;

      if (!skipMove) {
        const next = dude.path.shift()!;
        dude.x = next.x;
        dude.y = next.y;
      }

      if (dude.path.length === 0) {
        const actDef = ACTIVITIES[dude.currentActivity];
        if (actDef) {
          emitEvent(`${actDef.description}...`, actDef.emoji);
        }
      }
    } else {
      // Performing activity
      // CONSEQUENCE: fun=0 makes activities take longer (progress every other tick)
      const slowActivity = dude.stats.fun <= 0 && tick % 2 === 0;

      if (!slowActivity) {
        dude.activityProgress++;
      }

      if (dude.activityProgress >= dude.activityDuration) {
        if (dude.collapsed) {
          dude.stats.energy = Math.min(100, dude.stats.energy + 30);
          dude.collapsed = false;
          emitEvent('The dude woke up from collapse.', '🌅');
          dude.currentActivity = null;
          dude.activityProgress = 0;
          dude.activityDuration = 0;
        } else {
          completeActivity();
        }
      }
    }
  }

  // 5. CONSEQUENCE: social=0 — auto-walk to window every ~30s (10 ticks)
  if (dude.stats.social <= 0 && !dude.currentActivity && !dude.collapsed) {
    socialAutoWalkCooldown--;
    if (socialAutoWalkCooldown <= 0) {
      socialAutoWalkCooldown = 10;
      startActivity('look_outside');
      emitEvent('The dude wanders to the window, feeling lonely...', '🪟');
    }
  } else {
    socialAutoWalkCooldown = 3; // reset when social is fine
  }

  // 6. Update cat
  updateCat();

  // 7. Save state
  saveDudeState(dude);
  saveCatState(cat);

  // 8. Broadcast
  broadcastState();
}

// ── Event Emitter ────────────────────────────────

function emitEvent(message: string, emoji: string): void {
  addEvent(message, emoji);
}

// ── State Broadcast ──────────────────────────────

function broadcastState(): void {
  if (!updateCallback) return;
  updateCallback({ type: 'state_update', data: getFullState() });
}

// ── Public API ───────────────────────────────────

export function getFullState(): FullGameState {
  const mood = calculateMood();
  const { face, label } = getMoodFace(mood);
  return {
    dude: {
      name: dude.name,
      x: dude.x,
      y: dude.y,
      stats: { ...dude.stats },
      currentActivity: dude.currentActivity,
      activityProgress: dude.activityProgress,
      activityDuration: dude.activityDuration,
      targetX: dude.targetX,
      targetY: dude.targetY,
      path: [...dude.path],
      musicUrl: dude.musicUrl,
      collapsed: dude.collapsed,
    },
    cat: { ...cat },
    mood,
    moodFace: face,
    moodLabel: label,
    events: getRecentEvents(),
    journalEntries: getJournalEntries(),
    tick,
    depletedStats: getDepletedStats(),
  };
}

export function getDepletionWarnings(): string[] {
  const warnings: string[] = [];
  if (dude.stats.hunger <= 0) warnings.push('⚠️ STARVING — energy decays 2x faster!');
  if (dude.stats.thirst <= 0) warnings.push('⚠️ DEHYDRATED — movement is sluggish!');
  if (dude.stats.fun <= 0)    warnings.push('⚠️ BORED — activities take twice as long!');
  if (dude.stats.hygiene <= 0) warnings.push('⚠️ STINKY — the cat is avoiding him!');
  if (dude.stats.social <= 0) warnings.push('⚠️ LONELY — he keeps wandering to the window...');
  return warnings;
}

export function getDudeStatus(): string {
  const mood = calculateMood();
  const { face, label } = getMoodFace(mood);
  const actDef = dude.currentActivity ? ACTIVITIES[dude.currentActivity] : null;
  const actStr = actDef
    ? `${actDef.name} (${dude.path.length > 0 ? 'walking' : `${dude.activityProgress}/${dude.activityDuration} ticks`})`
    : 'Idle';

  return [
    `═══ ${dude.name} ═══`,
    `Mood: ${face} ${label} (${mood}/100)`,
    `Position: (${dude.x}, ${dude.y})`,
    `Activity: ${actStr}`,
    ``,
    `Stats:`,
    `  Energy:  ${'█'.repeat(Math.round(dude.stats.energy / 5))}${'░'.repeat(20 - Math.round(dude.stats.energy / 5))} ${Math.round(dude.stats.energy)}/100`,
    `  Hunger:  ${'█'.repeat(Math.round(dude.stats.hunger / 5))}${'░'.repeat(20 - Math.round(dude.stats.hunger / 5))} ${Math.round(dude.stats.hunger)}/100`,
    `  Thirst:  ${'█'.repeat(Math.round(dude.stats.thirst / 5))}${'░'.repeat(20 - Math.round(dude.stats.thirst / 5))} ${Math.round(dude.stats.thirst)}/100`,
    `  Fun:     ${'█'.repeat(Math.round(dude.stats.fun / 5))}${'░'.repeat(20 - Math.round(dude.stats.fun / 5))} ${Math.round(dude.stats.fun)}/100`,
    `  Hygiene: ${'█'.repeat(Math.round(dude.stats.hygiene / 5))}${'░'.repeat(20 - Math.round(dude.stats.hygiene / 5))} ${Math.round(dude.stats.hygiene)}/100`,
    `  Social:  ${'█'.repeat(Math.round(dude.stats.social / 5))}${'░'.repeat(20 - Math.round(dude.stats.social / 5))} ${Math.round(dude.stats.social)}/100`,
    dude.musicUrl ? `\nMusic: ${dude.musicUrl}` : '',
    dude.collapsed ? '\n⚠️ COLLAPSED — auto-sleeping!' : '',
    ...getDepletionWarnings(),
  ].filter(Boolean).join('\n');
}

export function getLookView(): string {
  const lines: string[] = [];
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    let row = '';
    for (let x = 0; x < ROOM_WIDTH; x++) {
      if (dude.x === x && dude.y === y) {
        row += '@';
      } else if (cat.x === x && cat.y === y) {
        row += 'C';
      } else {
        const tile = ROOM_LAYOUT[y][x];
        switch (tile) {
          case 'wall': row += '#'; break;
          case 'floor': row += '.'; break;
          case 'bed': row += 'B'; break;
          case 'couch': row += '~'; break;
          case 'tv': row += 'T'; break;
          case 'table': row += '='; break;
          case 'sink': row += 'S'; break;
          case 'kitchen': row += 'K'; break;
          case 'plant': row += 'P'; break;
          case 'yoga_mat': row += 'Y'; break;
          case 'desk': row += 'D'; break;
          case 'bookshelf': row += 'L'; break;
          case 'cat_bed': row += 'c'; break;
          case 'shower': row += '%'; break;
          case 'door': row += '/'; break;
          case 'window': row += 'W'; break;
          default: row += '?'; break;
        }
      }
    }
    lines.push(row);
  }

  return [
    'Room View (@ = dude, C = cat):',
    ...lines,
    '',
    'Legend: # wall, B bed, ~ couch, T tv, = table, S sink, K kitchen',
    '        P plant, Y yoga, D desk, L bookshelf, c cat bed, % shower',
    '        W window, / door',
  ].join('\n');
}

export function setMusicUrl(url: string): void {
  dude.musicUrl = url;
  saveDudeState(dude);
  emitEvent(`Now playing music`, '🎵');
  broadcastState();
}

export function stopMusic(): void {
  dude.musicUrl = null;
  saveDudeState(dude);
  emitEvent('Music stopped', '🔇');
  broadcastState();
}

export function renameDude(name: string): { ok: boolean; oldName: string; newName: string } {
  const oldName = dude.name;
  dude.name = name;
  saveDudeState(dude);
  emitEvent(`Renamed from "${oldName}" to "${name}"`, '📛');
  broadcastState();
  return { ok: true, oldName, newName: name };
}

export function getCatStatus(): string {
  const behaviorMap: Record<CatBehavior, string> = {
    wander: 'wandering around the room',
    sit: 'sitting calmly',
    follow: 'following the dude',
    sleep: 'sleeping peacefully',
    desk: 'sitting on the desk',
  };
  return `The cat is at (${cat.x}, ${cat.y}), ${behaviorMap[cat.behavior]}.`;
}

export function writeJournal(entry: string): void {
  addJournalEntry(entry);
  emitEvent('Wrote in journal', '📝');
}

export function readJournal(): { entry: string; time: number }[] {
  return getJournalEntries(10);
}

export function feedDude(): { ok: boolean; message: string } {
  if (dude.collapsed) {
    return { ok: false, message: 'The dude has collapsed!' };
  }

  // Start cook_food, then eat_food will happen after
  const result = startActivity('cook_food');
  if (!result.ok) return { ok: false, message: result.error || 'Cannot cook' };
  // We mark that after cooking finishes, eating should start
  // This is handled by enqueueing - for simplicity, just start cooking
  // The MCP tool description says it's a shortcut for cook+eat
  return { ok: true, message: `${dude.name} will cook and then eat. (Call eat_food after cooking finishes for full effect, or just wait.)` };
}

export function getRoomState(): object {
  return {
    dude: {
      name: dude.name,
      position: { x: dude.x, y: dude.y },
      stats: { ...dude.stats },
      mood: calculateMood(),
      currentActivity: dude.currentActivity,
      activityProgress: dude.activityProgress,
      activityDuration: dude.activityDuration,
      isWalking: dude.path.length > 0,
      pathLength: dude.path.length,
      musicUrl: dude.musicUrl,
      collapsed: dude.collapsed,
    },
    cat: {
      position: { x: cat.x, y: cat.y },
      behavior: cat.behavior,
    },
    room: {
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
    },
    tick,
    depletedStats: getDepletedStats(),
    activeConsequences: getDepletionWarnings(),
  };
}
