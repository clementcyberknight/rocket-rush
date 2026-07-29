import { useStore } from '../state/useStore'
import '../styles/gameMenu.css'

export default function RoomRanking() {
  const roomPlayers = useStore(s => s.roomPlayers)
  const uid = useStore(s => s.uid)
  const roomCode = useStore(s => s.roomCode)

  if (!roomPlayers || roomPlayers.length === 0 || !roomCode || roomStatus === 'lobby') return null

  const sorted = [...roomPlayers].filter(p => p.alive).sort((a, b) => (b.score || 0) - (a.score || 0))
  const dead = roomPlayers.filter(p => !p.alive)

  return (
    <div className="room-ranking">
      <div className="room-ranking__header">LIVE</div>
      {sorted.map((p, i) => (
        <div key={p.uid} className={`room-ranking__row ${p.uid === uid ? 'room-ranking__me' : ''}`}>
          <span className="room-ranking__rank">#{i + 1}</span>
          <span className="room-ranking__name">{p.username || 'PILOT'}</span>
          <span className="room-ranking__score">{(p.score || 0).toFixed(0)}</span>
        </div>
      ))}
      {dead.map(p => (
        <div key={p.uid} className="room-ranking__row room-ranking__dead">
          <span className="room-ranking__rank">☠</span>
          <span className="room-ranking__name">{p.username || 'PILOT'}</span>
          <span className="room-ranking__score">{(p.score || 0).toFixed(0)}</span>
        </div>
      ))}
      {sorted.length === 0 && dead.length > 0 && (
        <div className="room-ranking__row" style={{ color: '#666', justifyContent: 'center' }}>
          All pilots down
        </div>
      )}
    </div>
  )
}
