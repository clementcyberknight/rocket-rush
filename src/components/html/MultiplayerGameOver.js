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
  const isRoomHost = useStore(s => s.isRoomHost)
  const spectateTargetUid = useStore(s => s.spectateTargetUid)
  const setSpectateTargetUid = useStore(s => s.setSpectateTargetUid)
  const spectateCamMode = useStore(s => s.spectateCamMode)
  const setSpectateCamMode = useStore(s => s.setSpectateCamMode)

  if (!gameOver || roomStatus === 'lobby' || !isSpectating) return null

  const alivePlayers = roomPlayers?.filter(p => p.alive) || []
  const aliveCount = alivePlayers.length
  const finished = roomStatus === 'finished'
  const currentTarget = alivePlayers.find(p => p.uid === spectateTargetUid) || alivePlayers[0]

  const handleRestart = () => {
    useStore.getState().setGameOver(false)
    useStore.getState().setIsSpectating(false)
    useStore.getState().setScore(0)
    useStore.getState().restartGame()
    leaderboardService.startRoom()
  }

  const handleLeave = () => {
    useStore.getState().setGameOver(false)
    useStore.getState().setIsSpectating(false)
    useStore.getState().setGameStarted(false)
    useStore.getState().restartGame()
    leaderboardService.leaveRoom()
    useStore.getState().setRoomCode(null)
    useStore.getState().setRoomPlayers([])
    useStore.getState().setRoomStatus(null)
    useStore.getState().setIsRoomHost(false)
    useStore.getState().setRoomSeed(null)
    useStore.getState().setRoomRankings(null)
  }

  return (
    <div className="multiplayer__container" style={{ background: 'rgba(20, 22, 34, 0.88)' }}>
      <div className="multiplayer__card" style={{ maxWidth: 500 }}>
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
            <p className="multiplayer__subtitle" style={{ marginBottom: '0.5rem' }}>
              {aliveCount > 0
                ? `Spectating ${currentTarget?.username || 'PILOT'} ... ${aliveCount} pilot${aliveCount > 1 ? 's' : ''} still flying`
                : 'Waiting for round to complete...'}
            </p>

            {aliveCount > 0 && (
              <div style={{ marginBottom: '0.8rem' }}>
                <button
                  onClick={() => setSpectateCamMode(spectateCamMode === 'fpv' ? 'chase' : 'fpv')}
                  className="multiplayer__btn"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    borderColor: '#00f0ff',
                    color: '#00f0ff',
                    background: 'rgba(0, 240, 255, 0.1)',
                  }}
                >
                  🎥 CAMERA: {spectateCamMode === 'fpv' ? 'FPV (FIRST-PERSON COCKPIT)' : 'CHASE (THIRD-PERSON)'}
                </button>
              </div>
            )}

            <div className="multiplayer__players">
              {(roomPlayers || []).sort((a, b) => (b.score || 0) - (a.score || 0)).map(p => {
                const isCurrentTarget = currentTarget?.uid === p.uid
                return (
                  <div key={p.uid} className={`multiplayer__player ${!p.alive ? 'room-ranking__dead' : ''} ${p.uid === uid ? 'room-ranking__me' : ''}`}>
                    <span className="room-ranking__name">{p.username || 'PILOT'}</span>
                    <span className="room-ranking__score">{(p.score || 0).toFixed(0)}</span>
                    {p.alive ? (
                      <button
                        onClick={() => setSpectateTargetUid(p.uid)}
                        style={{
                          background: isCurrentTarget ? 'rgba(0, 255, 136, 0.25)' : 'transparent',
                          border: isCurrentTarget ? '1px solid #00ff88' : '1px solid #666',
                          color: isCurrentTarget ? '#00ff88' : '#aaa',
                          borderRadius: 4,
                          padding: '2px 8px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        {isCurrentTarget ? '👁️ SPECTATING' : '👁️ SPECTATE'}
                      </button>
                    ) : (
                      <span className="room-ranking__skull">☠</span>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
        <div className="multiplayer__actions" style={{ marginTop: '1rem', flexDirection: 'column', gap: '0.5rem' }}>
          {finished && isRoomHost && (
            <button onClick={handleRestart} className="multiplayer__btn multiplayer__btn-start" style={{ width: '100%' }}>
              PLAY AGAIN 🚀
            </button>
          )}
          {finished && !isRoomHost && (
            <div style={{ color: '#00f0ff', fontSize: '0.9rem', textAlign: 'center', margin: '0.5rem 0' }}>
              Waiting for room host to start next round...
            </div>
          )}
          <button onClick={handleLeave} className="multiplayer__btn multiplayer__btn-leave" style={{ width: '100%' }}>
            LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  )
}
