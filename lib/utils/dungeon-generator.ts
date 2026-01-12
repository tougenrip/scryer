// Random Dungeon Generator for D&D 5e
// Ported from Perl by drow (http://donjon.bin.sh/)
// Converted to TypeScript for Scryer

// Cell type flags (using bitwise operations similar to original)
export const CellFlags = {
  NOTHING: 0x00000000,
  BLOCKED: 0x00000001,
  ROOM: 0x00000002,
  CORRIDOR: 0x00000004,
  PERIMETER: 0x00000010,
  ENTRANCE: 0x00000020,
  ROOM_ID: 0x0000ffc0,
  
  ARCH: 0x00010000,
  DOOR: 0x00020000,
  LOCKED: 0x00040000,
  TRAPPED: 0x00080000,
  SECRET: 0x00100000,
  PORTC: 0x00200000,
  STAIR_DN: 0x00400000,
  STAIR_UP: 0x00800000,
  
  LABEL: 0xff000000,
  
  OPENSPACE: 0x00000006, // ROOM | CORRIDOR
  DOORSPACE: 0x003f0000, // ARCH | DOOR | LOCKED | TRAPPED | SECRET | PORTC
  STAIRS: 0x00c00000, // STAIR_DN | STAIR_UP
  BLOCK_ROOM: 0x00000003, // BLOCKED | ROOM
  BLOCK_CORR: 0x00000015, // BLOCKED | PERIMETER | CORRIDOR
  BLOCK_DOOR: 0x003f0001, // BLOCKED | DOORSPACE
};

// Direction vectors
const DIRECTIONS = {
  north: { di: -1, dj: 0 },
  south: { di: 1, dj: 0 },
  west: { di: 0, dj: -1 },
  east: { di: 0, dj: 1 },
} as const;

const OPPOSITE = {
  north: 'south',
  south: 'north',
  west: 'east',
  east: 'west',
} as const;

type Direction = keyof typeof DIRECTIONS;

// Stair end patterns
const STAIR_END_PATTERNS = {
  north: {
    walled: [[1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]],
    corridor: [[0, 0], [1, 0], [2, 0]],
    stair: [0, 0],
    next: [1, 0],
  },
  south: {
    walled: [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]],
    corridor: [[0, 0], [-1, 0], [-2, 0]],
    stair: [0, 0],
    next: [-1, 0],
  },
  west: {
    walled: [[-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1]],
    corridor: [[0, 0], [0, 1], [0, 2]],
    stair: [0, 0],
    next: [0, 1],
  },
  east: {
    walled: [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1]],
    corridor: [[0, 0], [0, -1], [0, -2]],
    stair: [0, 0],
    next: [0, -1],
  },
};

// Close end patterns for deadend removal
const CLOSE_END_PATTERNS = {
  north: {
    walled: [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1]],
    close: [[0, 0]],
    recurse: [-1, 0],
  },
  south: {
    walled: [[0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]],
    close: [[0, 0]],
    recurse: [1, 0],
  },
  west: {
    walled: [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0]],
    close: [[0, 0]],
    recurse: [0, -1],
  },
  east: {
    walled: [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]],
    close: [[0, 0]],
    recurse: [0, 1],
  },
};

// Door types
type DoorKey = 'arch' | 'open' | 'lock' | 'trap' | 'secret' | 'portc';

interface Door {
  row: number;
  col: number;
  key: DoorKey;
  type: string;
  out_id?: number;
}

interface Room {
  id: number;
  row: number;
  col: number;
  north: number;
  south: number;
  west: number;
  east: number;
  height: number;
  width: number;
  area: number;
  door?: Record<Direction, Door[]>;
}

interface Stair {
  row: number;
  col: number;
  next_row: number;
  next_col: number;
  key: 'up' | 'down';
}

export interface DungeonOptions {
  seed?: number;
  n_rows?: number; // must be odd
  n_cols?: number; // must be odd
  dungeon_layout?: 'None' | 'Box' | 'Cross' | 'Round';
  room_min?: number;
  room_max?: number;
  room_layout?: 'Packed' | 'Scattered';
  corridor_layout?: 'Labyrinth' | 'Bent' | 'Straight';
  remove_deadends?: number; // percentage
  add_stairs?: number;
  cell_size?: number; // pixels
  floors?: number; // number of floors to generate
}

export interface Dungeon {
  seed: number;
  n_rows: number;
  n_cols: number;
  n_i: number;
  n_j: number;
  max_row: number;
  max_col: number;
  n_rooms: number;
  room_base: number;
  room_radix: number;
  cell: number[][];
  room: { [id: number]: Room }; // Use object for 1-indexed room access
  door: Door[];
  stair: Stair[];
  options: DungeonOptions;
  connect?: { [key: string]: boolean };
  last_room_id?: number;
  floor_number?: number; // Which floor this is (0-based)
}

export interface MultiFloorDungeon {
  floors: Dungeon[];
  stair_positions: Array<{ row: number; col: number }>; // Stair positions that match across floors
  seed: number;
  options: DungeonOptions;
}

// Seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  randInt(max: number): number {
    return Math.floor(this.random() * max);
  }
}

// Create a single dungeon floor
function createDungeonFloor(
  options: DungeonOptions = {},
  floorNumber: number = 0,
  stairPositions?: Array<{ row: number; col: number }>
): Dungeon {
  const opts: Required<Omit<DungeonOptions, 'floors'>> & { floors?: number } = {
    seed: options.seed ?? Date.now(),
    n_rows: options.n_rows ?? 39,
    n_cols: options.n_cols ?? 39,
    dungeon_layout: options.dungeon_layout ?? 'None',
    room_min: options.room_min ?? 3,
    room_max: options.room_max ?? 9,
    room_layout: options.room_layout ?? 'Scattered',
    corridor_layout: options.corridor_layout ?? 'Bent',
    remove_deadends: options.remove_deadends ?? 50,
    add_stairs: options.add_stairs ?? 2,
    cell_size: options.cell_size ?? 18,
    floors: options.floors ?? 1,
  };

  // Ensure odd dimensions
  if (opts.n_rows % 2 === 0) opts.n_rows++;
  if (opts.n_cols % 2 === 0) opts.n_cols++;

  const dungeon: Dungeon = {
    seed: opts.seed,
    n_rows: opts.n_rows,
    n_cols: opts.n_cols,
    n_i: Math.floor(opts.n_rows / 2),
    n_j: Math.floor(opts.n_cols / 2),
    max_row: opts.n_rows - 1,
    max_col: opts.n_cols - 1,
    n_rooms: 0,
    room_base: Math.floor((opts.room_min + 1) / 2),
    room_radix: Math.floor((opts.room_max - opts.room_min) / 2) + 1,
    cell: [],
    room: {},
    door: [],
    stair: [],
    options: opts,
  };

  dungeon.n_rows = dungeon.n_i * 2;
  dungeon.n_cols = dungeon.n_j * 2;
  dungeon.max_row = dungeon.n_rows - 1;
  dungeon.max_col = dungeon.n_cols - 1;

  const rng = new SeededRandom(opts.seed);

  dungeon.cell = initCells(dungeon, rng);
  dungeon.cell = emplaceRooms(dungeon, rng);
  dungeon.cell = openRooms(dungeon, rng);
  dungeon.cell = labelRooms(dungeon);
  dungeon.cell = corridors(dungeon, rng);
  
  dungeon.floor_number = floorNumber;
  
  if (opts.add_stairs > 0) {
    if (stairPositions && stairPositions.length > 0) {
      // Use provided stair positions for consistency across floors
      dungeon.cell = emplaceStairsAtPositions(dungeon, rng, stairPositions, floorNumber);
    } else {
      // First floor: generate stair positions
      dungeon.cell = emplaceStairs(dungeon, rng);
    }
  }
  
  dungeon.cell = cleanDungeon(dungeon, rng);

  return dungeon;
}

// Main function - creates single or multi-floor dungeon
export function createDungeon(options: DungeonOptions = {}): Dungeon | MultiFloorDungeon {
  const floors = options.floors ?? 1;
  
  if (floors <= 1) {
    // Single floor
    return createDungeonFloor(options, 0);
  }
  
  // Multi-floor dungeon
  return createMultiFloorDungeon(options);
}

// Create multiple floors with matching stair positions
function createMultiFloorDungeon(options: DungeonOptions): MultiFloorDungeon {
  const numFloors = options.floors ?? 1;
  const floors: Dungeon[] = [];
  
  // Generate first floor to get stair positions
  const firstFloor = createDungeonFloor(options, 0);
  const stairPositions: Array<{ row: number; col: number }> = firstFloor.stair.map(s => ({
    row: s.row,
    col: s.col,
  }));
  
  floors.push(firstFloor);
  
  // Generate remaining floors with matching stair positions
  for (let floorNum = 1; floorNum < numFloors; floorNum++) {
    // Use a different seed offset for each floor to get variation
    const floorOptions = {
      ...options,
      seed: (options.seed ?? Date.now()) + floorNum * 1000,
    };
    const floor = createDungeonFloor(floorOptions, floorNum, stairPositions);
    floors.push(floor);
  }
  
  return {
    floors,
    stair_positions: stairPositions,
    seed: options.seed ?? Date.now(),
    options,
  };
}

// Emplace stairs at specific positions (for multi-floor dungeons)
function emplaceStairsAtPositions(
  dungeon: Dungeon,
  rng: SeededRandom,
  positions: Array<{ row: number; col: number }>,
  floorNumber: number
): number[][] {
  if (positions.length === 0) return dungeon.cell;
  
  // Determine stair direction based on floor number
  // First floor (0): stairs go down (to floor 1)
  // Last floor: stairs go up (to previous floor)
  // Middle floors: mix of up and down
  
  const isLastFloor = floorNumber === (dungeon.options.floors ?? 1) - 1;
  const isFirstFloor = floorNumber === 0;
  
  for (let i = 0; i < positions.length && i < positions.length; i++) {
    const pos = positions[i];
    const r = pos.row;
    const c = pos.col;
    
    // Skip if out of bounds
    if (r < 0 || r > dungeon.n_rows || c < 0 || c > dungeon.n_cols) continue;
    
    // Skip if not a valid corridor position
    const cell = dungeon.cell[r]?.[c];
    if (!cell || !(cell & CellFlags.OPENSPACE)) continue;
    
    // Determine stair type
    let stairType: 'up' | 'down';
    if (isFirstFloor) {
      stairType = 'down';
    } else if (isLastFloor) {
      stairType = 'up';
    } else {
      // Middle floors: alternate or random
      stairType = i % 2 === 0 ? 'down' : 'up';
    }
    
    const stair: Stair = {
      row: r,
      col: c,
      next_row: r, // Will be set properly in multi-floor context
      next_col: c,
      key: stairType,
    };
    
    if (stairType === 'down') {
      dungeon.cell[r][c] |= CellFlags.STAIR_DN;
      dungeon.cell[r][c] |= ('d'.charCodeAt(0) << 24);
    } else {
      dungeon.cell[r][c] |= CellFlags.STAIR_UP;
      dungeon.cell[r][c] |= ('u'.charCodeAt(0) << 24);
    }
    
    dungeon.stair.push(stair);
  }
  
  return dungeon.cell;
}

function initCells(dungeon: Dungeon, rng: SeededRandom): number[][] {
  const cells: number[][] = [];
  
  for (let r = 0; r <= dungeon.n_rows; r++) {
    cells[r] = [];
    for (let c = 0; c <= dungeon.n_cols; c++) {
      cells[r][c] = CellFlags.NOTHING;
    }
  }

  // Apply layout mask
  if (dungeon.options.dungeon_layout === 'Box') {
    applyBoxMask(dungeon, cells);
  } else if (dungeon.options.dungeon_layout === 'Cross') {
    applyCrossMask(dungeon, cells);
  } else if (dungeon.options.dungeon_layout === 'Round') {
    applyRoundMask(dungeon, cells);
  }

  return cells;
}

function applyBoxMask(dungeon: Dungeon, cells: number[][]): void {
  const mask = [[1, 1, 1], [1, 0, 1], [1, 1, 1]];
  const rScale = mask.length / (dungeon.n_rows + 1);
  const cScale = mask[0].length / (dungeon.n_cols + 1);
  
  for (let r = 0; r <= dungeon.n_rows; r++) {
    for (let c = 0; c <= dungeon.n_cols; c++) {
      const maskR = Math.floor(r * rScale);
      const maskC = Math.floor(c * cScale);
      if (!mask[maskR]?.[maskC]) {
        cells[r][c] = CellFlags.BLOCKED;
      }
    }
  }
}

function applyCrossMask(dungeon: Dungeon, cells: number[][]): void {
  const mask = [[0, 1, 0], [1, 1, 1], [0, 1, 0]];
  const rScale = mask.length / (dungeon.n_rows + 1);
  const cScale = mask[0].length / (dungeon.n_cols + 1);
  
  for (let r = 0; r <= dungeon.n_rows; r++) {
    for (let c = 0; c <= dungeon.n_cols; c++) {
      const maskR = Math.floor(r * rScale);
      const maskC = Math.floor(c * cScale);
      if (!mask[maskR]?.[maskC]) {
        cells[r][c] = CellFlags.BLOCKED;
      }
    }
  }
}

function applyRoundMask(dungeon: Dungeon, cells: number[][]): void {
  const centerR = Math.floor(dungeon.n_rows / 2);
  const centerC = Math.floor(dungeon.n_cols / 2);
  const radius = Math.min(centerR, centerC);
  
  for (let r = 0; r <= dungeon.n_rows; r++) {
    for (let c = 0; c <= dungeon.n_cols; c++) {
      const dist = Math.sqrt(
        Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2)
      );
      if (dist > radius) {
        cells[r][c] = CellFlags.BLOCKED;
      }
    }
  }
}

function emplaceRooms(dungeon: Dungeon, rng: SeededRandom): number[][] {
  if (dungeon.options.room_layout === 'Packed') {
    return packRooms(dungeon, rng);
  } else {
    return scatterRooms(dungeon, rng);
  }
}

function packRooms(dungeon: Dungeon, rng: SeededRandom): number[][] {
  for (let i = 0; i < dungeon.n_i; i++) {
    const r = (i * 2) + 1;
    for (let j = 0; j < dungeon.n_j; j++) {
      const c = (j * 2) + 1;
      
      if (dungeon.cell[r][c] & CellFlags.ROOM) continue;
      if ((i === 0 || j === 0) && rng.randInt(2) === 0) continue;
      
      const proto = { i, j };
      emplaceRoom(dungeon, proto, rng);
    }
  }
  return dungeon.cell;
}

function scatterRooms(dungeon: Dungeon, rng: SeededRandom): number[][] {
  const nRooms = allocRooms(dungeon);
  
  for (let i = 0; i < nRooms; i++) {
    emplaceRoom(dungeon, {}, rng);
  }
  return dungeon.cell;
}

function allocRooms(dungeon: Dungeon): number {
  const dungeonArea = dungeon.n_cols * dungeon.n_rows;
  const roomArea = dungeon.options.room_max! * dungeon.options.room_max!;
  return Math.floor(dungeonArea / roomArea);
}

function emplaceRoom(
  dungeon: Dungeon,
  proto: { i?: number; j?: number; height?: number; width?: number },
  rng: SeededRandom
): void {
  if (dungeon.n_rooms >= 999) return;
  
  proto = setRoom(dungeon, proto, rng);
  
  const r1 = (proto.i! * 2) + 1;
  const c1 = (proto.j! * 2) + 1;
  const r2 = ((proto.i! + proto.height!) * 2) - 1;
  const c2 = ((proto.j! + proto.width!) * 2) - 1;
  
  if (r1 < 1 || r2 > dungeon.max_row) return;
  if (c1 < 1 || c2 > dungeon.max_col) return;
  
  const hit = soundRoom(dungeon, r1, c1, r2, c2);
  if (hit.blocked) return;
  
  const hitList = Object.keys(hit);
  if (hitList.length > 0) return;
  
  const roomId = dungeon.n_rooms + 1;
  dungeon.n_rooms = roomId;
  dungeon.last_room_id = roomId;
  
  // Emplace room
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (dungeon.cell[r][c] & CellFlags.ENTRANCE) {
        dungeon.cell[r][c] &= ~(CellFlags.ENTRANCE | CellFlags.DOORSPACE | CellFlags.LABEL);
      } else if (dungeon.cell[r][c] & CellFlags.PERIMETER) {
        dungeon.cell[r][c] &= ~CellFlags.PERIMETER;
      }
      dungeon.cell[r][c] |= CellFlags.ROOM | (roomId << 6);
    }
  }
  
  const height = ((r2 - r1) + 1) * 10;
  const width = ((c2 - c1) + 1) * 10;
  
  const roomData: Room = {
    id: roomId,
    row: r1,
    col: c1,
    north: r1,
    south: r2,
    west: c1,
    east: c2,
    height,
    width,
    area: height * width,
  };
  
  dungeon.room[roomId] = roomData;
  
  // Block corridors from room boundary
  for (let r = r1 - 1; r <= r2 + 1; r++) {
    if (r >= 0 && r <= dungeon.n_rows) {
      if (!(dungeon.cell[r][c1 - 1] & (CellFlags.ROOM | CellFlags.ENTRANCE))) {
        if (c1 - 1 >= 0) dungeon.cell[r][c1 - 1] |= CellFlags.PERIMETER;
      }
      if (!(dungeon.cell[r][c2 + 1] & (CellFlags.ROOM | CellFlags.ENTRANCE))) {
        if (c2 + 1 <= dungeon.n_cols) dungeon.cell[r][c2 + 1] |= CellFlags.PERIMETER;
      }
    }
  }
  
  for (let c = c1 - 1; c <= c2 + 1; c++) {
    if (c >= 0 && c <= dungeon.n_cols) {
      if (!(dungeon.cell[r1 - 1][c] & (CellFlags.ROOM | CellFlags.ENTRANCE))) {
        if (r1 - 1 >= 0) dungeon.cell[r1 - 1][c] |= CellFlags.PERIMETER;
      }
      if (!(dungeon.cell[r2 + 1][c] & (CellFlags.ROOM | CellFlags.ENTRANCE))) {
        if (r2 + 1 <= dungeon.n_rows) dungeon.cell[r2 + 1][c] |= CellFlags.PERIMETER;
      }
    }
  }
}

function setRoom(
  dungeon: Dungeon,
  proto: { i?: number; j?: number; height?: number; width?: number },
  rng: SeededRandom
): { i: number; j: number; height: number; width: number } {
  const base = dungeon.room_base;
  const radix = dungeon.room_radix;
  
  if (proto.height === undefined) {
    if (proto.i !== undefined) {
      let a = dungeon.n_i - base - proto.i;
      if (a < 0) a = 0;
      const r = Math.min(a, radix);
      proto.height = rng.randInt(r) + base;
    } else {
      proto.height = rng.randInt(radix) + base;
    }
  }
  
  if (proto.width === undefined) {
    if (proto.j !== undefined) {
      let a = dungeon.n_j - base - proto.j;
      if (a < 0) a = 0;
      const r = Math.min(a, radix);
      proto.width = rng.randInt(r) + base;
    } else {
      proto.width = rng.randInt(radix) + base;
    }
  }
  
  if (proto.i === undefined) {
    proto.i = rng.randInt(dungeon.n_i - proto.height);
  }
  
  if (proto.j === undefined) {
    proto.j = rng.randInt(dungeon.n_j - proto.width);
  }
  
  return proto as { i: number; j: number; height: number; width: number };
}

function soundRoom(
  dungeon: Dungeon,
  r1: number,
  c1: number,
  r2: number,
  c2: number
): { blocked?: boolean; [key: string]: any } {
  const hit: { [key: string]: number } = {};
  
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (dungeon.cell[r]?.[c] & CellFlags.BLOCKED) {
        return { blocked: true };
      }
      if (dungeon.cell[r]?.[c] & CellFlags.ROOM) {
        const id = (dungeon.cell[r][c] & CellFlags.ROOM_ID) >> 6;
        hit[id.toString()] = (hit[id.toString()] || 0) + 1;
      }
    }
  }
  
  return hit;
}

function openRooms(dungeon: Dungeon, rng: SeededRandom): number[][] {
  for (let id = 1; id <= dungeon.n_rooms; id++) {
    if (dungeon.room[id]) {
      openRoom(dungeon, dungeon.room[id], rng);
    }
  }
  dungeon.connect = {};
  return dungeon.cell;
}

function openRoom(dungeon: Dungeon, room: Room, rng: SeededRandom): void {
  const list = doorSills(dungeon, room);
  if (list.length === 0) return;
  
  const nOpens = allocOpens(dungeon, room);
  if (!room.door) room.door = {} as Record<Direction, Door[]>;
  
  for (let i = 0; i < nOpens && list.length > 0; i++) {
    const idx = rng.randInt(list.length);
    const sill = list.splice(idx, 1)[0];
    if (!sill) break;
    
    const doorR = sill.door_r;
    const doorC = sill.door_c;
    const doorCell = dungeon.cell[doorR]?.[doorC];
    
    if (!doorCell || doorCell & CellFlags.DOORSPACE) continue;
    
    if (sill.out_id) {
      const connect = [room.id, sill.out_id].sort().join(',');
      if (dungeon.connect?.[connect]) continue;
      if (!dungeon.connect) dungeon.connect = {};
      dungeon.connect[connect] = true;
    }
    
    const openR = sill.sill_r;
    const openC = sill.sill_c;
    const openDir = sill.dir;
    
    // Open door
    for (let x = 0; x < 3; x++) {
      const r = openR + (DIRECTIONS[openDir].di * x);
      const c = openC + (DIRECTIONS[openDir].dj * x);
      if (dungeon.cell[r]?.[c] !== undefined) {
        dungeon.cell[r][c] &= ~CellFlags.PERIMETER;
        dungeon.cell[r][c] |= CellFlags.ENTRANCE;
      }
    }
    
    const doorType = doorTypeRand(rng);
    const door: Door = { row: doorR, col: doorC, key: doorType.key, type: doorType.type };
    
    if (doorType.key === 'arch') {
      dungeon.cell[doorR][doorC] |= CellFlags.ARCH;
    } else if (doorType.key === 'open') {
      dungeon.cell[doorR][doorC] |= CellFlags.DOOR;
      dungeon.cell[doorR][doorC] |= ('o'.charCodeAt(0) << 24);
    } else if (doorType.key === 'lock') {
      dungeon.cell[doorR][doorC] |= CellFlags.LOCKED;
      dungeon.cell[doorR][doorC] |= ('x'.charCodeAt(0) << 24);
    } else if (doorType.key === 'trap') {
      dungeon.cell[doorR][doorC] |= CellFlags.TRAPPED;
      dungeon.cell[doorR][doorC] |= ('t'.charCodeAt(0) << 24);
    } else if (doorType.key === 'secret') {
      dungeon.cell[doorR][doorC] |= CellFlags.SECRET;
      dungeon.cell[doorR][doorC] |= ('s'.charCodeAt(0) << 24);
    } else if (doorType.key === 'portc') {
      dungeon.cell[doorR][doorC] |= CellFlags.PORTC;
      dungeon.cell[doorR][doorC] |= ('#'.charCodeAt(0) << 24);
    }
    
    if (sill.out_id) door.out_id = sill.out_id;
    
    if (!room.door[openDir]) room.door[openDir] = [];
    room.door[openDir].push(door);
  }
}

function allocOpens(dungeon: Dungeon, room: Room): number {
  const roomH = ((room.south - room.north) / 2) + 1;
  const roomW = ((room.east - room.west) / 2) + 1;
  const flumph = Math.floor(Math.sqrt(roomW * roomH));
  return flumph + Math.floor(Math.random() * flumph);
}

interface Sill {
  sill_r: number;
  sill_c: number;
  dir: Direction;
  door_r: number;
  door_c: number;
  out_id?: number;
}

function doorSills(dungeon: Dungeon, room: Room): Sill[] {
  const list: Sill[] = [];
  
  if (room.north >= 3) {
    for (let c = room.west; c <= room.east; c += 2) {
      const sill = checkSill(dungeon, room, room.north, c, 'north');
      if (sill) list.push(sill);
    }
  }
  
  if (room.south <= dungeon.n_rows - 3) {
    for (let c = room.west; c <= room.east; c += 2) {
      const sill = checkSill(dungeon, room, room.south, c, 'south');
      if (sill) list.push(sill);
    }
  }
  
  if (room.west >= 3) {
    for (let r = room.north; r <= room.south; r += 2) {
      const sill = checkSill(dungeon, room, r, room.west, 'west');
      if (sill) list.push(sill);
    }
  }
  
  if (room.east <= dungeon.n_cols - 3) {
    for (let r = room.north; r <= room.south; r += 2) {
      const sill = checkSill(dungeon, room, r, room.east, 'east');
      if (sill) list.push(sill);
    }
  }
  
  return shuffle(list);
}

function checkSill(
  dungeon: Dungeon,
  room: Room,
  sillR: number,
  sillC: number,
  dir: Direction
): Sill | null {
  const doorR = sillR + DIRECTIONS[dir].di;
  const doorC = sillC + DIRECTIONS[dir].dj;
  const doorCell = dungeon.cell[doorR]?.[doorC];
  
  if (!doorCell || !(doorCell & CellFlags.PERIMETER)) return null;
  if (doorCell & CellFlags.BLOCK_DOOR) return null;
  
  const outR = doorR + DIRECTIONS[dir].di;
  const outC = doorC + DIRECTIONS[dir].dj;
  const outCell = dungeon.cell[outR]?.[outC];
  
  if (!outCell || outCell & CellFlags.BLOCKED) return null;
  
  let outId: number | undefined;
  if (outCell & CellFlags.ROOM) {
    outId = (outCell & CellFlags.ROOM_ID) >> 6;
    if (outId === room.id) return null;
  }
  
  return {
    sill_r: sillR,
    sill_c: sillC,
    dir,
    door_r: doorR,
    door_c: doorC,
    out_id: outId,
  };
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function doorTypeRand(rng: SeededRandom): { key: DoorKey; type: string } {
  const i = rng.randInt(110);
  
  if (i < 15) return { key: 'arch', type: 'Archway' };
  if (i < 60) return { key: 'open', type: 'Unlocked Door' };
  if (i < 75) return { key: 'lock', type: 'Locked Door' };
  if (i < 90) return { key: 'trap', type: 'Trapped Door' };
  if (i < 100) return { key: 'secret', type: 'Secret Door' };
  return { key: 'portc', type: 'Portcullis' };
}

function labelRooms(dungeon: Dungeon): number[][] {
  for (let id = 1; id <= dungeon.n_rooms; id++) {
    const room = dungeon.room[id];
    if (!room) continue;
    
    const label = id.toString();
    const len = label.length;
    const labelR = Math.floor((room.north + room.south) / 2);
    const labelC = Math.floor((room.west + room.east - len) / 2) + 1;
    
    for (let c = 0; c < len; c++) {
      const char = label[c];
      if (dungeon.cell[labelR]?.[labelC + c] !== undefined) {
        dungeon.cell[labelR][labelC + c] |= (char.charCodeAt(0) << 24);
      }
    }
  }
  return dungeon.cell;
}

function corridors(dungeon: Dungeon, rng: SeededRandom): number[][] {
  for (let i = 1; i < dungeon.n_i; i++) {
    const r = (i * 2) + 1;
    for (let j = 1; j < dungeon.n_j; j++) {
      const c = (j * 2) + 1;
      
      if (dungeon.cell[r][c] & CellFlags.CORRIDOR) continue;
      tunnel(dungeon, i, j, undefined, rng);
    }
  }
  return dungeon.cell;
}

function tunnel(
  dungeon: Dungeon,
  i: number,
  j: number,
  lastDir: Direction | undefined,
  rng: SeededRandom
): void {
  const dirs = tunnelDirs(dungeon, lastDir, rng);
  
  for (const dir of dirs) {
    if (openTunnel(dungeon, i, j, dir)) {
      const nextI = i + DIRECTIONS[dir].di;
      const nextJ = j + DIRECTIONS[dir].dj;
      tunnel(dungeon, nextI, nextJ, dir, rng);
    }
  }
}

function tunnelDirs(
  dungeon: Dungeon,
  lastDir: Direction | undefined,
  rng: SeededRandom
): Direction[] {
  const p = corridorLayoutPercent(dungeon.options.corridor_layout!);
  const dirs: Direction[] = shuffle(['north', 'south', 'west', 'east'] as Direction[]);
  
  if (lastDir && p > 0) {
    if (rng.randInt(100) < p) {
      dirs.unshift(lastDir);
    }
  }
  
  return dirs;
}

function corridorLayoutPercent(layout: string): number {
  switch (layout) {
    case 'Labyrinth': return 0;
    case 'Bent': return 50;
    case 'Straight': return 100;
    default: return 50;
  }
}

function openTunnel(dungeon: Dungeon, i: number, j: number, dir: Direction): boolean {
  const thisR = (i * 2) + 1;
  const thisC = (j * 2) + 1;
  const nextR = ((i + DIRECTIONS[dir].di) * 2) + 1;
  const nextC = ((j + DIRECTIONS[dir].dj) * 2) + 1;
  const midR = (thisR + nextR) / 2;
  const midC = (thisC + nextC) / 2;
  
  if (soundTunnel(dungeon, midR, midC, nextR, nextC)) {
    return delveTunnel(dungeon, thisR, thisC, nextR, nextC);
  }
  return false;
}

function soundTunnel(
  dungeon: Dungeon,
  midR: number,
  midC: number,
  nextR: number,
  nextC: number
): boolean {
  if (nextR < 0 || nextR > dungeon.n_rows) return false;
  if (nextC < 0 || nextC > dungeon.n_cols) return false;
  
  const r1 = Math.min(midR, nextR);
  const r2 = Math.max(midR, nextR);
  const c1 = Math.min(midC, nextC);
  const c2 = Math.max(midC, nextC);
  
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = dungeon.cell[r]?.[c];
      if (!cell) return false;
      if (cell & CellFlags.BLOCK_CORR) return false;
    }
  }
  
  return true;
}

function delveTunnel(
  dungeon: Dungeon,
  thisR: number,
  thisC: number,
  nextR: number,
  nextC: number
): boolean {
  const r1 = Math.min(thisR, nextR);
  const r2 = Math.max(thisR, nextR);
  const c1 = Math.min(thisC, nextC);
  const c2 = Math.max(thisC, nextC);
  
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (dungeon.cell[r]?.[c] !== undefined) {
        dungeon.cell[r][c] &= ~CellFlags.ENTRANCE;
        dungeon.cell[r][c] |= CellFlags.CORRIDOR;
      }
    }
  }
  
  return true;
}

function emplaceStairs(dungeon: Dungeon, rng: SeededRandom): number[][] {
  const n = dungeon.options.add_stairs!;
  if (n <= 0) return dungeon.cell;
  
  const list = stairEnds(dungeon);
  if (list.length === 0) return dungeon.cell;
  
  for (let i = 0; i < n && list.length > 0; i++) {
    const idx = rng.randInt(list.length);
    const stair = list.splice(idx, 1)[0];
    if (!stair) break;
    
    const r = stair.row;
    const c = stair.col;
    const type = i < 2 ? i : rng.randInt(2);
    
    if (type === 0) {
      dungeon.cell[r][c] |= CellFlags.STAIR_DN;
      dungeon.cell[r][c] |= ('d'.charCodeAt(0) << 24);
      stair.key = 'down';
    } else {
      dungeon.cell[r][c] |= CellFlags.STAIR_UP;
      dungeon.cell[r][c] |= ('u'.charCodeAt(0) << 24);
      stair.key = 'up';
    }
    
    dungeon.stair.push(stair);
  }
  
  return dungeon.cell;
}

function stairEnds(dungeon: Dungeon): Stair[] {
  const list: Stair[] = [];
  
  // Find any corridor positions that are suitable for stairs
  // A suitable position is a corridor cell with at least one walled neighbor
  for (let i = 0; i < dungeon.n_i; i++) {
    const r = (i * 2) + 1;
    for (let j = 0; j < dungeon.n_j; j++) {
      const c = (j * 2) + 1;
      
      const cell = dungeon.cell[r]?.[c];
      if (!cell) continue;
      
      // Must be a corridor (or open space that's not a room)
      if (!(cell & CellFlags.CORRIDOR)) continue;
      if (cell & CellFlags.STAIRS) continue;
      
      // Check if this position has at least one walled neighbor
      // This makes it a good candidate for stairs (end of corridor or corner)
      let hasWalledNeighbor = false;
      const neighbors = [
        [r - 1, c], // north
        [r + 1, c], // south
        [r, c - 1], // west
        [r, c + 1], // east
      ];
      
      for (const [nr, nc] of neighbors) {
        const neighborCell = dungeon.cell[nr]?.[nc] || 0;
        if (!(neighborCell & CellFlags.OPENSPACE)) {
          hasWalledNeighbor = true;
          break;
        }
      }
      
      // Also accept positions that are corridor corners or have limited open neighbors
      let openNeighbors = 0;
      for (const [nr, nc] of neighbors) {
        const neighborCell = dungeon.cell[nr]?.[nc] || 0;
        if (neighborCell & CellFlags.OPENSPACE) {
          openNeighbors++;
        }
      }
      
      // Accept if it has a walled neighbor OR is a corner (1-2 open neighbors)
      if (hasWalledNeighbor || openNeighbors <= 2) {
        const end: Stair = {
          row: r,
          col: c,
          next_row: r,
          next_col: c,
          key: 'up',
        };
        list.push(end);
      }
    }
  }
  
  return list;
}

function checkTunnel(
  cells: number[][],
  r: number,
  c: number,
  check: any
): boolean {
  if (check.corridor) {
    for (const p of check.corridor) {
      const cell = cells[r + p[0]]?.[c + p[1]];
      if (!cell || cell !== CellFlags.CORRIDOR) return false;
    }
  }
  
  if (check.walled) {
    for (const p of check.walled) {
      const cell = cells[r + p[0]]?.[c + p[1]];
      if (cell && cell & CellFlags.OPENSPACE) return false;
    }
  }
  
  return true;
}

function cleanDungeon(dungeon: Dungeon, rng: SeededRandom): number[][] {
  if (dungeon.options.remove_deadends! > 0) {
    dungeon.cell = removeDeadends(dungeon, rng);
  }
  dungeon.cell = fixDoors(dungeon);
  dungeon.cell = emptyBlocks(dungeon);
  
  return dungeon.cell;
}

function removeDeadends(dungeon: Dungeon, rng: SeededRandom): number[][] {
  const p = dungeon.options.remove_deadends!;
  const all = p === 100;
  
  for (let i = 0; i < dungeon.n_i; i++) {
    const r = (i * 2) + 1;
    for (let j = 0; j < dungeon.n_j; j++) {
      const c = (j * 2) + 1;
      
      const cell = dungeon.cell[r]?.[c];
      if (!cell) continue;
      if (!(cell & CellFlags.OPENSPACE)) continue;
      if (cell & CellFlags.STAIRS) continue;
      if (!all && rng.randInt(100) >= p) continue;
      
      collapse(dungeon, r, c, CLOSE_END_PATTERNS);
    }
  }
  
  return dungeon.cell;
}

function collapse(dungeon: Dungeon, r: number, c: number, xc: typeof CLOSE_END_PATTERNS): void {
  const cell = dungeon.cell[r]?.[c];
  if (!cell || !(cell & CellFlags.OPENSPACE)) return;
  
  for (const dir of Object.keys(xc) as Direction[]) {
    const pattern = xc[dir];
    if (checkTunnel(dungeon.cell, r, c, pattern)) {
      if (pattern.close) {
        for (const p of pattern.close) {
          const pr = r + p[0];
          const pc = c + p[1];
          if (dungeon.cell[pr]?.[pc] !== undefined) {
            dungeon.cell[pr][pc] = CellFlags.NOTHING;
          }
        }
      }
      
      if (pattern.recurse) {
        const pr = r + pattern.recurse[0];
        const pc = c + pattern.recurse[1];
        collapse(dungeon, pr, pc, xc);
      }
    }
  }
}

function fixDoors(dungeon: Dungeon): number[][] {
  const fixed: boolean[][] = [];
  const allDoors: Door[] = [];
  
  for (const roomId in dungeon.room) {
    const room = dungeon.room[parseInt(roomId)];
    if (!room || !room.door) continue;
    
    for (const dir of Object.keys(room.door) as Direction[]) {
      const shiny: Door[] = [];
      
      for (const door of room.door[dir]) {
        const doorR = door.row;
        const doorC = door.col;
        const doorCell = dungeon.cell[doorR]?.[doorC];
        
        if (!doorCell || !(doorCell & CellFlags.OPENSPACE)) continue;
        
        if (fixed[doorR]?.[doorC]) {
          shiny.push(door);
        } else {
          if (door.out_id && dungeon.room[door.out_id]) {
            const outDir = OPPOSITE[dir];
            if (!dungeon.room[door.out_id].door) {
              dungeon.room[door.out_id].door = {} as Record<Direction, Door[]>;
            }
            if (!dungeon.room[door.out_id].door[outDir]) {
              dungeon.room[door.out_id].door[outDir] = [];
            }
            dungeon.room[door.out_id].door[outDir].push(door);
          }
          shiny.push(door);
          if (!fixed[doorR]) fixed[doorR] = [];
          fixed[doorR][doorC] = true;
        }
      }
      
      if (shiny.length > 0) {
        room.door[dir] = shiny;
        allDoors.push(...shiny);
      } else {
        delete room.door[dir];
      }
    }
  }
  
  dungeon.door = allDoors;
  return dungeon.cell;
}

function emptyBlocks(dungeon: Dungeon): number[][] {
  for (let r = 0; r <= dungeon.n_rows; r++) {
    for (let c = 0; c <= dungeon.n_cols; c++) {
      if (dungeon.cell[r]?.[c] & CellFlags.BLOCKED) {
        dungeon.cell[r][c] = CellFlags.NOTHING;
      }
    }
  }
  return dungeon.cell;
}

// Canvas rendering
export function renderDungeonToCanvas(dungeon: Dungeon, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const cellSize = dungeon.options.cell_size || 18;
  const dungeonWidth = (dungeon.n_cols + 1) * cellSize + 1;
  const dungeonHeight = (dungeon.n_rows + 1) * cellSize + 1;
  
  // Add space for stats at the bottom
  const statsHeight = 60;
  const width = dungeonWidth;
  const height = dungeonHeight + statsHeight;
  
  canvas.width = width;
  canvas.height = height;
  
  // Colors - Dungeon theme
  const colors = {
    fill: '#2C2416',           // Dark brown/black background
    open: '#D4C5A9',           // Light stone/tan floor
    openGrid: '#B8A892',       // Slightly darker grid lines
    wall: '#3A3428',           // Dark stone walls
    wallDark: '#252015',       // Darker wall shadows
    door: '#8B6F47',           // Wooden door brown
    doorFrame: '#5C4A2E',      // Darker door frame
    label: '#1A1610',          // Dark text for room numbers
    stair: '#7A6B4A',          // Stone stair color
    statBg: '#F5F0E6',         // Light beige for stats background
    statText: '#2C2416',       // Dark brown for stats text
  };
  
  // Fill background (dungeon area)
  ctx.fillStyle = colors.fill;
  ctx.fillRect(0, 0, width, dungeonHeight);
  // Fill stats area
  ctx.fillStyle = colors.statBg;
  ctx.fillRect(0, dungeonHeight, width, statsHeight);
  
  // Draw open spaces (floors)
  ctx.fillStyle = colors.open;
  ctx.strokeStyle = colors.openGrid;
  ctx.lineWidth = 0.5;
  
  for (let r = 0; r <= dungeon.n_rows; r++) {
    for (let c = 0; c <= dungeon.n_cols; c++) {
      const cell = dungeon.cell[r]?.[c] || 0;
      
      if (cell & CellFlags.OPENSPACE) {
        const x = c * cellSize;
        const y = r * cellSize;
        
        // Fill open space with subtle texture
        ctx.fillStyle = colors.open;
        ctx.fillRect(x, y, cellSize, cellSize);
        
        // Add subtle texture/variation
        if ((r + c) % 3 === 0) {
          ctx.fillStyle = colors.openGrid;
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.fillStyle = colors.open;
        }
        
        // Subtle grid lines (only on larger cells)
        if (cellSize > 12) {
          ctx.strokeStyle = colors.openGrid;
          ctx.globalAlpha = 0.3;
          ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
          ctx.globalAlpha = 1.0;
        }
      }
    }
  }
  
  // Draw walls with 3D effect
  ctx.lineWidth = Math.max(1, cellSize / 12);
  
  for (let r = 0; r <= dungeon.n_rows; r++) {
    for (let c = 0; c <= dungeon.n_cols; c++) {
      const cell = dungeon.cell[r]?.[c] || 0;
      
      if (cell & CellFlags.OPENSPACE) {
        const x = c * cellSize;
        const y = r * cellSize;
        const wallThickness = Math.max(1, cellSize / 9);
        
        // Check neighbors and draw walls with depth
        // Top-left corner shadow
        if (!((dungeon.cell[r - 1]?.[c - 1] || 0) & CellFlags.OPENSPACE)) {
          ctx.fillStyle = colors.wallDark;
          ctx.fillRect(x, y, wallThickness, wallThickness);
        }
        
        // Top wall
        if (!((dungeon.cell[r - 1]?.[c] || 0) & CellFlags.OPENSPACE)) {
          ctx.fillStyle = colors.wall;
          ctx.fillRect(x, y, cellSize, wallThickness);
          // Shadow line
          ctx.fillStyle = colors.wallDark;
          ctx.fillRect(x, y + wallThickness - 1, cellSize, 1);
        }
        
        // Left wall
        if (!((dungeon.cell[r]?.[c - 1] || 0) & CellFlags.OPENSPACE)) {
          ctx.fillStyle = colors.wall;
          ctx.fillRect(x, y, wallThickness, cellSize);
          // Shadow line
          ctx.fillStyle = colors.wallDark;
          ctx.fillRect(x + wallThickness - 1, y, 1, cellSize);
        }
        
        // Right wall
        if (!((dungeon.cell[r]?.[c + 1] || 0) & CellFlags.OPENSPACE)) {
          ctx.fillStyle = colors.wall;
          ctx.fillRect(x + cellSize - wallThickness, y, wallThickness, cellSize);
          // Highlight (lighter edge)
          ctx.fillStyle = colors.wallDark;
          ctx.fillRect(x + cellSize - wallThickness, y, 1, cellSize);
        }
        
        // Bottom wall
        if (!((dungeon.cell[r + 1]?.[c] || 0) & CellFlags.OPENSPACE)) {
          ctx.fillStyle = colors.wall;
          ctx.fillRect(x, y + cellSize - wallThickness, cellSize, wallThickness);
          // Highlight (lighter edge)
          ctx.fillStyle = colors.wallDark;
          ctx.fillRect(x, y + cellSize - wallThickness, cellSize, 1);
        }
      }
    }
  }
  
  // Draw doors
  ctx.strokeStyle = colors.doorFrame;
  ctx.fillStyle = colors.door;
  ctx.lineWidth = Math.max(1.5, cellSize / 12);
  
  for (const door of dungeon.door) {
    const r = door.row;
    const c = door.col;
    const x = c * cellSize;
    const y = r * cellSize;
    const centerX = x + cellSize / 2;
    const centerY = y + cellSize / 2;
    
    // Determine door orientation
    const isVertical = dungeon.cell[r]?.[c - 1] && (dungeon.cell[r][c - 1] & CellFlags.OPENSPACE);
    
    if (door.key === 'arch') {
      // Draw archway (stone opening)
      ctx.strokeStyle = colors.wallDark;
      ctx.lineWidth = Math.max(1, cellSize / 15);
      if (isVertical) {
        ctx.beginPath();
        ctx.moveTo(centerX, y);
        ctx.lineTo(centerX, y + cellSize);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x, centerY);
        ctx.lineTo(x + cellSize, centerY);
        ctx.stroke();
      }
    } else if (door.key === 'open' || door.key === 'lock') {
      // Draw wooden door
      const doorWidth = cellSize / 3.5;
      const doorHeight = cellSize / 4;
      
      if (isVertical) {
        // Door frame
        ctx.fillStyle = colors.doorFrame;
        ctx.fillRect(centerX - doorWidth / 2 - 1, y + doorHeight, doorWidth + 2, cellSize - doorHeight * 2);
        // Door
        ctx.fillStyle = colors.door;
        ctx.fillRect(centerX - doorWidth / 2, y + doorHeight + 1, doorWidth, cellSize - doorHeight * 2 - 2);
        // Door handle/lock
        if (door.key === 'lock') {
          ctx.fillStyle = '#6B5A3A';
          ctx.fillRect(centerX - 1, y + doorHeight + 2, 2, 2);
          ctx.fillRect(centerX - 1, y + cellSize - doorHeight - 4, 2, 2);
        }
      } else {
        // Door frame
        ctx.fillStyle = colors.doorFrame;
        ctx.fillRect(x + doorHeight, centerY - doorWidth / 2 - 1, cellSize - doorHeight * 2, doorWidth + 2);
        // Door
        ctx.fillStyle = colors.door;
        ctx.fillRect(x + doorHeight + 1, centerY - doorWidth / 2, cellSize - doorHeight * 2 - 2, doorWidth);
        // Door handle/lock
        if (door.key === 'lock') {
          ctx.fillStyle = '#6B5A3A';
          ctx.fillRect(x + doorHeight + 2, centerY - 1, 2, 2);
          ctx.fillRect(x + cellSize - doorHeight - 4, centerY - 1, 2, 2);
        }
      }
    } else if (door.key === 'secret') {
      // Secret door (very subtle, almost like wall)
      ctx.strokeStyle = colors.wallDark;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = Math.max(0.5, cellSize / 20);
      if (isVertical) {
        ctx.beginPath();
        ctx.moveTo(centerX, y + 2);
        ctx.lineTo(centerX, y + cellSize - 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x + 2, centerY);
        ctx.lineTo(x + cellSize - 2, centerY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    } else if (door.key === 'portc') {
      // Portcullis (metal bars)
      ctx.fillStyle = '#4A4A4A';
      const barSpacing = 3;
      if (isVertical) {
        for (let i = 3; i < cellSize - 3; i += barSpacing) {
          ctx.fillRect(centerX - 1.5, y + i, 3, 2);
        }
      } else {
        for (let i = 3; i < cellSize - 3; i += barSpacing) {
          ctx.fillRect(x + i, centerY - 1.5, 2, 3);
        }
      }
    }
  }
  
  // Draw room labels (subtle numbers on floor)
  ctx.font = `${Math.max(8, cellSize * 0.5)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let r = 0; r <= dungeon.n_rows; r++) {
    for (let c = 0; c <= dungeon.n_cols; c++) {
      const cell = dungeon.cell[r]?.[c] || 0;
      
      if (cell & CellFlags.LABEL) {
        const char = String.fromCharCode((cell & CellFlags.LABEL) >> 24);
        if (/^\d$/.test(char)) {
          const x = c * cellSize + cellSize / 2;
          const y = r * cellSize + cellSize / 2;
          // Subtle shadow for readability
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillText(char, x + 1, y + 1);
          ctx.fillStyle = colors.label;
          ctx.fillText(char, x, y);
        }
      }
    }
  }
  
  // Draw stairs (stone steps)
  ctx.strokeStyle = colors.stair;
  ctx.fillStyle = colors.stair;
  ctx.lineWidth = Math.max(1, cellSize / 20);
  
  for (const stair of dungeon.stair) {
    const x = stair.col * cellSize;
    const y = stair.row * cellSize;
    const centerX = x + cellSize / 2;
    const centerY = y + cellSize / 2;
    
    if (stair.next_row > stair.row) {
      // Stairs going south
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const stepY = y + (i * cellSize) / steps;
        const stepWidth = (stair.key === 'down' ? (i / steps) : 1) * (cellSize / 2);
        ctx.beginPath();
        ctx.moveTo(centerX - stepWidth, stepY);
        ctx.lineTo(centerX + stepWidth, stepY);
        ctx.stroke();
      }
    } else if (stair.next_row < stair.row) {
      // Stairs going north
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const stepY = y + cellSize - (i * cellSize) / steps;
        const stepWidth = (stair.key === 'down' ? (i / steps) : 1) * (cellSize / 2);
        ctx.beginPath();
        ctx.moveTo(centerX - stepWidth, stepY);
        ctx.lineTo(centerX + stepWidth, stepY);
        ctx.stroke();
      }
    } else if (stair.next_col > stair.col) {
      // Stairs going east
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const stepX = x + (i * cellSize) / steps;
        const stepHeight = (stair.key === 'down' ? (i / steps) : 1) * (cellSize / 2);
        ctx.beginPath();
        ctx.moveTo(stepX, centerY - stepHeight);
        ctx.lineTo(stepX, centerY + stepHeight);
        ctx.stroke();
      }
    } else if (stair.next_col < stair.col) {
      // Stairs going west
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const stepX = x + cellSize - (i * cellSize) / steps;
        const stepHeight = (stair.key === 'down' ? (i / steps) : 1) * (cellSize / 2);
        ctx.beginPath();
        ctx.moveTo(stepX, centerY - stepHeight);
        ctx.lineTo(stepX, centerY + stepHeight);
        ctx.stroke();
      }
    }
  }
  
  // Draw stats at the bottom
  const statsY = dungeonHeight + 20;
  ctx.font = `11px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = colors.statText;
  
  const statsText = [
    `Seed: ${dungeon.seed}`,
    dungeon.floor_number !== undefined ? `Floor: ${dungeon.floor_number + 1}` : null,
    `Rooms: ${dungeon.n_rooms}`,
    `Doors: ${dungeon.door.length}`,
    `Stairs: ${dungeon.stair.length}`,
    `Size: ${dungeon.n_rows}×${dungeon.n_cols}`,
  ].filter(Boolean) as string[];
  
  let statsX = 15;
  const lineHeight = 16;
  const spacing = 25;
  
  // Calculate column width based on longest text
  const maxWidth = Math.max(...statsText.map(t => ctx.measureText(t).width));
  const colWidth = maxWidth + spacing;
  
  // Display in two rows: first 3 items, then last 2
  statsText.forEach((text, i) => {
    const row = i < 3 ? 0 : 1;
    const col = i < 3 ? i : i - 3;
    ctx.fillText(text, statsX + (col * colWidth), statsY + (row * lineHeight));
  });
}

