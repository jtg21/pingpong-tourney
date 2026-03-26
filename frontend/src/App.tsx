import { useEffect, useState } from 'react'
import { getTournament, Tournament } from './api/client'
import Setup from './components/Setup'
import Standings from './components/Standings'
import Matches from './components/Matches'
import MatchPlay from './components/MatchPlay'

type View = 'standings' | 'matches' | 'setup'

export default function App() {
  const [view, setView] = useState<View>('standings')
  const [tourney, setTourney] = useState<Tournament | null>(null)
  const [activeMatchId, setActiveMatchId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      const data = await getTournament()
      setTourney(data)
      setError(null)
    } catch {
      setTourney(null)
    }
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!tourney && view !== 'setup') setView('setup')
  }, [tourney, view])

  const onTournamentCreated = () => {
    refresh()
    setView('standings')
  }

  const openMatch = (id: number) => setActiveMatchId(id)

  const closeMatch = () => {
    setActiveMatchId(null)
    refresh()
  }

  const onMatchUpdated = (updatedMatch: any) => {
    if (!tourney) return
    setTourney({
      ...tourney,
      matches: tourney.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m),
    })
  }

  return (
    <>
      <header>
        <h1>Ping Pong Tournament</h1>
        <nav>
          {(['standings', 'matches', 'setup'] as View[]).map(v => (
            <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {error && <p style={{ color: 'var(--red)', textAlign: 'center' }}>{error}</p>}

      {view === 'setup' && <Setup onCreated={onTournamentCreated} existing={tourney} />}
      {view === 'standings' && <Standings tourney={tourney} />}
      {view === 'matches' && <Matches tourney={tourney} onOpen={openMatch} />}

      {activeMatchId !== null && tourney && (
        <MatchPlay
          matchId={activeMatchId}
          tourney={tourney}
          onClose={closeMatch}
          onUpdate={onMatchUpdated}
        />
      )}
    </>
  )
}
