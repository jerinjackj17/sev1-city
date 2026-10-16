// CMDR. OUTAGE — the AI incident commander.
//
// Phase 3 ships the commander as a client-side personality engine:
// hand-written lines with real game awareness (it knows your stats).
// The narrate() signature is the LLM seam: swap the body for a
// backend call in Phase 3b and everything else keeps working.

export type CmdEvent =
  | { kind: 'meteor'; district: string }
  | { kind: 'empty-meteor' }
  | { kind: 'shower' }
  | { kind: 'rushhour' }
  | { kind: 'dbdown' }
  | { kind: 'deploy'; district: string }
  | { kind: 'scaleup'; district: string }
  | { kind: 'rollback'; district: string };

export interface CmdStats {
  lost: number;
  meteors: number;
  scaled: number;
  rollbacks: number;
  deploys: number;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function narrate(e: CmdEvent, s: CmdStats): string {
  switch (e.kind) {
    case 'meteor':
      return pick([
        `The ${e.district} district is gone. I've seen better disaster recovery in a group chat.`,
        s.lost >= 3
          ? `That's building number ${s.lost + 1} this week. I'm updating your performance review.`
          : `The ${e.district} district is down. On the bright side, your cloud bill just went up.`,
        `RIP ${e.district}. It had a good run. Eleven minutes.`,
      ]);
    case 'empty-meteor':
      return 'The meteor hit an empty lot. Even the disasters are disappointed in your capacity planning.';
    case 'shower':
      return pick([
        'REGION OUTAGE. Three meteors. Somewhere, a status page just turned red.',
        'Meteor shower. This is why we have multiple regions. You have multiple regions, right?',
      ]);
    case 'rushhour':
      return pick([
        'RUSH HOUR. Your roads have the throughput of a single-threaded script.',
        'Traffic spike. The cars are barely moving. Just like your last sprint.',
      ]);
    case 'dbdown':
      return pick([
        'The database district is dark. Everything is standing around waiting. Just like your standups.',
        'Database down. Every service is now a very expensive paperweight.',
      ]);
    case 'deploy':
      return pick([
        `Deployed ${e.district}. No tests, obviously. I'll allow it. This time.`,
        `Another ${e.district} service. Your architecture diagram now needs a magnifying glass.`,
      ]);
    case 'scaleup':
      return pick([
        `Scaled up ${e.district}. Throwing money at the problem: a classic, and honestly, effective.`,
        `Bigger ${e.district}. Same bugs, but now they cost more per hour.`,
      ]);
    case 'rollback':
      return pick([
        `Rolled back ${e.district}. Like it never happened. (It happened. I have logs.)`,
        'Good rollback. Fastest incident resolution you have had all week. The bar is on the floor.',
      ]);
  }
}

export function adviceFor(kind: CmdEvent['kind']): string | null {
  switch (kind) {
    case 'meteor':
      return 'Advice: stop deploying on Fridays. I know it is Tuesday. Stop anyway.';
    case 'shower':
      return 'Advice: multi-region is not a personality trait, it is an architecture. Look into it.';
    case 'rushhour':
      return 'Advice: this is what autoscaling is for. You have autoscaling, right? Right?';
    case 'dbdown':
      return 'Advice: read replicas. Caching. A second database. Pick one, I am begging you.';
    default:
      return null;
  }
}

export function weeklyReview(s: CmdStats, bill: number): string {
  const verdict =
    s.lost === 0
      ? 'Suspiciously competent. I am watching you.'
      : s.lost <= 3
        ? 'Adequate. The city stands. Mostly.'
        : 'Have you considered meteorology? You seem to attract them.';
  return (
    `PERFORMANCE REVIEW, WEEK 1: you lost ${s.lost} building${s.lost === 1 ? '' : 's'} ` +
    `to space rocks, which is ${s.lost} more than the recommended zero. ` +
    `You deployed ${s.deploys} services, scaled up ${s.scaled} times, ` +
    `and rolled back ${s.rollbacks} times. The cloud bill is $${Math.round(bill).toLocaleString()}. ` +
    `Verdict: ${verdict}`
  );
}

export function moodFor(happiness: number): 'smug' | 'tired' | 'feral' {
  if (happiness > 65) return 'smug';
  if (happiness > 35) return 'tired';
  return 'feral';
}
