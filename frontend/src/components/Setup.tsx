import { useState } from 'react'
import { createTournament, Tournament } from '../api/client'

interface Props {
  onCreated: () => void
  existing: Tournament | null
}

export default function Setup({ onCreated, existing }: Props) {
  const defaultTeams = existing
    ? existing.teams.map(t => ({ name: t.name, players: t.players.map(p => p.name) }))
    : [
        { name: '', players: ['', '', ''] },
        { name: '', players: ['', '', ''] },
        { name: '', players: ['', '', ''] },
      ]

  const [teams, setTeams] = useState(defaultTeams)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTeamName = (i: number, name: string) => {
    const next = [...teams]
    next[i] = { ...next[i], name }
    setTeams(next)
  }

  const updatePlayerName = (ti: number, pi: number, name: string) => {
    const next = [...teams]
    const players = [...next[ti].players]
    players[pi] = name
    next[ti] = { ...next[ti], players }
    setTeams(next)
  }

  const save = async () => {
    for (const t of teams) {
      if (!t.name.trim()) { setError('All teams need names'); return }
      if (t.players.some(p => !p.trim())) { setError('All players need names'); return }
    }
    setSaving(true)
    setError(null)
    try {
      await createTournament(teams.map(t => ({ name: t.name.trim(), players: t.players.map(p => p.trim()) })))
      onCreated()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2 style={{ marginBottom: 16 }}>Tournament Setup</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        {teams.map((team, ti) => (
          <div key={ti} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              placeholder={`Team ${ti + 1} Name`}
              value={team.name}
              onChange={e => updateTeamName(ti, e.target.value)}
              style={{ fontSize: '1.1rem', fontWeight: 600 }}
            />
            {team.players.map((p, pi) => (
              <input
                key={pi}
                placeholder={`Player ${pi + 1}`}
                value={p}
                onChange={e => updatePlayerName(ti, pi, e.target.value)}
              />
            ))}
          </div>
        ))}
      </div>
      {error && <p style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</p>}
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Teams'}
      </button>
    </section>
  )
}
