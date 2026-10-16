"""SEV-1 CITY backend (stub for Phase 0).

Phase 0 runs the whole simulation client-side. This service will become
the simulation authority in Phase 1 (game ticks, chaos scheduler) and
host the AI incident commander in Phase 3.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="sev1-city")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "phase": 0, "sim": "client-side"}
