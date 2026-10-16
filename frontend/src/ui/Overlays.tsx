import { useState } from 'react';
import { loadBest, useCity, type Scenario } from '../game/store';

const SCENARIOS: Array<{ id: Scenario; name: string; desc: string }> = [
  { id: 'normal', name: 'Normalville', desc: 'A calm week. Chaos every minute or so. For mayors who sleep.' },
  { id: 'blackfriday', name: 'Black Friday', desc: 'Chaos twice as fast, angrier traffic. For mayors who do not.' },
  { id: 'launchday', name: 'Launch Day', desc: 'Start with 8 services and VC money. Grow or die.' },
];

export function StartScreen() {
  const started = useCity((s) => s.started);
  const start = useCity((s) => s.start);
  const [best] = useState(loadBest);
  if (started) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
      <div className="w-[min(560px,92vw)] rounded-2xl border border-slate-700/70 bg-[#0e152e]/95 p-8 shadow-2xl">
        <div className="text-4xl font-black tracking-tight text-amber-300">SEV-1 CITY</div>
        <div className="mt-1 text-sm text-slate-300">
          SimCity meets on-call. You are the mayor. Survive 5 days.
        </div>

        <div className="mt-6 space-y-2">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => start(sc.id)}
              className="w-full rounded-lg border border-slate-700/70 bg-slate-800/50 px-4 py-3 text-left transition hover:border-amber-400/60 hover:bg-slate-800 active:scale-[0.99]"
            >
              <div className="text-sm font-bold text-slate-100">{sc.name}</div>
              <div className="mt-0.5 text-xs text-slate-400">{sc.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-black/40 p-4 text-[12px] leading-relaxed text-slate-300">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Field manual
          </div>
          Drag to orbit, scroll to zoom. Deploy services to grow. Click a
          building to scale it up. When things explode, listen to
          CMDR. OUTAGE. He is always right. Mostly.
        </div>

        {(best.wins > 0 || best.bestDay > 1) && (
          <div className="mt-3 text-center text-[11px] text-slate-500">
            Best run: day {best.bestDay} · {best.wins} {best.wins === 1 ? 'week' : 'weeks'} survived
          </div>
        )}
      </div>
    </div>
  );
}

export function EndScreen() {
  const status = useCity((s) => s.status);
  const loseReason = useCity((s) => s.loseReason);
  const day = useCity((s) => s.day);
  const stats = useCity((s) => s.cmdStats);
  const bill = useCity((s) => s.bill);
  if (status === 'playing') return null;

  const won = status === 'won';
  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <div className="w-[min(520px,92vw)] rounded-2xl border border-slate-700/70 bg-[#0e152e]/95 p-8 text-center shadow-2xl">
        <div className={`text-4xl font-black tracking-tight ${won ? 'text-emerald-300' : 'text-red-300'}`}>
          {won ? 'WEEK SURVIVED' : 'CITY LOST'}
        </div>
        <div className="mt-2 text-sm text-slate-300">
          {won
            ? 'Five days. The city stands. CMDR. OUTAGE is as surprised as you are.'
            : loseReason === 'revolt'
              ? 'The citizens voted you out on day ' + day + '. They are forming a union.'
              : 'The cloud bill ate the city on day ' + day + '. Somewhere, a FinOps person is smiling.'}
        </div>
        <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3 text-center">
          <EndStat label="buildings lost" value={String(stats.lost)} />
          <EndStat label="deploys" value={String(stats.deploys)} />
          <EndStat label="final bill" value={'$' + Math.round(bill).toLocaleString()} />
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-7 rounded-lg bg-amber-400 px-8 py-3 text-sm font-bold text-black transition hover:bg-amber-300 active:scale-95"
        >
          Run it back
        </button>
      </div>
    </div>
  );
}

function EndStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/40 px-2 py-3">
      <div className="text-lg font-bold tabular-nums text-slate-100">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}
