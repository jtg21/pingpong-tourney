# Ping Pong Tournament Tracker

Static single-page app deployed via GitHub Pages. No build step — pure HTML/CSS/JS.

## Stack
- Vanilla HTML/CSS/JS
- localStorage for persistence
- GitHub Pages for hosting

## Rules
- 3 teams of 3, doubles (2v2), games to 11
- Win a set by winning 2 games back to back
- After each game win, winning team rotates 1 player out
- If no consecutive wins after 11 games, most game wins takes the set
- Round robin format; best record wins; tiebreaker = most total game wins
- Matches can be paused and resumed

## Deploy
Push to `main` — GitHub Pages serves from root.
