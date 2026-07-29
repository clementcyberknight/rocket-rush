import { useStore } from '../state/useStore'
import '../styles/gameMenu.css'

export default function RoomRanking() {
  const roomPlayers = useStore(s => s.roomPlayers)
  const uid = useStore(s => s.uid)
  const roomStatus = useStore(s => s.roomStatus)

  if (!roomPlayers || roomPlayers.length === 0 || roomStatus !== 'playing') return null

  const sorted = [...roomPlayers].sort((a, b) => b.score - a.score)

  return (
    <div className="room-ranking">
      <div className="room-ranking__header">LIVE</div>
      {sorted.map((p, i) => (
        <div key={p.uid} className={`room-ranking__row ${p.uid === uid ? 'room-ranking__me' : ''} ${!p.alive ? 'room-ranking__dead' : ''}`}>
          <span className="room-ranking__rank">#{i + 1}</span>
          <span className="room-ranking__name">{p.username || 'PILOT'}</span>
          <span className="room-ranking__score">{p.score.toFixed(0)}</span>
          {!p.alive && <span className="room-ranking__skull">☠</span>}
        </div>
      ))}
    </div>
  )
}
