from pydantic import BaseModel


class PlayerCreate(BaseModel):
    name: str


class TeamCreate(BaseModel):
    name: str
    players: list[str]  # list of player names


class TournamentCreate(BaseModel):
    teams: list[TeamCreate]  # exactly 3 teams with 3 players each


class PlayerOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class TeamOut(BaseModel):
    id: int
    name: str
    players: list[PlayerOut]

    model_config = {"from_attributes": True}


class GameOut(BaseModel):
    id: int
    game_number: int
    winner_side: str
    score_a: int
    score_b: int
    players_a: list[int]
    players_b: list[int]

    model_config = {"from_attributes": True}


class MatchOut(BaseModel):
    id: int
    team_a_id: int
    team_b_id: int
    status: str
    winner_side: str | None
    active_players_a: list[int]
    active_players_b: list[int]
    current_score_a: int
    current_score_b: int
    pending_swap: dict | None
    games: list[GameOut]

    model_config = {"from_attributes": True}


class PointInput(BaseModel):
    side: str  # "a" or "b"


class SwapInput(BaseModel):
    player_out: int  # index of player to swap out (within active players)


class StandingOut(BaseModel):
    team: TeamOut
    match_wins: int
    match_losses: int
    game_wins: int
    game_losses: int


class TournamentOut(BaseModel):
    teams: list[TeamOut]
    matches: list[MatchOut]
    standings: list[StandingOut]
