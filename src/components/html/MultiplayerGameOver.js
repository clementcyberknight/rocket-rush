import { useState } from 'react'
import { useStore } from '../../state/useStore'
import { leaderboardService, remotePlayerStates } from '../../services/leaderboardService'
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

  if (!gameOver && roomStatus !== 'finished' && !isSpectating) return null
  if (roomStatus === 'lobby') return null

  const alivePlayers = roomPlayers?.filter(p => p.alive && p.uid !== uid) || []
  const aliveCount = (roomPlayers || []).filter(p => p.alive).length
  const finished = roomStatus === 'finished'
  const currentTarget = alivePlayers.find(p => p.uid === spectateTargetUid) || alivePlayers[0]
  const targetState = currentTarget ? remotePlayerStates.get(currentTarget.uid) : null

  const handleReturnToLobby = () => {
    if (isRoomHost) {
      leaderboardService.resetRoomToLobby()
    }
  }

  const handleStartNextRound = () => {
    if (isRoomHost) {
      leaderboardService.startRoom()
    }
  }

  const handleMainMenu = () => {
    leaderboardService.leaveRoom()
  }

  const cycleTarget = (dir) => {
    if (alivePlayers.length === 0) return
    const idx = alivePlayers.findIndex(p => p.uid === spectateTargetUid)
    let next = idx + dir
    if (next < 0) next = alivePlayers.length - 1
    if (next >= alivePlayers.length) next = 0
    setSpectateTargetUid(alivePlayers[next].uid)
  }

  // FINISHED MATCH: Standings Podium Screen
  if (finished) {
    const sorted = (roomRankings && roomRankings.length > 0)
      ? roomRankings
      : [...(roomPlayers || [])].sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, i) => ({
          uid: p.uid,
          username: p.username,
          score: p.score || 0,
          rank: i + 1,
        }))

    return (
      <div className="game__multiplayer-modal-backdrop">
        <div className="game__multiplayer-panel" style={{ maxWidth: 540, width: '92%', padding: '1.2rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.8rem' }}>
            <h2 className="game__score-title" style={{ fontSize: '2rem', margin: 0, color: '#fe2079', textShadow: '0 0 20px #fe2079' }}>
              MATCH COMPLETE
            </h2>
            <span style={{ fontFamily: "'Commando', monospace", color: '#00f0ff', fontSize: '0.85rem', letterSpacing: 1 }}>
              FINAL STANDINGS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '240px', overflowY: 'auto', marginBottom: '1rem' }}>
            {sorted.map(r => {
              const isMe = r.uid === uid
              const trophy = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`
              return (
                <div
                  key={r.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.8rem',
                    background: isMe ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: isMe ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    fontFamily: "'Commando', monospace",
                    color: isMe ? '#00f0ff' : '#fff',
                  }}
                >
                  <span style={{ width: 32, fontSize: '1rem' }}>{trophy}</span>
                  <span style={{ flex: 1, textAlign: 'left', fontWeight: isMe ? 'bold' : 'normal' }}>
                    {r.username || 'PILOT'} {isMe && '(YOU)'}
                  </span>
                  <span style={{ color: '#fff', letterSpacing: 1 }}>
                    {(r.score || 0).toFixed(0)} PTS
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            {isRoomHost ? (
              <>
                <button
                  onClick={handleStartNextRound}
                  className="multiplayer__btn-action multiplayer__btn-start"
                  style={{ width: '100%', padding: '0.65rem', fontSize: '1.05rem' }}
                >
                  START NEXT ROUND 🚀
                </button>
                <button
                  onClick={handleReturnToLobby}
                  className="multiplayer__btn-action multiplayer__btn-create"
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.95rem' }}
                >
                  RETURN TO WAITING ROOM 🏠
                </button>
              </>
            ) : (
              <div style={{
                color: '#00f0ff',
                fontFamily: "'Commando', monospace",
                fontSize: '0.85rem',
                textAlign: 'center',
                padding: '0.5rem',
                background: 'rgba(0,240,255,0.06)',
                borderRadius: 8,
                border: '1px dashed rgba(0,240,255,0.3)',
              }}>
                ⏳ Waiting for room host to start next round or return to lobby...
              </div>
            )}

            <button
              onClick={handleMainMenu}
              className="multiplayer__btn-action multiplayer__btn-leave"
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
            >
              MAIN MENU
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ACTIVE SPECTATING: AAA PUBG / CODM Style Overlay
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1500, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        background: 'linear-gradient(180deg, rgba(20,22,34,0.92) 0%, rgba(20,22,34,0) 100%)',
        pointerEvents: 'auto',
      }}>
        {/* Left: Player Crash Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(254, 32, 121, 0.15)',
          border: '1px solid #fe2079',
          padding: '0.3rem 0.8rem',
          borderRadius: 8,
        }}>
          <span style={{ color: '#fe2079', fontFamily: "'Road Rage', sans-serif", fontSize: '1.2rem', textShadow: '0 0 10px #fe2079' }}>
            YOU CRASHED
          </span>
          <span style={{ color: '#fff', fontFamily: "'Commando', monospace", fontSize: '0.9rem' }}>
            {(score || 0).toFixed(0)} PTS
          </span>
        </div>

        {/* Center: Spectating Target Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(20,22,34,0.85)',
          border: '1px solid #00f0ff',
          borderRadius: 12,
          padding: '0.35rem 1.2rem',
          boxShadow: '0 0 15px rgba(0,240,255,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88' }}></span>
            <span style={{ color: '#aaa', fontFamily: "'Commando', monospace", fontSize: '0.75rem', letterSpacing: 1 }}>
              SPECTATING PILOT
            </span>
          </div>
          <span style={{ color: '#00f0ff', fontFamily: "'Commando', monospace", fontSize: '1.15rem', fontWeight: 'bold', textShadow: '0 0 10px #00f0ff' }}>
            {currentTarget?.username || 'PILOT'}
          </span>
        </div>

        {/* Right: Alive Pilot Counter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(0, 240, 255, 0.12)',
          border: '1px solid #00f0ff',
          padding: '0.3rem 0.8rem',
          borderRadius: 8,
          fontFamily: "'Commando', monospace",
          color: '#00f0ff',
          fontSize: '0.85rem',
        }}>
          <span>👥 PILOTS ALIVE:</span>
          <strong style={{ color: '#00ff88', fontSize: '1rem' }}>{aliveCount}</strong>
        </div>
      </div>

      {/* Expanded Pilot Roster Modal (when clicking roster toggle) */}
      {showPlayerList && (
        <div style={{
          alignSelf: 'center',
          background: 'rgba(20, 22, 34, 0.95)',
          border: '2px solid #00f0ff',
          borderRadius: 12,
          padding: '0.8rem 1.2rem',
          maxWidth: 380,
          width: '90%',
          pointerEvents: 'auto',
          boxShadow: '0 0 25px rgba(0, 240, 255, 0.4)',
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          <div style={{ color: '#00f0ff', fontFamily: "'Commando', monospace", fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            SELECT PILOT TO WATCH
          </div>
          {(roomPlayers || []).map(p => {
            const isTarget = currentTarget?.uid === p.uid
            return (
              <div
                key={p.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.35rem 0.6rem',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontFamily: "'Commando', monospace",
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: p.alive ? '#fff' : '#888' }}>
                  {p.username || 'PILOT'} {p.uid === uid && '(YOU)'}
                </span>
                {p.alive && p.uid !== uid ? (
                  <button
                    onClick={() => { setSpectateTargetUid(p.uid); setShowPlayerList(false) }}
                    style={{
                      background: isTarget ? 'rgba(0,255,136,0.3)' : 'rgba(0,240,255,0.1)',
                      border: isTarget ? '1px solid #00ff88' : '1px solid #00f0ff',
                      color: isTarget ? '#00ff88' : '#00f0ff',
                      borderRadius: 6,
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontFamily: "'Commando', monospace",
                    }}
                  >
                    {isTarget ? '👁️ WATCHING' : 'WATCH'}
                  </button>
                ) : (
                  <span style={{ color: '#ff4444', fontSize: '0.8rem' }}>☠ DOWN</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        padding: '0.75rem 1rem',
        background: 'linear-gradient(0deg, rgba(20,22,34,0.95) 0%, rgba(20,22,34,0.6) 80%, rgba(20,22,34,0) 100%)',
        pointerEvents: 'auto',
        flexWrap: 'wrap',
      }}>
        {alivePlayers.length > 0 && (
          <>
            <button
              onClick={() => cycleTarget(-1)}
              style={actionBtnStyle}
              title="Previous pilot (A or Left Arrow)"
            >
              ◀ PREV [A]
            </button>
            <button
              onClick={() => cycleTarget(1)}
              style={actionBtnStyle}
              title="Next pilot (D or Right Arrow)"
            >
              NEXT [D] ▶
            </button>
            <button
              onClick={() => setSpectateCamMode(spectateCamMode === 'fpv' ? 'chase' : 'fpv')}
              style={{ ...actionBtnStyle, borderColor: '#00ff88', color: '#00ff88' }}
              title="Toggle Camera (C key)"
            >
              🎥 {spectateCamMode === 'fpv' ? 'COCKPIT FPV' : 'CHASE CAM'} [C]
            </button>
            <button
              onClick={() => setShowPlayerList(!showPlayerList)}
              style={actionBtnStyle}
            >
              📋 ROSTER ({alivePlayers.length})
            </button>
          </>
        )}

        <button
          onClick={handleMainMenu}
          style={{
            ...actionBtnStyle,
            borderColor: '#ff4444',
            color: '#ff4444',
            background: 'rgba(255, 68, 68, 0.1)',
          }}
        >
          LEAVE TO MENU
        </button>
      </div>
    </div>
  )
}

const actionBtnStyle = {
  background: 'rgba(0, 240, 255, 0.12)',
  border: '1px solid #00f0ff',
  color: '#00f0ff',
  borderRadius: 8,
  padding: '0.4rem 0.85rem',
  cursor: 'pointer',
  fontFamily: "'Commando', monospace",
  fontSize: '0.85rem',
  letterSpacing: 0.5,
  transition: 'all 0.15s ease',
  boxShadow: '0 0 10px rgba(0,240,255,0.2)',
}
