# Ping Pong Tournament Tracker

A web app for tracking a 3-team ping pong tournament with doubles play.

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

No build step required. Just open `index.html` in a browser, or visit the GitHub Pages deployment.

All tournament data is stored in your browser's localStorage.

## Development

```bash
# Serve locally
python3 -m http.server 8000
# Then open http://localhost:8000
```
