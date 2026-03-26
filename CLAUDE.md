# Ping Pong Tournament Tracker

Full-stack app for tracking a 3-team doubles ping pong tournament.

## Stack
- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL (`pingpong-tourney`)

## Running
```bash
./start.sh        # Start both backend and frontend
./start.sh --stop # Stop both
```

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3002`
- Public: `https://pingpong-tourney.scrytime.com`

## Testing
```bash
cd backend && source .venv/bin/activate && pytest
cd frontend && npm test
```

## API Endpoints
- `POST /api/tournament` — Create tournament (3 teams, 3 players each)
- `GET /api/tournament` — Get full state (teams, matches, standings)
- `POST /api/matches/{id}/point` — Add a point `{side: "a"|"b"}`
- `POST /api/matches/{id}/undo` — Undo last point
- `POST /api/matches/{id}/swap` — Swap player `{player_out: index}`
- `GET /api/health` — Health check

## Rules
- 3 teams of 3, doubles (2v2), games to 11 (win by 2)
- Win match by 2 consecutive game wins; fallback best of 11
- Winning team swaps 1 player after each game win
- Round robin, best record wins, tiebreaker = total game wins
