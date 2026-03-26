import { useState } from 'react'
import { addPoint, undoPoint, swapPlayer, Match, Tournament } from '../api/client'

interface Props {
  matchId: number
  tourney: Tournament
  onClose: () => void
  onUpdate: (match: Match) => void
}

export default function MatchPlay({ matchId, tourney, onClose, onUpdate }: Props) {
  const match = tourney.matches.find(m => m.id === matchId)!
  const teamMap = Object.fromEntries(tourney.teams.map(t => [t.id, t]))
  const teamA = teamMap[match.team_a_id]
  const teamB = teamMap[match.team_b_id]
  const [loading, setLoading] = useState(false)

  const doAction = async (fn: () => Promise<Match>) => {
    setLoading(true)
    try {
      const updated = await fn()
      onUpdate(updated)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const gamesA = match.games.filter(g => g.winner_side === 'a').length
  const gamesB = match.games.filter(g => g.winner_side === 'b').length

  const consecutiveInfo = (() => {
    if (match.games.length === 0) return { streak: 0, lastWinner: null as string | null }
    const last = match.games[match.games.length - 1].winner_side
    let streak = 1
    for (let i = match.games.length - 2; i >= 0; i--) {
      if (match.games[i].winner_side === last) streak++
      else break
    }
    return { streak, lastWinner: last }
  })()

  const isDone = match.status === 'done'
  const isPendingSwap = match.pending_swap != null

  let statusText = `Games: ${gamesA}-${gamesB}`
  if (consecutiveInfo.streak > 0) {
    const streakTeam = consecutiveInfo.lastWinner === 'a' ? teamA.name : teamB.name
    statusText += ` | ${streakTeam} has ${consecutiveInfo.streak} consecutive win${consecutiveInfo.streak > 1 ? 's' : ''}`
  }
  if (match.games.length > 0 && !isDone) {
    statusText += ` | Game ${match.games.length + 1} of max 11`
  }

  return (
    <div className="overlay">
      <div className="overlay-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>{teamA.name} vs {teamB.name}</h2>

        {isDone ? (
          <div className="set-won-banner">
            {match.winner_side === 'a' ? teamA.name : teamB.name} wins the match!
            {consecutiveInfo.streak >= 2 ? ' (2 consecutive wins)' : ' (best of 11 games)'}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: 20 }}>
            {statusText}
          </p>
        )}

        <div className="active-players">
          <div className="card active-side">
            <h3>{teamA.name}</h3>
            {match.active_players_a.map(i => (
              <span key={i} className="player-tag">{teamA.players[i]?.name}</span>
            ))}
          </div>
          <div className="vs">VS</div>
          <div className="card active-side">
            <h3>{teamB.name}</h3>
            {match.active_players_b.map(i => (
              <span key={i} className="player-tag">{teamB.players[i]?.name}</span>
            ))}
          </div>
        </div>

        {!isDone && (
          <>
            <div className="score-area">
              <div style={{ textAlign: 'center' }}>
                <div className="score">{match.current_score_a}</div>
                <button
                  className="btn btn-primary"
                  onClick={() => doAction(() => addPoint(match.id, 'a'))}
                  disabled={loading || isPendingSwap}
                  style={{ marginTop: 8, padding: '8px 32px' }}
                >+1</button>
              </div>
              <div style={{ fontSize: '2rem', color: 'var(--text-dim)' }}>-</div>
              <div style={{ textAlign: 'center' }}>
                <div className="score">{match.current_score_b}</div>
                <button
                  className="btn btn-primary"
                  onClick={() => doAction(() => addPoint(match.id, 'b'))}
                  disabled={loading || isPendingSwap}
                  style={{ marginTop: 8, padding: '8px 32px' }}
                >+1</button>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <button
                className="btn btn-secondary"
                onClick={() => doAction(() => undoPoint(match.id))}
                disabled={loading || isPendingSwap}
              >Undo Last Point</button>
            </div>
          </>
        )}

        {isPendingSwap && (
          <div className="card swap-modal">
            <h3>Swap a player out</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 12 }}>
              {match.pending_swap!.team === 'a' ? teamA.name : teamB.name} won!
              Swap one active player with{' '}
              {match.pending_swap!.team === 'a'
                ? teamA.players[match.pending_swap!.bench_player]?.name
                : teamB.players[match.pending_swap!.bench_player]?.name}.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {(match.pending_swap!.team === 'a' ? match.active_players_a : match.active_players_b).map(pi => {
                const team = match.pending_swap!.team === 'a' ? teamA : teamB
                return (
                  <button
                    key={pi}
                    className="swap-btn"
                    onClick={() => doAction(() => swapPlayer(match.id, pi))}
                    disabled={loading}
                  >
                    Swap out {team.players[pi]?.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Game Log</h3>
          {match.games.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No games played yet.</p>
          ) : (
            match.games.map((g, i) => {
              const winnerName = g.winner_side === 'a' ? teamA.name : teamB.name
              const playersA = g.players_a.map(pi => teamA.players[pi]?.name).join(' & ')
              const playersB = g.players_b.map(pi => teamB.players[pi]?.name).join(' & ')
              return (
                <div key={g.id} className="card log-entry" style={{ marginBottom: 8 }}>
                  <div>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>Game {i + 1}: {winnerName}</span>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 2 }}>
                      {playersA} vs {playersB}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-dim)' }}>{g.score_a}-{g.score_b}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
