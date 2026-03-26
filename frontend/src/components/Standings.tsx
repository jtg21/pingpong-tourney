import { Tournament } from '../api/client'

interface Props {
  tourney: Tournament | null
}

export default function Standings({ tourney }: Props) {
  if (!tourney) return <div className="empty-state">No tournament set up yet.</div>

  const allDone = tourney.matches.every(m => m.status === 'done')

  return (
    <section>
      <h2 style={{ marginBottom: 16 }}>Standings</h2>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Match W-L</th>
              <th>Game W-L</th>
            </tr>
          </thead>
          <tbody>
            {tourney.standings.map((s, i) => (
              <tr key={s.team.id}>
                <td style={i === 0 ? { color: 'var(--orange)', fontWeight: 700 } : undefined}>{i + 1}</td>
                <td>{s.team.name}</td>
                <td>{s.match_wins}-{s.match_losses}</td>
                <td>{s.game_wins}-{s.game_losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {allDone && tourney.matches.length > 0 && (
        <div className="winner-banner">
          {tourney.standings[0].team.name} wins the tournament!
        </div>
      )}
    </section>
  )
}
