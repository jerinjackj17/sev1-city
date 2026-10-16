import { useEffect, useState } from 'react';
import { useCity } from '../game/store';
import { moodFor, weeklyReview } from '../game/commander';

function Avatar() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0">
      <rect x="22" y="2" width="4" height="9" fill="#3b4356" />
      <circle cx="24" cy="4" r="3.2" fill="#ff5a5a" />
      <rect x="8" y="11" width="32" height="27" rx="7" fill="#3b4356" />
      <circle cx="18.5" cy="23" r="4.2" fill="#ffd27a" />
      <circle cx="29.5" cy="23" r="4.2" fill="#ffd27a" />
      <rect x="17" y="32" width="14" height="2.4" rx="1.2" fill="#1c2230" />
    </svg>
  );
}

const MOOD_STYLES: Record<string, string> = {
  smug: 'bg-sky-500/25 text-sky-300',
  tired: 'bg-amber-500/25 text-amber-300',
  feral: 'bg-red-500/25 text-red-300',
};

export function Commander() {
  const line = useCity((s) => s.cmdLine);
  const at = useCity((s) => s.cmdAt);
  const happiness = useCity((s) => s.happiness);
  const [shown, setShown] = useState(line);

  useEffect(() => {
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i += 4;
      setShown(line.slice(0, i));
      if (i >= line.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [line, at]);

  const mood = moodFor(happiness);

  const requestReview = () => {
    const st = useCity.getState();
    st.say(weeklyReview(st.cmdStats, st.bill));
  };

  return (
    <div className="pointer-events-auto absolute bottom-24 right-5 w-80 rounded-xl border border-slate-700/60 bg-black/60 p-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Avatar />
        <div>
          <div className="text-sm font-black tracking-wide text-slate-100">CMDR. OUTAGE</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">
            incident commander
          </div>
        </div>
        <span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${MOOD_STYLES[mood]}`}>
          {mood}
        </span>
      </div>
      <div className="mt-3 min-h-16 text-[12px] leading-relaxed text-slate-200">
        {shown}
        <span className="ml-0.5 inline-block h-3.5 w-2 animate-pulse bg-amber-300/80 align-text-bottom" />
      </div>
      <button
        onClick={requestReview}
        className="mt-3 w-full rounded-md border border-slate-600/80 bg-slate-800/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-300 transition hover:bg-slate-700/60 active:scale-[0.98]"
      >
        Request performance review
      </button>
    </div>
  );
}
