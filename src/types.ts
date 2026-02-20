// ═══════════════════════════════════════════════════
//  D U D E  S I M U L A T O R  —  Types & Constants
// ═══════════════════════════════════════════════════

// ── Stats ────────────────────────────────────────

export interface DudeStats {
  energy: number;
  hunger: number;
  thirst: number;
  fun: number;
  hygiene: number;
  social: number;
}

export const STAT_KEYS: (keyof DudeStats)[] = ['energy', 'hunger', 'thirst', 'fun', 'hygiene', 'social'];

export const STAT_DECAY: DudeStats = {
  energy: -0.15,
  hunger: -0.12,
  thirst: -0.20,
  fun: -0.10,
  hygiene: -0.05,
  social: -0.04,
};

export const STAT_WEIGHTS: DudeStats = {
  energy: 1.2,
  hunger: 1.1,
  thirst: 1.0,
  fun: 0.9,
  hygiene: 0.7,
  social: 0.6,
};

// ── Mood ─────────────────────────────────────────

export const MOOD_FACES = [
  { min: 80, face: '(^ . ^)', label: 'Great' },
  { min: 60, face: '(• ‿ •)', label: 'Good' },
  { min: 40, face: '(• _ •)', label: 'Okay' },
  { min: 20, face: '(• . •)', label: 'Meh' },
  { min: 0,  face: '(x _ x)', label: 'Bad' },
];

// ── Room Layout (20x16) ─────────────────────────

export const ROOM_WIDTH = 20;
export const ROOM_HEIGHT = 16;
export const TILE_SIZE = 32;

export type TileType =
  | 'wall' | 'floor' | 'bed' | 'couch' | 'tv' | 'table'
  | 'sink' | 'kitchen' | 'plant' | 'yoga_mat' | 'desk'
  | 'bookshelf' | 'cat_bed' | 'shower' | 'door' | 'window';

// Room grid: # = wall, . = floor, named objects placed on top
// Row 0-15 (top to bottom), Col 0-19 (left to right)
export const ROOM_LAYOUT: TileType[][] = [
  // Row 0: top wall
  ['wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'],
  // Row 1: window + bed
  ['wall','window','window','window','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','bed','bed','bed','bed','wall'],
  // Row 2: window + bed
  ['wall','window','window','window','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','bed','bed','bed','bed','wall'],
  // Row 3: open
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  // Row 4: TV + table
  ['wall','floor','tv','floor','floor','floor','floor','floor','floor','table','table','table','table','floor','floor','floor','floor','floor','floor','wall'],
  // Row 5: open
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  // Row 6: couch
  ['wall','floor','floor','floor','couch','couch','couch','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  // Row 7: open
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  // Row 8: plant + yoga
  ['wall','floor','plant','floor','floor','floor','floor','floor','yoga_mat','yoga_mat','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  // Row 9: open
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  // Row 10: sink + kitchen
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','sink','floor','kitchen','floor','floor','wall'],
  // Row 11: kitchen area
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','kitchen','kitchen','kitchen','floor','wall'],
  // Row 12: cat bed
  ['wall','floor','cat_bed','cat_bed','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  // Row 13: open
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  // Row 14: bookshelf + desk
  ['wall','floor','bookshelf','bookshelf','floor','floor','floor','floor','floor','floor','floor','floor','desk','desk','desk','floor','floor','floor','floor','wall'],
  // Row 15: bottom wall with door + shower
  ['wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','door','door','wall','wall','wall','wall','shower','wall'],
];

// ── Object Interaction Tiles ─────────────────────
// Where the dude stands to interact with an object

export interface ObjectLocation {
  type: TileType;
  interactX: number;
  interactY: number;
}

export const OBJECT_LOCATIONS: Record<string, ObjectLocation> = {
  bed:       { type: 'bed',       interactX: 14, interactY: 1 },
  couch:     { type: 'couch',     interactX: 5,  interactY: 5 },
  tv:        { type: 'tv',        interactX: 2,  interactY: 3 },
  table:     { type: 'table',     interactX: 10, interactY: 3 },
  sink:      { type: 'sink',      interactX: 14, interactY: 9 },
  kitchen:   { type: 'kitchen',   interactX: 16, interactY: 9 },
  plant:     { type: 'plant',     interactX: 2,  interactY: 7 },
  yoga_mat:  { type: 'yoga_mat',  interactX: 9,  interactY: 7 },
  desk:      { type: 'desk',      interactX: 13, interactY: 13 },
  bookshelf: { type: 'bookshelf', interactX: 3,  interactY: 13 },
  cat_bed:   { type: 'cat_bed',   interactX: 3,  interactY: 11 },
  shower:    { type: 'shower',    interactX: 17, interactY: 14 },
  window:    { type: 'window',    interactX: 1,  interactY: 3 },
  door:      { type: 'door',      interactX: 12, interactY: 14 },
  center:    { type: 'floor',     interactX: 10, interactY: 8 },
  open_area: { type: 'floor',     interactX: 8,  interactY: 5 },
};

// ── Activities ───────────────────────────────────

export interface ActivityDef {
  name: string;
  object: string;         // key into OBJECT_LOCATIONS
  durationTicks: number;  // at 3s/tick
  effects: Partial<DudeStats>;
  description: string;
  emoji: string;
}

// Duration in ticks (1 tick = 3s)
function sToTicks(s: number): number {
  return Math.round(s / 3);
}

export const ACTIVITIES: Record<string, ActivityDef> = {
  sleep:        { name: 'Sleep',         object: 'bed',       durationTicks: sToTicks(30), effects: { energy: 60 },               description: 'Sleeping in bed',        emoji: '💤' },
  nap:          { name: 'Nap',           object: 'couch',     durationTicks: sToTicks(15), effects: { energy: 25 },               description: 'Napping on couch',       emoji: '😴' },
  play_games:   { name: 'Play Games',    object: 'tv',        durationTicks: sToTicks(20), effects: { fun: 40 },                  description: 'Playing video games',    emoji: '🎮' },
  watch_tv:     { name: 'Watch TV',      object: 'couch',     durationTicks: sToTicks(15), effects: { fun: 20 },                  description: 'Watching TV',            emoji: '📺' },
  drink_water:  { name: 'Drink Water',   object: 'sink',      durationTicks: sToTicks(5),  effects: { thirst: 30 },               description: 'Drinking water',         emoji: '🚰' },
  cook_food:    { name: 'Cook Food',     object: 'kitchen',   durationTicks: sToTicks(20), effects: {},                           description: 'Cooking food',           emoji: '🍳' },
  eat_food:     { name: 'Eat Food',      object: 'table',     durationTicks: sToTicks(10), effects: { hunger: 35 },               description: 'Eating food',            emoji: '🍽️' },
  water_plant:  { name: 'Water Plant',   object: 'plant',     durationTicks: sToTicks(8),  effects: { social: 10 },               description: 'Watering the plant',     emoji: '🌱' },
  play_music:   { name: 'Play Music',    object: 'desk',      durationTicks: sToTicks(15), effects: { fun: 30 },                  description: 'Playing music',          emoji: '🎵' },
  read_book:    { name: 'Read Book',     object: 'bookshelf', durationTicks: sToTicks(20), effects: { fun: 25 },                  description: 'Reading a book',         emoji: '📖' },
  exercise:     { name: 'Exercise',      object: 'yoga_mat',  durationTicks: sToTicks(15), effects: { fun: 15, energy: -20 },     description: 'Exercising',             emoji: '🏋️' },
  look_outside: { name: 'Look Outside',  object: 'window',    durationTicks: sToTicks(10), effects: { social: 15 },               description: 'Looking out the window', emoji: '🪟' },
  pet_cat:      { name: 'Pet Cat',       object: 'cat_bed',   durationTicks: sToTicks(12), effects: { social: 25, fun: 20 },      description: 'Petting the cat',        emoji: '🐱' },
  take_shower:  { name: 'Take Shower',   object: 'shower',    durationTicks: sToTicks(12), effects: { hygiene: 50 },              description: 'Taking a shower',        emoji: '🚿' },
  meditate:     { name: 'Meditate',      object: 'yoga_mat',  durationTicks: sToTicks(15), effects: { energy: 10, social: 10 },   description: 'Meditating',             emoji: '🧘' },
  dance:        { name: 'Dance',         object: 'open_area', durationTicks: sToTicks(10), effects: { fun: 35 },                  description: 'Dancing',                emoji: '💃' },
  clean_room:   { name: 'Clean Room',    object: 'center',    durationTicks: sToTicks(15), effects: { hygiene: 20 },              description: 'Cleaning the room',      emoji: '🧹' },
  journal:      { name: 'Journal',       object: 'desk',      durationTicks: sToTicks(15), effects: { social: 20 },               description: 'Writing in journal',     emoji: '📝' },
  stretch:      { name: 'Stretch',       object: 'yoga_mat',  durationTicks: sToTicks(8),  effects: { energy: 5 },                description: 'Stretching',             emoji: '🤸' },
  sit_on_couch: { name: 'Sit on Couch',  object: 'couch',     durationTicks: sToTicks(10), effects: { energy: 10 },               description: 'Sitting on the couch',   emoji: '🛋️' },
};

// ── Dude State ───────────────────────────────────

export interface DudeState {
  name: string;
  x: number;
  y: number;
  stats: DudeStats;
  currentActivity: string | null;
  activityProgress: number;    // ticks elapsed
  activityDuration: number;    // total ticks needed
  targetX: number | null;
  targetY: number | null;
  path: { x: number; y: number }[];
  musicUrl: string | null;
  collapsed: boolean;
}

// ── Cat State ────────────────────────────────────

export type CatBehavior = 'wander' | 'sit' | 'follow' | 'sleep' | 'desk';

export interface CatState {
  x: number;
  y: number;
  behavior: CatBehavior;
  ticksUntilChange: number;
}

// ── Event Log ────────────────────────────────────

export interface GameEvent {
  time: number;
  message: string;
  emoji: string;
}

// ── Full Game State (sent over WebSocket) ────────

export interface FullGameState {
  dude: DudeState;
  cat: CatState;
  mood: number;
  moodFace: string;
  moodLabel: string;
  events: GameEvent[];
  journalEntries: { entry: string; time: number }[];
  tick: number;
  depletedStats: (keyof DudeStats)[];
}

// ── Walkable check ───────────────────────────────

export function isWalkable(x: number, y: number): boolean {
  if (x < 0 || x >= ROOM_WIDTH || y < 0 || y >= ROOM_HEIGHT) return false;
  const tile = ROOM_LAYOUT[y][x];
  return tile !== 'wall';
}
