# SEV-1 CITY

SimCity meets on-call. A 3D city-builder where you're the mayor of a
living cloud city.

Zone districts, deploy services, watch request-cars drive the roads.
Then chaos: meteors take out whole availability zones, and your cloud
bill ticks up while you watch. An AI incident commander narrates your
failures (coming in Phase 3).

Live demo: (deploying)

## Run it

Frontend:

```
cd frontend
npm install
npm run dev
```

Backend (stub for now, sim runs client-side):

```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Controls

- Drag to orbit, scroll to zoom
- **Deploy service**: drops a new building on a random empty lot
- **Meteor strike**: deletes a building the fun way

## Plan

See GAME_DESIGN.md. Phase 0 is the playable foundation: procedural
3D city, traffic, deploy and meteor toys, HUD with uptime, requests
served, and a cloud bill that only goes up.

Built with React Three Fiber, zustand, Tailwind. No game engine,
just the browser.
