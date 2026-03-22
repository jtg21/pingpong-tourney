// ── State ──
const STORAGE_KEY = 'pingpong-tourney';

function defaultState() {
    return {
        teams: null,       // [{name, players: [str,str,str]}] x3
        matches: null,     // [{teamA, teamB, games: [{winner, scoreA, scoreB, playersA, playersB}], activePlayersA, activePlayersB, status, winner}]
    };
}

let state = load();

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : defaultState();
    } catch { return defaultState(); }
}

// ── Navigation ──
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(view) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
    if (view === 'standings') renderStandings();
    if (view === 'matches') renderMatches();
    if (view === 'setup') populateSetup();
}

// ── Setup ──
function populateSetup() {
    if (!state.teams) return;
    document.querySelectorAll('.team-card').forEach((card, i) => {
        const team = state.teams[i];
        card.querySelector('.team-name-input').value = team.name;
        card.querySelectorAll('.player-input').forEach((inp, j) => {
            inp.value = team.players[j];
        });
    });
}

document.getElementById('save-setup').addEventListener('click', () => {
    const teams = [];
    let valid = true;
    document.querySelectorAll('.team-card').forEach((card, i) => {
        const name = card.querySelector('.team-name-input').value.trim() || `Team ${i + 1}`;
        const players = [];
        card.querySelectorAll('.player-input').forEach(inp => {
            const v = inp.value.trim();
            if (!v) valid = false;
            players.push(v || '?');
        });
        teams.push({ name, players });
    });

    if (!valid) { alert('Please fill in all player names.'); return; }

    state.teams = teams;

    // Create round-robin matches if none exist or teams changed
    if (!state.matches || teamsChanged(teams)) {
        state.matches = [];
        for (let i = 0; i < 3; i++) {
            for (let j = i + 1; j < 3; j++) {
                state.matches.push({
                    teamA: i,
                    teamB: j,
                    games: [],
                    activePlayersA: [0, 1], // indices into teams[i].players
                    activePlayersB: [0, 1],
                    status: 'pending', // pending | active | done
                    winner: null,
                    pendingSwap: null, // {team: 'a'|'b'} when waiting for swap selection
                });
            }
        }
    }

    save();
    switchView('standings');
});

function teamsChanged(newTeams) {
    if (!state.matches) return true;
    // Check if any match is already started — if so, don't reset
    return false;
}

document.getElementById('reset-tournament').addEventListener('click', () => {
    if (!confirm('Reset the entire tournament? This cannot be undone.')) return;
    state = defaultState();
    save();
    document.querySelectorAll('.team-card').forEach(card => {
        card.querySelector('.team-name-input').value = '';
        card.querySelectorAll('.player-input').forEach(inp => inp.value = '');
    });
    switchView('setup');
});

// ── Standings ──
function renderStandings() {
    const empty = document.getElementById('standings-empty');
    const table = document.getElementById('standings-table');
    const banner = document.getElementById('winner-banner');

    if (!state.teams) { empty.classList.remove('hidden'); table.classList.add('hidden'); banner.classList.add('hidden'); return; }
    empty.classList.add('hidden');
    table.classList.remove('hidden');

    const stats = state.teams.map((t, i) => ({ idx: i, name: t.name, matchW: 0, matchL: 0, gameW: 0, gameL: 0 }));

    (state.matches || []).forEach(m => {
        const gamesA = m.games.filter(g => g.winner === 'a').length;
        const gamesB = m.games.filter(g => g.winner === 'b').length;
        stats[m.teamA].gameW += gamesA;
        stats[m.teamA].gameL += gamesB;
        stats[m.teamB].gameW += gamesB;
        stats[m.teamB].gameL += gamesA;
        if (m.status === 'done') {
            if (m.winner === 'a') { stats[m.teamA].matchW++; stats[m.teamB].matchL++; }
            else { stats[m.teamB].matchW++; stats[m.teamA].matchL++; }
        }
    });

    stats.sort((a, b) => {
        if (b.matchW !== a.matchW) return b.matchW - a.matchW;
        return b.gameW - a.gameW;
    });

    const body = document.getElementById('standings-body');
    body.innerHTML = stats.map((s, i) => `
        <tr>
            <td class="${i === 0 ? 'rank-1' : ''}">${i + 1}</td>
            <td>${esc(s.name)}</td>
            <td>${s.matchW}-${s.matchL}</td>
            <td>${s.gameW}-${s.gameL}</td>
        </tr>
    `).join('');

    // Check for winner
    const allDone = state.matches && state.matches.every(m => m.status === 'done');
    if (allDone && state.matches.length > 0) {
        banner.classList.remove('hidden');
        banner.textContent = `${stats[0].name} wins the tournament!`;
    } else {
        banner.classList.add('hidden');
    }
}

// ── Matches ──
function renderMatches() {
    const empty = document.getElementById('matches-empty');
    const list = document.getElementById('match-list');

    if (!state.teams || !state.matches) { empty.classList.remove('hidden'); list.innerHTML = ''; return; }
    empty.classList.add('hidden');

    list.innerHTML = state.matches.map((m, i) => {
        const nameA = state.teams[m.teamA].name;
        const nameB = state.teams[m.teamB].name;
        const gamesA = m.games.filter(g => g.winner === 'a').length;
        const gamesB = m.games.filter(g => g.winner === 'b').length;
        const badgeClass = m.status === 'done' ? 'badge-done' : m.status === 'active' ? 'badge-active' : 'badge-pending';
        const label = m.status === 'done' ? 'Complete' : m.status === 'active' ? 'In Progress' : 'Not Started';
        const winnerNote = m.status === 'done' ? ` — ${m.winner === 'a' ? nameA : nameB} wins` : '';

        return `
            <div class="match-card" data-match="${i}">
                <div>
                    <div class="match-teams">${esc(nameA)} vs ${esc(nameB)}</div>
                    <div class="match-score">Games: ${gamesA}-${gamesB}${winnerNote}</div>
                </div>
                <span class="match-badge ${badgeClass}">${label}</span>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => openMatch(parseInt(card.dataset.match)));
    });
}

// ── Match Play ──
let currentMatchIdx = null;

function openMatch(idx) {
    currentMatchIdx = idx;
    const m = state.matches[idx];
    if (m.status === 'pending') m.status = 'active';
    save();

    document.getElementById('match-overlay').classList.remove('hidden');
    renderMatchPlay();
}

document.getElementById('close-overlay').addEventListener('click', () => {
    document.getElementById('match-overlay').classList.add('hidden');
    currentMatchIdx = null;
    renderMatches();
    renderStandings();
});

function renderMatchPlay() {
    const m = state.matches[currentMatchIdx];
    const teamA = state.teams[m.teamA];
    const teamB = state.teams[m.teamB];

    document.getElementById('match-title').textContent = `${teamA.name} vs ${teamB.name}`;

    const gamesA = m.games.filter(g => g.winner === 'a').length;
    const gamesB = m.games.filter(g => g.winner === 'b').length;
    const consecutiveInfo = getConsecutiveInfo(m);

    let statusText = `Games: ${gamesA}-${gamesB}`;
    if (consecutiveInfo.streak > 0) {
        const streakTeam = consecutiveInfo.lastWinner === 'a' ? teamA.name : teamB.name;
        statusText += ` | ${streakTeam} has ${consecutiveInfo.streak} consecutive win${consecutiveInfo.streak > 1 ? 's' : ''}`;
    }
    if (m.games.length > 0) statusText += ` | Game ${m.games.length + 1} of max 11`;

    document.getElementById('match-status-banner').textContent = statusText;

    // Active players
    document.getElementById('team-a-label').textContent = teamA.name;
    document.getElementById('team-b-label').textContent = teamB.name;
    document.getElementById('team-a-players').innerHTML = m.activePlayersA.map(i =>
        `<span class="player-tag">${esc(teamA.players[i])}</span>`
    ).join('');
    document.getElementById('team-b-players').innerHTML = m.activePlayersB.map(i =>
        `<span class="player-tag">${esc(teamB.players[i])}</span>`
    ).join('');

    // Score (current game)
    document.getElementById('score-a').textContent = m.currentScoreA || 0;
    document.getElementById('score-b').textContent = m.currentScoreB || 0;

    const isDone = m.status === 'done';
    const isPendingSwap = m.pendingSwap != null;
    document.getElementById('point-a').disabled = isDone || isPendingSwap;
    document.getElementById('point-b').disabled = isDone || isPendingSwap;
    document.getElementById('undo-point').disabled = isDone || isPendingSwap;

    // Swap modal
    if (isPendingSwap) {
        renderSwapModal(m);
    } else {
        document.getElementById('swap-modal').classList.add('hidden');
    }

    // Game log
    renderGameLog(m);

    // Set won banner
    if (isDone) {
        const winnerName = m.winner === 'a' ? teamA.name : teamB.name;
        const reason = getWinReason(m);
        document.getElementById('match-status-banner').innerHTML =
            `<div class="set-won-banner">${esc(winnerName)} wins the match! ${reason}</div>`;
    }
}

function getConsecutiveInfo(m) {
    if (m.games.length === 0) return { streak: 0, lastWinner: null };
    let streak = 1;
    const lastWinner = m.games[m.games.length - 1].winner;
    for (let i = m.games.length - 2; i >= 0; i--) {
        if (m.games[i].winner === lastWinner) streak++;
        else break;
    }
    return { streak, lastWinner };
}

function getWinReason(m) {
    const info = getConsecutiveInfo(m);
    if (info.streak >= 2) return '(2 consecutive wins)';
    return '(best of 11 games)';
}

function checkMatchEnd(m) {
    // Check consecutive wins
    const info = getConsecutiveInfo(m);
    if (info.streak >= 2) {
        m.status = 'done';
        m.winner = info.lastWinner;
        return true;
    }
    // Check best of 11
    if (m.games.length >= 11) {
        const gamesA = m.games.filter(g => g.winner === 'a').length;
        const gamesB = m.games.filter(g => g.winner === 'b').length;
        m.status = 'done';
        m.winner = gamesA >= gamesB ? 'a' : 'b';
        return true;
    }
    return false;
}

function addPoint(side) {
    const m = state.matches[currentMatchIdx];
    if (m.status === 'done' || m.pendingSwap) return;

    if (!m.currentScoreA) m.currentScoreA = 0;
    if (!m.currentScoreB) m.currentScoreB = 0;
    if (!m.pointLog) m.pointLog = [];

    if (side === 'a') m.currentScoreA++;
    else m.currentScoreB++;

    m.pointLog.push(side);

    // Check if game is won (first to 11, win by 2 if >= 10-10)
    const a = m.currentScoreA, b = m.currentScoreB;
    if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2) {
        const winner = a > b ? 'a' : 'b';
        m.games.push({
            winner,
            scoreA: a,
            scoreB: b,
            playersA: [...m.activePlayersA],
            playersB: [...m.activePlayersB],
        });
        m.currentScoreA = 0;
        m.currentScoreB = 0;
        m.pointLog = [];

        // Check if match is over
        if (!checkMatchEnd(m)) {
            // Winner needs to swap a player
            const winnerTeamIdx = winner === 'a' ? m.teamA : m.teamB;
            const activePlayers = winner === 'a' ? m.activePlayersA : m.activePlayersB;
            const benchPlayer = [0, 1, 2].find(i => !activePlayers.includes(i));

            if (benchPlayer !== undefined) {
                m.pendingSwap = { team: winner, benchPlayer };
            }
        }
    }

    save();
    renderMatchPlay();
}

document.getElementById('point-a').addEventListener('click', () => addPoint('a'));
document.getElementById('point-b').addEventListener('click', () => addPoint('b'));

document.getElementById('undo-point').addEventListener('click', () => {
    const m = state.matches[currentMatchIdx];
    if (m.status === 'done' || m.pendingSwap) return;
    if (!m.pointLog || m.pointLog.length === 0) return;

    const lastSide = m.pointLog.pop();
    if (lastSide === 'a') m.currentScoreA--;
    else m.currentScoreB--;

    save();
    renderMatchPlay();
});

function renderSwapModal(m) {
    const modal = document.getElementById('swap-modal');
    modal.classList.remove('hidden');

    const teamIdx = m.pendingSwap.team === 'a' ? m.teamA : m.teamB;
    const team = state.teams[teamIdx];
    const activePlayers = m.pendingSwap.team === 'a' ? m.activePlayersA : m.activePlayersB;
    const benchPlayerName = team.players[m.pendingSwap.benchPlayer];

    document.getElementById('swap-prompt').textContent =
        `${team.name} won! Swap one active player with ${benchPlayerName}.`;

    const opts = document.getElementById('swap-options');
    opts.innerHTML = activePlayers.map(pi => `
        <button class="swap-btn" data-player="${pi}">Swap out ${esc(team.players[pi])}</button>
    `).join('');

    opts.querySelectorAll('.swap-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const playerOut = parseInt(btn.dataset.player);
            const playerIn = m.pendingSwap.benchPlayer;
            const active = m.pendingSwap.team === 'a' ? m.activePlayersA : m.activePlayersB;

            const idx = active.indexOf(playerOut);
            active[idx] = playerIn;

            m.pendingSwap = null;
            save();
            renderMatchPlay();
        });
    });
}

function renderGameLog(m) {
    const entries = document.getElementById('game-log-entries');
    if (m.games.length === 0) {
        entries.innerHTML = '<p style="color:var(--text-dim);font-size:0.85rem;">No games played yet.</p>';
        return;
    }

    const teamA = state.teams[m.teamA];
    const teamB = state.teams[m.teamB];

    entries.innerHTML = m.games.map((g, i) => {
        const winnerName = g.winner === 'a' ? teamA.name : teamB.name;
        const playersA = g.playersA.map(pi => teamA.players[pi]).join(' & ');
        const playersB = g.playersB.map(pi => teamB.players[pi]).join(' & ');
        return `
            <div class="log-entry">
                <div>
                    <span class="log-winner">Game ${i + 1}: ${esc(winnerName)}</span>
                    <div class="log-players">${esc(playersA)} vs ${esc(playersB)}</div>
                </div>
                <span class="log-score">${g.scoreA}-${g.scoreB}</span>
            </div>
        `;
    }).join('');
}

// ── Helpers ──
function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ── Init ──
if (state.teams) {
    switchView('standings');
} else {
    switchView('setup');
}
