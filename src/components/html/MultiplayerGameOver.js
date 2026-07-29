import { useState } from 'react'
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
  const [showPlayerList, setShowPlayerList] = useState(false)

  if (!gameOver || roomStatus === 'lobby' || !isSpectating) return null

  const alivePlayers = roomPlayers?.filter(p => p.alive) || []
  const aliveCount = alivePlayers.length
  const finished = roomStatus === 'finished'
  const currentTarget = alivePlayers.find(p => p.uid === spectateTargetUid) || alivePlayers[0]

  const handleRestart = () => {
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
    useStore.getState().setSpectateTargetUid(null)
  }

  const cycleTarget = (dir) => {
    if (alivePlayers.length === 0) return
    const idx = alivePlayers.findIndex(p => p.uid === spectateTargetUid)
    let next = idx + dir
    if (next < 0) next = alivePlayers.length - 1
    if (next >= alivePlayers.length) next = 0
    setSpectateTargetUid(alivePlayers[next].uid)
  }

  // FINISHED: Full-screen modal with final standings
  if (finished) {
    return (
      <div className="multiplayer__container" style={{ background: 'rgba(20, 22, 34, 0.92)' }}>
        <div className="multiplayer__card" style={{ maxWidth: 500 }}>
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
          <div className="multiplayer__actions" style={{ marginTop: '1rem', flexDirection: 'column', gap: '0.5rem' }}>
            {isRoomHost && (
              <button onClick={handleRestart} className="multiplayer__btn multiplayer__btn-start" style={{ width: '100%' }}>
                PLAY AGAIN 🚀
              </button>
            )}
            {!isRoomHost && (
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

  // SPECTATING: Compact bottom HUD — game world visible behind
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 2000,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Top-left crash badge */}
      <div style={{
        position: 'fixed',
        top: 12,
        left: 12,
        background: 'rgba(20, 22, 34, 0.85)',
        border: '1px solid #fe2079',
        borderRadius: 10,
        padding: '6px 14px',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ color: '#fe2079', fontFamily: "'Road Rage', sans-serif", fontSize: '1.3rem', textShadow: '0 0 10px #fe2079' }}>
          YOU CRASHED
        </span>
        <span style={{ color: '#fff', fontFamily: "'Commando', monospace", fontSize: '1.1rem' }}>
          {(score || 0).toFixed(0)}
        </span>
      </div>

      {/* Expanded player list */}
      {showPlayerList && (
        <div style={{
          background: 'rgba(20, 22, 34, 0.9)',
          border: '1px solid #00f0ff',
          borderRadius: 12,
          padding: '0.6rem 1rem',
          marginBottom: 8,
          maxWidth: 360,
          width: '90%',
          pointerEvents: 'auto',
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          {(roomPlayers || []).sort((a, b) => (b.score || 0) - (a.score || 0)).map(p => {
            const isTarget = currentTarget?.uid === p.uid
            return (
              <div key={p.uid} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontFamily: "'Commando', monospace",
                fontSize: '0.85rem',
                color: p.uid === uid ? '#00f0ff' : '#fff',
              }}>
                <span>{p.username || 'PILOT'}</span>
                <span style={{ marginRight: 8 }}>{(p.score || 0).toFixed(0)}</span>
                {p.alive ? (
                  <button
                    onClick={() => { setSpectateTargetUid(p.uid); setShowPlayerList(false) }}
                    style={{
                      background: isTarget ? 'rgba(0,255,136,0.25)' : 'transparent',
                      border: isTarget ? '1px solid #00ff88' : '1px solid #555',
                      color: isTarget ? '#00ff88' : '#aaa',
                      borderRadius: 4,
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                    }}
                  >
                    {isTarget ? '👁️ WATCHING' : '👁️ WATCH'}
                  </button>
                ) : (
                  <span style={{ color: '#ff4444', fontSize: '0.7rem' }}>☠</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom spectate bar */}
      <div style={{
        background: 'rgba(20, 22, 34, 0.85)',
        borderTop: '1px solid #00f0ff',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        pointerEvents: 'auto',
        flexWrap: 'wrap',
      }}>
        {aliveCount > 0 ? (
          <>
            <button onClick={() => cycleTarget(-1)} style={navBtnStyle}>◀</button>
            <span style={{ color: '#00ff88', fontFamily: "'Commando', monospace", fontSize: '0.9rem' }}>
              👁️ {currentTarget?.username || 'PILOT'}
            </span>
            <button onClick={() => cycleTarget(1)} style={navBtnStyle}>▶</button>

            <button
              onClick={() => setSpectateCamMode(spectateCamMode === 'fpv' ? 'chase' : 'fpv')}
              style={{ ...navBtnStyle, padding: '4px 10px', fontSize: '0.75rem' }}
            >
              🎥 {spectateCamMode === 'fpv' ? 'FPV' : 'CHASE'}
            </button>

            <button onClick={() => setShowPlayerList(!showPlayerList)} style={{ ...navBtnStyle, padding: '4px 10px', fontSize: '0.75rem' }}>
              📋 {aliveCount} ALIVE
            </button>
          </>
        ) : (
          <span style={{ color: '#aaa', fontFamily: "'Commando', monospace", fontSize: '0.85rem' }}>
            Round ending...
          </span>
        )}

        <button onClick={handleLeave} style={{
          background: 'transparent',
          border: '1px solid #ff4444',
          color: '#ff4444',
          borderRadius: 6,
          padding: '4px 12px',
          cursor: 'pointer',
          fontFamily: "'Commando', monospace",
          fontSize: '0.75rem',
        }}>
          LEAVE
        </button>
      </div>
    </div>
  )
}

const navBtnStyle = {
  background: 'rgba(0,240,255,0.1)',
  border: '1px solid #00f0ff',
  color: '#00f0ff',
  borderRadius: 6,
  padding: '4px 8px',
  cursor: 'pointer',
  fontFamily: "'Commando', monospace",
  fontSize: '0.85rem',
}

