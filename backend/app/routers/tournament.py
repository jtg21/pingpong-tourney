from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import Game, Match, Player, Team
from app.schemas import (
    MatchOut,
    PointInput,
    StandingOut,
    SwapInput,
    TeamOut,
    TournamentCreate,
    TournamentOut,
)

router = APIRouter(prefix="/api")


async def _load_teams(db: AsyncSession) -> list[Team]:
    result = await db.execute(select(Team).options(selectinload(Team.players)).order_by(Team.id))
    return list(result.scalars().all())


async def _load_matches(db: AsyncSession) -> list[Match]:
    result = await db.execute(select(Match).options(selectinload(Match.games)).order_by(Match.id))
    return list(result.scalars().all())


async def _load_match(db: AsyncSession, match_id: int) -> Match:
    result = await db.execute(
        select(Match).options(selectinload(Match.games)).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


def _compute_standings(teams: list[Team], matches: list[Match]) -> list[StandingOut]:
    stats = {}
    for t in teams:
        stats[t.id] = {"team": t, "match_wins": 0, "match_losses": 0, "game_wins": 0, "game_losses": 0}

    for m in matches:
        games_a = sum(1 for g in m.games if g.winner_side == "a")
        games_b = sum(1 for g in m.games if g.winner_side == "b")
        stats[m.team_a_id]["game_wins"] += games_a
        stats[m.team_a_id]["game_losses"] += games_b
        stats[m.team_b_id]["game_wins"] += games_b
        stats[m.team_b_id]["game_losses"] += games_a
        if m.status == "done":
            if m.winner_side == "a":
                stats[m.team_a_id]["match_wins"] += 1
                stats[m.team_b_id]["match_losses"] += 1
            else:
                stats[m.team_b_id]["match_wins"] += 1
                stats[m.team_a_id]["match_losses"] += 1

    standings = sorted(
        stats.values(),
        key=lambda s: (s["match_wins"], s["game_wins"]),
        reverse=True,
    )
    return [StandingOut(**s) for s in standings]


@router.post("/tournament")
async def create_tournament(data: TournamentCreate, db: AsyncSession = Depends(get_db)):
    if len(data.teams) != 3:
        raise HTTPException(status_code=400, detail="Exactly 3 teams required")
    for t in data.teams:
        if len(t.players) != 3:
            raise HTTPException(status_code=400, detail=f"Team '{t.name}' must have exactly 3 players")

    # Clear existing data
    await db.execute(Game.__table__.delete())
    await db.execute(Match.__table__.delete())
    await db.execute(Player.__table__.delete())
    await db.execute(Team.__table__.delete())

    teams = []
    for t in data.teams:
        team = Team(name=t.name)
        for pname in t.players:
            team.players.append(Player(name=pname))
        db.add(team)
        teams.append(team)

    await db.flush()

    # Create round-robin matches
    pairs = [(0, 1), (0, 2), (1, 2)]
    for i, j in pairs:
        match = Match(
            team_a_id=teams[i].id,
            team_b_id=teams[j].id,
            active_players_a=[0, 1],
            active_players_b=[0, 1],
        )
        db.add(match)

    await db.commit()
    return {"status": "ok"}


@router.get("/tournament", response_model=TournamentOut)
async def get_tournament(db: AsyncSession = Depends(get_db)):
    teams = await _load_teams(db)
    matches = await _load_matches(db)
    standings = _compute_standings(teams, matches)
    return TournamentOut(
        teams=[TeamOut.model_validate(t) for t in teams],
        matches=[MatchOut.model_validate(m) for m in matches],
        standings=standings,
    )


@router.post("/matches/{match_id}/point", response_model=MatchOut)
async def add_point(match_id: int, data: PointInput, db: AsyncSession = Depends(get_db)):
    match = await _load_match(db, match_id)

    if match.status == "done":
        raise HTTPException(status_code=400, detail="Match is already complete")
    if match.pending_swap:
        raise HTTPException(status_code=400, detail="Must complete player swap first")
    if data.side not in ("a", "b"):
        raise HTTPException(status_code=400, detail="Side must be 'a' or 'b'")

    if match.status == "pending":
        match.status = "active"

    if data.side == "a":
        match.current_score_a += 1
    else:
        match.current_score_b += 1

    point_log = list(match.point_log or [])
    point_log.append(data.side)
    match.point_log = point_log

    # Check if game is won (first to 11, win by 2 if deuce)
    a, b = match.current_score_a, match.current_score_b
    if (a >= 11 or b >= 11) and abs(a - b) >= 2:
        winner_side = "a" if a > b else "b"
        game = Game(
            match_id=match.id,
            game_number=len(match.games) + 1,
            winner_side=winner_side,
            score_a=a,
            score_b=b,
            players_a=list(match.active_players_a),
            players_b=list(match.active_players_b),
        )
        db.add(game)
        match.games.append(game)
        match.current_score_a = 0
        match.current_score_b = 0
        match.point_log = []

        if not _check_match_end(match):
            # Winner must swap a player
            active = match.active_players_a if winner_side == "a" else match.active_players_b
            bench = [i for i in range(3) if i not in active]
            if bench:
                match.pending_swap = {"team": winner_side, "bench_player": bench[0]}

    await db.commit()
    await db.refresh(match)
    return MatchOut.model_validate(match)


def _get_consecutive_info(games: list[Game]) -> tuple[int, str | None]:
    if not games:
        return 0, None
    last_winner = games[-1].winner_side
    streak = 1
    for g in reversed(games[:-1]):
        if g.winner_side == last_winner:
            streak += 1
        else:
            break
    return streak, last_winner


def _check_match_end(match: Match) -> bool:
    streak, last_winner = _get_consecutive_info(match.games)
    if streak >= 2 and last_winner:
        match.status = "done"
        match.winner_side = last_winner
        return True
    if len(match.games) >= 11:
        games_a = sum(1 for g in match.games if g.winner_side == "a")
        games_b = sum(1 for g in match.games if g.winner_side == "b")
        match.status = "done"
        match.winner_side = "a" if games_a >= games_b else "b"
        return True
    return False


@router.post("/matches/{match_id}/undo", response_model=MatchOut)
async def undo_point(match_id: int, db: AsyncSession = Depends(get_db)):
    match = await _load_match(db, match_id)

    if match.status == "done":
        raise HTTPException(status_code=400, detail="Match is already complete")
    if match.pending_swap:
        raise HTTPException(status_code=400, detail="Cannot undo during swap")

    point_log = list(match.point_log or [])
    if not point_log:
        raise HTTPException(status_code=400, detail="No points to undo")

    last_side = point_log.pop()
    if last_side == "a":
        match.current_score_a -= 1
    else:
        match.current_score_b -= 1
    match.point_log = point_log

    await db.commit()
    await db.refresh(match)
    return MatchOut.model_validate(match)


@router.post("/matches/{match_id}/swap", response_model=MatchOut)
async def swap_player(match_id: int, data: SwapInput, db: AsyncSession = Depends(get_db)):
    match = await _load_match(db, match_id)

    if not match.pending_swap:
        raise HTTPException(status_code=400, detail="No swap pending")

    swap = match.pending_swap
    side = swap["team"]
    bench_player = swap["bench_player"]

    active = list(match.active_players_a if side == "a" else match.active_players_b)
    if data.player_out not in active:
        raise HTTPException(status_code=400, detail="Player not in active lineup")

    idx = active.index(data.player_out)
    active[idx] = bench_player

    if side == "a":
        match.active_players_a = active
    else:
        match.active_players_b = active

    match.pending_swap = None

    await db.commit()
    await db.refresh(match)
    return MatchOut.model_validate(match)


@router.get("/health")
async def health():
    return {"status": "ok"}
