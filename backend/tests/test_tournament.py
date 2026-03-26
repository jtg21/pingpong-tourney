import pytest
from httpx import AsyncClient

TEAMS_DATA = {
    "teams": [
        {"name": "Team Alpha", "players": ["Alice", "Bob", "Charlie"]},
        {"name": "Team Beta", "players": ["Dave", "Eve", "Frank"]},
        {"name": "Team Gamma", "players": ["Grace", "Heidi", "Ivan"]},
    ]
}


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_create_tournament(client: AsyncClient):
    resp = await client.post("/api/tournament", json=TEAMS_DATA)
    assert resp.status_code == 200

    resp = await client.get("/api/tournament")
    data = resp.json()
    assert len(data["teams"]) == 3
    assert len(data["matches"]) == 3
    assert all(m["status"] == "pending" for m in data["matches"])


@pytest.mark.asyncio
async def test_add_point(client: AsyncClient):
    await client.post("/api/tournament", json=TEAMS_DATA)
    tourney = (await client.get("/api/tournament")).json()
    match_id = tourney["matches"][0]["id"]

    resp = await client.post(f"/api/matches/{match_id}/point", json={"side": "a"})
    assert resp.status_code == 200
    assert resp.json()["current_score_a"] == 1
    assert resp.json()["status"] == "active"


@pytest.mark.asyncio
async def test_undo_point(client: AsyncClient):
    await client.post("/api/tournament", json=TEAMS_DATA)
    tourney = (await client.get("/api/tournament")).json()
    match_id = tourney["matches"][0]["id"]

    await client.post(f"/api/matches/{match_id}/point", json={"side": "a"})
    resp = await client.post(f"/api/matches/{match_id}/undo")
    assert resp.json()["current_score_a"] == 0


@pytest.mark.asyncio
async def test_game_win_triggers_swap(client: AsyncClient):
    await client.post("/api/tournament", json=TEAMS_DATA)
    tourney = (await client.get("/api/tournament")).json()
    match_id = tourney["matches"][0]["id"]

    # Score 11-0 for team a
    for _ in range(11):
        resp = await client.post(f"/api/matches/{match_id}/point", json={"side": "a"})

    data = resp.json()
    assert len(data["games"]) == 1
    assert data["games"][0]["winner_side"] == "a"
    assert data["pending_swap"] is not None
    assert data["pending_swap"]["team"] == "a"


@pytest.mark.asyncio
async def test_swap_player(client: AsyncClient):
    await client.post("/api/tournament", json=TEAMS_DATA)
    tourney = (await client.get("/api/tournament")).json()
    match_id = tourney["matches"][0]["id"]

    # Win a game
    for _ in range(11):
        await client.post(f"/api/matches/{match_id}/point", json={"side": "a"})

    # Swap out player 0 (bring in player 2 from bench)
    resp = await client.post(f"/api/matches/{match_id}/swap", json={"player_out": 0})
    assert resp.status_code == 200
    assert resp.json()["pending_swap"] is None
    assert 2 in resp.json()["active_players_a"]


@pytest.mark.asyncio
async def test_consecutive_wins_ends_match(client: AsyncClient):
    await client.post("/api/tournament", json=TEAMS_DATA)
    tourney = (await client.get("/api/tournament")).json()
    match_id = tourney["matches"][0]["id"]

    # Win game 1
    for _ in range(11):
        await client.post(f"/api/matches/{match_id}/point", json={"side": "a"})
    await client.post(f"/api/matches/{match_id}/swap", json={"player_out": 0})

    # Win game 2 — consecutive, match should end
    for _ in range(11):
        resp = await client.post(f"/api/matches/{match_id}/point", json={"side": "a"})

    data = resp.json()
    assert data["status"] == "done"
    assert data["winner_side"] == "a"


@pytest.mark.asyncio
async def test_standings(client: AsyncClient):
    await client.post("/api/tournament", json=TEAMS_DATA)
    tourney = (await client.get("/api/tournament")).json()
    standings = tourney["standings"]
    assert len(standings) == 3
    assert all(s["match_wins"] == 0 for s in standings)


@pytest.mark.asyncio
async def test_cannot_point_after_done(client: AsyncClient):
    await client.post("/api/tournament", json=TEAMS_DATA)
    tourney = (await client.get("/api/tournament")).json()
    match_id = tourney["matches"][0]["id"]

    # Win 2 consecutive
    for _ in range(11):
        await client.post(f"/api/matches/{match_id}/point", json={"side": "a"})
    await client.post(f"/api/matches/{match_id}/swap", json={"player_out": 0})
    for _ in range(11):
        await client.post(f"/api/matches/{match_id}/point", json={"side": "a"})

    resp = await client.post(f"/api/matches/{match_id}/point", json={"side": "a"})
    assert resp.status_code == 400
