export interface Player {
  id: number
  name: string
}

export interface Team {
  id: number
  name: string
  players: Player[]
}

export interface Game {
  id: number
  game_number: number
  winner_side: string
  score_a: number
  score_b: number
  players_a: number[]
  players_b: number[]
}

export interface Match {
  id: number
  team_a_id: number
  team_b_id: number
  status: string
  winner_side: string | null
  active_players_a: number[]
  active_players_b: number[]
  current_score_a: number
  current_score_b: number
  pending_swap: { team: string; bench_player: number } | null
  games: Game[]
}

export interface Standing {
  team: Team
  match_wins: number
  match_losses: number
  game_wins: number
  game_losses: number
}

export interface Tournament {
  teams: Team[]
  matches: Match[]
  standings: Standing[]
}

const BASE = '/api'

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }))
    throw new Error(err.detail || resp.statusText)
  }
  return resp.json()
}

export async function getTournament(): Promise<Tournament> {
  return json(await fetch(`${BASE}/tournament`))
}

export async function createTournament(teams: { name: string; players: string[] }[]): Promise<void> {
  await json(await fetch(`${BASE}/tournament`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teams }),
  }))
}

export async function addPoint(matchId: number, side: string): Promise<Match> {
  return json(await fetch(`${BASE}/matches/${matchId}/point`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ side }),
  }))
}

export async function undoPoint(matchId: number): Promise<Match> {
  return json(await fetch(`${BASE}/matches/${matchId}/undo`, {
    method: 'POST',
  }))
}

export async function swapPlayer(matchId: number, playerOut: number): Promise<Match> {
  return json(await fetch(`${BASE}/matches/${matchId}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_out: playerOut }),
  }))
}
