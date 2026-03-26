import { Tournament } from '../api/client'

interface Props {
  tourney: Tournament | null
  onOpen: (id: number) => void
}

export default function Matches({ tourney, onOpen }: Props) {
  if (!tourney) return <div className="empty-state">No tournament set up yet.</div>

  const teamMap = Object.fromEntries(tourney.teams.map(t => [t.id, t]))

  return (
    <section>
      <h2 style={{ marginBottom: 16 }}>Matches</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tourney.matches.map(m => {
          const teamA = teamMap[m.team_a_id]
          const teamB = teamMap[m.team_b_id]
          const gamesA = m.games.filter(g => g.winner_side === 'a').length
          const gamesB = m.games.filter(g => g.winner_side === 'b').length
          const badgeClass = m.status === 'done' ? 'badge-done' : m.status === 'active' ? 'badge-active' : 'badge-pending'
          const label = m.status === 'done' ? 'Complete' : m.status === 'active' ? 'In Progress' : 'Not Started'
          const winner = m.status === 'done' ? (m.winner_side === 'a' ? teamA?.name : teamB?.name) : null

          return (
            <div key={m.id} className="card match-card" onClick={() => onOpen(m.id)}>
              <div>
                <div style={{ fontWeight: 600 }}>{teamA?.name} vs {teamB?.name}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  Games: {gamesA}-{gamesB}{winner ? ` — ${winner} wins` : ''}
                </div>
              </div>
              <span className={`badge ${badgeClass}`}>{label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
