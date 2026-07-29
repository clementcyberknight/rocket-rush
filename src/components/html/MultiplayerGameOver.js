import { useStore } from '../../state/useStore'
import { leaderboardService } from '../../services/leaderboardService'
import '../../styles/gameMenu.css'

export default function MultiplayerGameOver() {
  const gameOver = useStore(s => s.gameOver)
  const isSpectating = useStore(s => s.isSpectating)
  const roomPlayers = useStore(s => s.roomPlayers)
  const roomRankings = useStore(s => s.roomRankings)
  const roomStatus = useStore(s => s.roomStatus)
  const uid = useStore(s => s.uid)
  const score = useStore(s => s.score)
  const userRank = useStore(s => s.userRank)
  const userHighScore = useStore(s => s.userHighScore)
  const setGameStarted = useStore(s => s.setGameStarted)

  if (!gameOver || roomStatus === 'lobby' || !isSpectating) return null

  const aliveCount = roomPlayers?.filter(p => p.alive).length || 0
  const deadCount = roomPlayers?.filter(p => !p.alive).length || 0
  const finished = roomStatus === 'finished'

  const handleRestart = () => {
    useStore.getState().setGameOver(false)
    useStore.getState().setIsSpectating(false)
    useStore.getState().setScore(0)
    leaderboardService.startRoom()
  }

  const handleLeave = () => {
    useStore.getState().setGameOver(false)
    useStore.getState().setIsSpectating(false)
    useStore.getState().restartGame()
    leaderboardService.leaveRoom()
    useStore.getState().setRoomCode(null)
    useStore.getState().setRoomPlayers([])
    useStore.getState().setRoomStatus(null)
    useStore.getState().setIsRoomHost(false)
    useStore.getState().setRoomSeed(null)
  }

  return (
    <div className="multiplayer__container" style={{ background: 'rgba(20, 22, 34, 0.88)' }}>
      <div className="multiplayer__card" style={{ maxWidth: 480 }}>
        {finished ? (
          <>
            <h2 className="multiplayer__title">GAME OVER</h2>
            <h3 className="game__score-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              FINAL STANDINGS
            </h3>
            <div className="multiplayer__players">
              {(roomRankings || []).map(r => (
                <div key={r.uid} className={`multiplayer__player ${r.uid === uid ? 'room-ranking__me' : ''}`}>
                  <span className="room-ranking__rank">#{r.rank}</span>
                  <span className="room-ranking__name">{r.username || 'PILOT'}</span>
                  <span className="room-ranking__score">{(r.score || 0).toFixed(0)}</span>
                  {r.rank === 1 && <span>🏆</span>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="multiplayer__title">YOU CRASHED</h2>
            <div className="game__scorecontainer" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
              <div className="game__score-left" style={{ marginRight: 0 }}>
                <span className="game__score-title" style={{ fontSize: '1.2rem' }}>SCORE</span>
                <span className="game__score" style={{ fontSize: '3rem' }}>{(score || 0).toFixed(0)}</span>
              </div>
            </div>
            <p className="multiplayer__subtitle" style={{ marginBottom: '1rem' }}>
              {aliveCount > 0
                ? `Spectating... ${aliveCount} pilot${aliveCount > 1 ? 's' : ''} still flying`
                : 'Waiting for others...'}
            </p>
            <div className="multiplayer__players">
              {(roomPlayers || []).sort((a, b) => (b.score || 0) - (a.score || 0)).map(p => (
                <div key={p.uid} className={`multiplayer__player ${!p.alive ? 'room-ranking__dead' : ''} ${p.uid === uid ? 'room-ranking__me' : ''}`}>
                  <span className="room-ranking__name">{p.username || 'PILOT'}</span>
                  <span className="room-ranking__score">{(p.score || 0).toFixed(0)}</span>
                  {p.alive ? <span style={{ color: '#00ff88', fontSize: '0.7rem' }}>ALIVE</span> : <span className="room-ranking__skull">☠</span>}
                </div>
              ))}
            </div>
          </>
        )}
        <div className="multiplayer__actions" style={{ marginTop: '1rem' }}>
          {finished && (
            <button onClick={handleRestart} className="multiplayer__btn multiplayer__btn-start" style={{ flex: 1 }}>
              PLAY AGAIN
            </button>
          )}
          <button onClick={handleLeave} className="multiplayer__btn multiplayer__btn-leave" style={{ flex: 1 }}>
            LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  )
}
