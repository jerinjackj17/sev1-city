import { useCity } from '../game/store';

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtClock(t: number): string {
  const hh = Math.floor(t);
  const mm = Math.floor((t - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function Hud() {
  const served = useCity((s) => s.served);
  const bill = useCity((s) => s.bill);
  const lost = useCity((s) => s.lost);
  const logs = useCity((s) => s.logs);
  const happiness = useCity((s) => s.happiness);
  const revenue = useCity((s) => s.revenue);
  const time = useCity((s) => s.time);
  const day = useCity((s) => s.day);
  const deploy = useCity((s) => s.deploy);
  const strike = useCity((s) => s.strike);
  const rollback = useCity((s) => s.rollback);

  const uptime = (100 - lost * 0.7).toFixed(2);
  const net = revenue - bill;
  const hh = Math.floor(time);
  const mm = Math.floor((time - hh) * 60);
  const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const happyTone = happiness > 60 ? 'bg-emerald-400' : happiness > 30 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* title */}
      <div className="absolute left-5 top-5">
        <div className="text-3xl font-black tracking-tight text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          SEV-1 CITY
        </div>
        <div className="mt-1 text-xs text-slate-300/90">
          day {day} of 5 · mayor of the on-call
        </div>
      </div>

      {/* stats */}
      <div className="absolute right-5 top-5 flex items-stretch gap-5 rounded-lg bg-black/45 px-4 py-3 backdrop-blur-sm">
        <Stat label="uptime" value={`${uptime}%`} tone={lost > 0 ? 'text-red-300' : 'text-emerald-300'} />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">citizens</div>
          <div className="mt-1.5 h-2.5 w-24 overflow-hidden rounded-full bg-slate-700/60">
            <div className={`h-full rounded-full transition-all ${happyTone}`} style={{ width: `${happiness}%` }} />
          </div>
          <div className="mt-0.5 text-[10px] tabular-nums text-slate-300">{Math.round(happiness)}% happy</div>
        </div>
        <Stat label="requests served" value={fmt(served)} tone="text-sky-300" />
        <Stat
          label="net"
          value={`${net < 0 ? '-' : ''}$${fmt(Math.abs(Math.round(net)))}`}
          tone={net < 0 ? 'text-red-300' : 'text-emerald-300'}
        />
        <Stat label="time" value={clock} tone="text-slate-200" />
      </div>

      {/* event log */}
      <div className="absolute bottom-5 left-5 w-80 space-y-1">
        {logs.map((l) => (
          <div
            key={l.id}
            className="rounded bg-black/45 px-2.5 py-1 text-[11px] leading-snug text-slate-200 backdrop-blur-sm"
          >
            <span className="mr-1.5 text-amber-400/80 tabular-nums">{fmtClock(l.at)}</span>
            {l.text}
          </div>
        ))}
      </div>

      {/* actions */}
      <div className="pointer-events-auto absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-3">
        <button
          onClick={deploy}
          className="rounded-lg bg-amber-400 px-6 py-3 text-sm font-bold text-black shadow-[0_4px_20px_rgba(251,191,36,0.4)] transition hover:bg-amber-300 active:scale-95"
        >
          ＋ Deploy service
        </button>
        <button
          onClick={rollback}
          className="rounded-lg bg-sky-500/90 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(56,189,248,0.4)] transition hover:bg-sky-400 active:scale-95"
        >
          ↩ Rollback
        </button>
        <button
          onClick={strike}
          className="rounded-lg bg-red-500/90 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(239,68,68,0.4)] transition hover:bg-red-400 active:scale-95"
        >
          ☄ Meteor strike
        </button>
      </div>

      {/* hint */}
      <div className="absolute bottom-5 right-5 text-right text-[11px] leading-relaxed text-slate-400/80">
        drag to orbit · scroll to zoom
        <br />
        click a building to scale it up ($800)
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <div className={`text-lg font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  );
}
