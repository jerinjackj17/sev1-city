import { create } from 'zustand';
import { narrate, adviceFor, type CmdEvent, type CmdStats } from './commander';

export type District =
  | 'api'
  | 'payments'
  | 'auth'
  | 'workers'
  | 'db'
  | 'cache'
  | 'notify';

export type Scenario = 'normal' | 'blackfriday' | 'launchday';
export type GameStatus = 'playing' | 'won' | 'lost';

export interface Building {
  id: number;
  bx: number;
  bz: number;
  w: number;
  d: number;
  h: number;
  district: District;
  born: number;
  health: number;
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
  at: number;
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
  return { id: nid(), bx, bz, w, d, h, district, born, health: 100 };
}

function seedCity(max = 99): Building[] {
  const spots: Array<[number, number]> = [];
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      if (Math.random() < 0.55) spots.push([i, j]);
    }
  return spots.slice(0, max).map(([bx, bz], k) =>
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
  time: number;
  happiness: number;
  revenue: number;
  slowUntil: number;
  extraCars: number;
  nextChaos: number;
  cmdLine: string;
  cmdAt: number;
  cmdStats: CmdStats;
  started: boolean;
  scenario: Scenario;
  chaosMult: number;
  day: number;
  status: GameStatus;
  loseReason: string | null;
  deploy: () => void;
  strike: () => void;
  impact: (m: Meteor) => void;
  removeBoom: (id: number) => void;
  serve: (n: number) => void;
  tickBill: (n: number) => void;
  tickSim: (dt: number) => void;
  scaleUp: (id: number) => void;
  rollback: () => void;
  triggerChaos: () => void;
  say: (text: string) => void;
  start: (s: Scenario) => void;
}

function pushLog(logs: LogEntry[], text: string): LogEntry[] {
  // useCity is declared below; this only runs after the store exists.
  return [{ id: nid(), text, at: useCity.getState().time }, ...logs].slice(0, 6);
}

function saveBest(day: number, won: boolean) {
  try {
    const raw = localStorage.getItem('sev1_best');
    const best = raw ? JSON.parse(raw) : { bestDay: 1, wins: 0 };
    best.bestDay = Math.max(best.bestDay, Math.min(day, 5));
    if (won) best.wins += 1;
    localStorage.setItem('sev1_best', JSON.stringify(best));
  } catch {
    // private mode; ignore
  }
}

export function loadBest(): { bestDay: number; wins: number } {
  try {
    const raw = localStorage.getItem('sev1_best');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { bestDay: 1, wins: 0 };
}

function speak(e: CmdEvent) {
  const st = useCity.getState();
  const line = narrate(e, st.cmdStats);
  const advice = adviceFor(e.kind);
  st.say(advice ? `${line} ${advice}` : line);
}

export const useCity = create<CityState>((set, get) => ({
  buildings: seedCity(),
  meteors: [],
  booms: [],
  logs: [{ id: 0, text: 'welcome to SEV-1 CITY. nothing is on fire. yet.', at: 9.5 }],
  served: 0,
  bill: 1200,
  lost: 0,
  time: 9.5,
  happiness: 82,
  revenue: 0,
  slowUntil: 0,
  extraCars: 0,
  nextChaos: 55,
  cmdLine: 'CMDR. OUTAGE reporting. I have read your architecture. We will talk later.',
  cmdAt: 0,
  cmdStats: { lost: 0, meteors: 0, scaled: 0, rollbacks: 0, deploys: 0 },
  started: false,
  scenario: 'normal',
  chaosMult: 1,
  day: 1,
  status: 'playing',
  loseReason: null,

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
    const stats = get().cmdStats;
    const vcMoney = get().scenario === 'launchday';
    set({
      buildings: [...buildings, b],
      happiness: Math.min(100, get().happiness + 2),
      cmdStats: { ...stats, deploys: stats.deploys + 1 },
      logs: pushLog(
        logs,
        vcMoney
          ? `deployed ${district} service on lot ${bx},${bz}. VC money, so it is free.`
          : `deployed ${district} service on lot ${bx},${bz}. no tests, obviously.`,
      ),
    });
    speak({ kind: 'deploy', district });
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
    const { buildings, meteors, booms, logs, bill, happiness } = get();
    const target = buildings.find((b) => b.id === m.buildingId);
    const tx = target ? blockToWorld(target.bx) : m.x;
    const tz = target ? blockToWorld(target.bz) : m.z;
    const damaged = buildings.map((b) => {
      if (b.id === m.buildingId) return b;
      const dx = blockToWorld(b.bx) - tx;
      const dz = blockToWorld(b.bz) - tz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 30) return { ...b, health: Math.max(20, b.health - 35) };
      return b;
    });
    const stats = get().cmdStats;
    set({
      buildings: damaged.filter((b) => b.id !== m.buildingId),
      meteors: meteors.filter((x) => x.id !== m.id),
      booms: [...booms, { id: nid(), x: m.x, y: target ? target.h : 2, z: m.z }],
      bill: bill + 4200,
      lost: get().lost + (target ? 1 : 0),
      happiness: Math.max(0, happiness - 12),
      cmdStats: {
        ...stats,
        meteors: stats.meteors + 1,
        lost: stats.lost + (target ? 1 : 0),
      },
      logs: pushLog(
        logs,
        target
          ? `meteor destroyed ${target.district}. +$4,200 cloud bill. oops.`
          : 'meteor hit an empty lot. the on-call team takes the credit.',
      ),
    });
    speak(target ? { kind: 'meteor', district: target.district } : { kind: 'empty-meteor' });
  },

  removeBoom: (id: number) =>
    set({ booms: get().booms.filter((b) => b.id !== id) }),

  serve: (n: number) => {
    const s = get();
    set({
      served: s.served + n,
      revenue: s.revenue + n * 0.5,
      happiness: Math.min(100, s.happiness + n * 0.05),
    });
  },
  tickBill: (n: number) => set({ bill: get().bill + n }),
  tickSim: (dt: number) => {
    const s = get();
    const healed = s.buildings.map((b) =>
      b.health < 100 ? { ...b, health: Math.min(100, b.health + dt * 1.5) } : b,
    );
    const newTime = (s.time + dt * 0.2) % 24;
    const newDay = newTime < s.time ? s.day + 1 : s.day;
    let status = s.status;
    let loseReason = s.loseReason;
    if (s.status === 'playing') {
      if (s.happiness <= 0) {
        status = 'lost';
        loseReason = 'revolt';
      } else if (s.bill > 100000) {
        status = 'lost';
        loseReason = 'bankrupt';
      } else if (newDay > 5) {
        status = 'won';
      }
    }
    set({
      buildings: healed,
      time: newTime,
      day: newDay,
      status,
      loseReason,
      happiness: Math.max(0, Math.min(100, s.happiness + (70 - s.happiness) * dt * 0.02)),
    });
    if (s.status === 'playing' && status !== 'playing') {
      saveBest(newDay, status === 'won');
      if (status === 'won') {
        get().say(
          'WEEK COMPLETE. Five days, zero resignations. I am as surprised as you are. ' +
            'Request your performance review. You have earned it. Probably.',
        );
      } else {
        get().say(
          loseReason === 'revolt'
            ? 'The citizens have voted you out. They are forming a union. Pack your things.'
            : 'BANKRUPT. The cloud bill ate the city. Somewhere, a FinOps person is smiling.',
        );
      }
    }
  },

  scaleUp: (id: number) => {
    const s = get();
    const b = s.buildings.find((x) => x.id === id);
    if (!b) return;
    const stats = s.cmdStats;
    set({
      buildings: s.buildings.map((x) =>
        x.id === id
          ? { ...x, h: Math.min(26, x.h + 5), w: x.w + 1, d: x.d + 1, health: Math.min(100, x.health + 30), born: performance.now() / 1000 - 0.4 }
          : x,
      ),
      bill: s.bill + 800,
      cmdStats: { ...stats, scaled: stats.scaled + 1 },
      logs: pushLog(s.logs, `scaled up ${b.district}. +$800. the cloud thanks you.`),
    });
    speak({ kind: 'scaleup', district: b.district });
  },

  rollback: () => {
    const s = get();
    if (!s.buildings.length) {
      set({ logs: pushLog(s.logs, 'nothing to roll back. suspiciously clean.') });
      return;
    }
    const newest = s.buildings.reduce((a, b) => (a.born > b.born ? a : b));
    const stats = s.cmdStats;
    set({
      buildings: s.buildings.filter((x) => x.id !== newest.id),
      bill: s.bill + 200,
      cmdStats: { ...stats, rollbacks: stats.rollbacks + 1 },
      logs: pushLog(s.logs, `rolled back ${newest.district}. like it never happened. (it happened.)`),
    });
    speak({ kind: 'rollback', district: newest.district });
  },

  triggerChaos: () => {
    const s = get();
    if (s.buildings.length < 4) return;
    const roll = Math.random();
    const now = performance.now() / 1000;
    if (roll < 0.35) {
      // rush hour: everything slows down
      const bf = s.scenario === 'blackfriday';
      const added = bf ? 16 : 10;
      set({
        slowUntil: now + 25,
        extraCars: added,
        logs: pushLog(s.logs, 'RUSH HOUR: traffic spike. the roads are soup.'),
      });
      speak({ kind: 'rushhour' });
      setTimeout(() => {
        const cur = get();
        set({ extraCars: Math.max(0, cur.extraCars - added) });
      }, 25000);
    } else if (roll < 0.7) {
      // meteor shower: region outage
      set({ logs: pushLog(s.logs, 'REGION OUTAGE: meteor shower inbound. say goodbye to a district.') });
      speak({ kind: 'shower' });
      const api = get();
      api.strike();
      setTimeout(() => get().strike(), 1200);
      setTimeout(() => get().strike(), 2400);
    } else {
      // dependency failure: databases go dark
      const dbs = s.buildings.filter((b) => b.district === 'db');
      if (!dbs.length) {
        get().strike();
        return;
      }
      set({
        buildings: s.buildings.map((b) =>
          b.district === 'db' ? { ...b, health: 22 } : b,
        ),
        happiness: Math.max(0, s.happiness - 8),
        logs: pushLog(s.logs, 'DEPENDENCY DOWN: the database district went dark. everything is waiting on it.'),
      });
      speak({ kind: 'dbdown' });
    }
    set({ nextChaos: now + (45 + Math.random() * 30) * s.chaosMult });
  },

  say: (text: string) => set({ cmdLine: text, cmdAt: performance.now() }),

  start: (scenario: Scenario) => {
    const s = get();
    if (scenario === 'launchday') {
      set({
        started: true,
        scenario,
        chaosMult: 1,
        buildings: seedCity(8),
        logs: pushLog(s.logs, 'LAUNCH DAY: 8 services, VC money. Deploys are free. Do not waste this.'),
      });
    } else {
      set({
        started: true,
        scenario,
        chaosMult: scenario === 'blackfriday' ? 0.5 : 1,
        logs: pushLog(
          s.logs,
          scenario === 'blackfriday'
            ? 'BLACK FRIDAY: chaos comes twice as fast. Good luck, mayor.'
            : 'Week 1 begins. Survive 5 days. Try to keep the bill under six figures.',
        ),
      });
    }
    try {
      localStorage.setItem('sev1_seen', '1');
    } catch {
      // ignore
    }
  },
}));
