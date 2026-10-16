import { create } from 'zustand';

export type District =
  | 'api'
  | 'payments'
  | 'auth'
  | 'workers'
  | 'db'
  | 'cache'
  | 'notify';

export interface Building {
  id: number;
  bx: number;
  bz: number;
  w: number;
  d: number;
  h: number;
  district: District;
  born: number;
}

export interface Meteor {
  id: number;
  x: number;
  z: number;
  y: number;
  buildingId: number;
}

export interface Boom {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface LogEntry {
  id: number;
  text: string;
}

// ---- city layout ----
export const BLOCK = 12;
export const ROAD = 5;
export const GRID = 6;
export const PITCH = BLOCK + ROAD;

export const DISTRICT_COLORS: Record<District, string> = {
  api: '#f5b942',
  payments: '#3fae5a',
  auth: '#7c6cf0',
  workers: '#e07840',
  db: '#3f8fae',
  cache: '#40e0d0',
  notify: '#e05a8a',
};

const DISTRICTS: District[] = [
  'api',
  'payments',
  'auth',
  'workers',
  'db',
  'cache',
  'notify',
];

let nextId = 1;
const nid = () => nextId++;

export const blockToWorld = (b: number) => (b - (GRID - 1) / 2) * PITCH;

function dimsFor(d: District): { w: number; d: number; h: number } {
  switch (d) {
    case 'workers':
      return { w: 9, d: 8, h: 3 + Math.random() * 2 };
    case 'db':
      return { w: 8, d: 8, h: 4 + Math.random() * 3 };
    case 'notify':
      return { w: 3.5, d: 3.5, h: 10 + Math.random() * 6 };
    case 'cache':
      return { w: 4, d: 4, h: 2.5 + Math.random() * 2 };
    default:
      return { w: 5 + Math.random() * 3, d: 5 + Math.random() * 3, h: 6 + Math.random() * 8 };
  }
}

function makeBuilding(bx: number, bz: number, district: District, born: number): Building {
  const { w, d, h } = dimsFor(district);
  return { id: nid(), bx, bz, w, d, h, district, born };
}

function seedCity(): Building[] {
  const spots: Array<[number, number]> = [];
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      if (Math.random() < 0.55) spots.push([i, j]);
    }
  return spots.map(([bx, bz], k) =>
    makeBuilding(bx, bz, DISTRICTS[k % DISTRICTS.length], -10),
  );
}

interface CityState {
  buildings: Building[];
  meteors: Meteor[];
  booms: Boom[];
  logs: LogEntry[];
  served: number;
  bill: number;
  lost: number;
  deploy: () => void;
  strike: () => void;
  impact: (m: Meteor) => void;
  removeBoom: (id: number) => void;
  serve: (n: number) => void;
  tickBill: (n: number) => void;
}

function pushLog(logs: LogEntry[], text: string): LogEntry[] {
  return [{ id: nid(), text }, ...logs].slice(0, 6);
}

export const useCity = create<CityState>((set, get) => ({
  buildings: seedCity(),
  meteors: [],
  booms: [],
  logs: [{ id: 0, text: 'welcome to SEV-1 CITY. nothing is on fire. yet.' }],
  served: 0,
  bill: 1200,
  lost: 0,

  deploy: () => {
    const { buildings, logs } = get();
    const taken = new Set(buildings.map((b) => `${b.bx},${b.bz}`));
    const free: Array<[number, number]> = [];
    for (let i = 0; i < GRID; i++)
      for (let j = 0; j < GRID; j++)
        if (!taken.has(`${i},${j}`)) free.push([i, j]);
    if (!free.length) {
      set({ logs: pushLog(logs, 'no empty lots left. the city is full. classic.') });
      return;
    }
    const [bx, bz] = free[Math.floor(Math.random() * free.length)];
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const b = makeBuilding(bx, bz, district, performance.now() / 1000);
    set({
      buildings: [...buildings, b],
      logs: pushLog(logs, `deployed ${district} service on lot ${bx},${bz}. no tests, obviously.`),
    });
  },

  strike: () => {
    const { buildings, logs, meteors } = get();
    if (!buildings.length) {
      set({ logs: pushLog(logs, 'meteor found nothing to destroy. it respects that.') });
      return;
    }
    const target = buildings[Math.floor(Math.random() * buildings.length)];
    const x = blockToWorld(target.bx);
    const z = blockToWorld(target.bz);
    set({
      meteors: [...meteors, { id: nid(), x, z, y: 70, buildingId: target.id }],
      logs: pushLog(logs, `INCOMING: meteor targeting ${target.district} district.`),
    });
  },

  impact: (m: Meteor) => {
    const { buildings, meteors, booms, logs, bill } = get();
    const target = buildings.find((b) => b.id === m.buildingId);
    set({
      buildings: buildings.filter((b) => b.id !== m.buildingId),
      meteors: meteors.filter((x) => x.id !== m.id),
      booms: [...booms, { id: nid(), x: m.x, y: target ? target.h : 2, z: m.z }],
      bill: bill + 4200,
      lost: get().lost + (target ? 1 : 0),
      logs: pushLog(
        logs,
        target
          ? `meteor destroyed ${target.district}. +$4,200 cloud bill. oops.`
          : 'meteor hit an empty lot. the on-call team takes the credit.',
      ),
    });
  },

  removeBoom: (id: number) =>
    set({ booms: get().booms.filter((b) => b.id !== id) }),

  serve: (n: number) => set({ served: get().served + n }),
  tickBill: (n: number) => set({ bill: get().bill + n }),
}));
