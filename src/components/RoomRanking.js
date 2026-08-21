import { useStore } from '../state/useStore'
import '../styles/gameMenu.css'

export default function RoomRanking() {
  const roomPlayers = useStore(s => s.roomPlayers)
  const uid = useStore(s => s.uid)
  const roomStatus = useStore(s => s.roomStatus)
  const localScore = useStore(s => s.score)

  if (!roomPlayers || roomPlayers.length === 0 || roomStatus !== 'playing') return null

  const sorted = [...roomPlayers].filter(p => p.alive).sort((a, b) => {
    const scoreA = a.uid === uid ? Math.max(localScore, a.score || 0) : (a.score || 0)
    const scoreB = b.uid === uid ? Math.max(localScore, b.score || 0) : (b.score || 0)
    return scoreB - scoreA
  })
  const dead = roomPlayers.filter(p => !p.alive)

  return (
    <div className="room-ranking">
      <div className="room-ranking__header">LIVE</div>
      {sorted.map((p, i) => {
        const isMe = p.uid === uid
        const scoreVal = isMe ? Math.max(localScore, p.score || 0) : (p.score || 0)
        return (
          <div key={p.uid} className={`room-ranking__row ${isMe ? 'room-ranking__me' : ''}`}>
            <span className="room-ranking__rank">#{i + 1}</span>
            <span className="room-ranking__name">{p.username || 'PILOT'}</span>
            <span className="room-ranking__score">{scoreVal.toFixed(0)}</span>
          </div>
        )
      })}
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
