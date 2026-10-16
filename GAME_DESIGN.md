# SEV-1 CITY — Game Design Document

> SimCity meets on-call. You're the mayor of a living cloud city in 3D.
> Zone services, keep citizens (requests) happy, survive chaos.

## The fantasy

Every backend engineer has stared at a dashboard at 2 AM and thought
"this feels like the city is on fire." SEV-1 City makes that literal:
your infrastructure IS a city. Services are buildings. Requests are
cars. Deploys are construction. Incidents are disasters. And an AI
incident commander narrates your failures with love.

## Core loop

1. **Build** — zone districts, deploy services (buildings), lay network
   roads. Each service has a type: API, worker, database, cache, queue.
2. **Serve** — request-cars spawn from the edge (CDN gates) and drive to
   services. Served requests earn revenue. Latency shows as traffic.
3. **Survive** — chaos events strike: traffic spikes, region outages,
   bad deploys, dependency failures. Fires break out, buildings go dark.
4. **Respond** — scale up (add floors), reroute traffic, roll back.
   The AI incident commander scores your response and roasts you.
5. **Score** — end of the week: uptime %, p99 latency, cloud bill, and
   the commander's verdict on your mayorship.

## Districts (service types)

| District      | Building look              | Role                              |
|---------------|----------------------------|-----------------------------------|
| api-gateway   | glass tower, amber windows | entry point, routes traffic       |
| payments      | bank-like block, green     | high value, high risk             |
| auth          | tower with shield beacon   | everything depends on it          |
| workers       | low warehouses, pulsing    | async jobs, queues                |
| database      | cylinder vaults, blue glow | storage; slow = city-wide jam     |
| cache         | small fast kiosks, cyan    | absorbs spikes if placed well     |
| notifications | antenna spires             | fire-and-forget traffic           |

## Chaos deck (disasters)

- **Rush hour** — traffic spike, roads clog, latency climbs.
- **Region outage** — a meteor takes out a whole block. Literal meteor.
- **Bad deploy** — Godzilla (a giant bug) stomps from the deploy zone.
- **Dependency down** — the database district goes dark; everything
  that depends on it queues up visibly.
- **Noisy neighbor** — one building hogs power, neighbors brown out.

## The AI incident commander

A sarcastic on-call veteran who:
- announces every incident ("The payments district is on fire.")
- offers exactly one piece of real advice per incident
- scores your response time and writes your weekly review
- never breaks character, never says "as an AI"

## Win / lose

- **Win the week**: keep uptime above 99.9% through 7 in-game days
  with a cloud bill under budget.
- **Lose**: city happiness hits zero (citizens = requests start
  leaving 1-star reviews on the city) or the bill bankrupts you.

## Tech

- Frontend: Vite + React + TS + Tailwind, Three.js via
  @react-three/fiber + drei, zustand for game state.
- Backend (later phases): FastAPI — simulation authority, chaos
  scheduler, LLM incident commander, leaderboards.
- Deploy: Vercel (frontend) + serverless functions (API), same
  pattern as the trio.

## Build phases

- **Phase 0 — Foundation (done)**: 3D city renders, procedural
  buildings, roads, animated request cars, orbit camera, deploy-a-
  building and meteor-strike toys, HUD.
- **Phase 1 — Simulation (done)**: day/night cycle with sun rig and
  glowing windows at night, building health + damage beacons + splash
  damage, citizen happiness meter, revenue vs cloud bill, traffic that
  slows under load, in-game clock.
- **Phase 2 — Chaos engine (done)**: event deck draws every 45-75s
  (rush hour traffic spike, meteor-shower region outage, database
  dependency failure), timestamped incident log, response tools:
  click any building to scale it up, Rollback button.
- **Phase 3 — AI commander**: LLM narration, per-incident advice,
  weekly review generation, personality that remembers your
  worst moments.
- **Phase 4 — Game**: win/lose, scenarios (Black Friday, launch
  day), persistence, leaderboards, tutorial, polish, launch.

## Rules for the build

- Every phase ships playable. No dead scaffolding.
- Copy is funny but the simulation is honest: real queueing
  intuition, real tradeoffs (cache placement matters, single
  points of failure hurt).
- No em dashes in any user-facing copy. No AI-slop filler.
- Performance: instanced meshes, capped particles, 60fps target
  on a normal laptop.
