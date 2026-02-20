// ═══════════════════════════════════════════════════
//  D U D E  S I M U L A T O R  —  Client
// ═══════════════════════════════════════════════════

const TILE = 32;
const COLS = 20;
const ROWS = 16;
const canvas = document.getElementById('room');
const ctx = canvas.getContext('2d');

let state = null;
let animFrame = 0;

// ── Room base layer (walls and floors only) ──────

const ROOM_LAYOUT = [
  ['wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall'],
  ['wall','window','window','window','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','bed','bed','bed','bed','wall'],
  ['wall','window','window','window','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','bed','bed','bed','bed','wall'],
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  ['wall','floor','tv','floor','floor','floor','floor','floor','floor','table','table','table','table','floor','floor','floor','floor','floor','floor','wall'],
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  ['wall','floor','floor','floor','couch','couch','couch','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  ['wall','floor','plant','floor','floor','floor','floor','floor','yoga_mat','yoga_mat','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','sink','floor','kitchen','floor','floor','wall'],
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','kitchen','kitchen','kitchen','floor','wall'],
  ['wall','floor','cat_bed','cat_bed','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  ['wall','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','floor','wall'],
  ['wall','floor','bookshelf','bookshelf','floor','floor','floor','floor','floor','floor','floor','floor','desk','desk','desk','floor','floor','floor','floor','wall'],
  ['wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','wall','door','door','wall','wall','wall','wall','shower','wall'],
];

// ── Multi-tile furniture definitions ─────────────
// Each has: id, top-left tile (tx,ty), width/height in tiles,
// and a draw function receiving pixel coords + pixel dimensions.

const FURNITURE = [
  { id: 'window',    tx: 1,  ty: 1,  tw: 3, th: 2, draw: drawWindowSprite },
  { id: 'bed',       tx: 15, ty: 1,  tw: 4, th: 2, draw: drawBedSprite },
  { id: 'table',     tx: 9,  ty: 4,  tw: 4, th: 1, draw: drawTableSprite },
  { id: 'couch',     tx: 4,  ty: 6,  tw: 3, th: 1, draw: drawCouchSprite },
  { id: 'yoga_mat',  tx: 8,  ty: 8,  tw: 2, th: 1, draw: drawYogaMatSprite },
  { id: 'kitchen',   tx: 14, ty: 10, tw: 5, th: 2, draw: drawKitchenSprite },
  { id: 'cat_bed',   tx: 2,  ty: 12, tw: 2, th: 1, draw: drawCatBedSprite },
  { id: 'bookshelf', tx: 2,  ty: 14, tw: 2, th: 1, draw: drawBookshelfSprite },
  { id: 'desk',      tx: 12, ty: 14, tw: 3, th: 1, draw: drawDeskSprite },
  { id: 'door',      tx: 12, ty: 15, tw: 2, th: 1, draw: drawDoorSprite },
  // Single-tile items (1x1)
  { id: 'tv',        tx: 2,  ty: 4,  tw: 1, th: 1, draw: drawTVSprite },
  { id: 'plant',     tx: 2,  ty: 8,  tw: 1, th: 1, draw: drawPlantSprite },
  { id: 'shower',    tx: 18, ty: 15, tw: 1, th: 1, draw: drawShowerSprite },
];

// Build a set of tiles claimed by furniture so we skip them in base pass
const furnitureTiles = new Set();
for (const f of FURNITURE) {
  for (let dy = 0; dy < f.th; dy++) {
    for (let dx = 0; dx < f.tw; dx++) {
      furnitureTiles.add(`${f.tx + dx},${f.ty + dy}`);
    }
  }
}

// ── Colors ───────────────────────────────────────

const FLOOR_COLOR = '#2c2218';
const WALL_COLOR = '#4a3c2e';
const WALL_TOP = '#5a4c3e';

// ── Drawing Helpers ──────────────────────────────

function R(x, y, w, h, color) {
  if (color) ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ── Room Drawing ─────────────────────────────────

function drawRoom() {
  R(0, 0, COLS * TILE, ROWS * TILE, FLOOR_COLOR);

  // 1) Draw base tiles (walls, floors, skip furniture tiles)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE, py = y * TILE;
      const tile = ROOM_LAYOUT[y][x];

      if (tile === 'wall') {
        drawWall(px, py);
      } else if (!furnitureTiles.has(`${x},${y}`)) {
        drawFloor(px, py);
      } else {
        // Floor under furniture
        drawFloor(px, py);
      }
    }
  }

  // 2) Draw each furniture piece once as a unified sprite
  for (const f of FURNITURE) {
    f.draw(f.tx * TILE, f.ty * TILE, f.tw * TILE, f.th * TILE);
  }
}

function drawFloor(px, py) {
  R(px, py, TILE, TILE, FLOOR_COLOR);
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py + 10); ctx.lineTo(px + TILE, py + 10);
  ctx.moveTo(px, py + 20); ctx.lineTo(px + TILE, py + 20);
  ctx.stroke();
}

function drawWall(px, py) {
  R(px, py, TILE, TILE, WALL_COLOR);
  R(px, py, TILE, 2, WALL_TOP);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
}

// ═══════════════════════════════════════════════════
//  UNIFIED MULTI-TILE SPRITES
// ═══════════════════════════════════════════════════

// ── Window (3x2 tiles = 96x64 px) ───────────────

function drawWindowSprite(px, py, w, h) {
  // Wall surround
  R(px, py, w, h, WALL_COLOR);

  // Outer frame (dark wood)
  R(px + 4, py + 4, w - 8, h - 8, '#2a1f15');

  // Glass area
  const gx = px + 8, gy = py + 8, gw = w - 16, gh = h - 16;

  // Sky gradient (top lighter, bottom darker)
  R(gx, gy, gw, gh, '#3a6a9a');
  R(gx, gy, gw, gh * 0.3, '#5a90c0');
  R(gx, gy, gw, gh * 0.12, '#7ab0d8');

  // Clouds
  R(gx + 8, gy + 8, 18, 6, 'rgba(255,255,255,0.35)');
  R(gx + 12, gy + 5, 10, 5, 'rgba(255,255,255,0.3)');
  R(gx + 50, gy + 14, 14, 5, 'rgba(255,255,255,0.25)');

  // Stars/sun
  R(gx + 70, gy + 6, 4, 4, '#ffe080');
  R(gx + 71, gy + 3, 2, 2, '#ffe080');
  R(gx + 74, gy + 7, 2, 2, '#ffe080');

  // Distant hills at bottom
  R(gx, gy + gh - 12, gw, 12, '#2a5a3a');
  R(gx + 10, gy + gh - 16, 30, 8, '#3a6a4a');
  R(gx + 50, gy + gh - 14, 20, 8, '#2a5a3a');

  // Cross bars (window frame dividers)
  R(px + w/2 - 2, py + 4, 4, h - 8, '#3a2d1e');
  R(px + 4, py + h/2 - 2, w - 8, 4, '#3a2d1e');

  // Inner frame highlight
  ctx.strokeStyle = '#5a4a30';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 5, py + 5, w - 10, h - 10);

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WINDOW', px + w/2, py + h - 3);
  ctx.textAlign = 'left';
}

// ── Bed (4x2 tiles = 128x64 px) ─────────────────

function drawBedSprite(px, py, w, h) {
  // Bed frame (dark wood)
  R(px + 2, py + 4, w - 4, h - 6, '#5a3a2a');

  // Headboard (left side since bed is landscape)
  R(px + w - 10, py + 2, 10, h - 4, '#6a4a30');
  R(px + w - 8, py + 4, 6, h - 8, '#7a5a40');

  // Mattress
  R(px + 4, py + 8, w - 16, h - 14, '#7b68ee');

  // Sheet/blanket (covers most of mattress)
  R(px + 4, py + 18, w - 16, h - 24, '#6a5acd');
  // Blanket fold line
  R(px + 4, py + 18, w - 16, 3, '#8a7ae0');

  // Pillows (at headboard end)
  R(px + w - 38, py + 10, 16, h - 24, '#e8e0f0');
  R(px + w - 36, py + 12, 12, h - 28, '#fff');
  R(px + w - 22, py + 11, 14, h - 26, '#e8e0f0');
  R(px + w - 20, py + 13, 10, h - 30, '#fff');

  // Blanket wrinkle details
  ctx.strokeStyle = 'rgba(90, 70, 180, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 20, py + 25); ctx.lineTo(px + 50, py + 28);
  ctx.moveTo(px + 10, py + 35); ctx.lineTo(px + 40, py + 33);
  ctx.stroke();

  // Footboard (smaller)
  R(px, py + 6, 4, h - 10, '#6a4a30');

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BED', px + w/2, py + h - 2);
  ctx.textAlign = 'left';
}

// ── Table (4x1 tiles = 128x32 px) ───────────────

function drawTableSprite(px, py, w, h) {
  // Legs (4 legs)
  R(px + 4, py + 18, 5, 14, '#8a6a3a');
  R(px + 30, py + 20, 5, 12, '#8a6a3a');
  R(px + w - 35, py + 20, 5, 12, '#8a6a3a');
  R(px + w - 9, py + 18, 5, 14, '#8a6a3a');

  // Table surface (thick wood top)
  R(px + 2, py + 6, w - 4, 14, '#deb887');
  R(px + 2, py + 6, w - 4, 4, '#d2a86e');
  // Edge shadow
  R(px + 2, py + 18, w - 4, 2, '#b89860');

  // Items on table
  // Plate
  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  ctx.ellipse(px + 30, py + 12, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cup
  R(px + 70, py + 8, 7, 9, '#8ab4d0');
  R(px + 71, py + 9, 5, 6, '#a0c8e0');
  // Napkin
  R(px + 96, py + 9, 12, 8, '#f0e0e0');

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TABLE', px + w/2, py + h - 1);
  ctx.textAlign = 'left';
}

// ── Couch (3x1 tiles = 96x32 px) ────────────────

function drawCouchSprite(px, py, w, h) {
  // Back rest
  R(px + 2, py + 2, w - 4, 10, '#8a5a30');
  R(px + 4, py + 3, w - 8, 8, '#9a6a3a');

  // Seat base
  R(px + 2, py + 10, w - 4, 16, '#b87a40');

  // Cushions (3 distinct cushions)
  const cw = (w - 16) / 3;
  for (let i = 0; i < 3; i++) {
    const cx = px + 6 + i * (cw + 1);
    R(cx, py + 12, cw - 1, 12, '#d49a58');
    R(cx + 2, py + 13, cw - 5, 9, '#daa868');
    // Cushion stitch line
    R(cx + cw/2 - 1, py + 14, 1, 8, '#c08a48');
  }

  // Arm rests
  R(px, py + 2, 5, h - 6, '#7a4a20');
  R(px + 1, py + 3, 3, h - 8, '#8a5a30');
  R(px + w - 5, py + 2, 5, h - 6, '#7a4a20');
  R(px + w - 4, py + 3, 3, h - 8, '#8a5a30');

  // Throw pillow on left
  R(px + 8, py + 6, 14, 12, '#d45050');
  R(px + 9, py + 7, 12, 10, '#e06060');

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('COUCH', px + w/2, py + h - 1);
  ctx.textAlign = 'left';
}

// ── Yoga Mat (2x1 tiles = 64x32 px) ─────────────

function drawYogaMatSprite(px, py, w, h) {
  // Mat body (rolled-out rectangle)
  R(px + 2, py + 6, w - 4, h - 12, '#9370db');
  R(px + 3, py + 7, w - 6, h - 14, '#8060cb');

  // Center stripe
  R(px + 4, py + h/2 - 1, w - 8, 2, '#a080e0');

  // Rolled end (left)
  ctx.fillStyle = '#7a5ab8';
  ctx.beginPath();
  ctx.ellipse(px + 4, py + h/2, 4, (h - 12)/2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a4aa8';
  ctx.beginPath();
  ctx.ellipse(px + 4, py + h/2, 2, (h - 16)/2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle pattern dots
  for (let i = 0; i < 4; i++) {
    R(px + 16 + i * 12, py + 10, 2, 2, 'rgba(255,255,255,0.1)');
    R(px + 22 + i * 12, py + 18, 2, 2, 'rgba(255,255,255,0.1)');
  }

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('YOGA', px + w/2, py + h - 1);
  ctx.textAlign = 'left';
}

// ── Kitchen + Sink (5x2 tiles = 160x64 px) ──────
// Covers: sink at (14,10), floor at (15,10), kitchen at (16,10),
//         floor at (14,11), kitchen at (15-17,11)
// We draw the whole kitchen area as an L-shaped counter.

function drawKitchenSprite(px, py, w, h) {
  const T = TILE;

  // -- Sink (tile 0,0 = col 14, row 10) --
  const sx = px, sy = py;
  // Counter
  R(sx + 2, sy + 4, T - 4, T - 6, '#708090');
  // Basin
  R(sx + 6, sy + 8, T - 12, T - 14, '#4a5a6a');
  // Faucet
  R(sx + T/2 - 2, sy + 4, 4, 6, '#b0b8c0');
  R(sx + T/2 - 1, sy + 3, 2, 3, '#d0d8e0');
  // Water drop
  if (animFrame % 80 < 12) {
    R(sx + T/2, sy + 12, 2, 3, '#6aafdf');
  }
  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SINK', sx + T/2, sy + T - 2);

  // -- Floor gap at (15,10) stays as floor (already drawn) --

  // -- Stove top (tile 2,0 = col 16, row 10) --
  const stx = px + 2 * T, sty = py;
  R(stx + 1, sty + 1, T - 2, T - 2, '#606a70');
  R(stx + 2, sty + 2, T - 4, T - 4, '#505a60');
  // Burners
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(stx + 10, sty + 10, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(stx + 22, sty + 10, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(stx + 10, sty + 22, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(stx + 22, sty + 22, 5, 0, Math.PI * 2); ctx.fill();
  // Burner grates
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  for (const [bx, by] of [[10,10],[22,10],[10,22],[22,22]]) {
    ctx.beginPath();
    ctx.moveTo(stx + bx - 3, sty + by); ctx.lineTo(stx + bx + 3, sty + by);
    ctx.moveTo(stx + bx, sty + by - 3); ctx.lineTo(stx + bx, sty + by + 3);
    ctx.stroke();
  }

  // -- Bottom counter row (tiles at row 11, cols 15-17 = offsets 1-3, y=1) --
  const cy = py + T;

  // Counter surface spanning 3 tiles
  for (let i = 1; i <= 3; i++) {
    const cx = px + i * T;
    R(cx + 1, cy + 1, T - 2, T - 2, '#606a70');
    R(cx + 2, cy + 2, T - 4, T - 4, '#505a60');
  }

  // Oven (center of bottom row)
  const ox = px + 2 * T;
  R(ox + 3, cy + 4, T - 6, T - 8, '#404850');
  R(ox + 5, cy + 6, T - 10, T - 14, '#353e45');
  // Oven handle
  R(ox + 8, cy + 3, T - 16, 2, '#999');
  // Oven window
  R(ox + 8, cy + 10, T - 16, 8, '#2a3540');
  // Oven light
  R(ox + 10, cy + 12, 4, 4, 'rgba(255, 160, 50, 0.3)');

  // Drawers on left counter
  const dlx = px + 1 * T;
  R(dlx + 4, cy + 6, T - 8, 8, '#4a5560');
  R(dlx + 8, cy + 9, T - 16, 2, '#888');
  R(dlx + 4, cy + 18, T - 8, 8, '#4a5560');
  R(dlx + 8, cy + 21, T - 16, 2, '#888');

  // Cabinet on right counter
  const drx = px + 3 * T;
  R(drx + 4, cy + 4, T - 8, T - 8, '#4a5560');
  R(drx + 6, cy + 6, T - 12, T - 12, '#404850');
  R(drx + T/2 - 1, cy + 6, 2, T - 12, '#555');

  // "KITCHEN" label on countertop
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KITCHEN', px + 2 * T + T/2, cy + T - 2);
  ctx.textAlign = 'left';
}

// ── Cat Bed (2x1 tiles = 64x32 px) ──────────────

function drawCatBedSprite(px, py, w, h) {
  // Outer rim (oval-ish basket)
  ctx.fillStyle = '#8b5a30';
  ctx.beginPath();
  ctx.ellipse(px + w/2, py + h/2 + 2, w/2 - 4, h/2 - 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner cushion
  ctx.fillStyle = '#cd8a5a';
  ctx.beginPath();
  ctx.ellipse(px + w/2, py + h/2 + 2, w/2 - 8, h/2 - 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft center
  ctx.fillStyle = '#daa07a';
  ctx.beginPath();
  ctx.ellipse(px + w/2, py + h/2 + 2, w/2 - 14, h/2 - 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Paw print detail
  R(px + w/2 - 3, py + h/2, 2, 2, 'rgba(139, 90, 48, 0.3)');
  R(px + w/2 + 2, py + h/2 - 1, 2, 2, 'rgba(139, 90, 48, 0.3)');

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CAT BED', px + w/2, py + h - 1);
  ctx.textAlign = 'left';
}

// ── Bookshelf (2x1 tiles = 64x32 px) ────────────

function drawBookshelfSprite(px, py, w, h) {
  // Wooden frame
  R(px + 2, py + 1, w - 4, h - 2, '#5a3a18');

  // Back panel
  R(px + 4, py + 2, w - 8, h - 4, '#4a2e10');

  // Shelf divider (middle)
  R(px + 3, py + h/2 - 1, w - 6, 3, '#6a4a28');

  // Top shelf books (taller, varied)
  const topBooks = [
    { color: '#d45050', w: 5, h: 11 },
    { color: '#4488cc', w: 6, h: 13 },
    { color: '#6bbf59', w: 4, h: 10 },
    { color: '#e8c94a', w: 7, h: 12 },
    { color: '#9370db', w: 5, h: 11 },
    { color: '#daa06d', w: 6, h: 13 },
    { color: '#5bc0de', w: 5, h: 10 },
    { color: '#f0ad4e', w: 4, h: 12 },
  ];
  let bx = px + 5;
  for (const book of topBooks) {
    if (bx + book.w > px + w - 5) break;
    R(bx, py + h/2 - 2 - book.h, book.w, book.h, book.color);
    bx += book.w + 1;
  }

  // Bottom shelf books (shorter)
  const botBooks = [
    { color: '#e06060', w: 6, h: 9 },
    { color: '#6a9fd8', w: 5, h: 10 },
    { color: '#50b860', w: 7, h: 8 },
    { color: '#d8a030', w: 5, h: 11 },
    { color: '#b060c0', w: 4, h: 9 },
    { color: '#70c0a0', w: 6, h: 10 },
    { color: '#e07050', w: 5, h: 8 },
  ];
  bx = px + 5;
  for (const book of botBooks) {
    if (bx + book.w > px + w - 5) break;
    R(bx, py + h - 3 - book.h, book.w, book.h, book.color);
    bx += book.w + 1;
  }

  // Side frame edges
  R(px + 2, py + 1, 2, h - 2, '#6a4a28');
  R(px + w - 4, py + 1, 2, h - 2, '#6a4a28');

  // Top/bottom frame
  R(px + 2, py + 1, w - 4, 2, '#6a4a28');
  R(px + 2, py + h - 3, w - 4, 2, '#6a4a28');

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BOOKS', px + w/2, py + h - 1);
  ctx.textAlign = 'left';
}

// ── Desk (3x1 tiles = 96x32 px) ─────────────────

function drawDeskSprite(px, py, w, h) {
  // Legs
  R(px + 4, py + 18, 4, 14, '#6a3a10');
  R(px + w - 8, py + 18, 4, 14, '#6a3a10');
  // Middle support bar
  R(px + 8, py + 26, w - 16, 3, '#5a3010');

  // Desktop surface
  R(px + 1, py + 6, w - 2, 14, '#a0522d');
  R(px + 1, py + 6, w - 2, 4, '#8b4513');
  // Edge
  R(px + 1, py + 18, w - 2, 2, '#7a3a10');

  // Monitor
  R(px + 20, py - 2, 28, 20, '#222');
  R(px + 22, py, 24, 15, '#3a6a9a');
  // Screen content (code lines)
  for (let i = 0; i < 4; i++) {
    R(px + 24, py + 2 + i * 3, 10 + (i % 3) * 4, 1, 'rgba(100,200,100,0.4)');
  }
  // Monitor stand
  R(px + 30, py + 16, 12, 3, '#333');
  R(px + 28, py + 18, 16, 2, '#444');

  // Keyboard
  R(px + 22, py + 10, 26, 7, '#333');
  R(px + 23, py + 11, 24, 5, '#444');
  // Key rows
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 8; k++) {
      R(px + 24 + k * 3, py + 12 + row * 2, 2, 1, '#555');
    }
  }

  // Lamp (left side)
  R(px + 8, py + 2, 2, 10, '#888');
  R(px + 5, py, 8, 4, '#e8c94a');
  R(px + 6, py + 1, 6, 2, '#ffd860');

  // Coffee mug (right side)
  R(px + w - 18, py + 9, 8, 9, '#c06040');
  R(px + w - 17, py + 10, 6, 6, '#d07050');
  // Handle
  R(px + w - 10, py + 11, 3, 5, '#c06040');

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DESK', px + w/2, py + h - 1);
  ctx.textAlign = 'left';
}

// ── Door (2x1 tiles = 64x32 px) ─────────────────

function drawDoorSprite(px, py, w, h) {
  // Door frame
  R(px + 2, py, w - 4, h, '#5a3a18');

  // Door panels
  R(px + 5, py + 2, w/2 - 5, h - 4, '#7a5230');
  R(px + w/2 + 1, py + 2, w/2 - 5, h - 4, '#7a5230');

  // Panel insets
  R(px + 7, py + 4, w/2 - 9, 8, '#6a4828');
  R(px + 7, py + 16, w/2 - 9, 10, '#6a4828');
  R(px + w/2 + 3, py + 4, w/2 - 9, 8, '#6a4828');
  R(px + w/2 + 3, py + 16, w/2 - 9, 10, '#6a4828');

  // Center seam
  R(px + w/2 - 1, py + 1, 2, h - 2, '#4a2a10');

  // Door handles
  R(px + w/2 - 5, py + h/2 - 1, 3, 3, '#d4a840');
  R(px + w/2 + 2, py + h/2 - 1, 3, 3, '#d4a840');

  // Welcome mat hint
  R(px + 8, py + h - 3, w - 16, 2, '#6a5a3a');
}

// ── Single-tile sprites ──────────────────────────

function drawTVSprite(px, py) {
  const w = TILE, h = TILE;
  // Stand
  R(px + 10, py + 24, 12, 6, '#333');
  R(px + 8, py + 28, 16, 3, '#444');
  // TV body
  R(px + 2, py + 4, w - 4, 22, '#1a1a1a');
  // Screen
  const flicker = Math.sin(animFrame * 0.1) * 10;
  R(px + 4, py + 6, w - 8, 18, `rgb(${60 + flicker},${130 + flicker},${200 + flicker})`);
  // Screen reflection
  R(px + 5, py + 7, 6, 3, 'rgba(255,255,255,0.25)');
  // Bezel bottom
  R(px + 2, py + 24, w - 4, 2, '#2a2a2a');
  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TV', px + w/2, py + h - 1);
  ctx.textAlign = 'left';
}

function drawPlantSprite(px, py) {
  const w = TILE, h = TILE;
  // Pot
  R(px + 8, py + 20, 16, 10, '#a0522d');
  R(px + 6, py + 19, 20, 3, '#b05a32');
  R(px + 10, py + 28, 12, 3, '#8a4220');
  // Dirt
  R(px + 9, py + 19, 14, 2, '#4a2a10');
  // Stem
  R(px + 14, py + 10, 3, 10, '#2d7a2d');
  // Branch
  R(px + 11, py + 13, 4, 2, '#2d7a2d');
  R(px + 18, py + 11, 4, 2, '#2d7a2d');
  // Leaves (clusters)
  R(px + 8, py + 4, 10, 10, '#2e8b57');
  R(px + 16, py + 6, 8, 8, '#3a9b5a');
  R(px + 5, py + 8, 7, 7, '#3a9b5a');
  R(px + 12, py + 1, 7, 6, '#45a968');
  // Highlights
  R(px + 10, py + 5, 2, 2, '#5ab878');
  R(px + 18, py + 8, 2, 2, '#5ab878');
}

function drawShowerSprite(px, py) {
  const w = TILE, h = TILE;
  // Glass enclosure
  R(px + 1, py + 1, w - 2, h - 2, '#4a8a8c');
  R(px + 3, py + 3, w - 6, h - 6, '#5a9ea0');
  // Tile pattern
  for (let ty = 0; ty < 3; ty++) {
    for (let tx = 0; tx < 3; tx++) {
      R(px + 4 + tx * 8, py + 4 + ty * 8, 7, 7, ty % 2 === tx % 2 ? '#5f9ea0' : '#58928f');
    }
  }
  // Shower head (top)
  R(px + w/2 - 5, py + 2, 10, 4, '#c0c0c0');
  R(px + w/2 - 3, py + 5, 6, 2, '#aaa');
  // Water drops
  for (let i = 0; i < 4; i++) {
    const dx = px + 8 + i * 5;
    const dy = py + 8 + (animFrame * 2 + i * 7) % 18;
    R(dx, dy, 1, 3, 'rgba(150,210,255,0.5)');
  }
  // Drain
  R(px + w/2 - 3, py + h - 5, 6, 3, '#3a6a6c');
  ctx.fillStyle = '#2a5a5c';
  ctx.beginPath();
  ctx.arc(px + w/2, py + h - 4, 2, 0, Math.PI * 2);
  ctx.fill();
}

// ═══════════════════════════════════════════════════
//  DUDE & CAT SPRITES (unchanged from before)
// ═══════════════════════════════════════════════════

function drawDude(x, y) {
  const px = x * TILE;
  const py = y * TILE;
  const isWalking = state && state.dude.path && state.dude.path.length > 0;
  const isSleeping = state && (state.dude.currentActivity === 'sleep' || state.dude.currentActivity === 'nap');
  const bob = isWalking ? Math.sin(animFrame * 0.3) * 2 : 0;
  const by = Math.round(bob);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 30, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#3a5a3a';
  if (isWalking) {
    const leg = Math.sin(animFrame * 0.4) * 3;
    R(px + 9, py + 24 + by, 5, 6 - leg);
    R(px + 18, py + 24 + by, 5, 6 + leg);
  } else {
    R(px + 9, py + 24, 5, 6);
    R(px + 18, py + 24, 5, 6);
  }

  // Shoes
  ctx.fillStyle = '#4a3020';
  R(px + 8, py + 28 + by, 6, 3);
  R(px + 17, py + 28 + by, 6, 3);

  // Body (t-shirt)
  ctx.fillStyle = '#4a80b8';
  R(px + 7, py + 14 + by, 18, 12);
  R(px + 4, py + 14 + by, 4, 10);
  R(px + 24, py + 14 + by, 4, 10);
  // Hands
  ctx.fillStyle = '#e8c090';
  R(px + 4, py + 23 + by, 4, 3);
  R(px + 24, py + 23 + by, 4, 3);

  // Head
  ctx.fillStyle = '#e8c090';
  R(px + 9, py + 4 + by, 14, 12);

  // Hair
  ctx.fillStyle = '#5a3a2a';
  R(px + 8, py + 2 + by, 16, 5);
  R(px + 8, py + 4 + by, 2, 4);
  R(px + 22, py + 4 + by, 2, 4);

  // Eyes
  if (isSleeping) {
    ctx.fillStyle = '#5a3a2a';
    R(px + 12, py + 9 + by, 3, 1);
    R(px + 18, py + 9 + by, 3, 1);
  } else {
    ctx.fillStyle = '#fff';
    R(px + 11, py + 8 + by, 4, 3);
    R(px + 17, py + 8 + by, 4, 3);
    ctx.fillStyle = '#1a1a1a';
    R(px + 12, py + 8 + by, 2, 3);
    R(px + 19, py + 8 + by, 2, 3);
  }

  // Mouth
  R(px + 14, py + 12 + by, 4, 1, '#c09070');

  // Name label
  ctx.fillStyle = 'rgba(244, 162, 97, 0.8)';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  if (state) ctx.fillText(state.dude.name, px + 16, py - 2);
  ctx.textAlign = 'left';

  // Activity effects
  if (state && state.dude.currentActivity && state.dude.path.length === 0) {
    drawActivityEffects(px, py + by);
  }
}

function drawCat(x, y, behavior) {
  const px = x * TILE;
  const py = y * TILE;
  const isSleeping = behavior === 'sleep';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(px + 14, py + 28, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  const tw = Math.sin(animFrame * 0.12) * 3;
  R(px + 24, py + 16 + tw, 4, 3, '#e8a830');
  R(px + 26, py + 14 + tw, 4, 3, '#e8a830');
  R(px + 28, py + 12 + tw, 3, 3, '#e8a830');

  // Body
  R(px + 6, py + 16, 20, 10, '#e8a830');
  // Stripes
  R(px + 10, py + 17, 2, 8, '#c88810');
  R(px + 16, py + 17, 2, 8, '#c88810');
  R(px + 22, py + 17, 2, 8, '#c88810');
  // Paws
  R(px + 6, py + 24, 5, 4, '#f0c860');
  R(px + 17, py + 24, 5, 4, '#f0c860');

  // Head
  R(px + 4, py + 8, 16, 12, '#e8a830');
  // Ears
  ctx.fillStyle = '#e8a830';
  ctx.beginPath(); ctx.moveTo(px+4,py+10); ctx.lineTo(px+7,py+3); ctx.lineTo(px+11,py+8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(px+12,py+10); ctx.lineTo(px+15,py+3); ctx.lineTo(px+19,py+8); ctx.fill();
  ctx.fillStyle = '#ffb8b8';
  ctx.beginPath(); ctx.moveTo(px+6,py+9); ctx.lineTo(px+7,py+5); ctx.lineTo(px+10,py+8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(px+13,py+9); ctx.lineTo(px+15,py+5); ctx.lineTo(px+17,py+8); ctx.fill();

  // Eyes
  if (!isSleeping) {
    R(px+6,py+12,4,3,'#2a8a2a'); R(px+13,py+12,4,3,'#2a8a2a');
    R(px+7,py+12,2,3,'#111'); R(px+14,py+12,2,3,'#111');
  } else {
    ctx.strokeStyle='#333'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(px+6,py+13); ctx.lineTo(px+10,py+13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px+13,py+13); ctx.lineTo(px+17,py+13); ctx.stroke();
  }

  // Nose
  R(px+10,py+15,3,2,'#ff9090');

  // Whiskers
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(px+4,py+14); ctx.lineTo(px-2,py+12);
  ctx.moveTo(px+4,py+16); ctx.lineTo(px-2,py+17);
  ctx.moveTo(px+19,py+14); ctx.lineTo(px+26,py+12);
  ctx.moveTo(px+19,py+16); ctx.lineTo(px+26,py+17);
  ctx.stroke();

  ctx.fillStyle = 'rgba(232,168,48,0.7)';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(isSleeping ? 'zzz' : 'meow', px + 14, py + 1);
  ctx.textAlign = 'left';
}

// ═══════════════════════════════════════════════════
//  ACTIVITY EFFECTS (unchanged)
// ═══════════════════════════════════════════════════

function drawActivityEffects(px, py) {
  if (!state) return;
  const act = state.dude.currentActivity;
  const t = animFrame;

  switch (act) {
    case 'sleep': case 'nap':
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(180,180,255,${0.9-i*0.25})`;
        ctx.font = `bold ${12+i*3}px monospace`;
        ctx.fillText('Z', px+22+i*8, py-6-i*10-Math.sin(t*0.06+i)*4);
      }
      break;
    case 'play_music': case 'dance':
      for (let i = 0; i < 5; i++) {
        const alpha = 1 - ((t*0.4+i*10)%35)/35;
        ctx.fillStyle = `rgba(244,162,97,${alpha})`;
        ctx.font = 'bold 14px serif';
        ctx.fillText(i%3===0?'♪':i%3===1?'♫':'♩', px+6+Math.sin(t*0.05+i*1.3)*18, py-4-(t*0.4+i*10)%35);
      }
      break;
    case 'cook_food':
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(220,220,220,${0.6-i*0.12})`;
        ctx.beginPath();
        ctx.arc(px+10+Math.sin(t*0.04+i*0.8)*8, py-4-i*7-(t*0.2)%14, 4+i*2, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    case 'pet_cat':
      for (let i = 0; i < 4; i++) {
        const alpha = 1-((t*0.15+i*4)%18)/18;
        ctx.fillStyle = `rgba(240,70,70,${alpha})`;
        ctx.font = '12px serif';
        ctx.fillText('\u2764', px+4+Math.sin(t*0.07+i*1.5)*14, py-8-i*9-(t*0.15)%18);
      }
      break;
    case 'meditate':
      for (let i = 0; i < 6; i++) {
        const angle = t*0.025+i*Math.PI*2/6;
        const r = 18+Math.sin(t*0.04)*4;
        const bright = 0.5+Math.sin(t*0.08+i)*0.4;
        R(px+16+Math.cos(angle)*r-2, py+14+Math.sin(angle)*r*0.6-2, 4, 4, `rgba(200,180,255,${bright})`);
        R(px+16+Math.cos(angle)*r-1, py+14+Math.sin(angle)*r*0.6-1, 2, 2, `rgba(255,255,255,${bright*0.6})`);
      }
      break;
    case 'take_shower':
      for (let i = 0; i < 8; i++) {
        R(px+4+((i*7+t*2)%24), py+4+(t*3+i*11)%28, 2, 4, 'rgba(100,180,240,0.7)');
      }
      break;
    case 'play_games':
      R(px-4, py+4, TILE+8, TILE+4, `rgba(80,200,80,${Math.sin(t*0.15)*0.15+0.15})`);
      break;
    case 'exercise': case 'stretch':
      for (let i = 0; i < 3; i++) {
        R(px+4+i*10, py+2+(t*0.8+i*5)%14, 2, 4, 'rgba(100,190,240,0.8)');
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(px+28,py+6+i*4); ctx.lineTo(px+34,py+4+i*4); ctx.stroke();
      }
      break;
    case 'read_book':
      R(px+6,py+18,12,8,'#d45050'); R(px+8,py+20,8,4,'#f0e0d0');
      if (t%60<10) R(px+16,py+18,2,2,'#fff');
      break;
    case 'drink_water':
      R(px+24,py+14,6,10,'rgba(150,200,250,0.5)'); R(px+25,py+16,4,6,'rgba(100,170,240,0.6)');
      break;
    case 'eat_food':
      ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.ellipse(px+16,py+20,8,4,0,0,Math.PI*2); ctx.fill();
      R(px+12,py+17,8,4,'#c08040');
      break;
    case 'clean_room':
      for (let i = 0; i < 4; i++) {
        R(px+14+Math.sin(t*0.06+i*1.5)*16, py+14+Math.cos(t*0.06+i*1.5)*12, 3, 3,
          `rgba(255,255,200,${0.7+Math.sin(t*0.1+i)*0.3})`);
      }
      break;
    case 'journal': case 'write_journal':
      R(px+22,py+16,2,10,'#333');
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=0.5;
      for (let i = 0; i < (t*0.1)%4; i++) {
        ctx.beginPath(); ctx.moveTo(px+26,py+20+i*3); ctx.lineTo(px+36,py+20+i*3); ctx.stroke();
      }
      break;
    case 'water_plant':
      for (let i = 0; i < 3; i++) {
        R(px+20+i*3, py+14+(t*1.5+i*4)%16, 2, 3, 'rgba(80,160,230,0.7)');
      }
      break;
    case 'look_outside':
      ctx.strokeStyle = 'rgba(180,210,240,0.3)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(px-10+(t*0.3+i*12)%30, py+8+i*6);
        ctx.lineTo(px-2+(t*0.3+i*12)%30, py+6+i*6);
        ctx.stroke();
      }
      break;
    case 'watch_tv': case 'sit_on_couch':
      // Relaxation waves
      for (let i = 0; i < 2; i++) {
        R(px+4+i*16, py-4-Math.sin(t*0.04+i)*3, 3, 3, `rgba(200,200,255,${0.3+Math.sin(t*0.06+i)*0.15})`);
      }
      break;
  }
}

// ── Activity Progress Bar ────────────────────────

function drawActivityProgress() {
  if (!state || !state.dude.currentActivity || state.dude.path.length > 0) return;
  if (state.dude.activityDuration === 0) return;

  const progress = state.dude.activityProgress / state.dude.activityDuration;
  const px = state.dude.x * TILE - 2;
  const py = state.dude.y * TILE - 8;
  const w = TILE + 4;

  R(px, py, w, 5, 'rgba(0,0,0,0.7)');
  ctx.strokeStyle = 'rgba(244,162,97,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(px, py, w, 5);
  R(px + 1, py + 1, (w - 2) * progress, 3, '#f4a261');
}

// ── Main Render Loop ─────────────────────────────

function render() {
  animFrame++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawRoom();

  if (state) {
    if (state.cat.y <= state.dude.y) {
      drawCat(state.cat.x, state.cat.y, state.cat.behavior);
      drawDude(state.dude.x, state.dude.y);
    } else {
      drawDude(state.dude.x, state.dude.y);
      drawCat(state.cat.x, state.cat.y, state.cat.behavior);
    }
    drawActivityProgress();
  }

  requestAnimationFrame(render);
}

// ── Music Embed ──────────────────────────────────

let currentMusicUrl = null;

function extractYouTubeId(url) {
  if (!url) return null;
  // youtube.com/watch?v=ID
  let m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  // youtu.be/ID
  m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  // youtube.com/embed/ID
  m = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  return null;
}

function extractSpotifyUri(url) {
  if (!url) return null;
  // open.spotify.com/track/ID or /album/ID or /playlist/ID
  const m = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (m) return { type: m[1], id: m[2] };
  return null;
}

function updateMusicEmbed(url) {
  const statusEl = document.getElementById('music-status');
  const embedEl = document.getElementById('music-embed');

  if (!url) {
    statusEl.textContent = '';
    embedEl.innerHTML = '';
    currentMusicUrl = null;
    return;
  }

  // Skip if same URL already embedded
  if (url === currentMusicUrl) return;
  currentMusicUrl = url;

  const ytId = extractYouTubeId(url);
  if (ytId) {
    statusEl.textContent = '♪ YouTube';
    embedEl.innerHTML = `<iframe width="100%" height="80" src="https://www.youtube.com/embed/${ytId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    return;
  }

  const spotify = extractSpotifyUri(url);
  if (spotify) {
    statusEl.textContent = '♪ Spotify';
    embedEl.innerHTML = `<iframe width="100%" height="80" src="https://open.spotify.com/embed/${spotify.type}/${spotify.id}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    return;
  }

  // Fallback: just show the URL
  statusEl.textContent = `♪ ${url}`;
  embedEl.innerHTML = '';
}

// ── UI Updates ───────────────────────────────────

function updateUI() {
  if (!state) return;

  document.getElementById('dude-name').textContent = state.dude.name;
  document.getElementById('mood-face').textContent = state.moodFace + ' ' + state.moodLabel;
  document.getElementById('tick-counter').textContent = `tick: ${state.tick}`;

  const actEl = document.getElementById('activity-display');
  if (state.dude.currentActivity) {
    const walking = state.dude.path && state.dude.path.length > 0;
    if (walking) {
      actEl.textContent = `Walking... (${state.dude.path.length} tiles)`;
    } else {
      const pct = state.dude.activityDuration > 0
        ? Math.round((state.dude.activityProgress / state.dude.activityDuration) * 100) : 0;
      actEl.textContent = `${state.dude.currentActivity.replace(/_/g, ' ')} (${pct}%)`;
    }
    actEl.classList.add('active');
  } else {
    actEl.textContent = state.dude.collapsed ? 'COLLAPSED!' : 'Idle';
    actEl.classList.remove('active');
  }

  updateMusicEmbed(state.dude.musicUrl);

  for (const stat of ['energy','hunger','thirst','fun','hygiene','social']) {
    const val = Math.round(state.dude.stats[stat]);
    const bar = document.getElementById(`bar-${stat}`);
    const valEl = document.getElementById(`val-${stat}`);
    bar.style.width = `${val}%`;
    valEl.textContent = val;
    bar.style.backgroundColor = val >= 60 ? 'var(--green)' : val >= 30 ? 'var(--yellow)' : 'var(--red)';
  }

  const logEl = document.getElementById('event-log');
  if (state.events) {
    logEl.innerHTML = state.events.map(e => {
      const time = new Date(e.time).toLocaleTimeString();
      return `<div class="event-entry"><span class="emoji">${e.emoji}</span> ${time} ${e.message}</div>`;
    }).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }
}

// ── WebSocket ────────────────────────────────────

let ws;
let reconnectDelay = 1000;

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}/ws`);

  ws.onopen = () => {
    reconnectDelay = 1000;
    document.getElementById('status-dot').className = 'connected';
    document.getElementById('status-text').textContent = 'CONNECTED';
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'full_state' || msg.type === 'state_update') {
        state = msg.data;
        updateUI();
      }
    } catch (e) {}
  };

  ws.onclose = () => {
    document.getElementById('status-dot').className = 'error';
    document.getElementById('status-text').textContent = 'RECONNECTING...';
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
  };

  ws.onerror = () => ws.close();
}

// ── Boot ─────────────────────────────────────────
connect();
render();
