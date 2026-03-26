# Ping Pong Tournament Tracker

A full-stack web app for tracking a 3-team ping pong tournament with doubles play.

## Rules

- **3 teams of 3** playing doubles (2v2)
- Games are played to **11 points** (win by 2)
- To win a match: win **2 games back-to-back**
- After each game win, the winning team **swaps out 1 player**
- If no consecutive wins occur, **best of 11 games** decides the match
- Teams play each other **round robin** — best record wins
- Tiebreaker: most total game wins
- Matches can be **paused and resumed** at any time

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL

### Install

```bash
# Backend
cd backend
uv venv .venv && uv pip install -e ".[dev]"

# Database
createdb pingpong-tourney
source .venv/bin/activate && alembic upgrade head

# Frontend
cd ../frontend
npm install
```

### Run

```bash
./start.sh        # Start backend + frontend
./start.sh --stop # Stop both
```

- Frontend: http://localhost:3002
- Backend API: http://localhost:3001
- Public URL: https://pingpong-tourney.scrytime.com

### Test

```bash
cd backend && source .venv/bin/activate && pytest
cd frontend && npm test
```
